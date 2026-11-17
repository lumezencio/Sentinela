"""Sessões opacas e revogáveis: o cliente guarda o token; o banco, só o SHA-256 dele."""

import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import Sessao, Usuario

COOKIE_SESSAO = "sentinela_sessao"
DURACAO_SESSAO = timedelta(hours=12)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def criar_sessao(db: AsyncSession, usuario_id: int, agora: datetime) -> str:
    """Cria a sessão e devolve o token em claro (só vai para o cookie, nunca ao banco)."""
    token = secrets.token_urlsafe(32)
    db.add(Sessao(jti=hash_token(token), usuario_id=usuario_id, expira_em=agora + DURACAO_SESSAO))
    await db.commit()
    return token


async def usuario_da_sessao(db: AsyncSession, token: str, agora: datetime) -> Usuario | None:
    """Dono de uma sessão válida (não revogada e não expirada), ou None."""
    consulta = (
        select(Usuario)
        .join(Sessao, Sessao.usuario_id == Usuario.id)
        .where(
            Sessao.jti == hash_token(token),
            Sessao.revogada.is_(False),
            Sessao.expira_em > agora,
        )
    )
    return (await db.execute(consulta)).scalar_one_or_none()


async def revogar_sessao(db: AsyncSession, token: str) -> None:
    await db.execute(update(Sessao).where(Sessao.jti == hash_token(token)).values(revogada=True))
    await db.commit()
