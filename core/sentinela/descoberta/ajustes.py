"""Ajustes da descoberta guardados na tabela ``config`` (chave/valor JSON).

Valores ausentes ou inválidos (linha editada à mão) caem no padrão da spec §5.1: aprovação
automática desligada, limiar 0,80 e 0,5 s entre IPs na varredura (2 IPs/s).
"""

import math
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import Config

APROVACAO_AUTOMATICA = "aprovacao_automatica"
LIMIAR_APROVACAO = "limiar_aprovacao"
INTERVALO_VARREDURA = "intervalo_varredura_ips_s"

LIMIAR_PADRAO = 0.80
INTERVALO_VARREDURA_PADRAO = 0.5
INTERVALO_VARREDURA_MIN = 0.1  # teto de 10 IPs/s mesmo com a linha editada à mão
INTERVALO_VARREDURA_MAX = 60.0


@dataclass(frozen=True)
class AjustesDescoberta:
    aprovacao_automatica: bool = False
    limiar_aprovacao: float = LIMIAR_PADRAO
    intervalo_varredura_ips_s: float = INTERVALO_VARREDURA_PADRAO


def _numero(valor: Any, padrao: float, minimo: float, maximo: float) -> float:
    if isinstance(valor, bool) or not isinstance(valor, int | float):
        return padrao
    numero = float(valor)
    if not math.isfinite(numero) or not minimo <= numero <= maximo:
        return padrao
    return numero


async def ler_ajustes(db: AsyncSession) -> AjustesDescoberta:
    chaves = (APROVACAO_AUTOMATICA, LIMIAR_APROVACAO, INTERVALO_VARREDURA)
    linhas = await db.execute(select(Config.chave, Config.valor).where(Config.chave.in_(chaves)))
    valores = {chave: valor for chave, valor in linhas}
    automatica = valores.get(APROVACAO_AUTOMATICA)
    return AjustesDescoberta(
        aprovacao_automatica=automatica if isinstance(automatica, bool) else False,
        limiar_aprovacao=_numero(valores.get(LIMIAR_APROVACAO), LIMIAR_PADRAO, 0.0, 1.0),
        intervalo_varredura_ips_s=_numero(
            valores.get(INTERVALO_VARREDURA),
            INTERVALO_VARREDURA_PADRAO,
            INTERVALO_VARREDURA_MIN,
            INTERVALO_VARREDURA_MAX,
        ),
    )


async def gravar_ajuste(db: AsyncSession, chave: str, valor: bool | float) -> None:
    """Cria ou troca uma linha (sem commit: quem chama decide a transação)."""
    linha = await db.get(Config, chave)
    if linha is None:
        db.add(Config(chave=chave, valor=valor))
    else:
        linha.valor = valor
