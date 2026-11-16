"""WebSocket ao vivo: um snapshot do banco e, depois, as diferenças publicadas no barramento.

Protocolo (servidor → cliente, JSON):

- ``{"tipo": "snapshot", "classes": [...], "equipamentos": [...]}`` logo após conectar;
- ``{"tipo": "estado", "id", "estado", "desde"}`` a cada transição;
- ``{"tipo": "latencias", "lote": [[id, ms | null], ...]}`` em lote a cada 5 s;
- ``{"tipo": "ping"}`` a cada 25 s (mantém proxies e detecta conexão morta).

Fechamentos: ``4403`` origem diferente do host, ``4401`` sem sessão válida (no handshake ou
na revalidação periódica), ``1013`` cliente lento demais (fila de envio cheia).
"""

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Coroutine
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.api.deps import usuario_do_cookie
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import Classe, Equipamento
from sentinela.monitor.agendador import Agendador
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

router = APIRouter()

FECHA_NAO_AUTENTICADO = 4401
FECHA_ORIGEM_PROIBIDA = 4403
FECHA_CLIENTE_LENTO = 1013  # "try again later"
FECHA_ERRO_INTERNO = 1011
TIPOS_REPASSADOS = frozenset({"estado", "latencias"})  # ``alvo_recusado`` é interno
PING = {"tipo": "ping"}


@dataclass(frozen=True)
class ConfigWs:
    ping_s: float = 25.0
    revalidar_s: float = 60.0
    fila_max: int = 500  # mensagens aguardando envio por conexão


def origem_permitida(websocket: WebSocket) -> bool:
    """``Origin`` obrigatório e igual a ``https://{Host}`` ou ``http://{Host}`` (anti-CSWSH)."""
    host = websocket.headers.get("host")
    origem = websocket.headers.get("origin")
    if not host or not origem:
        return False
    return origem in (f"https://{host}", f"http://{host}")


async def sessao_valida(sessoes: async_sessionmaker[AsyncSession], websocket: WebSocket) -> bool:
    async with sessoes() as db:
        return await usuario_do_cookie(db, websocket.cookies) is not None


async def montar_snapshot(db: AsyncSession) -> dict[str, Any]:
    """Classes e equipamentos com os campos que a tela usa (sem MAC nem fabricante)."""
    classes = (await db.execute(select(Classe).order_by(Classe.ordem, Classe.id))).scalars()
    linhas = await db.execute(
        select(Equipamento, Classe.slug)
        .join(Classe, Equipamento.classe_id == Classe.id)
        .order_by(Equipamento.nome, Equipamento.id)
    )
    return {
        "tipo": "snapshot",
        "classes": [
            {
                "slug": c.slug,
                "nome": c.nome,
                "cor": c.cor,
                "icone": c.icone,
                "intervalo_s": c.intervalo_s,
                "critica": c.critica,
                "ordem": c.ordem,
            }
            for c in classes
        ],
        "equipamentos": [
            {
                "id": eq.id,
                "nome": eq.nome,
                "ip": eq.ip,
                "classe": slug,
                "estado": eq.estado,
                "desde": eq.estado_desde.isoformat(),
                "latencia_ms": eq.latencia_ms,
                "checagem": eq.checagem,
                "porta": eq.porta,
            }
            for eq, slug in linhas
        ],
    }


class _Conexao:
    """Tarefas de uma conexão aceita; a primeira que decide o fim define o código."""

    def __init__(
        self,
        websocket: WebSocket,
        config: ConfigWs,
        relogio: Relogio,
        sessoes: async_sessionmaker[AsyncSession],
    ) -> None:
        self._ws = websocket
        self._config = config
        self._relogio = relogio
        self._sessoes = sessoes
        self._fila: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=config.fila_max)
        self.fim: asyncio.Future[int | None] = asyncio.get_running_loop().create_future()

    def encerrar(self, codigo: int | None) -> None:
        """``None``: o cliente já se foi (nada a fechar)."""
        if not self.fim.done():
            self.fim.set_result(codigo)

    def enfileirar(self, msg: dict[str, Any]) -> None:
        try:
            self._fila.put_nowait(msg)
        except asyncio.QueueFull:
            self.encerrar(FECHA_CLIENTE_LENTO)  # nunca bufferiza sem limite

    async def guardar(self, corpo: Coroutine[Any, Any, None]) -> None:
        """Roda uma tarefa da conexão; qualquer término dela encerra a conexão."""
        try:
            await corpo
        except WebSocketDisconnect:
            self.encerrar(None)
        except Exception:
            log.exception("falha inesperada no WebSocket")
            self.encerrar(FECHA_ERRO_INTERNO)
        else:
            self.encerrar(FECHA_ERRO_INTERNO)  # só chega aqui se já houver código definido

    async def enviar(self) -> None:
        while True:
            msg = await self._fila.get()
            await self._ws.send_text(json.dumps(msg, separators=(",", ":")))

    async def ouvir(self) -> None:
        """O cliente não manda comandos; só detecta a desconexão."""
        while True:
            if (await self._ws.receive())["type"] == "websocket.disconnect":
                self.encerrar(None)
                return

    async def repassar(self, fluxo: AsyncIterator[Mensagem]) -> None:
        async for m in fluxo:
            if m.tipo in TIPOS_REPASSADOS:
                self.enfileirar({**m.dados, "tipo": m.tipo})

    async def pingar(self) -> None:
        while True:
            await self._relogio.dormir(self._config.ping_s)
            self.enfileirar(PING)

    async def revalidar(self) -> None:
        while True:
            await self._relogio.dormir(self._config.revalidar_s)
            if not await sessao_valida(self._sessoes, self._ws):
                self.encerrar(FECHA_NAO_AUTENTICADO)
                return


@router.websocket("/ws")
async def ao_vivo(websocket: WebSocket) -> None:
    estado = websocket.app.state
    sessoes: async_sessionmaker[AsyncSession] = estado.sessoes
    if not origem_permitida(websocket):
        await websocket.close(FECHA_ORIGEM_PROIBIDA)
        return
    if not await sessao_valida(sessoes, websocket):
        await websocket.close(FECHA_NAO_AUTENTICADO)
        return
    await websocket.accept()

    barramento: Barramento = estado.barramento
    agendador: Agendador = estado.agendador
    conexao = _Conexao(websocket, estado.config_ws, estado.relogio, sessoes)
    tarefas: list[asyncio.Task[None]] = []
    # assina ANTES de ler o banco: nada publicado depois da leitura se perde
    async with barramento.assinar() as fluxo:
        try:
            await agendador.aguardar_gravacoes()  # transições já publicadas chegam ao banco
            async with sessoes() as db:
                conexao.enfileirar(await montar_snapshot(db))
            for corpo in (
                conexao.enviar(),
                conexao.ouvir(),
                conexao.repassar(fluxo),
                conexao.pingar(),
                conexao.revalidar(),
            ):
                tarefas.append(asyncio.create_task(conexao.guardar(corpo)))
            codigo = await conexao.fim
        finally:
            for t in tarefas:
                t.cancel()
            await asyncio.gather(*tarefas, return_exceptions=True)
    if codigo is not None:
        try:
            await websocket.close(codigo)
        except (RuntimeError, WebSocketDisconnect):
            pass  # o cliente caiu no meio do fechamento
