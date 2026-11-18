"""Agrupador: transforma as mensagens ``estado`` e ``fonte`` do barramento em alertas.

Regras (Fase 4 §5.2), por mensagem ``estado`` (transições com o mesmo estado e causa da
anterior são ignoradas):

1. ``inalcancavel`` com causa ``pai:P``: o equipamento sai de todo alerta aberto ainda não
   enviado (o alerta que fica vazio é removido; se ele era o principal, o próximo de
   ``quedas`` assume) e entra em ``afetados`` do alerta aberto que contém ``P``; sem esse
   alerta, abre um com ``P`` como principal (ex.: gravador que responde ao ping, mas cuja
   leitura de canais falha).
2. ``offline``: entra no alerta ``queda`` aberto mais recente com ``aberto_em`` nos últimos
   30 s, ainda pendente e com o mesmo ``silenciado``; senão abre um.
3. ``online``/``instavel`` (voltou): entra em ``voltaram``; o alerta fecha quando todos de
   ``quedas`` voltaram (sem ``quedas``, quando todos os ``afetados`` voltaram). Duração
   < 2 min marca ``breve`` (já enviado: volta a ``pendente`` para a edição da mensagem);
   enviado e ≥ 2 min gera um alerta ``volta``.
4. ``instavel`` só conta para classe crítica e vira alerta pelo ``tick`` após 5 min.

Silêncio ou manutenção no próprio, na classe ou num ancestral (até 8 níveis) registra o
alerta com ``silenciado=true`` e ``envio='nao_aplica'``. Falha de fonte em 3 coletas
seguidas abre ``fonte_falhou``; a próxima coleta boa o fecha.
"""

import asyncio
import logging
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.alertas.silencios import Cobertura, Silencios
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import Alerta, Classe, Equipamento, Fonte
from sentinela.monitor.agendador import PROFUNDIDADE_MAX_PAI
from sentinela.monitor.estados import CAUSA_PAI, Estado
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

JANELA_AGRUPAR_S = 30
BREVE_S = 120
INSTAVEL_MIN_S = 300
FALHAS_FONTE = 3
TICK_S = 5
TAMANHO_FILA = 10_000  # rajada de uma queda grande sem perder transições

_VOLTOU = frozenset({Estado.ONLINE.value, Estado.INSTAVEL.value})

Eventos = list[tuple[str, int]]  # (acao, id do alerta) a publicar depois do commit


class Agrupador:
    def __init__(
        self,
        sessoes: async_sessionmaker[AsyncSession],
        barramento: Barramento,
        silencios: Silencios,
        relogio: Relogio,
        agora_parede: Callable[[], datetime],
    ) -> None:
        self._sessoes = sessoes
        self._barramento = barramento
        self._silencios = silencios
        self._relogio = relogio
        self._agora_parede = agora_parede
        self._trava = asyncio.Lock()
        self._ultimo: dict[str, tuple[str, str | None]] = {}
        self._instavel_desde: dict[str, datetime] = {}  # só classes críticas
        self._falhas_fonte: dict[str, int] = {}
        self.pronto = asyncio.Event()  # assinado e carregado (testes e diagnóstico)

    # ---- laço -----------------------------------------------------------------------------

    async def executar(self) -> None:
        # assina ANTES de ler o banco: nada publicado depois da leitura se perde
        async with self._barramento.assinar(tamanho=TAMANHO_FILA) as fluxo:
            await self._carregar()
            self.pronto.set()
            async with asyncio.TaskGroup() as grupo:
                grupo.create_task(self._consumir(fluxo))
                grupo.create_task(self._tiquetaquear())

    async def _consumir(self, fluxo: Any) -> None:
        async for msg in fluxo:
            try:
                await self.processar(msg)
            except Exception:  # uma mensagem com problema não para o laço
                log.exception("falha ao processar mensagem %s no agrupador", msg.tipo)

    async def _tiquetaquear(self) -> None:
        while True:
            try:
                await self.tick()
            except Exception:
                log.exception("falha no tick do agrupador (nova tentativa em %d s)", TICK_S)
            await self._relogio.dormir(TICK_S)

    async def _carregar(self) -> None:
        """Os alertas abertos ficam no banco; da memória só volta o início das instabilidades
        de classe crítica (o equipamento já instável não publica de novo ao reiniciar)."""
        async with self._sessoes() as db:
            linhas = await db.execute(
                select(Equipamento.id, Equipamento.estado_desde)
                .join(Classe, Classe.id == Equipamento.classe_id)
                .where(Equipamento.estado == Estado.INSTAVEL.value, Classe.critica.is_(True))
            )
            for eid, desde in linhas:
                self._instavel_desde.setdefault(eid, desde)

    # ---- entrada --------------------------------------------------------------------------

    async def processar(self, msg: Mensagem) -> None:
        async with self._trava:
            if msg.tipo == "estado":
                await self._estado(msg.dados)
            elif msg.tipo == "fonte" and isinstance(msg.dados.get("ok"), bool):
                await self._fonte(msg.dados)

    async def tick(self) -> None:
        """Abre ``instavel`` para quem passou de 5 min (uma vez por instabilidade)."""
        async with self._trava:
            agora = self._agora_parede()
            minimo = timedelta(seconds=INSTAVEL_MIN_S)
            vencidos = {e: d for e, d in self._instavel_desde.items() if agora - d >= minimo}
            if not vencidos:
                return
            eventos: Eventos = []
            async with self._sessoes() as db:
                ja_abertos = set(
                    (
                        await db.execute(
                            select(Alerta.equipamento_id).where(
                                Alerta.tipo == "instavel",
                                Alerta.fechado_em.is_(None),
                                Alerta.equipamento_id.in_(vencidos),
                            )
                        )
                    ).scalars()
                )
                cobertura = await self._silencios.cobertura(db, agora)
                for eid, desde in vencidos.items():
                    if eid in ja_abertos:
                        continue
                    eq = await db.get(Equipamento, eid)
                    if eq is None:
                        self._instavel_desde.pop(eid, None)
                        continue
                    silenciado = await _silenciado(db, cobertura, eq)
                    await self._abrir(db, eventos, "instavel", eid, [], desde, silenciado)
                await self._concluir(db, eventos)

    # ---- estado ---------------------------------------------------------------------------

    async def _estado(self, dados: dict[str, Any]) -> None:
        eid, estado, causa = dados.get("id"), dados.get("estado"), dados.get("causa")
        if not isinstance(eid, str) or not isinstance(estado, str):
            return
        causa = causa if isinstance(causa, str) else None
        if self._ultimo.get(eid) == (estado, causa):
            return  # de == para (ex.: pausado -> pausado por troca de causa)
        self._ultimo[eid] = (estado, causa)
        t = self._instante(dados.get("desde"))
        eventos: Eventos = []
        async with self._sessoes() as db:
            if estado == Estado.INSTAVEL.value:
                if eid not in self._instavel_desde and await _critico(db, eid):
                    self._instavel_desde[eid] = t
            elif estado != Estado.SUSPEITO.value:  # oscilação curta não zera a instabilidade
                self._instavel_desde.pop(eid, None)
                await self._fechar_instavel(db, eventos, eid, t)
            if estado == Estado.INALCANCAVEL.value and causa and causa.startswith(CAUSA_PAI):
                await self._inalcancavel(db, eventos, eid, causa.removeprefix(CAUSA_PAI), t)
            elif estado in (Estado.OFFLINE.value, Estado.INALCANCAVEL.value):
                await self._offline(db, eventos, eid, t)
            elif estado in _VOLTOU:
                await self._voltou(db, eventos, eid, t)
            await self._concluir(db, eventos)

    async def _inalcancavel(
        self, db: AsyncSession, eventos: Eventos, eid: str, pai: str, t: datetime
    ) -> None:
        levar: list[str] = []  # inalcançáveis que ficaram sem queda própria no alerta removido
        for a in await _abertos(db):
            if a.envio == "enviado" or a.envio == "falhou" or not _contem(a, eid):
                continue
            a.quedas = [q for q in a.quedas if q != eid]
            a.afetados = [f for f in a.afetados if f != eid]
            a.voltaram = [v for v in a.voltaram if v != eid]
            if a.equipamento_id == eid and a.quedas:
                a.equipamento_id = a.quedas[0]  # o próximo de ``quedas`` vira principal
                a.afetados = [f for f in a.afetados if f != a.quedas[0]]
            if a.equipamento_id == eid or (not a.quedas and not a.afetados):
                levar += a.afetados
                await db.delete(a)
                eventos.append(("removido", a.id))
            else:
                eventos.append(("atualizado", a.id))
        await db.flush()
        alvo = next((a for a in await _abertos(db) if _contem(a, pai)), None)
        if alvo is None:
            eq_pai = await db.get(Equipamento, pai)
            silenciado = False
            if eq_pai is not None:
                cobertura = await self._silencios.cobertura(db, t)
                silenciado = await _silenciado(db, cobertura, eq_pai)
            await self._abrir(db, eventos, "queda", pai, [], t, silenciado, [eid, *levar])
            return
        novos = [x for x in (eid, *levar) if x not in alvo.afetados and x != alvo.equipamento_id]
        if novos:
            alvo.afetados = [*alvo.afetados, *novos]
            alvo.voltaram = [v for v in alvo.voltaram if v not in novos]
            eventos.append(("atualizado", alvo.id))

    async def _offline(self, db: AsyncSession, eventos: Eventos, eid: str, t: datetime) -> None:
        eq = await db.get(Equipamento, eid)
        if eq is None:
            return
        abertos = await _abertos(db)
        for a in abertos:
            if eid in a.quedas:  # já tem queda aberta: caiu de novo antes do grupo fechar
                if eid in a.voltaram:
                    a.voltaram = [v for v in a.voltaram if v != eid]
                    eventos.append(("atualizado", a.id))
                return
        silenciado = await _silenciado(db, await self._silencios.cobertura(db, t), eq)
        envio = "nao_aplica" if silenciado else "pendente"
        limite = t - timedelta(seconds=JANELA_AGRUPAR_S)
        for a in abertos:  # do mais recente para o mais antigo
            if a.quedas and a.aberto_em >= limite and a.envio == envio:
                if a.silenciado != silenciado:
                    continue
                a.quedas = [*a.quedas, eid]
                a.afetados = [*a.afetados, eid]
                eventos.append(("atualizado", a.id))
                return
        await self._abrir(db, eventos, "queda", eid, [eid], t, silenciado)

    async def _voltou(self, db: AsyncSession, eventos: Eventos, eid: str, t: datetime) -> None:
        for a in await _abertos(db):
            if not _contem(a, eid) or eid in a.voltaram:
                continue
            a.voltaram = [*a.voltaram, eid]
            # inalcançáveis não seguram o fechamento, salvo no alerta sem queda própria
            esperados = a.quedas or a.afetados
            if not all(x in a.voltaram for x in esperados):
                eventos.append(("atualizado", a.id))
                continue
            await self._fechar_queda(db, eventos, a, t)

    async def _fechar_queda(
        self, db: AsyncSession, eventos: Eventos, a: Alerta, t: datetime
    ) -> None:
        a.fechado_em = t
        breve = t - a.aberto_em < timedelta(seconds=BREVE_S)
        if breve:
            a.breve = True
            if a.envio == "enviado":
                a.envio = "pendente"  # o despachante edita a mensagem já enviada
        eventos.append(("fechado", a.id))
        if a.envio == "enviado" and not breve:
            volta = Alerta(
                tipo="volta",
                equipamento_id=a.equipamento_id,
                quedas=list(a.quedas),
                afetados=list(a.afetados),
                voltaram=list(a.voltaram),
                aberto_em=t,
                fechado_em=t,
                alerta_origem_id=a.id,
                silenciado=False,
                envio="pendente",
            )
            db.add(volta)
            await db.flush()
            eventos.append(("aberto", volta.id))

    async def _fechar_instavel(
        self, db: AsyncSession, eventos: Eventos, eid: str, t: datetime
    ) -> None:
        abertos = await db.execute(
            select(Alerta).where(
                Alerta.tipo == "instavel",
                Alerta.equipamento_id == eid,
                Alerta.fechado_em.is_(None),
            )
        )
        for a in abertos.scalars():
            a.fechado_em = t
            if a.envio == "pendente":
                a.envio = "nao_aplica"  # passou antes de ir ao Telegram: nada a avisar
            eventos.append(("fechado", a.id))

    # ---- fonte ----------------------------------------------------------------------------

    async def _fonte(self, dados: dict[str, Any]) -> None:
        fid = dados.get("id")
        if not isinstance(fid, str):
            return
        agora = self._agora_parede()
        eventos: Eventos = []
        async with self._sessoes() as db:
            aberto = await db.scalar(
                select(Alerta).where(
                    Alerta.tipo == "fonte_falhou",
                    Alerta.fonte_id == fid,
                    Alerta.fechado_em.is_(None),
                )
            )
            if dados["ok"]:
                self._falhas_fonte.pop(fid, None)
                if aberto is not None:
                    aberto.fechado_em = agora
                    eventos.append(("fechado", aberto.id))
            else:
                falhas = self._falhas_fonte.get(fid, 0) + 1
                self._falhas_fonte[fid] = falhas
                fonte = await db.get(Fonte, fid)
                if falhas >= FALHAS_FONTE and aberto is None and fonte is not None:
                    silenciado = False
                    eq = (
                        None
                        if fonte.equipamento_id is None
                        else await db.get(Equipamento, fonte.equipamento_id)
                    )
                    if eq is not None:
                        cobertura = await self._silencios.cobertura(db, agora)
                        silenciado = await _silenciado(db, cobertura, eq)
                    await self._abrir(
                        db, eventos, "fonte_falhou", None, [], agora, silenciado, fonte_id=fid
                    )
            await self._concluir(db, eventos)

    # ---- apoio ----------------------------------------------------------------------------

    def _instante(self, desde: Any) -> datetime:
        if isinstance(desde, str):
            try:
                t = datetime.fromisoformat(desde)
                if t.tzinfo is not None:
                    return t
            except ValueError:
                pass
        return self._agora_parede()

    @staticmethod
    async def _abrir(
        db: AsyncSession,
        eventos: Eventos,
        tipo: str,
        principal: str | None,
        quedas: list[str],
        aberto_em: datetime,
        silenciado: bool,
        afetados: list[str] | None = None,
        *,
        fonte_id: str | None = None,
    ) -> None:
        a = Alerta(
            tipo=tipo,
            equipamento_id=principal,
            fonte_id=fonte_id,
            quedas=quedas,
            afetados=afetados or [],
            voltaram=[],
            aberto_em=aberto_em,
            silenciado=silenciado,
            envio="nao_aplica" if silenciado else "pendente",
        )
        db.add(a)
        await db.flush()
        eventos.append(("aberto", a.id))

    async def _concluir(self, db: AsyncSession, eventos: Eventos) -> None:
        """Commit e, depois dele, as mensagens ``alerta`` com o total de abertos."""
        if not eventos:
            await db.rollback()
            return
        await db.commit()
        abertos = await db.scalar(
            select(func.count()).select_from(Alerta).where(Alerta.fechado_em.is_(None))
        )
        for acao, id in eventos:
            self._barramento.publicar(
                Mensagem("alerta", {"acao": acao, "id": id, "abertos": int(abertos or 0)})
            )


async def _abertos(db: AsyncSession) -> list[Alerta]:
    """Alertas ``queda`` abertos, do mais recente para o mais antigo."""
    consulta = (
        select(Alerta)
        .where(Alerta.tipo == "queda", Alerta.fechado_em.is_(None))
        .order_by(Alerta.aberto_em.desc(), Alerta.id.desc())
    )
    return list((await db.execute(consulta)).scalars())


def _contem(a: Alerta, eid: str) -> bool:
    return a.equipamento_id == eid or eid in a.quedas or eid in a.afetados


async def _critico(db: AsyncSession, eid: str) -> bool:
    critica = await db.scalar(
        select(Classe.critica)
        .join(Equipamento, Equipamento.classe_id == Classe.id)
        .where(Equipamento.id == eid)
    )
    return bool(critica)


async def _ancestrais(db: AsyncSession, eq: Equipamento) -> list[str]:
    """Sobe ``pai_id`` até ``PROFUNDIDADE_MAX_PAI`` níveis, parando em ciclo."""
    vistos = [eq.id]
    pai = eq.pai_id
    while pai is not None and pai not in vistos and len(vistos) <= PROFUNDIDADE_MAX_PAI:
        vistos.append(pai)
        pai = await db.scalar(select(Equipamento.pai_id).where(Equipamento.id == pai))
    return vistos[1:]


async def _silenciado(db: AsyncSession, cobertura: Cobertura, eq: Equipamento) -> bool:
    return cobertura.cobre(eq.id, eq.classe_id, await _ancestrais(db, eq))
