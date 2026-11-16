from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def criar_motor(url: str) -> AsyncEngine:
    """Motor assíncrono com WAL, chaves estrangeiras e busy_timeout em cada conexão."""
    motor = create_async_engine(url)

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
