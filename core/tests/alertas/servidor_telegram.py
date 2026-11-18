"""Telegram falso para os testes: HTTPS em 127.0.0.1 com certificado de ``api.telegram.org``
assinado por uma CA de teste (gerada na hora, nunca confiada pelo sistema).

Registra o SNI recebido, o cabeçalho ``Host``, o caminho e o JSON de cada pedido, e responde o
que o teste programar (por padrão, ``200`` com ``message_id`` crescente). Tokens e chats
usados nos testes são fictícios (repositório público).
"""

import asyncio
import datetime as dt
import json
import ssl
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

HOST_TELEGRAM = "api.telegram.org"
LIMITE_CABECALHO = 16 * 1024


@dataclass(frozen=True)
class CertificadosTeste:
    ca_pem: Path
    cert_pem: Path
    chave_pem: Path


def _nome(cn: str) -> x509.Name:
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)])


def _gravar_chave(caminho: Path, chave: ec.EllipticCurvePrivateKey) -> None:
    caminho.write_bytes(
        chave.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )


def gerar_certificados(pasta: Path, host: str = HOST_TELEGRAM) -> CertificadosTeste:
    """CA de teste + certificado de servidor para ``host`` (SAN DNS) assinado por ela."""
    agora = dt.datetime.now(dt.UTC)
    chave_ca = ec.generate_private_key(ec.SECP256R1())
    ca = (
        x509.CertificateBuilder()
        .subject_name(_nome("CA de teste do Sentinela"))
        .issuer_name(_nome("CA de teste do Sentinela"))
        .public_key(chave_ca.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(agora - dt.timedelta(minutes=5))
        .not_valid_after(agora + dt.timedelta(days=1))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(
            x509.SubjectKeyIdentifier.from_public_key(chave_ca.public_key()), critical=False
        )
        .sign(chave_ca, hashes.SHA256())
    )
    chave = ec.generate_private_key(ec.SECP256R1())
    cert = (
        x509.CertificateBuilder()
        .subject_name(_nome(host))
        .issuer_name(ca.subject)
        .public_key(chave.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(agora - dt.timedelta(minutes=5))
        .not_valid_after(agora + dt.timedelta(days=1))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName(host)]), critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.ExtendedKeyUsage([x509.oid.ExtendedKeyUsageOID.SERVER_AUTH]), critical=False
        )
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(chave_ca.public_key()),
            critical=False,
        )
        .sign(chave_ca, hashes.SHA256())
    )
    ca_pem = pasta / "ca-teste.pem"
    cert_pem = pasta / f"{host}.crt"
    chave_pem = pasta / f"{host}.key"
    ca_pem.write_bytes(ca.public_bytes(serialization.Encoding.PEM))
    cert_pem.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    _gravar_chave(chave_pem, chave)
    return CertificadosTeste(ca_pem, cert_pem, chave_pem)


@dataclass
class Pedido:
    sni: str | None
    host: str | None
    metodo: str
    caminho: str
    json: dict[str, Any] | None


@dataclass
class Resposta:
    status: int = 200
    corpo: dict[str, Any] | None = None
    cabecalhos: dict[str, str] = field(default_factory=dict)


@dataclass
class ServidorTelegram:
    certificados: CertificadosTeste
    # respostas programadas em ordem; vazio: 200 com ``message_id`` crescente
    respostas: list[Resposta] = field(default_factory=list)
    pedidos: list[Pedido] = field(default_factory=list)
    snis: list[str | None] = field(default_factory=list)
    conexoes: int = 0
    _proximo_id: int = 100

    def _resposta(self) -> Resposta:
        if self.respostas:
            return self.respostas.pop(0)
        self._proximo_id += 1
        return Resposta(corpo={"ok": True, "result": {"message_id": self._proximo_id}})

    async def _tratar(self, r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        self.conexoes += 1
        sni = self.snis[-1] if self.snis else None  # um pedido por conexão, em sequência
        try:
            bruto = await r.readuntil(b"\r\n\r\n")
            if len(bruto) > LIMITE_CABECALHO:
                return
            linhas = bruto.decode("latin-1").split("\r\n")
            metodo, caminho, _ = linhas[0].split(" ", 2)
            cabecalhos = {
                k.strip().lower(): v.strip()
                for k, _, v in (linha.partition(":") for linha in linhas[1:] if linha)
            }
            tamanho = int(cabecalhos.get("content-length", "0"))
            corpo = await r.readexactly(tamanho) if tamanho else b""
            self.pedidos.append(
                Pedido(
                    sni=sni,
                    host=cabecalhos.get("host"),
                    metodo=metodo,
                    caminho=caminho,
                    json=json.loads(corpo) if corpo else None,
                )
            )
            resp = self._resposta()
            dados = json.dumps(resp.corpo or {}).encode()
            extras = "".join(f"{k}: {v}\r\n" for k, v in resp.cabecalhos.items())
            w.write(
                f"HTTP/1.1 {resp.status} X\r\nContent-Type: application/json\r\n"
                f"Content-Length: {len(dados)}\r\nConnection: close\r\n{extras}\r\n".encode()
                + dados
            )
            await w.drain()
        except (ConnectionError, ssl.SSLError, asyncio.IncompleteReadError, ValueError):
            pass
        finally:
            w.close()

    @asynccontextmanager
    async def rodando(self, host: str = "127.0.0.1", porta: int = 0) -> AsyncIterator[int]:
        contexto = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        contexto.load_cert_chain(self.certificados.cert_pem, self.certificados.chave_pem)

        def anotar_sni(_objeto: object, nome: str | None, _ctx: ssl.SSLContext) -> None:
            self.snis.append(nome)

        contexto.sni_callback = anotar_sni  # type: ignore[assignment]
        srv = await asyncio.start_server(self._tratar, host, porta, ssl=contexto)
        try:
            yield srv.sockets[0].getsockname()[1]
        finally:
            srv.close()
            await srv.wait_closed()


def resolver_fixo(*ips: str) -> Any:
    """Resolver falso: devolve sempre os IPs dados e conta as chamadas."""
    chamadas: list[str] = []

    async def resolver(host: str) -> list[str]:
        chamadas.append(host)
        return list(ips)

    resolver.chamadas = chamadas  # type: ignore[attr-defined]
    return resolver
