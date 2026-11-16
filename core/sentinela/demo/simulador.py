"""Rede sintética de 300 equipamentos e checagem simulada.

Nada aqui abre socket nem importa bibliotecas de rede: a ``ChecagemSimulada`` só sorteia
resultados. Tudo em ``10.99.0.0/16`` e MACs ``02:00:00:xx:xx:xx`` (localmente administrados).
"""

import random
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from ipaddress import IPv4Address

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Classe, Equipamento, SubRede
from sentinela.monitor.estados import ResultadoChecagem
from sentinela.rede.guarda import DestinoAutorizado
from sentinela.relogio import Relogio, RelogioReal

SUB_REDES_DEMO: tuple[str, ...] = tuple(f"10.99.{n}.0/24" for n in (10, 20, 30, 40, 50, 60))

_LOCAIS_CAMERA = (
    "Portão",
    "Recepção",
    "Garagem",
    "Corredor A",
    "Corredor B",
    "Estacionamento",
    "Almoxarifado",
    "Refeitório",
    "Pátio",
    "Escada Norte",
    "Escada Sul",
    "Hall",
)
_BLOCOS = ("A", "B", "C", "D", "E", "F")

# (classe, sub-rede, quantidade em 300, checagem, porta, prefixo do nome, locais)
_ESPECS: tuple[tuple[str, int, int, str, int | None, str, tuple[str, ...]], ...] = (
    ("camera", 10, 120, "icmp", None, "Câmera", _LOCAIS_CAMERA),
    ("wifi", 20, 30, "icmp", None, "AP Bloco", _BLOCOS),
    ("controle_acesso", 30, 12, "http", 80, "Facial", ("Recepção", "Portaria", "Garagem", "Hall")),
    (
        "switch",
        40,
        10,
        "icmp",
        None,
        "Switch",
        ("Core", "Bloco A", "Bloco B", "Bloco C", "Andar 1"),
    ),
    ("roteador", 40, 2, "icmp", None, "Roteador", ("Borda", "Reserva")),
    ("gravador", 50, 8, "tcp", 554, "Gravador", ("Principal", "Térreo", "Externo", "Reserva")),
    ("servidor", 60, 14, "tcp", 443, "Servidor", ("Arquivos", "Aplicação", "Banco", "Backup")),
    ("computador", 60, 70, "icmp", None, "Computador", ("Administrativo", "Atendimento", "Sala")),
    ("impressora", 60, 14, "tcp", 9100, "Impressora", ("Recepção", "Financeiro", "Corredor")),
    ("iot", 60, 20, "icmp", None, "Sensor", ("Portão", "Temperatura", "Iluminação", "Alarme")),
)
_TOTAL_PADRAO = 300
_CAPACIDADE_POR_SUBREDE = 240  # hosts .10 a .249


@dataclass(frozen=True)
class EquipamentoDemo:
    nome: str
    ip: str
    mac: str
    classe: str
    checagem: str
    porta: int | None


def _quantidades(total: int) -> list[int]:
    """Escala a distribuição padrão para ``total`` (maiores restos); 300 reproduz o exato."""
    if total == _TOTAL_PADRAO:
        return [e[2] for e in _ESPECS]
    brutos = [e[2] * total / _TOTAL_PADRAO for e in _ESPECS]
    qtds = [int(b) for b in brutos]
    ordem = sorted(range(len(qtds)), key=lambda i: brutos[i] - qtds[i], reverse=True)
    for i in ordem[: total - sum(qtds)]:
        qtds[i] += 1
    return qtds


def _mac(sufixo: int) -> str:
    return f"02:00:00:{sufixo >> 16 & 0xFF:02x}:{sufixo >> 8 & 0xFF:02x}:{sufixo & 0xFF:02x}"


def gerar_rede(seed: int = 366, total: int = 300) -> list[EquipamentoDemo]:
    """Rede sintética determinística: mesma ``seed`` e ``total``, mesma saída."""
    if total < len(_ESPECS):
        raise ValueError("total pequeno demais para cobrir todas as classes")
    rng = random.Random(seed)  # noqa: S311 - dados sintéticos
    sufixos = rng.sample(range(1, 2**24), total)
    proximo_host: dict[int, int] = defaultdict(lambda: 10)
    rede: list[EquipamentoDemo] = []
    for (classe, sub, _, checagem, porta, prefixo, locais), qtd in zip(
        _ESPECS, _quantidades(total), strict=True
    ):
        for i in range(qtd):
            host = proximo_host[sub]
            if host - 10 >= _CAPACIDADE_POR_SUBREDE:
                raise ValueError("total grande demais para a sub-rede da classe")
            proximo_host[sub] += 1
            local = locais[i % len(locais)]
            rede.append(
                EquipamentoDemo(
                    nome=f"{prefixo} {local} {i // len(locais) + 1:02d}",
                    ip=f"10.99.{sub}.{host}",
                    mac=_mac(sufixos[len(rede)]),
                    classe=classe,
                    checagem=checagem,
                    porta=porta,
                )
            )
    return rede


_P_QUEDA = 0.003  # por checagem; com ~3 min médios de queda dá ~3% de falhas
_QUEDA_MIN_S, _QUEDA_MAX_S = 60.0, 300.0
_INTERVALO_SWITCH_S = 600.0
_SWITCH_MIN, _SWITCH_MAX = 8, 15


def _sub24(ip: str) -> str:
    return ip.rsplit(".", 1)[0]


class ChecagemSimulada:
    """Implementa ``Checagem`` sem tocar a rede. Uma instância atende todos os tipos."""

    custo = 1

    def __init__(
        self,
        seed: int = 366,
        relogio: Relogio | None = None,
        rede: list[EquipamentoDemo] | None = None,
    ) -> None:
        self._rng = random.Random(seed)  # noqa: S311 - dados sintéticos
        self._relogio: Relogio = relogio or RelogioReal()
        por_subrede: dict[str, list[str]] = defaultdict(list)
        for e in rede if rede is not None else gerar_rede(seed):
            por_subrede[_sub24(e.ip)].append(e.ip)
        self._por_subrede = dict(sorted(por_subrede.items()))
        self._elegiveis = [s for s, ips in self._por_subrede.items() if len(ips) >= _SWITCH_MIN]
        self._fim_queda: dict[str, float] = {}  # ip -> instante em que volta; no máx. 1 por IP
        self._proxima_queda_switch = self._relogio.agora() + self._intervalo_switch()

    def _intervalo_switch(self) -> float:
        return _INTERVALO_SWITCH_S * self._rng.uniform(0.8, 1.2)

    def quedas_em_curso(self) -> int:
        return len(self._fim_queda)

    def _duracao(self) -> float:
        return self._rng.uniform(_QUEDA_MIN_S, _QUEDA_MAX_S)

    def _queda_de_switch(self, agora: float) -> None:
        self._proxima_queda_switch = agora + self._intervalo_switch()
        if not self._elegiveis:
            return
        ips = self._por_subrede[self._rng.choice(self._elegiveis)]
        vitimas = self._rng.sample(ips, min(self._rng.randint(_SWITCH_MIN, _SWITCH_MAX), len(ips)))
        fim = agora + self._duracao()
        for ip in vitimas:
            self._fim_queda[ip] = max(self._fim_queda.get(ip, 0.0), fim)

    async def executar(
        self,
        destino: DestinoAutorizado,
        timeout: float = 2.0,  # noqa: ASYNC109 - contrato do plano
    ) -> ResultadoChecagem:
        # só destino emitido pela Guarda (um tipo serve a todos os protocolos)
        if not isinstance(destino, DestinoAutorizado):
            raise TypeError("A checagem exige um DestinoAutorizado emitido pela Guarda")
        agora = self._relogio.agora()
        if agora >= self._proxima_queda_switch:
            self._queda_de_switch(agora)
        ip = str(IPv4Address(destino.ip))
        fim = self._fim_queda.get(ip)
        if fim is not None and agora >= fim:
            del self._fim_queda[ip]
            fim = None
        if fim is None and self._rng.random() < _P_QUEDA:
            fim = self._fim_queda[ip] = agora + self._duracao()
        if fim is not None:
            return ResultadoChecagem(ok=False, latencia_ms=None, erro="sem resposta (simulado)")
        return ResultadoChecagem(ok=True, latencia_ms=round(self._rng.uniform(1.0, 30.0), 1))


async def semear_demo(sessoes: async_sessionmaker[AsyncSession], seed: int = 366) -> bool:
    """Semeia sub-redes e equipamentos sintéticos se não há nenhum equipamento (idempotente)."""
    async with sessoes() as db:
        if await db.scalar(select(func.count()).select_from(Equipamento)):
            return False
        existentes = set((await db.execute(select(SubRede.cidr))).scalars())
        for cidr in SUB_REDES_DEMO:
            if cidr not in existentes:
                db.add(SubRede(cidr=cidr))
        classes = {slug: id_ for slug, id_ in await db.execute(select(Classe.slug, Classe.id))}
        agora = datetime.now(UTC)
        for e in gerar_rede(seed):
            db.add(
                Equipamento(
                    nome=e.nome,
                    ip=e.ip,
                    mac=e.mac,
                    classe_id=classes[e.classe],
                    classe_origem="manual",
                    checagem=e.checagem,
                    porta=e.porta,
                    estado="desconhecido",
                    estado_desde=agora,
                    criado_em=agora,
                )
            )
        await db.commit()
    return True


async def banco_e_demo(sessoes: async_sessionmaker[AsyncSession]) -> bool:
    """Marca de banco de demonstração (sem tabela de config): as 6 sub-redes demo e todo
    equipamento com MAC ``02:00:00:...`` (localmente administrado), e ao menos um."""
    async with sessoes() as db:
        cidrs = set((await db.execute(select(SubRede.cidr))).scalars())
        total = await db.scalar(select(func.count()).select_from(Equipamento)) or 0
        demo = await db.scalar(
            select(func.count()).select_from(Equipamento).where(Equipamento.mac.like("02:00:00:%"))
        )
    return total > 0 and demo == total and set(SUB_REDES_DEMO) <= cidrs


async def tem_equipamentos(sessoes: async_sessionmaker[AsyncSession]) -> bool:
    async with sessoes() as db:
        return bool(await db.scalar(select(func.count()).select_from(Equipamento)))
