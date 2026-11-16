from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

from sentinela.config import Settings
from sentinela.db.base import Base
from sentinela.db.sessao import criar_motor
from sentinela.main import criar_app
from sentinela.relogio import RelogioFalso


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'teste.db'}",
        chave_sessao="chave-de-teste-nao-secreta",
    )


@pytest.fixture
def relogio() -> RelogioFalso:
    return RelogioFalso()


@pytest.fixture
def app(settings: Settings, relogio: RelogioFalso) -> FastAPI:
    return criar_app(settings, relogio=relogio)


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
