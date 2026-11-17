"""Simulador mínimo de um MikroTik (API RouterOS) para os testes.

Servidor asyncio do protocolo API em 127.0.0.1, com TLS opcional (certificado autoassinado
gerado no teste), usuários/grupos e tabelas configuráveis. Dados só de 10.99.x e MACs
``02:00:00:…`` (repositório público).
"""

import asyncio
import datetime as dt
import hashlib
import ssl
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

from sentinela.descoberta.fontes.mikrotik_api import (
    ErroRouterOS,
    codificar_sentenca,
    ler_sentenca,
)

GRUPO_READ = "local,telnet,ssh,reboot,read,test,winbox,web,sniff,api,!write,!policy,!sensitive"
GRUPO_FULL = "local,telnet,ssh,ftp,reboot,read,write,policy,test,winbox,password,web,api"

TABELAS_V7: dict[str, list[dict[str, str]]] = {
    "/ip/arp/print": [
        {"address": "10.99.0.10", "mac-address": "02:00:00:aa:00:10", "interface": "bridge"},
        {"address": "10.99.0.11", "interface": "bridge"},  # incompleto, sem MAC
    ],
    "/ip/dhcp-server/lease/print": [
        {
            "address": "10.99.0.20",
            "mac-address": "02:00:00:aa:00:20",
            "host-name": "cam-portaria\x1b[0m",
            "status": "bound",
        },
    ],
    "/ip/neighbor/print": [
        {
            "address": "10.99.0.2",
            "mac-address": "02:00:00:aa:00:02",
            "identity": "sw-andar-1",
            "platform": "MikroTik",
            "board": "CRS326",
            "version": "7.16.2",
            "interface": "ether2",
        },
    ],
    "/interface/wifi/registration-table/print": [
        {"mac-address": "02:00:00:aa:00:30", "interface": "wifi1", "signal": "-61"},
    ],
}

TABELAS_V6: dict[str, list[dict[str, str]]] = {
    **{k: v for k, v in TABELAS_V7.items() if not k.startswith("/interface/wifi")},
    "/interface/wireless/registration-table/print": [
        {
            "mac-address": "02:00:00:aa:00:40",
            "interface": "wlan1",
            "last-ip": "10.99.0.40",
            "signal-strength": "-70dBm@6Mbps",
        },
    ],
}


@dataclass
class CertificadoTeste:
    cert_pem: Path
    chave_pem: Path
    impressao: str


def gerar_certificado(pasta: Path, nome: str = "sim-routeros") -> CertificadoTeste:
    chave = ec.generate_private_key(ec.SECP256R1())
    sujeito = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, nome)])
    agora = dt.datetime.now(dt.UTC)
    cert = (
        x509.CertificateBuilder()
        .subject_name(sujeito)
        .issuer_name(sujeito)
        .public_key(chave.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(agora - dt.timedelta(minutes=5))
        .not_valid_after(agora + dt.timedelta(days=1))
        .sign(chave, hashes.SHA256())
    )
    cert_pem = pasta / f"{nome}.crt"
    chave_pem = pasta / f"{nome}.key"
    cert_pem.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    chave_pem.write_bytes(
        chave.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    der = cert.public_bytes(serialization.Encoding.DER)
    return CertificadoTeste(cert_pem, chave_pem, hashlib.sha256(der).hexdigest())


@dataclass
class SimuladorRouterOS:
    versao: str = "7.16.2 (stable)"
    identidade: str = "rb-sede"
    usuarios: dict[str, tuple[str, str]] = field(
        default_factory=lambda: {"leitor": ("senha-leitor-1", "somente-leitura")}
    )
    grupos: dict[str, str] = field(
        default_factory=lambda: {"somente-leitura": GRUPO_READ, "full": GRUPO_FULL}
    )
    tabelas: dict[str, list[dict[str, str]]] = field(default_factory=lambda: dict(TABELAS_V7))
    login_antigo: bool = False
    ignorar_proplist: bool = False  # aparelho hostil: devolve todas as colunas
    certificado: CertificadoTeste | None = None
    recebidos: list[list[str]] = field(default_factory=list)

    def _tabela(self, comando: str) -> list[dict[str, str]] | None:
        if comando == "/system/identity/print":
            return [{"name": self.identidade}]
        if comando == "/system/resource/print":
            return [{"version": self.versao, "board-name": "RB5009"}]
        if comando == "/user/print":
            return [{"name": n, "group": g} for n, (_, g) in self.usuarios.items()]
        if comando == "/user/group/print":
            return [{"name": n, "policy": p} for n, p in self.grupos.items()]
        return self.tabelas.get(comando)

    def _responder(self, palavras: list[str], autenticado: bool) -> tuple[bytes, bool]:
        comando, *resto = palavras
        if comando == "/login":
            if self.login_antigo:
                return codificar_sentenca(["!done", "=ret=0123456789abcdef"]), False
            args = dict(p[1:].split("=", 1) for p in resto if p.startswith("="))
            usuario = self.usuarios.get(args.get("name", ""))
            if usuario is None or usuario[0] != args.get("password"):
                trap = ["!trap", "=message=invalid user name or password (6)"]
                return codificar_sentenca(trap) + codificar_sentenca(["!done"]), False
            return codificar_sentenca(["!done"]), True
        if not autenticado:
            return codificar_sentenca(["!fatal", "not logged in"]), False
        linhas = self._tabela(comando)
        if linhas is None:
            trap = ["!trap", "=message=no such command prefix"]
            return codificar_sentenca(trap) + codificar_sentenca(["!done"]), True
        filtros = [p[1:].split("=", 1) for p in resto if p.startswith("?")]
        proplist: list[str] | None = None
        for p in resto:
            if p.startswith("=.proplist=") and not self.ignorar_proplist:
                proplist = p.split("=", 2)[2].split(",")
        saida = b""
        for linha in linhas:
            if any(linha.get(k) != v for k, v in filtros):
                continue
            campos = {k: v for k, v in linha.items() if proplist is None or k in proplist}
            saida += codificar_sentenca(["!re", *(f"={k}={v}" for k, v in campos.items())])
        return saida + codificar_sentenca(["!done"]), True

    async def _tratar(self, r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        autenticado = False
        try:
            while True:
                palavras = await ler_sentenca(r)
                self.recebidos.append(palavras)
                resposta, autenticado = self._responder(palavras, autenticado)
                w.write(resposta)
                await w.drain()
                if resposta.startswith(codificar_sentenca(["!fatal"])[:7]):
                    break
        except (ErroRouterOS, ConnectionError, ssl.SSLError):
            pass
        finally:
            w.close()

    @asynccontextmanager
    async def rodando(self) -> AsyncIterator[int]:
        contexto: ssl.SSLContext | None = None
        if self.certificado is not None:
            contexto = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            contexto.load_cert_chain(self.certificado.cert_pem, self.certificado.chave_pem)
        srv = await asyncio.start_server(self._tratar, "127.0.0.1", 0, ssl=contexto)
        try:
            yield srv.sockets[0].getsockname()[1]
        finally:
            srv.close()
            await srv.wait_closed()

    def comandos(self) -> list[str]:
        return [p[0] for p in self.recebidos]
