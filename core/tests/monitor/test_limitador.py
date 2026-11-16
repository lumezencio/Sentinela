import asyncio
from collections.abc import Awaitable

import pytest

from sentinela.monitor.limitador import Limitador
from sentinela.relogio import RelogioFalso


async def correr[T](relogio: RelogioFalso, coro: Awaitable[T]) -> T:
    """Roda a corrotina avançando o relógio falso até o próximo prazo, sem dormir de verdade."""
    tarefa = asyncio.ensure_future(coro)
    while not tarefa.done():
        await asyncio.sleep(0)
        prazo = relogio.proximo_prazo()
        if prazo is not None and not tarefa.done():
            await relogio.avancar_ate(prazo)
    return await tarefa


async def test_respeita_taxa() -> None:
    relogio = RelogioFalso()
    lim = Limitador(20, relogio)

    async def tudo() -> None:
        await asyncio.gather(*(lim.adquirir() for _ in range(200)))

    await correr(relogio, tudo())
    assert relogio.agora() >= 9.0 - 1e-6
    assert relogio.agora() < 9.5


async def test_custo_http_3() -> None:
    relogio = RelogioFalso()
    lim = Limitador(10, relogio)
    await lim.adquirir(10)  # esvazia o balde

    async def http() -> None:
        await lim.adquirir(3)

    await correr(relogio, http())
    assert relogio.agora() == pytest.approx(0.3)


async def test_custo_maior_que_capacidade_levanta() -> None:
    lim = Limitador(5, RelogioFalso())
    with pytest.raises(ValueError):
        await lim.adquirir(6)


async def test_prioritario_fura_fila() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)  # esvazia (capacidade mínima 3)
    ordem: list[str] = []

    async def pegar(nome: str, prioritario: bool) -> None:
        await lim.adquirir(prioritario=prioritario)
        ordem.append(nome)

    async def cenario() -> None:
        t1 = asyncio.create_task(pegar("normal1", False))
        await asyncio.sleep(0)
        t2 = asyncio.create_task(pegar("normal2", False))
        await asyncio.sleep(0)
        t3 = asyncio.create_task(pegar("prio", True))
        await asyncio.gather(t1, t2, t3)

    await correr(relogio, cenario())
    assert ordem == ["prio", "normal1", "normal2"]


async def test_definir_taxa_em_execucao() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)  # esvazia; próximo token em 1 s

    async def cenario() -> None:
        t = asyncio.create_task(lim.adquirir())
        await asyncio.sleep(0)
        lim.definir_taxa(10)  # acelera: deve liberar em ~0,1 s e não em 1 s
        await t

    await correr(relogio, cenario())
    assert relogio.agora() == pytest.approx(0.1)


async def test_taxa_invalida() -> None:
    with pytest.raises(ValueError):
        Limitador(0, RelogioFalso())


async def test_baixar_taxa_nao_trava_fila() -> None:
    relogio = RelogioFalso()
    lim = Limitador(10, relogio)
    await lim.adquirir(10)
    feitos: list[str] = []

    async def pegar(nome: str, custo: int) -> None:
        await lim.adquirir(custo)
        feitos.append(nome)

    async def cenario() -> None:
        t1 = asyncio.create_task(pegar("http", 3))
        await asyncio.sleep(0)
        lim.definir_taxa(1)  # capacidade continua >= 3
        t2 = asyncio.create_task(pegar("icmp", 1))
        await asyncio.gather(t1, t2)

    await correr(relogio, cenario())
    assert feitos == ["http", "icmp"]


async def test_cabeca_acima_da_capacidade_falha_sem_travar() -> None:
    relogio = RelogioFalso()
    lim = Limitador(5, relogio, capacidade=5)
    await lim.adquirir(5)
    t_forte = asyncio.create_task(lim.adquirir(3))
    await asyncio.sleep(0)
    lim._fila[0].custo = 99  # noqa: SLF001
    t_ok = asyncio.create_task(lim.adquirir(1))
    lim.definir_taxa(1)
    await correr(relogio, asyncio.wait([t_forte, t_ok]))
    with pytest.raises(ValueError):
        t_forte.result()
    assert t_ok.exception() is None


async def test_cancelar_cabeca_serve_proximo_sem_vazar_token() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)

    async def cenario() -> None:
        cabeca = asyncio.create_task(lim.adquirir())
        await asyncio.sleep(0)
        proximo = asyncio.create_task(lim.adquirir())
        await asyncio.sleep(0)
        cabeca.cancel()
        await proximo

    await correr(relogio, cenario())
    assert relogio.agora() == pytest.approx(1.0)  # o proximo pagou um token inteiro, sem sobra
