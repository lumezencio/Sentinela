"""Cena comum dos testes de mescla, orquestrador e varredura (banco real em arquivo)."""

import random
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import UTC, datetime
from ipaddress import IPv4Network
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.barramento import Barramento, Mensagem
from sentinela.db.base import Base
from sentinela.db.modelos import Classe, Equipamento, Fonte, SubRede
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.estados import ResultadoChecagem, Transicao
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import Guarda
from sentinela.relogio import RelogioFalso

AGORA = datetime(2026, 11, 17, 12, 0, tzinfo=UTC)
SUB_COMUM = "10.99.1.0/24"  # sem varredura
SUB_VARREDURA = "10.99.2.0/24"  # com varredura (sondagem permitida)


class BarramentoGravado(Barramento):
    def __init__(self) -> None:
        super().__init__()
        self.mensagens: list[Mensagem] = []

    def publicar(self, msg: Mensagem) -> None:
        self.mensagens.append(msg)
        super().publicar(msg)

    def do_tipo(self, tipo: str) -> list[dict[str, Any]]:
        return [m.dados for m in self.mensagens if m.tipo == tipo]


@dataclass
class GravadorFalso:
    amostras: list[tuple[str, ResultadoChecagem]] = field(default_factory=list)

    async def registrar_transicao(
        self, id: str, t: Transicao, em: datetime, causa: str | None = None
    ) -> None:
        return None

    def acumular_amostra(self, id: str, r: ResultadoChecagem, em: datetime) -> None:
        self.amostras.append((id, r))

    async def descarregar(self) -> None:
        return None


class LimitadorEspiao(Limitador):
    def __init__(self, relogio: RelogioFalso) -> None:
        super().__init__(100.0, relogio)
        self.pedidos: list[tuple[int, str | None]] = []

    async def adquirir(  # type: ignore[override]
        self, custo: int = 1, prioritario: bool = False, *, prioridade: str | None = None
    ) -> None:
        self.pedidos.append((custo, prioridade))


@dataclass
class Cena:
    sessoes: async_sessionmaker[AsyncSession]
    guarda: Guarda
    relogio: RelogioFalso
    barramento: BarramentoGravado
    limitador: LimitadorEspiao
    agendador: Agendador


@asynccontextmanager
async def montar_cena(tmp_path: Path) -> AsyncIterator[Cena]:
    motor = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'descoberta.db'}")
    async with motor.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessoes = fabrica_sessao(motor)
    async with sessoes() as db:
        await semear_classes(db)
        db.add_all([SubRede(cidr=SUB_COMUM), SubRede(cidr=SUB_VARREDURA, permite_varredura=True)])
        await db.commit()
    relogio = RelogioFalso()
    barramento = BarramentoGravado()
    limitador = LimitadorEspiao(relogio)
    guarda = Guarda([IPv4Network(SUB_COMUM), IPv4Network(SUB_VARREDURA)])
    agendador = Agendador(
        guarda=guarda,
        limitador=limitador,
        relogio=relogio,
        barramento=barramento,
        gravador=GravadorFalso(),
        rng=random.Random(1),  # noqa: S311 - jitter determinístico no teste
        agora_parede=lambda: AGORA,
    )
    try:
        yield Cena(sessoes, guarda, relogio, barramento, limitador, agendador)
        await agendador.aguardar_gravacoes()
    finally:
        await motor.dispose()


async def criar_equipamento(
    db: AsyncSession,
    nome: str,
    ip: str,
    *,
    mac: str | None = None,
    classe: str = "computador",
    checagem: str = "icmp",
    pai: str | None = None,
    canal: int | None = None,
) -> Equipamento:
    classe_id = await db.scalar(select(Classe.id).where(Classe.slug == classe))
    assert classe_id is not None
    eq = Equipamento(
        nome=nome,
        ip=ip,
        mac=mac,
        classe_id=classe_id,
        checagem=checagem,
        estado="desconhecido",
        estado_desde=AGORA,
        criado_em=AGORA,
        pai_id=pai,
        canal=canal,
    )
    db.add(eq)
    await db.flush()
    return eq


def criar_fonte(
    tipo: str = "mikrotik",
    host: str = "10.99.1.1",
    *,
    id: str | None = None,
    equipamento: str | None = None,
    porta: int = 8729,
    credencial: bytes = b"x",
) -> Fonte:
    dados: dict[str, Any] = {}
    if id is not None:
        dados["id"] = id
    return Fonte(
        tipo=tipo,
        nome=f"{tipo} {host}",
        host=host,
        porta=porta,
        tls=True,
        credencial_cifrada=credencial,
        ativa=True,
        intervalo_s=600,
        equipamento_id=equipamento,
        **dados,
    )
