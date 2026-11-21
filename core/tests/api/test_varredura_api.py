"""API da varredura lenta e PATCH de ``permite_varredura`` nas sub-redes."""

import asyncio

import httpx
import pytest
from fastapi import FastAPI

from sentinela.relogio import RelogioFalso
from tests.api.apoio_descoberta import SUBREDES, VARREDURA, Falsos, auditorias, subrede


@pytest.fixture
async def falsos(app: FastAPI, cliente_admin: httpx.AsyncClient) -> Falsos:
    f = Falsos()
    f.instalar(app)
    return f


async def _permitir(c: httpx.AsyncClient, sub_id: int, valor: bool = True) -> httpx.Response:
    return await c.patch(f"{SUBREDES}/{sub_id}", json={"permite_varredura": valor})


async def test_patch_permite_varredura(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    sub = await subrede(cliente_admin, "10.99.3.0/24")
    assert sub["permite_varredura"] is False
    r = await _permitir(cliente_admin, sub["id"])
    assert r.status_code == 200, r.text
    assert r.json() == {
        "id": sub["id"],
        "cidr": "10.99.3.0/24",
        "permite_varredura": True,
        "gateway_ip": None,
        "ultima_varredura_em": None,
        "linha_base_em": None,
    }
    assert (await cliente_admin.get(SUBREDES)).json()[0]["permite_varredura"] is True
    auditoria = (await auditorias(app))[-1]
    assert auditoria.acao == "subrede.editar"
    assert auditoria.antes == {"permite_varredura": False}
    assert auditoria.depois == {"permite_varredura": True}


async def test_patch_subrede_validacao(cliente_admin: httpx.AsyncClient) -> None:
    assert (await _permitir(cliente_admin, 999)).status_code == 404
    sub = await subrede(cliente_admin, "10.99.3.0/24")
    r = await cliente_admin.patch(f"{SUBREDES}/{sub['id']}", json={"cidr": "10.99.4.0/24"})
    assert r.status_code == 422
    r = await cliente_admin.patch(f"{SUBREDES}/{sub['id']}", json={"permite_varredura": "sim"})
    assert r.status_code == 422


async def test_patch_subrede_visualizador_403(cliente_visualizador: httpx.AsyncClient) -> None:
    assert (await _permitir(cliente_visualizador, 1)).status_code == 403


async def test_iniciar_progresso_cancelar(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos, relogio: RelogioFalso
) -> None:
    sub = await subrede(cliente_admin, "10.99.3.0/28")
    await _permitir(cliente_admin, sub["id"])
    assert (await cliente_admin.get(VARREDURA)).json() == {"rodando": False, "progresso": None}
    r = await cliente_admin.post(VARREDURA, json={"sub_rede_id": sub["id"]})
    assert r.status_code == 202, r.text
    assert r.json()["rodando"] is True
    assert r.json()["progresso"]["cidr"] == "10.99.3.0/28"
    assert r.json()["progresso"]["total"] == 16
    # uma por vez
    assert (await cliente_admin.post(VARREDURA, json={"sub_rede_id": sub["id"]})).status_code == 409
    await relogio.avancar(2)
    progresso = (await cliente_admin.get(VARREDURA)).json()
    assert progresso["rodando"] is True and progresso["progresso"]["feitos"] >= 1
    assert (await cliente_admin.delete(VARREDURA)).status_code == 204
    await relogio.avancar(1)
    for _ in range(100):  # o gancho de fim grava no banco (I/O real, fora do relógio falso)
        if (await cliente_admin.get(VARREDURA)).json()["rodando"] is False:
            break
        await asyncio.sleep(0.01)
    assert (await cliente_admin.get(VARREDURA)).json()["rodando"] is False
    acoes = [a.acao for a in await auditorias(app)]
    assert "varredura.iniciar" in acoes and acoes[-1] == "varredura.cancelar"


async def test_subrede_sem_permissao_409(cliente_admin: httpx.AsyncClient, falsos: Falsos) -> None:
    sub = await subrede(cliente_admin, "10.99.3.0/24")
    r = await cliente_admin.post(VARREDURA, json={"sub_rede_id": sub["id"]})
    assert r.status_code == 409


async def test_subrede_inexistente_404(cliente_admin: httpx.AsyncClient, falsos: Falsos) -> None:
    r = await cliente_admin.post(VARREDURA, json={"sub_rede_id": 999})
    assert r.status_code == 404


async def test_varredura_papel_e_csrf(
    cliente_visualizador: httpx.AsyncClient,
) -> None:
    assert (await cliente_visualizador.get(VARREDURA)).status_code == 200  # faixa para todos
    assert (await cliente_visualizador.post(VARREDURA, json={"sub_rede_id": 1})).status_code == 403
    assert (await cliente_visualizador.delete(VARREDURA)).status_code == 403
    del cliente_visualizador.headers["X-CSRF"]
    assert (await cliente_visualizador.delete(VARREDURA)).status_code == 403


async def test_varredura_sem_csrf_403(cliente_admin: httpx.AsyncClient) -> None:
    del cliente_admin.headers["X-CSRF"]
    assert (await cliente_admin.post(VARREDURA, json={"sub_rede_id": 1})).status_code == 403
    assert (await cliente_admin.delete(VARREDURA)).status_code == 403


@pytest.mark.parametrize("como", ["patch", "delete"])
async def test_tirar_permissao_ou_remover_sub_rede_para_a_varredura(
    app: FastAPI,
    cliente_admin: httpx.AsyncClient,
    falsos: Falsos,
    relogio: RelogioFalso,
    como: str,
) -> None:
    sub = await subrede(cliente_admin, "10.99.3.0/24")
    await _permitir(cliente_admin, sub["id"])
    assert (await cliente_admin.post(VARREDURA, json={"sub_rede_id": sub["id"]})).status_code == 202
    await relogio.avancar(2)
    assert (await cliente_admin.get(VARREDURA)).json()["rodando"] is True
    if como == "patch":
        assert (await _permitir(cliente_admin, sub["id"], False)).status_code == 200
    else:
        assert (await cliente_admin.delete(f"{SUBREDES}/{sub['id']}")).status_code == 204
    # parou já na resposta: nenhum pedido ARP a mais naquela sub-rede
    assert (await cliente_admin.get(VARREDURA)).json()["rodando"] is False
    feitos = len(falsos.pings)
    await relogio.avancar(10)
    assert len(falsos.pings) == feitos


async def test_patch_so_permite_varredura_continua_igual(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    """Fluxo legado: só ``permite_varredura`` muda só ele, com a auditoria de sempre."""
    sub = await subrede(cliente_admin, "10.99.3.0/24")
    r = await cliente_admin.patch(f"{SUBREDES}/{sub['id']}", json={"permite_varredura": True})
    assert r.status_code == 200 and r.json()["gateway_ip"] is None
    auditoria = (await auditorias(app))[-1]
    assert auditoria.antes == {"permite_varredura": False}
    assert auditoria.depois == {"permite_varredura": True}
    assert (await cliente_admin.patch(f"{SUBREDES}/{sub['id']}", json={})).status_code == 422
    r = await cliente_admin.patch(f"{SUBREDES}/{sub['id']}", json={"permite_varredura": None})
    assert r.status_code == 422


async def test_patch_gateway_dentro_da_rede(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    sub = await subrede(cliente_admin, "10.99.3.0/24")
    url = f"{SUBREDES}/{sub['id']}"
    r = await cliente_admin.patch(url, json={"gateway_ip": "10.99.3.1"})
    assert r.status_code == 200, r.text
    assert r.json()["gateway_ip"] == "10.99.3.1" and r.json()["permite_varredura"] is False
    auditoria = (await auditorias(app))[-1]
    assert auditoria.acao == "subrede.editar"
    assert auditoria.antes == {"gateway_ip": None}
    assert auditoria.depois == {"gateway_ip": "10.99.3.1"}
    for ruim in ("10.99.4.1", "10.99.3.0", "10.99.3.255", "abc", "10.99.3.1/24", ""):
        r = await cliente_admin.patch(url, json={"gateway_ip": ruim})
        assert r.status_code == 422, ruim
        assert r.json()["detail"] == "O gateway precisa estar dentro da sub-rede."
    assert (await cliente_admin.get(SUBREDES)).json()[0]["gateway_ip"] == "10.99.3.1"
    r = await cliente_admin.patch(url, json={"permite_varredura": True, "gateway_ip": "10.99.3.2"})
    assert r.json()["permite_varredura"] is True and r.json()["gateway_ip"] == "10.99.3.2"
    r = await cliente_admin.patch(url, json={"gateway_ip": None})
    assert r.status_code == 200 and r.json()["gateway_ip"] is None
    assert r.json()["permite_varredura"] is True  # não enviado: intacto


async def test_patch_gateway_visualizador_403(cliente_visualizador: httpx.AsyncClient) -> None:
    r = await cliente_visualizador.patch(f"{SUBREDES}/1", json={"gateway_ip": "10.99.3.1"})
    assert r.status_code == 403


async def test_get_varredura_mostra_origem_agendada(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    sub = await subrede(cliente_admin, "10.99.3.0/24")
    await _permitir(cliente_admin, sub["id"])
    await app.state.varredura.iniciar(sub["id"], "agendada")
    corpo = (await cliente_admin.get(VARREDURA)).json()
    assert corpo["rodando"] is True
    assert corpo["progresso"]["origem"] == "agendada"
    assert corpo["progresso"]["sub_rede_id"] == sub["id"]
    await app.state.varredura.encerrar()
    r = await cliente_admin.post(VARREDURA, json={"sub_rede_id": sub["id"]})
    assert r.status_code == 202
    assert r.json()["progresso"]["origem"] == "manual"
