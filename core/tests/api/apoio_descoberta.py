"""Apoio dos testes da API da descoberta: coletores, sondagem e ping falsos (nenhum socket)."""

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Auditoria, Descoberta, Fonte
from sentinela.descoberta.fontes.base import Achado, ResultadoTeste
from sentinela.descoberta.mescla import reclassificar
from sentinela.descoberta.orquestrador import Orquestrador
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, Guarda
from sentinela.seguranca.cofre import Cofre

FONTES = "/api/v1/fontes"
DESCOBERTAS = "/api/v1/descobertas"
SUBREDES = "/api/v1/subredes"
VARREDURA = "/api/v1/varredura"
CONFIG = "/api/v1/config/descoberta"
AGORA = datetime(2026, 11, 17, 12, 0, tzinfo=UTC)
IMPRESSAO = "ab" * 32
OUTRA_IMPRESSAO = "cd" * 32


@dataclass
class ColetorFalso:
    """Coletor sem rede: o teste decide o resultado do teste e os achados."""

    teste: ResultadoTeste | BaseException = field(
        default_factory=lambda: ResultadoTeste(ok=True, identidade="Roteador", versao="7.15")
    )
    achados: list[Achado] = field(default_factory=list)
    erro_coleta: BaseException | None = None
    coletas: int = 0

    async def coletar(self) -> list[Achado]:
        self.coletas += 1
        if self.erro_coleta is not None:
            raise self.erro_coleta
        return list(self.achados)

    async def testar(self) -> ResultadoTeste:
        if isinstance(self.teste, BaseException):
            raise self.teste
        return self.teste


@dataclass
class Falsos:
    """Troca a fábrica de coletores, a sondagem e o ping do app (nenhum pacote sai)."""

    coletor: ColetorFalso = field(default_factory=ColetorFalso)
    sondados: list[str] = field(default_factory=list)
    portas: set[int] = field(default_factory=lambda: {554})
    pings: list[str] = field(default_factory=list)

    def instalar(self, app: FastAPI) -> None:
        orq: Orquestrador = app.state.orquestrador

        def fabrica(_f: Fonte, _c: Cofre, _g: Guarda, _l: Limitador) -> ColetorFalso:
            return self.coletor

        async def sondar(ip: str, guarda: Guarda, _l: Limitador) -> tuple[set[int], str | None]:
            guarda.validar(ip, 80, "tcp")
            self.sondados.append(ip)
            return set(self.portas), None

        async def ping(destino: DestinoAutorizado) -> bool:
            self.pings.append(str(destino.ip))
            return False

        orq._fabrica = fabrica  # noqa: SLF001 - injeção de teste
        orq._sondar = sondar  # noqa: SLF001
        orq._ping = ping  # noqa: SLF001
        app.state.varredura._ping = ping  # noqa: SLF001


def sessoes(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    s: async_sessionmaker[AsyncSession] = app.state.sessoes
    return s


async def subrede(c: httpx.AsyncClient, cidr: str = "10.99.0.0/24") -> dict[str, Any]:
    r = await c.post(SUBREDES, json={"cidr": cidr})
    assert r.status_code == 201, r.text
    dados: dict[str, Any] = r.json()
    return dados


def corpo_mikrotik(**extra: Any) -> dict[str, Any]:
    corpo: dict[str, Any] = {
        "tipo": "mikrotik",
        "nome": "Roteador",
        "host": "10.99.0.1",
        "credencial": {"usuario": "leitor", "senha": "senha-do-roteador"},
    }
    corpo.update(extra)
    return corpo


async def criar_fonte(c: httpx.AsyncClient, **extra: Any) -> dict[str, Any]:
    r = await c.post(FONTES, json=corpo_mikrotik(**extra))
    assert r.status_code == 201, r.text
    dados: dict[str, Any] = r.json()
    return dados


async def criar_descoberta(
    app: FastAPI,
    ip: str = "10.99.0.30",
    *,
    mac: str | None = "02:00:00:00:00:30",
    status: str = "pendente",
    fabricante: str | None = "Hikvision",
    nome: str | None = "Câmera 30",
    portas: list[int] | None = None,
    fora: bool = False,
    conflito_com: str | None = None,
    chave: str | None = None,
    canal: int | None = None,
) -> str:
    async with sessoes(app)() as db:
        d = Descoberta(
            id=str(uuid.uuid4()),
            chave=chave or mac or f"ip:{ip}",
            ip=ip,
            mac=mac,
            fabricante=fabricante,
            nome_sugerido=nome,
            sinais={"portas": portas} if portas is not None else {},
            origens=[{"fonte_id": "f1", "origem": "arp"}],
            status=status,
            fora_das_subredes=fora,
            conflito_com=conflito_com,
            canal=canal,
            primeira_vez=AGORA,
            ultima_vez=AGORA,
        )
        reclassificar(d)
        db.add(d)
        await db.commit()
        return d.id


async def auditorias(app: FastAPI) -> list[Auditoria]:
    async with sessoes(app)() as db:
        return list((await db.execute(select(Auditoria).order_by(Auditoria.id))).scalars())


async def descoberta(app: FastAPI, id: str) -> Descoberta:
    async with sessoes(app)() as db:
        d = await db.get(Descoberta, id)
        assert d is not None
        return d
