"""Agente SNMP de teste: o próprio respondedor de comandos do pysnmp em 127.0.0.1.

Serve uma tabela fixa de OIDs numéricos (v2c e v3 authPriv) e conta os pedidos GET/GETBULK
recebidos, de modo que o teste exercita a troca real de pacotes UDP, sem simular o adaptador.
"""

import socket
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from pysnmp.carrier.asyncio.dgram import udp
from pysnmp.entity import config, engine
from pysnmp.entity.rfc3413 import cmdrsp, context
from pysnmp.proto import rfc1902, rfc1905
from pysnmp.smi.instrum import AbstractMibInstrumController

Valor = rfc1902.OctetString | rfc1902.Integer32 | rfc1902.Integer

COMUNIDADE = "comunidade-de-teste"
USUARIO_V3 = "leitor3"
SENHA_AUTH = "senha-auth-marca-1"
SENHA_PRIV = "senha-priv-marca-2"

BASE_SISTEMA = (1, 3, 6, 1, 2, 1, 1)
OID_SYSDESCR = (*BASE_SISTEMA, 1, 0)
OID_SYSNAME = (*BASE_SISTEMA, 5, 0)
OID_ARP_NOVA = (1, 3, 6, 1, 2, 1, 4, 35, 1, 4)
OID_ARP_ANTIGA = (1, 3, 6, 1, 2, 1, 4, 22, 1, 2)
OID_FDB_Q = (1, 3, 6, 1, 2, 1, 17, 7, 1, 2, 2, 1, 2)
OID_FDB_D = (1, 3, 6, 1, 2, 1, 17, 4, 3, 1, 2)
OID_LLDP = (1, 0, 8802, 1, 1, 2, 1, 4, 1, 1)


def mac_bytes(mac: str) -> bytes:
    return bytes(int(p, 16) for p in mac.split(":"))


def _sufixo_mac(mac: str) -> tuple[int, ...]:
    return tuple(mac_bytes(mac))


def _sufixo_ip(ip: str) -> tuple[int, ...]:
    return tuple(int(p) for p in ip.split("."))


class Tabela(AbstractMibInstrumController):  # type: ignore[misc]
    """Instrumentação mínima: OIDs fixos, GET e GETNEXT em ordem lexicográfica."""

    def __init__(self, valores: dict[tuple[int, ...], Any]) -> None:
        self._valores = dict(sorted(valores.items()))

    def read_variables(self, *var_binds: Any, **contexto: Any) -> list[Any]:
        saida: list[Any] = []
        for oid, _ in var_binds:
            chave = tuple(oid)
            valor = self._valores.get(chave)
            saida.append((oid, valor if valor is not None else rfc1905.noSuchInstance))
        return saida

    def read_next_variables(self, *var_binds: Any, **contexto: Any) -> list[Any]:
        saida: list[Any] = []
        for oid, _ in var_binds:
            chave = tuple(oid)
            proximo = next((o for o in self._valores if o > chave), None)
            if proximo is None:
                saida.append((oid, rfc1905.endOfMibView))
            else:
                saida.append((rfc1902.ObjectName(proximo), self._valores[proximo]))
        return saida


class AgenteSnmp:
    def __init__(
        self,
        *,
        sysdescr: str = "RouterOS RB-teste",
        sysname: str = "rb-sede",
        arp_nova: dict[str, str] | None = None,  # ip -> mac
        arp_antiga: dict[str, str] | None = None,
        fdb: dict[str, int] | None = None,  # mac -> porta (Q-BRIDGE)
        fdb_antiga: dict[str, int] | None = None,
        lldp: list[tuple[str, str, str]] | None = None,  # (mac chassi, nome, descrição)
        linhas_extras: int = 0,
    ) -> None:
        v: dict[tuple[int, ...], Any] = {
            OID_SYSDESCR: rfc1902.OctetString(sysdescr.encode()),
            OID_SYSNAME: rfc1902.OctetString(sysname.encode()),
        }
        for ip, mac in (arp_nova or {}).items():
            v[(*OID_ARP_NOVA, 2, 1, 4, *_sufixo_ip(ip))] = rfc1902.OctetString(mac_bytes(mac))
        for ip, mac in (arp_antiga or {}).items():
            v[(*OID_ARP_ANTIGA, 2, *_sufixo_ip(ip))] = rfc1902.OctetString(mac_bytes(mac))
        for mac, porta in (fdb or {}).items():
            v[(*OID_FDB_Q, 1, *_sufixo_mac(mac))] = rfc1902.Integer32(porta)
        for mac, porta in (fdb_antiga or {}).items():
            v[(*OID_FDB_D, *_sufixo_mac(mac))] = rfc1902.Integer32(porta)
        for i, (mac, nome, desc) in enumerate(lldp or [], start=1):
            ind = (0, 3, i)
            v[(*OID_LLDP, 4, *ind)] = rfc1902.Integer32(4)
            v[(*OID_LLDP, 5, *ind)] = rfc1902.OctetString(mac_bytes(mac))
            v[(*OID_LLDP, 9, *ind)] = rfc1902.OctetString(nome.encode())
            v[(*OID_LLDP, 10, *ind)] = rfc1902.OctetString(desc.encode())
        for i in range(linhas_extras):
            v[(*OID_ARP_ANTIGA, 2, 10, 99, i // 250, i % 250 + 1)] = rfc1902.OctetString(
                bytes([2, 0, 0, 0, i // 250, i % 250])
            )
        self._tabela = Tabela(v)
        self.pedidos = 0

    @asynccontextmanager
    async def rodando(self, host: str = "127.0.0.1", porta: int = 0) -> AsyncIterator[int]:
        """Host/porta fixos só no container da captura (testes-rede); testes: 127.0.0.1:0."""
        if not porta:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.bind((host, 0))
                porta = int(s.getsockname()[1])
        motor = engine.SnmpEngine()
        config.add_transport(
            motor,
            udp.DOMAIN_NAME,
            udp.UdpTransport().open_server_mode((host, porta)),
        )
        config.add_v1_system(motor, "area", COMUNIDADE)
        config.add_vacm_user(motor, 2, "area", "noAuthNoPriv", (1, 3, 6), (1, 3, 6))
        config.add_vacm_user(motor, 2, "area", "noAuthNoPriv", (1, 0, 8802), (1, 0, 8802))
        config.add_v3_user(
            motor,
            USUARIO_V3,
            config.USM_AUTH_HMAC96_SHA,
            SENHA_AUTH,
            config.USM_PRIV_CFB128_AES,
            SENHA_PRIV,
        )
        for raiz in ((1, 3, 6), (1, 0, 8802)):
            config.add_vacm_user(motor, 3, USUARIO_V3, "authPriv", raiz, raiz)
        contexto = context.SnmpContext(motor)
        contexto.context_names[b""] = self._tabela
        agente = self

        class Obter(cmdrsp.GetCommandResponder):  # type: ignore[misc]
            def handle_management_operation(self, *a: Any, **k: Any) -> None:
                agente.pedidos += 1
                super().handle_management_operation(*a, **k)

        class Lote(cmdrsp.BulkCommandResponder):  # type: ignore[misc]
            def handle_management_operation(self, *a: Any, **k: Any) -> None:
                agente.pedidos += 1
                super().handle_management_operation(*a, **k)

        Obter(motor, contexto)
        Lote(motor, contexto)
        try:
            yield porta
        finally:
            motor.close_dispatcher()
