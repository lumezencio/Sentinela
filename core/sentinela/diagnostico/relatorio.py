"""Relatório do Diagnóstico: lê os eventos do período, agrupa, classifica e gera o laudo CSV."""

import csv
import io
from dataclasses import dataclass
from datetime import datetime, timedelta
from ipaddress import ip_address, ip_network
from typing import Literal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import Equipamento, Evento, LeituraUptime, SubRede
from sentinela.descoberta.uptime import Leitura, reinicios
from sentinela.diagnostico.classificacao import Classificacao, Contexto, Tipo, classificar
from sentinela.diagnostico.incidentes import Incidente, Queda, agrupar, quedas_de
from sentinela.diagnostico.textos import SUGESTOES, rotulo
from sentinela.horario import formatar_duracao

Periodo = Literal["24h", "7d", "30d"]
MAX_EVENTOS = 100_000
MAX_INCIDENTES = 500
_DURACAO: dict[str, timedelta] = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
}
_MARGEM_EVENTOS = timedelta(hours=1)  # para a regra de instabilidade e o início das quedas
_MARGEM_LEITURAS = timedelta(days=1)
_LOTE = 400


@dataclass(frozen=True)
class Relatorio:
    periodo: Periodo
    de: datetime
    ate: datetime
    incidentes: list[tuple[Incidente, Classificacao]]  # mais recentes primeiro
    por_tipo: dict[Tipo, int]
    fora_s: float
    horas: list[int]
    gateway_configurado: bool
    truncado: bool
    nomes: dict[str, str]


def _gateways(
    subredes: list[tuple[str, str | None]],
    equipamentos: list[tuple[str, str, str, bool, str]],
) -> dict[str, frozenset[str]]:
    """Gateway (equipamento de IP igual ao ``gateway_ip``) -> monitorados da sub-rede dele."""
    por_ip = {
        ip: eid
        for eid, _nome, ip, pausado, chk in equipamentos
        if not pausado and chk != "gravador"
    }
    saida: dict[str, frozenset[str]] = {}
    for cidr, gateway_ip in subredes:
        gateway = por_ip.get(gateway_ip or "")
        if gateway is None:
            continue
        try:
            rede = ip_network(cidr, strict=False)
        except ValueError:
            continue
        membros: set[str] = set()
        for eid, _nome, ip, pausado, checagem in equipamentos:
            if pausado or eid == gateway or checagem == "gravador":
                continue  # câmera de gravador pode repetir IP interno de outra rede
            try:
                if ip_address(ip) in rede:
                    membros.add(eid)
            except ValueError:
                continue
        saida[gateway] = saida.get(gateway, frozenset()) | frozenset(membros)
    return saida


def _uniao_s(intervalos: list[tuple[datetime, datetime]]) -> float:
    total = 0.0
    fim_atual: datetime | None = None
    for ini, fim in sorted(intervalos):
        if fim_atual is None or ini > fim_atual:
            total += (fim - ini).total_seconds()
            fim_atual = fim
        elif fim > fim_atual:
            total += (fim - fim_atual).total_seconds()
            fim_atual = fim
    return total


async def _eventos(
    db: AsyncSession, ids: list[str], desde: datetime, ate: datetime
) -> tuple[list[tuple[str, str, str, datetime, str | None]], bool]:
    """Eventos do período por lotes de equipamento (usa ``ix_evento_equipamento_em``); fica com
    os mais recentes quando passa de ``MAX_EVENTOS``."""
    linhas: list[tuple[datetime, int, str, str, str, str | None]] = []
    for i in range(0, len(ids), _LOTE):
        consulta = (
            select(
                Evento.em, Evento.id, Evento.equipamento_id, Evento.de, Evento.para, Evento.causa
            )
            .where(
                Evento.equipamento_id.in_(ids[i : i + _LOTE]),
                Evento.em >= desde,
                Evento.em <= ate,
            )
            .order_by(Evento.em.desc(), Evento.id.desc())
            .limit(MAX_EVENTOS + 1)
        )
        linhas.extend(
            (r.em, r.id, r.equipamento_id, r.de, r.para, r.causa)
            for r in await db.execute(consulta)
        )
    linhas.sort(key=lambda x: (x[0], x[1]))
    truncado = len(linhas) > MAX_EVENTOS
    if truncado:
        linhas = linhas[-MAX_EVENTOS:]
    return [(eid, de, para, em, causa) for em, _id, eid, de, para, causa in linhas], truncado


async def montar(db: AsyncSession, agora: datetime, periodo: Periodo, fuso: ZoneInfo) -> Relatorio:
    de = agora - _DURACAO[periodo]
    equipamentos = [
        (r.id, r.nome, r.ip, r.pausado, r.checagem)
        for r in await db.execute(
            select(
                Equipamento.id,
                Equipamento.nome,
                Equipamento.ip,
                Equipamento.pausado,
                Equipamento.checagem,
            )
        )
    ]
    subredes = [
        (r.cidr, r.gateway_ip)
        for r in await db.execute(
            select(SubRede.cidr, SubRede.gateway_ip).where(SubRede.gateway_ip.is_not(None))
        )
    ]
    gateways = _gateways(subredes, equipamentos)
    todos_nomes = {eid: nome for eid, nome, *_ in equipamentos}

    eventos, truncado = await _eventos(
        db, [e[0] for e in equipamentos], de - _MARGEM_EVENTOS, agora
    )
    quedas = quedas_de(eventos)
    incidentes = [i for i in agrupar(quedas) if de <= i.inicio <= agora]

    inicios: dict[str, list[datetime]] = {}
    intervalos_por: dict[str, list[tuple[datetime, datetime | None]]] = {}
    for q in quedas:
        inicios.setdefault(q.equipamento_id, []).append(q.inicio)
        intervalos_por.setdefault(q.equipamento_id, []).append((q.inicio, q.fim))

    # leituras de uptime dos gateways, na ORDEM DE INSERÇÃO (id): o relógio do servidor pode
    # recuar e ``lido_em`` não serve de ordem (um recuo viraria um reinício falso)
    leituras: dict[str, list[datetime]] = {}
    reinicios_por: dict[str, list[datetime]] = {}
    for g in gateways:
        rows = list(
            await db.execute(
                select(LeituraUptime.lido_em, LeituraUptime.uptime_s, LeituraUptime.fonte_id)
                .where(
                    LeituraUptime.equipamento_id == g,
                    LeituraUptime.lido_em >= de - _MARGEM_LEITURAS,
                )
                .order_by(LeituraUptime.id)
            )
        )
        if rows:
            leituras[g] = [r.lido_em for r in rows]
            # contadores de fontes diferentes (SNMP x MikroTik) têm pequenas diferenças: cada
            # fonte é lida na sua própria sequência, nunca misturadas
            por_fonte: dict[str, list[Leitura]] = {}
            for r in rows:
                por_fonte.setdefault(r.fonte_id, []).append(Leitura(r.lido_em, r.uptime_s))
            reinicios_por[g] = sorted(b for ls in por_fonte.values() for b in reinicios(ls))

    usados = {q.equipamento_id for i in incidentes for q in i.quedas} | set(gateways)
    ctx = Contexto(
        gateways=gateways,
        reinicios=reinicios_por,
        leituras=leituras,
        inicios=inicios,
        quedas=intervalos_por,
        nomes={eid: todos_nomes[eid] for eid in usados if eid in todos_nomes},
    )
    classificados = [(i, classificar(i, ctx)) for i in incidentes]

    por_tipo: dict[Tipo, int] = {}
    horas = [0] * 24
    intervalos: list[tuple[datetime, datetime]] = []
    for inc, c in classificados:
        por_tipo[c.tipo] = por_tipo.get(c.tipo, 0) + 1
        horas[inc.inicio.astimezone(fuso).hour] += 1
        for q in inc.quedas:
            ini = max(q.inicio, de)
            fim = min(q.fim or agora, agora)
            if fim > ini:
                intervalos.append((ini, fim))

    recentes = list(reversed(classificados))
    truncado = truncado or len(recentes) > MAX_INCIDENTES
    return Relatorio(
        periodo=periodo,
        de=de,
        ate=agora,
        incidentes=recentes[:MAX_INCIDENTES],
        por_tipo=por_tipo,
        fora_s=_uniao_s(intervalos),
        horas=horas,
        gateway_configurado=bool(gateways),
        truncado=truncado,
        nomes={eid: todos_nomes[eid] for eid in usados if eid in todos_nomes},
    )


def nomes_do_incidente(inc: Incidente, nomes: dict[str, str]) -> list[str]:
    vistos = dict.fromkeys(q.equipamento_id for q in inc.quedas)
    return [nomes.get(eid, "(equipamento removido)") for eid in vistos]


def _celula(valor: str) -> str:
    """Neutraliza fórmula de planilha (``=``, ``+``, ``-``, ``@``, tab, CR no início)."""
    return "'" + valor if valor[:1] in ("=", "+", "-", "@", "\t", "\r") else valor


def csv_do(r: Relatorio, fuso: ZoneInfo) -> str:
    """Laudo em CSV para o Excel brasileiro: BOM UTF-8, ``;``, toda célula entre aspas.
    Só nomes de equipamento (nunca IP nem MAC); o texto vai inteiro."""
    saida = io.StringIO()
    escritor = csv.writer(saida, delimiter=";", quoting=csv.QUOTE_ALL, lineterminator="\r\n")
    escritor.writerow(
        ["inicio", "fim", "duracao", "classificacao", "equipamentos", "porque", "sugestoes"]
    )
    for inc, c in r.incidentes:
        escritor.writerow(
            _celula(x)
            for x in (
                inc.inicio.astimezone(fuso).strftime("%Y-%m-%d %H:%M:%S"),
                inc.fim.astimezone(fuso).strftime("%Y-%m-%d %H:%M:%S")
                if inc.fim
                else "em andamento",
                formatar_duracao(inc.duracao_s(r.ate)),
                rotulo(c),
                ", ".join(nomes_do_incidente(inc, r.nomes)),
                " ".join(c.porque),
                " ".join(SUGESTOES[c.tipo]),
            )
        )
    return "﻿" + saida.getvalue()


__all__ = ["MAX_EVENTOS", "MAX_INCIDENTES", "Periodo", "Queda", "Relatorio", "csv_do", "montar"]
