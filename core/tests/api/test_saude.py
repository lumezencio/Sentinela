import re

import httpx

import sentinela
from sentinela.config import Settings
from sentinela.main import criar_app


async def test_saude_responde_ok(cliente: httpx.AsyncClient) -> None:
    resposta = await cliente.get("/api/v1/saude")
    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok", "versao": sentinela.__version__}


async def test_saude_so_expoe_status_e_versao(cliente: httpx.AsyncClient) -> None:
    corpo = (await cliente.get("/api/v1/saude")).json()
    assert set(corpo) == {"status", "versao"}
    assert re.fullmatch(r"\d+\.\d+\.\d+", corpo["versao"])


async def test_docs_fechados_em_producao(settings: Settings) -> None:
    app = criar_app(settings.model_copy(update={"ambiente": "producao"}))
    transporte = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as c:
        for caminho in ("/docs", "/redoc", "/openapi.json"):
            assert (await c.get(caminho)).status_code == 404
