"""Saúde do processo: 503 quando o monitor está ligado e um laço dele parou."""

import asyncio
import logging
from typing import Literal

from fastapi import APIRouter, FastAPI, Request, Response, status
from sqlalchemy import select

from sentinela import __version__
from sentinela.api.deps import agora_utc
from sentinela.config import pasta_dados
from sentinela.db.modelos import Usuario
from sentinela.seguranca import instalacao

log = logging.getLogger("sentinela.saude")

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


async def primeiro_acesso(request: Request) -> Literal["ativo", "expirado"] | None:
    """``"ativo"``: sem usuário e com código de instalação válido; ``"expirado"``: sem usuário e
    com o código vencido ou ausente (instalação pendente); ``None`` em qualquer outro caso
    (há usuário, demonstração ou falha ao consultar: a saúde nunca depende disto)."""
    try:
        settings = request.app.state.settings
        if settings.demo:
            return None
        estado = instalacao.estado(pasta_dados(settings), agora_utc())
        async with request.app.state.sessoes() as db:
            if await db.scalar(select(Usuario.id).limit(1)) is not None:
                return None
        return "ativo" if estado == "ativo" else "expirado"
    except Exception as e:  # saúde não pode falhar por isto
        log.debug("primeiro_acesso indeterminado: %s", type(e).__name__)
        return None


@router.get("/saude")
async def saude(request: Request, response: Response) -> dict[str, str | None]:
    """200 ``ok`` com a versão e ``primeiro_acesso`` (``"ativo"``/``"expirado"``/``null``, só
    enquanto não há usuário; a tela de login o usa para redirecionar ou avisar);
    503 ``degradado`` (sem detalhes ao cliente) se o monitor parou."""
    if monitor_degradado(request.app):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degradado"}
    return {
        "status": "ok",
        "versao": __version__,
        "primeiro_acesso": await primeiro_acesso(request),
    }
