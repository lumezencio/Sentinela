"""Limitador global (token bucket) do tráfego de sondagem na rede do cliente."""

import asyncio
from collections import deque
from dataclasses import dataclass
from typing import Literal, get_args

from sentinela.relogio import Relogio

_EPS = 1e-9
CUSTO_MAX = 3  # custo de uma checagem HTTP: a capacidade nunca fica abaixo disso

Prioridade = Literal["alta", "normal", "baixa"]
_NIVEL: dict[str, int] = {p: i for i, p in enumerate(get_args(Prioridade))}


@dataclass
class _Espera:
    custo: int
    futuro: asyncio.Future[None]
    nivel: int = _NIVEL["normal"]


class Limitador:
    """Token bucket global. O balde começa cheio: em qualquer janela de 1 s o consumo fica em
    no máximo ``capacidade + taxa`` (o teto vale "em regime", a rajada inicial é aceita).

    A fila tem três prioridades, FIFO dentro de cada uma: ``alta`` (reconfirmação de queda),
    ``normal`` (checagens periódicas, leitura de canais do gravador) e ``baixa`` (coleta de
    inventário, sondagem e varredura da descoberta). Baixa só é servida quando nenhuma alta
    ou normal espera: sob saturação a descoberta pode ficar parada indefinidamente, e isso é
    intencional (a detecção de queda nunca atrasa por causa dela). O teto é um só para todas.
    """

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
    def taxa(self) -> float:
        return self._taxa

    @property
    def capacidade(self) -> float:
        if self._capacidade_fixa is not None:
            return float(max(self._capacidade_fixa, CUSTO_MAX))
        return max(self._taxa, float(CUSTO_MAX))

    def definir_taxa(self, taxa: float) -> None:
        self._validar_taxa(taxa)
        self._reabastecer()  # contabiliza o período anterior com a taxa antiga
        self._taxa = taxa
        self._tokens = min(self._tokens, self.capacidade)
        self._reprogramar()

    async def adquirir(
        self,
        custo: int = 1,
        prioritario: bool = False,
        *,
        prioridade: Prioridade | None = None,
    ) -> None:
        """Espera fichas para ``custo``. ``prioritario=True`` (forma antiga) equivale a
        ``prioridade="alta"``; sem nenhum dos dois, ``"normal"``."""
        nivel = self._nivel(prioritario, prioridade)
        if custo <= 0:
            raise ValueError("custo deve ser positivo")
        if custo > self.capacidade:
            raise ValueError("custo maior que a capacidade do limitador")
        espera = _Espera(custo, asyncio.get_running_loop().create_future(), nivel)
        # atrás de todos do mesmo nível ou mais urgentes já esperando, à frente dos demais
        # (a fila fica ordenada por nível: o caso comum é só um append)
        if not self._fila or self._fila[-1].nivel <= nivel:
            self._fila.append(espera)
        else:
            posicao = sum(1 for e in self._fila if e.nivel <= nivel)
            self._fila.insert(posicao, espera)
        self._reprogramar()
        await espera.futuro

    @staticmethod
    def _nivel(prioritario: bool, prioridade: Prioridade | None) -> int:
        if prioridade is None:
            return _NIVEL["alta" if prioritario else "normal"]
        if prioritario:
            raise ValueError("use prioritario ou prioridade, não os dois")
        if prioridade not in _NIVEL:
            raise ValueError("prioridade inválida")
        return _NIVEL[prioridade]

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
            if cabeca.custo > self.capacidade:  # defesa: nunca travar a fila
                self._fila.popleft()
                cabeca.futuro.set_exception(ValueError("custo maior que a capacidade"))
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
