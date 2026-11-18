"""API de silêncios: papéis, CSRF, validação, auditoria."""

from datetime import UTC, datetime, timedelta

import httpx
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Auditoria

URL = "/api/v1/silencios"
EQUIP = "/api/v1/equipamentos"


async def _equip(c: httpx.AsyncClient) -> str:
    await c.post("/api/v1/subredes", json={"cidr": "10.99.0.0/24"})
    r = await c.post(EQUIP, json={"nome": "Câmera A", "ip": "10.99.0.10", "classe": "camera"})
    ident: str = r.json()["id"]
    return ident


def _corpo(alvo: str, **extra: object) -> dict[str, object]:
    return {"tipo": "manutencao", "alvo_tipo": "equipamento", "alvo": alvo, "atalho": "1h"} | extra


async def test_admin_cria_lista_e_encerra(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    eid = await _equip(cliente_admin)
    r = await cliente_admin.post(URL, json=_corpo(eid, motivo="troca de cabo"))
    assert r.status_code == 201, r.text
    criado = r.json()
    assert criado["alvo_nome"] == "Câmera A"
    assert criado["pausados"] == 1
    assert criado["criado_por"] == "admin-teste"
    assert (await cliente_admin.get(URL)).json() == [criado]
    r = await cliente_admin.post(f"{URL}/{criado['id']}/encerrar")
    assert r.status_code == 200
    assert (await cliente_admin.get(URL)).json() == []
    assert (await cliente_admin.post(f"{URL}/{criado['id']}/encerrar")).status_code == 404
    assert (await cliente_admin.get(f"{EQUIP}/{eid}")).json()["estado"] != "pausado"


async def test_criar_audita(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    eid = await _equip(cliente_admin)
    sid = (await cliente_admin.post(URL, json=_corpo(eid, tipo="silencio"))).json()["id"]
    await cliente_admin.post(f"{URL}/{sid}/encerrar")
    sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
    async with sessoes() as db:
        consulta = select(Auditoria).where(Auditoria.acao.like("silencio.%"))
        aud = (await db.execute(consulta)).scalars().all()
    assert sorted(a.acao for a in aud) == ["silencio.criar", "silencio.encerrar"]
    assert all(a.usuario_id is not None and a.alvo == str(sid) for a in aud)


async def test_visualizador_lista_mas_nao_escreve(
    cliente_visualizador: httpx.AsyncClient,
) -> None:
    assert (await cliente_visualizador.get(URL)).status_code == 200
    assert (await cliente_visualizador.post(URL, json=_corpo("x"))).status_code == 403
    assert (await cliente_visualizador.post(f"{URL}/1/encerrar")).status_code == 403


async def test_sem_csrf_403(cliente_admin: httpx.AsyncClient) -> None:
    eid = await _equip(cliente_admin)
    r = await cliente_admin.post(URL, json=_corpo(eid), headers={"X-CSRF": "errado"})
    assert r.status_code == 403
    r = await cliente_admin.post(f"{URL}/1/encerrar", headers={"X-CSRF": "errado"})
    assert r.status_code == 403


async def test_validacoes_422(cliente_admin: httpx.AsyncClient) -> None:
    eid = await _equip(cliente_admin)
    assert (await cliente_admin.post(URL, json=_corpo("nao-existe"))).status_code == 422
    r = await cliente_admin.post(URL, json=_corpo("inexistente", alvo_tipo="classe"))
    assert r.status_code == 422
    ambos = _corpo(eid, fim=(datetime.now(UTC) + timedelta(hours=1)).isoformat())
    assert (await cliente_admin.post(URL, json=ambos)).status_code == 422
    nenhum = {"tipo": "silencio", "alvo_tipo": "equipamento", "alvo": eid}
    assert (await cliente_admin.post(URL, json=nenhum)).status_code == 422
    longe = (datetime.now(UTC) + timedelta(days=31)).isoformat()
    corpo = {"tipo": "silencio", "alvo_tipo": "equipamento", "alvo": eid, "fim": longe}
    assert (await cliente_admin.post(URL, json=corpo)).status_code == 422
    passado = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    assert (await cliente_admin.post(URL, json=corpo | {"fim": passado})).status_code == 422
    sem_fuso = (datetime.now(UTC) + timedelta(hours=1)).replace(tzinfo=None).isoformat()
    assert (await cliente_admin.post(URL, json=corpo | {"fim": sem_fuso})).status_code == 422


async def test_fim_personalizado_e_classe(cliente_admin: httpx.AsyncClient) -> None:
    await _equip(cliente_admin)
    fim = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    corpo = {"tipo": "silencio", "alvo_tipo": "classe", "alvo": "camera", "fim": fim}
    r = await cliente_admin.post(URL, json=corpo)
    assert r.status_code == 201, r.text
    assert r.json()["alvo"] == "camera"
