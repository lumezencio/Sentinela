"""Ajustes do Telegram na tabela ``config`` (chave/valor JSON).

- ``telegram``: ``{"token_cifrado": str | None, "chats": [str], "incluir_ip": bool}``. O token
  fica cifrado pelo ``Cofre`` (``cofre.cifrar({"token": t})``, em base64): nunca em claro no
  banco, em resposta, log ou auditoria.
- ``telegram_status``: ``{"ultimo_envio": ISO | None, "ultimo_erro": str | None}``; o erro é
  sempre um texto fixo do ``ClienteTelegram`` (nunca a exceção da pilha HTTP).

Linha ausente ou editada à mão com tipos errados cai no padrão: sem token, sem chats, sem IP.
"""

import base64
import binascii
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import Config
from sentinela.seguranca.cofre import Cofre, ErroCofre

TELEGRAM = "telegram"
TELEGRAM_STATUS = "telegram_status"
MAX_CHATS = 10
MAX_ERRO = 200


@dataclass(frozen=True)
class AjustesTelegram:
    token_cifrado: str | None = None
    chats: list[str] = field(default_factory=list)
    incluir_ip: bool = False


def cifrar_token(cofre: Cofre, token: str) -> str:
    return base64.b64encode(cofre.cifrar({"token": token})).decode("ascii")


def decifrar_token(cofre: Cofre, token_cifrado: str | None) -> str | None:
    """Token em claro, ou ``None`` se ausente ou ilegível (chave trocada, linha corrompida)."""
    if not token_cifrado:
        return None
    try:
        dados = cofre.decifrar(base64.b64decode(token_cifrado, validate=True))
    except (ErroCofre, binascii.Error, ValueError):
        return None
    token = dados.get("token")
    return token or None


async def _valor(db: AsyncSession, chave: str) -> Any:
    linha = await db.get(Config, chave)
    return linha.valor if linha is not None else None


async def _gravar(db: AsyncSession, chave: str, valor: dict[str, Any]) -> None:
    linha = await db.get(Config, chave)
    if linha is None:
        db.add(Config(chave=chave, valor=valor))
    else:
        linha.valor = valor  # objeto novo: o SQLAlchemy percebe a troca do JSON


async def ler_telegram(db: AsyncSession) -> AjustesTelegram:
    valor = await _valor(db, TELEGRAM)
    if not isinstance(valor, dict):
        return AjustesTelegram()
    token = valor.get("token_cifrado")
    chats = valor.get("chats")
    incluir_ip = valor.get("incluir_ip")
    return AjustesTelegram(
        token_cifrado=token if isinstance(token, str) and token else None,
        chats=(
            list(dict.fromkeys(c for c in chats if isinstance(c, str) and c))[:MAX_CHATS]
            if isinstance(chats, list)
            else []
        ),
        incluir_ip=incluir_ip if isinstance(incluir_ip, bool) else False,
    )


async def gravar_telegram(db: AsyncSession, a: AjustesTelegram) -> None:
    """Cria ou troca a linha (sem commit: quem chama decide a transação)."""
    await _gravar(
        db,
        TELEGRAM,
        {"token_cifrado": a.token_cifrado, "chats": list(a.chats), "incluir_ip": a.incluir_ip},
    )


async def registrar_status(db: AsyncSession, ok: bool, erro: str | None, agora: datetime) -> None:
    """Sucesso: ``ultimo_envio = agora`` e limpa o erro. Falha: guarda o texto fixo do erro e
    mantém o último envio. Sem commit."""
    atual = await ler_status(db)
    ultimo_envio = agora if ok else atual["ultimo_envio"]
    await _gravar(
        db,
        TELEGRAM_STATUS,
        {
            "ultimo_envio": ultimo_envio.isoformat() if ultimo_envio else None,
            "ultimo_erro": None if ok else (erro or "Falha no envio ao Telegram.")[:MAX_ERRO],
        },
    )


async def ler_status(db: AsyncSession) -> dict[str, Any]:
    """``{"ultimo_envio": datetime | None, "ultimo_erro": str | None}``."""
    valor = await _valor(db, TELEGRAM_STATUS)
    if not isinstance(valor, dict):
        valor = {}
    ultimo_envio: datetime | None = None
    bruto = valor.get("ultimo_envio")
    if isinstance(bruto, str):
        try:
            ultimo_envio = datetime.fromisoformat(bruto)
        except ValueError:
            ultimo_envio = None
    erro = valor.get("ultimo_erro")
    return {"ultimo_envio": ultimo_envio, "ultimo_erro": erro if isinstance(erro, str) else None}
