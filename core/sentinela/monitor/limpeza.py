"""Retenção (§10): amostras por 48 h, eventos por 1 ano, leituras de uptime por 35 dias, sessões
expiradas ou revogadas.

Roda uma vez ao subir e depois uma vez por dia. As amostras são apagadas por equipamento
(cada DELETE usa a chave primária ``(equipamento_id, ts)`` e segura o bloqueio de escrita do
SQLite por pouco tempo), em vez de um DELETE único sobre a tabela inteira.
"""

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import (
    Alerta,
    Amostra,
    Equipamento,
    Evento,
    LeituraUptime,
    Sessao,
    Silencio,
)
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

RETER_AMOSTRAS = timedelta(hours=48)
RETER_EVENTOS = timedelta(days=365)
RETER_ALERTAS = timedelta(days=90)
RETER_UPTIME = timedelta(days=35)
INTERVALO_S = 24 * 3600.0


@dataclass(frozen=True)
class ResultadoLimpeza:
    amostras: int
    eventos: int
    sessoes: int
    alertas: int
    silencios: int
    leituras_uptime: int


async def limpar(sessoes: async_sessionmaker[AsyncSession], agora: datetime) -> ResultadoLimpeza:
    corte_amostras = agora - RETER_AMOSTRAS
    amostras = 0
    async with sessoes() as s:
        ids = list((await s.execute(select(Equipamento.id).order_by(Equipamento.id))).scalars())
    for eq_id in ids:  # uma transação curta por equipamento
        async with sessoes() as s, s.begin():
            r = await s.execute(
                delete(Amostra).where(Amostra.equipamento_id == eq_id, Amostra.ts < corte_amostras)
            )
            amostras += r.rowcount or 0  # type: ignore[attr-defined]
    async with sessoes() as s, s.begin():
        r_ev = await s.execute(delete(Evento).where(Evento.em < agora - RETER_EVENTOS))
        r_se = await s.execute(
            delete(Sessao).where(or_(Sessao.expira_em < agora, Sessao.revogada.is_(True)))
        )
        # alerta aberto nunca é apagado; silêncio só depois de encerrado ou vencido
        corte = agora - RETER_ALERTAS
        r_al = await s.execute(
            delete(Alerta).where(Alerta.fechado_em.is_not(None), Alerta.fechado_em < corte)
        )
        r_si = await s.execute(
            delete(Silencio).where(
                or_(
                    Silencio.fim < corte,
                    Silencio.encerrado_em.is_not(None) & (Silencio.encerrado_em < corte),
                )
            )
        )
    async with sessoes() as s, s.begin():
        r_up = await s.execute(
            delete(LeituraUptime).where(LeituraUptime.lido_em < agora - RETER_UPTIME)
        )
    return ResultadoLimpeza(
        amostras=amostras,
        eventos=r_ev.rowcount or 0,  # type: ignore[attr-defined]
        sessoes=r_se.rowcount or 0,  # type: ignore[attr-defined]
        alertas=r_al.rowcount or 0,  # type: ignore[attr-defined]
        silencios=r_si.rowcount or 0,  # type: ignore[attr-defined]
        leituras_uptime=r_up.rowcount or 0,  # type: ignore[attr-defined]
    )


async def limpar_periodicamente(
    sessoes: async_sessionmaker[AsyncSession],
    relogio: Relogio,
    agora_parede: Callable[[], datetime] = lambda: datetime.now(UTC),
    intervalo_s: float = INTERVALO_S,
) -> None:
    """Limpa já ao subir e depois a cada ``intervalo_s``; falha é registrada e não para o laço."""
    while True:
        try:
            r = await limpar(sessoes, agora_parede())
            log.info(
                "retenção aplicada",
                extra={
                    "amostras": r.amostras,
                    "eventos": r.eventos,
                    "sessoes": r.sessoes,
                    "alertas": r.alertas,
                    "silencios": r.silencios,
                    "leituras_uptime": r.leituras_uptime,
                },
            )
        except Exception:
            log.exception("falha na limpeza de retenção (nova tentativa no próximo ciclo)")
        await relogio.dormir(intervalo_s)
