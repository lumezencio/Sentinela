"""Sondagem ativa (só quando autorizada) contra servidores locais em 127.0.0.1."""

import asyncio
from collections.abc import Callable
from ipaddress import IPv4Network
from typing import Any

import pytest

from sentinela.descoberta.classificador import sondagem
from sentinela.rede.guarda import DestinoProibido, Guarda

GUARDA = Guarda([IPv4Network("10.99.0.0/24")], permitir_loopback=True)
IP = "127.0.0.1"


class LimitadorEspiao:
    def __init__(self) -> None:
        self.pedidos: list[tuple[int, str | None]] = []

    async def adquirir(
        self, custo: int = 1, prioritario: bool = False, *, prioridade: str | None = None
    ) -> None:
        self.pedidos.append((custo, prioridade))


async def _sondar(lim: LimitadorEspiao | None = None, ip: str = IP) -> Any:
    return await sondagem.sondar(ip, GUARDA, lim or LimitadorEspiao())  # type: ignore[arg-type]


class ServidorHttp:
    """Servidor HTTP mínimo e cru: devolve ``resposta`` (bytes) para qualquer pedido."""

    def __init__(self, resposta: bytes = b"") -> None:
        self.resposta = resposta
        self.por_caminho: dict[str, bytes] = {}
        self.pedidos: list[bytes] = []
        self.porta = 0
        self._srv: asyncio.Server | None = None

    async def _atender(self, r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        try:
            cab = await asyncio.wait_for(r.readuntil(b"\r\n\r\n"), 2)
            self.pedidos.append(cab)
            caminho = cab.split(b" ", 2)[1].decode("ascii", "replace")
            w.write(self.por_caminho.get(caminho, self.resposta))
            await w.drain()
        except (asyncio.IncompleteReadError, TimeoutError, ConnectionError):
            pass
        finally:
            w.close()

    async def __aenter__(self) -> "ServidorHttp":
        self._srv = await asyncio.start_server(self._atender, IP, 0)
        self.porta = self._srv.sockets[0].getsockname()[1]
        return self

    async def __aexit__(self, *args: object) -> None:
        assert self._srv is not None
        self._srv.close()
        await self._srv.wait_closed()


def _html(titulo: str) -> bytes:
    corpo = b"<html><head><title>" + titulo.encode() + b"</title></head></html>"
    return b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n" + corpo


@pytest.fixture
def so_porta(monkeypatch: pytest.MonkeyPatch) -> Callable[[int], None]:
    def configurar(porta: int) -> None:
        monkeypatch.setattr(sondagem, "PORTAS", (porta,))
        monkeypatch.setattr(sondagem, "PORTAS_HTTP", (porta,))
        monkeypatch.setattr(sondagem, "PORTAS_HTTPS", ())

    return configurar


def test_lista_fixa_de_portas_e_limites() -> None:
    assert sondagem.PORTAS == (22, 23, 80, 443, 554, 4370, 8000, 8080, 8291, 9100, 37777, 3389)
    assert set(sondagem.PORTAS_HTTP) | set(sondagem.PORTAS_HTTPS) == {80, 443, 8080}
    assert sondagem.TIMEOUT_CONEXAO_S == 1.0
    assert sondagem.TIMEOUT_HTTP_S == 2.0
    assert sondagem.LIMITE_BYTES == 16 * 1024
    assert sondagem.LIMITE_TITULO == 120


async def test_so_portas_da_lista(monkeypatch: pytest.MonkeyPatch) -> None:
    tentativas: list[tuple[str, int]] = []

    async def falso(host: str, porta: int, **kw: Any) -> Any:
        tentativas.append((host, porta))
        raise ConnectionRefusedError

    monkeypatch.setattr(sondagem.asyncio, "open_connection", falso)
    assert await _sondar() == (set(), None)
    assert sorted(p for _, p in tentativas) == sorted(sondagem.PORTAS)
    assert {h for h, _ in tentativas} == {IP}


async def test_porta_aberta_e_titulo(so_porta: Callable[[int], None]) -> None:
    async with ServidorHttp(_html("iDFace")) as srv:
        so_porta(srv.porta)
        portas, titulo = await _sondar()
    assert portas == {srv.porta}
    assert titulo == "iDFace"


async def test_destino_fora_da_guarda_e_recusado_sem_ficha() -> None:
    lim = LimitadorEspiao()
    with pytest.raises(DestinoProibido):
        await _sondar(lim, "8.8.8.8")
    assert lim.pedidos == []


async def test_uma_conexao_por_vez(monkeypatch: pytest.MonkeyPatch) -> None:
    ativas = 0
    maximo = 0

    async def lento(host: str, porta: int, **kw: Any) -> Any:
        nonlocal ativas, maximo
        ativas += 1
        maximo = max(maximo, ativas)
        try:
            await asyncio.sleep(0.01)
            raise ConnectionRefusedError
        finally:
            ativas -= 1

    monkeypatch.setattr(sondagem.asyncio, "open_connection", lento)
    monkeypatch.setattr(sondagem, "PORTAS", (1001, 1002, 1003))
    await asyncio.gather(_sondar(), _sondar())
    assert maximo == 1  # nem entre portas, nem entre duas sondagens do mesmo IP


async def test_timeout_de_conexao_de_1s(monkeypatch: pytest.MonkeyPatch) -> None:
    prazos: list[float | None] = []
    real = asyncio.wait_for

    async def espia(coro: Any, timeout: float | None) -> Any:  # noqa: ASYNC109
        prazos.append(timeout)
        return await real(coro, 0.05)  # não esperar 1 s de verdade

    async def pendurado(host: str, porta: int, **kw: Any) -> Any:
        await asyncio.sleep(10)

    monkeypatch.setattr(sondagem.asyncio, "open_connection", pendurado)
    monkeypatch.setattr(sondagem.asyncio, "wait_for", espia)
    monkeypatch.setattr(sondagem, "PORTAS", (1001,))
    assert await _sondar() == (set(), None)
    assert prazos == [1.0]


async def test_titulo_truncado_e_sem_controles(so_porta: Callable[[int], None]) -> None:
    sujo = "Painel \x07\x1b[31m" + "A" * 300
    async with ServidorHttp(_html(sujo)) as srv:
        so_porta(srv.porta)
        _, titulo = await _sondar()
    assert titulo is not None
    assert len(titulo) <= 120
    assert titulo.startswith("Painel ")
    assert all(c.isprintable() for c in titulo)


async def test_titulo_html_escapado_vira_texto_cru(so_porta: Callable[[int], None]) -> None:
    async with ServidorHttp(_html("A &amp; B &lt;x&gt;")) as srv:
        so_porta(srv.porta)
        _, titulo = await _sondar()
    assert titulo == "A & B <x>"  # a tela mostra por textContent


async def test_redirecionamento_para_outro_host_nao_seguido(
    so_porta: Callable[[int], None],
) -> None:
    async with ServidorHttp(_html("alvo-externo")) as alvo, ServidorHttp() as srv:
        srv.resposta = (
            b"HTTP/1.1 302 Found\r\nLocation: http://localhost:%d/\r\n"
            b"Content-Length: 0\r\nConnection: close\r\n\r\n" % alvo.porta
        )
        so_porta(srv.porta)
        portas, titulo = await _sondar()
        assert portas == {srv.porta}
        assert titulo is None
        assert alvo.pedidos == []  # nada foi pedido ao outro host


async def test_redirecionamento_no_mesmo_host_tem_limite_de_saltos(
    so_porta: Callable[[int], None],
) -> None:
    async with ServidorHttp() as srv:
        srv.resposta = (
            b"HTTP/1.1 302 Found\r\nLocation: /login\r\nContent-Length: 0\r\n"
            b"Connection: close\r\n\r\n"
        )
        so_porta(srv.porta)
        portas, titulo = await _sondar()
    assert portas and titulo is None
    assert 1 < len(srv.pedidos) <= sondagem.MAX_SALTOS + 1


async def test_redirecionamento_no_mesmo_host_entrega_o_titulo(
    so_porta: Callable[[int], None],
) -> None:
    async with ServidorHttp() as srv:
        srv.por_caminho = {
            "/": b"HTTP/1.1 302 Found\r\nLocation: /login\r\nContent-Length: 0\r\n\r\n",
            "/login": _html("Login"),
        }
        so_porta(srv.porta)
        _, titulo = await _sondar()
    assert titulo == "Login"


async def test_le_no_maximo_16kb(so_porta: Callable[[int], None]) -> None:
    prefixo = b"HTTP/1.1 200 OK\r\nConnection: close\r\n\r\n"
    tarde = prefixo + b"x" * 17000 + b"<title>tarde</title>"
    async with ServidorHttp(tarde) as srv:
        so_porta(srv.porta)
        assert (await _sondar())[1] is None  # o título está além de 16 KB
    cedo = prefixo + b"<title>cedo</title>" + b"x" * 200000
    async with ServidorHttp(cedo) as srv:
        so_porta(srv.porta)
        assert (await _sondar())[1] == "cedo"


async def test_pedido_minimo_sem_dados_sensiveis(so_porta: Callable[[int], None]) -> None:
    async with ServidorHttp(_html("x")) as srv:
        so_porta(srv.porta)
        await _sondar()
    cab = srv.pedidos[0].lower()
    assert cab.startswith(b"get / http/1.1")
    assert b"authorization" not in cab and b"cookie" not in cab


async def test_cada_porta_custa_ficha_baixa(monkeypatch: pytest.MonkeyPatch) -> None:
    async def recusa(host: str, porta: int, **kw: Any) -> Any:
        raise ConnectionRefusedError

    monkeypatch.setattr(sondagem.asyncio, "open_connection", recusa)
    lim = LimitadorEspiao()
    await _sondar(lim)
    assert lim.pedidos == [(1, "baixa")] * len(sondagem.PORTAS)


async def test_pedido_http_tambem_custa_ficha_baixa(so_porta: Callable[[int], None]) -> None:
    async with ServidorHttp(_html("x")) as srv:
        so_porta(srv.porta)
        lim = LimitadorEspiao()
        await _sondar(lim)
    assert lim.pedidos == [(1, "baixa"), (1, "baixa")]  # conexão + GET


async def test_sem_titulo_se_nenhuma_porta_http_aberta(monkeypatch: pytest.MonkeyPatch) -> None:
    class Escritor:
        def close(self) -> None:
            pass

        async def wait_closed(self) -> None:
            pass

    async def so_554(host: str, porta: int, **kw: Any) -> Any:
        if porta != 554:
            raise ConnectionRefusedError
        return asyncio.StreamReader(), Escritor()

    chamadas: list[int] = []

    async def espia(*a: Any, **k: Any) -> None:
        chamadas.append(1)

    monkeypatch.setattr(sondagem.asyncio, "open_connection", so_554)
    monkeypatch.setattr(sondagem, "_buscar_titulo", espia)
    assert await _sondar() == ({554}, None)
    assert chamadas == []
