"""Tempo ligado (uptime) dos equipamentos lidos pelas fontes já cadastradas.

Serve ao Diagnóstico: a prova de que o roteador reiniciou é o relógio de uptime voltar atrás
(o instante de boot estimado, ``lido_em - uptime``, avança). O ``sysUpTime`` do SNMP é um
TimeTicks de 32 bits (centésimos de segundo) e dá a volta a cada ~497 dias: a volta não é
reinício. Nada aqui toca a rede; só interpreta e grava o que o coletor já leu.
"""

import math
import re
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import LeituraUptime

TETO_TIMETICKS_S = 2**32 / 100  # ~497 dias
TOLERANCIA_S = 120.0  # mantida na interface; a detecção não usa mais o relógio
MARGEM_VOLTA_S = 86400.0  # queda é volta de 32 bits: anterior >= TETO - margem e novo <= margem
MAXIMO_S = 10 * 365 * 86400.0

_UNIDADES = {"w": 604800, "d": 86400, "h": 3600, "m": 60, "s": 1}
_TEMPO = re.compile(r"(\d+)([wdhms])")


@dataclass(frozen=True)
class Leitura:
    lido_em: datetime
    uptime_s: float


def ler_uptime_mikrotik(texto: str) -> float | None:
    """``1w2d3h4m5s`` → segundos. Qualquer coisa fora desse formato → ``None``."""
    texto = (texto or "").strip()
    if not texto or len(texto) > 40:
        return None
    total, pos = 0, 0
    for achado in _TEMPO.finditer(texto):
        if achado.start() != pos:
            return None
        total += int(achado.group(1)) * _UNIDADES[achado.group(2)]
        pos = achado.end()
    return float(total) if pos == len(texto) else None


def _deu_a_volta(anterior: Leitura, nova: Leitura) -> bool:
    """A queda é a volta do contador de 32 bits: o uptime anterior estava a ``MARGEM_VOLTA_S``
    do teto e o novo é pequeno. Não olha o relógio do servidor (``lido_em``)."""
    return (
        anterior.uptime_s >= TETO_TIMETICKS_S - MARGEM_VOLTA_S and nova.uptime_s <= MARGEM_VOLTA_S
    )


def reinicios(leituras: list[Leitura]) -> list[datetime]:
    """Instantes de boot (estimados) de cada reinício visto entre leituras consecutivas.

    Só vale o que o próprio roteador informa: reinício = o uptime lido é MENOR que o da leitura
    anterior e a queda não é a volta do contador de 32 bits. O relógio do servidor não decide
    nada: "o uptime cresceu menos que o tempo decorrido" depende do relógio (um Raspberry Pi sem
    RTC salta quando o NTP sincroniza) e por isso nunca é tratado como reinício.

    ``leituras`` vem na ORDEM DE INSERÇÃO (``LeituraUptime.id``, autoincremento), não ordenada
    por ``lido_em``: um recuo do relógio do servidor não pode reordenar as leituras e inventar
    um reinício.

    A volta do contador (~497 dias) é reconhecida sem o relógio: uptime anterior a até um dia
    do teto e novo de até um dia (``MARGEM_VOLTA_S``). Toda outra queda é reinício.

    Limites conhecidos (sem leitura que confirme, o laudo continua em "provável"):
    - dois reinícios entre duas leituras consecutivas contam como um só (o uptime só mostra o
      último boot);
    - um reinício cujo uptime novo já passou do uptime da leitura anterior não é visto;
    - um reinício real com uptime anterior a até um dia do teto e novo de até um dia é
      indistinguível da volta do contador e conta como volta.
    """
    ordenadas = leituras  # ordem de inserção, nunca por lido_em
    saida: list[datetime] = []
    for anterior, nova in zip(ordenadas, ordenadas[1:], strict=False):
        if nova.uptime_s >= anterior.uptime_s or _deu_a_volta(anterior, nova):
            continue
        saida.append(nova.lido_em - timedelta(seconds=nova.uptime_s))
    return saida


async def registrar_leitura(
    db: AsyncSession, fonte_id: str, equipamento_id: str, uptime_s: float, lido_em: datetime
) -> None:
    """Acrescenta a leitura à sessão (sem commit). Valor negativo, não finito ou absurdo cai."""
    if not math.isfinite(uptime_s) or uptime_s < 0 or uptime_s > MAXIMO_S:
        return
    db.add(
        LeituraUptime(
            fonte_id=fonte_id, equipamento_id=equipamento_id, lido_em=lido_em, uptime_s=uptime_s
        )
    )
