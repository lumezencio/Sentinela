"""Sub-redes privadas declaradas pelo administrador (fonte da Guarda viva).

``permite_varredura`` (padrão falso) libera a varredura lenta e a sondagem automática da
descoberta naquela sub-rede (spec §9.1 a); só muda pelo PATCH, auditado. Desligar a permissão
ou remover a sub-rede cancela na hora a varredura dela, se estiver rodando (nenhum pedido
ARP a mais naquela sub-rede); as sondagens em fundo reconferem a permissão antes de sair.
"""

from datetime import datetime
from ipaddress import AddressValueError, IPv4Address, IPv4Network
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.api.comum import (
    CAUSA_DENTRO,
    CAUSA_FORA,
    auditar,
    erro,
    nao_encontrado,
    sincronizar,
)
from sentinela.api.deps import SessaoDB, exigir_admin
from sentinela.db.modelos import Descoberta, SubRede, Usuario
from sentinela.descoberta.mescla import dentro_das_subredes
from sentinela.descoberta.varredura import Varredura
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


MSG_GATEWAY = "O gateway precisa estar dentro da sub-rede."
MSG_EDICAO_VAZIA = "Informe permite_varredura ou gateway_ip."


class SubRedeEdicao(BaseModel):
    """Só os campos enviados mudam; ``gateway_ip: null`` apaga o gateway."""

    model_config = ConfigDict(extra="forbid")

    permite_varredura: bool | None = None
    gateway_ip: str | None = Field(default=None, max_length=45)

    @model_validator(mode="after")
    def _algo_a_mudar(self) -> "SubRedeEdicao":
        if not self.model_fields_set:
            raise ValueError(MSG_EDICAO_VAZIA)
        if "permite_varredura" in self.model_fields_set and self.permite_varredura is None:
            raise ValueError("permite_varredura não aceita nulo.")
        return self


class SubRedeSaida(BaseModel):
    id: int
    cidr: str
    permite_varredura: bool
    gateway_ip: str | None
    ultima_varredura_em: datetime | None
    linha_base_em: datetime | None

    @classmethod
    def de(cls, s: SubRede) -> "SubRedeSaida":
        return cls(
            id=s.id,
            cidr=s.cidr,
            permite_varredura=bool(s.permite_varredura),
            gateway_ip=s.gateway_ip,
            ultima_varredura_em=s.ultima_varredura_em,
            linha_base_em=s.linha_base_em,
        )


def _gateway_valido(texto: str, cidr: str) -> str:
    """Endereço de host dentro da sub-rede (nem rede nem broadcast); motivo fixo sem eco."""
    try:
        ip = IPv4Address(texto.strip())
        rede = IPv4Network(cidr)
    except (AddressValueError, ValueError):
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, MSG_GATEWAY) from None
    if ip not in rede or ip in (rede.network_address, rede.broadcast_address):
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, MSG_GATEWAY)
    return str(ip)


def _varredura(request: Request) -> Varredura:
    v: Varredura = request.app.state.varredura
    return v


@router.get("", response_model=list[SubRedeSaida])
async def listar(db: SessaoDB, _admin: Admin) -> list[SubRedeSaida]:
    linhas = (await db.execute(select(SubRede).order_by(SubRede.id))).scalars()
    return [SubRedeSaida.de(s) for s in linhas]


async def marcar_fora_das_subredes(db: AsyncSession, guarda: Guarda) -> None:
    """Selo "fora das sub-redes" das descobertas não aprovadas conforme ``guarda`` (só
    exibição: a aprovação consulta a Guarda viva). Câmeras de gravador não têm o selo."""
    linhas = await db.execute(
        select(Descoberta).where(
            Descoberta.status != "aprovada", Descoberta.chave.not_like("nvr:%")
        )
    )
    for d in linhas.scalars():
        fora = not dentro_das_subredes(guarda, d.ip)
        if d.fora_das_subredes != fora:
            d.fora_das_subredes = fora


async def aplicar_guarda(request: Request, db: AsyncSession) -> None:
    """Classifica os equipamentos com a lista nova, faz o commit e só então troca a Guarda."""
    agendador: Agendador = request.app.state.agendador
    guarda: Guarda = request.app.state.guarda
    redes = await sub_redes_do_banco(db)
    candidata = Guarda(redes)
    mudancas = await sincronizar(db, agendador, candidata)
    await marcar_fora_das_subredes(db, candidata)
    await db.commit()
    guarda.atualizar(redes)
    agendador.pausar_lote(mudancas.pausar, causa=CAUSA_FORA)
    for id in mudancas.retomar:
        agendador.retomar(id, causa=CAUSA_DENTRO)
    agendador.adicionar_lote(mudancas.adicionar)
    await agendador.aguardar_gravacoes()


async def criar_subrede(request: Request, db: AsyncSession, admin: Usuario, texto: str) -> SubRede:
    """Valida, grava, audita e aplica (Guarda + agendador). Usada também por
    ``POST /descobertas/{id}/declarar-subrede``. Quem chama pode ter auditado antes (mesmo
    commit)."""
    try:
        cidr = normalizar_cidr(texto)
    except DestinoProibido as e:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, e.motivo) from None
    if await db.scalar(select(SubRede.id).where(SubRede.cidr == cidr)) is not None:
        raise erro(status.HTTP_409_CONFLICT, MSG_DUPLICADA)
    if (await db.scalar(select(func.count()).select_from(SubRede)) or 0) >= MAX_SUB_REDES:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, MSG_LIMITE)
    sub = SubRede(cidr=cidr, permite_varredura=False)
    db.add(sub)
    await db.flush()
    auditar(db, request, admin, "subrede.criar", cidr, depois={"cidr": cidr})
    await aplicar_guarda(request, db)
    return sub


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SubRedeSaida)
async def criar(
    entrada: SubRedeEntrada, request: Request, db: SessaoDB, admin: Admin
) -> SubRedeSaida:
    return SubRedeSaida.de(await criar_subrede(request, db, admin, entrada.cidr))


@router.patch("/{sub_id}", response_model=SubRedeSaida)
async def editar(
    sub_id: int, edicao: SubRedeEdicao, request: Request, db: SessaoDB, admin: Admin
) -> SubRedeSaida:
    """Liga/desliga ``permite_varredura`` e/ou define o gateway (o CIDR não muda: remova e
    crie outra). Só os campos enviados mudam."""
    sub = await db.get(SubRede, sub_id)
    if sub is None:
        raise nao_encontrado()
    antes: dict[str, object] = {}
    depois: dict[str, object] = {}
    desligou = False
    if "permite_varredura" in edicao.model_fields_set and edicao.permite_varredura is not None:
        antes["permite_varredura"] = bool(sub.permite_varredura)
        depois["permite_varredura"] = edicao.permite_varredura
        desligou = not edicao.permite_varredura
        sub.permite_varredura = edicao.permite_varredura
    if "gateway_ip" in edicao.model_fields_set:
        novo = None if edicao.gateway_ip is None else _gateway_valido(edicao.gateway_ip, sub.cidr)
        antes["gateway_ip"] = sub.gateway_ip
        depois["gateway_ip"] = novo
        sub.gateway_ip = novo
    auditar(db, request, admin, "subrede.editar", sub.cidr, antes, depois)
    await db.commit()
    if desligou:
        await _varredura(request).revogar(sub_id)
    return SubRedeSaida.de(sub)


@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover(sub_id: int, request: Request, db: SessaoDB, admin: Admin) -> Response:
    sub = await db.get(SubRede, sub_id)
    if sub is None:
        raise nao_encontrado()
    await _varredura(request).revogar(sub_id)  # antes de a sub-rede sumir
    auditar(db, request, admin, "subrede.remover", sub.cidr, antes={"cidr": sub.cidr})
    await db.delete(sub)
    await db.flush()
    await aplicar_guarda(request, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
