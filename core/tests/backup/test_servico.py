import asyncio
import threading
import time
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.backup import servico as mod
from sentinela.backup.arquivo import ErroBackup, criar_backup, listar
from sentinela.backup.servico import ServicoBackup, proximo_disparo
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.relogio import RelogioFalso
from tests.conftest import criar_esquema

SP = ZoneInfo("America/Sao_Paulo")


def test_proximo_disparo_3h_no_fuso() -> None:
    # 09:00 em São Paulo: o próximo 03:00 é amanhã (06:00 UTC)
    assert proximo_disparo(datetime(2026, 11, 18, 12, 0, tzinfo=UTC), SP) == datetime(
        2026, 11, 19, 6, 0, tzinfo=UTC
    )
    # 02:00 em São Paulo: ainda hoje
    assert proximo_disparo(datetime(2026, 11, 18, 5, 0, tzinfo=UTC), SP) == datetime(
        2026, 11, 18, 6, 0, tzinfo=UTC
    )
    # exatamente 03:00: o seguinte (nunca o mesmo instante)
    assert proximo_disparo(datetime(2026, 11, 18, 6, 0, tzinfo=UTC), SP) == datetime(
        2026, 11, 19, 6, 0, tzinfo=UTC
    )


def test_proximo_disparo_com_horario_de_verao() -> None:
    ny = ZoneInfo("America/New_York")  # 2026-11-01: 02:00 EDT volta para 01:00 EST
    primeiro = proximo_disparo(datetime(2026, 11, 1, 4, 0, tzinfo=UTC), ny)  # 00:00 EDT
    assert primeiro == datetime(2026, 11, 1, 8, 0, tzinfo=UTC)  # 03:00 EST
    assert primeiro.astimezone(ny).strftime("%H:%M") == "03:00"
    # uma vez só: depois de disparar, o seguinte é o dia 2 às 03:00 locais
    segundo = proximo_disparo(primeiro, ny)
    assert segundo == datetime(2026, 11, 2, 8, 0, tzinfo=UTC)
    # na véspera ainda vale o horário de verão (EDT, UTC-4): 03:00 locais = 07:00 UTC
    assert proximo_disparo(datetime(2026, 10, 31, 2, 0, tzinfo=UTC), ny) == datetime(
        2026, 10, 31, 7, 0, tzinfo=UTC
    )


class Montagem:
    def __init__(self, tmp_path: Path, sessoes: async_sessionmaker[AsyncSession], inicio: datetime):
        self.banco = tmp_path / "teste.db"
        self.destino = tmp_path / "backups"
        self.relogio = RelogioFalso()
        self.inicio = inicio
        self.sessoes = sessoes
        self.servico = ServicoBackup(
            sessoes, self.banco, self.destino, self.relogio, self.agora, SP, "0.4.0"
        )

    def agora(self) -> datetime:
        return self.inicio + timedelta(seconds=self.relogio.agora())

    async def acalmar(self) -> None:
        """Espera o laço voltar a dormir no relógio falso (as threads do backup são reais)."""
        for _ in range(500):
            await asyncio.sleep(0.02)
            if self.relogio.proximo_prazo() is not None:
                return
        raise AssertionError("o laço do backup não voltou a dormir")

    async def avancar_ate(self, quando: datetime) -> None:
        await self.relogio.avancar_ate((quando - self.inicio).total_seconds())
        await self.acalmar()

    def nomes(self) -> list[str]:
        return sorted(i.nome for i in listar(self.destino))


@pytest.fixture
async def m(tmp_path: Path) -> AsyncIterator[Montagem]:
    url = f"sqlite+aiosqlite:///{tmp_path / 'teste.db'}"
    await criar_esquema(url)
    motor = criar_motor(url)
    yield Montagem(tmp_path, fabrica_sessao(motor), datetime(2026, 11, 21, 0, 0, tzinfo=UTC))
    await motor.dispose()


async def test_executar_cria_um_diario_por_dia_e_semanal_no_domingo(m: Montagem) -> None:
    # sábado 21/11 às 00:00 UTC; já existe um backup recente (nada de recuperação)
    criar_backup(m.banco, m.destino, "manual", m.inicio - timedelta(hours=1), "0.4.0")
    tarefa = asyncio.create_task(m.servico.executar())
    try:
        await m.acalmar()
        await m.avancar_ate(datetime(2026, 11, 21, 6, 0, tzinfo=UTC))  # sáb 03:00 em SP
        assert [i.tipo for i in listar(m.destino) if i.tipo != "manual"] == ["diario"]
        await m.avancar_ate(datetime(2026, 11, 22, 6, 0, tzinfo=UTC))  # dom 03:00 em SP
        tipos = sorted(i.tipo for i in listar(m.destino) if i.tipo != "manual")
        assert tipos == ["diario", "diario", "semanal"]
        await m.avancar_ate(datetime(2026, 11, 23, 6, 0, tzinfo=UTC))  # seg: só diário
        tipos = sorted(i.tipo for i in listar(m.destino) if i.tipo != "manual")
        assert tipos == ["diario", "diario", "diario", "semanal"]
    finally:
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)
    async with m.sessoes() as db:
        estado = await m.servico.status(db)
    assert estado["ultimo_erro"] is None and estado["ultimo_tamanho"] > 0
    assert len(estado["copias"]) == 5


async def test_recupera_backup_perdido_ao_subir(m: Montagem) -> None:
    antigo = m.inicio - timedelta(hours=27)
    criar_backup(m.banco, m.destino, "diario", antigo, "0.4.0")
    tarefa = asyncio.create_task(m.servico.executar())
    try:
        await m.acalmar()
        await m.relogio.avancar(59)
        await asyncio.sleep(0.2)
        assert len(m.nomes()) == 1  # ainda não
        await m.relogio.avancar(1)
        await m.acalmar()
        assert len(m.nomes()) == 2  # rodou aos 60 s
    finally:
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)


async def test_nao_recupera_se_o_ultimo_tem_menos_de_26h(m: Montagem) -> None:
    criar_backup(m.banco, m.destino, "diario", m.inicio - timedelta(hours=10), "0.4.0")
    tarefa = asyncio.create_task(m.servico.executar())
    try:
        await m.acalmar()
        await m.relogio.avancar(120)
        await asyncio.sleep(0.2)
        assert len(m.nomes()) == 1
    finally:
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)


async def test_dois_criar_simultaneos_rodam_em_fila(
    m: Montagem, monkeypatch: pytest.MonkeyPatch
) -> None:
    ativos = 0
    maximo = 0
    trava = threading.Lock()
    contador = iter(range(1, 100))
    real = mod.criar_backup

    def observado(*args: Any) -> Path:
        nonlocal ativos, maximo
        with trava:
            ativos += 1
            maximo = max(maximo, ativos)
        time.sleep(0.15)
        try:
            return real(*args)
        finally:
            with trava:
                ativos -= 1

    monkeypatch.setattr(mod, "criar_backup", observado)
    m.servico._agora = lambda: m.inicio + timedelta(seconds=next(contador))  # noqa: SLF001
    a, b = await asyncio.gather(m.servico.criar("manual"), m.servico.criar("manual"))
    assert maximo == 1
    assert a.nome != b.nome and len(m.nomes()) == 2


async def test_erro_vira_status_com_texto_fixo(
    m: Montagem, monkeypatch: pytest.MonkeyPatch
) -> None:
    criar = m.servico.criar
    await criar("manual")  # um sucesso antes: o status guarda o último bom

    def explode(*_a: object) -> Path:
        raise RuntimeError("/dados/segredo-interno falhou")

    monkeypatch.setattr(mod, "criar_backup", explode)
    with pytest.raises(ErroBackup) as e:
        await criar("manual")
    assert "segredo" not in str(e.value)
    async with m.sessoes() as db:
        estado = await m.servico.status(db)
    assert estado["ultimo_erro"] == "Não foi possível fazer o backup."
    assert estado["ultimo_em"] is not None  # o último sucesso continua registrado
    monkeypatch.undo()
    await criar("manual")
    async with m.sessoes() as db:
        assert (await m.servico.status(db))["ultimo_erro"] is None


async def test_erro_conhecido_mantem_o_texto_fixo_dele(
    m: Montagem, monkeypatch: pytest.MonkeyPatch
) -> None:
    def sem_espaco(*_a: object) -> Path:
        raise ErroBackup("Sem espaço em disco para o backup.")

    monkeypatch.setattr(mod, "criar_backup", sem_espaco)
    with pytest.raises(ErroBackup):
        await m.servico.criar("diario")
    async with m.sessoes() as db:
        assert (await m.servico.status(db))["ultimo_erro"] == "Sem espaço em disco para o backup."
