"""``porta_responde``: só loopback e rede privada; nunca um endereço público."""

import asyncio
import socket

import pytest

from sentinela.backup import porta


async def test_responde_no_loopback() -> None:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        s.listen()
        assert await porta.porta_responde(s.getsockname()[1], hosts=("127.0.0.1",))


async def test_nada_escutando_nao_responde() -> None:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        livre = s.getsockname()[1]
    assert not await porta.porta_responde(livre, hosts=("127.0.0.1",))


async def test_nome_que_nao_resolve_nao_responde() -> None:
    assert not await porta.porta_responde(8000, hosts=("sem-este-nome.invalid",))


async def test_nome_que_resolve_para_ip_publico_nunca_e_conectado(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chamadas: list[str] = []

    async def abre(ip: str, _porta: int) -> None:
        chamadas.append(ip)
        raise OSError

    monkeypatch.setattr(asyncio, "open_connection", abre)

    class AlvoPublico:
        async def getaddrinfo(self, host: str, *_a: object, **_k: object) -> list[tuple]:  # type: ignore[type-arg]
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]

    monkeypatch.setattr(asyncio, "get_running_loop", lambda: AlvoPublico())
    assert not await porta.porta_responde(8000, hosts=("core",))
    assert chamadas == []


async def test_ip_privado_do_compose_e_aceito(monkeypatch: pytest.MonkeyPatch) -> None:
    vistos: list[str] = []

    class Escritor:
        def close(self) -> None:
            pass

    async def abre(ip: str, _porta: int) -> tuple[object, Escritor]:
        vistos.append(ip)
        return object(), Escritor()

    class AlvoPrivado:
        async def getaddrinfo(self, host: str, *_a: object, **_k: object) -> list[tuple]:  # type: ignore[type-arg]
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("172.18.0.2", 0))]

    monkeypatch.setattr(asyncio, "open_connection", abre)
    monkeypatch.setattr(asyncio, "get_running_loop", lambda: AlvoPrivado())
    assert await porta.porta_responde(8000, hosts=("core",))
    assert vistos == ["172.18.0.2"]
