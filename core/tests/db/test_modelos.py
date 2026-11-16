import subprocess
import sys
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from sentinela.db.base import Base
from sentinela.db.modelos import Classe, Equipamento
from sentinela.db.sementes import CLASSES_PADRAO, semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao

NUCLEO = Path(__file__).resolve().parents[2]


@pytest.fixture
async def motor(tmp_path: Path) -> AsyncIterator[AsyncEngine]:
    m = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'm.db'}")
    async with m.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield m
    await m.dispose()


@pytest.fixture
def sessoes(motor: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return fabrica_sessao(motor)


def _equip(ip: str, mac: str | None, classe_id: int) -> Equipamento:
    agora = datetime.now(UTC)
    return Equipamento(
        nome=f"dispositivo {ip}",
        ip=ip,
        mac=mac,
        classe_id=classe_id,
        classe_origem="manual",
        checagem="icmp",
        estado_desde=agora,
        criado_em=agora,
    )


async def test_wal_ativo(motor: AsyncEngine) -> None:
    async with motor.connect() as conn:
        assert (await conn.execute(text("PRAGMA journal_mode"))).scalar_one() == "wal"
        assert (await conn.execute(text("PRAGMA foreign_keys"))).scalar_one() == 1
        assert (await conn.execute(text("PRAGMA busy_timeout"))).scalar_one() == 5000


async def test_semear_classes_idempotente(sessoes: async_sessionmaker[AsyncSession]) -> None:
    async with sessoes() as s:
        await semear_classes(s)
        await semear_classes(s)
        total = (await s.execute(select(func.count()).select_from(Classe))).scalar_one()
        criticas = (
            await s.execute(select(func.count()).select_from(Classe).where(Classe.critica))
        ).scalar_one()
    assert total == 12 == len(CLASSES_PADRAO)
    assert criticas == 5


async def test_ip_unico(sessoes: async_sessionmaker[AsyncSession]) -> None:
    async with sessoes() as s:
        await semear_classes(s)
        cid = (await s.execute(select(Classe.id).limit(1))).scalar_one()
        s.add(_equip("10.99.0.10", None, cid))
        await s.commit()
        s.add(_equip("10.99.0.10", None, cid))
        with pytest.raises(IntegrityError):
            await s.commit()


async def test_mac_unico_quando_presente(sessoes: async_sessionmaker[AsyncSession]) -> None:
    async with sessoes() as s:
        await semear_classes(s)
        cid = (await s.execute(select(Classe.id).limit(1))).scalar_one()
        s.add(_equip("10.99.0.10", "02:00:00:00:00:01", cid))
        await s.commit()
        s.add(_equip("10.99.0.11", "02:00:00:00:00:01", cid))
        with pytest.raises(IntegrityError):
            await s.commit()


async def test_mac_nulo_repetido_permitido(sessoes: async_sessionmaker[AsyncSession]) -> None:
    async with sessoes() as s:
        await semear_classes(s)
        cid = (await s.execute(select(Classe.id).limit(1))).scalar_one()
        s.add_all([_equip("10.99.0.10", None, cid), _equip("10.99.0.11", None, cid)])
        await s.commit()
        assert (await s.execute(select(func.count()).select_from(Equipamento))).scalar_one() == 2


async def test_datas_voltam_com_fuso_utc(sessoes: async_sessionmaker[AsyncSession]) -> None:
    async with sessoes() as s:
        await semear_classes(s)
        cid = (await s.execute(select(Classe.id).limit(1))).scalar_one()
        e = _equip("10.99.0.10", None, cid)
        s.add(e)
        await s.commit()
    async with sessoes() as s2:
        lido = (await s2.execute(select(Equipamento))).scalar_one()
        assert lido.criado_em.tzinfo is not None
        assert lido.criado_em.utcoffset() is not None
        assert lido.estado == "desconhecido"
        assert lido.pausado is False


def test_migracao_igual_aos_modelos(tmp_path: Path) -> None:
    arquivo = tmp_path / "mig.db"
    r = subprocess.run(  # noqa: S603
        [
            sys.executable,
            "-m",
            "alembic",
            "-x",
            f"url=sqlite+aiosqlite:///{arquivo}",
            "upgrade",
            "head",
        ],
        cwd=NUCLEO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert r.returncode == 0, r.stderr
    motor = create_engine(f"sqlite:///{arquivo}")
    with motor.connect() as conn:
        diffs = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    motor.dispose()
    assert diffs == []
