"""Fontes simuladas do modo demonstração: achados sintéticos estáveis, sem nenhum socket.

Três perfis, escolhidos pelo tipo da fonte (``simulada`` decide pela porta):

- ``mikrotik`` (porta 8729): 20 aparelhos vistos por ARP/DHCP/Wi-Fi/vizinhos;
- ``snmp`` (porta 161): 4 dos mesmos computadores (mesmo MAC: mesclam numa descoberta só)
  e 4 switches por LLDP;
- ``gravador`` (outras portas): o próprio gravador e 16 canais, com estado de canal fixo.

Tudo em ``10.99.x`` (hosts livres das sub-redes da demo) e MACs ``02:00:00:fd/fe:..``
(localmente administrados). Nada aqui importa biblioteca de rede.
"""

from collections.abc import Iterable
from ipaddress import IPv4Address
from typing import Literal

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import Achado, Origem, ResultadoTeste
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, Guarda

Perfil = Literal["mikrotik", "snmp", "gravador"]

PORTA_MIKROTIK = 8729
PORTA_SNMP = 161
TOTAL_CANAIS = 16
CANAL_OFFLINE = 16  # o gravador simulado informa este canal como offline
AVISO_SIMULADA = "fonte simulada: nenhum pacote sai para a rede"

# (ip, mac, origem, nome, fabricante, sinais)
_Linha = tuple[str, str, Origem, str | None, str | None, dict[str, str]]

_MIKROTIK: tuple[_Linha, ...] = (
    ("10.99.60.150", "02:00:00:fd:00:01", "dhcp", "desktop-financeiro", None, {}),
    ("10.99.60.151", "02:00:00:fd:00:02", "dhcp", "desktop-rh", None, {}),
    ("10.99.60.152", "02:00:00:fd:00:03", "dhcp", "notebook-diretoria", None, {}),
    ("10.99.60.153", "02:00:00:fd:00:04", "dhcp", "desktop-recepcao", None, {}),
    ("10.99.60.154", "02:00:00:fd:00:05", "arp", None, None, {}),
    ("10.99.60.155", "02:00:00:fd:00:06", "dhcp", "pc-almoxarifado", None, {}),
    ("10.99.60.160", "02:00:00:fd:00:07", "dhcp", "npi0a1b2c", "HP", {}),
    ("10.99.60.161", "02:00:00:fd:00:08", "dhcp", "brn3c2b1a", "Brother", {}),
    ("10.99.20.100", "02:00:00:fd:00:09", "wifi", None, None, {"interface": "wifi1"}),
    ("10.99.20.101", "02:00:00:fd:00:0a", "wifi", "android-portaria", None, {}),
    ("10.99.20.102", "02:00:00:fd:00:0b", "wifi", "iphone-gerencia", None, {}),
    ("10.99.20.103", "02:00:00:fd:00:0c", "wifi", None, None, {"interface": "wifi2"}),
    (
        "10.99.20.110",
        "02:00:00:fd:00:0d",
        "vizinho",
        "AP Bloco G",
        "MikroTik",
        {"plataforma": "wireless"},
    ),
    (
        "10.99.20.111",
        "02:00:00:fd:00:0e",
        "vizinho",
        "AP Bloco H",
        "MikroTik",
        {"plataforma": "wireless"},
    ),
    ("10.99.10.200", "02:00:00:fd:00:0f", "dhcp", "ipc-garagem", "Hikvision", {}),
    ("10.99.10.201", "02:00:00:fd:00:10", "dhcp", "cam-doca", "Intelbras", {}),
    ("10.99.10.202", "02:00:00:fd:00:11", "arp", "cam-patio", "Dahua", {}),
    ("10.99.30.100", "02:00:00:fd:00:12", "dhcp", "idface-portaria", "Control iD", {}),
    ("10.99.30.101", "02:00:00:fd:00:13", "dhcp", "catraca-garagem", None, {}),
    # fora das sub-redes da demo: aparece com o selo e o botão "Declarar sub-rede"
    ("10.99.70.20", "02:00:00:fd:00:14", "dhcp", "tv-sala-reuniao", None, {}),
)

_SNMP: tuple[_Linha, ...] = (
    *(
        (ip, mac, "snmp_arp", None, None, {"porta_switch": f"ge-0/0/{i + 1}"})
        for i, (ip, mac, *_) in enumerate(_MIKROTIK[:4])
    ),
    ("10.99.40.100", "02:00:00:fd:01:01", "lldp", "sw-andar-1", None, {"descricao": "switch"}),
    ("10.99.40.101", "02:00:00:fd:01:02", "lldp", "sw-andar-2", None, {"descricao": "switch"}),
    ("10.99.40.102", "02:00:00:fd:01:03", "lldp", "sw-bloco-g", None, {"descricao": "switch"}),
    ("10.99.40.103", "02:00:00:fd:01:04", "lldp", "sw-bloco-h", None, {"descricao": "switch"}),
)

_LOCAIS = (
    "Portão",
    "Recepção",
    "Garagem 1",
    "Garagem 2",
    "Corredor A",
    "Corredor B",
    "Escada Norte",
    "Escada Sul",
    "Hall",
    "Pátio",
    "Refeitório",
    "Almoxarifado",
    "Doca",
    "Cobertura",
    "Elevador",
    "Depósito",
)


def perfil_simulado(tipo: str, porta: int) -> Perfil:
    if tipo == "mikrotik" or (tipo == "simulada" and porta == PORTA_MIKROTIK):
        return "mikrotik"
    if tipo == "snmp" or (tipo == "simulada" and porta == PORTA_SNMP):
        return "snmp"
    return "gravador"


def mac_canal(canal: int) -> str:
    return f"02:00:00:fe:00:{canal:02x}"


class ColetorSimulado:
    """``Coletor`` (e ``status_canais`` no perfil gravador) sem rede. Mesma assinatura das
    fontes reais, para servir de fábrica no modo demonstração."""

    def __init__(self, fonte: Fonte, *_: object) -> None:
        self._fonte_id = fonte.id
        self._host = fonte.host
        self._nome = fonte.nome
        self.perfil: Perfil = perfil_simulado(fonte.tipo, fonte.porta)

    def _de(self, linhas: Iterable[_Linha]) -> list[Achado]:
        return [
            Achado(ip, mac, origem, self._fonte_id, nome, fabricante, sinais=dict(sinais))
            for ip, mac, origem, nome, fabricante, sinais in linhas
        ]

    async def coletar(self) -> list[Achado]:
        if self.perfil == "mikrotik":
            return self._de(_MIKROTIK)
        if self.perfil == "snmp":
            return self._de(_SNMP)
        gravador = Achado(
            self._host,
            None,
            "gravador",
            self._fonte_id,
            "NVR demonstração",
            "Hikvision",
            sinais={"tipo": "NVR", "modelo": "DS-7616NI"},
        )
        canais = [
            Achado(
                f"192.168.254.{n}",
                mac_canal(n),
                "gravador_canal",
                self._fonte_id,
                f"Câmera {_LOCAIS[n - 1]}",
                "Hikvision",
                pai_fonte_id=self._fonte_id,
                canal=n,
                sinais={"modelo": "DS-2CD1043"},
            )
            for n in range(1, TOTAL_CANAIS + 1)
        ]
        return [gravador, *canais]

    async def testar(self) -> ResultadoTeste:
        return ResultadoTeste(
            ok=True, identidade=self._nome, versao="simulada", avisos=[AVISO_SIMULADA]
        )

    async def status_canais(self) -> dict[int, bool]:
        return {n: n != CANAL_OFFLINE for n in range(1, TOTAL_CANAIS + 1)}


def fabricar_simulado(fonte: Fonte, *_: object) -> ColetorSimulado:
    """Fábrica do modo demonstração: TODA fonte vira simulada (nenhum socket)."""
    return ColetorSimulado(fonte)


async def ping_simulado(destino: DestinoAutorizado) -> bool:
    """Varredura da demo: responde de forma estável, sem enviar pacote."""
    return int(IPv4Address(destino.ip)) % 4 == 2


async def sondar_simulado(
    ip: str, guarda: Guarda, limitador: Limitador
) -> tuple[set[int], str | None]:
    """Sondagem da demo: valida na Guarda como a real e devolve portas fixas por IP."""
    guarda.validar(ip, 80, "tcp")
    return ({80, 554} if int(IPv4Address(ip)) % 2 == 0 else {22, 443}), None
