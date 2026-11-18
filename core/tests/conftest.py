import secrets
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Protocol

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.config import Settings
from sentinela.db.base import Base
from sentinela.db.modelos import Usuario
from sentinela.db.sessao import criar_motor
from sentinela.main import criar_app
from sentinela.relogio import RelogioFalso
from sentinela.seguranca.senhas import gerar_hash
from tests.apoio_totp import Tempo

SENHA_TESTE = "senha-de-teste-longa-1"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'teste.db'}",
        chave_sessao="chave-de-teste-nao-secreta",
        chave_credenciais=secrets.token_hex(32),
    )


@pytest.fixture
def relogio() -> RelogioFalso:
    return RelogioFalso()


@pytest.fixture
def app(settings: Settings, relogio: RelogioFalso) -> FastAPI:
    # laços do monitor desligados: nenhum teste de API dispara sonda de rede real
    return criar_app(settings, relogio=relogio, iniciar_monitor=False)


async def criar_esquema(banco_url: str) -> None:
    """Em produção o esquema vem do `alembic upgrade head`; nos testes, do metadata."""
    motor = criar_motor(banco_url)
    try:
        async with motor.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    finally:
        await motor.dispose()


@pytest.fixture
async def cliente(app: FastAPI, settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    await criar_esquema(settings.banco_url)
    async with app.router.lifespan_context(app):
        transporte = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as c:
            yield c


class CriarUsuario(Protocol):
    async def __call__(self, login: str, senha: str, papel: str = ...) -> Usuario: ...


@pytest.fixture
def criar_usuario(app: FastAPI) -> CriarUsuario:
    """Cria usuário direto no banco (exige o `cliente` ativo, que roda o lifespan)."""

    async def _criar(login: str, senha: str, papel: str = "visualizador") -> Usuario:
        sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
        async with sessoes() as db:
            usuario = Usuario(login=login, hash_senha=gerar_hash(senha), papel=papel)
            db.add(usuario)
            await db.commit()
            return usuario

    return _criar


async def _entrar(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario, login: str, papel: str
) -> httpx.AsyncClient:
    """Loga e passa a enviar o ``X-CSRF`` em toda requisição do cliente."""
    await criar_usuario(login, SENHA_TESTE, papel)
    r = await cliente.post("/api/v1/auth/login", json={"login": login, "senha": SENHA_TESTE})
    assert r.status_code == 204
    cliente.headers["X-CSRF"] = cliente.cookies["sentinela_csrf"]
    return cliente


@pytest.fixture
async def cliente_admin(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> httpx.AsyncClient:
    return await _entrar(cliente, criar_usuario, "admin-teste", "admin")


@pytest.fixture
async def cliente_visualizador(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> httpx.AsyncClient:
    return await _entrar(cliente, criar_usuario, "visual-teste", "visualizador")


@pytest.fixture
def tempo(monkeypatch: pytest.MonkeyPatch) -> Tempo:
    """Relógio de parede falso para o login em duas etapas (código TOTP e validade da etapa)."""
    t = Tempo()
    monkeypatch.setattr("sentinela.api.auth.agora_utc", t)
    monkeypatch.setattr("sentinela.api.totp.agora_utc", t)
    return t
