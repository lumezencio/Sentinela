"""Varredura contínua (Fase 5): a cada tick, inicia a varredura lenta da próxima sub-rede
devida, reusando a mesma ``Varredura`` (2 IPs/s, releitura de permissão, cancelamento).

- Devida = ``permite_varredura`` e ``ultima_varredura_em`` nula ou com idade ≥ intervalo
  (``varredura_continua_min``, 15–240 min, padrão 30). Nunca varrida primeiro, depois a mais
  antiga, empate pelo ``id``.
- Uma por vez: se há varredura em curso (manual ou agendada), adia para o tick seguinte.
- ``registrar_fim`` (gancho ``ao_terminar`` da ``Varredura``): qualquer estado final grava
  ``ultima_varredura_em``; só a primeira ``concluida`` grava ``linha_base_em``.
"""

import logging
from collections.abc import Callable
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import SubRede
from sentinela.descoberta.ajustes import ler_ajustes
from sentinela.descoberta.varredura import (
    Varredura,
    VarreduraEmAndamento,
    VarreduraNaoPermitida,
)
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

TICK_S = 60.0
ATRASO_INICIAL_S = 60.0


async def registrar_fim(
    sessoes: async_sessionmaker[AsyncSession], sub_rede_id: int, estado: str, agora: datetime
) -> None:
    async with sessoes() as db:
        sub = await db.get(SubRede, sub_rede_id)
        if sub is None:  # removida durante a varredura
            return
        sub.ultima_varredura_em = agora
        if estado == "concluida" and sub.linha_base_em is None:
            sub.linha_base_em = agora
        await db.commit()


async def proxima_devida(db: AsyncSession, agora: datetime, intervalo: timedelta) -> int | None:
    limite = agora - intervalo
    return await db.scalar(
        select(SubRede.id)
        .where(
            SubRede.permite_varredura.is_(True),
            (SubRede.ultima_varredura_em.is_(None)) | (SubRede.ultima_varredura_em <= limite),
        )
        .order_by(
            SubRede.ultima_varredura_em.is_(None).desc(),
            SubRede.ultima_varredura_em,
            SubRede.id,
        )
        .limit(1)
    )


class VarreduraContinua:
    def __init__(
        self,
        sessoes: async_sessionmaker[AsyncSession],
        varredura: Varredura,
        relogio: Relogio,
        agora_parede: Callable[[], datetime],
    ) -> None:
        self._sessoes = sessoes
        self._varredura = varredura
        self._relogio = relogio
        self._agora_parede = agora_parede

    async def ciclo(self) -> int | None:
        """Inicia a varredura agendada da próxima sub-rede devida; devolve o id ou None."""
        if self._varredura.progresso() is not None:
            return None
        async with self._sessoes() as db:
            ajustes = await ler_ajustes(db)
            sub_rede_id = await proxima_devida(
                db, self._agora_parede(), timedelta(minutes=ajustes.varredura_continua_min)
            )
        if sub_rede_id is None:
            return None
        try:
            await self._varredura.iniciar(sub_rede_id, "agendada")
        except (VarreduraEmAndamento, VarreduraNaoPermitida):
            return None  # tenta de novo no tick seguinte
        return sub_rede_id

    async def executar(self) -> None:
        await self._relogio.dormir(ATRASO_INICIAL_S)
        while True:
            try:
                await self.ciclo()
            except Exception as e:  # noqa: BLE001 - um tick ruim não derruba o laço
                log.error("ciclo da varredura contínua falhou: %s", type(e).__name__)
            await self._relogio.dormir(TICK_S)
