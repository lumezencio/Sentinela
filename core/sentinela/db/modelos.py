"""Modelos SQLAlchemy 2 (fase 1). Datas: ver `sentinela.db.base`."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from sentinela.db.base import Base, UTCDateTime


class Classe(Base):
    __tablename__ = "classe"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(32), unique=True)
    nome: Mapped[str] = mapped_column(String(64))
    cor: Mapped[str] = mapped_column(String(7))
    icone: Mapped[str] = mapped_column(String(32))
    intervalo_s: Mapped[int] = mapped_column(Integer)
    critica: Mapped[bool] = mapped_column(Boolean, default=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class Equipamento(Base):
    __tablename__ = "equipamento"
    __table_args__ = (
        Index(
            "uq_equipamento_mac_presente",
            "mac",
            unique=True,
            sqlite_where=text("mac IS NOT NULL"),
        ),
        CheckConstraint("classe_origem IN ('manual', 'auto')", name="classe_origem"),
        CheckConstraint("checagem IN ('icmp', 'tcp', 'http')", name="checagem"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome: Mapped[str] = mapped_column(String(120))
    ip: Mapped[str] = mapped_column(String(45), unique=True)
    mac: Mapped[str | None] = mapped_column(String(17), default=None)
    fabricante: Mapped[str | None] = mapped_column(String(120), default=None)
    classe_id: Mapped[int] = mapped_column(ForeignKey("classe.id"))
    classe_origem: Mapped[str] = mapped_column(String(10), default="manual")
    checagem: Mapped[str] = mapped_column(String(10), default="icmp")
    porta: Mapped[int | None] = mapped_column(Integer, default=None)
    estado: Mapped[str] = mapped_column(String(16), default="desconhecido")
    estado_desde: Mapped[datetime] = mapped_column(UTCDateTime)
    latencia_ms: Mapped[float | None] = mapped_column(Float, default=None)
    pausado: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(UTCDateTime)
    visto_em: Mapped[datetime | None] = mapped_column(UTCDateTime, default=None)


class Evento(Base):
    __tablename__ = "evento"
    __table_args__ = (Index("ix_evento_equipamento_em", "equipamento_id", "em"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    equipamento_id: Mapped[str] = mapped_column(ForeignKey("equipamento.id", ondelete="CASCADE"))
    de: Mapped[str] = mapped_column(String(16))
    para: Mapped[str] = mapped_column(String(16))
    em: Mapped[datetime] = mapped_column(UTCDateTime)
    duracao_s: Mapped[float | None] = mapped_column(Float, default=None)
    causa: Mapped[str | None] = mapped_column(String(200), default=None)


class Amostra(Base):
    __tablename__ = "amostra"

    equipamento_id: Mapped[str] = mapped_column(
        ForeignKey("equipamento.id", ondelete="CASCADE"), primary_key=True
    )
    ts: Mapped[datetime] = mapped_column(UTCDateTime, primary_key=True)
    latencia_ms: Mapped[float | None] = mapped_column(Float, default=None)
    ok: Mapped[bool] = mapped_column(Boolean)


class SubRede(Base):
    __tablename__ = "sub_rede"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cidr: Mapped[str] = mapped_column(String(43), unique=True)


class Usuario(Base):
    __tablename__ = "usuario"
    __table_args__ = (CheckConstraint("papel IN ('admin', 'visualizador')", name="papel"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    login: Mapped[str] = mapped_column(String(64), unique=True)
    hash_senha: Mapped[str] = mapped_column(String(255))
    papel: Mapped[str] = mapped_column(String(16), default="visualizador")
    falhas: Mapped[int] = mapped_column(Integer, default=0)
    bloqueado_ate: Mapped[datetime | None] = mapped_column(UTCDateTime, default=None)


class Sessao(Base):
    __tablename__ = "sessao"

    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id", ondelete="CASCADE"))
    expira_em: Mapped[datetime] = mapped_column(UTCDateTime)
    revogada: Mapped[bool] = mapped_column(Boolean, default=False)


class Auditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuario.id", ondelete="SET NULL"), default=None
    )
    acao: Mapped[str] = mapped_column(String(64))
    alvo: Mapped[str | None] = mapped_column(String(120), default=None)
    antes: Mapped[dict[str, Any] | None] = mapped_column(JSON, default=None)
    depois: Mapped[dict[str, Any] | None] = mapped_column(JSON, default=None)
    ip: Mapped[str | None] = mapped_column(String(45), default=None)
    em: Mapped[datetime] = mapped_column(UTCDateTime)
