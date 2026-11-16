"""Dependências comuns da API: sessão de banco, usuário autenticado, papel e CSRF."""

from collections.abc import AsyncIterator, Callable, Mapping
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.requests import HTTPConnection
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Usuario
from sentinela.seguranca.csrf import CABECALHO_CSRF, COOKIE_CSRF, METODOS_ESCRITA, tokens_conferem
from sentinela.seguranca.sessoes import COOKIE_SESSAO, usuario_da_sessao


def agora_utc() -> datetime:
    return datetime.now(UTC)


async def obter_sessao(request: Request) -> AsyncIterator[AsyncSession]:
    """Uma ``AsyncSession`` por requisição, fechada ao final."""
    sessoes: async_sessionmaker[AsyncSession] = request.app.state.sessoes
    async with sessoes() as db:
        yield db


SessaoDB = Annotated[AsyncSession, Depends(obter_sessao)]


async def usuario_do_cookie(db: AsyncSession, cookies: Mapping[str, str]) -> Usuario | None:
    """Dono da sessão do cookie, ou None se ausente, desconhecida, revogada ou expirada.

    Compartilhada pelas rotas HTTP (``usuario_atual``) e pelo WebSocket.
    """
    token = cookies.get(COOKIE_SESSAO)
    return await usuario_da_sessao(db, token, agora_utc()) if token else None


async def usuario_atual(request: Request, db: SessaoDB) -> Usuario:
    """Usuário da sessão do cookie; 401 se ausente, desconhecida, revogada ou expirada."""
    usuario = await usuario_do_cookie(db, request.cookies)
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")
    return usuario


UsuarioAtual = Annotated[Usuario, Depends(usuario_atual)]


async def exigir_admin(usuario: UsuarioAtual) -> Usuario:
    if usuario.papel != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente.")
    return usuario


_ISENTOS_DE_CSRF: set[Callable[..., Any]] = set()


def isento_de_csrf[F: Callable[..., Any]](endpoint: F) -> F:
    """Marca um endpoint como isento do CSRF global (só o login: ainda não há sessão)."""
    _ISENTOS_DE_CSRF.add(endpoint)
    return endpoint


async def verificar_csrf(conexao: HTTPConnection) -> None:
    """Em escrita (POST/PUT/PATCH/DELETE), o cabeçalho ``X-CSRF`` deve igualar o cookie.

    Aplicada globalmente em ``criar_app``; isenções explícitas via ``isento_de_csrf``.
    WebSocket não tem método de escrita: a proteção dele é a checagem de ``Origin`` (``ws``).
    """
    if conexao.scope["type"] != "http" or conexao.scope.get("method") not in METODOS_ESCRITA:
        return
    if conexao.scope.get("endpoint") in _ISENTOS_DE_CSRF:
        return
    if not tokens_conferem(conexao.cookies.get(COOKIE_CSRF), conexao.headers.get(CABECALHO_CSRF)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Falha na verificação CSRF.")
