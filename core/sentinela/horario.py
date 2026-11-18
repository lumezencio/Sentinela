"""Fuso e formatação de horário para textos (Telegram, telão, painel).

O banco e a lógica ficam em UTC; o fuso configurado só vale para o que o humano lê e para os
atalhos de silêncio.
"""

from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sentinela.config import Settings


def zona(settings: Settings) -> ZoneInfo:
    return ZoneInfo(settings.fuso)


def hora_local(dt: datetime, fuso: ZoneInfo) -> str:
    """``"14:32"`` no fuso dado."""
    return dt.astimezone(fuso).strftime("%H:%M")


def formatar_duracao(segundos: float) -> str:
    """``40 s``, ``1 min 40 s``, ``18 min``, ``2 h 5 min``, ``2 h`` (sem parte zerada)."""
    total = max(0, round(segundos))
    horas, resto = divmod(total, 3600)
    minutos, seg = divmod(resto, 60)
    if horas:
        return f"{horas} h {minutos} min" if minutos else f"{horas} h"
    if minutos:
        return f"{minutos} min {seg} s" if seg else f"{minutos} min"
    return f"{seg} s"


def amanha_8h(agora: datetime, fuso: ZoneInfo) -> datetime:
    """Próximo dia, 08:00 no fuso dado, devolvido em UTC (correto na troca de horário de verão)."""
    amanha = agora.astimezone(fuso).date() + timedelta(days=1)
    return datetime.combine(amanha, time(8, 0), tzinfo=fuso).astimezone(UTC)
