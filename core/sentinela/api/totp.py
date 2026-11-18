"""Ativação do segundo fator (TOTP) pelo próprio usuário.

Todas as rotas usam ``@permite_restrita``: o administrador sem TOTP, com a política ligada,
só consegue chegar aqui. O segredo e os códigos de recuperação só saem nas respostas de
``iniciar`` (chave, para digitar à mão) e ``confirmar`` (códigos, uma única vez); nunca em log,
auditoria ou erro.
"""

import logging
import math

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError

from sentinela.api.auth import (
    MSG_CODIGO,
    MSG_INVALIDO,
    devolver_reserva,
    exigir_json,
    reservar_falha,
)
from sentinela.api.comum import auditar
from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc, permite_restrita
from sentinela.db.modelos import Usuario
from sentinela.seguranca import recuperacao, totp
from sentinela.seguranca.bloqueio import LimitadorIP
from sentinela.seguranca.senhas import SENHA_MAXIMA, verificar_async

router = APIRouter(prefix="/api/v1/auth/totp", tags=["totp"])
log = logging.getLogger("sentinela.totp")

URL_QR = "/api/v1/auth/totp/qr"
MSG_MUITAS = "Muitas tentativas. Aguarde e tente novamente."
MSG_JA_ATIVO = "O segundo fator já está ativo."
MSG_NADA_PENDENTE = "Inicie a ativação primeiro."


class Senha(BaseModel):
    model_config = ConfigDict(extra="forbid")

    senha: str = Field(min_length=1, max_length=SENHA_MAXIMA)


class Codigo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: str = Field(min_length=1, max_length=16)


class Iniciado(BaseModel):
    chave: str
    qr_url: str


class Ativado(BaseModel):
    codigos: list[str]


def _muitas(espera_s: float) -> HTTPException:
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        detail=MSG_MUITAS,
        headers={"Retry-After": str(max(1, math.ceil(espera_s)))},
    )


def _limitar(request: Request, usuario: Usuario) -> None:
    limitador: LimitadorIP = request.app.state.taxa_totp
    espera = limitador.reservar(f"usuario:{usuario.id}")
    if espera:
        raise _muitas(espera)


def _agrupar(segredo: str) -> str:
    return " ".join(segredo[i : i + 4] for i in range(0, len(segredo), 4))


@router.post("/iniciar", dependencies=[Depends(exigir_json)])
@permite_restrita
async def iniciar(corpo: Senha, request: Request, usuario: UsuarioAtual, db: SessaoDB) -> Iniciado:
    """Gera um segredo novo (pendente) depois de pedir a senha de novo.

    Senha errada conta no bloqueio como o login (mesma reserva e mesma escala)."""
    if totp.totp_ativo(usuario):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=MSG_JA_ATIVO)
    ip = request.client.host if request.client else "desconhecido"
    falhas_ip: LimitadorIP = request.app.state.falhas_ip
    espera = falhas_ip.reservar(ip)
    if espera:
        raise _muitas(espera)
    agora = agora_utc()
    linha = await reservar_falha(db, Usuario.id == usuario.id, agora)
    if linha is None:
        await db.rollback()
        raise _muitas(1)
    if not await verificar_async(linha.hash_senha, corpo.senha):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=MSG_INVALIDO)
    falhas_ip.liberar(ip)
    segredo = totp.novo_segredo()
    await db.execute(
        update(Usuario)
        .where(Usuario.id == usuario.id, Usuario.totp_ultimo_contador.is_(None))
        .values(totp_cifrado=totp.cifrar_segredo(request.app.state.cofre, segredo))
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    await devolver_reserva(db, usuario.id)
    return Iniciado(chave=_agrupar(segredo), qr_url=URL_QR)


@router.get("/qr")
@permite_restrita
async def qr(request: Request, usuario: UsuarioAtual) -> Response:
    if not totp.totp_pendente(usuario):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Não encontrado.")
    segredo = totp.decifrar_segredo(request.app.state.cofre, usuario.totp_cifrado)
    if segredo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Não encontrado.")
    svg = totp.qr_svg(totp.uri(segredo, usuario.login))
    return Response(
        svg,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
            "Content-Security-Policy": "default-src 'none'; style-src 'none'",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/confirmar", dependencies=[Depends(exigir_json)])
@permite_restrita
async def confirmar(
    corpo: Codigo, request: Request, usuario: UsuarioAtual, db: SessaoDB
) -> JSONResponse:
    """Confere o primeiro código; só então ativa, grava o contador aceito e emite os 10
    códigos de recuperação (única vez)."""
    _limitar(request, usuario)
    if totp.totp_ativo(usuario):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=MSG_JA_ATIVO)
    if not totp.totp_pendente(usuario):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=MSG_NADA_PENDENTE)
    segredo = totp.decifrar_segredo(request.app.state.cofre, usuario.totp_cifrado)
    agora = agora_utc()
    contador = totp.conferir(segredo, corpo.codigo, agora, None) if segredo else None
    if contador is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=MSG_CODIGO)
    try:
        # só um confirmar ativa (o segundo, simultâneo, não casa a condição)
        res = await db.execute(
            update(Usuario)
            .where(
                Usuario.id == usuario.id,
                Usuario.totp_cifrado == usuario.totp_cifrado,
                Usuario.totp_ultimo_contador.is_(None),
            )
            .values(totp_ultimo_contador=contador)
            .execution_options(synchronize_session=False)
        )
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=MSG_CODIGO) from None
    if res.rowcount != 1:  # type: ignore[attr-defined]
        raise HTTPException(status.HTTP_409_CONFLICT, detail=MSG_JA_ATIVO)
    codigos = await recuperacao.emitir(db, usuario.id, agora)
    auditar(db, request, usuario, "totp.ativar", f"usuario:{usuario.id}")
    await db.commit()
    log.info("segundo fator ativado", extra={"evento": "totp.ativar"})
    return JSONResponse(
        Ativado(codigos=codigos).model_dump(), headers={"Cache-Control": "no-store"}
    )
