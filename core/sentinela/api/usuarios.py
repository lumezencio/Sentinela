"""Usuários (admin): lista e zerar o segundo fator de outro usuário (auditado)."""

import logging
import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import select

from sentinela.api.comum import auditar, nao_encontrado
from sentinela.api.deps import SessaoDB, exigir_admin
from sentinela.db.modelos import Usuario
from sentinela.seguranca.bloqueio import LimitadorIP
from sentinela.seguranca.politica import zerar_totp
from sentinela.seguranca.totp import totp_ativo

router = APIRouter(prefix="/api/v1/usuarios", tags=["usuarios"])
log = logging.getLogger("sentinela.usuarios")
Admin = Annotated[Usuario, Depends(exigir_admin)]
LIMITE = 100
MSG_MUITAS = "Muitas solicitações; aguarde um pouco."


class UsuarioSaida(BaseModel):
    id: int
    login: str
    papel: str
    totp_ativo: bool


@router.get("")
async def listar(db: SessaoDB, _admin: Admin) -> list[UsuarioSaida]:
    linhas = (await db.execute(select(Usuario).order_by(Usuario.id).limit(LIMITE))).scalars()
    return [
        UsuarioSaida(id=u.id, login=u.login, papel=u.papel, totp_ativo=totp_ativo(u))
        for u in linhas
    ]


@router.post(
    "/{usuario_id}/totp/zerar",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def zerar(usuario_id: int, request: Request, db: SessaoDB, admin: Admin) -> Response:
    """Apaga o segundo fator do alvo e revoga as sessões dele; 404 genérico se não existe."""
    limitador: LimitadorIP = request.app.state.taxa_totp
    espera = limitador.reservar(f"usuario:{admin.id}")
    if espera:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=MSG_MUITAS,
            headers={"Retry-After": str(max(1, math.ceil(espera)))},
        )
    alvo = await db.get(Usuario, usuario_id)
    if alvo is None:
        raise nao_encontrado()
    tinha = totp_ativo(alvo)
    await zerar_totp(db, alvo.id)
    auditar(
        db,
        request,
        admin,
        "totp.zerar",
        f"usuario:{alvo.id}",
        {"totp_ativo": tinha},
        {"totp_ativo": False},
    )
    await db.commit()
    log.info("segundo fator zerado", extra={"evento": "totp.zerar", "alvo": alvo.id})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
