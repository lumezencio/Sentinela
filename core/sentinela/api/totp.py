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

from sentinela.api.auth import (
    MSG_CODIGO,
    conferir_senha_da_sessao,
    cookie_de_sessao,
    exigir_json,
    rotacionar_sessao,
)
from sentinela.api.comum import auditar
from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc, permite_restrita
from sentinela.db.modelos import Sessao, Usuario
from sentinela.seguranca import recuperacao, totp
from sentinela.seguranca.bloqueio import LimitadorIP
from sentinela.seguranca.senhas import SENHA_MAXIMA

router = APIRouter(prefix="/api/v1/auth/totp", tags=["totp"])
log = logging.getLogger("sentinela.totp")

URL_QR = "/api/v1/auth/totp/qr"
_SEM_CACHE = {"Cache-Control": "no-store", "Pragma": "no-cache"}
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
async def iniciar(
    corpo: Senha, request: Request, usuario: UsuarioAtual, db: SessaoDB
) -> JSONResponse:
    """Gera um segredo novo (pendente) depois de pedir a senha de novo.

    Senha errada conta no bloqueio como o login (mesma reserva e mesma escala)."""
    if totp.totp_ativo(usuario):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=MSG_JA_ATIVO)
    await conferir_senha_da_sessao(request, db, usuario.id, corpo.senha)
    segredo = totp.novo_segredo()
    await db.execute(
        update(Usuario)
        .where(Usuario.id == usuario.id, Usuario.totp_ultimo_contador.is_(None))
        .values(totp_cifrado=totp.cifrar_segredo(request.app.state.cofre, segredo))
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return JSONResponse(
        Iniciado(chave=_agrupar(segredo), qr_url=URL_QR).model_dump(), headers=_SEM_CACHE
    )


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
    codigos, hashes = await recuperacao.preparar()  # argon2 antes de abrir a escrita
    try:
        # ativação, códigos e auditoria na MESMA transação; só um confirmar ativa
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
        if res.rowcount != 1:  # type: ignore[attr-defined]
            await db.rollback()
            raise HTTPException(status.HTTP_409_CONFLICT, detail=MSG_JA_ATIVO)
        await recuperacao.gravar(db, usuario.id, hashes, agora)
        # quem ativa o segundo fator pode estar desconfiando da senha: as sessões abertas em outro
        # lugar caem (a atual é trocada logo abaixo); tudo na mesma transação da ativação
        await db.execute(
            update(Sessao)
            .where(Sessao.usuario_id == usuario.id)
            .values(revogada=True)
            .execution_options(synchronize_session=False)
        )
        auditar(db, request, usuario, "totp.ativar", f"usuario:{usuario.id}")
        await db.commit()
    except HTTPException:
        raise
    except BaseException:
        await db.rollback()  # nada de TOTP ativo sem os códigos e a auditoria
        raise
    # sessão nova (a restrita, se era o caso, deixa de valer); o CSRF continua o mesmo
    token = await rotacionar_sessao(db, request, usuario.id, agora)
    log.info("segundo fator ativado", extra={"evento": "totp.ativar"})
    resposta = JSONResponse(Ativado(codigos=codigos).model_dump(), headers=_SEM_CACHE)
    cookie_de_sessao(resposta, token)
    return resposta
