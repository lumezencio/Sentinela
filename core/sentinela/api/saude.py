"""Saúde do processo: 503 quando o monitor está ligado e um laço dele parou."""

import asyncio

from fastapi import APIRouter, FastAPI, Request, Response, status

from sentinela import __version__

router = APIRouter(prefix="/api/v1", tags=["saude"])


def monitor_degradado(app: FastAPI) -> bool:
    """Com o monitor ligado: algum laço parado (ou não iniciado) é degradação."""
    estado = app.state
    if not getattr(estado, "iniciar_monitor", False):
        return False
    tarefas: list[asyncio.Task[None]] | None = getattr(estado, "tarefas_monitor", None)
    if not tarefas:
        return True
    return bool(getattr(estado, "monitor_falhou", False)) or any(t.done() for t in tarefas)


@router.get("/saude")
async def saude(request: Request, response: Response) -> dict[str, str]:
    """200 ``ok`` com a versão (a tela de login a mostra); 503 ``degradado`` (sem detalhes
    ao cliente) se o monitor parou."""
    if monitor_degradado(request.app):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degradado"}
    return {"status": "ok", "versao": __version__}
