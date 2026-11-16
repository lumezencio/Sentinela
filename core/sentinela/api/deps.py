"""Dependências comuns da API: sessão de banco, usuário autenticado, papel e CSRF."""

from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
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


async def usuario_atual(request: Request, db: SessaoDB) -> Usuario:
    """Usuário da sessão do cookie; 401 se ausente, desconhecida, revogada ou expirada."""
    token = request.cookies.get(COOKIE_SESSAO)
    usuario = await usuario_da_sessao(db, token, agora_utc()) if token else None
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")
    return usuario


UsuarioAtual = Annotated[Usuario, Depends(usuario_atual)]


async def exigir_admin(usuario: UsuarioAtual) -> Usuario:
    if usuario.papel != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente.")
    return usuario


async def verificar_csrf(request: Request) -> None:
    """Em escrita (POST/PUT/PATCH/DELETE), o cabeçalho ``X-CSRF`` deve igualar o cookie."""
    if request.method not in METODOS_ESCRITA:
        return
    if not tokens_conferem(request.cookies.get(COOKIE_CSRF), request.headers.get(CABECALHO_CSRF)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Falha na verificação CSRF.")
