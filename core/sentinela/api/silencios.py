"""Silêncios e janelas de manutenção: qualquer usuário lista; só admin cria e encerra."""

from datetime import datetime
from typing import Annotated, cast

from fastapi import APIRouter, Depends, Path, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.alertas.silencios import (
    ErroSilencio,
    PedidoSilencio,
    Silencios,
    fim_do_atalho,
)
from sentinela.api.comum import erro, nao_encontrado
from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc, exigir_admin
from sentinela.api.esquemas_alertas import SilencioEntrada, SilencioSaida
from sentinela.config import Settings
from sentinela.db.modelos import Classe, Equipamento, Silencio, Usuario
from sentinela.horario import zona

router = APIRouter(prefix="/api/v1/silencios", tags=["silencios"])
Admin = Annotated[Usuario, Depends(exigir_admin)]


def _servico(request: Request) -> Silencios:
    s: Silencios = request.app.state.silencios
    return s


async def _saida(db: AsyncSession, s: Silencio) -> SilencioSaida:
    if s.equipamento_id is not None:
        alvo = s.equipamento_id
        nome = await db.scalar(select(Equipamento.nome).where(Equipamento.id == alvo))
    else:
        classe = await db.get(Classe, s.classe_id)
        alvo = classe.slug if classe else str(s.classe_id)
        nome = classe.nome if classe else None
    login = (
        await db.scalar(select(Usuario.login).where(Usuario.id == s.criado_por))
        if s.criado_por is not None
        else None
    )
    return SilencioSaida(
        id=s.id,
        tipo=s.tipo,
        alvo_tipo=s.alvo_tipo,
        alvo=alvo,
        alvo_nome=nome or alvo,
        inicio=s.inicio,
        fim=s.fim,
        motivo=s.motivo,
        criado_por=login,
        pausados=len(s.pausados),
    )


@router.get("", response_model=list[SilencioSaida])
async def listar(
    db: SessaoDB,
    _usuario: UsuarioAtual,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[SilencioSaida]:
    agora = agora_utc()
    linhas = await db.execute(
        select(Silencio)
        .where(Silencio.encerrado_em.is_(None), Silencio.fim > agora)
        .order_by(Silencio.fim, Silencio.id)
        .limit(limit)
    )
    return [await _saida(db, s) for s in linhas.scalars()]


@router.post("", status_code=201, response_model=SilencioSaida)
async def criar(
    entrada: SilencioEntrada, request: Request, db: SessaoDB, admin: Admin
) -> SilencioSaida:
    agora = agora_utc()
    settings: Settings = request.app.state.settings
    # o esquema garante exatamente um dos dois (atalho ou fim)
    fim = (
        fim_do_atalho(entrada.atalho, agora, zona(settings))
        if entrada.atalho is not None
        else cast(datetime, entrada.fim)
    )
    pedido = PedidoSilencio(entrada.tipo, entrada.alvo_tipo, entrada.alvo, fim, entrada.motivo)
    try:
        sil = await _servico(request).criar(
            db, pedido, admin, agora, ip=request.client.host if request.client else None
        )
    except ErroSilencio as e:
        raise erro(422, e.motivo) from None
    await db.refresh(sil)
    return await _saida(db, sil)


@router.post("/{id}/encerrar", response_model=SilencioSaida)
async def encerrar(
    id: Annotated[int, Path(ge=1, le=2**31)], request: Request, db: SessaoDB, admin: Admin
) -> SilencioSaida:
    sil = await _servico(request).encerrar(
        id, admin, agora_utc(), ip=request.client.host if request.client else None
    )
    if sil is None:
        raise nao_encontrado()
    return await _saida(db, sil)
