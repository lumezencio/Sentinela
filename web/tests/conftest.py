"""Fixtures do smoke de front (R6).

Sem ``SENTINELA_URL_SMOKE``: sobe um uvicorn real em HTTPS (certificado autoassinado
descartável) em 127.0.0.1 com banco SQLite temporário, modo demonstração e um admin; o
``web/src`` é servido como estático NA MESMA ORIGEM só aqui, nunca no código de produção.

Com ``SENTINELA_URL_SMOKE``: usa a URL dada (compose) e as credenciais de
``SENTINELA_SMOKE_LOGIN``/``SENTINELA_SMOKE_SENHA``; derrubar/levantar o core vira
``docker compose stop/start core``.
"""

import asyncio
import datetime as dt
import ipaddress
import os
import secrets
import socket
import subprocess
import threading
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import pytest

RAIZ = Path(__file__).resolve().parents[2]
WEB_SRC = RAIZ / "web" / "src"
# mesma política que o proxy de produção vai enviar: violação vira erro no console
CSP_PRODUCAO = (
    "default-src 'self'; connect-src 'self' wss:; img-src 'self' data:; "
    "style-src 'self'; script-src 'self'; frame-ancestors 'none'"
)


class Core(Protocol):
    def derrubar(self) -> None: ...
    def levantar(self) -> None: ...


@dataclass
class Alvo:
    url: str
    login: str
    senha: str
    core: Core


def _porta_livre() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        porta: int = s.getsockname()[1]
        return porta


def _certificado(pasta: Path) -> tuple[Path, Path]:
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.x509.oid import NameOID

    chave = ec.generate_private_key(ec.SECP256R1())
    nome = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "127.0.0.1")])
    agora = dt.datetime.now(dt.UTC)
    cert = (
        x509.CertificateBuilder()
        .subject_name(nome)
        .issuer_name(nome)
        .public_key(chave.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(agora - dt.timedelta(minutes=5))
        .not_valid_after(agora + dt.timedelta(days=1))
        .add_extension(
            x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]),
            critical=False,
        )
        .sign(chave, hashes.SHA256())
    )
    arq_chave, arq_cert = pasta / "smoke.key", pasta / "smoke.crt"
    arq_chave.write_bytes(
        chave.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    arq_cert.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    return arq_chave, arq_cert


async def _preparar_banco(banco_url: str, login: str, senha: str) -> None:
    from sentinela.db.base import Base
    from sentinela.db.modelos import Usuario
    from sentinela.db.sessao import criar_motor, fabrica_sessao
    from sentinela.seguranca.senhas import gerar_hash

    motor = criar_motor(banco_url)
    try:
        async with motor.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with fabrica_sessao(motor)() as db:
            db.add(Usuario(login=login, hash_senha=gerar_hash(senha), papel="admin"))
            await db.commit()
    finally:
        await motor.dispose()


def _em_thread(funcao: Any) -> None:
    """O Playwright síncrono mantém um laço asyncio na thread principal."""
    falhas: list[BaseException] = []

    def rodar() -> None:
        try:
            funcao()
        except BaseException as e:  # repassa para a thread do teste
            falhas.append(e)

    t = threading.Thread(target=rodar)
    t.start()
    t.join()
    if falhas:
        raise falhas[0]


class ServidorLocal:
    """uvicorn numa thread; ``derrubar``/``levantar`` simulam reiniciar o processo do core."""

    def __init__(self, banco_url: str, porta: int, chave: Path, cert: Path) -> None:
        self._banco_url = banco_url
        self.porta = porta
        self._chave = chave
        self._cert = cert
        self._servidor: Any = None
        self._thread: threading.Thread | None = None

    def _app(self) -> Any:
        from fastapi.staticfiles import StaticFiles
        from starlette.middleware.base import BaseHTTPMiddleware

        from sentinela.config import Settings
        from sentinela.main import criar_app

        settings = Settings(
            ambiente="desenvolvimento",
            banco_url=self._banco_url,
            chave_sessao="chave-do-smoke-nao-secreta",  # noqa: S106 - só teste
            demo=True,
        )
        app = criar_app(settings)

        async def com_csp(request: Any, chamar: Any) -> Any:
            resposta = await chamar(request)
            resposta.headers["Content-Security-Policy"] = CSP_PRODUCAO
            return resposta

        app.add_middleware(BaseHTTPMiddleware, dispatch=com_csp)
        # SÓ NA FIXTURE: em produção o estático vem do container web (nginx)
        app.mount("/", StaticFiles(directory=WEB_SRC, html=True), name="web")
        return app

    def levantar(self) -> None:
        import uvicorn

        config = uvicorn.Config(
            self._app(),
            host="127.0.0.1",
            port=self.porta,
            ssl_keyfile=str(self._chave),
            ssl_certfile=str(self._cert),
            log_level="warning",
            timeout_graceful_shutdown=3,
        )
        self._servidor = uvicorn.Server(config)
        self._thread = threading.Thread(target=self._servidor.run, daemon=True)
        self._thread.start()
        limite = time.monotonic() + 30
        while not self._servidor.started:
            if not self._thread.is_alive() or time.monotonic() > limite:
                raise RuntimeError("uvicorn do smoke não subiu")
            time.sleep(0.05)

    def derrubar(self) -> None:
        if self._servidor is None or self._thread is None:
            return
        self._servidor.should_exit = True
        self._thread.join(timeout=20)
        if self._thread.is_alive():
            raise RuntimeError("uvicorn do smoke não parou")
        self._servidor = None


class CoreCompose:
    def _compose(self, acao: str) -> None:
        subprocess.run(  # noqa: S603 - comando fixo
            ["docker", "compose", acao, "core"],  # noqa: S607
            cwd=RAIZ,
            check=True,
            timeout=120,
        )

    def derrubar(self) -> None:
        self._compose("stop")

    def levantar(self) -> None:
        self._compose("start")


@pytest.fixture(scope="session")
def alvo(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Alvo]:
    url = os.environ.get("SENTINELA_URL_SMOKE")
    if url:
        yield Alvo(
            url=url.rstrip("/"),
            login=os.environ["SENTINELA_SMOKE_LOGIN"],
            senha=os.environ["SENTINELA_SMOKE_SENHA"],
            core=CoreCompose(),
        )
        return
    pasta = tmp_path_factory.mktemp("smoke")
    banco_url = f"sqlite+aiosqlite:///{(pasta / 'smoke.db').as_posix()}"
    login, senha = "admin", secrets.token_urlsafe(18)
    _em_thread(lambda: asyncio.run(_preparar_banco(banco_url, login, senha)))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco_url, _porta_livre(), chave, cert)
    servidor.levantar()
    try:
        yield Alvo(f"https://127.0.0.1:{servidor.porta}", login, senha, servidor)
    finally:
        servidor.derrubar()


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args: dict[str, Any], alvo: Alvo) -> dict[str, Any]:
    return {**browser_context_args, "ignore_https_errors": True, "base_url": alvo.url}
