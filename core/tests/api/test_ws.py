"""WebSocket ao vivo e laços do monitor no lifespan (Task 10).

O WS é exercitado direto pela interface ASGI, no mesmo laço de eventos das fixtures
assíncronas (o barramento e o relógio falso do app são os mesmos do teste).
"""

import asyncio
import json
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable, MutableMapping
from datetime import UTC, datetime
from typing import Any, Protocol

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.barramento import Barramento, Mensagem
from sentinela.config import Settings
from sentinela.db.modelos import Classe, Equipamento, Sessao
from sentinela.main import criar_app
from sentinela.relogio import RelogioFalso
from tests.conftest import criar_esquema

ESPERA_S = 5.0  # teto anti-travamento; nada no teste depende de tempo real
DESDE = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
CAMPOS_EQUIPAMENTO = {
    "id",
    "nome",
    "ip",
    "classe",
    "estado",
    "desde",
    "latencia_ms",
    "checagem",
    "porta",
}

type Asgi = dict[str, Any]


class ClienteWs:
    """Cliente WebSocket mínimo sobre ASGI; ``portao`` fechado simula cliente lento."""

    def __init__(self, app: FastAPI, cabecalhos: dict[str, str]) -> None:
        self._app = app
        self._cabecalhos = cabecalhos
        self._entrada: asyncio.Queue[Asgi] = asyncio.Queue()
        self._saida: asyncio.Queue[Asgi] = asyncio.Queue()
        self.portao = asyncio.Event()
        self.portao.set()
        self._tarefa: asyncio.Task[None] | None = None

    async def _receber(self) -> Asgi:
        return await self._entrada.get()

    async def _enviar(self, msg: MutableMapping[str, Any]) -> None:
        if msg["type"] == "websocket.send":
            await self.portao.wait()
        await self._saida.put(dict(msg))

    async def conectar(self) -> Asgi:
        """Abre o handshake e devolve a resposta (``websocket.accept`` ou ``websocket.close``)."""
        escopo: Asgi = {
            "type": "websocket",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "scheme": "wss",
            "path": "/ws",
            "raw_path": b"/ws",
            "root_path": "",
            "query_string": b"",
            "headers": [(k.lower().encode(), v.encode()) for k, v in self._cabecalhos.items()],
            "client": ("10.99.0.50", 50000),
            "server": ("teste", 443),
            "subprotocols": [],
            "state": {},
        }
        self._entrada.put_nowait({"type": "websocket.connect"})
        self._tarefa = asyncio.create_task(self._app(escopo, self._receber, self._enviar))
        return await self.proxima()

    async def proxima(self) -> Asgi:
        return await asyncio.wait_for(self._saida.get(), ESPERA_S)

    async def json(self) -> dict[str, Any]:
        msg = await self.proxima()
        assert msg["type"] == "websocket.send", msg
        dados: dict[str, Any] = json.loads(msg["text"])
        return dados

    async def fechamento(self) -> int:
        """Pula mensagens até o servidor fechar; devolve o código."""
        while True:
            msg = await self.proxima()
            if msg["type"] == "websocket.close":
                await self.terminar()
                return int(msg.get("code", 1000))

    async def terminar(self) -> None:
        """Cliente desconecta (se ainda conectado) e o handler do servidor termina."""
        assert self._tarefa is not None
        if not self._tarefa.done():
            self._entrada.put_nowait({"type": "websocket.disconnect", "code": 1000})
        await asyncio.wait_for(self._tarefa, ESPERA_S)


class AbrirWs(Protocol):
    def __call__(
        self, *, cookie: str | None = ..., origem: str | None = ..., host: str = ...
    ) -> ClienteWs: ...


def _token(cliente: httpx.AsyncClient) -> str:
    token = cliente.cookies.get("sentinela_sessao")
    assert token is not None
    return token


@pytest.fixture
async def abrir_ws(app: FastAPI, cliente: httpx.AsyncClient) -> AsyncIterator[AbrirWs]:
    """Fábrica de clientes WS; os que ficarem abertos são desconectados antes do shutdown."""
    abertos: list[ClienteWs] = []

    def _abrir(
        *, cookie: str | None = None, origem: str | None = "https://teste", host: str = "teste"
    ) -> ClienteWs:
        cabecalhos = {"host": host}
        if origem is not None:
            cabecalhos["origin"] = origem
        if cookie is not None:
            cabecalhos["cookie"] = f"sentinela_sessao={cookie}"
        ws = ClienteWs(app, cabecalhos)
        abertos.append(ws)
        return ws

    yield _abrir
    for ws in abertos:
        if ws._tarefa is not None:  # noqa: SLF001 - limpeza do próprio harness
            await ws.terminar()


def _sessoes(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
    return sessoes


async def _criar_equipamentos(app: FastAPI, n: int, slug: str = "camera") -> list[str]:
    ids: list[str] = []
    async with _sessoes(app)() as db:
        classe = await db.scalar(select(Classe).where(Classe.slug == slug))
        assert classe is not None
        for i in range(n):
            eq = Equipamento(
                id=str(uuid.uuid4()),
                nome=f"Equipamento {i}",
                ip=f"10.99.5.{i + 1}",
                mac=f"02:00:00:00:05:{i + 1:02x}",
                classe_id=classe.id,
                checagem="tcp" if i % 2 else "icmp",
                porta=554 if i % 2 else None,
                estado="online",
                estado_desde=DESDE,
                latencia_ms=1.5,
                criado_em=DESDE,
            )
            db.add(eq)
            ids.append(eq.id)
        await db.commit()
    return ids


async def _aberto(abrir_ws: AbrirWs, cliente: httpx.AsyncClient) -> ClienteWs:
    ws = abrir_ws(cookie=_token(cliente))
    assert (await ws.conectar())["type"] == "websocket.accept"
    return ws


# ---- autenticação e origem --------------------------------------------------------------------


async def test_sem_cookie_fecha_4401(abrir_ws: AbrirWs) -> None:
    ws = abrir_ws()
    msg = await ws.conectar()
    assert msg == {"type": "websocket.close", "code": 4401, "reason": ""}


async def test_cookie_invalido_fecha_4401(abrir_ws: AbrirWs) -> None:
    msg = await abrir_ws(cookie="token-que-nao-existe").conectar()
    assert msg["type"] == "websocket.close" and msg["code"] == 4401


async def test_sessao_revogada_fecha_4401(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    token = _token(cliente_visualizador)
    async with _sessoes(app)() as db:
        await db.execute(update(Sessao).values(revogada=True))
        await db.commit()
    msg = await abrir_ws(cookie=token).conectar()
    assert msg["type"] == "websocket.close" and msg["code"] == 4401


@pytest.mark.parametrize(
    "origem", ["https://outro.exemplo", "https://teste.exemplo", "null", "https://teste:8443"]
)
async def test_origem_estranha_recusada(
    cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs, origem: str
) -> None:
    msg = await abrir_ws(cookie=_token(cliente_visualizador), origem=origem).conectar()
    assert msg["type"] == "websocket.close" and msg["code"] == 4403


async def test_sem_origem_recusada(
    cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    msg = await abrir_ws(cookie=_token(cliente_visualizador), origem=None).conectar()
    assert msg["type"] == "websocket.close" and msg["code"] == 4403


@pytest.mark.parametrize("origem", ["https://teste:8443", "http://teste:8443"])
async def test_origem_igual_ao_host_com_porta_aceita(
    cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs, origem: str
) -> None:
    ws = abrir_ws(cookie=_token(cliente_visualizador), origem=origem, host="teste:8443")
    assert (await ws.conectar())["type"] == "websocket.accept"
    assert (await ws.json())["tipo"] == "snapshot"


# ---- snapshot ---------------------------------------------------------------------------------


async def test_snapshot_com_equipamentos_e_classes(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    ids = await _criar_equipamentos(app, 3)
    ws = await _aberto(abrir_ws, cliente_visualizador)
    snap = await ws.json()
    assert snap["tipo"] == "snapshot"
    assert set(snap) == {"tipo", "classes", "equipamentos"}
    assert {c["slug"] for c in snap["classes"]} >= {"camera", "roteador"}
    assert set(snap["classes"][0]) == {
        "slug",
        "nome",
        "cor",
        "icone",
        "intervalo_s",
        "critica",
        "ordem",
    }
    assert len(snap["equipamentos"]) == 3
    assert {e["id"] for e in snap["equipamentos"]} == set(ids)
    for e in snap["equipamentos"]:
        assert set(e) == CAMPOS_EQUIPAMENTO  # sem MAC nem outros campos
        assert e["classe"] == "camera"
        assert e["estado"] == "online"
        assert datetime.fromisoformat(e["desde"]) == DESDE
        assert e["latencia_ms"] == 1.5
    tcp = next(e for e in snap["equipamentos"] if e["checagem"] == "tcp")
    assert tcp["porta"] == 554


async def test_snapshot_vazio(cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs) -> None:
    ws = await _aberto(abrir_ws, cliente_visualizador)
    snap = await ws.json()
    assert snap["tipo"] == "snapshot" and snap["equipamentos"] == []


async def test_admin_tambem_recebe(cliente_admin: httpx.AsyncClient, abrir_ws: AbrirWs) -> None:
    ws = await _aberto(abrir_ws, cliente_admin)
    assert (await ws.json())["tipo"] == "snapshot"


# ---- diferenças ao vivo -----------------------------------------------------------------------


async def test_repassa_estado_e_latencias_do_barramento(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()  # snapshot
    barramento: Barramento = app.state.barramento
    barramento.publicar(Mensagem("alvo_recusado", {"id": "x", "motivo": "interno"}))
    estado = {"id": "eq1", "estado": "offline", "desde": DESDE.isoformat()}
    barramento.publicar(Mensagem("estado", estado))
    barramento.publicar(Mensagem("latencias", {"lote": [["eq1", 2.5], ["eq2", None]]}))
    assert await ws.json() == {"tipo": "estado", **estado}
    assert await ws.json() == {"tipo": "latencias", "lote": [["eq1", 2.5], ["eq2", None]]}


async def test_reconectar_recebe_snapshot_novo(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    barramento: Barramento = app.state.barramento
    (eq,) = await _criar_equipamentos(app, 1)
    ws = await _aberto(abrir_ws, cliente_visualizador)
    assert (await ws.json())["equipamentos"][0]["estado"] == "online"
    await ws.terminar()
    assert barramento.total_assinantes == 0  # nada vaza ao desconectar
    async with _sessoes(app)() as db:
        await db.execute(update(Equipamento).values(estado="offline"))
        await db.commit()
    await _criar_equipamentos_extra(app)
    ws2 = await _aberto(abrir_ws, cliente_visualizador)
    snap = await ws2.json()
    assert snap["tipo"] == "snapshot"
    assert len(snap["equipamentos"]) == 2
    assert next(e for e in snap["equipamentos"] if e["id"] == eq)["estado"] == "offline"


async def _criar_equipamentos_extra(app: FastAPI) -> None:
    async with _sessoes(app)() as db:
        classe = await db.scalar(select(Classe).where(Classe.slug == "roteador"))
        assert classe is not None
        db.add(
            Equipamento(
                nome="Roteador",
                ip="10.99.6.1",
                classe_id=classe.id,
                estado_desde=DESDE,
                criado_em=DESDE,
            )
        )
        await db.commit()


async def test_ping_de_aplicacao_a_cada_25s(
    relogio: RelogioFalso, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()  # snapshot
    await relogio.avancar(24.9)
    assert ws._saida.empty()  # noqa: SLF001 - nada antes do prazo
    await relogio.avancar(0.1)
    assert await ws.json() == {"tipo": "ping"}
    await relogio.avancar(25)
    assert await ws.json() == {"tipo": "ping"}


async def test_sessao_revogada_durante_conexao_fecha_4401(
    app: FastAPI,
    relogio: RelogioFalso,
    cliente_visualizador: httpx.AsyncClient,
    abrir_ws: AbrirWs,
) -> None:
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()  # snapshot
    await relogio.avancar(60)  # revalidação com sessão ainda válida: segue aberto
    async with _sessoes(app)() as db:
        await db.execute(update(Sessao).values(revogada=True))
        await db.commit()
    await relogio.avancar(60)
    assert await ws.fechamento() == 4401
    barramento: Barramento = app.state.barramento
    assert barramento.total_assinantes == 0


async def test_cliente_lento_fechado_com_1013(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()  # snapshot
    ws.portao.clear()  # cliente para de ler
    barramento: Barramento = app.state.barramento
    for i in range(600):
        barramento.publicar(Mensagem("estado", {"id": f"eq{i}", "estado": "online", "desde": ""}))
    assert await ws.fechamento() == 1013
    assert barramento.total_assinantes == 0


async def test_cliente_desconecta_libera_assinatura(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    barramento: Barramento = app.state.barramento
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()
    assert barramento.total_assinantes == 1
    await ws.terminar()
    assert barramento.total_assinantes == 0


# ---- laços do monitor no lifespan ------------------------------------------------------------


@pytest.fixture
def app_com_monitor(settings: Settings, relogio: RelogioFalso) -> FastAPI:
    """App com os laços ligados; banco sem equipamentos (nenhuma sonda real)."""
    return criar_app(settings, relogio=relogio)


async def _rodar_lifespan(
    app: FastAPI, settings: Settings, corpo: Callable[[], Awaitable[None]]
) -> None:
    await criar_esquema(settings.banco_url)
    async with app.router.lifespan_context(app):
        await corpo()


async def test_lifespan_inicia_e_encerra_lacos_sem_tarefa_pendente(
    app_com_monitor: FastAPI, settings: Settings
) -> None:
    app = app_com_monitor
    vistas: list[asyncio.Task[Any]] = []

    async def corpo() -> None:
        await asyncio.sleep(0)
        vistas.extend(app.state.tarefas_monitor)
        assert len(vistas) == 2
        assert not any(t.done() for t in vistas)

    await _rodar_lifespan(app, settings, corpo)
    assert all(t.done() for t in vistas)
    assert all(t.cancelled() for t in vistas)  # encerramento limpo, sem exceção


async def test_lifespan_descarrega_amostras_a_cada_60s(
    app_com_monitor: FastAPI,
    settings: Settings,
    relogio: RelogioFalso,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = app_com_monitor
    descargas: list[float] = []

    async def corpo() -> None:
        gravador = app.state.gravador

        async def descarregar() -> None:
            descargas.append(relogio.agora())

        monkeypatch.setattr(gravador, "descarregar", descarregar)
        await relogio.avancar(59)
        assert descargas == []
        await relogio.avancar(1)
        await relogio.avancar(60)
        assert descargas == [60.0, 120.0]

    await _rodar_lifespan(app, settings, corpo)
    assert descargas[-1] == 120.0 and len(descargas) == 3  # + a do encerramento do agendador


async def test_lifespan_falha_na_descarga_nao_para_o_laco(
    app_com_monitor: FastAPI,
    settings: Settings,
    relogio: RelogioFalso,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    app = app_com_monitor
    chamadas: list[float] = []

    async def corpo() -> None:
        async def descarregar() -> None:
            chamadas.append(relogio.agora())
            raise RuntimeError("banco fora do ar")

        monkeypatch.setattr(app.state.gravador, "descarregar", descarregar)
        await relogio.avancar(60)
        await relogio.avancar(60)
        assert chamadas == [60.0, 120.0]

    await _rodar_lifespan(app, settings, corpo)
    assert "falha ao descarregar" in caplog.text


async def test_lifespan_sem_monitor_nao_inicia_lacos(app: FastAPI, settings: Settings) -> None:
    async def corpo() -> None:
        assert app.state.tarefas_monitor == []

    await _rodar_lifespan(app, settings, corpo)


def test_fixture_padrao_nao_roda_sondas(app: FastAPI) -> None:
    assert app.state.iniciar_monitor is False
