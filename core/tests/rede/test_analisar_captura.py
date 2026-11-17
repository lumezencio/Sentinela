"""Teste negativo do analisador da prova de zero broadcast (``testes-rede/analisar_captura.py``).

pcaps sintéticos montados aqui (só 10.99.x e MACs ``02:00:00:…``): um quadro mDNS do Sentinela
reprova; ARP request para IP permitido passa e é contado; o resto cobre as outras formas de
difusão, o enlace Linux cooked e a prova inválida (pcap vazio, sem quadros do Sentinela ou sem
unicast para um host de fonte exigido).
"""

import importlib.util
import ipaddress
import struct
from pathlib import Path
from types import ModuleType

import pytest

ARQUIVO = Path(__file__).resolve().parents[3] / "testes-rede" / "analisar_captura.py"
MAC_SENTINELA = bytes.fromhex("020000fa0010")
MAC_OUTRO = bytes.fromhex("020000fa0011")
IP_SENTINELA = "10.99.250.10"


def _carregar() -> ModuleType:
    spec = importlib.util.spec_from_file_location("analisar_captura", ARQUIVO)
    assert spec is not None and spec.loader is not None
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


ac = _carregar()


def _ip4(a: str) -> bytes:
    return ipaddress.IPv4Address(a).packed


def eth(destino: bytes, origem: bytes, tipo: int, carga: bytes) -> bytes:
    return destino + origem + struct.pack("!H", tipo) + carga


def ipv4(origem: str, destino: str, proto: int = 17, carga: bytes = b"") -> bytes:
    cab = struct.pack("!BBHHHBBH", 0x45, 0, 20 + len(carga), 0, 0, 64, proto, 0)
    return cab + _ip4(origem) + _ip4(destino) + carga


def arp(op: int, mac: bytes, ip: str, alvo: str) -> bytes:
    return struct.pack("!HHBBH", 1, 0x0800, 6, 4, op) + mac + _ip4(ip) + b"\x00" * 6 + _ip4(alvo)


def pcap(caminho: Path, quadros: list[bytes], enlace: int = 1) -> Path:
    dados = struct.pack("<IHHiIII", 0xA1B2C3D4, 2, 4, 0, 0, 65535, enlace)
    for i, q in enumerate(quadros):
        dados += struct.pack("<IIII", 1_800_000_000 + i, 0, len(q), len(q)) + q
    caminho.write_bytes(dados)
    return caminho


def rodar(caminho: Path, permitidos: str = "", exigir: str = "") -> int:
    args = [str(caminho), "--origem", IP_SENTINELA, "--origem", "02:00:00:fa:00:10"]
    args += ["--arp-permitido", permitidos, "--rede", "10.99.250.0/24"]
    if exigir:
        args += ["--exigir-contato", exigir]
    resultado: int = ac.main(args)
    return resultado


ARP_PERMITIDO = eth(
    b"\xff" * 6, MAC_SENTINELA, 0x0806, arp(1, MAC_SENTINELA, IP_SENTINELA, "10.99.250.20")
)
UNICAST = eth(MAC_OUTRO, MAC_SENTINELA, 0x0800, ipv4(IP_SENTINELA, "10.99.250.11", 6))


def test_mdns_do_sentinela_reprova(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    mdns = eth(
        bytes.fromhex("01005e0000fb"),
        MAC_SENTINELA,
        0x0800,
        ipv4(IP_SENTINELA, "224.0.0.251", 17, struct.pack("!HHHH", 5353, 5353, 8, 0)),
    )
    assert rodar(pcap(tmp_path / "mdns.pcap", [UNICAST, mdns]), "10.99.250.20") == 1
    saida = capsys.readouterr().out
    assert "REPROVADO: 1 quadro" in saida
    assert "IPv4 multicast 224.0.0.251" in saida


def test_arp_para_ip_permitido_passa_e_e_contado(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    caminho = pcap(tmp_path / "arp.pcap", [ARP_PERMITIDO, UNICAST, ARP_PERMITIDO])
    assert rodar(caminho, "10.99.250.11,10.99.250.20") == 0
    saida = capsys.readouterr().out
    assert "ARP request permitidos: 2 para 1 IP(s)" in saida
    assert "APROVADO" in saida


def test_arp_dentro_de_cidr_permitido_passa(tmp_path: Path) -> None:
    varrido = eth(
        b"\xff" * 6, MAC_SENTINELA, 0x0806, arp(1, MAC_SENTINELA, IP_SENTINELA, "10.99.250.40")
    )
    assert rodar(pcap(tmp_path / "v.pcap", [varrido]), "10.99.250.32/28") == 0


@pytest.mark.parametrize(
    "quadro",
    [
        # ARP request para IP fora da lista
        eth(
            b"\xff" * 6, MAC_SENTINELA, 0x0806, arp(1, MAC_SENTINELA, IP_SENTINELA, "10.99.250.99")
        ),
        # ARP gratuito (anúncio do próprio IP)
        eth(b"\xff" * 6, MAC_SENTINELA, 0x0806, arp(1, MAC_SENTINELA, IP_SENTINELA, IP_SENTINELA)),
        # broadcast IPv4 limitado (ex.: descoberta por UDP)
        eth(b"\xff" * 6, MAC_SENTINELA, 0x0800, ipv4(IP_SENTINELA, "255.255.255.255")),
        # broadcast dirigido da rede, mesmo com MAC unicast
        eth(MAC_OUTRO, MAC_SENTINELA, 0x0800, ipv4(IP_SENTINELA, "10.99.250.255")),
        # SSDP
        eth(
            bytes.fromhex("01005e7ffffa"),
            MAC_SENTINELA,
            0x0800,
            ipv4(IP_SENTINELA, "239.255.255.250"),
        ),
        # IPv6 multicast (33:33:*), identificado só pelo MAC de origem
        eth(
            bytes.fromhex("3333000000fb"),
            MAC_SENTINELA,
            0x86DD,
            b"\x60" + b"\x00" * 23 + bytes.fromhex("ff02") + b"\x00" * 13 + b"\xfb",
        ),
    ],
    ids=["arp-fora", "arp-gratuito", "bcast-limitado", "bcast-dirigido", "ssdp", "ipv6-mcast"],
)
def test_difusao_proibida_reprova(tmp_path: Path, quadro: bytes) -> None:
    assert rodar(pcap(tmp_path / "x.pcap", [quadro]), "10.99.250.20,10.99.250.32/28") == 1


def test_difusao_de_outro_host_nao_conta(tmp_path: Path) -> None:
    outro = eth(
        bytes.fromhex("01005e0000fb"),
        MAC_OUTRO,
        0x0800,
        ipv4("10.99.250.11", "224.0.0.251"),
    )
    assert rodar(pcap(tmp_path / "o.pcap", [outro, UNICAST])) == 0


def test_linux_cooked_arp_fora_da_lista_reprova(tmp_path: Path) -> None:
    # SLL v1: tipo de pacote 4 (saindo), ARPHRD_ETHER, 6 bytes de endereço, protocolo ARP
    sll = struct.pack("!HHH", 4, 1, 6) + MAC_SENTINELA + b"\x00\x00" + struct.pack("!H", 0x0806)
    fora = sll + arp(1, MAC_SENTINELA, IP_SENTINELA, "10.99.250.99")
    dentro = sll + arp(1, MAC_SENTINELA, IP_SENTINELA, "10.99.250.20")
    assert rodar(pcap(tmp_path / "c1.pcap", [dentro], enlace=113), "10.99.250.20") == 0
    assert rodar(pcap(tmp_path / "c2.pcap", [fora], enlace=113), "10.99.250.20") == 1


def test_arquivo_que_nao_e_pcap(tmp_path: Path) -> None:
    lixo = tmp_path / "lixo.pcap"
    lixo.write_bytes(b"\x0a\x0d\x0d\x0a" + b"\x00" * 40)  # pcapng
    assert rodar(lixo) == 2


# ---- prova inválida (código 2): a captura não viu o trabalho do Sentinela ------------------


def test_pcap_so_com_cabecalho_e_invalido(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert rodar(pcap(tmp_path / "vazio.pcap", []), "10.99.250.20") == 2
    assert "INVÁLIDO: nenhum quadro emitido pelo Sentinela" in capsys.readouterr().out


def test_pcap_so_com_quadros_de_outros_hosts_e_invalido(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    alheio = eth(MAC_SENTINELA, MAC_OUTRO, 0x0800, ipv4("10.99.250.11", IP_SENTINELA, 6))
    bcast_alheio = eth(
        b"\xff" * 6, MAC_OUTRO, 0x0806, arp(1, MAC_OUTRO, "10.99.250.11", IP_SENTINELA)
    )
    assert rodar(pcap(tmp_path / "alheio.pcap", [alheio, bcast_alheio])) == 2
    assert "INVÁLIDO: nenhum quadro emitido pelo Sentinela" in capsys.readouterr().out


def test_fonte_exigida_sem_unicast_e_invalida(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    # .11 recebeu unicast; .12 só um ARP request (permitido), nunca unicast
    arp_12 = eth(
        b"\xff" * 6, MAC_SENTINELA, 0x0806, arp(1, MAC_SENTINELA, IP_SENTINELA, "10.99.250.12")
    )
    caminho = pcap(tmp_path / "falta.pcap", [UNICAST, arp_12])
    assert rodar(caminho, "10.99.250.11,10.99.250.12", exigir="10.99.250.11,10.99.250.12") == 2
    assert "INVÁLIDO: sem unicast do Sentinela para 10.99.250.12" in capsys.readouterr().out


def test_fontes_exigidas_com_unicast_passa(tmp_path: Path) -> None:
    para_12 = eth(MAC_OUTRO, MAC_SENTINELA, 0x0800, ipv4(IP_SENTINELA, "10.99.250.12", 17))
    caminho = pcap(tmp_path / "ok.pcap", [UNICAST, para_12])
    assert rodar(caminho, exigir="10.99.250.11,10.99.250.12") == 0


def test_violacao_tem_prioridade_sobre_prova_incompleta(tmp_path: Path) -> None:
    bcast = eth(b"\xff" * 6, MAC_SENTINELA, 0x0800, ipv4(IP_SENTINELA, "255.255.255.255"))
    assert rodar(pcap(tmp_path / "v.pcap", [bcast]), exigir="10.99.250.11") == 1


@pytest.mark.parametrize("alvo", ["10.99.250.32", "10.99.250.47"], ids=["rede", "broadcast"])
def test_arp_para_rede_ou_broadcast_do_cidr_permitido_reprova(tmp_path: Path, alvo: str) -> None:
    quadro = eth(b"\xff" * 6, MAC_SENTINELA, 0x0806, arp(1, MAC_SENTINELA, IP_SENTINELA, alvo))
    assert rodar(pcap(tmp_path / "rb.pcap", [quadro, UNICAST]), "10.99.250.32/28") == 1


def test_broadcast_dirigido_de_qualquer_rede_declarada_reprova(tmp_path: Path) -> None:
    # 10.99.250.31 é o broadcast do /27 declarado na cena (não do /24)
    quadro = eth(MAC_OUTRO, MAC_SENTINELA, 0x0800, ipv4(IP_SENTINELA, "10.99.250.31"))
    args = [str(pcap(tmp_path / "b27.pcap", [quadro, UNICAST])), "--origem", IP_SENTINELA]
    redes = "10.99.250.0/24,10.99.250.0/27,10.99.250.32/28"
    assert ac.main([*args, "--rede", redes]) == 1
    assert ac.main([*args, "--rede", "10.99.250.0/24"]) == 0  # só o /24 não pegaria


@pytest.mark.parametrize(
    "valor", ["10.99.250.11,lixo", "", " , "], ids=["malformado", "vazio", "so-virgulas"]
)
def test_exigir_contato_malformado_ou_vazio_e_invalido_sem_traceback(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], valor: str
) -> None:
    caminho = pcap(tmp_path / "ok.pcap", [UNICAST])
    assert ac.main([str(caminho), "--origem", IP_SENTINELA, "--exigir-contato", valor]) == 2
    erro = capsys.readouterr().err
    assert "Traceback" not in erro and "--exigir-contato" in erro


def test_rede_ou_origem_malformada_e_invalida_sem_traceback(tmp_path: Path) -> None:
    caminho = str(pcap(tmp_path / "ok.pcap", [UNICAST]))
    assert ac.main([caminho, "--origem", "nao-e-ip"]) == 2
    assert ac.main([caminho, "--origem", IP_SENTINELA, "--rede", "10.99.250.0/33"]) == 2
    assert ac.main([caminho, "--origem", IP_SENTINELA, "--arp-permitido", "x"]) == 2
