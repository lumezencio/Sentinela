"""Sobe um dos simuladores dos testes do núcleo num IP fixo da rede de captura.

Uso (dentro do container ``simuladores``): ``python rodar.py routeros|snmp|gravador|telegram``.

Os simuladores são os MESMOS de ``core/tests/descoberta`` (copiados para a imagem, sem cópia
de lógica aqui); este arquivo só escolhe as tabelas desta rede (10.99.250.0/24, MACs
``02:00:00:…``, câmeras internas do gravador em 192.168.254.x, regra R10) e o endereço.
"""

import asyncio
import signal
import sys
import threading
from pathlib import Path

from tests.descoberta.agente_snmp import AgenteSnmp
from tests.descoberta.simulador_gravador import SimuladorGravador, fixture
from tests.descoberta.simulador_routeros import SimuladorRouterOS, gerar_certificado

ESCUTA = "0.0.0.0"  # noqa: S104 - container numa rede interna isolada; o IP fixo vem do compose

# O que o "MikroTik" diz ver: dois aparelhos por ARP (um será aprovado, outro sondado),
# um lease DHCP, o switch SNMP como vizinho e um cliente Wi-Fi sem IP.
TABELAS_ROUTEROS: dict[str, list[dict[str, str]]] = {
    "/ip/arp/print": [
        {"address": "10.99.250.20", "mac-address": "02:00:00:fa:00:20", "interface": "bridge"},
        {"address": "10.99.250.21", "mac-address": "02:00:00:fa:00:21", "interface": "bridge"},
    ],
    "/ip/dhcp-server/lease/print": [
        {
            "address": "10.99.250.22",
            "mac-address": "02:00:00:fa:00:22",
            "host-name": "impressora-recepcao",
            "status": "bound",
        },
    ],
    "/ip/neighbor/print": [
        {
            "address": "10.99.250.12",
            "mac-address": "02:00:00:fa:00:12",
            "identity": "sw-andar-1",
            "platform": "MikroTik",
            "board": "CRS326",
            "version": "7.16.2",
            "interface": "ether2",
        },
    ],
    "/interface/wifi/registration-table/print": [
        {"mac-address": "02:00:00:fa:00:30", "interface": "wifi1", "signal": "-61"},
    ],
}

ROTAS_HIKVISION = {
    "/ISAPI/System/deviceInfo": "hikvision_deviceinfo.xml",
    "/ISAPI/ContentMgmt/InputProxy/channels": "hikvision_canais_v20.xml",
    "/ISAPI/ContentMgmt/InputProxy/channels/status": "hikvision_status.xml",
}


async def _ate_sinal() -> None:
    parar = asyncio.Event()
    laco = asyncio.get_running_loop()
    for sinal in (signal.SIGTERM, signal.SIGINT):
        laco.add_signal_handler(sinal, parar.set)
    await parar.wait()


async def routeros() -> None:
    sim = SimuladorRouterOS(
        identidade="rb-captura",
        tabelas=dict(TABELAS_ROUTEROS),
        certificado=gerar_certificado(Path("/tmp"), "sim-routeros"),  # noqa: S108 - tmpfs
    )
    async with sim.rodando(ESCUTA, 8729):
        print("routeros: api-ssl em 8729", flush=True)
        await _ate_sinal()


async def snmp() -> None:
    agente = AgenteSnmp(
        sysdescr="CRS326 RouterOS 7.16.2",
        sysname="sw-andar-1",
        arp_nova={"10.99.250.23": "02:00:00:fa:00:23"},
        fdb={"02:00:00:fa:00:23": 5, "02:00:00:fa:00:20": 3},
        lldp=[("02:00:00:fa:00:11", "rb-captura", "MikroTik RouterOS")],
    )
    async with agente.rodando(ESCUTA, 161):
        print("snmp: v2c em 161/udp", flush=True)
        await _ate_sinal()


async def gravador() -> None:
    sim = SimuladorGravador({c: fixture(a) for c, a in ROTAS_HIKVISION.items()})
    async with sim.rodando(ESCUTA, 80):
        print("gravador: ISAPI (Digest) em 80/tcp", flush=True)
        await _ate_sinal()


async def telegram() -> None:
    from telegram_falso import servir  # noqa: PLC0415 - só este simulador precisa dele

    threading.Thread(target=servir, daemon=True).start()
    await _ate_sinal()


SIMULADORES = {"routeros": routeros, "snmp": snmp, "gravador": gravador, "telegram": telegram}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in SIMULADORES:
        sys.exit(f"uso: rodar.py {'|'.join(SIMULADORES)}")
    asyncio.run(SIMULADORES[sys.argv[1]]())
