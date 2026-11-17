"""Modo demonstração da descoberta: fontes simuladas, ~40 pendentes e nenhum socket."""

import socket
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager
from typing import Any

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.config import Settings
from sentinela.db.modelos import Descoberta, Equipamento, Fonte, SubRede
from sentinela.demo.simulador import banco_e_demo, gerar_rede
from sentinela.descoberta.fontes.simulada import (
    _MIKROTIK,
    _SNMP,
    CANAL_OFFLINE,
    TOTAL_CANAIS,
    mac_canal,
)
from sentinela.main import criar_app
from sentinela.monitor.estados import Estado
from sentinela.relogio import RelogioFalso
from tests.conftest import criar_esquema


@pytest.fixture
def settings_demo(settings: Settings) -> Settings:
    return settings.model_copy(update={"demo": True})


@contextmanager
def _sem_socket(chamadas: list[Any]) -> Iterator[None]:
    """Qualquer socket novo levanta (e é contado); restaura antes do laço fechar.

    Troca por uma SUBCLASSE (não por uma função): o laço do asyncio no Windows faz
    ``isinstance(..., socket.socket)`` nos sockets que já tem.
    """
    original_socket, original_conexao = socket.socket, socket.create_connection

    class Proibido(original_socket):  # type: ignore[misc,valid-type]
        def __init__(self, *a: Any, **k: Any) -> None:
            chamadas.append(a)
            raise AssertionError("socket aberto no modo demonstração")

    def conexao_proibida(*a: Any, **k: Any) -> None:
        chamadas.append(a)
        raise AssertionError("socket aberto no modo demonstração")

    socket.socket = Proibido  # type: ignore[misc]
    socket.create_connection = conexao_proibida  # type: ignore[assignment]
    try:
        yield
    finally:
        socket.socket = original_socket  # type: ignore[misc]
        socket.create_connection = original_conexao


def test_macs_e_ips_simulados_nao_colidem_com_a_rede_demo() -> None:
    rede = gerar_rede()
    macs = {e.mac for e in rede}
    ips = {e.ip for e in rede}
    simulados = [*_MIKROTIK, *_SNMP]
    assert not {mac for _, mac, *_ in simulados} & macs
    assert not {mac_canal(n) for n in range(1, TOTAL_CANAIS + 1)} & macs
    assert not {ip for ip, *_ in simulados} & ips
    assert all(mac.startswith("02:00:00:") for _, mac, *_ in simulados)
    assert all(ip.startswith("10.99.") for ip, *_ in simulados)


async def test_demo_semeia_cerca_de_40_pendentes_sem_rede(settings_demo: Settings) -> None:
    app = criar_app(settings_demo, relogio=RelogioFalso(), iniciar_monitor=False)
    await criar_esquema(settings_demo.banco_url)
    chamadas: list[Any] = []
    async with app.router.lifespan_context(app), _sem_socket_async(chamadas):
        sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
        orq = app.state.orquestrador
        await orq.coletar_todas()
        async with sessoes() as db:
            fontes = list((await db.execute(select(Fonte))).scalars())
            pendentes = list(
                (
                    await db.execute(select(Descoberta).where(Descoberta.status == "pendente"))
                ).scalars()
            )
            gravador = await db.scalar(select(Equipamento).where(Equipamento.ip == "10.99.50.10"))
        assert len(fontes) == 3 and {f.tipo for f in fontes} == {"simulada"}
        assert all(f.ultimo_erro is None and f.ultima_coleta is not None for f in fontes)
        assert 35 <= len(pendentes) <= 45
        canais = [d for d in pendentes if d.chave.startswith("nvr:")]
        assert len(canais) == TOTAL_CANAIS
        assert gravador is not None
        assert {d.pai_equipamento_id for d in canais} == {gravador.id}
        assert sum(d.fora_das_subredes for d in pendentes) == 1
        assert all(d.sinais.get("motivos") is not None for d in pendentes)
        # as fontes MikroTik e SNMP veem os mesmos 4 computadores: uma descoberta cada
        assert len({d.mac for d in pendentes}) == len(pendentes)

        # aprovar duas câmeras do gravador simulado: o estado vem da leitura de canais
        por_canal = {d.canal: d for d in canais}
        async with sessoes() as db:
            ok = await orq.aprovar(db, por_canal[1].id, None, None, None)
        async with sessoes() as db:
            off = await orq.aprovar(db, por_canal[CANAL_OFFLINE].id, None, None, None)
        assert ok.pai_id == gravador.id and ok.checagem == "gravador"
        await app.state.leitor_canais.ciclo()
        agendador = app.state.agendador
        assert agendador.estado_de(ok.id) is Estado.ONLINE
        assert agendador.estado_de(off.id) is Estado.SUSPEITO
        assert await orq.total_pendentes() == len(pendentes) - 2

        # testar e varrer também não abrem socket
        resultado = await orq.testar(fontes[0].id)
        assert resultado.ok
        sub = await _sub_rede_com_varredura(sessoes)
        progresso = await app.state.varredura.iniciar(sub)
        assert progresso["total"] == 256
        await app.state.varredura.encerrar()
        # o banco continua reconhecido como demonstração (reiniciar a demo funciona)
        assert await banco_e_demo(sessoes)
    assert chamadas == []


async def _sub_rede_com_varredura(sessoes: async_sessionmaker[AsyncSession]) -> int:
    async with sessoes() as db:
        sub = await db.scalar(select(SubRede).where(SubRede.cidr == "10.99.60.0/24"))
        assert sub is not None
        sub.permite_varredura = True
        await db.commit()
        return sub.id


@asynccontextmanager
async def _sem_socket_async(chamadas: list[Any]) -> AsyncIterator[None]:
    with _sem_socket(chamadas):
        yield


async def test_fontes_demo_semeadas_uma_vez(settings_demo: Settings) -> None:
    await criar_esquema(settings_demo.banco_url)
    for _ in range(2):
        app = criar_app(settings_demo, relogio=RelogioFalso(), iniciar_monitor=False)
        async with app.router.lifespan_context(app):
            async with app.state.sessoes() as db:
                total = await db.scalar(select(func.count()).select_from(Fonte))
            assert total == 3


async def test_fora_da_demo_nao_semeia_fontes(settings: Settings) -> None:
    await criar_esquema(settings.banco_url)
    app = criar_app(settings, relogio=RelogioFalso(), iniciar_monitor=False)
    async with app.router.lifespan_context(app):
        async with app.state.sessoes() as db:
            assert await db.scalar(select(func.count()).select_from(Fonte)) == 0
        assert app.state.orquestrador is not None and app.state.varredura is not None
