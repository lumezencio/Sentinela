from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from sentinela.api import auth, saude
from sentinela.config import Settings, obter_settings
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.relogio import Relogio, RelogioReal
from sentinela.seguranca.bloqueio import BloqueioFantasma, LimitadorIP


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI) -> AsyncIterator[None]:
    """Recursos de longa duração do processo.

    O esquema do banco NÃO é criado aqui: em produção roda ``alembic upgrade head``
    antes do uvicorn. Novos recursos entram entre a criação do motor e o ``yield``.
    """
    settings: Settings = app.state.settings
    motor = criar_motor(settings.banco_url)
    app.state.motor = motor
    app.state.sessoes = fabrica_sessao(motor)
    try:
        async with app.state.sessoes() as db:
            await semear_classes(db)
        yield
    finally:
        await motor.dispose()


def criar_app(settings: Settings | None = None, *, relogio: Relogio | None = None) -> FastAPI:
    settings = settings or obter_settings()
    relogio = relogio or RelogioReal()
    producao = settings.ambiente == "producao"
    app = FastAPI(
        title="Sentinela",
        docs_url=None if producao else "/docs",
        redoc_url=None if producao else "/redoc",
        openapi_url=None if producao else "/openapi.json",
        lifespan=ciclo_de_vida,
    )
    app.state.settings = settings
    app.state.relogio = relogio
    app.state.falhas_ip = LimitadorIP(relogio)
    app.state.falhas_fantasma = BloqueioFantasma(relogio)
    app.include_router(saude.router)
    app.include_router(auth.router)
    return app
