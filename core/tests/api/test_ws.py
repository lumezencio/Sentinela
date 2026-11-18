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

from sentinela.api import ws as ws_mod
from sentinela.barramento import Barramento, Mensagem
from sentinela.config import Settings
from sentinela.db.modelos import Alerta, Classe, Equipamento, Sessao
from sentinela.main import criar_app
from sentinela.monitor.agendador import Agendador
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
    "pai_id",
    "canal",
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

    async def recusa(self) -> int:
        """R19: o handshake é aceito e fechado em seguida, sem nenhum dado; devolve o código."""
        assert (await self.conectar())["type"] == "websocket.accept"
        msg = await self.proxima()
        assert msg["type"] == "websocket.close", msg  # nada enviado antes do fechamento
        await self.terminar()
        return int(msg["code"])

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
    assert await abrir_ws().recusa() == 4401


async def test_cookie_invalido_fecha_4401(abrir_ws: AbrirWs) -> None:
    assert await abrir_ws(cookie="token-que-nao-existe").recusa() == 4401


async def test_sessao_revogada_fecha_4401(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    token = _token(cliente_visualizador)
    async with _sessoes(app)() as db:
        await db.execute(update(Sessao).values(revogada=True))
        await db.commit()
    assert await abrir_ws(cookie=token).recusa() == 4401


@pytest.mark.parametrize(
    "origem", ["https://outro.exemplo", "https://teste.exemplo", "null", "https://teste:8443"]
)
async def test_origem_estranha_recusada(
    cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs, origem: str
) -> None:
    ws = abrir_ws(cookie=_token(cliente_visualizador), origem=origem)
    assert await ws.recusa() == 4403


async def test_sem_origem_recusada(
    cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    assert await abrir_ws(cookie=_token(cliente_visualizador), origem=None).recusa() == 4403


async def test_origem_checada_antes_de_consultar_o_banco(
    cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def proibido(*_args: object) -> None:
        raise AssertionError("consultou a sessão com Origin inválido")

    monkeypatch.setattr(ws_mod, "usuario_do_cookie", proibido)
    ws = abrir_ws(cookie=_token(cliente_visualizador), origem="https://outro.exemplo")
    assert await ws.recusa() == 4403


async def test_producao_aceita_so_https(
    app: FastAPI,
    settings: Settings,
    cliente_visualizador: httpx.AsyncClient,
    abrir_ws: AbrirWs,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    producao = settings.model_copy(update={"ambiente": "producao"})
    monkeypatch.setattr(app.state, "settings", producao)
    token = _token(cliente_visualizador)
    assert await abrir_ws(cookie=token, origem="http://teste").recusa() == 4403
    ws = abrir_ws(cookie=token, origem="https://teste")
    assert (await ws.conectar())["type"] == "websocket.accept"
    assert (await ws.json())["tipo"] == "snapshot"


async def test_fora_de_producao_aceita_http_do_mesmo_host(
    cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    ws = abrir_ws(cookie=_token(cliente_visualizador), origem="http://teste")
    assert (await ws.conectar())["type"] == "websocket.accept"
    assert (await ws.json())["tipo"] == "snapshot"


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
    assert set(snap) == {"tipo", "classes", "equipamentos", "pendentes", "alertas_abertos"}
    assert snap["pendentes"] == 0
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


async def test_repassa_silencio_criado_pela_api(
    cliente_admin: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    await cliente_admin.post("/api/v1/subredes", json={"cidr": "10.99.0.0/24"})
    eq = await cliente_admin.post(
        "/api/v1/equipamentos", json={"nome": "A", "ip": "10.99.0.10", "classe": "camera"}
    )
    ws = await _aberto(abrir_ws, cliente_admin)
    await ws.json()  # snapshot
    corpo = {"tipo": "silencio", "alvo_tipo": "equipamento", "alvo": eq.json()["id"]}
    r = await cliente_admin.post("/api/v1/silencios", json=corpo | {"atalho": "1h"})
    assert await ws.json() == {"tipo": "silencio", "acao": "criado", "id": r.json()["id"]}


async def _alerta_no_banco(app: FastAPI, eq_id: str, fechado: bool = False) -> int:
    async with _sessoes(app)() as db:
        a = Alerta(
            tipo="queda",
            equipamento_id=eq_id,
            quedas=[eq_id],
            aberto_em=DESDE,
            fechado_em=DESDE if fechado else None,
        )
        db.add(a)
        await db.commit()
        return a.id


async def test_snapshot_traz_alertas_abertos(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    (eq,) = await _criar_equipamentos(app, 1)
    await _alerta_no_banco(app, eq)
    await _alerta_no_banco(app, eq)
    await _alerta_no_banco(app, eq, fechado=True)
    ws = await _aberto(abrir_ws, cliente_visualizador)
    assert (await ws.json())["alertas_abertos"] == 2


async def test_mensagem_alerta_chega_enriquecida(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    (eq,) = await _criar_equipamentos(app, 1)
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()  # snapshot
    a = await _alerta_no_banco(app, eq)
    barramento: Barramento = app.state.barramento
    barramento.publicar(Mensagem("alerta", {"acao": "aberto", "id": a, "abertos": 1}))
    msg = await ws.json()
    assert msg["tipo"] == "alerta" and msg["acao"] == "aberto" and msg["abertos"] == 1
    assert msg["alerta"]["id"] == a
    assert msg["alerta"]["texto"] == "Equipamento 0 caiu"
    assert msg["alerta"]["equipamento_id"] == eq
    assert msg["alerta"]["envio"] == "pendente"
    assert set(msg["alerta"]) == {
        "id", "tipo", "texto", "equipamento_id", "equipamento_nome", "classe",
        "afetados_total", "aberto_em", "fechado_em", "breve", "reconhecido_por",
        "reconhecido_em", "silenciado", "envio",
    }  # fmt: skip


async def test_alerta_com_nome_hostil_chega_como_texto(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    (eq,) = await _criar_equipamentos(app, 1)
    hostil = "<b>" + "x" * 300
    async with _sessoes(app)() as db:
        e = await db.get(Equipamento, eq)
        assert e is not None
        e.nome = hostil
        await db.commit()
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()  # snapshot
    a = await _alerta_no_banco(app, eq)
    barramento: Barramento = app.state.barramento
    barramento.publicar(Mensagem("alerta", {"acao": "aberto", "id": a, "abertos": 1}))
    msg = await ws.json()
    assert msg["alerta"]["texto"] == f"{hostil} caiu"


async def test_alerta_removido_chega_sem_linha(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    (eq,) = await _criar_equipamentos(app, 1)
    existente = await _alerta_no_banco(app, eq)  # ``removido`` nunca lê a linha
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()  # snapshot
    barramento: Barramento = app.state.barramento
    barramento.publicar(Mensagem("alerta", {"acao": "removido", "id": existente, "abertos": 0}))
    assert await ws.json() == {
        "tipo": "alerta",
        "acao": "removido",
        "id": existente,
        "alerta": None,
        "abertos": 0,
    }
    # alerta já apagado quando a mensagem é lida: também sem linha
    barramento.publicar(Mensagem("alerta", {"acao": "atualizado", "id": 9999, "abertos": 0}))
    assert (await ws.json())["alerta"] is None


async def test_snapshot_traz_pendentes(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    from tests.api.apoio_descoberta import criar_descoberta

    await criar_descoberta(app, "10.99.0.30", mac="02:00:00:00:00:30")
    await criar_descoberta(app, "10.99.0.31", mac="02:00:00:00:00:31")
    await criar_descoberta(app, "10.99.0.32", mac="02:00:00:00:00:32", status="ignorada")
    ws = await _aberto(abrir_ws, cliente_visualizador)
    assert (await ws.json())["pendentes"] == 2


async def test_repassa_descoberta_varredura_e_pendentes(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    ws = await _aberto(abrir_ws, cliente_visualizador)
    await ws.json()  # snapshot
    barramento: Barramento = app.state.barramento
    nova = {"acao": "nova", "id": "d1", "classe_sugerida": "camera", "confianca": 0.9}
    barramento.publicar(Mensagem("descoberta", nova))
    varredura = {"cidr": "10.99.0.0/24", "feitos": 3, "total": 256, "achados": 1}
    barramento.publicar(Mensagem("varredura", {**varredura, "estado": "rodando"}))
    barramento.publicar(Mensagem("pendentes", {"total": 7}))
    fonte = {"acao": "coletada", "id": "f1", "ok": True, "ultima_coleta": DESDE.isoformat()}
    barramento.publicar(Mensagem("fonte", fonte))
    assert await ws.json() == {"tipo": "descoberta", **nova}
    assert await ws.json() == {"tipo": "varredura", **varredura, "estado": "rodando"}
    assert await ws.json() == {"tipo": "pendentes", "total": 7}
    assert await ws.json() == {"tipo": "fonte", **fonte}


async def test_repassa_equipamento_com_os_campos_do_snapshot(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, abrir_ws: AbrirWs
) -> None:
    (eq,) = await _criar_equipamentos(app, 1)
    ws = await _aberto(abrir_ws, cliente_visualizador)
    item = (await ws.json())["equipamentos"][0]
    barramento: Barramento = app.state.barramento
    # mensagem interna (IP mudou / checagem trocada): o cliente recebe a linha inteira
    barramento.publicar(Mensagem("equipamento", {"acao": "atualizado", "id": eq, "ip": "x"}))
    msg = await ws.json()
    assert msg == {"tipo": "equipamento", "acao": "atualizado", "equipamento": item}
    barramento.publicar(
        Mensagem(
            "equipamento", {"acao": "atualizado", "id": "00000000-0000-4000-8000-000000000000"}
        )
    )
    msg = await ws.json()
    assert msg == {
        "tipo": "equipamento",
        "acao": "removido",
        "id": "00000000-0000-4000-8000-000000000000",
    }


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
        assert [t.get_name() for t in vistas] == [
            "sentinela-limpeza",
            "sentinela-descarga",
            "sentinela-descoberta",
            "sentinela-canais",
            "sentinela-silencios",
            "sentinela-alertas",
            "sentinela-telegram",
            "sentinela-agendador",
        ]
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


# ---- Fix round 1: falha dos laços vira sinal (log + /saude 503) -----------------------------


async def _saude(app: FastAPI) -> httpx.Response:
    transporte = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as c:
        return await c.get("/api/v1/saude")


async def test_saude_ok_com_monitor_rodando(app_com_monitor: FastAPI, settings: Settings) -> None:
    async def corpo() -> None:
        await asyncio.sleep(0)
        r = await _saude(app_com_monitor)
        assert (r.status_code, r.json()) == (200, {"status": "ok"})

    await _rodar_lifespan(app_com_monitor, settings, corpo)


async def test_agendador_que_falha_registra_erro_e_saude_503(
    app_com_monitor: FastAPI,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    async def executar_quebrado(self: Agendador) -> None:
        raise RuntimeError("defeito simulado")

    monkeypatch.setattr(Agendador, "executar", executar_quebrado)
    app = app_com_monitor

    async def corpo() -> None:
        for _ in range(3):
            await asyncio.sleep(0)
        assert app.state.monitor_falhou is True
        assert app.state.monitor_motivo == "sentinela-agendador"
        r = await _saude(app)
        assert (r.status_code, r.json()) == (503, {"status": "degradado"})
        erros = [rec for rec in caplog.records if rec.levelname == "ERROR"]
        assert any(rec.exc_info and "sentinela-agendador" in rec.getMessage() for rec in erros)

    await _rodar_lifespan(app, settings, corpo)


async def test_saude_503_se_laco_terminou_sem_excecao(
    app_com_monitor: FastAPI, settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def executar_que_retorna(self: Agendador) -> None:
        return None

    monkeypatch.setattr(Agendador, "executar", executar_que_retorna)

    async def corpo() -> None:
        for _ in range(3):
            await asyncio.sleep(0)
        assert (await _saude(app_com_monitor)).status_code == 503

    await _rodar_lifespan(app_com_monitor, settings, corpo)


async def test_saude_ok_sem_monitor(cliente: httpx.AsyncClient) -> None:
    r = await cliente.get("/api/v1/saude")
    assert (r.status_code, r.json()) == (200, {"status": "ok"})


# ---- revisão final: monitor morto encerra o processo (só com a flag) ------------------------


async def _monitor_quebrado(
    settings: Settings, relogio: RelogioFalso, monkeypatch: pytest.MonkeyPatch, sair: bool
) -> list[str]:
    async def executar_quebrado(self: Agendador) -> None:
        raise RuntimeError("defeito simulado")

    monkeypatch.setattr(Agendador, "executar", executar_quebrado)
    monkeypatch.setattr("sentinela.main.GRACA_SAIDA_S", 0.01)
    chamadas: list[str] = []
    app = criar_app(
        settings.model_copy(update={"sair_se_monitor_morrer": sair}),
        relogio=relogio,
        terminar=lambda: chamadas.append("terminar"),
    )

    async def corpo() -> None:
        for _ in range(3):
            await asyncio.sleep(0)
        assert app.state.monitor_falhou is True
        await asyncio.sleep(0.1)  # passa da graça (call_later usa o relógio real do laço)

    await _rodar_lifespan(app, settings, corpo)
    return chamadas


async def test_monitor_morto_encerra_processo_com_a_flag(
    settings: Settings, relogio: RelogioFalso, monkeypatch: pytest.MonkeyPatch
) -> None:
    assert await _monitor_quebrado(settings, relogio, monkeypatch, sair=True) == ["terminar"]


async def test_monitor_morto_sem_a_flag_nao_encerra(
    settings: Settings, relogio: RelogioFalso, monkeypatch: pytest.MonkeyPatch
) -> None:
    assert await _monitor_quebrado(settings, relogio, monkeypatch, sair=False) == []


def test_flag_de_saida_desligada_por_padrao(settings: Settings) -> None:
    assert settings.sair_se_monitor_morrer is False


def test_terminador_padrao_sai_com_codigo_diferente_de_zero(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from sentinela import main

    codigos: list[int] = []
    monkeypatch.setattr("os._exit", codigos.append)
    main._sair_do_processo()
    assert codigos == [main.CODIGO_MONITOR_MORTO] and codigos[0] != 0
