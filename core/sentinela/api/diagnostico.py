"""Diagnóstico de quedas: qualquer usuário com sessão lê o laudo e baixa o CSV.

Mostra o mesmo que o painel já mostra a esse usuário (nomes e classes de equipamento); nunca
IP nem MAC. O laudo diz "provável" sempre que não houver tempo ligado (uptime) que confirme.
"""

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select

from sentinela.api.comum import limitar_taxa
from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc
from sentinela.db.modelos import Classe, Equipamento
from sentinela.diagnostico.relatorio import Periodo, Relatorio, csv_do, montar
from sentinela.diagnostico.textos import AVISO_ENERGIA, SEM_GATEWAY, SUGESTOES, rotulo
from sentinela.horario import zona

router = APIRouter(prefix="/api/v1/diagnostico", tags=["diagnostico"])
MAX_EQUIPAMENTOS_POR_INCIDENTE = 200
MAX_ENTRADAS_EQUIPAMENTO = 5000  # total na resposta, somando todos os incidentes

PeriodoQuery = Annotated[Periodo, Query(description="24h, 7d ou 30d")]


class EquipamentoDiag(BaseModel):
    id: str
    nome: str
    classe: str


class IncidenteSaida(BaseModel):
    inicio: datetime
    fim: datetime | None
    duracao_s: float
    tipo: str
    certeza: Literal["provavel", "confirmado"]
    rotulo: str
    porque: list[str]
    sugestoes: list[str]
    equipamentos: list[EquipamentoDiag]
    equipamentos_total: int


class ResumoDiag(BaseModel):
    incidentes: int
    por_tipo: dict[str, int]
    fora_s: float


class DiagnosticoSaida(BaseModel):
    periodo: Periodo
    de: datetime
    ate: datetime
    resumo: ResumoDiag
    horas: list[int]
    incidentes: list[IncidenteSaida]
    gateway_configurado: bool
    truncado: bool
    aviso_energia: str
    aviso_gateway: str | None


async def _saida(db: SessaoDB, r: Relatorio) -> DiagnosticoSaida:
    ids = {q.equipamento_id for inc, _ in r.incidentes for q in inc.quedas}
    classes: dict[str, str] = {}
    if ids:
        lista = list(ids)
        for i in range(0, len(lista), 400):
            for eid, slug in await db.execute(
                select(Equipamento.id, Classe.slug)
                .join(Classe, Classe.id == Equipamento.classe_id)
                .where(Equipamento.id.in_(lista[i : i + 400]))
            ):
                classes[eid] = slug
    itens: list[IncidenteSaida] = []
    restante = MAX_ENTRADAS_EQUIPAMENTO
    cortou = False
    for inc, c in r.incidentes:
        vistos = list(dict.fromkeys(q.equipamento_id for q in inc.quedas))
        listados = vistos[: min(MAX_EQUIPAMENTOS_POR_INCIDENTE, restante)]
        restante -= len(listados)
        cortou = cortou or len(listados) < len(vistos)
        itens.append(
            IncidenteSaida(
                inicio=inc.inicio,
                fim=inc.fim,
                duracao_s=inc.duracao_s(r.ate),
                tipo=c.tipo,
                certeza=c.certeza,
                rotulo=rotulo(c),
                porque=list(c.porque),
                sugestoes=list(SUGESTOES[c.tipo]),
                equipamentos=[
                    EquipamentoDiag(
                        id=eid,
                        nome=r.nomes.get(eid, "(equipamento removido)"),
                        classe=classes.get(eid, "desconhecido"),
                    )
                    for eid in listados
                ],
                equipamentos_total=len(vistos),
            )
        )
    return DiagnosticoSaida(
        periodo=r.periodo,
        de=r.de,
        ate=r.ate,
        resumo=ResumoDiag(
            incidentes=sum(r.por_tipo.values()), por_tipo=dict(r.por_tipo), fora_s=r.fora_s
        ),
        horas=r.horas,
        incidentes=itens,
        gateway_configurado=r.gateway_configurado,
        truncado=r.truncado or cortou,
        aviso_energia=AVISO_ENERGIA,
        aviso_gateway=None if r.gateway_configurado else SEM_GATEWAY,
    )


@router.get("", response_model=DiagnosticoSaida)
async def diagnostico(
    request: Request,
    db: SessaoDB,
    _usuario: UsuarioAtual,
    periodo: PeriodoQuery = "24h",
) -> DiagnosticoSaida:
    limitar_taxa(request, _usuario, "taxa_diagnostico")
    r = await montar(db, agora_utc(), periodo, zona(request.app.state.settings))
    return await _saida(db, r)


@router.get("/laudo.csv")
async def laudo_csv(
    request: Request,
    db: SessaoDB,
    usuario: UsuarioAtual,
    periodo: PeriodoQuery = "24h",
) -> Response:
    limitar_taxa(request, usuario, "taxa_laudo")
    fuso = zona(request.app.state.settings)
    agora = agora_utc()
    r = await montar(db, agora, periodo, fuso)
    nome = f"sentinela-diagnostico-{agora.astimezone(fuso):%Y%m%d}-{periodo}.csv"
    return Response(
        content=csv_do(r, fuso).encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{nome}"',
            "Cache-Control": "no-store",
        },
    )
