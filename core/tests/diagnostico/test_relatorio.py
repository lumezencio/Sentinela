import csv
import io
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Classe, Equipamento, Evento, Fonte, LeituraUptime, SubRede
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.diagnostico import relatorio as rel
from sentinela.diagnostico.relatorio import Periodo, csv_do, montar
from sentinela.diagnostico.textos import SUGESTOES
from tests.conftest import criar_esquema

SP = ZoneInfo("America/Sao_Paulo")
AGORA = datetime(2026, 11, 20, 15, 0, tzinfo=UTC)
Sessoes = async_sessionmaker[AsyncSession]


@pytest.fixture
async def sessoes(tmp_path: Path) -> AsyncIterator[Sessoes]:
    url = f"sqlite+aiosqlite:///{tmp_path / 'rel.db'}"
    await criar_esquema(url)
    motor = criar_motor(url)
    fab = fabrica_sessao(motor)
    async with fab() as db:
        await semear_classes(db)
        await db.commit()
    try:
        yield fab
    finally:
        await motor.dispose()


async def _eq(db: AsyncSession, nome: str, ip: str, classe: str = "camera") -> str:
    c = await db.scalar(select(Classe).where(Classe.slug == classe))
    assert c is not None
    e = Equipamento(
        id=str(uuid.uuid4()),
        nome=nome,
        ip=ip,
        classe_id=c.id,
        estado="online",
        estado_desde=AGORA,
        criado_em=AGORA,
    )
    db.add(e)
    await db.flush()
    return e.id


def _queda(db: AsyncSession, eid: str, ini: datetime, dur_s: float | None) -> None:
    db.add(Evento(equipamento_id=eid, de="online", para="offline", em=ini))
    if dur_s is not None:
        db.add(
            Evento(
                equipamento_id=eid,
                de="offline",
                para="online",
                em=ini + timedelta(seconds=dur_s),
            )
        )


async def test_resumo_por_tipo_e_fora_sem_dupla_contagem(sessoes: Sessoes) -> None:
    ini = AGORA - timedelta(hours=3)
    async with sessoes() as db:
        a = await _eq(db, "Câmera A", "10.99.0.21")
        b = await _eq(db, "Câmera B", "10.99.0.22")
        c = await _eq(db, "Câmera C", "10.99.0.23")
        _queda(db, a, ini, 100)  # incidente 1: A e B sobrepostos -> 110 s de união
        _queda(db, b, ini + timedelta(seconds=10), 100)
        _queda(db, c, AGORA - timedelta(hours=1), 60)  # incidente 2: isolada
        await db.commit()
        r = await montar(db, AGORA, "24h", SP)
    assert len(r.incidentes) == 2
    assert r.fora_s == pytest.approx(110 + 60)
    assert r.por_tipo == {"quedas_simultaneas": 1, "queda_isolada": 1}
    assert r.incidentes[0][0].inicio > r.incidentes[1][0].inicio  # mais recentes primeiro
    assert r.nomes[a] == "Câmera A"


async def test_horas_no_fuso(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        a = await _eq(db, "Câmera A", "10.99.0.21")
        _queda(db, a, datetime(2026, 11, 20, 5, 30, tzinfo=UTC), 60)
        await db.commit()
        r = await montar(db, AGORA, "24h", SP)
    assert len(r.horas) == 24 and r.horas[2] == 1 and sum(r.horas) == 1


async def test_periodos_24h_7d_30d(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        a = await _eq(db, "Câmera A", "10.99.0.21")
        for dt in (timedelta(hours=5), timedelta(days=3), timedelta(days=20), timedelta(days=40)):
            _queda(db, a, AGORA - dt, 60)
        await db.commit()
        periodos: tuple[Periodo, ...] = ("24h", "7d", "30d")
        n = {p: len((await montar(db, AGORA, p, SP)).incidentes) for p in periodos}
    assert n == {"24h": 1, "7d": 2, "30d": 3}


async def test_acima_do_teto_marca_truncado(
    sessoes: Sessoes, monkeypatch: pytest.MonkeyPatch
) -> None:
    async with sessoes() as db:
        a = await _eq(db, "Câmera A", "10.99.0.21")
        for i in range(5):
            _queda(db, a, AGORA - timedelta(hours=1 + 2 * i), 30)
        await db.commit()
        antes = await montar(db, AGORA, "24h", SP)
        assert len(antes.incidentes) == 5 and not antes.truncado
        monkeypatch.setattr(rel, "MAX_INCIDENTES", 3)
        r = await montar(db, AGORA, "24h", SP)
        assert len(r.incidentes) == 3 and r.truncado
        assert r.incidentes[0][0].inicio == AGORA - timedelta(hours=1)  # os mais recentes ficam
        monkeypatch.setattr(rel, "MAX_INCIDENTES", 500)
        monkeypatch.setattr(rel, "MAX_EVENTOS", 4)
        r2 = await montar(db, AGORA, "24h", SP)
    assert r2.truncado


async def test_sem_gateway_configurado(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        a = await _eq(db, "Câmera A", "10.99.0.21")
        _queda(db, a, AGORA - timedelta(hours=2), 60)
        db.add(SubRede(cidr="10.99.0.0/24"))
        await db.commit()
        r = await montar(db, AGORA, "24h", SP)
        assert not r.gateway_configurado
        db.add(SubRede(cidr="10.99.1.0/24", gateway_ip="10.99.1.1"))
        await _eq(db, "Roteador", "10.99.1.1", "roteador")
        await db.commit()
        r2 = await montar(db, AGORA, "24h", SP)
    assert r2.gateway_configurado


def test_sugestoes_do_roteador_sao_as_quatro_da_spec() -> None:
    assert SUGESTOES["roteador_reiniciou"] == (
        "Trocar a fonte do roteador.",
        "Ligar o roteador num nobreak.",
        "Atualizar o firmware.",
        "Tirar o roteador do calor.",
    )
    for tipo, itens in SUGESTOES.items():
        assert 2 <= len(itens) <= 4, tipo


async def _cenario_roteador(db: AsyncSession, leituras: bool) -> None:
    ini = AGORA - timedelta(hours=2)
    db.add(SubRede(cidr="10.99.0.0/24", gateway_ip="10.99.0.1"))
    g = await _eq(db, "Roteador", "10.99.0.1", "roteador")
    _queda(db, g, ini, 90)
    for i in range(10):
        m = await _eq(db, f"Aparelho {i}", f"10.99.0.{20 + i}")
        _queda(db, m, ini + timedelta(seconds=2 + i), 95 + i)
    if leituras:
        fonte = Fonte(
            tipo="snmp",
            nome="f",
            host="10.99.0.1",
            porta=161,
            tls=False,
            credencial_cifrada=b"",
            ativa=True,
            intervalo_s=600,
            equipamento_id=g,
        )
        db.add(fonte)
        await db.flush()
        # inseridas em ordem; a última leva um lido_em ANTERIOR (relógio recuou): sem reinício
        for lido, up in (
            (ini - timedelta(minutes=30), 1000.0),
            (ini + timedelta(minutes=10), 2800.0),
            (ini + timedelta(minutes=9), 2860.0),
        ):
            db.add(LeituraUptime(fonte_id=fonte.id, equipamento_id=g, lido_em=lido, uptime_s=up))
    await db.commit()


async def test_roteador_provavel_sem_leitura(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        await _cenario_roteador(db, leituras=False)
        r = await montar(db, AGORA, "24h", SP)
    ((_, c),) = r.incidentes
    assert (c.tipo, c.certeza) == ("roteador_reiniciou", "provavel")


async def test_leituras_lidas_na_ordem_de_insercao_sem_reinicio_falso(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        await _cenario_roteador(db, leituras=True)
        r = await montar(db, AGORA, "24h", SP)
    ((_, c),) = r.incidentes
    # por lido_em a 3ª leitura (2860) viria antes da 2ª (2800): reinício falso
    assert (c.tipo, c.certeza) == ("gateway_sem_reinicio", "confirmado")


async def test_csv_neutraliza_formula_e_mantem_texto_inteiro(sessoes: Sessoes) -> None:
    nomes = [
        '=HYPERLINK("http://x";"a")',
        '+soma;com "aspas"\nquebra',
        "-menos",
        "@arroba",
        "\tcom tab",
        "N" * 300,
    ]
    async with sessoes() as db:
        for i, nome in enumerate(nomes):
            eid = await _eq(db, nome, f"10.99.0.{21 + i}")
            _queda(db, eid, AGORA - timedelta(hours=2), 60)
        await db.commit()
        r = await montar(db, AGORA, "24h", SP)
    texto = csv_do(r, SP)
    assert texto.startswith("﻿")
    linhas = list(csv.reader(io.StringIO(texto[1:], newline=""), delimiter=";"))
    assert linhas[0] == [
        "inicio",
        "fim",
        "duracao",
        "classificacao",
        "equipamentos",
        "porque",
        "sugestoes",
    ]
    assert len(linhas) == 2
    for nome in nomes:
        assert nome in linhas[1][4]  # texto inteiro: aspas, ';', quebra e 300 caracteres
    assert all(c[:1] not in ("=", "+", "-", "@", "\t", "\r") for c in linhas[1])
    assert linhas[1][4][0] == "'"
    corpo = texto[1:].split("\r\n", 1)[1]
    assert corpo.startswith('"') and corpo.rstrip("\r\n").endswith('"')
    assert "10.99." not in texto and "02:00:00" not in texto


async def test_csv_celula_que_comeca_com_perigo_ganha_apostrofo(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        a = await _eq(db, "=cmd", "10.99.0.21")
        _queda(db, a, AGORA - timedelta(hours=2), 60)
        await db.commit()
        r = await montar(db, AGORA, "24h", SP)
    linhas = list(csv.reader(io.StringIO(csv_do(r, SP)[1:], newline=""), delimiter=";"))
    assert linhas[1][4] == "'=cmd"


async def _fonte(db: AsyncSession, g: str, tipo: str) -> str:
    f = Fonte(
        tipo=tipo,
        nome=tipo,
        host="10.99.0.1",
        porta=161,
        tls=False,
        credencial_cifrada=b"",
        ativa=True,
        intervalo_s=600,
        equipamento_id=g,
    )
    db.add(f)
    await db.flush()
    return f.id


async def test_fontes_com_contadores_defasados_nao_viram_reinicio(sessoes: Sessoes) -> None:
    ini = AGORA - timedelta(hours=2)
    async with sessoes() as db:
        db.add(SubRede(cidr="10.99.0.0/24", gateway_ip="10.99.0.1"))
        g = await _eq(db, "Roteador", "10.99.0.1", "roteador")
        _queda(db, g, ini, 20)
        snmp, mk = await _fonte(db, g, "snmp"), await _fonte(db, g, "mikrotik")
        # intercaladas: o contador de uma fonte fica 3 s atrás do da outra
        for k, (fonte, up) in enumerate(
            [(snmp, 1000.0), (mk, 997.0), (snmp, 1600.0), (mk, 1597.0), (snmp, 2200.0)]
        ):
            lido = ini - timedelta(minutes=30) + timedelta(minutes=12 * k)
            db.add(LeituraUptime(fonte_id=fonte, equipamento_id=g, lido_em=lido, uptime_s=up))
        await db.commit()
        r = await montar(db, AGORA, "24h", SP)
    ((_, c),) = r.incidentes
    assert (c.tipo, c.certeza) == ("gateway_sem_reinicio", "confirmado")


async def test_reinicio_visto_por_uma_fonte_continua_confirmado(sessoes: Sessoes) -> None:
    ini = AGORA - timedelta(hours=2)
    async with sessoes() as db:
        db.add(SubRede(cidr="10.99.0.0/24", gateway_ip="10.99.0.1"))
        g = await _eq(db, "Roteador", "10.99.0.1", "roteador")
        _queda(db, g, ini, 20)
        snmp, mk = await _fonte(db, g, "snmp"), await _fonte(db, g, "mikrotik")
        for fonte, minutos, up in (
            (snmp, -30, 5000.0),
            (mk, -29, 4990.0),
            (snmp, 5, 300.0),  # o SNMP viu o uptime voltar a zero
            (mk, 6, 5600.0),  # a outra fonte (defasada) segue alta: não esconde nem inventa
        ):
            lido = ini + timedelta(minutes=minutos)
            db.add(LeituraUptime(fonte_id=fonte, equipamento_id=g, lido_em=lido, uptime_s=up))
        await db.commit()
        r = await montar(db, AGORA, "24h", SP)
    ((_, c),) = r.incidentes
    assert (c.tipo, c.certeza) == ("roteador_reiniciou", "confirmado")


async def test_gateway_ignora_equipamento_de_gravador_com_o_mesmo_ip(sessoes: Sessoes) -> None:
    async with sessoes() as db:
        db.add(SubRede(cidr="10.99.0.0/24", gateway_ip="10.99.0.1"))
        c = await db.scalar(select(Classe).where(Classe.slug == "camera"))
        assert c is not None
        cam = Equipamento(
            id=str(uuid.uuid4()),
            nome="Câmera do gravador",
            ip="10.99.0.1",
            classe_id=c.id,
            checagem="gravador",
            estado="online",
            estado_desde=AGORA,
            criado_em=AGORA,
        )
        db.add(cam)
        await db.flush()
        _queda(db, cam.id, AGORA - timedelta(hours=2), 60)
        await db.commit()
        r = await montar(db, AGORA, "24h", SP)
    assert not r.gateway_configurado  # só havia o "IP do gateway" de uma câmera de gravador
    ((_, c2),) = r.incidentes
    assert c2.tipo == "queda_isolada"
