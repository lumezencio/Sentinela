from typing import Protocol

import pytest
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Usuario
from sentinela.seguranca.senhas import gerar_hash


class CriarUsuario(Protocol):
    async def __call__(self, login: str, senha: str, papel: str = ...) -> Usuario: ...


@pytest.fixture
def criar_usuario(app: FastAPI) -> CriarUsuario:
    """Cria usuário direto no banco (exige o `cliente` ativo, que roda o lifespan)."""

    async def _criar(login: str, senha: str, papel: str = "visualizador") -> Usuario:
        sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
        async with sessoes() as db:
            usuario = Usuario(login=login, hash_senha=gerar_hash(senha), papel=papel)
            db.add(usuario)
            await db.commit()
            return usuario

    return _criar
