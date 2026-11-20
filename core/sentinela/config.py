from functools import lru_cache
from ipaddress import IPv4Address, IPv4Network
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, SecretStr, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

from sentinela.rede.guarda import DestinoProibido, Guarda


class Settings(BaseSettings):
    """Configuração via variáveis de ambiente `SENTINELA_*`."""

    model_config = SettingsConfigDict(env_prefix="SENTINELA_", extra="forbid")

    ambiente: Literal["desenvolvimento", "producao", "teste"] = "producao"
    banco_url: str = "sqlite+aiosqlite:////dados/sentinela.db"
    chave_sessao: SecretStr
    # 32 bytes em hex (64 caracteres): cifra as credenciais das fontes de descoberta
    chave_credenciais: SecretStr
    demo: bool = False
    teto_pps: int = Field(default=20, ge=1, le=100)
    latencia_instavel_ms: float = Field(default=200.0, gt=0)
    # laço do monitor morreu: encerra o processo para o Docker reiniciar (ligado na imagem)
    sair_se_monitor_morrer: bool = False
    # só para textos (Telegram, telão, painel) e atalhos de silêncio; o banco fica em UTC
    fuso: str = "America/Sao_Paulo"
    # CA extra para o HTTPS do Telegram (só testes; quem muda já controla o .env)
    ca_adicional: str = ""
    # preenchidas pelo instalar.sh: só sugestão do primeiro acesso (nada vai para a rede);
    # valor inválido vira "" e não impede a subida
    rede_sugerida: str = ""
    gateway_sugerido: str = ""

    @field_validator("fuso")
    @classmethod
    def _fuso_valido(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError, OSError):
            raise ValueError("Fuso inválido") from None
        return v

    @field_validator("rede_sugerida")
    @classmethod
    def _rede_valida(cls, v: str) -> str:
        try:
            return str(Guarda.validar_sub_rede(v.strip()))
        except DestinoProibido:
            return ""

    @field_validator("gateway_sugerido")
    @classmethod
    def _gateway_valido(cls, v: str, info: ValidationInfo) -> str:
        rede = info.data.get("rede_sugerida", "")
        try:
            ip = IPv4Address(v.strip())
            net = IPv4Network(rede) if rede else None
        except ValueError:
            return ""
        if net is None or ip not in net or ip in (net.network_address, net.broadcast_address):
            return ""
        return str(ip)

    @field_validator("ca_adicional")
    @classmethod
    def _ca_legivel(cls, v: str) -> str:
        if v:
            try:
                with Path(v).open("rb") as f:
                    f.read(1)
            except OSError:
                raise ValueError("ca_adicional precisa ser um arquivo legível") from None
        return v


@lru_cache
def obter_settings() -> Settings:
    return Settings()


def pasta_dados(settings: Settings) -> Path:
    """Pasta do arquivo SQLite (``/dados`` em produção); banco em memória não tem pasta."""
    banco = make_url(settings.banco_url).database
    if not banco:
        raise ValueError("o banco configurado está em memória: não há pasta de dados")
    return Path(banco).parent
