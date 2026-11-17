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
    LargeBinary,
    String,
    false,
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
        CheckConstraint("checagem IN ('icmp', 'tcp', 'http', 'gravador')", name="checagem"),
        # câmeras de gravadores diferentes podem repetir o IP interno
        Index(
            "uq_equipamento_ip_exceto_gravador",
            "ip",
            unique=True,
            sqlite_where=text("checagem <> 'gravador'"),
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome: Mapped[str] = mapped_column(String(120))
    ip: Mapped[str] = mapped_column(String(45))
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
    # câmera atrás de um gravador: o gravador e o número do canal
    pai_id: Mapped[str | None] = mapped_column(
        ForeignKey("equipamento.id", ondelete="SET NULL"), default=None
    )
    canal: Mapped[int | None] = mapped_column(Integer, default=None)


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
    permite_varredura: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


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


class Fonte(Base):
    """Fonte de descoberta (MikroTik, SNMP, gravador). A credencial só existe cifrada."""

    __tablename__ = "fonte"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('mikrotik', 'snmp', 'hikvision', 'dahua', 'simulada')", name="tipo"
        ),
        CheckConstraint("intervalo_s BETWEEN 300 AND 3600", name="intervalo_s"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tipo: Mapped[str] = mapped_column(String(16))
    nome: Mapped[str] = mapped_column(String(64))
    host: Mapped[str] = mapped_column(String(255))
    porta: Mapped[int] = mapped_column(Integer)
    tls: Mapped[bool] = mapped_column(Boolean, default=True)
    credencial_cifrada: Mapped[bytes] = mapped_column(LargeBinary)
    impressao_tls: Mapped[str | None] = mapped_column(String(64), default=None)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True)
    intervalo_s: Mapped[int] = mapped_column(Integer, default=600)
    ultima_coleta: Mapped[datetime | None] = mapped_column(UTCDateTime, default=None)
    ultimo_erro: Mapped[str | None] = mapped_column(String(200), default=None)
    equipamento_id: Mapped[str | None] = mapped_column(
        ForeignKey("equipamento.id", ondelete="SET NULL"), default=None
    )


class Descoberta(Base):
    """Aparelho visto numa fonte, à espera de aprovação. Única por `chave`."""

    __tablename__ = "descoberta"
    __table_args__ = (
        CheckConstraint("status IN ('pendente', 'aprovada', 'ignorada')", name="status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # MAC normalizado, `ip:<ip>` sem MAC ou `nvr:<fonte_id>:<canal>`
    chave: Mapped[str] = mapped_column(String(80), unique=True)
    ip: Mapped[str] = mapped_column(String(45))
    mac: Mapped[str | None] = mapped_column(String(17), default=None)
    fabricante: Mapped[str | None] = mapped_column(String(120), default=None)
    nome_sugerido: Mapped[str | None] = mapped_column(String(120), default=None)
    sinais: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    classe_sugerida: Mapped[str | None] = mapped_column(String(32), default=None)
    confianca: Mapped[float] = mapped_column(Float, default=0.0)
    origens: Mapped[list[Any]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(10), default="pendente")
    pai_equipamento_id: Mapped[str | None] = mapped_column(
        ForeignKey("equipamento.id", ondelete="SET NULL"), default=None
    )
    canal: Mapped[int | None] = mapped_column(Integer, default=None)
    equipamento_id: Mapped[str | None] = mapped_column(
        ForeignKey("equipamento.id", ondelete="SET NULL"), default=None
    )
    fora_das_subredes: Mapped[bool] = mapped_column(Boolean, default=False)
    # id do equipamento que já usa o IP novo de um MAC conhecido
    conflito_com: Mapped[str | None] = mapped_column(String(36), default=None)
    sondada_em: Mapped[datetime | None] = mapped_column(UTCDateTime, default=None)
    primeira_vez: Mapped[datetime] = mapped_column(UTCDateTime)
    ultima_vez: Mapped[datetime] = mapped_column(UTCDateTime)


class Config(Base):
    """Chave/valor tipado (JSON) das configurações ajustáveis em tempo de execução."""

    __tablename__ = "config"

    chave: Mapped[str] = mapped_column(String(64), primary_key=True)
    valor: Mapped[Any] = mapped_column(JSON)
