"""Hash de senha com argon2id (parâmetros padrão da argon2-cffi, RFC 9106 perfil baixo)."""

import secrets
import threading
from functools import lru_cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

SENHA_MINIMA = 12
SENHA_MAXIMA = 1024

_hasher = PasswordHasher()
# Cada hash usa ~64 MiB: limita quantos rodam ao mesmo tempo para não estourar o container.
_simultaneos = threading.BoundedSemaphore(2)


def validar_senha(senha: str) -> None:
    """Levanta ``ValueError`` (sem ecoar a senha) se o tamanho estiver fora da faixa."""
    if len(senha) < SENHA_MINIMA:
        raise ValueError(f"a senha deve ter pelo menos {SENHA_MINIMA} caracteres")
    if len(senha) > SENHA_MAXIMA:
        raise ValueError(f"a senha deve ter no máximo {SENHA_MAXIMA} caracteres")


def gerar_hash(senha: str) -> str:
    validar_senha(senha)
    with _simultaneos:
        return _hasher.hash(senha)


def verificar(hash: str, senha: str) -> bool:
    """True só se ``senha`` confere com ``hash``; hash inválido conta como falha."""
    with _simultaneos:
        try:
            return _hasher.verify(hash, senha)
        except (VerificationError, InvalidHashError):
            return False


def precisa_rehash(hash: str) -> bool:
    try:
        return _hasher.check_needs_rehash(hash)
    except InvalidHashError:
        return True


@lru_cache(maxsize=1)
def _hash_ficticio() -> str:
    with _simultaneos:
        return _hasher.hash(secrets.token_urlsafe(32))


def verificar_ficticio(senha: str) -> None:
    """Gasta o mesmo tempo de uma verificação real quando o login não existe,
    sem revelar a existência da conta (o hash é de uma senha aleatória descartada)."""
    verificar(_hash_ficticio(), senha)
