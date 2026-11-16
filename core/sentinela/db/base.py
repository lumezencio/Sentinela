"""Base declarativa e tipos comuns do banco.

Convenção de datas: todo instante é guardado em UTC e devolvido com fuso
(`tzinfo=UTC`). No SQLite o valor é armazenado como DATETIME ingênuo em UTC; o
`UTCDateTime` converte na escrita (exige datetime com fuso) e reanexa UTC na leitura.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, MetaData
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator

CONVENCAO_NOMES = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class UTCDateTime(TypeDecorator[datetime]):
    """DATETIME guardado como UTC ingênuo; sempre devolvido com fuso UTC."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("datetime sem fuso horário não é aceito; use UTC")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: Any, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        resultado: datetime = value.replace(tzinfo=UTC)
        return resultado


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=CONVENCAO_NOMES)
