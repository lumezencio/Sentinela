"""CRUD de equipamentos; toda escrita é auditada e refletida no agendador vivo."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.api import comum
from sentinela.api.comum import auditar, erro, nao_encontrado, retrato
from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc, exigir_admin
from sentinela.api.esquemas_equipamentos import (
    EquipamentoEdicao,
    EquipamentoEntrada,
    EquipamentoSaida,
    EstadoFiltro,
    EventoSaida,
    Pagina,
)
from sentinela.db.modelos import Classe, Equipamento, Evento, Usuario
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.checagens import GRAVADOR
from sentinela.monitor.montagem import alvo_de, registrar_no_agendador
from sentinela.rede.guarda import Guarda

router = APIRouter(prefix="/api/v1/equipamentos", tags=["equipamentos"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
IdEquip = Annotated[str, Path()]  # qualquer id desconhecido é 404, nunca 422/403


def _agendador(request: Request) -> Agendador:
    a: Agendador = request.app.state.agendador
    return a


def _guarda(request: Request) -> Guarda:
    g: Guarda = request.app.state.guarda
    return g


async def _carregar(db: AsyncSession, id: str) -> tuple[Equipamento, Classe]:
    eq = await db.get(Equipamento, id)
    if eq is None:
        raise nao_encontrado()
    return eq, await comum.classe_de(db, eq)


async def checar_unicos(
    db: AsyncSession, ip: str, mac: str | None, ignorar: str | None, checagem: str = "icmp"
) -> None:
    """IP único entre equipamentos com checagem própria (câmeras de gravadores diferentes
    podem repetir o IP interno: mesmo critério do índice único); MAC único entre todos."""
    mesmo_ip = select(Equipamento.id).where(
        Equipamento.ip == ip, Equipamento.id != ignorar, Equipamento.checagem != GRAVADOR
    )
    if checagem != GRAVADOR and await db.scalar(mesmo_ip) is not None:
        raise erro(status.HTTP_409_CONFLICT, comum.MSG_IP_DUPLICADO)
    if mac is not None:
        mesmo_mac = select(Equipamento.id).where(Equipamento.mac == mac, Equipamento.id != ignorar)
        if await db.scalar(mesmo_mac) is not None:
            raise erro(status.HTTP_409_CONFLICT, comum.MSG_MAC_DUPLICADO)


async def _commit(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError:  # corrida entre duas escritas: o índice único decide
        await db.rollback()
        raise erro(status.HTTP_409_CONFLICT, "Conflito com outro equipamento.") from None


@router.get("", response_model=Pagina)
async def listar(
    db: SessaoDB,
    _usuario: UsuarioAtual,
    classe: Annotated[str | None, Query(max_length=32)] = None,
    estado: EstadoFiltro | None = None,
    q: Annotated[str | None, Query(max_length=80)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Pagina:
    consulta = select(Equipamento, Classe.slug).join(Classe, Equipamento.classe_id == Classe.id)
    if classe:
        consulta = consulta.where(Classe.slug == classe)
    if estado:
        consulta = consulta.where(Equipamento.estado == estado)
    if q:
        consulta = consulta.where(
            or_(
                Equipamento.nome.contains(q, autoescape=True),
                Equipamento.ip.contains(q, autoescape=True),
                Equipamento.mac.contains(q.lower(), autoescape=True),
            )
        )
    total = await db.scalar(select(func.count()).select_from(consulta.subquery())) or 0
    linhas = await db.execute(
        consulta.order_by(Equipamento.nome, Equipamento.id).limit(limit).offset(offset)
    )
    itens = [EquipamentoSaida.de(eq, slug) for eq, slug in linhas]
    return Pagina(itens=itens, total=total)


@router.get("/{id}", response_model=EquipamentoSaida)
async def obter(id: IdEquip, db: SessaoDB, _usuario: UsuarioAtual) -> EquipamentoSaida:
    eq, classe = await _carregar(db, id)
    return EquipamentoSaida.de(eq, classe.slug)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=EquipamentoSaida)
async def criar(
    entrada: EquipamentoEntrada, request: Request, db: SessaoDB, admin: Admin
) -> EquipamentoSaida:
    classe = await comum.classe_por_chave(db, entrada.classe)
    ip = comum.validar_destino_http(_guarda(request), entrada.ip, entrada.porta, entrada.checagem)
    await checar_unicos(db, ip, entrada.mac, None)
    agora = agora_utc()
    eq = Equipamento(
        id=str(uuid.uuid4()),
        nome=entrada.nome,
        ip=ip,
        mac=entrada.mac,
        classe_id=classe.id,
        classe_origem="manual",
        checagem=entrada.checagem,
        porta=entrada.porta,
        estado="desconhecido",
        estado_desde=agora,
        pausado=False,
        criado_em=agora,
    )
    db.add(eq)
    auditar(db, request, admin, "equipamento.criar", eq.id, depois=retrato(eq, classe.slug))
    await _commit(db)
    await registrar_no_agendador(_agendador(request), db, eq, classe, novo=True)
    return EquipamentoSaida.de(eq, classe.slug)


@router.patch("/{id}", response_model=EquipamentoSaida)
async def editar(
    id: IdEquip, edicao: EquipamentoEdicao, request: Request, db: SessaoDB, admin: Admin
) -> EquipamentoSaida:
    eq, classe = await _carregar(db, id)
    antes = retrato(eq, classe.slug)
    dados = edicao.model_dump(exclude_unset=True)
    if dados.get("classe") is not None:
        classe = await comum.classe_por_chave(db, dados["classe"])
    ip = dados.get("ip") or eq.ip
    checagem = dados.get("checagem") or eq.checagem
    porta = dados["porta"] if "porta" in dados else eq.porta
    mac = dados["mac"] if "mac" in dados else eq.mac
    if {"ip", "porta", "checagem"} & dados.keys():
        # só revalida o destino se ele mudou: renomear um pausado fora das sub-redes é permitido
        ip = comum.validar_destino_http(_guarda(request), ip, porta, checagem)
    await checar_unicos(db, ip, mac, eq.id, checagem)
    eq.ip, eq.checagem, eq.porta, eq.mac, eq.classe_id = ip, checagem, porta, mac, classe.id
    if dados.get("nome") is not None:
        eq.nome = dados["nome"]
    auditar(db, request, admin, "equipamento.editar", eq.id, antes, retrato(eq, classe.slug))
    await _commit(db)
    await registrar_no_agendador(_agendador(request), db, eq, classe, novo=False)
    return EquipamentoSaida.de(eq, classe.slug)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover(id: IdEquip, request: Request, db: SessaoDB, admin: Admin) -> Response:
    eq, classe = await _carregar(db, id)
    auditar(db, request, admin, "equipamento.remover", eq.id, antes=retrato(eq, classe.slug))
    await db.delete(eq)
    await db.commit()
    _agendador(request).remover(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{id}/pausar", response_model=EquipamentoSaida)
async def pausar(id: IdEquip, request: Request, db: SessaoDB, admin: Admin) -> EquipamentoSaida:
    eq, classe = await _carregar(db, id)
    if not eq.pausado:
        agendador = _agendador(request)
        antes = retrato(eq, classe.slug)
        no_agendador = comum.marcar_pausa(db, agendador, eq, comum.CAUSA_MANUAL)
        auditar(db, request, admin, "equipamento.pausar", eq.id, antes, retrato(eq, classe.slug))
        await db.commit()
        if no_agendador:
            agendador.pausar(eq.id, causa=comum.CAUSA_MANUAL)
            await agendador.aguardar_gravacoes()
            await db.refresh(eq)
    return EquipamentoSaida.de(eq, classe.slug)


@router.post("/{id}/retomar", response_model=EquipamentoSaida)
async def retomar(id: IdEquip, request: Request, db: SessaoDB, admin: Admin) -> EquipamentoSaida:
    eq, classe = await _carregar(db, id)
    if eq.pausado:
        comum.validar_destino_http(_guarda(request), eq.ip, eq.porta, eq.checagem)
        agendador = _agendador(request)
        antes = retrato(eq, classe.slug)
        no_agendador = comum.marcar_retomada(db, agendador, eq, comum.CAUSA_MANUAL)
        auditar(db, request, admin, "equipamento.retomar", eq.id, antes, retrato(eq, classe.slug))
        await db.commit()
        if no_agendador:
            agendador.retomar(eq.id, causa=comum.CAUSA_MANUAL)
        else:
            agendador.adicionar(alvo_de(eq, classe))
        await agendador.aguardar_gravacoes()
        await db.refresh(eq)
    return EquipamentoSaida.de(eq, classe.slug)


@router.get("/{id}/eventos", response_model=list[EventoSaida])
async def eventos(
    id: IdEquip,
    db: SessaoDB,
    _usuario: UsuarioAtual,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[EventoSaida]:
    await _carregar(db, id)
    linhas = await db.execute(
        select(Evento)
        .where(Evento.equipamento_id == id)
        .order_by(Evento.em.desc(), Evento.id.desc())
        .limit(limit)
    )
    return [EventoSaida.de_linha(ev) for ev in linhas.scalars()]
