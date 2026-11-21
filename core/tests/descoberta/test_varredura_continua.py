"""Varredura contínua: devida por sub-rede, uma por vez, mesmo ritmo, marcos no banco."""

import asyncio
from collections.abc import AsyncIterator
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi import FastAPI
from sqlalchemy import select

from sentinela.config import Settings
from sentinela.db.modelos import SubRede
from sentinela.descoberta.ajustes import VARREDURA_CONTINUA, gravar_ajuste
from sentinela.descoberta.varredura import Varredura
from sentinela.descoberta.varredura_continua import (
    ATRASO_INICIAL_S,
    TICK_S,
    VarreduraContinua,
    proxima_devida,
    registrar_fim,
)
from sentinela.main import criar_app
from sentinela.relogio import RelogioFalso
from tests.conftest import criar_esquema
from tests.descoberta.apoio import AGORA, SUB_VARREDURA, Cena, montar_cena
from tests.descoberta.test_varredura import PEQUENA, PingEspiao

OUTRA = "10.99.3.0/29"
MIN = timedelta(minutes=1)


@pytest.fixture
async def cena(tmp_path: Path) -> AsyncIterator[Cena]:
    async with montar_cena(tmp_path) as c:
        yield c


class Montagem:
    def __init__(self, cena: Cena) -> None:
        self.cena = cena
        self.ping = PingEspiao(cena)
        self.parede = AGORA

        async def ao_terminar(sub_rede_id: int, estado: str) -> None:
            await registrar_fim(cena.sessoes, sub_rede_id, estado, self.agora())

        self.varredura = Varredura(
            cena.sessoes,
            cena.guarda,
            cena.limitador,
            cena.barramento,
            cena.relogio,
            ping=self.ping,
            ao_terminar=ao_terminar,
        )
        self.continua = VarreduraContinua(cena.sessoes, self.varredura, cena.relogio, self.agora)
        cena.finalizar.append(self.varredura.encerrar)  # a tarefa nunca sobrevive à cena

    def agora(self):  # type: ignore[no-untyped-def]
        return self.parede

    async def passar(self, delta: timedelta) -> None:
        self.parede += delta

    async def terminar(self) -> None:
        for _ in range(2000):
            if self.varredura.progresso() is None:
                return
            await self.cena.relogio.avancar(0.5)
            await asyncio.sleep(0.005)  # o aiosqlite trabalha em thread real: cede tempo de verdade
        raise AssertionError("a varredura não terminou")

    async def marcos(self, cidr: str) -> tuple[object, object]:
        async with self.cena.sessoes() as db:
            sub = await db.scalar(select(SubRede).where(SubRede.cidr == cidr))
            assert sub is not None
            return sub.ultima_varredura_em, sub.linha_base_em


async def _preparar(
    cena: Cena, *, permite: bool = True, cidr: str = PEQUENA, limpar: bool = True
) -> int:
    """(Com ``limpar``) desliga as sub-redes de apoio; cria ou ajusta ``cidr``; devolve o id."""
    async with cena.sessoes() as db:
        if limpar:
            for sub in (await db.execute(select(SubRede))).scalars():
                sub.permite_varredura = False
        nova = await db.scalar(select(SubRede).where(SubRede.cidr == cidr))
        if nova is None:
            nova = SubRede(cidr=cidr)
            db.add(nova)
        nova.permite_varredura = permite
        await db.commit()
        return nova.id


@pytest.fixture
async def m(cena: Cena) -> Montagem:
    return Montagem(cena)


async def test_sub_rede_nunca_varrida_e_devida_no_primeiro_tick(cena: Cena, m: Montagem) -> None:
    sub = await _preparar(cena)
    assert await m.continua.ciclo() == sub
    progresso = m.varredura.progresso()
    assert progresso is not None and progresso["origem"] == "agendada"
    await m.terminar()
    ultima, base = await m.marcos(PEQUENA)
    assert ultima == AGORA and base == AGORA


async def test_respeita_30_min(cena: Cena, m: Montagem) -> None:
    sub = await _preparar(cena)
    assert await m.continua.ciclo() == sub
    await m.terminar()
    await m.passar(29 * MIN)
    assert await m.continua.ciclo() is None
    await m.passar(1 * MIN)
    assert await m.continua.ciclo() == sub
    await m.terminar()


@pytest.mark.parametrize("minutos", [15, 240])
async def test_intervalo_ajustado_15_e_240(cena: Cena, m: Montagem, minutos: int) -> None:
    async with cena.sessoes() as db:
        await gravar_ajuste(db, VARREDURA_CONTINUA, minutos)
        await db.commit()
    sub = await _preparar(cena)
    assert await m.continua.ciclo() == sub
    await m.terminar()
    await m.passar((minutos - 1) * MIN)
    assert await m.continua.ciclo() is None
    await m.passar(1 * MIN)
    assert await m.continua.ciclo() == sub
    await m.terminar()


async def test_sem_permite_varredura_nunca(cena: Cena, m: Montagem) -> None:
    await _preparar(cena, permite=False)
    for _ in range(3):
        assert await m.continua.ciclo() is None
        await m.passar(300 * MIN)
    assert m.ping.chamadas == []
    async with cena.sessoes() as db:
        assert await proxima_devida(db, m.agora(), 30 * MIN) is None


async def test_manual_em_curso_adia_sem_erro(cena: Cena, m: Montagem) -> None:
    sub = await _preparar(cena)
    await m.varredura.iniciar(sub, "manual")
    assert await m.continua.ciclo() is None  # adiada, sem exceção
    await m.terminar()
    # concluída a manual, o marco foi gravado: a agendada espera o intervalo
    assert await m.continua.ciclo() is None
    await m.passar(30 * MIN)
    assert await m.continua.ciclo() == sub  # tick seguinte
    await m.terminar()


async def test_manual_em_curso_com_sub_rede_devida_tenta_no_tick_seguinte(
    cena: Cena, m: Montagem
) -> None:
    primeira = await _preparar(cena)
    segunda = await _preparar(cena, cidr=OUTRA, limpar=False)
    await m.varredura.iniciar(primeira, "manual")
    assert await m.continua.ciclo() is None  # a segunda é devida, mas há uma em curso
    await m.terminar()
    assert await m.continua.ciclo() == segunda  # a primeira acabou de ser varrida
    await m.terminar()


async def test_cancelada_ou_falhou_so_volta_depois_do_intervalo(
    cena: Cena, m: Montagem, monkeypatch: pytest.MonkeyPatch
) -> None:
    sub = await _preparar(cena, cidr=SUB_VARREDURA)
    assert await m.continua.ciclo() == sub
    await cena.relogio.avancar(2)
    assert await m.varredura.revogar(sub) is True  # cancelada
    ultima, base = await m.marcos(SUB_VARREDURA)
    assert ultima == AGORA and base is None  # marco de tentativa, sem linha de base
    await m.passar(29 * MIN)
    assert await m.continua.ciclo() is None
    await m.passar(1 * MIN)
    assert await m.continua.ciclo() == sub

    async def estoura(*_a: object, **_k: object) -> None:
        raise RuntimeError("limitador")

    monkeypatch.setattr(cena.limitador, "adquirir", estoura)
    await m.terminar()  # falha logo no primeiro IP
    ultima, base = await m.marcos(SUB_VARREDURA)
    assert ultima == AGORA + 30 * MIN and base is None
    await m.passar(29 * MIN)
    assert await m.continua.ciclo() is None


async def test_uma_por_vez_nunca_varrida_primeiro(cena: Cena, m: Montagem) -> None:
    antiga = await _preparar(cena)
    nunca = await _preparar(cena, cidr=OUTRA, limpar=False)
    async with cena.sessoes() as db:
        sub = await db.get(SubRede, antiga)
        assert sub is not None
        sub.ultima_varredura_em = AGORA - 600 * MIN
        await db.commit()
    assert await m.continua.ciclo() == nunca  # nunca varrida antes da mais antiga
    assert await m.continua.ciclo() is None  # uma por vez
    await m.terminar()
    assert await m.continua.ciclo() == antiga
    await m.terminar()


async def test_empate_pelo_id(cena: Cena, m: Montagem) -> None:
    primeira = await _preparar(cena)
    await _preparar(cena, cidr=OUTRA, limpar=False)
    assert await m.continua.ciclo() == primeira
    await m.terminar()


async def test_linha_base_so_na_primeira_concluida(cena: Cena, m: Montagem) -> None:
    sub = await _preparar(cena)
    assert await m.continua.ciclo() == sub
    await m.terminar()
    _, base = await m.marcos(PEQUENA)
    assert base == AGORA
    await m.passar(30 * MIN)
    assert await m.continua.ciclo() == sub
    await m.terminar()
    ultima, base2 = await m.marcos(PEQUENA)
    assert base2 == AGORA and ultima == AGORA + 30 * MIN  # base intacta, última avança


async def test_registrar_fim_de_sub_rede_removida_e_ignorado(cena: Cena) -> None:
    await registrar_fim(cena.sessoes, 9999, "concluida", AGORA)


async def test_atraso_inicial_de_60s(cena: Cena, m: Montagem) -> None:
    assert (ATRASO_INICIAL_S, TICK_S) == (60.0, 60.0)
    await _preparar(cena)
    tarefa = asyncio.create_task(m.continua.executar())
    try:
        await cena.relogio.avancar(0)
        await cena.relogio.avancar(59)
        assert m.varredura.progresso() is None and m.ping.chamadas == []
        await cena.relogio.avancar(1)
        for _ in range(200):  # o ciclo lê o banco (I/O real, fora do relógio falso)
            if m.varredura.progresso() is not None:
                break
            await asyncio.sleep(0.01)
        assert m.varredura.progresso() is not None
        assert m.varredura.progresso()["origem"] == "agendada"  # type: ignore[index]
    finally:
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)
        await m.varredura.encerrar()


async def test_erro_no_ciclo_nao_derruba_o_laco(cena: Cena, m: Montagem) -> None:
    chamadas: list[int] = []

    async def ciclo() -> int | None:
        chamadas.append(1)
        raise RuntimeError("banco")

    m.continua.ciclo = ciclo  # type: ignore[method-assign]
    tarefa = asyncio.create_task(m.continua.executar())
    try:
        await cena.relogio.avancar(0)
        await cena.relogio.avancar(ATRASO_INICIAL_S)
        await cena.relogio.avancar(TICK_S)
        assert len(chamadas) == 2 and not tarefa.done()
    finally:
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)


async def test_demo_nao_inicia_o_laco(settings: Settings) -> None:
    demo = settings.model_copy(update={"demo": True})
    app: FastAPI = criar_app(demo, relogio=RelogioFalso())
    await criar_esquema(demo.banco_url)
    async with app.router.lifespan_context(app):
        nomes = [t.get_name() for t in app.state.tarefas_monitor]
        assert "sentinela-varredura-continua" not in nomes
        assert app.state.varredura_continua is None


async def test_fora_do_demo_inicia_o_laco(settings: Settings) -> None:
    app: FastAPI = criar_app(settings, relogio=RelogioFalso())
    await criar_esquema(settings.banco_url)
    async with app.router.lifespan_context(app):
        nomes = [t.get_name() for t in app.state.tarefas_monitor]
        assert "sentinela-varredura-continua" in nomes
        assert isinstance(app.state.varredura_continua, VarreduraContinua)
