"""Persistência do monitoramento: eventos de estado na hora, amostras em lote."""

from collections import deque
from datetime import datetime
from typing import Protocol

from sqlalchemy import select, update
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Amostra, Equipamento, Evento
from sentinela.monitor.estados import Estado, ResultadoChecagem, Transicao

MAX_PENDENTES = 100_000  # teto de memória se o banco ficar fora do ar (descarta as mais antigas)


class GravadorAmostras(Protocol):
    async def registrar_transicao(
        self, id: str, t: Transicao, em: datetime, causa: str | None = None
    ) -> None: ...

    def acumular_amostra(self, id: str, r: ResultadoChecagem, em: datetime) -> None: ...

    async def descarregar(self) -> None: ...


class GravadorSql:
    """Grava no SQLite. ``descarregar`` é chamado pela aplicação a cada 60 s."""

    def __init__(self, sessoes: async_sessionmaker[AsyncSession]) -> None:
        self._sessoes = sessoes
        self._pendentes: deque[tuple[str, ResultadoChecagem, datetime]] = deque(
            maxlen=MAX_PENDENTES
        )

    async def registrar_transicao(
        self, id: str, t: Transicao, em: datetime, causa: str | None = None
    ) -> None:
        async with self._sessoes() as s, s.begin():
            eq = await s.get(Equipamento, id)
            if eq is None:  # removido enquanto a checagem estava em voo
                return
            s.add(
                Evento(
                    equipamento_id=id,
                    de=t.de.value,
                    para=t.para.value,
                    em=em,
                    duracao_s=max(0.0, (em - eq.estado_desde).total_seconds()),
                    causa=causa,
                )
            )
            eq.estado = t.para.value
            eq.estado_desde = em
            # ``pausado`` acompanha a transição: a pausa decidida pelo próprio agendador
            # (destino recusado pela Guarda) também fica persistida
            if t.para is Estado.PAUSADO:
                eq.pausado = True
            elif t.de is Estado.PAUSADO:
                eq.pausado = False

    def acumular_amostra(self, id: str, r: ResultadoChecagem, em: datetime) -> None:
        self._pendentes.append((id, r, em))

    async def descarregar(self) -> None:
        if not self._pendentes:
            return
        lote = list(self._pendentes)
        self._pendentes.clear()
        try:
            await self._gravar(lote)
        except BaseException:
            # devolve o lote à frente das novas para a próxima tentativa (respeitando o teto)
            novas = list(self._pendentes)
            self._pendentes.clear()
            self._pendentes.extend(lote + novas)
            raise

    async def _gravar(self, lote: list[tuple[str, ResultadoChecagem, datetime]]) -> None:
        async with self._sessoes() as s, s.begin():
            ids = {i for i, _, _ in lote}
            existentes = set(
                (await s.execute(select(Equipamento.id).where(Equipamento.id.in_(ids)))).scalars()
            )
            linhas = [
                {"equipamento_id": i, "ts": em, "latencia_ms": r.latencia_ms, "ok": r.ok}
                for i, r, em in lote
                if i in existentes
            ]
            if linhas:
                await s.execute(insert(Amostra).on_conflict_do_nothing(), linhas)
            for i, valores in self._resumo(lote, existentes).items():
                await s.execute(update(Equipamento).where(Equipamento.id == i).values(**valores))

    @staticmethod
    def _resumo(
        lote: list[tuple[str, ResultadoChecagem, datetime]], existentes: set[str]
    ) -> dict[str, dict[str, object]]:
        """Última latência e último sucesso de cada equipamento do lote."""
        resumo: dict[str, dict[str, object]] = {}
        for i, r, em in lote:
            if i not in existentes:
                continue
            valores = resumo.setdefault(i, {})
            valores["latencia_ms"] = r.latencia_ms
            if r.ok:
                valores["visto_em"] = em
        return resumo
