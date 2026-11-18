"""Token da etapa intermediária do login (senha certa, falta o código TOTP).

Formato ``v1.<usuario_id>.<expira_epoch>.<jti>.<hmac>``; a chave do HMAC é derivada de
``chave_sessao`` com rótulo fixo (não serve para mais nada). O ``jti`` aleatório fica
registrado no servidor (só o SHA-256, uso único, 300 s): ``RegistroEtapas``.
Nunca registra o token em log.
"""

import hashlib
import hmac
import secrets
from collections import OrderedDict
from datetime import datetime, timedelta

from pydantic import SecretStr

COOKIE_ETAPA = "sentinela_etapa"
VALIDADE_ETAPA = timedelta(minutes=5)
ERROS_MAXIMOS = 5
MAX_ETAPAS = 10_000
_ROTULO = b"sentinela/etapa-totp/v1"
_VERSAO = "v1"


def _chave(chave: SecretStr) -> bytes:
    return hmac.new(chave.get_secret_value().encode(), _ROTULO, hashlib.sha256).digest()


def _assinar(chave: SecretStr, corpo: str) -> str:
    return hmac.new(_chave(chave), corpo.encode(), hashlib.sha256).hexdigest()


def emitir(chave: SecretStr, usuario_id: int, agora: datetime, jti: str | None = None) -> str:
    jti = jti or secrets.token_urlsafe(16)
    expira = int((agora + VALIDADE_ETAPA).timestamp())
    corpo = f"{_VERSAO}.{usuario_id}.{expira}.{jti}"
    return f"{corpo}.{_assinar(chave, corpo)}"


def ler_completo(chave: SecretStr, token: str, agora: datetime) -> tuple[int, str] | None:
    """``(usuario_id, jti)`` de um token íntegro e dentro da validade; senão ``None``."""
    partes = token.split(".")
    if len(partes) != 5 or partes[0] != _VERSAO or len(token) > 256:
        return None
    versao, uid, expira, jti, mac = partes
    esperado = _assinar(chave, f"{versao}.{uid}.{expira}.{jti}")
    if not hmac.compare_digest(mac.encode(), esperado.encode()):
        return None
    if not (uid.isascii() and uid.isdigit() and expira.isascii() and expira.isdigit()):
        return None
    if int(expira) <= int(agora.timestamp()) or not jti:
        return None
    return int(uid), jti


def ler(chave: SecretStr, token: str, agora: datetime) -> int | None:
    achado = ler_completo(chave, token, agora)
    return achado[0] if achado else None


def _hash(jti: str) -> str:
    return hashlib.sha256(jti.encode()).hexdigest()


class RegistroEtapas:
    """``jti`` ativos (por hash): uso único, 5 erros invalidam, expiram em 300 s.

    Em memória e limitado: reiniciar o core só obriga a refazer o login. Sem ``await``: cada
    operação é atômica no laço de eventos."""

    def __init__(self, max_etapas: int = MAX_ETAPAS) -> None:
        self._max = max_etapas
        # hash(jti) -> [usuario_id, expira_epoch, erros]
        self._etapas: OrderedDict[str, list[int]] = OrderedDict()

    def __len__(self) -> int:
        return len(self._etapas)

    def registrar(self, jti: str, usuario_id: int, agora: datetime) -> None:
        expira = int((agora + VALIDADE_ETAPA).timestamp())
        self._etapas[_hash(jti)] = [usuario_id, expira, 0]
        while len(self._etapas) > self._max:
            self._etapas.popitem(last=False)

    def valida(self, jti: str, usuario_id: int, agora: datetime) -> bool:
        item = self._etapas.get(_hash(jti))
        if item is None:
            return False
        if item[1] <= int(agora.timestamp()):
            del self._etapas[_hash(jti)]
            return False
        return item[0] == usuario_id

    def consumir(self, jti: str) -> bool:
        """Gasta o ``jti``; ``False`` se outro já gastou (ou invalidou)."""
        return self._etapas.pop(_hash(jti), None) is not None

    def registrar_erro(self, jti: str) -> None:
        item = self._etapas.get(_hash(jti))
        if item is None:
            return
        item[2] += 1
        if item[2] >= ERROS_MAXIMOS:
            del self._etapas[_hash(jti)]
