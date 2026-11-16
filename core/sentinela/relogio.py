"""Relógio monotônico abstrato: real para produção, falso e determinístico para testes."""

import asyncio
import heapq
import itertools
import time
from typing import Protocol


class Relogio(Protocol):
    def agora(self) -> float: ...

    async def dormir(self, s: float) -> None: ...


class RelogioReal:
    def agora(self) -> float:
        return time.monotonic()

    async def dormir(self, s: float) -> None:
        await asyncio.sleep(s)


class RelogioFalso:
    """Tempo simulado: ``dormir`` só retorna quando ``avancar`` passa do prazo."""

    def __init__(self, inicio: float = 0.0) -> None:
        self._agora = inicio
        self._seq = itertools.count()
        self._dorminhocos: list[tuple[float, int, asyncio.Future[None]]] = []

    def agora(self) -> float:
        return self._agora

    def proximo_prazo(self) -> float | None:
        """Menor prazo ainda pendente (ignora dorminhocos cancelados), ou None."""
        while self._dorminhocos and self._dorminhocos[0][2].done():
            heapq.heappop(self._dorminhocos)
        return self._dorminhocos[0][0] if self._dorminhocos else None

    async def dormir(self, s: float) -> None:
        if s <= 0:
            await asyncio.sleep(0)
            return
        futuro: asyncio.Future[None] = asyncio.get_running_loop().create_future()
        heapq.heappush(self._dorminhocos, (self._agora + s, next(self._seq), futuro))
        await futuro

    async def avancar(self, s: float) -> None:
        """Avança o tempo e acorda, em ordem de prazo, quem estava dormindo."""
        alvo = self._agora + s
        while (prazo := self.proximo_prazo()) is not None and prazo <= alvo:
            _, _, futuro = heapq.heappop(self._dorminhocos)
            self._agora = max(self._agora, prazo)
            futuro.set_result(None)
            for _ in range(5):  # cede o laço para o acordado rodar (e talvez dormir de novo)
                await asyncio.sleep(0)
        self._agora = max(self._agora, alvo)
