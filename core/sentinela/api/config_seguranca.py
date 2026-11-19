"""Política de segurança (admin): exigir segundo fator para administradores."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, StrictBool

from sentinela.api.comum import auditar
from sentinela.api.deps import SessaoDB, exigir_admin
from sentinela.db.modelos import Usuario
from sentinela.seguranca.politica import definir_exigir_totp_admin, exigir_totp_admin

router = APIRouter(prefix="/api/v1/config/seguranca", tags=["config"])
Admin = Annotated[Usuario, Depends(exigir_admin)]


class SegurancaEdicao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exigir_totp_admin: StrictBool


class SegurancaSaida(BaseModel):
    exigir_totp_admin: bool


@router.get("")
async def ver(db: SessaoDB, _admin: Admin) -> SegurancaSaida:
    return SegurancaSaida(exigir_totp_admin=await exigir_totp_admin(db))


@router.patch("")
async def editar(
    edicao: SegurancaEdicao, request: Request, db: SessaoDB, admin: Admin
) -> SegurancaSaida:
    antes = await exigir_totp_admin(db)
    await definir_exigir_totp_admin(db, edicao.exigir_totp_admin)
    auditar(
        db,
        request,
        admin,
        "config.seguranca",
        "seguranca",
        {"exigir_totp_admin": antes},
        {"exigir_totp_admin": edicao.exigir_totp_admin},
    )
    await db.commit()
    request.app.state.politica_totp = edicao.exigir_totp_admin
    return SegurancaSaida(exigir_totp_admin=edicao.exigir_totp_admin)
