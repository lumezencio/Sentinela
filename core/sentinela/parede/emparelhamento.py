"""Emparelhamento do telão: a TV pede um código, o admin aprova, a TV recebe um token.

- O código (``K7MQ-2XDP``, 8 caracteres sem ambíguos) vale 10 min e uma aprovação só. O
  segredo de consulta (cookie da TV: só ela consulta o próprio pedido) entrega o token uma
  vez só. No máximo 20 pedidos pendentes ao mesmo tempo.
- O banco guarda só SHA-256 do código, do segredo e do token (32 bytes aleatórios).
- Token ``http`` (telão sem HTTPS) é separado do ``https`` e amarrado ao IP da TV.

As funções só fazem ``flush``: quem chama confirma (junto da auditoria, quando houver).
"""

import math
import secrets
from datetime import datetime, timedelta
from typing import Literal

from sqlalchemy import CursorResult, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import Config, Parede, ParedePedido
from sentinela.seguranca.sessoes import hash_token

type Modo = Literal["https", "http"]

ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
VALIDADE_PEDIDO = timedelta(minutes=10)
MAX_PENDENTES = 20
COOKIE_PEDIDO = "sentinela_parede_pedido"
COOKIE_PAREDE = "sentinela_parede"  # HTTPS
COOKIE_PAREDE_HTTP = "sentinela_parede_http"
PAREDES_HTTP = "paredes_http"  # chave da tabela ``config`` (bool)
INTERVALO_ACESSO = timedelta(minutes=1)  # ``ultimo_acesso`` gravado no máximo 1x/min
# aprovado perto do fim: o token ainda é entregue até ``expira_em + RETENCAO_PEDIDO``;
# depois o pedido é apagado (o cookie do pedido dura validade + retenção)
RETENCAO_PEDIDO = timedelta(minutes=10)
_METADE = 4


class CodigoInvalido(Exception):
    """Código desconhecido, expirado ou já usado (o cliente não sabe qual)."""


class LimitePedidos(Exception):
    """Já há ``MAX_PENDENTES`` pendentes; ``espera_s`` até o mais antigo vencer."""

    def __init__(self, espera_s: int) -> None:
        super().__init__(espera_s)
        self.espera_s = espera_s


def gerar_codigo() -> str:
    letras = "".join(secrets.choice(ALFABETO) for _ in range(2 * _METADE))
    return f"{letras[:_METADE]}-{letras[_METADE:]}"


def normalizar_codigo(texto: str) -> str | None:
    """Maiúsculas, sem espaços nem hífen; ``None`` se não forem 8 caracteres do alfabeto."""
    limpo = texto.strip().upper().replace("-", "").replace(" ", "")
    if len(limpo) != 2 * _METADE or any(c not in ALFABETO for c in limpo):
        return None
    return f"{limpo[:_METADE]}-{limpo[_METADE:]}"


async def paredes_http(db: AsyncSession) -> bool:
    """Chave "permitir telão sem HTTPS" (desligada se ausente ou com tipo errado)."""
    linha = await db.get(Config, PAREDES_HTTP)
    return linha is not None and linha.valor is True


async def gravar_paredes_http(db: AsyncSession, ligado: bool) -> None:
    linha = await db.get(Config, PAREDES_HTTP)
    if linha is None:
        db.add(Config(chave=PAREDES_HTTP, valor=ligado))
    else:
        linha.valor = ligado


async def _marcar(db: AsyncSession, pedido: ParedePedido, coluna: str, agora: datetime) -> bool:
    """Marca ``coluna`` só se ainda nula (dois pedidos simultâneos: só um vence)."""
    campo = getattr(ParedePedido, coluna)
    resultado = await db.execute(
        update(ParedePedido)
        .where(ParedePedido.id == pedido.id, campo.is_(None))
        .values({coluna: agora})
        .execution_options(synchronize_session=False)
    )
    if not isinstance(resultado, CursorResult) or resultado.rowcount != 1:
        return False
    setattr(pedido, coluna, agora)
    return True


async def criar_pedido(
    db: AsyncSession, ip: str, modo: Modo, agora: datetime
) -> tuple[ParedePedido, str, str]:
    """Novo pedido; devolve ``(pedido, código, segredo)`` em claro (só para a resposta).

    ``LimitePedidos`` com ``MAX_PENDENTES`` pendentes (não aprovados e dentro da validade).
    """
    await db.execute(delete(ParedePedido).where(ParedePedido.expira_em < agora - RETENCAO_PEDIDO))
    pendentes, primeiro = (
        await db.execute(
            select(func.count(), func.min(ParedePedido.expira_em)).where(
                ParedePedido.aprovado_em.is_(None), ParedePedido.expira_em > agora
            )
        )
    ).one()
    if pendentes >= MAX_PENDENTES:
        raise LimitePedidos(max(1, math.ceil((primeiro - agora).total_seconds())))
    while True:  # colisão com um código ainda guardado: sorteia de novo
        codigo = gerar_codigo()
        codigo_hash = hash_token(codigo)
        if await db.scalar(select(ParedePedido.id).where(ParedePedido.codigo_hash == codigo_hash)):
            continue
        break
    segredo = secrets.token_urlsafe(32)
    pedido = ParedePedido(
        codigo_hash=codigo_hash,
        segredo_hash=hash_token(segredo),
        ip=ip,
        modo=modo,
        criado_em=agora,
        expira_em=agora + VALIDADE_PEDIDO,
    )
    db.add(pedido)
    await db.flush()
    return pedido, codigo, segredo


async def aprovar(db: AsyncSession, codigo: str, nome: str, agora: datetime) -> Parede:
    """Cria a parede do pedido (``CodigoInvalido`` se desconhecido, expirado ou já usado)."""
    normal = normalizar_codigo(codigo)
    if normal is None:
        raise CodigoInvalido
    pedido = await db.scalar(
        select(ParedePedido).where(
            ParedePedido.codigo_hash == hash_token(normal),
            ParedePedido.aprovado_em.is_(None),
            ParedePedido.expira_em > agora,
        )
    )
    if pedido is None or not await _marcar(db, pedido, "aprovado_em", agora):
        raise CodigoInvalido
    parede = Parede(
        nome=nome,
        modo=pedido.modo,
        ip_vinculado=pedido.ip if pedido.modo == "http" else None,
        criado_em=agora,
    )
    db.add(parede)
    await db.flush()
    pedido.parede_id = parede.id
    await db.flush()
    return parede


async def consultar(
    db: AsyncSession, segredo: str, agora: datetime
) -> Literal["pendente", "expirado"] | tuple[Parede, str]:
    """Estado do pedido do segredo; aprovado: gera o token (só o hash fica) e o entrega uma
    vez só, até ``expira_em + RETENCAO_PEDIDO``. Desconhecido, vencido sem aprovação,
    já entregue, buscado tarde demais ou revogado: ``expirado``."""
    if not segredo:
        return "expirado"
    pedido = await db.scalar(
        select(ParedePedido).where(ParedePedido.segredo_hash == hash_token(segredo))
    )
    if pedido is None or pedido.consumido_em is not None:
        return "expirado"
    if pedido.aprovado_em is None:
        return "pendente" if pedido.expira_em > agora else "expirado"
    if agora >= pedido.expira_em + RETENCAO_PEDIDO:  # aprovado, buscado tarde demais
        return "expirado"
    parede = await db.get(Parede, pedido.parede_id) if pedido.parede_id is not None else None
    if parede is None or parede.revogada_em is not None:
        return "expirado"
    if not await _marcar(db, pedido, "consumido_em", agora):
        return "expirado"
    token = secrets.token_urlsafe(32)
    parede.token_hash = hash_token(token)
    await db.flush()
    return parede, token


async def parede_do_token(
    db: AsyncSession, token: str, modo: Modo, ip: str, agora: datetime
) -> Parede | None:
    """Parede ativa do token naquele modo (``http``: só do IP vinculado), ou ``None``.

    Atualiza ``ultimo_acesso``/``ultimo_ip`` no máximo uma vez por minuto."""
    if not token:
        return None
    parede = await db.scalar(
        select(Parede).where(
            Parede.token_hash == hash_token(token),
            Parede.modo == modo,
            Parede.revogada_em.is_(None),
        )
    )
    if parede is None or (modo == "http" and parede.ip_vinculado != ip):
        return None
    if parede.ultimo_acesso is None or agora - parede.ultimo_acesso >= INTERVALO_ACESSO:
        parede.ultimo_acesso = agora
        parede.ultimo_ip = ip
        await db.flush()
    return parede


async def revogar(db: AsyncSession, id: int, agora: datetime) -> bool:
    """Revoga e apaga o hash do token; ``False`` se não existe ou já estava revogada."""
    parede = await db.get(Parede, id)
    if parede is None or parede.revogada_em is not None:
        return False
    parede.revogada_em = agora
    parede.token_hash = None
    await db.flush()
    return True
