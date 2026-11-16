"""Barramento pub/sub em memória: publicar nunca bloqueia; assinante lento perde as mais antigas."""

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any


@dataclass
class Mensagem:
    tipo: str
    dados: dict[str, Any]


class _Fluxo:
    def __init__(self, fila: asyncio.Queue[Mensagem]) -> None:
        self._fila = fila

    def __aiter__(self) -> "_Fluxo":
        return self

    async def __anext__(self) -> Mensagem:
        return await self._fila.get()


class Barramento:
    def __init__(self, tamanho_fila: int = 1000) -> None:
        self._tamanho_fila = tamanho_fila
        self._assinantes: set[asyncio.Queue[Mensagem]] = set()

    @property
    def total_assinantes(self) -> int:
        return len(self._assinantes)

    def publicar(self, msg: Mensagem) -> None:
        for fila in self._assinantes:
            if fila.full():
                fila.get_nowait()  # descarta a mais antiga
            fila.put_nowait(msg)

    @asynccontextmanager
    async def assinar(self) -> AsyncIterator[AsyncIterator[Mensagem]]:
        fila: asyncio.Queue[Mensagem] = asyncio.Queue(maxsize=self._tamanho_fila)
        self._assinantes.add(fila)
        try:
            yield _Fluxo(fila)
        finally:
            self._assinantes.discard(fila)
