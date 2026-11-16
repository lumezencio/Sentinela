from ipaddress import IPv4Address, IPv4Network
from pathlib import Path
from typing import Any

import pytest

from sentinela.rede.guarda import DestinoAutorizado, DestinoProibido, Guarda

REDE = IPv4Network("10.99.0.0/24")


@pytest.fixture
def guarda() -> Guarda:
    return Guarda([REDE])


def test_aceita_icmp(guarda: Guarda) -> None:
    d = guarda.validar("10.99.0.10", None, "icmp")
    assert d.ip == IPv4Address("10.99.0.10")
    assert d.porta is None
    assert d.protocolo == "icmp"


def test_aceita_tcp_com_porta(guarda: Guarda) -> None:
    d = guarda.validar(IPv4Address("10.99.0.10"), 554, "tcp")
    assert (d.porta, d.protocolo) == (554, "tcp")


def test_aceita_http_com_porta(guarda: Guarda) -> None:
    assert guarda.validar("10.99.0.10", 80, "http").protocolo == "http"


@pytest.mark.parametrize(
    "ip",
    [
        "255.255.255.255",
        "10.99.0.255",
        "10.99.0.0",
        "224.0.0.251",
        "239.255.255.250",
        "0.0.0.0",  # noqa: S104
        "127.0.0.1",
        "169.254.1.1",
        "10.99.1.5",
        "8.8.8.8",
        "abc",
        "10.99.0.10/24",
        "ff02::1",
    ],
)
def test_recusa_destinos_proibidos(guarda: Guarda, ip: str) -> None:
    with pytest.raises(DestinoProibido) as exc:
        guarda.validar(ip, None, "icmp")
    assert exc.value.motivo


@pytest.mark.parametrize("porta", [0, -1, 65536, 100000])
def test_recusa_porta_invalida(guarda: Guarda, porta: int) -> None:
    with pytest.raises(DestinoProibido) as exc:
        guarda.validar("10.99.0.10", porta, "tcp")
    assert exc.value.motivo


@pytest.mark.parametrize("protocolo", ["tcp", "http"])
def test_recusa_sem_porta(guarda: Guarda, protocolo: Any) -> None:
    with pytest.raises(DestinoProibido):
        guarda.validar("10.99.0.10", None, protocolo)


def test_recusa_protocolo_desconhecido(guarda: Guarda) -> None:
    with pytest.raises(DestinoProibido):
        guarda.validar("10.99.0.10", None, "udp")  # type: ignore[arg-type]


def test_loopback_so_quando_permitido() -> None:
    g = Guarda([REDE], permitir_loopback=True)
    assert g.validar("127.0.0.1", None, "icmp").ip == IPv4Address("127.0.0.1")


@pytest.mark.parametrize("cidr", ["8.8.8.0/24", "10.0.0.0/8", "192.168.1.0/31", "abc"])
def test_validar_sub_rede_recusa(cidr: str) -> None:
    with pytest.raises(DestinoProibido):
        Guarda.validar_sub_rede(cidr)


def test_validar_sub_rede_aceita() -> None:
    assert Guarda.validar_sub_rede("192.168.1.0/24") == IPv4Network("192.168.1.0/24")


def test_destino_nao_pode_ser_criado_fora_da_guarda() -> None:
    with pytest.raises(TypeError):
        DestinoAutorizado(IPv4Address("10.99.0.1"), None, "icmp")  # type: ignore[call-arg]


def test_nenhum_so_broadcast_no_codigo() -> None:
    raiz = Path(__file__).resolve().parents[2] / "sentinela"
    proibidos = ["so_broadcast", "zeroconf", "ssdp", "wsdiscovery"]
    arquivos = list(raiz.rglob("*.py"))
    assert arquivos
    for arq in arquivos:
        texto = arq.read_text(encoding="utf-8").lower()
        for p in proibidos:
            assert p not in texto, f"{p} encontrado em {arq}"
