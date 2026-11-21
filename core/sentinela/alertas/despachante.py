"""Despachante: fila persistente (o próprio ``alerta.envio``) → Telegram.

A cada 5 s lê os ajustes; sem token legível ou sem chats, não faz nada (nem resolve nome; token
cifrado que não decifra vira o status fixo "Token ilegível."). Com Telegram configurado, para
cada alerta ``pendente`` e não silenciado, em ordem de abertura:

- queda espera ``CONFIRMAR_QUEDA_S`` depois de aberta (tempo para agrupar e para o
  caiu-e-voltou) e ``aparelho_novo`` espera ``CONFIRMAR_NOVO_S`` (a sondagem traz as portas);
  volta, instável, fonte e queda já fechada como caiu-e-voltou saem na hora;
- ``pendente`` + fechado (``fechado_em``) + ``telegram_msgs`` é o fim de uma queda já enviada
  (caiu-e-voltou ou queda fechada depois):
  ``editMessageText`` em cada chat guardado que segue configurado, e ``sendMessage`` do texto do
  caiu-e-voltou só aos chats configurados que nunca receberam a queda (nem em
  ``telegram_msgs`` nem em ``enviado_para``). Falha temporária tenta de novo com a mesma espera
  (editar de novo com o mesmo texto é inofensivo); recusa definitiva vira ``falhou``;
- uma mensagem por alerta e por chat; ``enviado_para`` guarda quem já recebeu, então uma nova
  tentativa só vai aos chats que faltam;
- falha: espera ``min(30·2^(n−1), 1800)`` s, ou o ``retry_after`` do Telegram se maior;
  ``DESISTIR`` depois da abertura, vira ``falhou``. Um ``retry_after`` também bloqueia aquele
  chat (para todos os alertas, neste e nos próximos ciclos) até o prazo pedido. Erro que vale
  para qualquer chat (token recusado, CA adicional inválida) encerra o ciclo na hora;
- limite de ``POR_CHAT_MIN`` mensagens por minuto por chat; se os prontos do ciclo passam do
  que resta no chat mais apertado (entre os não bloqueados), sai o que cabe menos um e o resto
  vira um resumo ("… e mais N alertas, veja no painel"): cada chat recebe o resumo com N = os
  resumidos que ainda faltavam a ele, e um resumido vira ``enviado`` quando todos os chats que
  lhe faltavam receberam o resumo.

Concorrência com o agrupador (contrato no ``Alerta``): toda escrita aqui é um UPDATE só das
colunas de envio, guardado por ``envio='pendente'`` (e, ao concluir um envio, pelo ``breve``
lido e por ``fechado_em IS NULL`` se o alerta foi lido aberto), com conferência do
``rowcount``. ``quedas``/``afetados``/``voltaram``/``fechado_em`` nunca são escritos.

Segredo: o token só existe em memória durante o ciclo; o status e o log levam só os textos fixos
de ``ErroTelegram`` (ou o nome do tipo da exceção inesperada).
"""

import logging
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import partial
from typing import Any, Protocol
from zoneinfo import ZoneInfo

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.alertas.ajustes import decifrar_token, ler_status, ler_telegram, registrar_status
from sentinela.alertas.telegram import ERROS_GLOBAIS, ErroTelegram
from sentinela.alertas.textos import dados_do_alerta, texto_resumo, texto_telegram
from sentinela.db.modelos import Alerta
from sentinela.relogio import Relogio
from sentinela.seguranca.cofre import Cofre

log = logging.getLogger(__name__)

CICLO_S = 5.0
CONFIRMAR_QUEDA_S = 60
CONFIRMAR_NOVO_S = 60  # aparelho novo: tempo da sondagem trazer as portas
ESPERA_INICIAL_S = 30
ESPERA_MAX_S = 1800
DESISTIR = timedelta(hours=24)
POR_CHAT_MIN = 20
JANELA_S = 60.0
MSG_TOKEN_ILEGIVEL = "Token ilegível."  # noqa: S105 - texto de status, não segredo


class Cliente(Protocol):
    """O que o despachante usa do ``ClienteTelegram``."""

    async def enviar(self, token: str, chat: str, texto: str) -> int | None: ...

    async def editar(self, token: str, chat: str, message_id: int, texto: str) -> None: ...


@dataclass
class _Item:
    id: int
    texto: str
    breve: bool
    fechado: bool  # lido já fechado (``fechado_em``): a conclusão só guarda o aberto
    tentativas: int
    enviado_para: list[str]
    msgs: dict[str, int]
    faltam: list[str] = field(default_factory=list)  # envio: chats sem a mensagem
    editar: list[str] = field(default_factory=list)  # caiu-e-voltou: chats a editar


@dataclass
class _Resultado:
    sucesso: bool = False
    erro: str | None = None
    parar: bool = False  # erro que vale para qualquer chat: encerra o ciclo


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
        # chat -> até quando (relógio monotônico) o Telegram pediu para esperar (429)
        self._bloqueios: dict[str, float] = {}

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
            if ajustes.token_cifrado and token is None:
                if (await ler_status(db))["ultimo_erro"] != MSG_TOKEN_ILEGIVEL:
                    await registrar_status(db, False, MSG_TOKEN_ILEGIVEL, agora)
                    await db.commit()
                return
            if not token or not ajustes.chats:
                return
            chats = list(ajustes.chats)
            vencidos, edicoes, envios = await self._prontos(db, agora, chats, ajustes.incluir_ip)
        for id_ in vencidos:
            await self._escrever(id_, envio="falhou", envio_proxima=None)
        r = _Resultado()
        for item in edicoes:
            if r.parar:
                break
            await self._caiu_e_voltou(token, item, agora, r)
        if not r.parar:
            await self._enviar_todos(token, chats, envios, agora, r)
        if r.erro is not None or r.sucesso:
            async with self._sessoes() as db:
                await registrar_status(db, r.sucesso, r.erro, agora)
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
        confirmar_novo = timedelta(seconds=CONFIRMAR_NOVO_S)
        for a in list(linhas):
            if agora - a.aberto_em >= DESISTIR:  # mesmo com nova tentativa marcada
                vencidos.append(a.id)
                continue
            if a.envio_proxima is not None and a.envio_proxima > agora:
                continue
            if a.tipo == "queda" and not a.breve and agora - a.aberto_em < confirmar:
                continue
            if a.tipo == "aparelho_novo" and agora - a.aberto_em < confirmar_novo:
                continue
            dados = await dados_do_alerta(db, a)
            item = _Item(
                id=a.id,
                texto=texto_telegram(dados, self._fuso, incluir_ip),
                breve=a.breve,
                fechado=a.fechado_em is not None,
                tentativas=a.envio_tentativas,
                enviado_para=list(a.enviado_para),
                msgs=dict(a.telegram_msgs),
            )
            if a.fechado_em is not None and a.telegram_msgs:
                # só os chats ainda configurados (chat removido não recebe mais nada)
                item.editar = [c for c in item.msgs if c in chats]
                item.faltam = [
                    c for c in chats if c not in item.msgs and c not in item.enviado_para
                ]
                edicoes.append(item)
            else:
                item.faltam = [c for c in chats if c not in item.enviado_para]
                envios.append(item)
        return vencidos, edicoes, envios

    # ---- caiu-e-voltou depois do envio ---------------------------------------------------

    async def _caiu_e_voltou(self, token: str, item: _Item, agora: datetime, r: _Resultado) -> None:
        if any(self._restante(c) <= 0 for c in (*item.editar, *item.faltam)):
            return  # sem folga (ou bloqueado) em algum chat: o item inteiro fica para depois
        enviado_para = list(item.enviado_para)
        msgs = dict(item.msgs)
        falha: ErroTelegram | None = None
        for chat in item.editar:
            if r.parar:
                break
            mid = msgs[chat]
            ok, _, erro = await self._mandar(
                r, chat, partial(self._cliente.editar, token, chat, mid, item.texto)
            )
            falha = erro or falha
        for chat in item.faltam:  # nunca receberam a queda: a primeira mensagem já é esta
            if r.parar:
                break
            ok, novo, erro = await self._mandar(
                r, chat, partial(self._cliente.enviar, token, chat, item.texto)
            )
            falha = erro or falha
            if ok:
                enviado_para.append(chat)
                if novo is not None:
                    msgs[chat] = novo
        if falha is None and not r.parar:
            await self._escrever(
                item.id,
                envio="enviado",
                enviado_para=enviado_para,
                telegram_msgs=msgs,
                envio_proxima=None,
            )
        elif falha is not None and not falha.temporario and falha.mensagem not in ERROS_GLOBAIS:
            # recusa do chat (não do token/CA, que se corrigem na configuração)
            await self._escrever(
                item.id,
                envio="falhou",
                enviado_para=enviado_para,
                telegram_msgs=msgs,
                envio_proxima=None,
            )
        else:
            await self._adiar(item, falha, agora, enviado_para=enviado_para, telegram_msgs=msgs)

    # ---- envio ---------------------------------------------------------------------------

    async def _enviar_todos(
        self, token: str, chats: list[str], envios: list[_Item], agora: datetime, r: _Resultado
    ) -> None:
        completos = [i for i in envios if not i.faltam]  # chats já atendidos (config mudou)
        for item in completos:
            await self._concluir(item, item.enviado_para, item.msgs)
        livres = [c for c in chats if not self._bloqueado(c)]
        # alerta que só falta em chat bloqueado (429) espera o bloqueio passar
        fila = [i for i in envios if any(c in livres for c in i.faltam)]
        if not fila or not livres:
            return
        orcamento = min(self._restante(c) for c in livres)
        if len(fila) <= orcamento:
            individuais, resumidos = fila, []
        elif orcamento >= 1:
            individuais, resumidos = fila[: orcamento - 1], fila[orcamento - 1 :]
        else:
            return  # minuto cheio no chat mais apertado: espera
        for item in individuais:
            if r.parar:
                return
            await self._enviar(token, item, agora, r)
        if resumidos and not r.parar:
            await self._resumir(token, chats, resumidos, agora, r)

    async def _enviar(self, token: str, item: _Item, agora: datetime, r: _Resultado) -> None:
        enviado_para = list(item.enviado_para)
        msgs = dict(item.msgs)
        falha: ErroTelegram | None = None
        for chat in item.faltam:
            if r.parar:
                break
            if self._restante(chat) <= 0:
                continue  # chat cheio no minuto ou bloqueado: fica para o próximo ciclo
            ok, mid, erro = await self._mandar(
                r, chat, partial(self._cliente.enviar, token, chat, item.texto)
            )
            falha = erro or falha
            if ok:
                enviado_para.append(chat)
                if mid is not None:
                    msgs[chat] = mid
        if falha is not None:
            await self._adiar(item, falha, agora, enviado_para=enviado_para, telegram_msgs=msgs)
        elif all(c in enviado_para for c in item.faltam):
            await self._concluir(item, enviado_para, msgs)
        else:
            await self._escrever(item.id, enviado_para=enviado_para, telegram_msgs=msgs)

    async def _concluir(self, item: _Item, enviado_para: list[str], msgs: dict[str, int]) -> None:
        """``enviado``, guardado também pelo ``breve`` lido e, se lido aberto, por ``fechado_em IS
        NULL``: se o agrupador fechou o alerta durante o envio, ele fica ``pendente`` com as
        mensagens guardadas e o próximo ciclo edita."""
        if await self._escrever(
            item.id,
            breve=item.breve,
            aberto=not item.fechado,
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
        """Um resumo por chat, contando só os resumidos que ainda faltavam àquele chat."""
        entregues: list[str] = []
        falha: ErroTelegram | None = None
        for chat in chats:
            if r.parar:
                break
            n = sum(1 for i in resumidos if chat in i.faltam)
            if n == 0 or self._restante(chat) <= 0:
                continue
            ok, _, erro = await self._mandar(
                r, chat, partial(self._cliente.enviar, token, chat, texto_resumo(n))
            )
            falha = erro or falha
            if ok:
                entregues.append(chat)
        for item in resumidos:
            para = list(
                dict.fromkeys([*item.enviado_para, *(c for c in item.faltam if c in entregues)])
            )
            if all(c in para for c in item.faltam):
                await self._escrever(
                    item.id, envio="enviado", enviado_para=para, envio_proxima=None
                )
            elif falha is not None:
                await self._adiar(item, falha, agora, enviado_para=para)
            elif para != item.enviado_para:
                await self._escrever(item.id, enviado_para=para)

    # ---- apoio ---------------------------------------------------------------------------

    async def _mandar(
        self, r: _Resultado, chat: str, chamada: Callable[[], Awaitable[int | None]]
    ) -> tuple[bool, int | None, ErroTelegram | None]:
        """Uma mensagem (envio ou edição) num chat: conta no minuto, aplica o bloqueio pedido
        pelo Telegram e marca o fim do ciclo em erro global."""
        self._marcar(chat)
        try:
            mid = await chamada()
        except ErroTelegram as e:
            r.erro = e.mensagem
            if e.espera_s:
                self._bloqueios[chat] = self._relogio.agora() + e.espera_s
            if e.mensagem in ERROS_GLOBAIS:
                r.parar = True
            return False, None, e
        r.sucesso = True
        return True, mid, None

    async def _adiar(
        self, item: _Item, falha: ErroTelegram | None, agora: datetime, **valores: Any
    ) -> None:
        if falha is None:  # parou no meio (erro global noutro alerta): só guarda o progresso
            await self._escrever(item.id, **valores)
            return
        n = item.tentativas + 1
        await self._escrever(
            item.id,
            envio_tentativas=n,
            envio_proxima=agora + timedelta(seconds=espera_s(n, falha.espera_s)),
            **valores,
        )

    async def _escrever(
        self, id_: int, breve: bool | None = None, aberto: bool = False, **valores: Any
    ) -> bool:
        """UPDATE só das colunas de envio, só se o alerta segue ``pendente`` (com o ``breve``
        lido, se dado, e ainda aberto, se ``aberto``). ``False``: o agrupador mudou o alerta
        antes."""
        condicoes = [Alerta.id == id_, Alerta.envio == "pendente"]
        if breve is not None:
            condicoes.append(Alerta.breve.is_(breve))
        if aberto:
            condicoes.append(Alerta.fechado_em.is_(None))
        async with self._sessoes() as db:
            resultado = await db.execute(update(Alerta).where(*condicoes).values(**valores))
            await db.commit()
        return bool(resultado.rowcount == 1)  # type: ignore[attr-defined]

    def _bloqueado(self, chat: str) -> bool:
        ate = self._bloqueios.get(chat)
        if ate is None:
            return False
        if self._relogio.agora() >= ate:
            del self._bloqueios[chat]
            return False
        return True

    def _restante(self, chat: str) -> int:
        """Mensagens que ainda cabem no minuto deste chat (0 se o Telegram pediu espera)."""
        if self._bloqueado(chat):
            return 0
        janela = self._janelas.setdefault(chat, deque())
        limite = self._relogio.agora() - JANELA_S
        while janela and janela[0] <= limite:
            janela.popleft()
        return POR_CHAT_MIN - len(janela)

    def _marcar(self, chat: str) -> None:
        self._janelas.setdefault(chat, deque()).append(self._relogio.agora())
