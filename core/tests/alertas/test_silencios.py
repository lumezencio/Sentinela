"""Silêncios e manutenção: fim obrigatório, pausa só do que é da manutenção, sobreposição."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.alertas.silencios import (
    CAUSA_MANUTENCAO,
    ErroSilencio,
    PedidoSilencio,
    Silencios,
    fim_do_atalho,
)
from sentinela.db.modelos import Auditoria, Classe, Equipamento, Evento, Silencio, Usuario
from sentinela.monitor.estados import Estado

EQUIP = "/api/v1/equipamentos"
SUBREDES = "/api/v1/subredes"
AGORA = datetime(2026, 11, 18, 20, 0, tzinfo=UTC)


def _sessoes(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    s: async_sessionmaker[AsyncSession] = app.state.sessoes
    return s


def _servico(app: FastAPI) -> Silencios:
    s: Silencios = app.state.silencios
    return s


async def _equip(c: httpx.AsyncClient, n: int, classe: str = "camera") -> str:
    await c.post(SUBREDES, json={"cidr": "10.99.0.0/24"})  # repetido: 409 inofensivo
    r = await c.post(EQUIP, json={"nome": f"Equip {n}", "ip": f"10.99.0.{n}", "classe": classe})
    assert r.status_code == 201, r.text
    ident: str = r.json()["id"]
    return ident


async def _admin(app: FastAPI) -> Usuario:
    async with _sessoes(app)() as db:
        u = await db.scalar(select(Usuario).where(Usuario.papel == "admin"))
        assert u is not None
        return u


def _pedido(
    alvo: str, tipo: str = "manutencao", alvo_tipo: str = "equipamento", horas: float = 2
) -> PedidoSilencio:
    return PedidoSilencio(
        tipo=tipo,  # type: ignore[arg-type]
        alvo_tipo=alvo_tipo,  # type: ignore[arg-type]
        alvo=alvo,
        fim=datetime.now(UTC) + timedelta(hours=horas),
        motivo=None,
    )


async def _criar(app: FastAPI, pedido: PedidoSilencio) -> int:
    admin = await _admin(app)
    async with _sessoes(app)() as db:
        sil = await _servico(app).criar(db, pedido, admin, datetime.now(UTC))
        return sil.id


async def _pausado(app: FastAPI, eid: str) -> bool:
    async with _sessoes(app)() as db:
        eq = await db.get(Equipamento, eid)
        assert eq is not None
        return eq.pausado


async def _causas_de_pausa(app: FastAPI, eid: str) -> list[str | None]:
    async with _sessoes(app)() as db:
        linhas = await db.execute(
            select(Evento.causa)
            .where(Evento.equipamento_id == eid, Evento.para == Estado.PAUSADO.value)
            .order_by(Evento.em, Evento.id)
        )
        return list(linhas.scalars())


async def _lista(app: FastAPI, sid: int) -> list[str]:
    async with _sessoes(app)() as db:
        s = await db.get(Silencio, sid)
        assert s is not None
        return list(s.pausados)


def _estado_no_agendador(app: FastAPI, eid: str) -> Estado | None:
    e: Estado | None = app.state.agendador.estado_de(eid)
    return e


# ---- regras de fim ----------------------------------------------------------------------------


async def test_fim_obrigatorio_e_ate_30_dias(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    eid = await _equip(cliente_admin, 10)
    admin = await _admin(app)
    agora = datetime.now(UTC)
    for fim in (agora - timedelta(minutes=1), agora, agora + timedelta(days=30, seconds=1)):
        async with _sessoes(app)() as db:
            pedido = PedidoSilencio("silencio", "equipamento", eid, fim, None)
            with pytest.raises(ErroSilencio):
                await _servico(app).criar(db, pedido, admin, agora)
    async with _sessoes(app)() as db:  # exatamente 30 dias vale
        pedido = PedidoSilencio("silencio", "equipamento", eid, agora + timedelta(days=30), None)
        await _servico(app).criar(db, pedido, admin, agora)


def test_atalho_amanha_8h_usa_fuso() -> None:
    sp = ZoneInfo("America/Sao_Paulo")
    assert fim_do_atalho("amanha_8h", AGORA, sp) == datetime(2026, 11, 19, 11, 0, tzinfo=UTC)
    assert fim_do_atalho("1h", AGORA, sp) == AGORA + timedelta(hours=1)
    assert fim_do_atalho("4h", AGORA, sp) == AGORA + timedelta(hours=4)


# ---- silêncio x manutenção --------------------------------------------------------------------


async def test_silencio_nao_pausa(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    eid = await _equip(cliente_admin, 10)
    sid = await _criar(app, _pedido(eid, tipo="silencio"))
    assert not await _pausado(app, eid)
    assert await _lista(app, sid) == []


async def test_manutencao_pausa_e_guarda_lista(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    livre = await _equip(cliente_admin, 10)
    manual = await _equip(cliente_admin, 11)
    await cliente_admin.post(f"{EQUIP}/{manual}/pausar")
    sid = await _criar(app, _pedido(livre))
    assert await _pausado(app, livre)
    assert (await _causas_de_pausa(app, livre))[-1] == CAUSA_MANUTENCAO
    assert await _lista(app, sid) == [livre]
    sid2 = await _criar(app, _pedido(manual))  # já pausado à mão: fora da lista
    assert await _lista(app, sid2) == []
    assert (await _causas_de_pausa(app, manual))[-1] == "manual"


async def test_manutencao_de_classe_pausa_todos_da_classe(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    a = await _equip(cliente_admin, 10, "camera")
    b = await _equip(cliente_admin, 11, "camera")
    outro = await _equip(cliente_admin, 12, "servidor")
    sid = await _criar(app, _pedido("camera", alvo_tipo="classe"))
    assert sorted(await _lista(app, sid)) == sorted([a, b])
    assert await _pausado(app, a) and await _pausado(app, b)
    assert not await _pausado(app, outro)


async def test_fim_da_manutencao_retoma_so_os_seus(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    seu = await _equip(cliente_admin, 10)
    manual = await _equip(cliente_admin, 11)
    fora = await _equip(cliente_admin, 12)
    await cliente_admin.post(f"{EQUIP}/{manual}/pausar")
    async with _sessoes(app)() as db:  # pausa por sub-rede (causa registrada como no sync)
        eq = await db.get(Equipamento, fora)
        assert eq is not None
        eq.pausado = True
        db.add(
            Evento(
                equipamento_id=fora,
                de="desconhecido",
                para="pausado",
                em=datetime.now(UTC),
                duracao_s=0,
                causa="fora_das_subredes",
            )
        )
        await db.commit()
    sid = await _criar(app, _pedido("camera", alvo_tipo="classe"))
    assert await _lista(app, sid) == [seu]
    assert await _servico(app).encerrar(sid, None, datetime.now(UTC)) is not None
    assert not await _pausado(app, seu)
    assert await _pausado(app, manual)
    assert await _pausado(app, fora)
    assert _estado_no_agendador(app, seu) is not Estado.PAUSADO


async def test_manutencoes_sobrepostas_nao_retomam_cedo(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    eid = await _equip(cliente_admin, 10)
    primeira = await _criar(app, _pedido(eid, horas=1))
    segunda = await _criar(app, _pedido("camera", alvo_tipo="classe", horas=3))
    assert await _lista(app, segunda) == []  # já estava pausado pela primeira
    await _servico(app).encerrar(primeira, None, datetime.now(UTC))
    assert await _pausado(app, eid)  # a segunda ainda o segura
    assert await _lista(app, segunda) == [eid]  # e agora é dela
    await _servico(app).encerrar(segunda, None, datetime.now(UTC))
    assert not await _pausado(app, eid)


async def test_pausa_manual_durante_manutencao_nao_e_desfeita(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    eid = await _equip(cliente_admin, 10)
    sid = await _criar(app, _pedido(eid))
    assert (await cliente_admin.post(f"{EQUIP}/{eid}/retomar")).status_code == 200
    assert (await cliente_admin.post(f"{EQUIP}/{eid}/pausar")).status_code == 200
    assert (await _causas_de_pausa(app, eid))[-1] == "manual"
    await _servico(app).encerrar(sid, None, datetime.now(UTC))
    assert await _pausado(app, eid)


async def test_retomada_fora_das_subredes_continua_pausada(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    eid = await _equip(cliente_admin, 10)
    sid = await _criar(app, _pedido(eid))
    sub = (await cliente_admin.get(SUBREDES)).json()[0]["id"]
    assert (await cliente_admin.delete(f"{SUBREDES}/{sub}")).status_code == 204
    await _servico(app).encerrar(sid, None, datetime.now(UTC))
    assert await _pausado(app, eid)
    assert (await _causas_de_pausa(app, eid))[-1] == "fora_das_subredes"


# ---- laço, auditoria e cobertura --------------------------------------------------------------


async def test_encerrar_vencidos_audita_como_sistema(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    eid = await _equip(cliente_admin, 10)
    sid = await _criar(app, _pedido(eid, horas=1))
    servico = _servico(app)
    assert await servico.encerrar_vencidos(datetime.now(UTC)) == 0
    assert await servico.encerrar_vencidos(datetime.now(UTC) + timedelta(hours=2)) == 1
    assert not await _pausado(app, eid)  # quem fecha a manutenção vencida é o laço, não a limpeza
    assert await servico.encerrar_vencidos(datetime.now(UTC) + timedelta(hours=3)) == 0
    async with _sessoes(app)() as db:
        consulta = select(Auditoria).where(Auditoria.acao == "silencio.encerrar")
        aud = (await db.execute(consulta)).scalars().all()
    assert [(a.usuario_id, a.alvo) for a in aud] == [(None, str(sid))]


async def test_cobertura_inclui_ancestrais(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    pai = await _equip(cliente_admin, 10)
    filho = await _equip(cliente_admin, 11)
    await _criar(app, _pedido(pai, tipo="silencio"))
    await _criar(app, _pedido("servidor", tipo="silencio", alvo_tipo="classe"))
    async with _sessoes(app)() as db:
        cob = await _servico(app).cobertura(db, datetime.now(UTC))
        classes = {c.slug: c.id for c in (await db.execute(select(Classe))).scalars()}
    assert cob.cobre(pai, classes["camera"], [])
    assert cob.cobre(filho, classes["camera"], [pai])
    assert not cob.cobre(filho, classes["camera"], [])
    assert cob.cobre(filho, classes["servidor"], [])
