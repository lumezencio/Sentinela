"""Sub-redes privadas declaradas pelo administrador (fonte da Guarda viva)."""

from ipaddress import IPv4Network
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select

from sentinela.api.comum import (
    CAUSA_DENTRO,
    CAUSA_FORA,
    auditar,
    erro,
    nao_encontrado,
    sincronizar,
)
from sentinela.api.deps import SessaoDB, exigir_admin
from sentinela.db.modelos import SubRede, Usuario
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.montagem import sub_redes_do_banco
from sentinela.rede.guarda import DestinoProibido, Guarda

router = APIRouter(prefix="/api/v1/subredes", tags=["subredes"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
MAX_SUB_REDES = 64


MSG_CIDR = "Sub-rede inválida: use a notação CIDR da rede, ex. 10.99.0.0/24."
MSG_DUPLICADA = "Sub-rede já cadastrada."
MSG_LIMITE = "Limite de sub-redes atingido."


def normalizar_cidr(texto: str) -> str:
    """Mesma validação para a API e a CLI; ``DestinoProibido`` com motivo fixo (sem eco)."""
    try:
        # o motivo de parse da Guarda repete a entrada; este texto é fixo
        IPv4Network(texto.strip(), strict=True)
    except ValueError:
        raise DestinoProibido(MSG_CIDR) from None
    # privada? prefixo /16–/30? (motivos sem eco da entrada)
    return str(Guarda.validar_sub_rede(texto.strip()))


class SubRedeEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cidr: str = Field(min_length=1, max_length=43)


class SubRedeSaida(BaseModel):
    id: int
    cidr: str


@router.get("", response_model=list[SubRedeSaida])
async def listar(db: SessaoDB, _admin: Admin) -> list[SubRedeSaida]:
    linhas = (await db.execute(select(SubRede).order_by(SubRede.id))).scalars()
    return [SubRedeSaida(id=s.id, cidr=s.cidr) for s in linhas]


async def _aplicar(request: Request, db: SessaoDB) -> None:
    """Classifica os equipamentos com a lista nova, faz o commit e só então troca a Guarda."""
    agendador: Agendador = request.app.state.agendador
    guarda: Guarda = request.app.state.guarda
    redes = await sub_redes_do_banco(db)
    mudancas = await sincronizar(db, agendador, Guarda(redes))
    await db.commit()
    guarda.atualizar(redes)
    agendador.pausar_lote(mudancas.pausar, causa=CAUSA_FORA)
    for id in mudancas.retomar:
        agendador.retomar(id, causa=CAUSA_DENTRO)
    agendador.adicionar_lote(mudancas.adicionar)
    await agendador.aguardar_gravacoes()


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SubRedeSaida)
async def criar(
    entrada: SubRedeEntrada, request: Request, db: SessaoDB, admin: Admin
) -> SubRedeSaida:
    try:
        cidr = normalizar_cidr(entrada.cidr)
    except DestinoProibido as e:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, e.motivo) from None
    if await db.scalar(select(SubRede.id).where(SubRede.cidr == cidr)) is not None:
        raise erro(status.HTTP_409_CONFLICT, MSG_DUPLICADA)
    if (await db.scalar(select(func.count()).select_from(SubRede)) or 0) >= MAX_SUB_REDES:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, MSG_LIMITE)
    sub = SubRede(cidr=cidr)
    db.add(sub)
    await db.flush()
    auditar(db, request, admin, "subrede.criar", cidr, depois={"cidr": cidr})
    await _aplicar(request, db)
    return SubRedeSaida(id=sub.id, cidr=sub.cidr)


@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover(sub_id: int, request: Request, db: SessaoDB, admin: Admin) -> Response:
    sub = await db.get(SubRede, sub_id)
    if sub is None:
        raise nao_encontrado()
    auditar(db, request, admin, "subrede.remover", sub.cidr, antes={"cidr": sub.cidr})
    await db.delete(sub)
    await db.flush()
    await _aplicar(request, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
