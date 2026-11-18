"""Apoio dos testes do segundo fator: relógio de parede falso e usuário com TOTP ativo."""

from datetime import UTC, datetime, timedelta

import pyotp
from fastapi import FastAPI
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Usuario
from sentinela.seguranca.totp import cifrar_segredo, novo_segredo


class Tempo:
    """Substitui ``agora_utc`` das rotas de login/ativação: tempo real + deslocamento."""

    def __init__(self) -> None:
        self.deslocamento = timedelta(0)

    def __call__(self) -> datetime:
        return datetime.now(UTC) + self.deslocamento

    def avancar(self, segundos: float) -> None:
        self.deslocamento += timedelta(seconds=segundos)


def codigo_em(segredo: str, instante: datetime) -> str:
    return pyotp.TOTP(segredo).at(instante)


def sessoes_do(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    s: async_sessionmaker[AsyncSession] = app.state.sessoes
    return s


async def dar_totp(app: FastAPI, login: str, ultimo_contador: int = 0) -> str:
    """Liga o TOTP de ``login`` direto no banco e devolve o segredo base32."""
    segredo = novo_segredo()
    async with sessoes_do(app)() as db:
        await db.execute(
            update(Usuario)
            .where(Usuario.login == login)
            .values(
                totp_cifrado=cifrar_segredo(app.state.cofre, segredo),
                totp_ultimo_contador=ultimo_contador,
            )
        )
        await db.commit()
    return segredo


async def usuario_de(app: FastAPI, login: str) -> Usuario:
    async with sessoes_do(app)() as db:
        return (await db.execute(select(Usuario).where(Usuario.login == login))).scalar_one()


AGORA_FIXO = datetime(2026, 11, 18, 12, 0, 0, tzinfo=UTC)
