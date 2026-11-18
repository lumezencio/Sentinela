"""API de alertas: leitura por qualquer usuário, reconhecimento só do admin."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.barramento import Barramento
from sentinela.db.modelos import Alerta, Auditoria, Classe, Equipamento

URL = "/api/v1/alertas"
T0 = datetime(2026, 11, 18, 17, 0, tzinfo=UTC)


def _sessoes(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    s: async_sessionmaker[AsyncSession] = app.state.sessoes
    return s


async def _equip(app: FastAPI, nome: str, n: int, classe: str = "camera") -> str:
    async with _sessoes(app)() as db:
        c = await db.scalar(select(Classe).where(Classe.slug == classe))
        assert c is not None
        eq = Equipamento(
            id=str(uuid.uuid4()),
            nome=nome,
            ip=f"10.99.7.{n}",
            mac=f"02:00:00:00:07:{n:02x}",
            classe_id=c.id,
            checagem="icmp",
            estado="offline",
            estado_desde=T0,
            criado_em=T0,
        )
        db.add(eq)
        await db.commit()
        return eq.id


async def _alerta(app: FastAPI, **kw: Any) -> int:
    base: dict[str, Any] = {"tipo": "queda", "aberto_em": T0, "envio": "pendente"}
    async with _sessoes(app)() as db:
        a = Alerta(**(base | kw))
        db.add(a)
        await db.commit()
        return a.id


async def _auditorias(app: FastAPI) -> list[Auditoria]:
    async with _sessoes(app)() as db:
        consulta = select(Auditoria).where(Auditoria.acao == "alerta.reconhecer")
        return list((await db.execute(consulta)).scalars())


async def test_lista_abertos_por_padrao_com_texto_e_ordem(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    sw = await _equip(app, "Switch Bloco B", 1, "roteador")
    f1, f2 = await _equip(app, "A", 2), await _equip(app, "B", 3)
    velho = await _alerta(app, equipamento_id=sw, quedas=[sw], afetados=[f1, f2])
    novo = await _alerta(
        app, equipamento_id=f1, quedas=[f1], aberto_em=T0 + timedelta(minutes=5), envio="enviado"
    )
    await _alerta(app, equipamento_id=f2, quedas=[f2], fechado_em=T0 + timedelta(minutes=9))
    r = await cliente_visualizador.get(URL)
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["total"] == 2 and corpo["pagina"] == 1 and corpo["por_pagina"] == 50
    assert [i["id"] for i in corpo["itens"]] == [novo, velho]
    item = corpo["itens"][1]
    assert item["texto"] == "Switch Bloco B caiu · 2 afetados"
    assert item["equipamento_nome"] == "Switch Bloco B"
    assert item["classe"] == "roteador"
    assert item["afetados_total"] == 2
    assert item["reconhecido_por"] is None
    assert item["envio"] == "pendente"
    assert corpo["itens"][0]["envio"] == "enviado"


async def test_filtros_reconhecidos_todos_classe_e_periodo(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    cam, rot = await _equip(app, "Cam", 1), await _equip(app, "Rot", 2, "roteador")
    a1 = await _alerta(app, equipamento_id=cam, quedas=[cam], reconhecido_em=T0)
    a2 = await _alerta(
        app,
        equipamento_id=rot,
        quedas=[rot],
        aberto_em=T0 + timedelta(hours=2),
        fechado_em=T0 + timedelta(hours=3),
    )

    def ids(r: httpx.Response) -> list[int]:
        assert r.status_code == 200, r.text
        return [i["id"] for i in r.json()["itens"]]

    assert ids(await cliente_visualizador.get(URL, params={"filtro": "reconhecidos"})) == [a1]
    assert ids(await cliente_visualizador.get(URL, params={"filtro": "todos"})) == [a2, a1]
    todos = {"filtro": "todos"}
    assert ids(await cliente_visualizador.get(URL, params=todos | {"classe": "camera"})) == [a1]
    assert ids(await cliente_visualizador.get(URL, params=todos | {"classe": "roteador"})) == [a2]
    corte = (T0 + timedelta(hours=1)).isoformat()
    assert ids(await cliente_visualizador.get(URL, params=todos | {"desde": corte})) == [a2]
    assert ids(await cliente_visualizador.get(URL, params=todos | {"ate": corte})) == [a1]


async def test_paginacao_e_limite(app: FastAPI, cliente_visualizador: httpx.AsyncClient) -> None:
    for i in range(5):
        await _alerta(app, aberto_em=T0 + timedelta(minutes=i), tipo="fonte_falhou")
    r = await cliente_visualizador.get(URL, params={"por_pagina": 2, "pagina": 3})
    corpo = r.json()
    assert corpo["total"] == 5 and len(corpo["itens"]) == 1 and corpo["pagina"] == 3
    assert (await cliente_visualizador.get(URL, params={"por_pagina": 100})).status_code == 200
    assert (await cliente_visualizador.get(URL, params={"por_pagina": 101})).status_code == 422
    assert (await cliente_visualizador.get(URL, params={"pagina": 0})).status_code == 422
    assert (await cliente_visualizador.get(URL, params={"filtro": "x"})).status_code == 422


async def test_detalhe_traz_afetados_com_limite(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    pai = await _equip(app, "Switch", 1, "roteador")
    f1 = await _equip(app, "Filho 1", 2)
    fantasma = str(uuid.uuid4())  # removido do cadastro depois: some da lista
    a = await _alerta(app, equipamento_id=pai, quedas=[pai], afetados=[f1, fantasma])
    r = await cliente_visualizador.get(f"{URL}/{a}")
    assert r.status_code == 200
    corpo = r.json()
    esperado = {"id": f1, "nome": "Filho 1", "classe": "camera", "estado": "offline"}
    assert corpo["afetados"] == [esperado]
    assert corpo["texto"] == "Switch caiu · 2 afetados"
    # 600 ids no alerta: a lista devolvida nunca passa de 500 (aqui nenhum existe no cadastro)
    grande = [f1, *(str(uuid.uuid4()) for _ in range(600))]
    b = await _alerta(app, equipamento_id=pai, quedas=[pai], afetados=grande)
    r = await cliente_visualizador.get(f"{URL}/{b}")
    assert r.status_code == 200
    assert r.json()["afetados"] == [esperado]
    assert r.json()["afetados_total"] == 601


async def test_volta_le_a_duracao_da_origem(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    eq = await _equip(app, "Switch Bloco B", 1)
    fim = T0 + timedelta(minutes=18)
    origem = await _alerta(app, equipamento_id=eq, quedas=[eq], fechado_em=fim)
    volta = await _alerta(
        app,
        tipo="volta",
        equipamento_id=eq,
        quedas=[eq],
        alerta_origem_id=origem,
        aberto_em=fim,
        fechado_em=fim,
    )
    r = await cliente_visualizador.get(f"{URL}/{volta}")
    assert r.json()["texto"] == "Switch Bloco B voltou (fora por 18 min)"


async def test_id_desconhecido_404(cliente_admin: httpx.AsyncClient) -> None:
    assert (await cliente_admin.get(f"{URL}/999")).status_code == 404
    assert (await cliente_admin.post(f"{URL}/999/reconhecer")).status_code == 404


async def test_visualizador_nao_reconhece(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    a = await _alerta(app)
    assert (await cliente_visualizador.post(f"{URL}/{a}/reconhecer")).status_code == 403


async def test_reconhecer_sem_csrf_403(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    a = await _alerta(app)
    r = await cliente_admin.post(f"{URL}/{a}/reconhecer", headers={"X-CSRF": "errado"})
    assert r.status_code == 403


async def test_reconhecer_audita_e_publica(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    eq = await _equip(app, "Cam", 1)
    a = await _alerta(app, equipamento_id=eq, quedas=[eq], envio="enviado")
    barramento: Barramento = app.state.barramento
    async with barramento.assinar() as fluxo:
        r = await cliente_admin.post(f"{URL}/{a}/reconhecer")
        assert r.status_code == 200, r.text
        msg = await fluxo.__anext__()
    assert r.json()["reconhecido_por"] == "admin-teste"
    assert r.json()["reconhecido_em"] is not None
    assert (msg.tipo, msg.dados) == ("alerta", {"acao": "atualizado", "id": a, "abertos": 1})
    aud = await _auditorias(app)
    assert len(aud) == 1 and aud[0].alvo == str(a) and aud[0].usuario_id is not None
    async with _sessoes(app)() as db:
        linha = await db.get(Alerta, a)
    assert linha is not None and linha.envio == "enviado"  # o reconhecimento não toca o envio


async def test_reconhecer_e_idempotente(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    a = await _alerta(app)
    primeira = (await cliente_admin.post(f"{URL}/{a}/reconhecer")).json()
    r = await cliente_admin.post(f"{URL}/{a}/reconhecer")
    assert r.status_code == 200
    assert r.json()["reconhecido_em"] == primeira["reconhecido_em"]
    assert len(await _auditorias(app)) == 1  # a segunda chamada não audita nem muda nada


CAMPOS_SAIDA = {
    "id", "tipo", "texto", "equipamento_id", "equipamento_nome", "classe", "afetados_total",
    "aberto_em", "fechado_em", "breve", "reconhecido_por", "reconhecido_em", "silenciado",
    "envio",
}  # fmt: skip


async def test_periodo_sem_fuso_422(cliente_visualizador: httpx.AsyncClient) -> None:
    for nome in ("desde", "ate"):
        r = await cliente_visualizador.get(URL, params={nome: "2026-11-18T10:00"})
        assert r.status_code == 422, (nome, r.text)


async def test_campos_exatos_e_nome_hostil_como_texto(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    hostil = "<b>" + "x" * 300
    eq = await _equip(app, hostil, 1)
    a = await _alerta(app, equipamento_id=eq, quedas=[eq])
    item = (await cliente_visualizador.get(URL)).json()["itens"][0]
    assert set(item) == CAMPOS_SAIDA  # sem ip, mac nem fabricante
    assert item["texto"] == f"{hostil} caiu" and item["equipamento_nome"] == hostil
    det = (await cliente_visualizador.get(f"{URL}/{a}")).json()
    assert set(det) == CAMPOS_SAIDA | {"afetados"}
    assert det["texto"] == f"{hostil} caiu"


async def test_total_do_filtro_de_classe(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    cam, rot = await _equip(app, "Cam", 1), await _equip(app, "Rot", 2, "roteador")
    await _alerta(app, equipamento_id=cam, quedas=[cam])
    await _alerta(app, equipamento_id=cam, quedas=[cam])
    await _alerta(app, equipamento_id=rot, quedas=[rot])
    await _alerta(app, tipo="fonte_falhou")  # sem equipamento: fora de qualquer classe
    r = await cliente_visualizador.get(URL, params={"classe": "camera"})
    assert r.json()["total"] == 2
    assert (await cliente_visualizador.get(URL)).json()["total"] == 4
