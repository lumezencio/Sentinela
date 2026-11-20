"""Classificação de um incidente: função pura (sem banco), sempre com o porquê.

"Confirmado" só existe com evidência do próprio roteador: o tempo ligado (uptime) dele voltou
atrás (``uptime.reinicios``) ou foi lido antes e depois do incidente sem recuar. Sem isso o
laudo diz "provável" e mostra o motivo.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Literal

from sentinela.diagnostico.incidentes import JANELA_S, Incidente, Queda
from sentinela.horario import formatar_duracao

Tipo = Literal[
    "roteador_reiniciou",
    "gateway_sem_reinicio",
    "pai_derrubou_filhos",
    "queda_isolada",
    "instabilidade",
    "quedas_simultaneas",
]
Certeza = Literal["provavel", "confirmado"]

REINICIO_MIN_S = 30
REINICIO_MAX_S = 180
FRACAO_JUNTOS = 0.8
VOLTA_JUNTOS_S = 120
INSTAVEL_QUEDAS = 4
INSTAVEL_JANELA = timedelta(hours=1)
MARGEM_REINICIO = timedelta(seconds=120)


@dataclass(frozen=True)
class Contexto:
    gateways: dict[str, frozenset[str]]  # gateway -> monitorados não pausados da sub-rede
    reinicios: dict[str, list[datetime]]  # gateway -> instantes de boot (uptime.reinicios)
    leituras: dict[str, list[datetime]]  # gateway -> instantes de leitura do uptime
    inicios: dict[str, list[datetime]]  # equipamento -> inícios de queda
    nomes: dict[str, str]
    # equipamento -> (início, fim|None) de cada queda; quem já estava fora quando o incidente
    # começou não entra no denominador do "voltaram juntos"
    quedas: dict[str, list[tuple[datetime, datetime | None]]] = field(default_factory=dict)


@dataclass(frozen=True)
class Classificacao:
    tipo: Tipo
    certeza: Certeza
    porque: tuple[str, ...]


SEM_UPTIME = (
    "Sem leitura do tempo ligado (uptime) do roteador, não dá para confirmar; o laudo é provável."
)


def _nome(ctx: Contexto, eid: str) -> str:
    return ctx.nomes.get(eid) or "o equipamento"


def _fora_antes(ctx: Contexto, eid: str, inicio: datetime) -> bool:
    """Já estava fora (queda começada antes e ainda aberta no início do incidente)."""
    return any(i < inicio and (f is None or f > inicio) for i, f in ctx.quedas.get(eid, []))


def _do_gateway(inc: Incidente, g: str, ctx: Contexto) -> Classificacao:
    quedas_g = [q for q in inc.quedas if q.equipamento_id == g]
    qg = quedas_g[0]
    ini = inc.inicio
    fim = qg.fim or ini  # só a queda do gateway: outra queda longa não alarga a janela
    nome = _nome(ctx, g)

    # 1. o próprio roteador informa que reiniciou
    janela = (ini - MARGEM_REINICIO, fim + MARGEM_REINICIO)
    if any(janela[0] <= b <= janela[1] for b in ctx.reinicios.get(g, [])):
        return Classificacao(
            "roteador_reiniciou",
            "confirmado",
            (
                f"O tempo ligado (uptime) de {nome} voltou atrás, junto da queda: ele reiniciou.",
                f"{len(inc.quedas)} equipamento(s) caíram na mesma janela de {JANELA_S} s.",
            ),
        )
    # 2. lido antes e depois do incidente, sem recuo: caiu sem reiniciar
    lidas = ctx.leituras.get(g, [])
    if qg.fim is not None and any(t < ini for t in lidas) and any(t > fim for t in lidas):
        return Classificacao(
            "gateway_sem_reinicio",
            "confirmado",
            (
                f"O tempo ligado (uptime) de {nome} foi lido antes e depois da queda e não"
                " voltou atrás: ele ficou fora do ar sem reiniciar.",
                "Pode ser cabo, porta, energia da linha ou o provedor de internet.",
            ),
        )

    # 3. sem prova do roteador: o padrão decide, e o laudo diz "provável"
    porque: list[str] = []
    membros = frozenset(m for m in ctx.gateways.get(g, frozenset()) if not _fora_antes(ctx, m, ini))
    duracao = None if qg.fim is None else (qg.fim - qg.inicio).total_seconds()
    ok_duracao = duracao is not None and REINICIO_MIN_S <= duracao <= REINICIO_MAX_S
    por_membro: dict[str, Queda] = {}
    for q in inc.quedas:
        if q.equipamento_id in membros:
            por_membro.setdefault(q.equipamento_id, q)
    total = len(membros)
    voltaram = (
        sum(
            1
            for q in por_membro.values()
            if q.fim is not None
            and qg.fim is not None
            and (q.fim - qg.fim).total_seconds() <= VOLTA_JUNTOS_S
        )
        if total
        else 0
    )
    ok_juntos = total > 0 and len(por_membro) >= FRACAO_JUNTOS * total
    ok_volta = total > 0 and voltaram >= FRACAO_JUNTOS * total
    if duracao is None:
        porque.append(f"{nome} ainda está fora do ar.")
    else:
        regra = f"{formatar_duracao(REINICIO_MIN_S)} a {formatar_duracao(REINICIO_MAX_S)}"
        resultado = "dentro" if ok_duracao else "fora"
        porque.append(
            f"{nome} ficou fora por {formatar_duracao(duracao)}, {resultado} do tempo típico de"
            f" um reinício ({regra})."
        )
    if total:
        porque.append(
            f"{len(por_membro)} de {total} aparelhos da rede caíram junto"
            f" e {voltaram} voltaram até {formatar_duracao(VOLTA_JUNTOS_S)} depois do roteador."
        )
    else:
        porque.append("Nenhum outro aparelho monitorado da rede dele caiu junto.")
    if ok_duracao and ok_juntos and ok_volta:
        porque.append(SEM_UPTIME)
        return Classificacao("roteador_reiniciou", "provavel", tuple(porque))
    porque.append("O padrão não é o de um reinício do roteador.")
    porque.append(SEM_UPTIME)
    return Classificacao("gateway_sem_reinicio", "provavel", tuple(porque))


def classificar(inc: Incidente, ctx: Contexto) -> Classificacao:
    ids = {q.equipamento_id for q in inc.quedas}
    # 1. gateway no incidente (vários: vale o que reiniciou, senão o primeiro a cair)
    gateways = [
        q.equipamento_id
        for q in inc.quedas
        if q.equipamento_id in ctx.gateways and q.equipamento_id in ids
    ]
    vistos = list(dict.fromkeys(gateways))
    if vistos:
        resultados = [_do_gateway(inc, g, ctx) for g in vistos]
        for r in resultados:
            if r.tipo == "roteador_reiniciou":
                return r
        return resultados[0]

    # 2. pai derrubou os filhos
    for q in inc.quedas:
        if q.causa and q.causa.startswith("pai:") and q.causa[4:] in ids:
            pai = q.causa[4:]
            filhos = sum(1 for x in inc.quedas if x.causa == q.causa)
            return Classificacao(
                "pai_derrubou_filhos",
                "provavel",
                (
                    f"{_nome(ctx, pai)} caiu e {filhos} aparelho(s) ligado(s) a ele ficaram"
                    " inalcançáveis na mesma janela.",
                    "Os filhos só voltam depois do pai, então a causa mais provável é o pai.",
                ),
            )

    # 3. um aparelho só
    if len(ids) == 1:
        (eid,) = ids
        recentes = [
            t for t in ctx.inicios.get(eid, []) if inc.inicio - INSTAVEL_JANELA <= t <= inc.inicio
        ]
        if len(recentes) >= INSTAVEL_QUEDAS:
            return Classificacao(
                "instabilidade",
                "provavel",
                (
                    f"{_nome(ctx, eid)} caiu {len(recentes)} vezes na última hora"
                    f" (o limite é {INSTAVEL_QUEDAS - 1}).",
                    "Quedas repetidas de um só aparelho apontam para ele, o cabo ou a porta.",
                ),
            )
        return Classificacao(
            "queda_isolada",
            "provavel",
            (
                f"Só {_nome(ctx, eid)} caiu; nenhum outro aparelho nem roteador na mesma janela.",
                "Sem repetição na última hora, parece uma queda pontual.",
            ),
        )

    # 4. vários aparelhos sem relação conhecida
    return Classificacao(
        "quedas_simultaneas",
        "provavel",
        (
            f"{len(ids)} aparelhos caíram na mesma janela de {JANELA_S} s, sem um roteador"
            " cadastrado nem um equipamento pai que explique.",
            'Se eles dependem do mesmo aparelho, cadastre o "Depende de" para o laudo apontar.',
        ),
    )
