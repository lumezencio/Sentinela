"""Códigos de recuperação do TOTP: 10 por usuário, mostrados uma única vez, guardados como
hash argon2id; cada um vale uma vez (o `UPDATE ... WHERE usado_em IS NULL` decide a corrida)."""

import secrets
from datetime import datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import CodigoRecuperacao
from sentinela.parede.emparelhamento import ALFABETO
from sentinela.seguranca.senhas import gerar_hash_segredo_async, verificar_async

QUANTIDADE = 10
_METADE = 5


def gerar_codigos() -> list[str]:
    codigos: set[str] = set()
    while len(codigos) < QUANTIDADE:
        letras = "".join(secrets.choice(ALFABETO) for _ in range(2 * _METADE))
        codigos.add(f"{letras[:_METADE]}-{letras[_METADE:]}")
    lista = list(codigos)
    secrets.SystemRandom().shuffle(lista)
    return lista


def normalizar(texto: str) -> str | None:
    """Maiúsculas, sem espaços nem hífen; ``None`` se não forem 10 caracteres do alfabeto."""
    limpo = texto.strip().upper().replace("-", "").replace(" ", "")
    if len(limpo) != 2 * _METADE or any(c not in ALFABETO for c in limpo):
        return None
    return f"{limpo[:_METADE]}-{limpo[_METADE:]}"


async def preparar() -> tuple[list[str], list[str]]:
    """Gera os códigos e seus hashes (argon2 fora de qualquer transação de escrita)."""
    codigos = gerar_codigos()
    return codigos, [await gerar_hash_segredo_async(c) for c in codigos]


async def gravar(db: AsyncSession, usuario_id: int, hashes: list[str], agora: datetime) -> None:
    """Apaga os códigos anteriores e grava os hashes, SEM ``commit`` (o chamador decide)."""
    await db.execute(delete(CodigoRecuperacao).where(CodigoRecuperacao.usuario_id == usuario_id))
    db.add_all(
        CodigoRecuperacao(usuario_id=usuario_id, hash_codigo=h, criado_em=agora) for h in hashes
    )


async def emitir(db: AsyncSession, usuario_id: int, agora: datetime) -> list[str]:
    """Apaga os códigos anteriores, grava 10 hashes e devolve os códigos em claro (única vez)."""
    codigos, hashes = await preparar()
    await gravar(db, usuario_id, hashes, agora)
    await db.commit()
    return codigos


async def consumir(db: AsyncSession, usuario_id: int, texto: str, agora: datetime) -> bool:
    """Gasta o código se confere com um não usado; só um chamador vence a corrida."""
    codigo = normalizar(texto)
    if codigo is None:
        return False
    linhas = (
        await db.execute(
            select(CodigoRecuperacao.id, CodigoRecuperacao.hash_codigo).where(
                CodigoRecuperacao.usuario_id == usuario_id,
                CodigoRecuperacao.usado_em.is_(None),
            )
        )
    ).all()
    for id_, hash_codigo in linhas:
        if not await verificar_async(hash_codigo, codigo):
            continue
        # o UPDATE condicional é a primeira escrita; banco ocupado/bloqueado conta como
        # tentativa que não gastou o código (o chamador responde 401 genérico)
        try:
            res = await db.execute(
                update(CodigoRecuperacao)
                .where(CodigoRecuperacao.id == id_, CodigoRecuperacao.usado_em.is_(None))
                .values(usado_em=agora)
            )
            await db.commit()
        except OperationalError:
            await db.rollback()
            return False
        return bool(res.rowcount == 1)  # type: ignore[attr-defined]
    await db.rollback()
    return False


async def restantes(db: AsyncSession, usuario_id: int) -> int:
    return (
        await db.scalar(
            select(func.count())
            .select_from(CodigoRecuperacao)
            .where(CodigoRecuperacao.usuario_id == usuario_id, CodigoRecuperacao.usado_em.is_(None))
        )
    ) or 0
