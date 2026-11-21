"""Quedas e incidentes: funções puras sobre as transições gravadas em ``evento``."""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

JANELA_S = 30  # uma queda entra no incidente se começou até 30 s depois do INÍCIO dele
ESTADOS_QUEDA = frozenset({"offline", "inalcancavel"})


@dataclass(frozen=True)
class Queda:
    equipamento_id: str
    inicio: datetime
    fim: datetime | None
    causa: str | None


@dataclass(frozen=True)
class Incidente:
    inicio: datetime
    fim: datetime | None  # nulo enquanto alguma queda do incidente segue aberta
    quedas: tuple[Queda, ...]

    def duracao_s(self, agora: datetime) -> float:
        return ((self.fim or agora) - self.inicio).total_seconds()


def quedas_de(eventos: Iterable[tuple[str, str, str, datetime, str | None]]) -> list[Queda]:
    """Quedas a partir de ``(equipamento_id, de, para, em, causa)`` em ordem de ``em``.

    Começa ao entrar em ``ESTADOS_QUEDA`` vindo de fora deles e termina na primeira transição
    para fora deles (online, suspeito, desconhecido, pausado). ``offline`` → ``inalcancavel``
    segue a mesma queda. Uma transição que já sai de dentro da queda sem que a queda tenha
    começado na janela lida é ignorada (não se sabe quando começou).
    """
    abertas: dict[str, tuple[datetime, str | None]] = {}
    saida: list[Queda] = []
    for eid, de, para, em, causa in eventos:
        if eid in abertas:
            inicio, causa_aberta = abertas[eid]
            if para in ESTADOS_QUEDA:
                if causa_aberta is None and causa:
                    abertas[eid] = (inicio, causa)
                continue
            saida.append(Queda(eid, inicio, em, causa_aberta))
            del abertas[eid]
        elif para in ESTADOS_QUEDA and de not in ESTADOS_QUEDA:
            abertas[eid] = (em, causa)
    saida.extend(Queda(eid, inicio, None, causa) for eid, (inicio, causa) in abertas.items())
    saida.sort(key=lambda q: (q.inicio, q.equipamento_id))
    return saida


def agrupar(quedas: list[Queda]) -> list[Incidente]:
    """Incidentes em ordem cronológica. A janela conta do início do incidente (a primeira
    queda), sem encadear: quem começa a mais de ``JANELA_S`` dele abre outro incidente."""
    ordenadas = sorted(quedas, key=lambda q: (q.inicio, q.equipamento_id))
    grupos: list[list[Queda]] = []
    for q in ordenadas:
        if grupos and (q.inicio - grupos[-1][0].inicio).total_seconds() <= JANELA_S:
            grupos[-1].append(q)
        else:
            grupos.append([q])
    return [
        Incidente(
            inicio=g[0].inicio,
            fim=None if any(q.fim is None for q in g) else max(q.fim for q in g if q.fim),
            quedas=tuple(g),
        )
        for g in grupos
    ]
