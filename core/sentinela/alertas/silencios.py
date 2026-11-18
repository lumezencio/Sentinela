"""Silêncios (só não avisam) e janelas de manutenção (também pausam a checagem).

Todo silêncio tem fim obrigatório (até 30 dias). A manutenção guarda os ids que ELA pausou
(``Silencio.pausados``) e, ao fim, retoma só esses: pausa manual, ``fora_das_subredes`` ou
outra manutenção ainda ativa no mesmo equipamento continuam valendo.
"""

import logging
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Literal
from zoneinfo import ZoneInfo

from sqlalchemy import ColumnElement, String, cast, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.api import comum
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import Alerta, Auditoria, Equipamento, Evento, Fonte, Silencio, Usuario
from sentinela.descoberta.mescla import auditar_sistema
from sentinela.horario import amanha_8h
from sentinela.monitor.agendador import CAUSA_FORA, PROFUNDIDADE_MAX_PAI, Agendador, Alvo
from sentinela.monitor.checagens import GRAVADOR
from sentinela.monitor.estados import Estado
from sentinela.monitor.montagem import alvo_de
from sentinela.rede.guarda import DestinoProibido
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

CAUSA_MANUTENCAO = "manutencao"
FIM_MAXIMO = timedelta(days=30)
INTERVALO_S = 15.0
MSG_FIM = "O fim deve ser futuro e no máximo 30 dias à frente."
MSG_EQUIPAMENTO = "Equipamento inexistente."

Atalho = Literal["1h", "4h", "amanha_8h"]


def fim_do_atalho(atalho: Atalho, agora: datetime, fuso: ZoneInfo) -> datetime:
    if atalho == "1h":
        return agora + timedelta(hours=1)
    if atalho == "4h":
        return agora + timedelta(hours=4)
    return amanha_8h(agora, fuso)


@dataclass(frozen=True)
class PedidoSilencio:
    tipo: Literal["silencio", "manutencao"]
    alvo_tipo: Literal["equipamento", "classe"]
    alvo: str  # id do equipamento ou slug/nome da classe
    fim: datetime
    motivo: str | None


class ErroSilencio(Exception):
    def __init__(self, motivo: str) -> None:
        super().__init__(motivo)
        self.motivo = motivo


@dataclass(frozen=True)
class Cobertura:
    equipamentos: frozenset[str]
    classes: frozenset[int]

    def cobre(
        self, equipamento_id: str, classe_id: int, ancestrais: Iterable[tuple[str, int]]
    ) -> bool:
        """Silêncio ou manutenção ativos no próprio, na classe ou em qualquer ancestral (ou na
        classe de um ancestral). ``ancestrais``: pares (id, classe_id)."""
        return (
            equipamento_id in self.equipamentos
            or classe_id in self.classes
            or any(a in self.equipamentos or c in self.classes for a, c in ancestrais)
        )


async def ancestrais(db: AsyncSession, eq: Equipamento) -> list[tuple[str, int]]:
    """(id, classe_id) dos ancestrais: sobe ``pai_id`` até ``PROFUNDIDADE_MAX_PAI`` níveis,
    parando em ciclo."""
    vistos = [eq.id]
    achados: list[tuple[str, int]] = []
    pai = eq.pai_id
    while pai is not None and pai not in vistos and len(vistos) <= PROFUNDIDADE_MAX_PAI:
        vistos.append(pai)
        linha = (
            await db.execute(
                select(Equipamento.pai_id, Equipamento.classe_id).where(Equipamento.id == pai)
            )
        ).first()
        if linha is None:
            break
        achados.append((pai, linha[1]))
        pai = linha[0]
    return achados


def _ativo(agora: datetime) -> tuple[ColumnElement[bool], ...]:
    return (Silencio.encerrado_em.is_(None), Silencio.inicio <= agora, Silencio.fim > agora)


class Silencios:
    def __init__(
        self,
        sessoes: async_sessionmaker[AsyncSession],
        agendador: Agendador,
        barramento: Barramento,
        relogio: Relogio,
        agora_parede: Callable[[], datetime],
    ) -> None:
        self._sessoes = sessoes
        self._agendador = agendador
        self._barramento = barramento
        self._relogio = relogio
        self._agora_parede = agora_parede

    # ---- criar --------------------------------------------------------------------------

    async def criar(
        self,
        db: AsyncSession,
        pedido: PedidoSilencio,
        usuario: Usuario,
        agora: datetime,
        *,
        ip: str | None = None,
    ) -> Silencio:
        if not agora < pedido.fim <= agora + FIM_MAXIMO:
            raise ErroSilencio(MSG_FIM)
        equipamento_id, classe_id = await self._resolver_alvo(db, pedido)
        sil = Silencio(
            tipo=pedido.tipo,
            alvo_tipo=pedido.alvo_tipo,
            equipamento_id=equipamento_id,
            classe_id=classe_id,
            inicio=agora,
            fim=pedido.fim,
            motivo=(pedido.motivo or "").strip() or None,
            criado_por=usuario.id,
            pausados=[],
        )
        db.add(sil)
        registrados: list[str] = []
        if pedido.tipo == "manutencao":
            consulta = select(Equipamento).where(
                Equipamento.id == equipamento_id
                if equipamento_id is not None
                else Equipamento.classe_id == classe_id
            )
            for eq in (await db.execute(consulta)).scalars().all():
                if eq.pausado:  # já pausado (manual, sub-rede ou outra manutenção): não é nosso
                    continue
                if comum.marcar_pausa(db, self._agendador, eq, CAUSA_MANUTENCAO):
                    registrados.append(eq.id)
                sil.pausados = [*sil.pausados, eq.id]
        await db.flush()
        db.add(
            Auditoria(
                usuario_id=usuario.id,
                acao="silencio.criar",
                alvo=str(sil.id),
                depois=self._retrato(sil, pedido.alvo),
                ip=ip,
                em=agora,
            )
        )
        await db.commit()
        if registrados:
            self._agendador.pausar_lote(registrados, causa=CAUSA_MANUTENCAO)
            await self._agendador.aguardar_gravacoes()
        silenciados = await self._calar_pendentes(db, agora)
        self._barramento.publicar(Mensagem("silencio", {"acao": "criado", "id": sil.id}))
        if silenciados:
            abertos = await db.scalar(
                select(func.count()).select_from(Alerta).where(Alerta.fechado_em.is_(None))
            )
            for id_ in silenciados:
                self._barramento.publicar(
                    Mensagem(
                        "alerta", {"acao": "atualizado", "id": id_, "abertos": int(abertos or 0)}
                    )
                )
        return sil

    async def _calar_pendentes(self, db: AsyncSession, agora: datetime) -> list[int]:
        """Quem silencia um alerta que ainda espera para ir ao Telegram impede o envio: alertas
        abertos, ``pendente`` e sem nenhum chat atendido, com o principal coberto, viram
        ``silenciado`` + ``nao_aplica``. UPDATE guardado (contrato de envio do ``Alerta``): se o
        despachante já mandou ou o agrupador fechou, o alerta fica como está."""
        cobertura = await self.cobertura(db, agora)
        pendentes = (
            (
                await db.execute(
                    select(Alerta).where(
                        Alerta.fechado_em.is_(None),
                        Alerta.envio == "pendente",
                        Alerta.silenciado.is_(False),
                    )
                )
            )
            .scalars()
            .all()
        )
        silenciados: list[int] = []
        for a in pendentes:
            if a.enviado_para or a.telegram_msgs:
                continue
            eid = a.equipamento_id
            if eid is None and a.fonte_id is not None:
                eid = await db.scalar(select(Fonte.equipamento_id).where(Fonte.id == a.fonte_id))
            eq = await db.get(Equipamento, eid) if eid is not None else None
            if eq is None or not cobertura.cobre(eq.id, eq.classe_id, await ancestrais(db, eq)):
                continue
            r = await db.execute(
                update(Alerta)
                .where(
                    Alerta.id == a.id,
                    Alerta.fechado_em.is_(None),
                    Alerta.envio == "pendente",
                    cast(Alerta.enviado_para, String) == "[]",
                    cast(Alerta.telegram_msgs, String) == "{}",
                )
                .values(silenciado=True, envio="nao_aplica")
            )
            if r.rowcount == 1:  # type: ignore[attr-defined]
                silenciados.append(a.id)
        await db.commit()
        return silenciados

    async def _resolver_alvo(
        self, db: AsyncSession, pedido: PedidoSilencio
    ) -> tuple[str | None, int | None]:
        if pedido.alvo_tipo == "equipamento":
            if await db.get(Equipamento, pedido.alvo) is None:
                raise ErroSilencio(MSG_EQUIPAMENTO)
            return pedido.alvo, None
        classe = (await comum.mapa_classes(db)).get(pedido.alvo.strip().casefold())
        if classe is None:
            raise ErroSilencio(comum.MSG_CLASSE)
        return None, classe.id

    @staticmethod
    def _retrato(sil: Silencio, alvo: str, retomados: int | None = None) -> dict[str, Any]:
        dados: dict[str, Any] = {
            "tipo": sil.tipo,
            "alvo_tipo": sil.alvo_tipo,
            "alvo": alvo,
            "fim": sil.fim.isoformat(),
            "motivo": sil.motivo,
            "pausados": len(sil.pausados),
        }
        if retomados is not None:
            dados["retomados"] = retomados
        return dados

    # ---- encerrar -----------------------------------------------------------------------

    async def encerrar(
        self, id: int, usuario: Usuario | None, agora: datetime, *, ip: str | None = None
    ) -> Silencio | None:
        """Encerra e, se for manutenção, retoma só o que ela pausou e ninguém mais segura.

        ``None`` se não existe ou já está encerrado. ``usuario=None`` audita como sistema.
        """
        async with self._sessoes() as db:
            # UPDATE guardado: só quem muda a linha de aberta para encerrada segue adiante
            # (o laço e a API não liberam nem auditam duas vezes)
            fechou = await db.execute(
                update(Silencio)
                .where(Silencio.id == id, Silencio.encerrado_em.is_(None))
                .values(encerrado_em=agora)
            )
            if fechou.rowcount != 1:  # type: ignore[attr-defined]
                await db.rollback()
                return None
            sil = await db.get(Silencio, id, populate_existing=True)
            if sil is None:
                return None
            retomar, adicionar, recusados = await self._liberar(db, sil, agora)
            alvo = sil.equipamento_id or str(sil.classe_id)
            retrato = self._retrato(sil, alvo, len(retomar) + len(adicionar) + len(recusados))
            if usuario is None:
                auditar_sistema(db, "silencio.encerrar", str(id), agora, depois=retrato)
            else:
                db.add(
                    Auditoria(
                        usuario_id=usuario.id,
                        acao="silencio.encerrar",
                        alvo=str(id),
                        depois=retrato,
                        ip=ip,
                        em=agora,
                    )
                )
            await db.commit()
            await db.refresh(sil)
        for pid in retomar:
            self._agendador.retomar(pid, causa=CAUSA_MANUTENCAO)
        if adicionar:
            self._agendador.adicionar_lote(adicionar)
        await self._agendador.aguardar_gravacoes()
        self._barramento.publicar(Mensagem("silencio", {"acao": "encerrado", "id": id}))
        return sil

    async def _liberar(
        self, db: AsyncSession, sil: Silencio, agora: datetime
    ) -> tuple[list[str], list[Alvo], list[str]]:
        """(retomar no agendador, alvos a adicionar, retomar e repausar fora das sub-redes)."""
        retomar: list[str] = []
        adicionar: list[Alvo] = []
        recusados: list[str] = []
        if sil.tipo != "manutencao":
            return retomar, adicionar, recusados
        for pid in sil.pausados:
            eq = await db.get(Equipamento, pid)
            if eq is None:
                continue
            outra = await db.scalar(
                select(Silencio)
                .where(
                    Silencio.tipo == "manutencao",
                    Silencio.id != sil.id,
                    *_ativo(agora),
                    or_(Silencio.equipamento_id == pid, Silencio.classe_id == eq.classe_id),
                )
                .limit(1)
            )
            if outra is not None:  # outra manutenção ainda o segura: a lista dela passa a ter o id
                if pid not in outra.pausados:
                    outra.pausados = [*outra.pausados, pid]
                continue
            if not eq.pausado or await comum.ultima_causa_de_pausa(db, pid) != CAUSA_MANUTENCAO:
                continue  # retomado ou repausado à mão depois: não é mais da manutenção
            if eq.checagem != GRAVADOR:
                try:
                    comum.validar_destino(self._agendador.guarda, eq.ip, eq.porta, eq.checagem)
                except DestinoProibido:
                    # continua pausado: só a causa passa a ser ``fora_das_subredes`` (sem
                    # retomar e repausar, sem transição de estado)
                    db.add(
                        Evento(
                            equipamento_id=pid,
                            de=Estado.PAUSADO.value,
                            para=Estado.PAUSADO.value,
                            em=agora,
                            duracao_s=0.0,
                            causa=CAUSA_FORA,
                        )
                    )
                    recusados.append(pid)
                    continue
            if comum.marcar_retomada(db, self._agendador, eq, CAUSA_MANUTENCAO):
                retomar.append(pid)
            else:  # fora do agendador: ao adicionar, a Guarda revalida e pausa se recusar
                adicionar.append(alvo_de(eq, await comum.classe_de(db, eq)))
        return retomar, adicionar, recusados

    async def encerrar_vencidos(self, agora: datetime) -> int:
        async with self._sessoes() as db:
            ids = list(
                (
                    await db.execute(
                        select(Silencio.id).where(
                            Silencio.encerrado_em.is_(None), Silencio.fim <= agora
                        )
                    )
                ).scalars()
            )
        total = 0
        for id in ids:
            try:
                if await self.encerrar(id, None, agora) is not None:
                    total += 1
            except Exception:  # um silêncio com problema não pode travar os demais
                log.exception("falha ao encerrar o silêncio %d (segue com os demais)", id)
        return total

    async def executar(self) -> None:
        """Fecha o que venceu logo ao subir e a cada 15 s (a limpeza só apaga depois de 90 dias)."""
        while True:
            try:
                await self.encerrar_vencidos(self._agora_parede())
            except Exception:
                log.exception("falha ao encerrar silêncios vencidos (nova tentativa em 15 s)")
            await self._relogio.dormir(INTERVALO_S)

    # ---- consulta -----------------------------------------------------------------------

    async def cobertura(self, db: AsyncSession, agora: datetime) -> Cobertura:
        equipamentos: set[str] = set()
        classes: set[int] = set()
        for s in (await db.execute(select(Silencio).where(*_ativo(agora)))).scalars():
            if s.equipamento_id is not None:
                equipamentos.add(s.equipamento_id)
            if s.classe_id is not None:
                classes.add(s.classe_id)
        return Cobertura(frozenset(equipamentos), frozenset(classes))
