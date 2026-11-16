import asyncio

import pytest

from sentinela.relogio import RelogioFalso


async def _aninhado(n: int, relogio: RelogioFalso, s: float) -> None:
    if n == 0:
        await relogio.dormir(s)
        return
    await asyncio.create_task(_aninhado(n - 1, relogio, s))


async def test_cadeia_profunda_acorda_em_tempos_exatos() -> None:
    relogio = RelogioFalso()
    acordou: list[float] = []

    async def laco() -> None:
        for _ in range(3):
            await _aninhado(20, relogio, 1.0)
            acordou.append(relogio.agora())

    tarefa = asyncio.create_task(laco())
    await relogio.avancar_ate(10.0)
    await tarefa
    assert acordou == [1.0, 2.0, 3.0]
    assert relogio.agora() == 10.0


async def test_laco_sem_dormir_estoura() -> None:
    relogio = RelogioFalso()

    async def ocupado() -> None:
        while True:  # noqa: ASYNC110
            await asyncio.sleep(0)

    tarefa = asyncio.create_task(ocupado())
    with pytest.raises(RuntimeError):
        await relogio.avancar(1.0)
    tarefa.cancel()
    await asyncio.gather(tarefa, return_exceptions=True)
