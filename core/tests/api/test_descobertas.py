"""API de descobertas: fila, aprovação, lote, ignorar/reabrir, sondar e declarar sub-rede."""

from typing import Any

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select

from sentinela.db.modelos import Equipamento, SubRede
from sentinela.monitor.agendador import Agendador
from tests.api.apoio_descoberta import (
    DESCOBERTAS,
    Falsos,
    auditorias,
    criar_descoberta,
    descoberta,
    sessoes,
    subrede,
)

ID = "00000000-0000-4000-8000-000000000000"


@pytest.fixture
async def falsos(app: FastAPI, cliente_admin: httpx.AsyncClient) -> Falsos:
    f = Falsos()
    f.instalar(app)
    await subrede(cliente_admin)
    return f


ESCRITAS = [
    f"{DESCOBERTAS}/{ID}/aprovar",
    f"{DESCOBERTAS}/{ID}/ignorar",
    f"{DESCOBERTAS}/{ID}/reabrir",
    f"{DESCOBERTAS}/{ID}/sondar",
    f"{DESCOBERTAS}/{ID}/declarar-subrede",
    f"{DESCOBERTAS}/aprovar-lote",
]


@pytest.mark.parametrize("url", ESCRITAS)
async def test_escrita_403_para_visualizador(
    cliente_visualizador: httpx.AsyncClient, url: str
) -> None:
    assert (await cliente_visualizador.post(url, json={"ids": [ID]})).status_code == 403


@pytest.mark.parametrize("url", ESCRITAS)
async def test_escrita_403_sem_csrf(cliente_admin: httpx.AsyncClient, url: str) -> None:
    del cliente_admin.headers["X-CSRF"]
    assert (await cliente_admin.post(url, json={"ids": [ID]})).status_code == 403


async def test_listar_permitido_ao_visualizador_com_sinais(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    id = await criar_descoberta(app, portas=[554])
    r = await cliente_visualizador.get(DESCOBERTAS)
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["total"] == 1
    item = corpo["itens"][0]
    assert item["id"] == id and item["classe_sugerida"] == "camera"
    assert item["status"] == "pendente" and item["mac"] == "02:00:00:00:00:30"
    assert item["sinais"] and all(set(s) == {"descricao", "pontos"} for s in item["sinais"])
    assert any("554" in s["descricao"] for s in item["sinais"])
    assert item["origens"] == [{"fonte_id": "f1", "origem": "arp"}]
    campos = {
        "id", "ip", "mac", "fabricante", "nome_sugerido", "classe_sugerida", "confianca",
        "sinais", "origens", "status", "fora_das_subredes", "conflito_com_nome",
        "pai_equipamento_id", "canal", "gravador_fonte_id", "primeira_vez", "ultima_vez",
    }  # fmt: skip
    assert set(item) == campos


async def test_listar_sem_sessao_401(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get(DESCOBERTAS)).status_code == 401


async def test_paginacao_e_filtro_status(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    for i in range(5):
        await criar_descoberta(app, f"10.99.0.{40 + i}", mac=f"02:00:00:00:00:{40 + i:02x}")
    await criar_descoberta(app, "10.99.0.60", mac="02:00:00:00:00:60", status="ignorada")
    r = await cliente_visualizador.get(DESCOBERTAS, params={"status": "pendente", "limit": 2})
    assert r.json()["total"] == 5 and len(r.json()["itens"]) == 2
    r2 = await cliente_visualizador.get(
        DESCOBERTAS, params={"status": "pendente", "limit": 2, "offset": 4}
    )
    assert len(r2.json()["itens"]) == 1
    ignoradas = await cliente_visualizador.get(DESCOBERTAS, params={"status": "ignorada"})
    assert [i["ip"] for i in ignoradas.json()["itens"]] == ["10.99.0.60"]
    assert (await cliente_visualizador.get(DESCOBERTAS)).json()["total"] == 6
    assert (await cliente_visualizador.get(DESCOBERTAS, params={"limit": 101})).status_code == 422
    assert (await cliente_visualizador.get(DESCOBERTAS, params={"status": "x"})).status_code == 422


async def test_conflito_com_nome_resolvido(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await subrede(cliente_admin)
    r = await cliente_admin.post(
        "/api/v1/equipamentos", json={"nome": "Servidor", "ip": "10.99.0.5", "classe": "servidor"}
    )
    eq_id = r.json()["id"]
    await criar_descoberta(app, conflito_com=eq_id)
    item = (await cliente_admin.get(DESCOBERTAS)).json()["itens"][0]
    assert item["conflito_com_nome"] == "Servidor"


# ---- aprovar ----------------------------------------------------------------------------------


async def test_aprovar_cria_equipamento_agendado(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    id = await criar_descoberta(app, portas=[554])
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/aprovar", json={})
    assert r.status_code == 200, r.text
    eq = r.json()
    assert eq["classe"] == "camera" and eq["classe_origem"] == "auto"
    assert eq["nome"] == "Câmera 30" and eq["ip"] == "10.99.0.30"
    agendador: Agendador = app.state.agendador
    assert agendador.estado_de(eq["id"]) is not None
    assert (await descoberta(app, id)).status == "aprovada"
    assert (await auditorias(app))[-1].acao == "descoberta.aprovar"
    # aprovar de novo: não está mais pendente
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{id}/aprovar", json={})).status_code == 409


async def test_aprovar_com_troca_de_classe_marca_manual(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    id = await criar_descoberta(app, portas=[554])
    r = await cliente_admin.post(
        f"{DESCOBERTAS}/{id}/aprovar", json={"classe": "servidor", "nome": "Meu servidor"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["classe"] == "servidor" and r.json()["classe_origem"] == "manual"
    assert r.json()["nome"] == "Meu servidor"


async def test_aprovar_classe_inexistente_422(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    id = await criar_descoberta(app)
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/aprovar", json={"classe": "naoexiste"})
    assert r.status_code == 422
    assert (await descoberta(app, id)).status == "pendente"


@pytest.mark.parametrize("corpo", [{"extra": 1}, {"nome": ""}, {"nome": "x" * 200}])
async def test_aprovar_corpo_invalido_422(
    app: FastAPI, cliente_admin: httpx.AsyncClient, corpo: dict[str, Any]
) -> None:
    id = await criar_descoberta(app)
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{id}/aprovar", json=corpo)).status_code == 422


async def test_aprovar_inexistente_404(cliente_admin: httpx.AsyncClient) -> None:
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{ID}/aprovar", json={})).status_code == 404


async def test_aprovar_fora_das_subredes_409(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    id = await criar_descoberta(app, "10.98.0.30", fora=True)
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/aprovar", json={})
    assert r.status_code == 409
    assert "sub-rede" in r.json()["detail"]


async def test_declarar_subrede_libera_aprovacao(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    id = await criar_descoberta(app, "10.98.7.30", fora=True)
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{id}/aprovar", json={})).status_code == 409
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/declarar-subrede")
    assert r.status_code == 201, r.text
    assert r.json()["cidr"] == "10.98.7.0/24" and r.json()["permite_varredura"] is False
    async with sessoes(app)() as db:
        cidrs = set((await db.execute(select(SubRede.cidr))).scalars())
    assert "10.98.7.0/24" in cidrs
    assert (await descoberta(app, id)).fora_das_subredes is False
    acoes = [a.acao for a in await auditorias(app)]
    assert "descoberta.declarar_subrede" in acoes and "subrede.criar" in acoes
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/aprovar", json={})
    assert r.status_code == 200, r.text
    # já declarada: 409
    outra = await criar_descoberta(app, "10.98.7.31", mac="02:00:00:00:00:31")
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{outra}/declarar-subrede")).status_code == 409


async def test_declarar_subrede_ip_publico_422(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    id = await criar_descoberta(app, "8.8.8.8", fora=True)
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/declarar-subrede")
    assert r.status_code == 422


async def test_declarar_subrede_de_canal_409(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    id = await criar_descoberta(
        app, "192.168.254.2", mac=None, chave="nvr:f1:1", canal=1, fora=False
    )
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{id}/declarar-subrede")).status_code == 409


# ---- lote ---------------------------------------------------------------------------------------


async def test_lote_parcial(app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos) -> None:
    boa = await criar_descoberta(app, "10.99.0.31", mac="02:00:00:00:00:31")
    boa2 = await criar_descoberta(app, "10.99.0.32", mac="02:00:00:00:00:32")
    fora = await criar_descoberta(app, "10.98.0.33", mac="02:00:00:00:00:33", fora=True)
    ja = await criar_descoberta(app, "10.99.0.34", mac="02:00:00:00:00:34", status="aprovada")
    r = await cliente_admin.post(
        f"{DESCOBERTAS}/aprovar-lote", json={"ids": [boa, ID, fora, ja, boa2, boa]}
    )
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["aprovadas"] == [boa, boa2]
    motivos = {item["id"]: item["motivo"] for item in corpo["recusadas"]}
    assert set(motivos) == {ID, fora, ja}
    assert "sub-rede" in motivos[fora] and "pendente" in motivos[ja]
    async with sessoes(app)() as db:
        ips = set((await db.execute(select(Equipamento.ip))).scalars())
    assert ips == {"10.99.0.31", "10.99.0.32"}  # nada parcial dos recusados
    assert (await descoberta(app, fora)).status == "pendente"


async def test_lote_mais_de_200_422(cliente_admin: httpx.AsyncClient) -> None:
    ids = [f"00000000-0000-4000-8000-{i:012d}" for i in range(201)]
    r = await cliente_admin.post(f"{DESCOBERTAS}/aprovar-lote", json={"ids": ids})
    assert r.status_code == 422
    assert (
        await cliente_admin.post(f"{DESCOBERTAS}/aprovar-lote", json={"ids": []})
    ).status_code == 422


# ---- ignorar / reabrir ---------------------------------------------------------------------------


async def test_ignorar_e_reabrir(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    id = await criar_descoberta(app)
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/ignorar")
    assert r.status_code == 200 and r.json()["status"] == "ignorada"
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{id}/ignorar")).status_code == 409
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/reabrir")
    assert r.status_code == 200 and r.json()["status"] == "pendente"
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{id}/reabrir")).status_code == 409
    acoes = [a.acao for a in await auditorias(app)]
    assert acoes[-2:] == ["descoberta.ignorar", "descoberta.reabrir"]


async def test_ignorar_inexistente_404(cliente_admin: httpx.AsyncClient) -> None:
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{ID}/ignorar")).status_code == 404
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{ID}/reabrir")).status_code == 404


# ---- sondar -----------------------------------------------------------------------------------


async def test_sondar_audita(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    id = await criar_descoberta(app, fabricante=None, nome=None)
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/sondar")
    assert r.status_code == 200, r.text
    assert falsos.sondados == ["10.99.0.30"]
    assert any("554" in s["descricao"] for s in r.json()["sinais"])
    auditoria = (await auditorias(app))[-1]
    assert auditoria.acao == "descoberta.sondar" and auditoria.alvo == id


async def test_sondar_fora_das_subredes_409_e_audita(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    id = await criar_descoberta(app, "10.98.0.30", fora=True)
    r = await cliente_admin.post(f"{DESCOBERTAS}/{id}/sondar")
    assert r.status_code == 409
    assert falsos.sondados == []
    assert (await auditorias(app))[-1].acao == "descoberta.sondar"


async def test_sondar_inexistente_404(cliente_admin: httpx.AsyncClient, falsos: Falsos) -> None:
    assert (await cliente_admin.post(f"{DESCOBERTAS}/{ID}/sondar")).status_code == 404
