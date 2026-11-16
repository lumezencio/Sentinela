import logging
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def criar_motor(url: str) -> AsyncEngine:
    """Motor assíncrono com WAL, chaves estrangeiras e busy_timeout em cada conexão.

    Parâmetros de SQL nunca vão para o log (hashes de senha e de sessão passam por aqui):
    ``hide_parameters`` no SQLAlchemy e o log DEBUG do aiosqlite (que os imprime) desligado.
    """
    log_aiosqlite = logging.getLogger("aiosqlite")
    if log_aiosqlite.level < logging.INFO:
        log_aiosqlite.setLevel(logging.INFO)
    motor = create_async_engine(url, hide_parameters=True)

    @event.listens_for(motor.sync_engine, "connect")
    def _pragmas(dbapi_conn: Any, _registro: Any) -> None:
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.close()

    return motor


def fabrica_sessao(motor: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(motor, expire_on_commit=False)
