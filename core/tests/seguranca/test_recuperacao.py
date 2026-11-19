import asyncio
import re
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.base import Base
from sentinela.db.modelos import CodigoRecuperacao, Usuario
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.parede.emparelhamento import ALFABETO
from sentinela.seguranca import recuperacao

AGORA = datetime(2026, 11, 18, 12, 0, 0, tzinfo=UTC)
FORMATO = re.compile(rf"^[{ALFABETO}]{{5}}-[{ALFABETO}]{{5}}$")

type Sessoes = async_sessionmaker[AsyncSession]


@pytest.fixture
async def sessoes(tmp_path: Path) -> AsyncIterator[Sessoes]:
    motor = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'rec.db'}")
    async with motor.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    fabrica = fabrica_sessao(motor)
    async with fabrica() as db:
        db.add_all(
            [Usuario(id=1, login="a", hash_senha="h"), Usuario(id=2, login="b", hash_senha="h")]
        )
        await db.commit()
    yield fabrica
    await motor.dispose()


def test_gerar_10_codigos_distintos_no_formato() -> None:
    codigos = recuperacao.gerar_codigos()
    assert len(codigos) == recuperacao.QUANTIDADE == 10
    assert len(set(codigos)) == 10
    assert all(FORMATO.match(c) for c in codigos)


def test_normalizar_aceita_minusculas_e_sem_hifen() -> None:
    assert recuperacao.normalizar(" k7mq2-xdp3k ") == "K7MQ2-XDP3K"
    assert recuperacao.normalizar("k7mq2xdp3k") == "K7MQ2-XDP3K"
    assert recuperacao.normalizar("K7MQ2 XDP3K") == "K7MQ2-XDP3K"
    assert recuperacao.normalizar("K7MQ2-XDP3") is None
    assert recuperacao.normalizar("K7MQ2-XDP3O") is None  # O fora do alfabeto
    assert recuperacao.normalizar("") is None


async def test_emitir_substitui_os_anteriores(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        antigos = await recuperacao.emitir(db, 1, AGORA)
        outro = await recuperacao.emitir(db, 2, AGORA)
        novos = await recuperacao.emitir(db, 1, AGORA)
        assert len(novos) == 10
        assert not set(antigos) & set(novos)
        assert await recuperacao.restantes(db, 1) == 10
        assert await recuperacao.restantes(db, 2) == 10
        assert not await recuperacao.consumir(db, 1, antigos[0], AGORA)
        assert await recuperacao.consumir(db, 2, outro[0], AGORA)
        total = await db.scalar(
            select(func.count())
            .select_from(CodigoRecuperacao)
            .where(CodigoRecuperacao.usuario_id == 1)
        )
        assert total == 10


async def test_consumir_vale_uma_vez(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        codigos = await recuperacao.emitir(db, 1, AGORA)
        assert await recuperacao.consumir(db, 1, codigos[3].lower().replace("-", ""), AGORA)
        assert not await recuperacao.consumir(db, 1, codigos[3], AGORA)
        assert await recuperacao.restantes(db, 1) == 9
        assert not await recuperacao.consumir(db, 2, codigos[4], AGORA)  # de outro usuário


async def test_consumir_errado_nao_gasta_nenhum(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        await recuperacao.emitir(db, 1, AGORA)
        assert not await recuperacao.consumir(db, 1, "AAAAA-AAAAA", AGORA)
        assert not await recuperacao.consumir(db, 1, "lixo", AGORA)
        assert await recuperacao.restantes(db, 1) == 10


async def test_hashes_sao_argon2id(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        codigos = await recuperacao.emitir(db, 1, AGORA)
        hashes = (await db.scalars(select(CodigoRecuperacao.hash_codigo))).all()
        assert len(hashes) == 10
        assert all(h.startswith("$argon2id$") for h in hashes)
        assert not any(c in h for c in codigos for h in hashes)


async def test_consumir_concorrente_so_um_sucesso(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        codigos = await recuperacao.emitir(db, 1, AGORA)

    async def tentar() -> bool:
        async with sessoes() as db:
            return await recuperacao.consumir(db, 1, codigos[0], AGORA)

    resultados = await asyncio.gather(*(tentar() for _ in range(5)))
    assert sum(resultados) == 1
    async with sessoes() as db:
        assert await recuperacao.restantes(db, 1) == 9
