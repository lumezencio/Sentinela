"""Rotas de autenticação: login, logout e identidade da sessão.

Nunca registra senha, token ou hash; as tentativas são logadas só com login e resultado.
"""

import hashlib
import logging
import math
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select, update

from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc, isento_de_csrf
from sentinela.db.modelos import Usuario
from sentinela.seguranca.bloqueio import BloqueioFantasma, LimitadorIP, duracao_bloqueio
from sentinela.seguranca.csrf import COOKIE_CSRF, gerar_token_csrf
from sentinela.seguranca.senhas import (
    SENHA_MAXIMA,
    gerar_hash_async,
    precisa_rehash,
    verificar_async,
    verificar_ficticio_async,
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


def _registrar(rotulo: str, resultado: str) -> None:
    # nunca a senha; login desconhecido só como prefixo de hash (ver _rotulo_desconhecido)
    log.info(
        "tentativa de login: %s resultado=%s",
        rotulo,
        resultado,
        extra={"evento": "login", "rotulo": rotulo, "resultado": resultado},
    )


def _rotulo_conhecido(login: str) -> str:
    return f"login={login!r}"


def _rotulo_desconhecido(login: str) -> str:
    """Login que não existe vai ao log só como prefixo de hash: gente digita senha ali."""
    return f"login_hash={hashlib.sha256(login.encode()).hexdigest()[:12]}"


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
@isento_de_csrf
async def login(cred: Credenciais, request: Request, db: SessaoDB) -> Response:
    """Login com reserva de tentativa ANTES do argon2 (sem janela TOCTOU).

    - IP e login inexistente: ``reservar`` checa e conta no mesmo passo síncrono.
    - Conta real: ``UPDATE ... SET falhas = falhas + 1 WHERE login = ? AND não bloqueada
      RETURNING`` é o primeiro comando da transação; o SQLite serializa escritores, então
      só passam tantas tentativas quantas a escala permite. O bloqueio já é gravado na
      reserva que o atinge; o sucesso zera ``falhas``/``bloqueado_ate`` e devolve a cota
      do IP. Nenhum lock de escrita fica preso durante o argon2 (commit antes).
    """
    falhas_ip: LimitadorIP = request.app.state.falhas_ip
    fantasma: BloqueioFantasma = request.app.state.falhas_fantasma
    ip = request.client.host if request.client else "desconhecido"
    agora = agora_utc()

    espera = falhas_ip.reservar(ip)
    if espera:
        _registrar(_rotulo_desconhecido(cred.login), "bloqueado_ip")
        raise _muitas(espera)

    reserva = (
        update(Usuario)
        .where(
            Usuario.login == cred.login,
            or_(Usuario.bloqueado_ate.is_(None), Usuario.bloqueado_ate <= agora),
        )
        .values(falhas=Usuario.falhas + 1)
        .returning(Usuario.id, Usuario.falhas, Usuario.hash_senha)
        .execution_options(synchronize_session=False)
    )
    linha = (await db.execute(reserva)).one_or_none()
    if linha is not None:
        usuario_id, falhas, hash_senha = linha
        duracao = duracao_bloqueio(falhas)
        if duracao:
            await db.execute(
                update(Usuario)
                .where(Usuario.id == usuario_id)
                .values(bloqueado_ate=agora + timedelta(seconds=duracao))
                .execution_options(synchronize_session=False)
            )
    await db.commit()

    if linha is None:
        consulta = select(Usuario.bloqueado_ate).where(Usuario.login == cred.login)
        existente = (await db.execute(consulta)).one_or_none()
        await db.rollback()
        if existente is not None:  # conta real, mas bloqueada
            (ate,) = existente
            _registrar(_rotulo_conhecido(cred.login), "bloqueado")
            raise _muitas((ate - agora).total_seconds() if ate is not None else 1)
        espera = fantasma.reservar(cred.login)
        if espera:
            _registrar(_rotulo_desconhecido(cred.login), "bloqueado")
            raise _muitas(espera)
        await verificar_ficticio_async(cred.senha)
        _registrar(_rotulo_desconhecido(cred.login), "falha")
        raise _invalido()

    if not await verificar_async(hash_senha, cred.senha):
        _registrar(_rotulo_conhecido(cred.login), "falha")  # já contada na reserva
        raise _invalido()

    novos: dict[str, object] = {"falhas": 0, "bloqueado_ate": None}
    if precisa_rehash(hash_senha):
        try:
            novos["hash_senha"] = await gerar_hash_async(cred.senha)
        except ValueError:
            pass  # senha antiga fora da política atual: mantém o hash existente
    await db.execute(
        update(Usuario)
        .where(Usuario.id == usuario_id)
        .values(**novos)
        .execution_options(synchronize_session=False)
    )
    falhas_ip.liberar(ip)
    anterior = request.cookies.get(COOKIE_SESSAO)
    if anterior:
        await revogar_sessao(db, anterior)  # evita fixação/reaproveitamento de sessão
    token = await criar_sessao(db, usuario_id, agora)
    _registrar(_rotulo_conhecido(cred.login), "sucesso")

    resposta = Response(status_code=status.HTTP_204_NO_CONTENT)
    _definir_cookie(resposta, COOKIE_SESSAO, token, httponly=True)
    _definir_cookie(resposta, COOKIE_CSRF, gerar_token_csrf(), httponly=False)
    return resposta


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def logout(request: Request, db: SessaoDB) -> Response:
    """CSRF exigido pela dependência global (``criar_app``)."""
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
