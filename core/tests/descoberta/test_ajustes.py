from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.base import Base
from sentinela.db.modelos import Config
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.descoberta.ajustes import VARREDURA_CONTINUA, ler_ajustes


@pytest.fixture
async def sessoes(tmp_path: Path) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    motor = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'a.db'}")
    async with motor.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield fabrica_sessao(motor)
    await motor.dispose()


async def test_varredura_continua_padrao_30_e_limitada_de_15_a_240(
    sessoes: async_sessionmaker[AsyncSession],
) -> None:
    async def ler(valor: object | None) -> int:
        async with sessoes() as s, s.begin():
            antiga = await s.get(Config, VARREDURA_CONTINUA)
            if antiga is not None:
                await s.delete(antiga)
            if valor is not None:
                s.add(Config(chave=VARREDURA_CONTINUA, valor=valor))
        async with sessoes() as s:
            return (await ler_ajustes(s)).varredura_continua_min

    assert await ler(None) == 30
    assert await ler(15) == 15
    assert await ler(240) == 240
    assert await ler(60) == 60
    assert await ler(5) == 15  # abaixo da faixa: limitado
    assert await ler(1000) == 240  # acima: limitado
    assert await ler("rapido") == 30  # tipo errado: padrão
    assert await ler(True) == 30
