import asyncio
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from ipaddress import IPv4Network
from types import SimpleNamespace
from typing import Any

import icmplib
import pytest

from sentinela.monitor.checagens import checagem_para
from sentinela.monitor.checagens.http import ChecagemHttp
from sentinela.monitor.checagens.icmp import ChecagemIcmp
from sentinela.monitor.checagens.tcp import ChecagemTcp
from sentinela.rede.guarda import DestinoAutorizado, Guarda

GUARDA = Guarda([IPv4Network("10.99.0.0/24")], permitir_loopback=True)


def _destino(porta: int | None, protocolo: Any) -> DestinoAutorizado:
    return GUARDA.validar("127.0.0.1", porta, protocolo)


@asynccontextmanager
async def _servidor(
    tratador: Callable[[asyncio.StreamReader, asyncio.StreamWriter], Awaitable[None]],
) -> AsyncIterator[int]:
    srv = await asyncio.start_server(tratador, "127.0.0.1", 0)
    try:
        yield srv.sockets[0].getsockname()[1]
    finally:
        srv.close()
        await srv.wait_closed()


def _http(
    resposta: Callable[[str], bytes], pedidos: list[str]
) -> Callable[[asyncio.StreamReader, asyncio.StreamWriter], Awaitable[None]]:
    async def tratador(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        linha = (await r.readuntil(b"\r\n\r\n")).split(b"\r\n")[0].decode()
        pedidos.append(linha)
        w.write(resposta(linha.split()[0]))
        await w.drain()
        w.close()

    return tratador


def _resp(status: str, extra: str = "") -> bytes:
    return f"HTTP/1.1 {status}\r\n{extra}Content-Length: 0\r\nConnection: close\r\n\r\n".encode()


async def test_tcp_ok() -> None:
    async def tratador(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        w.close()

    async with _servidor(tratador) as porta:
        res = await ChecagemTcp().executar(_destino(porta, "tcp"))
    assert res.ok is True
    assert res.latencia_ms is not None
    assert res.erro is None


async def test_tcp_porta_fechada_falha() -> None:
    async def tratador(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        w.close()

    async with _servidor(tratador) as porta:
        pass
    res = await ChecagemTcp().executar(_destino(porta, "tcp"))
    assert res.ok is False
    assert res.latencia_ms is None
    assert res.erro


async def test_tcp_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    async def lento(*_a: Any, **_k: Any) -> Any:
        await asyncio.sleep(5)

    monkeypatch.setattr(asyncio, "open_connection", lento)
    res = await ChecagemTcp().executar(_destino(9, "tcp"), timeout=0.05)
    assert res.ok is False
    assert res.erro


async def test_http_200_ok() -> None:
    pedidos: list[str] = []
    async with _servidor(_http(lambda _m: _resp("200 OK"), pedidos)) as porta:
        res = await ChecagemHttp().executar(_destino(porta, "http"))
    assert res.ok is True
    assert res.latencia_ms is not None
    assert pedidos[0].startswith("HEAD ")


async def test_http_500_falha() -> None:
    async with _servidor(_http(lambda _m: _resp("500 Internal Server Error"), [])) as porta:
        res = await ChecagemHttp().executar(_destino(porta, "http"))
    assert res.ok is False
    assert res.erro == "HTTP 500"


async def test_http_nao_segue_redirect() -> None:
    pedidos: list[str] = []
    async with _servidor(
        _http(lambda _m: _resp("301 Moved Permanently", "Location: /outro\r\n"), pedidos)
    ) as porta:
        res = await ChecagemHttp().executar(_destino(porta, "http"))
    assert res.ok is True
    assert len(pedidos) == 1


async def test_http_head_405_cai_para_get() -> None:
    pedidos: list[str] = []

    def resposta(metodo: str) -> bytes:
        return _resp("405 Method Not Allowed") if metodo == "HEAD" else _resp("200 OK")

    async with _servidor(_http(resposta, pedidos)) as porta:
        res = await ChecagemHttp().executar(_destino(porta, "http"))
    assert res.ok is True
    assert [p.split()[0] for p in pedidos] == ["HEAD", "GET"]


async def test_http_timeout() -> None:
    async def mudo(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        await asyncio.sleep(2)
        w.close()

    async with _servidor(mudo) as porta:
        res = await ChecagemHttp().executar(_destino(porta, "http"), timeout=0.2)
    assert res.ok is False
    assert res.erro


async def test_http_conexao_recusada() -> None:
    async def tratador(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        w.close()

    async with _servidor(tratador) as porta:
        pass
    res = await ChecagemHttp().executar(_destino(porta, "http"))
    assert res.ok is False
    assert res.erro


async def test_icmp_usa_privileged_false(monkeypatch: pytest.MonkeyPatch) -> None:
    capturado: dict[str, Any] = {}

    async def falso(endereco: str, **kwargs: Any) -> Any:
        capturado["endereco"] = endereco
        capturado.update(kwargs)
        return SimpleNamespace(is_alive=True, avg_rtt=1.5)

    monkeypatch.setattr(icmplib, "async_ping", falso)
    res = await ChecagemIcmp().executar(_destino(None, "icmp"), timeout=1.0)
    assert capturado["privileged"] is False
    assert capturado["count"] == 1
    assert capturado["timeout"] == 1.0
    assert capturado["endereco"] == "127.0.0.1"
    assert res.ok is True
    assert res.latencia_ms == 1.5


async def test_icmp_host_morto(monkeypatch: pytest.MonkeyPatch) -> None:
    async def falso(endereco: str, **kwargs: Any) -> Any:
        return SimpleNamespace(is_alive=False, avg_rtt=0.0)

    monkeypatch.setattr(icmplib, "async_ping", falso)
    res = await ChecagemIcmp().executar(_destino(None, "icmp"))
    assert res.ok is False
    assert res.latencia_ms is None
    assert res.erro


async def test_icmp_sem_permissao(monkeypatch: pytest.MonkeyPatch) -> None:
    async def falso(endereco: str, **kwargs: Any) -> Any:
        raise icmplib.SocketPermissionError(privileged=False)

    monkeypatch.setattr(icmplib, "async_ping", falso)
    res = await ChecagemIcmp().executar(_destino(None, "icmp"))
    assert res.ok is False
    assert res.erro == "ICMP sem permissão no host"


@pytest.mark.parametrize("cls", [ChecagemIcmp, ChecagemTcp, ChecagemHttp])
async def test_executar_exige_destino_autorizado(cls: Any) -> None:
    with pytest.raises(TypeError):
        await cls().executar(("127.0.0.1", 80, "tcp"))


async def test_protocolo_incompativel() -> None:
    with pytest.raises(ValueError, match="protocolo"):
        await ChecagemTcp().executar(_destino(80, "http"))


def test_checagem_para_e_custos() -> None:
    assert isinstance(checagem_para("icmp"), ChecagemIcmp)
    assert isinstance(checagem_para("tcp"), ChecagemTcp)
    assert isinstance(checagem_para("http"), ChecagemHttp)
    assert (ChecagemIcmp.custo, ChecagemTcp.custo, ChecagemHttp.custo) == (1, 1, 3)
    with pytest.raises(ValueError):
        checagem_para("ftp")


async def test_http_prazo_total_contra_gotejamento() -> None:
    async def gotejar(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        await r.readuntil(b"\r\n\r\n")
        try:
            w.write(b"HTTP/1.1 200 OK\r\n")
            for _ in range(100):
                w.write(b"X")
                await w.drain()
                await asyncio.sleep(0.1)
        except OSError:
            pass
        w.close()

    async with _servidor(gotejar) as porta:
        inicio = time.perf_counter()
        res = await ChecagemHttp().executar(_destino(porta, "http"), timeout=0.3)
        decorrido = time.perf_counter() - inicio
    assert res.ok is False
    assert res.erro == "Tempo esgotado"
    assert decorrido < 0.6


async def test_http_get_fallback_500_falha() -> None:
    def resposta(metodo: str) -> bytes:
        return _resp("405 Method Not Allowed") if metodo == "HEAD" else _resp("500 Erro")

    async with _servidor(_http(resposta, [])) as porta:
        res = await ChecagemHttp().executar(_destino(porta, "http"))
    assert res.ok is False
    assert res.erro == "HTTP 500"


async def test_http_erro_inesperado_nao_propaga(monkeypatch: pytest.MonkeyPatch) -> None:
    async def explode(*_a: Any, **_k: Any) -> Any:
        raise RuntimeError("segredo")

    monkeypatch.setattr(ChecagemHttp, "_status", staticmethod(explode))
    res = await ChecagemHttp().executar(_destino(80, "http"))
    assert res.ok is False
    assert res.erro == "Erro inesperado na checagem HTTP"


async def test_icmp_prazo_defensivo(monkeypatch: pytest.MonkeyPatch) -> None:
    async def trava(endereco: str, **kwargs: Any) -> Any:
        await asyncio.sleep(10)

    monkeypatch.setattr(icmplib, "async_ping", trava)
    inicio = time.perf_counter()
    res = await ChecagemIcmp().executar(_destino(None, "icmp"), timeout=0.05)
    assert res.ok is False
    assert res.erro == "Tempo esgotado"
    assert time.perf_counter() - inicio < 3
