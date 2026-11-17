from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração via variáveis de ambiente `SENTINELA_*`."""

    model_config = SettingsConfigDict(env_prefix="SENTINELA_", extra="forbid")

    ambiente: Literal["desenvolvimento", "producao", "teste"] = "producao"
    banco_url: str = "sqlite+aiosqlite:////dados/sentinela.db"
    chave_sessao: SecretStr
    demo: bool = False
    teto_pps: int = Field(default=20, ge=1, le=100)
    latencia_instavel_ms: float = Field(default=200.0, gt=0)
    # laço do monitor morreu: encerra o processo para o Docker reiniciar (ligado na imagem)
    sair_se_monitor_morrer: bool = False


@lru_cache
def obter_settings() -> Settings:
    return Settings()
