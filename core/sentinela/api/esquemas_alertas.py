"""Esquemas da API de alertas (silêncios e manutenção)."""

import re
from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from sentinela.alertas.silencios import Atalho

Alvo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class SilencioEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal["silencio", "manutencao"]
    alvo_tipo: Literal["equipamento", "classe"]
    alvo: Alvo
    atalho: Atalho | None = None
    fim: AwareDatetime | None = None
    motivo: Motivo | None = None

    @model_validator(mode="after")
    def _um_so_fim(self) -> Self:
        if (self.atalho is None) == (self.fim is None):
            raise ValueError("informe exatamente um entre atalho e fim")
        return self


class SilencioSaida(BaseModel):
    id: int
    tipo: str
    alvo_tipo: str
    alvo: str
    alvo_nome: str
    inicio: datetime
    fim: datetime
    motivo: str | None
    criado_por: str | None
    pausados: int


class AlertaSaida(BaseModel):
    id: int
    tipo: str
    texto: str
    equipamento_id: str | None
    equipamento_nome: str | None
    classe: str | None
    afetados_total: int
    aberto_em: datetime
    fechado_em: datetime | None
    breve: bool
    reconhecido_por: str | None
    reconhecido_em: datetime | None
    silenciado: bool
    envio: str


class AfetadoSaida(BaseModel):
    id: str
    nome: str
    classe: str
    estado: str


class AlertaDetalhe(AlertaSaida):
    afetados: list[AfetadoSaida]


class PaginaAlertas(BaseModel):
    itens: list[AlertaSaida]
    total: int
    pagina: int
    por_pagina: int


_TOKEN = re.compile(r"\d{5,12}:[A-Za-z0-9_-]{30,50}", re.ASCII)
_CHAT = re.compile(r"-?\d{1,20}|@[A-Za-z0-9_]{5,32}", re.ASCII)


class TelegramSaida(BaseModel):
    """Nunca carrega o token: só se ele existe."""

    token_definido: bool
    chats: list[str]
    incluir_ip: bool
    ultimo_envio: datetime | None
    ultimo_erro: str | None


class TelegramEdicao(BaseModel):
    """``token`` ausente/nulo mantém o atual; ``""`` apaga."""

    model_config = ConfigDict(extra="forbid")

    token: str | None = None
    chats: list[str] | None = Field(default=None, max_length=10)
    incluir_ip: bool | None = None

    @field_validator("token")
    @classmethod
    def _token(cls, v: str | None) -> str | None:
        if v and not _TOKEN.fullmatch(v):
            raise ValueError("token inválido")  # sem eco do valor
        return v

    @field_validator("chats")
    @classmethod
    def _chats(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        if any(not _CHAT.fullmatch(c) for c in v):
            raise ValueError("chat inválido")
        if len(set(v)) != len(v):
            raise ValueError("chats repetidos")
        return v


class TesteSaida(BaseModel):
    ok: bool
    erro: str | None


class GeralSaida(BaseModel):
    fuso: str
