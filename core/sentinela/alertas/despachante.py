"""Despachante: fila persistente (o próprio ``alerta.envio``) → Telegram.

A cada 5 s lê os ajustes; sem token legível ou sem chats, não faz nada (nem resolve nome).
Com Telegram configurado, para cada alerta ``pendente`` e não silenciado, em ordem de abertura:

- queda espera ``CONFIRMAR_QUEDA_S`` depois de aberta (tempo para agrupar e para o
  caiu-e-voltou); volta, instável, fonte e queda já fechada como caiu-e-voltou saem na hora;
- ``pendente`` + ``breve`` + ``telegram_msgs`` é a edição da mensagem já enviada
  (``editMessageText`` em cada chat guardado que segue configurado, nunca mensagem nova; falha
  temporária tenta a edição de novo com a mesma espera, recusa definitiva vira ``falhou``);
- uma mensagem por alerta e por chat; ``enviado_para`` guarda quem já recebeu, então uma nova
  tentativa só vai aos chats que faltam;
- falha: espera ``min(30·2^(n−1), 1800)`` s, ou o ``retry_after`` do Telegram se maior;
  ``DESISTIR`` depois da abertura, vira ``falhou``;
- limite de ``POR_CHAT_MIN`` mensagens por minuto por chat; se os prontos do ciclo passam do
  que resta no chat mais apertado, sai o que cabe menos um e o resto vira uma mensagem só
  ("… e mais N alertas, veja no painel"), com esses alertas marcados ``enviado``.

Concorrência com o agrupador (contrato no ``Alerta``): toda escrita aqui é um UPDATE só das
colunas de envio, guardado por ``envio='pendente'`` (e, ao concluir um envio, pelo ``breve``
lido), com conferência do ``rowcount``. ``quedas``/``afetados``/``voltaram``/``fechado_em``
nunca são escritos.

Segredo: o token só existe em memória durante o ciclo; o status e o log levam só os textos fixos
de ``ErroTelegram`` (ou o nome do tipo da exceção inesperada).
"""

import logging
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Protocol
from zoneinfo import ZoneInfo

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.alertas.ajustes import decifrar_token, ler_telegram, registrar_status
from sentinela.alertas.telegram import ErroTelegram
from sentinela.alertas.textos import dados_do_alerta, texto_resumo, texto_telegram
from sentinela.db.modelos import Alerta
from sentinela.relogio import Relogio
from sentinela.seguranca.cofre import Cofre

log = logging.getLogger(__name__)

CICLO_S = 5.0
CONFIRMAR_QUEDA_S = 60
ESPERA_INICIAL_S = 30
ESPERA_MAX_S = 1800
DESISTIR = timedelta(hours=24)
POR_CHAT_MIN = 20
JANELA_S = 60.0


class Cliente(Protocol):
    """O que o despachante usa do ``ClienteTelegram``."""

    async def enviar(self, token: str, chat: str, texto: str) -> int | None: ...

    async def editar(self, token: str, chat: str, message_id: int, texto: str) -> None: ...


@dataclass
class _Item:
    id: int
    texto: str
    breve: bool
    tentativas: int
    enviado_para: list[str]
    msgs: dict[str, int]
    faltam: list[str] = field(default_factory=list)


@dataclass
class _Resultado:
    sucesso: bool = False
    erro: str | None = None


def espera_s(tentativas: int, pedido_s: float | None = None) -> float:
    """Espera depois da ``tentativas``-ésima falha (1, 2, ...); ``retry_after`` maior vence."""
    base = float(min(ESPERA_INICIAL_S * 2 ** max(tentativas - 1, 0), ESPERA_MAX_S))
    return pedido_s if pedido_s is not None and pedido_s > base else base


class Despachante:
    def __init__(
        self,
        sessoes: async_sessionmaker[AsyncSession],
        cliente: Cliente,
        cofre: Cofre,
        relogio: Relogio,
        agora_parede: Callable[[], datetime],
        fuso: ZoneInfo,
    ) -> None:
        self._sessoes = sessoes
        self._cliente = cliente
        self._cofre = cofre
        self._relogio = relogio
        self._agora = agora_parede
        self._fuso = fuso
        # chat -> instantes (relógio monotônico) das mensagens do último minuto
        self._janelas: dict[str, deque[float]] = {}

    async def executar(self) -> None:
        while True:
            try:
                await self.ciclo()
            except Exception as e:  # noqa: BLE001 - o laço não para; texto da exceção pode ter segredo
                log.error("falha no ciclo do envio ao Telegram (%s)", type(e).__name__)
            await self._relogio.dormir(CICLO_S)

    # ---- ciclo ---------------------------------------------------------------------------

    async def ciclo(self) -> None:
        agora = self._agora()
        async with self._sessoes() as db:
            ajustes = await ler_telegram(db)
            token = decifrar_token(self._cofre, ajustes.token_cifrado)
            if not token or not ajustes.chats:
                return
            chats = list(ajustes.chats)
            vencidos, edicoes, envios = await self._prontos(db, agora, chats, ajustes.incluir_ip)
        for id_ in vencidos:
            await self._escrever(id_, envio="falhou", envio_proxima=None)
        r = _Resultado()
        for item in edicoes:
            await self._editar(token, item, agora, r)
        await self._enviar_todos(token, chats, envios, agora, r)
        if r.erro is not None or r.sucesso:
            async with self._sessoes() as db:
                await registrar_status(db, r.erro is None, r.erro, agora)
                await db.commit()

    async def _prontos(
        self, db: AsyncSession, agora: datetime, chats: list[str], incluir_ip: bool
    ) -> tuple[list[int], list[_Item], list[_Item]]:
        linhas = (
            await db.execute(
                select(Alerta)
                .where(Alerta.envio == "pendente", Alerta.silenciado.is_(False))
                .order_by(Alerta.aberto_em, Alerta.id)
            )
        ).scalars()
        vencidos: list[int] = []
        edicoes: list[_Item] = []
        envios: list[_Item] = []
        confirmar = timedelta(seconds=CONFIRMAR_QUEDA_S)
        for a in list(linhas):
            if agora - a.aberto_em >= DESISTIR:  # mesmo com nova tentativa marcada
                vencidos.append(a.id)
                continue
            if a.envio_proxima is not None and a.envio_proxima > agora:
                continue
            editar = a.breve and bool(a.telegram_msgs)
            if a.tipo == "queda" and not a.breve and agora - a.aberto_em < confirmar:
                continue
            dados = await dados_do_alerta(db, a)
            item = _Item(
                id=a.id,
                texto=texto_telegram(dados, self._fuso, incluir_ip),
                breve=a.breve,
                tentativas=a.envio_tentativas,
                enviado_para=list(a.enviado_para),
                msgs=dict(a.telegram_msgs),
            )
            if editar:
                # só os chats ainda configurados (chat removido não recebe mais nada)
                item.faltam = [c for c in item.msgs if c in chats]
                edicoes.append(item)
            else:
                item.faltam = [c for c in chats if c not in item.enviado_para]
                envios.append(item)
        return vencidos, edicoes, envios

    # ---- edição do caiu-e-voltou ---------------------------------------------------------

    async def _editar(self, token: str, item: _Item, agora: datetime, r: _Resultado) -> None:
        if any(self._restante(chat) <= 0 for chat in item.faltam):
            return  # sem folga no minuto: tenta no próximo ciclo
        falha: ErroTelegram | None = None
        for chat in item.faltam:
            self._marcar(chat)
            try:
                await self._cliente.editar(token, chat, item.msgs[chat], item.texto)
            except ErroTelegram as e:
                falha = e
        if falha is None:
            r.sucesso = r.sucesso or bool(item.faltam)
            await self._escrever(item.id, envio="enviado", envio_proxima=None)
            return
        r.erro = falha.mensagem
        if not falha.temporario:
            await self._escrever(item.id, envio="falhou", envio_proxima=None)
            return
        n = item.tentativas + 1
        await self._escrever(
            item.id,
            envio_tentativas=n,
            envio_proxima=agora + timedelta(seconds=espera_s(n, falha.espera_s)),
        )

    # ---- envio ---------------------------------------------------------------------------

    async def _enviar_todos(
        self, token: str, chats: list[str], envios: list[_Item], agora: datetime, r: _Resultado
    ) -> None:
        completos = [i for i in envios if not i.faltam]  # chats já atendidos (config mudou)
        for item in completos:
            await self._concluir(item, item.enviado_para, item.msgs)
        fila = [i for i in envios if i.faltam]
        if not fila:
            return
        orcamento = min(self._restante(c) for c in chats)
        if len(fila) <= orcamento:
            individuais, resumidos = fila, []
        elif orcamento >= 1:
            individuais, resumidos = fila[: orcamento - 1], fila[orcamento - 1 :]
        else:
            return  # minuto cheio no chat mais apertado: espera
        for item in individuais:
            await self._enviar(token, item, agora, r)
        if resumidos:
            await self._resumir(token, chats, resumidos, agora, r)

    async def _enviar(self, token: str, item: _Item, agora: datetime, r: _Resultado) -> None:
        enviado_para = list(item.enviado_para)
        msgs = dict(item.msgs)
        falha: ErroTelegram | None = None
        for chat in item.faltam:
            if self._restante(chat) <= 0:
                continue  # este chat está cheio no minuto; fica para o próximo ciclo
            self._marcar(chat)
            try:
                mid = await self._cliente.enviar(token, chat, item.texto)
            except ErroTelegram as e:
                falha = e
                continue
            r.sucesso = True
            enviado_para.append(chat)
            if mid is not None:
                msgs[chat] = mid
        if falha is not None:
            r.erro = falha.mensagem
            n = item.tentativas + 1
            await self._escrever(
                item.id,
                enviado_para=enviado_para,
                telegram_msgs=msgs,
                envio_tentativas=n,
                envio_proxima=agora + timedelta(seconds=espera_s(n, falha.espera_s)),
            )
        elif all(c in enviado_para for c in item.faltam):
            await self._concluir(item, enviado_para, msgs)
        else:
            await self._escrever(item.id, enviado_para=enviado_para, telegram_msgs=msgs)

    async def _concluir(self, item: _Item, enviado_para: list[str], msgs: dict[str, int]) -> None:
        """``enviado``, guardado também pelo ``breve`` lido: se o agrupador fechou como
        caiu-e-voltou durante o envio, o alerta fica ``pendente`` com as mensagens guardadas e o
        próximo ciclo edita."""
        if await self._escrever(
            item.id,
            breve=item.breve,
            envio="enviado",
            enviado_para=enviado_para,
            telegram_msgs=msgs,
            envio_proxima=None,
        ):
            return
        await self._escrever(item.id, enviado_para=enviado_para, telegram_msgs=msgs)

    async def _resumir(
        self, token: str, chats: list[str], resumidos: list[_Item], agora: datetime, r: _Resultado
    ) -> None:
        texto = texto_resumo(len(resumidos))
        entregues: list[str] = []
        falha: ErroTelegram | None = None
        for chat in chats:
            if self._restante(chat) <= 0:
                continue
            self._marcar(chat)
            try:
                await self._cliente.enviar(token, chat, texto)
            except ErroTelegram as e:
                falha = e
                continue
            entregues.append(chat)
        if falha is not None:
            r.erro = falha.mensagem
        if entregues:
            r.sucesso = True
            for item in resumidos:
                para = list(dict.fromkeys([*item.enviado_para, *entregues]))
                await self._escrever(
                    item.id, envio="enviado", enviado_para=para, envio_proxima=None
                )
            return
        if falha is not None:
            for item in resumidos:
                n = item.tentativas + 1
                await self._escrever(
                    item.id,
                    envio_tentativas=n,
                    envio_proxima=agora + timedelta(seconds=espera_s(n, falha.espera_s)),
                )

    # ---- apoio ---------------------------------------------------------------------------

    async def _escrever(self, id_: int, breve: bool | None = None, **valores: Any) -> bool:
        """UPDATE só das colunas de envio, só se o alerta segue ``pendente`` (e com o ``breve``
        lido, se dado). ``False``: o agrupador mudou o alerta antes."""
        condicoes = [Alerta.id == id_, Alerta.envio == "pendente"]
        if breve is not None:
            condicoes.append(Alerta.breve.is_(breve))
        async with self._sessoes() as db:
            resultado = await db.execute(update(Alerta).where(*condicoes).values(**valores))
            await db.commit()
        return bool(resultado.rowcount == 1)  # type: ignore[attr-defined]

    def _restante(self, chat: str) -> int:
        janela = self._janelas.setdefault(chat, deque())
        limite = self._relogio.agora() - JANELA_S
        while janela and janela[0] <= limite:
            janela.popleft()
        return POR_CHAT_MIN - len(janela)

    def _marcar(self, chat: str) -> None:
        self._janelas.setdefault(chat, deque()).append(self._relogio.agora())
