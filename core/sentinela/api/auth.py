"""Rotas de autenticação: login, logout e identidade da sessão.

Nunca registra senha, token ou hash; as tentativas são logadas só com login e resultado.
"""

import hashlib
import logging
import math
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import ColumnElement, Row, or_, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.api.deps import (
    SessaoDB,
    UsuarioAtual,
    agora_utc,
    isento_de_csrf,
    permite_restrita,
)
from sentinela.db.modelos import Usuario
from sentinela.seguranca import etapa, recuperacao, totp
from sentinela.seguranca.bloqueio import BloqueioFantasma, LimitadorIP, duracao_bloqueio
from sentinela.seguranca.csrf import COOKIE_CSRF, gerar_token_csrf
from sentinela.seguranca.politica import restrita
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
MSG_CODIGO = "Código inválido."


class Credenciais(BaseModel):
    model_config = ConfigDict(extra="forbid")

    login: str = Field(min_length=1, max_length=64)
    senha: str = Field(min_length=1, max_length=SENHA_MAXIMA)


class CodigoTotp(BaseModel):
    """Exatamente um dos dois: código do aplicativo ou código de recuperação."""

    model_config = ConfigDict(extra="forbid")

    codigo: str | None = Field(default=None, max_length=16)
    recuperacao: str | None = Field(default=None, max_length=32)

    @model_validator(mode="after")
    def _exatamente_um(self) -> "CodigoTotp":
        if (self.codigo is None) == (self.recuperacao is None):
            raise ValueError("informe o código ou o código de recuperação")
        return self


class Eu(BaseModel):
    login: str
    papel: str
    totp_ativo: bool
    restrita: bool
    codigos_restantes: int | None


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


type LinhaUsuario = Row[int, int, str, str | None, int | None, str]
RETORNO = (
    Usuario.id,
    Usuario.falhas,
    Usuario.hash_senha,
    Usuario.totp_cifrado,
    Usuario.totp_ultimo_contador,
    Usuario.login,
)


async def reservar_falha(
    db: AsyncSession, filtro: ColumnElement[bool], agora: datetime
) -> LinhaUsuario | None:
    """Reserva uma tentativa do usuário ANTES da verificação lenta (sem janela TOCTOU).

    ``UPDATE ... SET falhas = falhas + 1 WHERE <filtro> AND não bloqueada RETURNING`` é o
    primeiro comando da transação; o SQLite serializa escritores, então só passam tantas
    tentativas quantas a escala permite. O bloqueio já é gravado na reserva que o atinge.
    Devolve ``(id, falhas, hash_senha, totp_cifrado, totp_ultimo_contador, login)`` ou
    ``None`` (inexistente ou bloqueada). Dá o ``commit``: nenhum lock fica preso durante o
    argon2. Compartilhada pelo passo 1 (login/senha), pelo passo 2 (código) e por ``iniciar``.
    """
    reserva = (
        update(Usuario)
        .where(filtro, or_(Usuario.bloqueado_ate.is_(None), Usuario.bloqueado_ate <= agora))
        .values(falhas=Usuario.falhas + 1)
        .returning(*RETORNO)
        .execution_options(synchronize_session=False)
    )
    linha = (await db.execute(reserva)).one_or_none()
    if linha is not None:
        duracao = duracao_bloqueio(linha.falhas)
        if duracao:
            await db.execute(
                update(Usuario)
                .where(Usuario.id == linha.id)
                .values(bloqueado_ate=agora + timedelta(seconds=duracao))
                .execution_options(synchronize_session=False)
            )
    await db.commit()
    return linha


async def devolver_reserva(db: AsyncSession, usuario_id: int) -> None:
    """Desfaz UMA reserva (senha certa em ``iniciar``) sem zerar as falhas alheias."""
    await db.execute(
        update(Usuario)
        .where(Usuario.id == usuario_id, Usuario.falhas > 0)
        .values(falhas=Usuario.falhas - 1)
        .execution_options(synchronize_session=False)
    )
    await db.commit()


def _com_totp(cifrado: str | None, contador: int | None) -> bool:
    return cifrado is not None and contador is not None


async def abrir_sessao(
    db: AsyncSession, request: Request, usuario_id: int, agora: datetime
) -> Response:
    """Revoga a sessão anterior do cookie (fixação), cria a nova e devolve a resposta 204."""
    anterior = request.cookies.get(COOKIE_SESSAO)
    if anterior:
        await revogar_sessao(db, anterior)
    token = await criar_sessao(db, usuario_id, agora)
    resposta = Response(status_code=status.HTTP_204_NO_CONTENT)
    _definir_cookie(resposta, COOKIE_SESSAO, token, httponly=True)
    _definir_cookie(resposta, COOKIE_CSRF, gerar_token_csrf(), httponly=False)
    return resposta


@router.post(
    "/login",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exigir_json)],
    response_class=Response,
)
@isento_de_csrf
async def login(cred: Credenciais, request: Request, db: SessaoDB) -> Response:
    """Login com reserva de tentativa ANTES do argon2 (ver ``reservar_falha``).

    - IP e login inexistente: ``reservar`` checa e conta no mesmo passo síncrono.
    - Sem TOTP: o sucesso zera ``falhas``/``bloqueado_ate``, devolve a cota do IP e abre a
      sessão (204).
    - Com TOTP ativo: a senha certa NÃO zera nada nem devolve a cota do IP; responde 202 com o
      cookie da etapa (``jti`` de uso único) e o passo 2 (``/totp/entrar``) conclui.
    """
    falhas_ip: LimitadorIP = request.app.state.falhas_ip
    fantasma: BloqueioFantasma = request.app.state.falhas_fantasma
    ip = request.client.host if request.client else "desconhecido"
    agora = agora_utc()

    espera = falhas_ip.reservar(ip)
    if espera:
        _registrar(_rotulo_desconhecido(cred.login), "bloqueado_ip")
        raise _muitas(espera)

    linha = await reservar_falha(db, Usuario.login == cred.login, agora)

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

    usuario_id = linha.id
    if not await verificar_async(linha.hash_senha, cred.senha):
        _registrar(_rotulo_conhecido(cred.login), "falha")  # já contada na reserva
        raise _invalido()

    com_totp = _com_totp(linha.totp_cifrado, linha.totp_ultimo_contador)
    novos: dict[str, object] = {} if com_totp else {"falhas": 0, "bloqueado_ate": None}
    if precisa_rehash(linha.hash_senha):
        try:
            novos["hash_senha"] = await gerar_hash_async(cred.senha)
        except ValueError:
            pass  # senha antiga fora da política atual: mantém o hash existente
    if novos:
        await db.execute(
            update(Usuario)
            .where(Usuario.id == usuario_id)
            .values(**novos)
            .execution_options(synchronize_session=False)
        )

    if com_totp:
        await db.commit()
        chave = request.app.state.settings.chave_sessao
        jti = secrets.token_urlsafe(16)
        request.app.state.etapas_totp.registrar(jti, usuario_id, agora)
        resposta: Response = JSONResponse({"etapa": "totp"}, status_code=status.HTTP_202_ACCEPTED)
        resposta.set_cookie(
            etapa.COOKIE_ETAPA,
            etapa.emitir(chave, usuario_id, agora, jti),
            max_age=int(etapa.VALIDADE_ETAPA.total_seconds()),
            path="/api/v1/auth",
            secure=True,
            httponly=True,
            samesite="strict",
        )
        _registrar(_rotulo_conhecido(cred.login), "senha_ok_aguarda_totp")
        return resposta

    falhas_ip.liberar(ip)
    resposta = await abrir_sessao(db, request, usuario_id, agora)  # o commit vai junto
    _registrar(_rotulo_conhecido(cred.login), "sucesso")
    return resposta


def _codigo_invalido() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=MSG_CODIGO)


async def _rollback_seguro(db: AsyncSession) -> None:
    try:
        await db.rollback()
    except SQLAlchemyError:
        pass


async def _conferir_codigo(
    db: AsyncSession,
    request: Request,
    linha: LinhaUsuario,
    corpo: CodigoTotp,
    agora: datetime,
) -> bool:
    """Aceita o código do aplicativo ou de recuperação; o aceite é atômico (só um vence)."""
    if not _com_totp(linha.totp_cifrado, linha.totp_ultimo_contador):
        return False  # TOTP zerado entre os passos
    if corpo.recuperacao is not None:
        if not await recuperacao.consumir(db, linha.id, corpo.recuperacao, agora):
            return False
        await db.execute(
            update(Usuario)
            .where(Usuario.id == linha.id)
            .values(falhas=0, bloqueado_ate=None)
            .execution_options(synchronize_session=False)
        )
        await db.commit()
        return True
    segredo = totp.decifrar_segredo(request.app.state.cofre, linha.totp_cifrado)
    if segredo is None or corpo.codigo is None:
        return False
    contador = totp.conferir(segredo, corpo.codigo, agora, linha.totp_ultimo_contador)
    if contador is None:
        return False
    # a corrida de dois envios do mesmo código termina aqui: só um UPDATE casa a condição
    res = await db.execute(
        update(Usuario)
        .where(
            Usuario.id == linha.id,
            or_(Usuario.totp_ultimo_contador.is_(None), Usuario.totp_ultimo_contador < contador),
        )
        .values(totp_ultimo_contador=contador, falhas=0, bloqueado_ate=None)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return bool(res.rowcount == 1)  # type: ignore[attr-defined]


@router.post(
    "/totp/entrar",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exigir_json)],
    response_class=Response,
)
@isento_de_csrf
async def totp_entrar(corpo: CodigoTotp, request: Request, db: SessaoDB) -> Response:
    """Passo 2 do login: código do aplicativo ou de recuperação, com a etapa do cookie.

    Cada chamada reserva uma falha do login e uma do IP ANTES de verificar; o sucesso zera
    ``falhas``/``bloqueado_ate`` e devolve as duas cotas do IP (a do passo 1 e a deste).
    Qualquer falha (inclusive erro de banco) é o mesmo 401 genérico.
    """
    falhas_ip: LimitadorIP = request.app.state.falhas_ip
    etapas: etapa.RegistroEtapas = request.app.state.etapas_totp
    chave = request.app.state.settings.chave_sessao
    ip = request.client.host if request.client else "desconhecido"
    agora = agora_utc()

    espera = falhas_ip.reservar(ip)
    if espera:
        raise _muitas(espera)

    token = request.cookies.get(etapa.COOKIE_ETAPA)
    achado = etapa.ler_completo(chave, token, agora) if token else None
    if achado is None or not etapas.valida(achado[1], achado[0], agora):
        raise _codigo_invalido()
    usuario_id, jti = achado

    linha = await reservar_falha(db, Usuario.id == usuario_id, agora)
    if linha is None:
        existente = (
            await db.execute(select(Usuario.bloqueado_ate).where(Usuario.id == usuario_id))
        ).one_or_none()
        await db.rollback()
        if existente is None:
            raise _codigo_invalido()
        (ate,) = existente
        raise _muitas((ate - agora).total_seconds() if ate is not None else 1)

    try:
        aceito = await _conferir_codigo(db, request, linha, corpo, agora)
    except SQLAlchemyError:
        await _rollback_seguro(db)
        aceito = False
    if not aceito:
        etapas.registrar_erro(jti)
        _registrar(_rotulo_conhecido(linha.login), "falha_totp")
        raise _codigo_invalido()
    if not etapas.consumir(jti):  # a mesma etapa já entrou por outra requisição
        raise _codigo_invalido()

    falhas_ip.liberar(ip)  # a do passo 2 e a do passo 1
    falhas_ip.liberar(ip)
    resposta = await abrir_sessao(db, request, linha.id, agora)
    resposta.delete_cookie(
        etapa.COOKIE_ETAPA, path="/api/v1/auth", secure=True, httponly=True, samesite="strict"
    )
    _registrar(_rotulo_conhecido(linha.login), "sucesso_totp")
    return resposta


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
@permite_restrita
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
@permite_restrita
async def eu(request: Request, usuario: UsuarioAtual, db: SessaoDB) -> Eu:
    ativo = totp.totp_ativo(usuario)
    return Eu(
        login=usuario.login,
        papel=usuario.papel,
        totp_ativo=ativo,
        restrita=restrita(usuario, request.app.state.politica_totp),
        codigos_restantes=await recuperacao.restantes(db, usuario.id) if ativo else None,
    )
