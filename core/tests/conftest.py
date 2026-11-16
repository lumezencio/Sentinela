from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

from sentinela.config import Settings
from sentinela.main import criar_app


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'teste.db'}",
        chave_sessao="chave-de-teste-nao-secreta",
    )


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return criar_app(settings)


@pytest.fixture
async def cliente(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transporte = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as c:
        yield c
