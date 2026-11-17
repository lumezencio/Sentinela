"""Cofre de credenciais das fontes de descoberta (Fernet).

A chave vem de `SENTINELA_CHAVE_CREDENCIAIS`: 32 bytes em hexadecimal (64 caracteres),
derivados para o formato base64 urlsafe do Fernet. Nenhuma mensagem de erro carrega
a chave, o blob ou o texto claro.
"""

import base64
import binascii
import json
from collections.abc import Iterable

from cryptography.fernet import Fernet, InvalidToken
from pydantic import SecretStr

# só estes campos da credencial são segredo; ``usuario``, ``versao``, ``auth`` e ``priv``
# ("admin", "3", "SHA256", "AES") apareceriam mascarados em textos legítimos do aparelho
CHAVES_SECRETAS = frozenset({"senha", "comunidade", "senha_auth", "senha_priv"})


class ErroCofre(Exception):
    """Falha ao cifrar/decifrar; a mensagem é sempre genérica."""


class Cofre:
    def __init__(self, chave: SecretStr) -> None:
        try:
            bruto = bytes.fromhex(chave.get_secret_value())
        except ValueError:
            raise ErroCofre("chave de credenciais inválida") from None
        if len(bruto) != 32:
            raise ErroCofre("chave de credenciais inválida")
        self._fernet = Fernet(base64.urlsafe_b64encode(bruto))

    def cifrar(self, dados: dict[str, str]) -> bytes:
        return self._fernet.encrypt(json.dumps(dados, separators=(",", ":")).encode())

    def decifrar(self, blob: bytes) -> dict[str, str]:
        try:
            dados = json.loads(self._fernet.decrypt(blob))
        except (InvalidToken, ValueError, TypeError, binascii.Error):
            raise ErroCofre("não foi possível decifrar a credencial") from None
        if not isinstance(dados, dict):
            raise ErroCofre("não foi possível decifrar a credencial")
        return {str(k): str(v) for k, v in dados.items()}

    def segredos(self, blob: bytes) -> list[str]:
        """Valores secretos da credencial (``CHAVES_SECRETAS``) para ``mascarar``; credencial
        ilegível ou vazia: lista vazia."""
        try:
            dados = self.decifrar(blob)
        except ErroCofre:
            return []
        return [v for k, v in dados.items() if k in CHAVES_SECRETAS and v]

    @staticmethod
    def mascarar(texto: str, segredos: Iterable[str]) -> str:
        """Troca cada segredo (não vazio) por `***`; os mais longos primeiro."""
        for segredo in sorted({s for s in segredos if s}, key=len, reverse=True):
            texto = texto.replace(segredo, "***")
        return texto
