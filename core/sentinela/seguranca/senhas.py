"""Hash de senha com argon2id (parâmetros padrão da argon2-cffi, RFC 9106 perfil baixo).

As versões ``*_async`` rodam num executor PRÓPRIO de 2 threads: cada hash usa ~64 MiB
(o container tem 512 MiB) e uma enxurrada de logins não pode ocupar o executor padrão
do asyncio, que o resto do processo usa. Excesso de pedidos espera na fila desse executor.
"""

import asyncio
import functools
import secrets
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

SENHA_MINIMA = 12
SENHA_MAXIMA = 1024
ARGON2_SIMULTANEOS = 2

_hasher = PasswordHasher()
_executor = ThreadPoolExecutor(max_workers=ARGON2_SIMULTANEOS, thread_name_prefix="argon2")


def validar_senha(senha: str) -> None:
    """Levanta ``ValueError`` (sem ecoar a senha) se o tamanho estiver fora da faixa."""
    if len(senha) < SENHA_MINIMA:
        raise ValueError(f"a senha deve ter pelo menos {SENHA_MINIMA} caracteres")
    if len(senha) > SENHA_MAXIMA:
        raise ValueError(f"a senha deve ter no máximo {SENHA_MAXIMA} caracteres")


def gerar_hash(senha: str) -> str:
    validar_senha(senha)
    return _hasher.hash(senha)


def gerar_hash_segredo(texto: str) -> str:
    """argon2id de um segredo gerado pelo sistema (código de recuperação), sem a política de
    tamanho das senhas."""
    return _hasher.hash(texto)


def verificar(hash: str, senha: str) -> bool:
    """True só se ``senha`` confere com ``hash``; hash inválido conta como falha."""
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
    return _hasher.hash(secrets.token_urlsafe(32))


def verificar_ficticio(senha: str) -> None:
    """Gasta o mesmo tempo de uma verificação real quando o login não existe,
    sem revelar a existência da conta (o hash é de uma senha aleatória descartada)."""
    verificar(_hash_ficticio(), senha)


async def _no_executor[T](funcao: Callable[..., T], *args: str) -> T:
    laco = asyncio.get_running_loop()
    return await laco.run_in_executor(_executor, functools.partial(funcao, *args))


async def gerar_hash_async(senha: str) -> str:
    return await _no_executor(gerar_hash, senha)


async def gerar_hash_segredo_async(texto: str) -> str:
    return await _no_executor(gerar_hash_segredo, texto)


async def verificar_async(hash: str, senha: str) -> bool:
    return await _no_executor(verificar, hash, senha)


async def verificar_ficticio_async(senha: str) -> None:
    await _no_executor(verificar_ficticio, senha)
