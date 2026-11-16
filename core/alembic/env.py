"""Ambiente Alembic assíncrono. URL: `-x url=...` ou `SENTINELA_BANCO_URL` (Settings)."""

import asyncio
import logging.config

from sqlalchemy.engine import Connection

from alembic import context
from sentinela.config import Settings
from sentinela.db import modelos  # noqa: F401  (registra as tabelas no metadata)
from sentinela.db.base import Base
from sentinela.db.sessao import criar_motor

config = context.config
if config.config_file_name is not None:
    logging.config.fileConfig(config.config_file_name)

alvo = Base.metadata


def _url() -> str:
    url = context.get_x_argument(as_dictionary=True).get("url")
    if url:
        return url
    return Settings().banco_url


def _migrar(conexao: Connection) -> None:
    context.configure(connection=conexao, target_metadata=alvo, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def _online() -> None:
    motor = criar_motor(_url())
    try:
        async with motor.connect() as conexao:
            await conexao.run_sync(_migrar)
    finally:
        await motor.dispose()


if context.is_offline_mode():
    context.configure(url=_url(), target_metadata=alvo, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(_online())
