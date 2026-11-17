from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.base import Base
from sentinela.db.modelos import Amostra, Classe, Equipamento, Evento
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.monitor.estados import Estado, ResultadoChecagem, Transicao
from sentinela.monitor.gravador import GravadorSql

T0 = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)


@pytest.fixture
async def sessoes(tmp_path: Path) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    motor = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'g.db'}")
    async with motor.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    fabrica = fabrica_sessao(motor)
    async with fabrica() as s:
        await semear_classes(s)
        cid = (await s.execute(select(Classe.id).limit(1))).scalar_one()
        s.add(
            Equipamento(
                id="eq1",
                nome="câmera de teste",
                ip="10.99.0.10",
                classe_id=cid,
                estado="online",
                estado_desde=T0,
                criado_em=T0,
            )
        )
        await s.commit()
    yield fabrica
    await motor.dispose()


async def test_transicao_grava_evento_na_hora(sessoes: async_sessionmaker[AsyncSession]) -> None:
    g = GravadorSql(sessoes)
    em = T0 + timedelta(seconds=90)
    await g.registrar_transicao("eq1", Transicao(Estado.ONLINE, Estado.SUSPEITO), em)
    async with sessoes() as s:
        ev = (await s.execute(select(Evento))).scalar_one()
        eq = await s.get(Equipamento, "eq1")
    assert (ev.de, ev.para, ev.em) == ("online", "suspeito", em)
    assert ev.duracao_s == pytest.approx(90.0)
    assert eq is not None and eq.estado == "suspeito" and eq.estado_desde == em


async def test_transicao_grava_causa(sessoes: async_sessionmaker[AsyncSession]) -> None:
    g = GravadorSql(sessoes)
    await g.registrar_transicao(
        "eq1", Transicao(Estado.ONLINE, Estado.PAUSADO), T0, causa="fora_das_subredes"
    )
    async with sessoes() as s:
        ev = (await s.execute(select(Evento))).scalar_one()
    assert ev.causa == "fora_das_subredes"


async def test_transicao_de_equipamento_removido_e_ignorada(
    sessoes: async_sessionmaker[AsyncSession],
) -> None:
    g = GravadorSql(sessoes)
    await g.registrar_transicao("sumiu", Transicao(Estado.ONLINE, Estado.SUSPEITO), T0)
    async with sessoes() as s:
        assert (await s.execute(select(func.count()).select_from(Evento))).scalar_one() == 0


async def test_amostras_so_no_descarregar(sessoes: async_sessionmaker[AsyncSession]) -> None:
    g = GravadorSql(sessoes)
    g.acumular_amostra("eq1", ResultadoChecagem(True, 3.5), T0)
    g.acumular_amostra("eq1", ResultadoChecagem(False, None, "x"), T0 + timedelta(seconds=15))
    g.acumular_amostra("sumiu", ResultadoChecagem(True, 1.0), T0)
    async with sessoes() as s:
        assert (await s.execute(select(func.count()).select_from(Amostra))).scalar_one() == 0
    await g.descarregar()
    await g.descarregar()  # nada pendente: não duplica
    async with sessoes() as s:
        amostras = (await s.execute(select(Amostra).order_by(Amostra.ts))).scalars().all()
        eq = await s.get(Equipamento, "eq1")
    assert [(a.ok, a.latencia_ms) for a in amostras] == [(True, 3.5), (False, None)]
    assert eq is not None
    assert eq.visto_em == T0  # último sucesso
    assert eq.latencia_ms is None  # última amostra


async def test_amostra_repetida_no_mesmo_instante_nao_derruba_o_lote(
    sessoes: async_sessionmaker[AsyncSession],
) -> None:
    g = GravadorSql(sessoes)
    g.acumular_amostra("eq1", ResultadoChecagem(True, 1.0), T0)
    g.acumular_amostra("eq1", ResultadoChecagem(True, 2.0), T0)
    await g.descarregar()
    async with sessoes() as s:
        assert (await s.execute(select(func.count()).select_from(Amostra))).scalar_one() == 1


async def test_transicao_para_pausado_marca_flag_e_retomada_desmarca(
    sessoes: async_sessionmaker[AsyncSession],
) -> None:
    """Recusa do agendador (fora das sub-redes) persiste a pausa, não só o estado."""
    g = GravadorSql(sessoes)
    em = T0 + timedelta(seconds=30)
    await g.registrar_transicao(
        "eq1", Transicao(Estado.ONLINE, Estado.PAUSADO), em, causa="fora_das_subredes"
    )
    async with sessoes() as s:
        eq = await s.get(Equipamento, "eq1")
        assert eq is not None
        assert (eq.estado, eq.pausado) == ("pausado", True)
        ev = (await s.execute(select(Evento))).scalar_one()
        assert ev.causa == "fora_das_subredes"
    await g.registrar_transicao("eq1", Transicao(Estado.PAUSADO, Estado.DESCONHECIDO), em)
    async with sessoes() as s:
        eq = await s.get(Equipamento, "eq1")
        assert eq is not None
        assert (eq.estado, eq.pausado) == ("desconhecido", False)
    await g.registrar_transicao("eq1", Transicao(Estado.DESCONHECIDO, Estado.ONLINE), em)
    async with sessoes() as s:
        eq = await s.get(Equipamento, "eq1")
        assert eq is not None and eq.pausado is False
