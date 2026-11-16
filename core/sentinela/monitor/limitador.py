"""Limitador global (token bucket) do tráfego de sondagem na rede do cliente."""

import asyncio
from collections import deque
from dataclasses import dataclass

from sentinela.relogio import Relogio

_EPS = 1e-9


@dataclass
class _Espera:
    custo: int
    futuro: asyncio.Future[None]
    prioritario: bool = False


class Limitador:
    def __init__(self, taxa: float, relogio: Relogio, capacidade: int | None = None) -> None:
        self._validar_taxa(taxa)
        self._relogio = relogio
        self._taxa = taxa
        self._capacidade_fixa = capacidade
        self._tokens = float(self.capacidade)
        self._ultimo = relogio.agora()
        self._fila: deque[_Espera] = deque()
        self._temporizador: asyncio.Task[None] | None = None

    @staticmethod
    def _validar_taxa(taxa: float) -> None:
        if taxa <= 0:
            raise ValueError("taxa deve ser positiva")

    @property
    def capacidade(self) -> float:
        return float(self._capacidade_fixa) if self._capacidade_fixa is not None else self._taxa

    def definir_taxa(self, taxa: float) -> None:
        self._validar_taxa(taxa)
        self._reabastecer()  # contabiliza o período anterior com a taxa antiga
        self._taxa = taxa
        self._tokens = min(self._tokens, self.capacidade)
        self._reprogramar()

    async def adquirir(self, custo: int = 1, prioritario: bool = False) -> None:
        if custo <= 0:
            raise ValueError("custo deve ser positivo")
        if custo > self.capacidade:
            raise ValueError("custo maior que a capacidade do limitador")
        espera = _Espera(custo, asyncio.get_running_loop().create_future(), prioritario)
        if prioritario:  # à frente dos normais, mas atrás dos prioritários já esperando
            posicao = sum(1 for e in self._fila if e.prioritario)
            self._fila.insert(posicao, espera)
        else:
            self._fila.append(espera)
        self._reprogramar()
        await espera.futuro

    def _reabastecer(self) -> None:
        agora = self._relogio.agora()
        self._tokens = min(self.capacidade, self._tokens + (agora - self._ultimo) * self._taxa)
        self._ultimo = agora

    def _reprogramar(self) -> None:
        if self._temporizador is not None:
            self._temporizador.cancel()
            self._temporizador = None
        self._servir()

    def _servir(self) -> None:
        self._reabastecer()
        while self._fila:
            cabeca = self._fila[0]
            if cabeca.futuro.done():  # chamador cancelou
                self._fila.popleft()
                continue
            if self._tokens + _EPS >= cabeca.custo:
                self._tokens = max(0.0, self._tokens - cabeca.custo)
                self._fila.popleft()
                cabeca.futuro.set_result(None)
                continue
            deficit = (cabeca.custo - self._tokens) / self._taxa
            self._temporizador = asyncio.get_running_loop().create_task(self._esperar(deficit))
            return

    async def _esperar(self, deficit: float) -> None:
        await self._relogio.dormir(deficit)
        self._temporizador = None
        self._servir()
