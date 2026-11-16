from fastapi import FastAPI

from sentinela.api import saude
from sentinela.config import Settings, obter_settings


def criar_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or obter_settings()
    producao = settings.ambiente == "producao"
    app = FastAPI(
        title="Sentinela",
        docs_url=None if producao else "/docs",
        redoc_url=None if producao else "/redoc",
        openapi_url=None if producao else "/openapi.json",
    )
    app.state.settings = settings
    app.include_router(saude.router)
    return app
