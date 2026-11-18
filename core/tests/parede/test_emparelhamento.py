"""Emparelhamento do telão: código curto, segredo de consulta, token só leitura (só hashes)."""

import re
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Parede, ParedePedido
from sentinela.parede.emparelhamento import (
    ALFABETO,
    MAX_PENDENTES,
    VALIDADE_PEDIDO,
    CodigoInvalido,
    LimitePedidos,
    aprovar,
    consultar,
    criar_pedido,
    gerar_codigo,
    normalizar_codigo,
    parede_do_token,
    revogar,
)

AGORA = datetime(2026, 11, 18, 20, 0, tzinfo=UTC)
IP = "10.99.0.70"
REGEX = re.compile(r"^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$")


@pytest.fixture
async def db(app: FastAPI, cliente: httpx.AsyncClient) -> AsyncIterator[AsyncSession]:
    sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
    async with sessoes() as s:
        yield s


def test_codigo_formato_e_alfabeto() -> None:
    assert ALFABETO == "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
    codigos = {gerar_codigo() for _ in range(1000)}
    assert all(REGEX.match(c) for c in codigos)
    assert len(codigos) > 990  # aleatório de verdade


def test_normalizar_codigo() -> None:
    assert normalizar_codigo("k7mq2xdp") == "K7MQ-2XDP"
    assert normalizar_codigo(" k7mq-2xdp ") == "K7MQ-2XDP"
    assert normalizar_codigo("K7MQ-2XD0") is None  # 0 é ambíguo, fora do alfabeto
    assert normalizar_codigo("K7MQ-2XD") is None
    assert normalizar_codigo("K7MQ-2XDPP") is None
    assert normalizar_codigo("") is None


async def test_pedido_expira_em_10_min(db: AsyncSession) -> None:
    pedido, codigo, segredo = await criar_pedido(db, IP, "https", AGORA)
    await db.commit()
    assert VALIDADE_PEDIDO == timedelta(minutes=10)
    assert pedido.expira_em == AGORA + timedelta(minutes=10)
    assert await consultar(db, segredo, AGORA + timedelta(minutes=9, seconds=59)) == "pendente"
    assert await consultar(db, segredo, AGORA + timedelta(minutes=10)) == "expirado"
    with pytest.raises(CodigoInvalido):
        await aprovar(db, codigo, "TV Portaria", AGORA + timedelta(minutes=10))


async def test_codigo_uso_unico(db: AsyncSession) -> None:
    _, codigo, segredo = await criar_pedido(db, IP, "https", AGORA)
    parede = await aprovar(db, codigo.lower().replace("-", ""), "TV Portaria", AGORA)
    await db.commit()
    assert parede.nome == "TV Portaria" and parede.modo == "https"
    assert parede.ip_vinculado is None
    with pytest.raises(CodigoInvalido):
        await aprovar(db, codigo, "Outra", AGORA)
    entrega = await consultar(db, segredo, AGORA)
    assert isinstance(entrega, tuple)
    p, token = entrega
    assert p.id == parede.id and len(token) >= 43  # 32 bytes em base64url
    await db.commit()
    assert await consultar(db, segredo, AGORA) == "expirado"
    assert await consultar(db, "segredo-que-nao-existe", AGORA) == "expirado"
    with pytest.raises(CodigoInvalido):
        await aprovar(db, "K7MQ-2XD0", "x", AGORA)


async def test_maximo_20_pendentes(db: AsyncSession) -> None:
    assert MAX_PENDENTES == 20
    for i in range(20):
        await criar_pedido(db, f"10.99.0.{i + 1}", "https", AGORA)
    await db.commit()
    with pytest.raises(LimitePedidos):
        await criar_pedido(db, IP, "https", AGORA)
    # vencidos deixam de contar
    await criar_pedido(db, IP, "https", AGORA + VALIDADE_PEDIDO)


async def test_banco_guarda_so_hashes(db: AsyncSession) -> None:
    _, codigo, segredo = await criar_pedido(db, IP, "http", AGORA)
    await aprovar(db, codigo, "TV", AGORA)
    entrega = await consultar(db, segredo, AGORA)
    assert isinstance(entrega, tuple)
    _, token = entrega
    await db.commit()
    claros = {codigo, codigo.replace("-", ""), segredo, token}
    for modelo in (ParedePedido, Parede):
        for linha in (await db.execute(select(modelo))).scalars():
            for coluna in modelo.__table__.columns:
                valor = str(getattr(linha, coluna.key))
                assert not any(c in valor for c in claros), coluna.key


async def test_token_http_amarrado_ao_ip_e_ao_modo(db: AsyncSession) -> None:
    _, codigo, segredo = await criar_pedido(db, IP, "http", AGORA)
    await aprovar(db, codigo, "TV", AGORA)
    entrega = await consultar(db, segredo, AGORA)
    assert isinstance(entrega, tuple)
    parede, token = entrega
    await db.commit()
    assert parede.ip_vinculado == IP
    assert await parede_do_token(db, token, "http", IP, AGORA) is not None
    assert await parede_do_token(db, token, "http", "10.99.0.71", AGORA) is None
    assert await parede_do_token(db, token, "https", IP, AGORA) is None
    assert await parede_do_token(db, "x" + token, "http", IP, AGORA) is None


async def test_ultimo_acesso_no_maximo_uma_vez_por_minuto(db: AsyncSession) -> None:
    _, codigo, segredo = await criar_pedido(db, IP, "https", AGORA)
    await aprovar(db, codigo, "TV", AGORA)
    entrega = await consultar(db, segredo, AGORA)
    assert isinstance(entrega, tuple)
    _, token = entrega
    p = await parede_do_token(db, token, "https", IP, AGORA)
    assert p is not None and p.ultimo_acesso == AGORA and p.ultimo_ip == IP
    p = await parede_do_token(db, token, "https", "10.99.0.80", AGORA + timedelta(seconds=30))
    assert p is not None and p.ultimo_acesso == AGORA and p.ultimo_ip == IP
    p = await parede_do_token(db, token, "https", "10.99.0.80", AGORA + timedelta(seconds=60))
    assert p is not None and p.ultimo_ip == "10.99.0.80"


async def test_revogar(db: AsyncSession) -> None:
    _, codigo, segredo = await criar_pedido(db, IP, "https", AGORA)
    parede = await aprovar(db, codigo, "TV", AGORA)
    entrega = await consultar(db, segredo, AGORA)
    assert isinstance(entrega, tuple)
    _, token = entrega
    await db.commit()
    assert await revogar(db, parede.id, AGORA) is True
    await db.commit()
    assert await parede_do_token(db, token, "https", IP, AGORA) is None
    assert await revogar(db, parede.id, AGORA) is False
    assert await revogar(db, 9999, AGORA) is False


async def test_aprovado_mas_revogado_antes_da_entrega_expira(db: AsyncSession) -> None:
    _, codigo, segredo = await criar_pedido(db, IP, "https", AGORA)
    parede = await aprovar(db, codigo, "TV", AGORA)
    await revogar(db, parede.id, AGORA)
    await db.commit()
    assert await consultar(db, segredo, AGORA) == "expirado"
