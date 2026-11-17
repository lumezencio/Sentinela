"""Fixtures do smoke de front (R6).

Sem ``SENTINELA_URL_SMOKE``: sobe um uvicorn real em HTTPS (certificado autoassinado
descartável) em 127.0.0.1 com banco SQLite temporário, modo demonstração e um admin; o
``web/src`` é servido como estático NA MESMA ORIGEM só aqui, nunca no código de produção.

Fase 3: o modo demonstração já semeia as três fontes simuladas (MikroTik, switch SNMP e
gravador de 16 canais, todas em 10.99.x) e o orquestrador as coleta ao subir, então a fila de
Novos chega com ~40 descobertas sem nenhum pacote na rede. ``alvo_fila_grande`` sobe um
segundo core (sem demonstração) com 2.000 descobertas pendentes semeadas no banco.

Com ``SENTINELA_URL_SMOKE``: usa a URL dada (compose) e as credenciais de
``SENTINELA_SMOKE_LOGIN``/``SENTINELA_SMOKE_SENHA``; derrubar/levantar o core vira
``docker compose stop/start core`` SÓ se a URL for local (localhost/127.0.0.1) e
``SENTINELA_SMOKE_COMPOSE_LOCAL=1``; fora disso o cenário de queda é pulado (nunca mexe
em containers de outra máquina ou de outro projeto).
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
from urllib.parse import urlsplit

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
    # usuário com papel "visualizador" (opcional contra o compose)
    login_leitor: str = ""
    senha_leitor: str = ""


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


async def _preparar_banco(
    banco_url: str,
    login: str,
    senha: str,
    leitor: tuple[str, str] | None = None,
    descobertas: int = 0,
) -> None:
    from sentinela.db.base import Base
    from sentinela.db.modelos import Descoberta, Usuario
    from sentinela.db.sessao import criar_motor, fabrica_sessao
    from sentinela.seguranca.senhas import gerar_hash

    motor = criar_motor(banco_url)
    try:
        async with motor.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with fabrica_sessao(motor)() as db:
            db.add(Usuario(login=login, hash_senha=gerar_hash(senha), papel="admin"))
            if leitor:
                db.add(
                    Usuario(login=leitor[0], hash_senha=gerar_hash(leitor[1]), papel="visualizador")
                )
            agora = dt.datetime.now(dt.UTC)
            for n in range(descobertas):  # fila grande sintética: 10.99.x, MAC 02:00:00:…
                db.add(
                    Descoberta(
                        chave=f"02:00:00:fc:{n // 256:02x}:{n % 256:02x}",
                        ip=f"10.99.{100 + n // 250}.{n % 250 + 1}",
                        mac=f"02:00:00:fc:{n // 256:02x}:{n % 256:02x}",
                        nome_sugerido=f"aparelho-{n:04d}",
                        classe_sugerida="iot",
                        confianca=0.6,
                        sinais={"motivos": [{"descricao": "Nome DHCP", "pontos": {"iot": 60}}]},
                        origens=[{"origem": "dhcp", "fonte_id": None}],
                        status="pendente",
                        fora_das_subredes=True,
                        primeira_vez=agora - dt.timedelta(seconds=n),
                        ultima_vez=agora,
                    )
                )
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

    def __init__(
        self, banco_url: str, porta: int, chave: Path, cert: Path, demo: bool = True
    ) -> None:
        self._banco_url = banco_url
        self._demo = demo
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
            chave_credenciais=secrets.token_hex(32),
            demo=self._demo,
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


class CoreIntocavel:
    """Alvo remoto ou sem autorização explícita: o cenário de queda do core é pulado."""

    MOTIVO = (
        "queda do core no compose exige URL local (localhost/127.0.0.1) e "
        "SENTINELA_SMOKE_COMPOSE_LOCAL=1; cenário pulado"
    )

    def derrubar(self) -> None:
        pytest.skip(self.MOTIVO)

    def levantar(self) -> None:  # pragma: no cover - derrubar já pulou
        pytest.skip(self.MOTIVO)


def _compose_local_autorizado(url: str) -> bool:
    host = urlsplit(url).hostname or ""
    return host in ("localhost", "127.0.0.1") and (
        os.environ.get("SENTINELA_SMOKE_COMPOSE_LOCAL") == "1"
    )


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
            core=CoreCompose() if _compose_local_autorizado(url) else CoreIntocavel(),
            login_leitor=os.environ.get("SENTINELA_SMOKE_LEITOR_LOGIN", ""),
            senha_leitor=os.environ.get("SENTINELA_SMOKE_LEITOR_SENHA", ""),
        )
        return
    pasta = tmp_path_factory.mktemp("smoke")
    banco_url = f"sqlite+aiosqlite:///{(pasta / 'smoke.db').as_posix()}"
    login, senha = "admin", secrets.token_urlsafe(18)
    leitor = ("leitor", secrets.token_urlsafe(18))
    _em_thread(lambda: asyncio.run(_preparar_banco(banco_url, login, senha, leitor)))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco_url, _porta_livre(), chave, cert)
    servidor.levantar()
    try:
        yield Alvo(
            f"https://127.0.0.1:{servidor.porta}", login, senha, servidor, leitor[0], leitor[1]
        )
    finally:
        servidor.derrubar()


@pytest.fixture(scope="session")
def alvo_fila_grande(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Alvo]:
    """Core sem demonstração com 2.000 descobertas pendentes (paginação da aba Novos)."""
    if os.environ.get("SENTINELA_URL_SMOKE"):
        pytest.skip("fila de 2.000 só com o core local do smoke (não mexe no compose)")
    pasta = tmp_path_factory.mktemp("fila")
    banco_url = f"sqlite+aiosqlite:///{(pasta / 'fila.db').as_posix()}"
    login, senha = "admin", secrets.token_urlsafe(18)
    _em_thread(lambda: asyncio.run(_preparar_banco(banco_url, login, senha, descobertas=2000)))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco_url, _porta_livre(), chave, cert, demo=False)
    servidor.levantar()
    try:
        yield Alvo(f"https://127.0.0.1:{servidor.porta}", login, senha, servidor)
    finally:
        servidor.derrubar()


@pytest.fixture(scope="session")
def base_url(alvo: Alvo) -> str:
    """URL do alvo. Substitui o fallback de ``base_url`` do pytest-playwright 0.10, que é um
    método de instância com escopo de sessão (o pytest 9 avisa com PytestRemovedIn10Warning)."""
    return alvo.url


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args: dict[str, Any], alvo: Alvo) -> dict[str, Any]:
    return {**browser_context_args, "ignore_https_errors": True, "base_url": alvo.url}
