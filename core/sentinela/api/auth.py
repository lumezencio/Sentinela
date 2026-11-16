"""Rotas de autenticação: login, logout e identidade da sessão.

Nunca registra senha, token ou hash; as tentativas são logadas só com login e resultado.
"""

import asyncio
import logging
import math
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update

from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc, verificar_csrf
from sentinela.db.modelos import Usuario
from sentinela.seguranca.bloqueio import BloqueioFantasma, LimitadorIP, duracao_bloqueio
from sentinela.seguranca.csrf import COOKIE_CSRF, gerar_token_csrf
from sentinela.seguranca.senhas import (
    SENHA_MAXIMA,
    gerar_hash,
    precisa_rehash,
    verificar,
    verificar_ficticio,
)
from sentinela.seguranca.sessoes import (
    COOKIE_SESSAO,
    DURACAO_SESSAO,
    criar_sessao,
    revogar_sessao,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
log = logging.getLogger("sentinela.auth")

MSG_INVALIDO = "Login ou senha inválidos."
MSG_MUITAS = "Muitas tentativas. Aguarde e tente novamente."


class Credenciais(BaseModel):
    model_config = ConfigDict(extra="forbid")

    login: str = Field(min_length=1, max_length=64)
    senha: str = Field(min_length=1, max_length=SENHA_MAXIMA)


class Eu(BaseModel):
    login: str
    papel: str


def exigir_json(request: Request) -> None:
    tipo = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if tipo != "application/json":
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Envie application/json."
        )


def _invalido() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=MSG_INVALIDO)


def _muitas(espera_s: float) -> HTTPException:
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        detail=MSG_MUITAS,
        headers={"Retry-After": str(max(1, math.ceil(espera_s)))},
    )


def _registrar(login: str, resultado: str) -> None:
    log.info("tentativa de login: login=%r resultado=%s", login, resultado)


def _definir_cookie(resposta: Response, nome: str, valor: str, *, httponly: bool) -> None:
    resposta.set_cookie(
        nome,
        valor,
        max_age=int(DURACAO_SESSAO.total_seconds()),
        path="/",
        secure=True,
        httponly=httponly,
        samesite="strict",
    )


@router.post(
    "/login",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exigir_json)],
    response_class=Response,
)
async def login(cred: Credenciais, request: Request, db: SessaoDB) -> Response:
    falhas_ip: LimitadorIP = request.app.state.falhas_ip
    fantasma: BloqueioFantasma = request.app.state.falhas_fantasma
    ip = request.client.host if request.client else "desconhecido"

    espera = falhas_ip.restante(ip)
    if espera:
        _registrar(cred.login, "bloqueado_ip")
        raise _muitas(espera)

    consulta = select(Usuario).where(Usuario.login == cred.login)
    usuario = (await db.execute(consulta)).scalar_one_or_none()
    agora = agora_utc()

    if usuario is None:
        espera = fantasma.restante(cred.login)
        if espera:
            falhas_ip.registrar_falha(ip)
            _registrar(cred.login, "bloqueado")
            raise _muitas(espera)
        await asyncio.to_thread(verificar_ficticio, cred.senha)
        fantasma.registrar_falha(cred.login)
        falhas_ip.registrar_falha(ip)
        _registrar(cred.login, "falha")
        raise _invalido()

    if usuario.bloqueado_ate is not None and usuario.bloqueado_ate > agora:
        falhas_ip.registrar_falha(ip)
        _registrar(cred.login, "bloqueado")
        raise _muitas((usuario.bloqueado_ate - agora).total_seconds())

    if not await asyncio.to_thread(verificar, usuario.hash_senha, cred.senha):
        falhas = (
            await db.execute(
                update(Usuario)
                .where(Usuario.id == usuario.id)
                .values(falhas=Usuario.falhas + 1)
                .returning(Usuario.falhas)
            )
        ).scalar_one()
        duracao = duracao_bloqueio(falhas)
        if duracao:
            await db.execute(
                update(Usuario)
                .where(Usuario.id == usuario.id)
                .values(bloqueado_ate=agora + timedelta(seconds=duracao))
            )
        await db.commit()
        falhas_ip.registrar_falha(ip)
        _registrar(cred.login, "falha")
        raise _invalido()

    usuario.falhas = 0
    usuario.bloqueado_ate = None
    if precisa_rehash(usuario.hash_senha):
        try:
            usuario.hash_senha = await asyncio.to_thread(gerar_hash, cred.senha)
        except ValueError:
            pass  # senha antiga fora da política atual: mantém o hash existente
    anterior = request.cookies.get(COOKIE_SESSAO)
    if anterior:
        await revogar_sessao(db, anterior)  # evita fixação/reaproveitamento de sessão
    token = await criar_sessao(db, usuario.id, agora)
    _registrar(cred.login, "sucesso")

    resposta = Response(status_code=status.HTTP_204_NO_CONTENT)
    _definir_cookie(resposta, COOKIE_SESSAO, token, httponly=True)
    _definir_cookie(resposta, COOKIE_CSRF, gerar_token_csrf(), httponly=False)
    return resposta


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verificar_csrf)],
    response_class=Response,
)
async def logout(request: Request, db: SessaoDB) -> Response:
    token = request.cookies.get(COOKIE_SESSAO)
    if token:
        await revogar_sessao(db, token)
    resposta = Response(status_code=status.HTTP_204_NO_CONTENT)
    for nome, httponly in ((COOKIE_SESSAO, True), (COOKIE_CSRF, False)):
        resposta.delete_cookie(nome, path="/", secure=True, httponly=httponly, samesite="strict")
    return resposta


@router.get("/eu")
async def eu(usuario: UsuarioAtual) -> Eu:
    return Eu(login=usuario.login, papel=usuario.papel)
