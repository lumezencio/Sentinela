import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.base import Base
from sentinela.db.modelos import Amostra, Classe, Equipamento, Evento, Sessao, Usuario
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.monitor.limpeza import limpar
from sentinela.relogio import RelogioFalso

AGORA = datetime(2026, 6, 1, 12, 0, tzinfo=UTC)


@pytest.fixture
async def sessoes(tmp_path: Path) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    motor = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'l.db'}")
    async with motor.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    fabrica = fabrica_sessao(motor)
    async with fabrica() as s:
        await semear_classes(s)
        cid = (await s.execute(select(Classe.id).limit(1))).scalar_one()
        for n in (1, 2):
            s.add(
                Equipamento(
                    id=f"eq{n}",
                    nome=f"e{n}",
                    ip=f"10.99.0.{n}",
                    classe_id=cid,
                    estado_desde=AGORA,
                    criado_em=AGORA,
                )
            )
        s.add(Usuario(id=1, login="u", hash_senha="x", papel="admin"))
        await s.flush()
        for n in (1, 2):
            for horas in (1, 47, 49, 200):
                s.add(
                    Amostra(
                        equipamento_id=f"eq{n}",
                        ts=AGORA - timedelta(hours=horas),
                        latencia_ms=1.0,
                        ok=True,
                    )
                )
        for dias in (10, 364, 366):
            s.add(
                Evento(
                    equipamento_id="eq1",
                    de="online",
                    para="offline",
                    em=AGORA - timedelta(days=dias),
                )
            )
        s.add(Sessao(jti="valida", usuario_id=1, expira_em=AGORA + timedelta(hours=1)))
        s.add(Sessao(jti="expirada", usuario_id=1, expira_em=AGORA - timedelta(seconds=1)))
        s.add(
            Sessao(
                jti="revogada", usuario_id=1, expira_em=AGORA + timedelta(hours=1), revogada=True
            )
        )
        await s.commit()
    yield fabrica
    await motor.dispose()


async def _contar(sessoes: async_sessionmaker[AsyncSession], modelo: type[Base]) -> int:
    async with sessoes() as s:
        return (await s.execute(select(func.count()).select_from(modelo))).scalar_one()


async def test_limpar_aplica_retencao(sessoes: async_sessionmaker[AsyncSession]) -> None:
    r = await limpar(sessoes, AGORA)
    assert (r.amostras, r.eventos, r.sessoes) == (4, 1, 2)
    async with sessoes() as s:
        horas = sorted(
            int((AGORA - ts).total_seconds() // 3600)
            for ts in (await s.execute(select(Amostra.ts))).scalars()
        )
        assert horas == [1, 1, 47, 47]
        dias = sorted((AGORA - em).days for em in (await s.execute(select(Evento.em))).scalars())
        assert dias == [10, 364]
        assert list((await s.execute(select(Sessao.jti))).scalars()) == ["valida"]
    # idempotente
    assert await limpar(sessoes, AGORA) == type(r)(0, 0, 0)


async def test_limpar_periodicamente_ao_subir_e_uma_vez_por_dia(
    sessoes: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    from sentinela.monitor import limpeza

    feitas: asyncio.Queue[datetime] = asyncio.Queue()
    real = limpeza.limpar

    async def espiao(s: async_sessionmaker[AsyncSession], agora: datetime) -> object:
        r = await real(s, agora)
        feitas.put_nowait(agora)
        return r

    monkeypatch.setattr(limpeza, "limpar", espiao)
    relogio = RelogioFalso()
    parede = [AGORA - timedelta(hours=100)]  # ao subir, só a de 200 h já venceu
    tarefa = asyncio.create_task(
        limpeza.limpar_periodicamente(sessoes, relogio, lambda: parede[0], intervalo_s=86400)
    )
    try:
        await asyncio.wait_for(feitas.get(), timeout=5)
        assert await _contar(sessoes, Amostra) == 6
        parede[0] = AGORA
        await relogio.avancar(86399)
        assert feitas.empty()  # ainda não deu um dia
        await relogio.avancar(1)
        assert await asyncio.wait_for(feitas.get(), timeout=5) == AGORA
        assert await _contar(sessoes, Amostra) == 4
    finally:
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)


async def test_falha_na_limpeza_nao_para_o_laco(
    sessoes: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from sentinela.monitor import limpeza

    chamadas: list[datetime] = []

    async def quebrada(_s: object, agora: datetime) -> None:
        chamadas.append(agora)
        raise RuntimeError("banco fora")

    monkeypatch.setattr(limpeza, "limpar", quebrada)
    relogio = RelogioFalso()
    tarefa = asyncio.create_task(limpeza.limpar_periodicamente(sessoes, relogio, lambda: AGORA))
    try:
        await relogio.avancar(0)
        await relogio.avancar(86400)
        assert len(chamadas) == 2
        assert "falha na limpeza" in caplog.text
    finally:
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)
