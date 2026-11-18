"""GET /config/geral: ajustes públicos para qualquer usuário logado (hoje, só o fuso)."""

from fastapi import APIRouter, Request

from sentinela.api.deps import UsuarioAtual
from sentinela.api.esquemas_alertas import GeralSaida

router = APIRouter(prefix="/api/v1/config/geral", tags=["config"])


@router.get("", response_model=GeralSaida)
async def ver(request: Request, _usuario: UsuarioAtual) -> GeralSaida:
    return GeralSaida(fuso=request.app.state.settings.fuso)
