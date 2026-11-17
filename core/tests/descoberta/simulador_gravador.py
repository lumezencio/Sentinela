"""Simulador mínimo de um gravador (NVR/DVR) HTTP com autenticação Digest, para os testes.

Servidor asyncio HTTP/1.1 em 127.0.0.1, TLS opcional (certificado autoassinado gerado no
teste), rotas fixas com respostas sintetizadas (``tests/fixtures/gravadores``). Implementa só
o necessário: GET, Digest MD5 com ``qop=auth`` (RFC 7616), ``Content-Length`` e keep-alive.
"""

import asyncio
import hashlib
import re
import secrets
import ssl
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import unquote

from .simulador_routeros import CertificadoTeste

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "gravadores"
USUARIO = "leitor"
SENHA = "senha-gravador-1"
REINO = "Sentinela-Teste"

_PARAM = re.compile(r'(\w+)=(?:"([^"]*)"|([^,\s]*))')


def fixture(nome: str) -> bytes:
    return (FIXTURES / nome).read_bytes()


@dataclass
class Resposta:
    status: int = 200
    corpo: bytes = b""
    cabecalhos: dict[str, str] = field(default_factory=dict)


def _md5(texto: str) -> str:
    return hashlib.md5(texto.encode()).hexdigest()  # noqa: S324 - Digest MD5 do protocolo


@dataclass
class SimuladorGravador:
    rotas: dict[str, bytes | Resposta]
    usuario: str = USUARIO
    senha: str = SENHA
    certificado: CertificadoTeste | None = None
    fechar_apos_desafio: bool = False
    recebidos: list[tuple[str, bool]] = field(default_factory=list)  # (alvo, autenticado)
    _nonce: str = field(default_factory=lambda: secrets.token_hex(16))

    def _autenticado(self, metodo: str, alvo: str, cabecalho: str | None) -> bool:
        if not cabecalho or not cabecalho.lower().startswith("digest "):
            return False
        p: dict[str, str] = {}
        for m in _PARAM.finditer(cabecalho[7:]):
            p[m.group(1)] = m.group(2) if m.group(2) is not None else m.group(3)
        if p.get("username") != self.usuario or p.get("nonce") != self._nonce:
            return False
        if p.get("uri") != alvo or p.get("realm") != REINO:
            return False
        ha1 = _md5(f"{self.usuario}:{REINO}:{self.senha}")
        ha2 = _md5(f"{metodo}:{alvo}")
        esperado = _md5(f"{ha1}:{self._nonce}:{p.get('nc')}:{p.get('cnonce')}:auth:{ha2}")
        return secrets.compare_digest(esperado, p.get("response", ""))

    def _responder(self, metodo: str, alvo: str, cabecalhos: dict[str, str]) -> Resposta:
        autenticado = self._autenticado(metodo, alvo, cabecalhos.get("authorization"))
        self.recebidos.append((unquote(alvo), autenticado))
        if not autenticado:
            desafio = f'Digest realm="{REINO}", nonce="{self._nonce}", qop="auth", algorithm=MD5'
            return Resposta(401, b"<html>401 Unauthorized</html>", {"WWW-Authenticate": desafio})
        rota = self.rotas.get(unquote(alvo))
        if rota is None:
            return Resposta(404, b"Error\r\nNot Found!\r\n")
        return rota if isinstance(rota, Resposta) else Resposta(200, rota)

    async def _tratar(self, r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        try:
            while True:
                try:
                    bruto = await r.readuntil(b"\r\n\r\n")
                except (asyncio.IncompleteReadError, asyncio.LimitOverrunError):
                    break
                linhas = bruto.decode("latin-1").split("\r\n")
                metodo, alvo, _ = linhas[0].split(" ", 2)
                cabecalhos: dict[str, str] = {}
                for linha in linhas[1:]:
                    if ":" in linha:
                        k, v = linha.split(":", 1)
                        cabecalhos[k.strip().lower()] = v.strip()
                resp = self._responder(metodo, alvo, cabecalhos)
                fechar = resp.status == 401 and self.fechar_apos_desafio
                extra = "".join(f"{k}: {v}\r\n" for k, v in resp.cabecalhos.items())
                if "Content-Length" not in resp.cabecalhos:
                    extra += f"Content-Length: {len(resp.corpo)}\r\n"
                if fechar:
                    extra += "Connection: close\r\n"
                w.write(f"HTTP/1.1 {resp.status} X\r\n{extra}\r\n".encode() + resp.corpo)
                await w.drain()
                if fechar:
                    break
        except (ConnectionError, ssl.SSLError):
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

    def alvos(self) -> list[str]:
        return [a for a, _ in self.recebidos]
