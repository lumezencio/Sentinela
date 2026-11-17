"""Fila de descobertas: listar (todo usuário), aprovar, lote, ignorar, reabrir, sondar e
declarar a sub-rede do IP (admin + CSRF, tudo auditado).

- Aprovar delega ao ``Orquestrador.aprovar`` (auditoria, agendador vivo, gravador junto da
  câmera, verificação pós-aprovação). As recusas dele têm mensagem fixa e vão ao cliente.
- **Lote** (≤ 200): cada aprovação é atômica na sua própria transação (equipamento,
  descoberta, auditoria e gravador junto, ou nada); as válidas ficam, as recusadas voltam
  com o motivo. Um lote numa transação só com aceitação parcial exigiria SAVEPOINT, que o
  driver sqlite3 não respeita (o RELEASE do mais externo confirma tudo).
- Equipamento criado vai ao barramento como ``equipamento``/``criado``; o WebSocket envia
  a linha no mesmo formato do snapshot (Lista/Teia/Organograma ao vivo).
- **Sondar** (§9.1 b) gera tráfego (e um ARP): limite de taxa e auditoria da tentativa,
  inclusive recusada.
"""

import logging
from ipaddress import IPv4Address, IPv4Network
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.api import comum
from sentinela.api.comum import auditar, erro, limitar_taxa, nao_encontrado
from sentinela.api.deps import SessaoDB, UsuarioAtual, exigir_admin
from sentinela.api.esquemas_descoberta import (
    AprovarEntrada,
    DescobertaSaida,
    LoteEntrada,
    LoteSaida,
    PaginaDescobertas,
    Recusa,
    StatusDescoberta,
)
from sentinela.api.esquemas_equipamentos import EquipamentoSaida
from sentinela.api.subredes import SubRedeSaida, criar_subrede
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import Classe, Descoberta, Equipamento, Usuario
from sentinela.descoberta.mescla import IGNORADA, PENDENTE, dentro_das_subredes
from sentinela.descoberta.orquestrador import (
    MSG_CLASSE,
    MSG_NAO_PENDENTE,
    AprovacaoRecusada,
    DescobertaInexistente,
    ErroDescoberta,
    Orquestrador,
    SondagemRecusada,
    e_canal,
)
from sentinela.rede.guarda import Guarda

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/descobertas", tags=["descobertas"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
IdDesc = Annotated[str, Path()]  # qualquer id desconhecido é 404

MSG_NAO_IGNORADA = "A descoberta não está ignorada."
MSG_JA_DENTRO = "O IP já está numa sub-rede monitorada."
MSG_CANAL_SEM_SUBREDE = "Câmera atrás de gravador não precisa de sub-rede declarada."
MSG_FALHA_APROVAR = "Não foi possível aprovar."


def _orq(request: Request) -> Orquestrador:
    o: Orquestrador = request.app.state.orquestrador
    return o


def _ip_cliente(request: Request) -> str | None:
    return request.client.host if request.client else None


def _publicar(request: Request, tipo: str, dados: dict[str, Any]) -> None:
    barramento: Barramento = request.app.state.barramento
    barramento.publicar(Mensagem(tipo, dados))


def _publicar_descoberta(request: Request, acao: str, d: Descoberta | str) -> None:
    if isinstance(d, str):
        dados = {"acao": acao, "id": d, "classe_sugerida": None, "confianca": 0.0}
    else:
        dados = {
            "acao": acao,
            "id": d.id,
            "classe_sugerida": d.classe_sugerida,
            "confianca": d.confianca,
        }
    _publicar(request, "descoberta", dados)


def _publicar_equipamento_criado(request: Request, eq: Equipamento) -> None:
    for id in (eq.pai_id, eq.id):  # o gravador aprovado junto também aparece ao vivo
        if id is not None:
            _publicar(request, "equipamento", {"acao": "criado", "id": id})


async def _nomes_de_conflito(db: AsyncSession, descobertas: list[Descoberta]) -> dict[str, str]:
    ids = {d.conflito_com for d in descobertas if d.conflito_com}
    if not ids:
        return {}
    linhas = await db.execute(
        select(Equipamento.id, Equipamento.nome).where(Equipamento.id.in_(ids))
    )
    return {id: nome for id, nome in linhas}


async def _saida(db: AsyncSession, d: Descoberta) -> DescobertaSaida:
    nomes = await _nomes_de_conflito(db, [d])
    return DescobertaSaida.de(d, nomes.get(d.conflito_com or ""))


async def _carregar(db: AsyncSession, id: str) -> Descoberta:
    d = await db.get(Descoberta, id)
    if d is None:
        raise nao_encontrado()
    return d


@router.get("", response_model=PaginaDescobertas)
async def listar(
    db: SessaoDB,
    _usuario: UsuarioAtual,
    status_: Annotated[StatusDescoberta | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginaDescobertas:
    consulta = select(Descoberta)
    if status_ is not None:
        consulta = consulta.where(Descoberta.status == status_)
    total = await db.scalar(select(func.count()).select_from(consulta.subquery())) or 0
    linhas = await db.execute(
        consulta.order_by(Descoberta.primeira_vez.desc(), Descoberta.chave)
        .limit(limit)
        .offset(offset)
    )
    descobertas = list(linhas.scalars())
    nomes = await _nomes_de_conflito(db, descobertas)
    itens = [DescobertaSaida.de(d, nomes.get(d.conflito_com or "")) for d in descobertas]
    return PaginaDescobertas(itens=itens, total=total)


@router.post("/aprovar-lote", response_model=LoteSaida)
async def aprovar_lote(entrada: LoteEntrada, request: Request, admin: Admin) -> LoteSaida:
    orq = _orq(request)
    sessoes: async_sessionmaker[AsyncSession] = request.app.state.sessoes
    aprovadas: list[str] = []
    recusadas: list[Recusa] = []
    for id in dict.fromkeys(entrada.ids):  # sem repetidos, na ordem pedida
        try:
            async with sessoes() as db:
                eq = await orq.aprovar(db, id, None, None, admin, ip=_ip_cliente(request))
        except ErroDescoberta as e:
            recusadas.append(Recusa(id=id, motivo=str(e)))
            continue
        except Exception as e:  # noqa: BLE001 - uma falha não derruba o lote
            log.error("aprovação em lote falhou: %s", type(e).__name__)
            recusadas.append(Recusa(id=id, motivo=MSG_FALHA_APROVAR))
            continue
        aprovadas.append(id)
        _publicar_equipamento_criado(request, eq)
    return LoteSaida(aprovadas=aprovadas, recusadas=recusadas)


@router.post("/{id}/aprovar", response_model=EquipamentoSaida)
async def aprovar(
    id: IdDesc, entrada: AprovarEntrada, request: Request, db: SessaoDB, admin: Admin
) -> EquipamentoSaida:
    slug = (await comum.classe_por_chave(db, entrada.classe)).slug if entrada.classe else None
    try:
        eq = await _orq(request).aprovar(db, id, slug, entrada.nome, admin, ip=_ip_cliente(request))
    except DescobertaInexistente:
        raise nao_encontrado() from None
    except AprovacaoRecusada as e:
        codigo = status.HTTP_422_UNPROCESSABLE_CONTENT if str(e) == MSG_CLASSE else 409
        raise erro(codigo, str(e)) from None
    classe = await db.get(Classe, eq.classe_id)
    if classe is None:  # chave estrangeira garante; defensivo
        raise nao_encontrado()
    _publicar_equipamento_criado(request, eq)
    return EquipamentoSaida.de(eq, classe.slug)


@router.post("/{id}/ignorar", response_model=DescobertaSaida)
async def ignorar(id: IdDesc, request: Request, db: SessaoDB, admin: Admin) -> DescobertaSaida:
    d = await _carregar(db, id)
    if d.status != PENDENTE:
        raise erro(status.HTTP_409_CONFLICT, MSG_NAO_PENDENTE)
    d.status = IGNORADA
    auditar(
        db, request, admin, "descoberta.ignorar", d.id, {"status": PENDENTE}, {"status": IGNORADA}
    )
    await db.commit()
    _publicar_descoberta(request, "removida", d.id)
    await _orq(request).publicar_pendentes()
    return await _saida(db, d)


@router.post("/{id}/reabrir", response_model=DescobertaSaida)
async def reabrir(id: IdDesc, request: Request, db: SessaoDB, admin: Admin) -> DescobertaSaida:
    """Desfaz "ignorar": volta para a fila de pendentes."""
    d = await _carregar(db, id)
    if d.status != IGNORADA:
        raise erro(status.HTTP_409_CONFLICT, MSG_NAO_IGNORADA)
    d.status = PENDENTE
    if not e_canal(d):
        d.fora_das_subredes = not dentro_das_subredes(request.app.state.guarda, d.ip)
    auditar(
        db, request, admin, "descoberta.reabrir", d.id, {"status": IGNORADA}, {"status": PENDENTE}
    )
    await db.commit()
    _publicar_descoberta(request, "nova", d)
    await _orq(request).publicar_pendentes()
    return await _saida(db, d)


@router.post("/{id}/sondar", response_model=DescobertaSaida)
async def sondar(id: IdDesc, request: Request, db: SessaoDB, admin: Admin) -> DescobertaSaida:
    """Portas da lista fixa + título HTTP (gera um pedido ARP na rede); a tentativa é
    auditada mesmo quando recusada."""
    limitar_taxa(request, admin)
    d = await _carregar(db, id)
    ip = d.ip
    try:
        atual = await _orq(request).sondar_descoberta(id)
    except DescobertaInexistente:
        raise nao_encontrado() from None
    except SondagemRecusada as e:
        auditar(
            db, request, admin, "descoberta.sondar", id, depois={"ip": ip, "resultado": "recusada"}
        )
        await db.commit()
        raise erro(status.HTTP_409_CONFLICT, str(e)) from None
    auditar(db, request, admin, "descoberta.sondar", id, depois={"ip": ip, "resultado": "ok"})
    await db.commit()
    return await _saida(db, atual)


@router.post(
    "/{id}/declarar-subrede", status_code=status.HTTP_201_CREATED, response_model=SubRedeSaida
)
async def declarar_subrede(
    id: IdDesc, request: Request, db: SessaoDB, admin: Admin
) -> SubRedeSaida:
    """§9.2: declara o /24 do IP da descoberta pelo mesmo caminho de ``POST /subredes``
    (validação privada, auditoria, Guarda e agendador sincronizados)."""
    d = await _carregar(db, id)
    if e_canal(d):
        raise erro(status.HTTP_409_CONFLICT, MSG_CANAL_SEM_SUBREDE)
    guarda: Guarda = request.app.state.guarda
    if dentro_das_subredes(guarda, d.ip):
        raise erro(status.HTTP_409_CONFLICT, MSG_JA_DENTRO)
    try:
        cidr = str(IPv4Network(f"{IPv4Address(d.ip)}/24", strict=False))
    except ValueError:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, "Endereço IPv4 inválido.") from None
    auditar(db, request, admin, "descoberta.declarar_subrede", d.id, depois={"cidr": cidr})
    sub = await criar_subrede(request, db, admin, cidr)
    return SubRedeSaida.de(sub)
