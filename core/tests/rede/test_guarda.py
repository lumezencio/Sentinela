import dataclasses
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


def test_replace_nao_forja_destino(guarda: Guarda) -> None:
    d = guarda.validar("10.99.0.10", None, "icmp")
    with pytest.raises((TypeError, ValueError)):
        dataclasses.replace(d, ip=IPv4Address("8.8.8.8"))  # type: ignore[call-arg]


@pytest.mark.parametrize(
    "redes",
    [
        [IPv4Network("10.99.0.0/16"), IPv4Network("10.99.0.0/24")],
        [IPv4Network("10.99.0.0/24"), IPv4Network("10.99.0.0/16")],
    ],
)
@pytest.mark.parametrize("ip", ["10.99.0.255", "10.99.0.0", "10.99.255.255", "10.99.0.0"])
def test_sub_redes_aninhadas_recusam_rede_e_broadcast_de_qualquer(
    redes: list[IPv4Network], ip: str
) -> None:
    with pytest.raises(DestinoProibido):
        Guarda(redes).validar(ip, None, "icmp")


def test_sub_redes_aninhadas_aceitam_host() -> None:
    g = Guarda([IPv4Network("10.99.0.0/16"), IPv4Network("10.99.0.0/24")])
    assert g.validar("10.99.0.7", None, "icmp").ip == IPv4Address("10.99.0.7")


@pytest.mark.parametrize(
    "rede", ["0.0.0.0/0", "8.8.8.0/24", "10.0.0.0/8", "192.168.1.0/31", "192.168.1.1/32"]
)
def test_construtor_recusa_sub_rede_invalida(rede: str) -> None:
    with pytest.raises(DestinoProibido):
        Guarda([IPv4Network(rede)])


def test_construtor_recusa_item_que_nao_e_rede() -> None:
    with pytest.raises(DestinoProibido):
        Guarda(["10.99.0.0/24"])  # type: ignore[list-item]


def test_icmp_recusa_porta(guarda: Guarda) -> None:
    with pytest.raises(DestinoProibido):
        guarda.validar("10.99.0.10", 80, "icmp")


def test_recusa_porta_booleana(guarda: Guarda) -> None:
    with pytest.raises(DestinoProibido):
        guarda.validar("10.99.0.10", True, "tcp")


@pytest.mark.parametrize("ip", [" 10.99.0.10", "10.99.0.10\n", "010.099.000.010", "10.99.0.10 "])
def test_recusa_strings_malformadas(guarda: Guarda, ip: str) -> None:
    with pytest.raises(DestinoProibido):
        guarda.validar(ip, None, "icmp")


def test_loopback_permitido_somente_127_0_0_1() -> None:
    g = Guarda([REDE], permitir_loopback=True)
    with pytest.raises(DestinoProibido):
        g.validar("127.0.0.2", None, "icmp")


def test_nenhum_so_broadcast_no_codigo() -> None:
    raiz = Path(__file__).resolve().parents[2] / "sentinela"
    proibidos = ["so_broadcast", "zeroconf", "ssdp", "wsdiscovery"]
    arquivos = [*raiz.rglob("*.py"), raiz.parent / "pyproject.toml"]
    assert arquivos
    for arq in arquivos:
        texto = arq.read_text(encoding="utf-8").lower()
        for p in proibidos:
            assert p not in texto, f"{p} encontrado em {arq}"


# ---- atualizar (R3) --------------------------------------------------------


def test_atualizar_troca_sub_redes_in_place() -> None:
    g = Guarda([IPv4Network("10.99.0.0/24")])
    g.atualizar([IPv4Network("10.99.1.0/24")])
    assert g.validar("10.99.1.7", None, "icmp").ip == IPv4Address("10.99.1.7")
    with pytest.raises(DestinoProibido, match="fora das sub-redes"):
        g.validar("10.99.0.7", None, "icmp")
    with pytest.raises(DestinoProibido, match="rede ou broadcast"):
        g.validar("10.99.1.255", None, "icmp")


def test_atualizar_com_lista_vazia_recusa_tudo() -> None:
    g = Guarda([IPv4Network("10.99.0.0/24")])
    g.atualizar([])
    with pytest.raises(DestinoProibido):
        g.validar("10.99.0.7", None, "icmp")


def test_atualizar_invalido_nao_altera_nada() -> None:
    g = Guarda([IPv4Network("10.99.0.0/24")])
    with pytest.raises(DestinoProibido):
        g.atualizar([IPv4Network("10.99.1.0/24"), IPv4Network("8.8.8.0/24")])
    assert g.validar("10.99.0.7", None, "icmp").ip == IPv4Address("10.99.0.7")
    with pytest.raises(DestinoProibido):
        g.validar("10.99.1.7", None, "icmp")
