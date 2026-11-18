"""Agrupador: transforma as mensagens ``estado`` e ``fonte`` do barramento em alertas.

Regras (Fase 4 §5.2), por mensagem ``estado`` (transições com o mesmo estado e causa da
anterior são ignoradas):

1. ``inalcancavel`` com causa ``pai:P``: o equipamento sai de todo alerta aberto ainda não
   enviado (o alerta que fica vazio é removido; se ele era o principal, o próximo de
   ``quedas`` assume) e entra em ``afetados`` do alerta aberto que contém ``P``; sem esse
   alerta, abre um com ``P`` como principal (ex.: gravador que responde ao ping, mas cuja
   leitura de canais falha). Sem causa ``pai:``, vale como ``offline``.
2. ``offline``: entra no alerta ``queda`` aberto mais recente com ``aberto_em`` nos últimos
   30 s, ainda pendente e com o mesmo ``silenciado``; senão abre um.
3. ``online``/``instavel`` (voltou): entra em ``voltaram``; o alerta fecha quando todos de
   ``quedas`` estão resolvidos (sem ``quedas``, todos os ``afetados``): voltaram, foram
   pausados ou removidos. Duração < 2 min marca ``breve`` (já enviado: volta a ``pendente``
   para a edição da mensagem); enviado e ≥ 2 min gera um alerta ``volta``. Resolvido só por
   pausa/remoção (ninguém voltou) fecha sem aviso.
4. ``instavel`` só conta para classe crítica e vira alerta pelo ``tick`` após 5 min; o fim
   fecha o alerta (não enviado vira ``nao_aplica``; enviado e de volta a ``online`` gera
   ``volta``).

Silêncio ou manutenção no próprio, na classe ou num ancestral (até 8 níveis) registra o
alerta com ``silenciado=true`` e ``envio='nao_aplica'``. Falha de fonte em 3 coletas
seguidas abre ``fonte_falhou``; a próxima coleta boa (ou a remoção da fonte) o fecha.

Concorrência com o despachante: toda escrita num alerta existente é um UPDATE/DELETE
guardado pelo ``envio`` lido (e ``fechado_em IS NULL``) com conferência do ``rowcount``;
se perder a disputa, a transação é desfeita e a mensagem é decidida de novo uma vez.
Ao subir, os alertas abertos são reconciliados com o estado do banco (voltas perdidas
enquanto o agrupador estava parado); o ``tick`` fecha o que ficou resolvido por remoção.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import delete, func, select, update
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
TENTATIVAS = 2  # perdeu a disputa pelo ``envio``: relê e decide de novo uma vez

_VOLTOU = frozenset({Estado.ONLINE.value, Estado.INSTAVEL.value})
_NAO_ENVIADO = ("pendente", "nao_aplica")

Eventos = list[tuple[str, int]]  # (acao, id do alerta) a publicar depois do commit
Corpo = Callable[[AsyncSession, Eventos], Awaitable[None]]


class _Perdeu(Exception):
    """O ``envio`` mudou (despachante) entre a leitura e a escrita."""


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
            await self.carregar()
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

    async def carregar(self) -> None:
        """Ao subir: reconcilia os alertas abertos com o estado gravado (uma volta pode ter
        se perdido com o agrupador parado) e recarrega o início das instabilidades de classe
        crítica (o equipamento já instável não publica de novo)."""
        async with self._trava:
            async with self._sessoes() as db:
                linhas = await db.execute(
                    select(Equipamento.id, Equipamento.estado_desde)
                    .join(Classe, Classe.id == Equipamento.classe_id)
                    .where(Equipamento.estado == Estado.INSTAVEL.value, Classe.critica.is_(True))
                )
                for eid, desde in linhas:
                    self._instavel_desde.setdefault(eid, desde)
            await self._transacao(self._reconciliar_ao_subir)

    async def _reconciliar_ao_subir(self, db: AsyncSession, eventos: Eventos) -> None:
        agora = self._agora_parede()
        for a in await _abertos(db):
            membros = [*a.quedas, *a.afetados]
            estados = await _estados(db, membros)
            novos = [
                x
                for x in membros
                if x not in a.voltaram and x in estados and estados[x][0] in _VOLTOU
            ]
            t = max((estados[x][1] for x in novos), default=agora)
            await self._avaliar(db, eventos, a, [*a.voltaram, *novos], max(t, a.aberto_em))
        for a in await _instaveis(db):
            eid = a.equipamento_id
            atual = (await _estados(db, [eid])).get(eid) if eid else None
            if atual is None:  # equipamento removido: o tick fecha
                continue
            if atual[0] != Estado.INSTAVEL.value:
                await self._fechar_instavel(db, eventos, a, max(atual[1], a.aberto_em), atual[0])
        await self._fechar_orfaos(db, eventos, agora)

    # ---- entrada --------------------------------------------------------------------------

    async def processar(self, msg: Mensagem) -> None:
        async with self._trava:
            if msg.tipo == "estado":
                await self._estado(msg.dados)
            elif msg.tipo == "fonte" and isinstance(msg.dados.get("ok"), bool):
                await self._fonte(msg.dados)

    async def tick(self) -> None:
        """Abre ``instavel`` para quem passou de 5 min (uma vez por instabilidade) e fecha o
        que ficou resolvido por remoção de equipamento ou de fonte."""
        async with self._trava:
            await self._transacao(self._tick)

    async def _tick(self, db: AsyncSession, eventos: Eventos) -> None:
        agora = self._agora_parede()
        await self._fechar_orfaos(db, eventos, agora)
        minimo = timedelta(seconds=INSTAVEL_MIN_S)
        vencidos = {e: d for e, d in self._instavel_desde.items() if agora - d >= minimo}
        if not vencidos:
            return
        ja_abertos = {a.equipamento_id for a in await _instaveis(db)}
        cobertura = await self._silencios.cobertura(db, agora)
        for eid, desde in vencidos.items():
            if eid in ja_abertos:
                continue
            eq = await db.get(Equipamento, eid)
            if eq is None:
                self._instavel_desde.pop(eid, None)
                continue
            silenciado = await _silenciado(db, cobertura, eq)
            await _abrir(db, eventos, "instavel", eid, [], desde, silenciado)

    async def _fechar_orfaos(self, db: AsyncSession, eventos: Eventos, agora: datetime) -> None:
        """Quedas cujos pendentes foram todos pausados/removidos; instável sem equipamento;
        ``fonte_falhou`` cuja fonte foi removida (``fonte_id`` anulado)."""
        for a in await _abertos(db):
            await self._avaliar(db, eventos, a, list(a.voltaram), agora)
        for a in await _instaveis(db):
            if a.equipamento_id is None:
                await self._fechar_instavel(db, eventos, a, agora, None)
        orfaos = await db.execute(
            select(Alerta).where(
                Alerta.tipo == "fonte_falhou",
                Alerta.fonte_id.is_(None),
                Alerta.fechado_em.is_(None),
            )
        )
        for a in orfaos.scalars():
            await _gravar(db, a, fechado_em=agora)
            eventos.append(("fechado", a.id))

    async def _transacao(self, corpo: Corpo) -> None:
        for _ in range(TENTATIVAS):
            eventos: Eventos = []
            async with self._sessoes() as db:
                try:
                    await corpo(db, eventos)
                except _Perdeu:
                    await db.rollback()
                    continue
                await self._concluir(db, eventos)
                return
        log.warning("alerta disputado com o despachante %d vezes; decisão descartada", TENTATIVAS)

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

        async def corpo(db: AsyncSession, eventos: Eventos) -> None:
            if estado == Estado.INSTAVEL.value:
                if eid not in self._instavel_desde and await _critico(db, eid):
                    self._instavel_desde[eid] = t
            elif estado != Estado.SUSPEITO.value:  # oscilação curta não zera a instabilidade
                self._instavel_desde.pop(eid, None)
                for a in await _instaveis(db, eid):
                    await self._fechar_instavel(db, eventos, a, t, estado)
            if estado == Estado.INALCANCAVEL.value and causa and causa.startswith(CAUSA_PAI):
                await self._inalcancavel(db, eventos, eid, causa.removeprefix(CAUSA_PAI), t)
            elif estado in (Estado.OFFLINE.value, Estado.INALCANCAVEL.value):
                await self._offline(db, eventos, eid, t)
            elif estado in _VOLTOU:
                await self._voltou(db, eventos, eid, t)
            elif estado == Estado.PAUSADO.value:  # pausado conta como resolvido
                for a in await _abertos(db):
                    if _contem(a, eid):
                        await self._avaliar(db, eventos, a, list(a.voltaram), t)

        await self._transacao(corpo)

    async def _inalcancavel(
        self, db: AsyncSession, eventos: Eventos, eid: str, pai: str, t: datetime
    ) -> None:
        levar: list[str] = []  # inalcançáveis que ficaram sem queda própria no alerta removido
        for a in await _abertos(db):
            if a.envio not in _NAO_ENVIADO or not _contem(a, eid):
                continue
            quedas = [q for q in a.quedas if q != eid]
            afetados = [f for f in a.afetados if f != eid]
            principal = a.equipamento_id
            if principal == eid and quedas:
                principal = quedas[0]  # o próximo de ``quedas`` vira principal
                afetados = [f for f in afetados if f != principal]
            if principal == eid or (not quedas and not afetados):
                levar += afetados
                await _apagar(db, a)
                eventos.append(("removido", a.id))
            else:
                voltaram = [v for v in a.voltaram if v != eid]
                await _gravar(
                    db, a, equipamento_id=principal, quedas=quedas, afetados=afetados,
                    voltaram=voltaram,
                )  # fmt: skip
                eventos.append(("atualizado", a.id))
        alvo = next((a for a in await _abertos(db) if _contem(a, pai)), None)
        if alvo is None:
            eq_pai = await db.get(Equipamento, pai)
            silenciado = False
            if eq_pai is not None:
                cobertura = await self._silencios.cobertura(db, t)
                silenciado = await _silenciado(db, cobertura, eq_pai)
            await _abrir(db, eventos, "queda", pai, [], t, silenciado, [eid, *levar])
            return
        novos = [x for x in (eid, *levar) if x not in alvo.afetados and x != alvo.equipamento_id]
        if novos:
            await _gravar(
                db,
                alvo,
                afetados=[*alvo.afetados, *novos],
                voltaram=[v for v in alvo.voltaram if v not in novos],
            )
            eventos.append(("atualizado", alvo.id))

    async def _offline(self, db: AsyncSession, eventos: Eventos, eid: str, t: datetime) -> None:
        eq = await db.get(Equipamento, eid)
        if eq is None:
            return
        abertos = await _abertos(db)
        for a in abertos:
            if eid in a.quedas:  # já tem queda aberta: caiu de novo antes do grupo fechar
                if eid in a.voltaram:
                    await _gravar(db, a, voltaram=[v for v in a.voltaram if v != eid])
                    eventos.append(("atualizado", a.id))
                return
        silenciado = await _silenciado(db, await self._silencios.cobertura(db, t), eq)
        envio = "nao_aplica" if silenciado else "pendente"
        limite = t - timedelta(seconds=JANELA_AGRUPAR_S)
        for a in abertos:  # do mais recente para o mais antigo
            if not a.quedas or a.aberto_em < limite:
                continue
            if a.envio != envio or a.silenciado != silenciado:
                continue
            afetados = a.afetados if eid in a.afetados else [*a.afetados, eid]
            await _gravar(
                db,
                a,
                quedas=[*a.quedas, eid],
                afetados=afetados,
                voltaram=[v for v in a.voltaram if v != eid],
            )
            eventos.append(("atualizado", a.id))
            return
        await _abrir(db, eventos, "queda", eid, [eid], t, silenciado)

    async def _voltou(self, db: AsyncSession, eventos: Eventos, eid: str, t: datetime) -> None:
        for a in await _abertos(db):
            if _contem(a, eid) and eid not in a.voltaram:
                await self._avaliar(db, eventos, a, [*a.voltaram, eid], t)

    async def _avaliar(
        self, db: AsyncSession, eventos: Eventos, a: Alerta, voltaram: list[str], t: datetime
    ) -> None:
        """Grava ``voltaram`` e fecha quando todos os esperados estão resolvidos: voltaram,
        pausados ou removidos. Inalcançáveis não seguram, salvo no alerta sem queda própria."""
        esperados = a.quedas or a.afetados
        faltam = [x for x in esperados if x not in voltaram]
        if faltam:
            parados = await _parados(db, faltam)
            faltam = [x for x in faltam if x not in parados]
        if not faltam:
            await self._fechar_queda(db, eventos, a, voltaram, t)
        elif voltaram != a.voltaram:
            await _gravar(db, a, voltaram=voltaram)
            eventos.append(("atualizado", a.id))

    async def _fechar_queda(
        self, db: AsyncSession, eventos: Eventos, a: Alerta, voltaram: list[str], t: datetime
    ) -> None:
        lido = a.envio
        voltou = bool(voltaram)
        breve = voltou and t - a.aberto_em < timedelta(seconds=BREVE_S)
        valores: dict[str, Any] = {"fechado_em": t, "voltaram": voltaram, "breve": breve}
        if breve and lido == "enviado":
            valores["envio"] = "pendente"  # o despachante edita a mensagem já enviada
        elif not voltou and lido == "pendente":
            valores["envio"] = "nao_aplica"  # só pausa/remoção: nada a avisar
        await _gravar(db, a, **valores)
        eventos.append(("fechado", a.id))
        if lido == "enviado" and voltou and not breve:
            await _abrir_volta(db, eventos, a, t)

    async def _fechar_instavel(
        self, db: AsyncSession, eventos: Eventos, a: Alerta, t: datetime, estado: str | None
    ) -> None:
        lido = a.envio
        valores: dict[str, Any] = {"fechado_em": t}
        if lido == "pendente":
            valores["envio"] = "nao_aplica"  # passou antes de ir ao Telegram: nada a avisar
        await _gravar(db, a, **valores)
        eventos.append(("fechado", a.id))
        if lido == "enviado" and estado == Estado.ONLINE.value:
            await _abrir_volta(db, eventos, a, t)  # ao cair, a queda é que avisa

    # ---- fonte ----------------------------------------------------------------------------

    async def _fonte(self, dados: dict[str, Any]) -> None:
        fid = dados.get("id")
        if not isinstance(fid, str):
            return
        ok = bool(dados["ok"])
        if ok:
            self._falhas_fonte.pop(fid, None)
        else:
            self._falhas_fonte[fid] = self._falhas_fonte.get(fid, 0) + 1
        falhas = self._falhas_fonte.get(fid, 0)
        agora = self._agora_parede()

        async def corpo(db: AsyncSession, eventos: Eventos) -> None:
            aberto = await db.scalar(
                select(Alerta).where(
                    Alerta.tipo == "fonte_falhou",
                    Alerta.fonte_id == fid,
                    Alerta.fechado_em.is_(None),
                )
            )
            if ok:
                if aberto is not None:
                    await _gravar(db, aberto, fechado_em=agora)
                    eventos.append(("fechado", aberto.id))
                return
            fonte = await db.get(Fonte, fid)
            if falhas < FALHAS_FONTE or aberto is not None or fonte is None:
                return
            silenciado = False
            if fonte.equipamento_id is not None:
                eq = await db.get(Equipamento, fonte.equipamento_id)
                if eq is not None:
                    cobertura = await self._silencios.cobertura(db, agora)
                    silenciado = await _silenciado(db, cobertura, eq)
            await _abrir(db, eventos, "fonte_falhou", None, [], agora, silenciado, fonte_id=fid)

        await self._transacao(corpo)

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


# ---- escrita guardada ------------------------------------------------------------------------


async def _gravar(db: AsyncSession, a: Alerta, **valores: Any) -> None:
    """UPDATE só se o alerta segue aberto e com o ``envio`` lido; senão, ``_Perdeu``."""
    r = await db.execute(
        update(Alerta)
        .where(Alerta.id == a.id, Alerta.envio == a.envio, Alerta.fechado_em.is_(None))
        .values(**valores)
    )
    if r.rowcount != 1:  # type: ignore[attr-defined]
        raise _Perdeu


async def _apagar(db: AsyncSession, a: Alerta) -> None:
    """DELETE só de alerta aberto e ainda não enviado (``envio`` lido)."""
    r = await db.execute(
        delete(Alerta).where(
            Alerta.id == a.id,
            Alerta.envio == a.envio,
            Alerta.envio.in_(_NAO_ENVIADO),
            Alerta.fechado_em.is_(None),
        )
    )
    if r.rowcount != 1:  # type: ignore[attr-defined]
        raise _Perdeu


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


async def _abrir_volta(db: AsyncSession, eventos: Eventos, origem: Alerta, t: datetime) -> None:
    volta = Alerta(
        tipo="volta",
        equipamento_id=origem.equipamento_id,
        quedas=list(origem.quedas),
        afetados=list(origem.afetados),
        voltaram=list(origem.voltaram),
        aberto_em=t,
        fechado_em=t,
        alerta_origem_id=origem.id,
        silenciado=False,
        envio="pendente",
    )
    db.add(volta)
    await db.flush()
    eventos.append(("aberto", volta.id))


# ---- leitura -----------------------------------------------------------------------------------


async def _abertos(db: AsyncSession) -> list[Alerta]:
    """Alertas ``queda`` abertos, do mais recente para o mais antigo."""
    consulta = (
        select(Alerta)
        .where(Alerta.tipo == "queda", Alerta.fechado_em.is_(None))
        .order_by(Alerta.aberto_em.desc(), Alerta.id.desc())
    )
    return list((await db.execute(consulta)).scalars())


async def _instaveis(db: AsyncSession, eid: str | None = None) -> list[Alerta]:
    consulta = select(Alerta).where(Alerta.tipo == "instavel", Alerta.fechado_em.is_(None))
    if eid is not None:
        consulta = consulta.where(Alerta.equipamento_id == eid)
    return list((await db.execute(consulta)).scalars())


async def _estados(db: AsyncSession, ids: list[str]) -> dict[str, tuple[str, datetime]]:
    if not ids:
        return {}
    linhas = await db.execute(
        select(Equipamento.id, Equipamento.estado, Equipamento.estado_desde).where(
            Equipamento.id.in_(ids)
        )
    )
    return {eid: (estado, desde) for eid, estado, desde in linhas}


async def _parados(db: AsyncSession, ids: list[str]) -> set[str]:
    """Ids pausados ou que não existem mais (contam como resolvidos, sem aviso de volta)."""
    linhas = await db.execute(
        select(Equipamento.id, Equipamento.pausado).where(Equipamento.id.in_(ids))
    )
    existentes = {eid: pausado for eid, pausado in linhas}
    return {x for x in ids if x not in existentes or existentes[x]}


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
