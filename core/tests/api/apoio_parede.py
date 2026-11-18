"""Apoio dos testes do telão: clientes da TV (HTTP e WebSocket) e emparelhamento completo."""

import asyncio
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any, Protocol

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Alerta, Classe, Equipamento
from tests.api.test_ws import Asgi, ClienteWs

PEDIDO = "/api/v1/parede/pedido"
SNAPSHOT = "/api/v1/parede/snapshot"
PAREDES = "/api/v1/paredes"
APROVAR = "/api/v1/paredes/aprovar"
CONFIG = "/api/v1/config/paredes"
IP_TV = "10.99.0.50"  # o mesmo do ``ClienteWs``
DESDE = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
PROIBIDOS = ("10.99.", "02:00:00", "latencia", "fabricante", "Fabricante X")


class AbrirTv(Protocol):
    def __call__(self, esquema: str = ..., ip: str = ...) -> httpx.AsyncClient: ...


@pytest.fixture
async def abrir_tv(app: FastAPI, cliente: httpx.AsyncClient) -> AsyncIterator[AbrirTv]:
    """Clientes HTTP da TV (sem sessão, sem CSRF), com esquema e IP escolhidos."""
    abertos: list[httpx.AsyncClient] = []

    def _abrir(esquema: str = "https", ip: str = IP_TV) -> httpx.AsyncClient:
        transporte = httpx.ASGITransport(app=app, client=(ip, 50000))
        c = httpx.AsyncClient(transport=transporte, base_url=f"{esquema}://teste")
        abertos.append(c)
        return c

    yield _abrir
    for c in abertos:
        await c.aclose()


def cookie(r: httpx.Response, nome: str) -> str:
    """O ``Set-Cookie`` de ``nome`` (falha se ausente)."""
    for linha in r.headers.get_list("set-cookie"):
        if linha.startswith(f"{nome}="):
            return linha
    raise AssertionError(f"sem Set-Cookie {nome}: {r.headers.get_list('set-cookie')}")


def atributos(linha: str) -> set[str]:
    return {p.strip().lower() for p in linha.split(";")[1:]}


async def emparelhar(
    tv: httpx.AsyncClient, admin: httpx.AsyncClient, nome: str = "TV Portaria"
) -> tuple[int, str]:
    """Pedido pela TV, aprovação pelo admin e entrega; devolve ``(id da parede, token)``."""
    r = await tv.post(PEDIDO)
    assert r.status_code == 201, r.text
    a = await admin.post(APROVAR, json={"codigo": r.json()["codigo"], "nome": nome})
    assert a.status_code == 201, a.text
    r = await tv.get(PEDIDO)
    assert r.status_code == 200, r.text
    esquema = tv.base_url.scheme
    nome_cookie = "sentinela_parede" if esquema == "https" else "sentinela_parede_http"
    token = cookie(r, nome_cookie).split(";")[0].split("=", 1)[1]
    ident: int = a.json()["id"]
    return ident, token


async def ligar_http(admin: httpx.AsyncClient, ligado: bool = True) -> None:
    r = await admin.patch(CONFIG, json={"permitir_http": ligado})
    assert r.status_code == 200, r.text


def sessoes(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    s: async_sessionmaker[AsyncSession] = app.state.sessoes
    return s


async def criar_equipamento_completo(app: FastAPI, nome: str = "Câmera Portaria") -> str:
    """Equipamento com IP, MAC, fabricante e latência: nada disso pode chegar ao telão."""
    async with sessoes(app)() as db:
        classe = await db.scalar(select(Classe).where(Classe.slug == "camera"))
        assert classe is not None
        eq = Equipamento(
            id=str(uuid.uuid4()),
            nome=nome,
            ip="10.99.5.1",
            mac="02:00:00:00:05:01",
            fabricante="Fabricante X",
            classe_id=classe.id,
            estado="offline",
            estado_desde=DESDE,
            latencia_ms=12.5,
            criado_em=DESDE,
        )
        db.add(eq)
        await db.commit()
        return eq.id


async def alerta_no_banco(
    app: FastAPI, eq_id: str, fechado: bool = False, silenciado: bool = False
) -> int:
    async with sessoes(app)() as db:
        a = Alerta(
            tipo="queda",
            equipamento_id=eq_id,
            quedas=[eq_id],
            aberto_em=DESDE,
            fechado_em=DESDE if fechado else None,
            silenciado=silenciado,
        )
        db.add(a)
        await db.commit()
        return a.id


class ClienteWsParede(ClienteWs):
    """O ``ClienteWs`` do painel, com caminho, esquema e IP do cliente escolhidos."""

    def __init__(
        self,
        app: FastAPI,
        cabecalhos: dict[str, str],
        caminho: str = "/ws/parede",
        esquema: str = "wss",
        ip: str = IP_TV,
    ) -> None:
        super().__init__(app, cabecalhos)
        self._caminho = caminho
        self._esquema = esquema
        self._ip = ip

    async def conectar(self) -> Asgi:
        escopo: Asgi = {
            "type": "websocket",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "scheme": self._esquema,
            "path": self._caminho,
            "raw_path": self._caminho.encode(),
            "root_path": "",
            "query_string": b"",
            "headers": [(k.lower().encode(), v.encode()) for k, v in self._cabecalhos.items()],
            "client": (self._ip, 50000),
            "server": ("teste", 443),
            "subprotocols": [],
            "state": {},
        }
        self._entrada.put_nowait({"type": "websocket.connect"})
        self._tarefa = asyncio.create_task(self._app(escopo, self._receber, self._enviar))
        return await self.proxima()


class AbrirWsParede(Protocol):
    def __call__(
        self,
        *,
        cookies: dict[str, str] | None = ...,
        origem: str | None = ...,
        caminho: str = ...,
        esquema: str = ...,
        ip: str = ...,
    ) -> ClienteWsParede: ...


@pytest.fixture
async def abrir_ws_parede(app: FastAPI, cliente: httpx.AsyncClient) -> AsyncIterator[AbrirWsParede]:
    abertos: list[ClienteWsParede] = []

    def _abrir(
        *,
        cookies: dict[str, str] | None = None,
        origem: str | None = "https://teste",
        caminho: str = "/ws/parede",
        esquema: str = "wss",
        ip: str = IP_TV,
    ) -> ClienteWsParede:
        cabecalhos = {"host": "teste"}
        if origem is not None:
            cabecalhos["origin"] = origem
        if cookies:
            cabecalhos["cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())
        ws = ClienteWsParede(app, cabecalhos, caminho, esquema, ip)
        abertos.append(ws)
        return ws

    yield _abrir
    for ws in abertos:
        if ws._tarefa is not None:  # noqa: SLF001 - limpeza do próprio harness
            await ws.terminar()


def sem_proibidos(dados: Any) -> None:
    import json

    texto = json.dumps(dados, ensure_ascii=False)
    for proibido in PROIBIDOS:
        assert proibido not in texto, proibido
