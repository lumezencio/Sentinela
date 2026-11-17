"""WebSocket ao vivo: um snapshot do banco e, depois, as diferenças publicadas no barramento.

Protocolo (servidor → cliente, JSON):

- ``{"tipo": "snapshot", "classes": [...], "equipamentos": [...], "pendentes": n}`` logo
  após conectar (``pendentes``: descobertas na fila);
- ``{"tipo": "estado", "id", "estado", "desde"}`` a cada transição;
- ``{"tipo": "latencias", "lote": [[id, ms | null], ...]}`` em lote a cada 5 s;
- ``{"tipo": "descoberta", "acao": "nova"|"atualizada"|"removida", "id", "classe_sugerida",
  "confianca"}``, ``{"tipo": "pendentes", "total"}`` e ``{"tipo": "varredura", "cidr",
  "feitos", "total", "achados", "estado"}`` (descoberta, Fase 3);
- ``{"tipo": "equipamento", "acao": "criado"|"atualizado", "equipamento": {...}}`` com a
  linha no MESMO formato de ``snapshot.equipamentos`` (aprovação, IP mudado pela descoberta,
  checagem trocada depois da aprovação), ou ``{"tipo": "equipamento", "acao": "removido",
  "id"}`` se ele já não existe;
- ``{"tipo": "ping"}`` a cada 25 s (mantém proxies e detecta conexão morta).

Fechamentos: ``4403`` origem diferente do host, ``4401`` sem sessão válida (no handshake ou
na revalidação periódica), ``1013`` cliente lento demais (fila de envio cheia). No handshake a
recusa é "aceita e fecha" sem enviar dados (R19): fechar antes do accept chega ao navegador como
1006, e o front não distinguiria "precisa de login" de "rede caiu".
"""

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Coroutine
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.api.deps import usuario_do_cookie
from sentinela.barramento import Barramento, Mensagem
from sentinela.config import Settings
from sentinela.db.modelos import Classe, Descoberta, Equipamento, Usuario
from sentinela.monitor.agendador import Agendador
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

router = APIRouter()

FECHA_NAO_AUTENTICADO = 4401
FECHA_ORIGEM_PROIBIDA = 4403
FECHA_CLIENTE_LENTO = 1013  # "try again later"
FECHA_ERRO_INTERNO = 1011
# ``alvo_recusado`` é interno; ``equipamento`` é enriquecido com a linha do banco
TIPOS_REPASSADOS = frozenset({"estado", "latencias", "descoberta", "pendentes", "varredura"})
PING = {"tipo": "ping"}


@dataclass(frozen=True)
class ConfigWs:
    ping_s: float = 25.0
    revalidar_s: float = 60.0
    fila_max: int = 500  # mensagens aguardando envio por conexão


def origem_permitida(websocket: WebSocket) -> bool:
    """``Origin`` obrigatório e igual ao ``Host`` recebido (anti-CSWSH).

    Em produção só ``https://{Host}``. Fora dela também ``http://{Host}`` (desenvolvimento
    sem TLS): isso só é seguro porque o cookie de sessão é ``SameSite=Strict`` e ``Secure``,
    então uma página de outro site não consegue abrir o WS com a sessão do usuário.
    """
    host = websocket.headers.get("host")
    origem = websocket.headers.get("origin")
    if not host or not origem:
        return False
    settings: Settings = websocket.app.state.settings
    permitidas = {f"https://{host}"}
    if settings.ambiente != "producao":
        permitidas.add(f"http://{host}")
    return origem in permitidas


async def _usuario(
    sessoes: async_sessionmaker[AsyncSession], websocket: WebSocket
) -> Usuario | None:
    async with sessoes() as db:
        return await usuario_do_cookie(db, websocket.cookies)


async def sessao_valida(sessoes: async_sessionmaker[AsyncSession], websocket: WebSocket) -> bool:
    return await _usuario(sessoes, websocket) is not None


async def _recusar(websocket: WebSocket, codigo: int) -> None:
    """Aceita e fecha na hora, sem enviar dados, para o navegador ver o código (R19)."""
    await websocket.accept()
    await websocket.close(codigo)


async def ws_autenticado(websocket: WebSocket) -> Usuario | None:
    """Origin (antes de qualquer consulta ao banco) e sessão do cookie, para toda rota WS.

    Recusado: o handshake é aceito e fechado com 4403/4401 e a função devolve None. Aceito:
    devolve o usuário; quem chamou faz o ``accept``.
    """
    if not origem_permitida(websocket):
        await _recusar(websocket, FECHA_ORIGEM_PROIBIDA)
        return None
    usuario = await _usuario(websocket.app.state.sessoes, websocket)
    if usuario is None:
        await _recusar(websocket, FECHA_NAO_AUTENTICADO)
        return None
    return usuario


def item_equipamento(eq: Equipamento, slug: str) -> dict[str, Any]:
    """Linha de equipamento do snapshot (sem MAC nem fabricante); ``pai_id``/``canal`` para
    câmera atrás de gravador."""
    return {
        "id": eq.id,
        "nome": eq.nome,
        "ip": eq.ip,
        "classe": slug,
        "estado": eq.estado,
        "desde": eq.estado_desde.isoformat(),
        "latencia_ms": eq.latencia_ms,
        "checagem": eq.checagem,
        "porta": eq.porta,
        "pai_id": eq.pai_id,
        "canal": eq.canal,
    }


async def mensagem_equipamento(db: AsyncSession, acao: str, id: str) -> dict[str, Any]:
    linha = (
        await db.execute(
            select(Equipamento, Classe.slug)
            .join(Classe, Equipamento.classe_id == Classe.id)
            .where(Equipamento.id == id)
        )
    ).first()
    if linha is None:
        return {"tipo": "equipamento", "acao": "removido", "id": id}
    eq, slug = linha
    return {"tipo": "equipamento", "acao": acao, "equipamento": item_equipamento(eq, slug)}


async def montar_snapshot(db: AsyncSession) -> dict[str, Any]:
    """Classes, equipamentos com os campos que a tela usa (sem MAC nem fabricante) e o total
    de descobertas pendentes."""
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
        "equipamentos": [item_equipamento(eq, slug) for eq, slug in linhas],
        "pendentes": int(
            await db.scalar(
                select(func.count()).select_from(Descoberta).where(Descoberta.status == "pendente")
            )
            or 0
        ),
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
            elif m.tipo == "equipamento" and isinstance(m.dados.get("id"), str):
                acao = "criado" if m.dados.get("acao") == "criado" else "atualizado"
                async with self._sessoes() as db:
                    self.enfileirar(await mensagem_equipamento(db, acao, m.dados["id"]))

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
    if await ws_autenticado(websocket) is None:
        return
    await websocket.accept()

    estado = websocket.app.state
    sessoes: async_sessionmaker[AsyncSession] = estado.sessoes

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
