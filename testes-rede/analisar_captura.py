"""Analisa a captura da prova de zero broadcast (spec §6 e §9.1 da Fase 3).

Uso::

    python analisar_captura.py captura.pcap --origem 10.99.250.10 --origem 02:00:00:fa:00:10 \
        --arp-permitido 10.99.250.11,10.99.250.20,10.99.250.32/28 [--rede 10.99.250.0/24] \
        [--exigir-contato 10.99.250.11,10.99.250.12] [--unicast-permitido 10.99.250.5,...]

Reprova (código 1) todo quadro emitido pela origem (o Sentinela: IP e/ou MAC) cujo destino seja
broadcast ou multicast: MAC ``ff:ff:ff:ff:ff:ff``, ``01:00:5e:*``, ``33:33:*`` ou qualquer MAC de
grupo; IPv4 multicast, ``255.255.255.255`` ou o broadcast dirigido de ``--rede``; IPv6
multicast. A única exceção é o ARP request (operação 1) para um IP de ``--arp-permitido``
(IPs ou CIDRs: hosts das fontes, aprovados, sondados e a faixa varrida), contado e relatado.
Num CIDR permitido, o endereço de rede e o de broadcast **não** são permitidos (a varredura
os pula; ARP para eles reprova).

Com ``--unicast-permitido`` (IPs/CIDRs), todo unicast IPv4 do Sentinela para destino fora da
lista também reprova ("unicast para destino não autorizado <ip>"); sem a opção, qualquer
unicast é aceito.

Prova inválida (código 2): argumento malformado; ``--exigir-contato`` presente mas vazio;
captura sem quadros, sem nenhum quadro da origem, ou sem unicast do Sentinela para algum IP de
``--exigir-contato`` (os hosts das fontes que a cena usou).

Só biblioteca padrão (lê o pcap clássico com ``struct``): roda no CI sem dependência nova e não
entra no núcleo. Tipos de enlace: Ethernet (1), Linux cooked v1 (113) e v2 (276). No cooked
não há MAC de destino: decide pelo conteúdo (ARP request e IP de destino), o que é mais
rigoroso (todo ARP request fora da lista reprova, mesmo que tenha ido em unicast).
"""

import argparse
import ipaddress
import struct
import sys
from collections import Counter
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

ETH_IPV4, ETH_ARP, ETH_IPV6, ETH_VLAN, ETH_QINQ = 0x0800, 0x0806, 0x86DD, 0x8100, 0x88A8
LINK_ETHERNET, LINK_SLL, LINK_SLL2 = 1, 113, 276
MAC_BROADCAST = b"\xff" * 6
# formato clássico do pcap: magia -> (ordem dos bytes, carimbo em nanossegundos)
MAGIAS = {
    b"\xd4\xc3\xb2\xa1": "<",
    b"\xa1\xb2\xc3\xd4": ">",
    b"\x4d\x3c\xb2\xa1": "<",
    b"\xa1\xb2\x3c\x4d": ">",
}

Rede = ipaddress.IPv4Network


class ErroCaptura(Exception):
    """Arquivo que não é pcap clássico ou com tipo de enlace não suportado."""


@dataclass
class Quadro:
    numero: int
    enlace: int
    dados: bytes


@dataclass
class Resultado:
    quadros: int = 0
    da_origem: int = 0
    difusao_da_origem: int = 0
    arp_permitido: Counter[str] = field(default_factory=Counter)
    proibidos: int = 0
    # destino IPv4 dos quadros unicast do Sentinela: prova de que a captura viu o trabalho real
    unicast_para: Counter[str] = field(default_factory=Counter)
    violacoes: list[str] = field(default_factory=list)  # as primeiras, para o relatório

    @property
    def aprovado(self) -> bool:
        return self.proibidos == 0


def mac_texto(b: bytes) -> str:
    return ":".join(f"{x:02x}" for x in b)


def ler_pcap(caminho: Path) -> Iterator[Quadro]:
    with caminho.open("rb") as f:
        cabecalho = f.read(24)
        if len(cabecalho) < 24 or cabecalho[:4] not in MAGIAS:
            raise ErroCaptura("não é um pcap clássico (pcapng não é suportado)")
        ordem = MAGIAS[cabecalho[:4]]
        enlace = struct.unpack(ordem + "I", cabecalho[20:24])[0] & 0x0FFFFFFF
        if enlace not in (LINK_ETHERNET, LINK_SLL, LINK_SLL2):
            raise ErroCaptura(f"tipo de enlace {enlace} não suportado")
        numero = 0
        while registro := f.read(16):
            if len(registro) < 16:
                raise ErroCaptura("captura truncada no cabeçalho de um quadro")
            _, _, incluido, _ = struct.unpack(ordem + "IIII", registro)
            dados = f.read(incluido)
            if len(dados) < incluido:
                raise ErroCaptura("captura truncada nos dados de um quadro")
            numero += 1
            yield Quadro(numero, enlace, dados)


@dataclass
class Enlace:
    """O que interessa de um quadro, independente do tipo de enlace."""

    origem_mac: bytes | None
    destino_mac: bytes | None  # None no Linux cooked
    tipo: int
    carga: bytes


def desmontar(q: Quadro) -> Enlace | None:
    d = q.dados
    if q.enlace == LINK_ETHERNET:
        if len(d) < 14:
            return None
        destino, origem, tipo, pos = d[0:6], d[6:12], struct.unpack("!H", d[12:14])[0], 14
        while tipo in (ETH_VLAN, ETH_QINQ) and len(d) >= pos + 4:
            tipo, pos = struct.unpack("!H", d[pos + 2 : pos + 4])[0], pos + 4
        return Enlace(origem, destino, tipo, d[pos:])
    if q.enlace == LINK_SLL:
        if len(d) < 16:
            return None
        tam = min(struct.unpack("!H", d[4:6])[0], 8)
        return Enlace(d[6 : 6 + tam], None, struct.unpack("!H", d[14:16])[0], d[16:])
    if len(d) < 20:  # SLL2
        return None
    tam = min(d[11], 8)
    return Enlace(d[12 : 12 + tam], None, struct.unpack("!H", d[0:2])[0], d[20:])


def _ip_permitido(ip: ipaddress.IPv4Address, permitidos: list[Rede]) -> bool:
    """IP de uma entrada permitida; num CIDR (até /30), sem o endereço de rede e o de
    broadcast."""
    return any(
        ip in r and (r.prefixlen >= 31 or ip not in (r.network_address, r.broadcast_address))
        for r in permitidos
    )


def analisar(
    caminho: Path,
    origens_ip: set[ipaddress.IPv4Address],
    origens_mac: set[bytes],
    permitidos: list[Rede],
    redes: list[Rede] | None = None,
    unicast_permitido: list[Rede] | None = None,
) -> Resultado:
    res = Resultado()
    broadcasts_dirigidos = {r.broadcast_address for r in redes or []}
    for q in ler_pcap(caminho):
        res.quadros += 1
        e = desmontar(q)
        if e is None:
            continue
        ip_origem: ipaddress.IPv4Address | None = None
        ip_destino: ipaddress.IPv4Address | ipaddress.IPv6Address | None = None
        arp_op: int | None = None
        arp_alvo: ipaddress.IPv4Address | None = None
        c = e.carga
        if e.tipo == ETH_IPV4 and len(c) >= 20:
            ip_origem = ipaddress.IPv4Address(c[12:16])
            ip_destino = ipaddress.IPv4Address(c[16:20])
        elif e.tipo == ETH_IPV6 and len(c) >= 40:
            ip_destino = ipaddress.IPv6Address(c[24:40])
        elif e.tipo == ETH_ARP and len(c) >= 28:
            arp_op = struct.unpack("!H", c[6:8])[0]
            ip_origem = ipaddress.IPv4Address(c[14:18])
            arp_alvo = ipaddress.IPv4Address(c[24:28])
        da_origem = (e.origem_mac is not None and e.origem_mac[:6] in origens_mac) or (
            ip_origem is not None and ip_origem in origens_ip
        )
        if not da_origem:
            continue
        res.da_origem += 1

        motivos: list[str] = []
        if e.destino_mac is not None:
            if e.destino_mac == MAC_BROADCAST:
                motivos.append("MAC broadcast")
            elif e.destino_mac[0] & 1:
                motivos.append(f"MAC multicast {mac_texto(e.destino_mac)}")
        if isinstance(ip_destino, ipaddress.IPv4Address):
            if ip_destino.is_multicast:
                motivos.append(f"IPv4 multicast {ip_destino}")
            elif ip_destino == ipaddress.IPv4Address("255.255.255.255"):
                motivos.append("IPv4 broadcast 255.255.255.255")
            elif ip_destino in broadcasts_dirigidos:
                motivos.append(f"IPv4 broadcast dirigido {ip_destino}")
        elif isinstance(ip_destino, ipaddress.IPv6Address) and ip_destino.is_multicast:
            motivos.append(f"IPv6 multicast {ip_destino}")
        if e.destino_mac is None and arp_op == 1:
            motivos.append("ARP request (enlace sem MAC de destino)")
        if not motivos:
            if isinstance(ip_destino, ipaddress.IPv4Address):
                res.unicast_para[str(ip_destino)] += 1
                if unicast_permitido is not None and not any(
                    ip_destino in r for r in unicast_permitido
                ):
                    res.proibidos += 1
                    if len(res.violacoes) < 50:
                        res.violacoes.append(
                            f"quadro {q.numero}: unicast para destino não autorizado {ip_destino}"
                        )
            continue
        res.difusao_da_origem += 1

        e_arp_request = arp_op == 1 and arp_alvo is not None
        so_broadcast_l2 = all(m.startswith(("MAC broadcast", "ARP request")) for m in motivos)
        if e_arp_request and so_broadcast_l2 and arp_alvo is not None:
            if _ip_permitido(arp_alvo, permitidos) and arp_alvo != ip_origem:
                res.arp_permitido[str(arp_alvo)] += 1
                continue
            motivos.append(f"ARP request para {arp_alvo}, fora da lista permitida")
        res.proibidos += 1
        if len(res.violacoes) < 50:
            res.violacoes.append(f"quadro {q.numero}: " + "; ".join(motivos))
    return res


def _origens(textos: list[str]) -> tuple[set[ipaddress.IPv4Address], set[bytes]]:
    ips: set[ipaddress.IPv4Address] = set()
    macs: set[bytes] = set()
    for item in (p.strip() for t in textos for p in t.split(",")):
        if not item:
            continue
        if ":" in item:
            partes = item.split(":")
            if len(partes) != 6:
                raise argparse.ArgumentTypeError(f"MAC inválido: {item}")
            macs.add(bytes(int(p, 16) for p in partes))
        else:
            ips.add(ipaddress.IPv4Address(item))
    return ips, macs


def _redes(texto: str) -> list[Rede]:
    return [ipaddress.IPv4Network(p.strip()) for p in texto.split(",") if p.strip()]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("pcap", type=Path)
    ap.add_argument("--origem", action="append", required=True, help="IP e/ou MAC do Sentinela")
    ap.add_argument("--arp-permitido", default="", help="IPs/CIDRs separados por vírgula")
    ap.add_argument("--rede", default="", help="CIDR(s) da rede, para o broadcast dirigido")
    ap.add_argument(
        "--exigir-contato",
        default=None,
        help="IPs (vírgula) que precisam ter recebido unicast do Sentinela: hosts das fontes",
    )
    ap.add_argument(
        "--unicast-permitido",
        default=None,
        help="IPs/CIDRs (vírgula): todo unicast IPv4 do Sentinela para fora da lista reprova",
    )
    a = ap.parse_args(argv)
    try:
        exigidos: list[ipaddress.IPv4Address] = []
        if a.exigir_contato is not None:
            textos = [p.strip() for p in a.exigir_contato.split(",") if p.strip()]
            if not textos:
                raise ValueError("--exigir-contato vazio: a prova não teria o que conferir")
            try:
                exigidos = [ipaddress.IPv4Address(p) for p in textos]
            except ValueError:
                raise ValueError("--exigir-contato: IPv4 inválido") from None
        ips, macs = _origens(a.origem)
        permitidos, redes = _redes(a.arp_permitido), _redes(a.rede)
        unicast = None if a.unicast_permitido is None else _redes(a.unicast_permitido)
    except (ValueError, argparse.ArgumentTypeError) as erro:
        print(f"erro: {erro}", file=sys.stderr)
        return 2
    try:
        res = analisar(a.pcap, ips, macs, permitidos, redes, unicast)
    except (ErroCaptura, OSError) as erro:
        print(f"erro: {erro}", file=sys.stderr)
        return 2
    print(f"quadros na captura: {res.quadros}")
    print(f"quadros emitidos pelo Sentinela: {res.da_origem}")
    print(f"broadcast/multicast emitidos pelo Sentinela: {res.difusao_da_origem}")
    total_arp = sum(res.arp_permitido.values())
    print(f"ARP request permitidos: {total_arp} para {len(res.arp_permitido)} IP(s)")
    for ip, n in sorted(res.arp_permitido.items(), key=lambda x: ipaddress.IPv4Address(x[0])):
        print(f"  {ip}: {n}")
    sem_contato = [str(ip) for ip in exigidos if res.unicast_para[str(ip)] == 0]
    for exigido in exigidos:
        print(f"  unicast do Sentinela para {exigido}: {res.unicast_para[str(exigido)]}")
    if not res.aprovado:
        print(f"REPROVADO: {res.proibidos} quadro(s) proibido(s); os primeiros:")
        for v in res.violacoes:
            print(f"  {v}")
        return 1
    # captura que não viu o trabalho do Sentinela não prova nada: interface ou MAC errados,
    # tcpdump que perdeu o buffer, cena que não rodou. Código 2 = prova inválida.
    if res.quadros == 0 or res.da_origem == 0:
        print("INVÁLIDO: nenhum quadro emitido pelo Sentinela na captura")
        return 2
    if sem_contato:
        print(f"INVÁLIDO: sem unicast do Sentinela para {', '.join(sem_contato)}")
        return 2
    print("APROVADO: nenhum broadcast/multicast além do ARP permitido")
    return 0


if __name__ == "__main__":
    sys.exit(main())
