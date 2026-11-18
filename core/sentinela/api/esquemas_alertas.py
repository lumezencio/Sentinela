"""Esquemas da API de alertas (silêncios e manutenção)."""

from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import AwareDatetime, BaseModel, ConfigDict, StringConstraints, model_validator

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
