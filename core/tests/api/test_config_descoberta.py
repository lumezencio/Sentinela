"""GET/PATCH /config/descoberta: aprovação automática e limiar."""

from typing import Any

import httpx
import pytest
from fastapi import FastAPI

from sentinela.descoberta.ajustes import ler_ajustes
from tests.api.apoio_descoberta import CONFIG, auditorias, sessoes

PADRAO = {"aprovacao_automatica": False, "limiar_aprovacao": 0.8, "intervalo_varredura_ips_s": 0.5}


async def test_get_padrao(cliente_admin: httpx.AsyncClient) -> None:
    r = await cliente_admin.get(CONFIG)
    assert r.status_code == 200
    assert r.json() == PADRAO


async def test_patch_grava_e_audita(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    r = await cliente_admin.patch(
        CONFIG, json={"aprovacao_automatica": True, "limiar_aprovacao": 0.9}
    )
    assert r.status_code == 200, r.text
    assert r.json() == PADRAO | {"aprovacao_automatica": True, "limiar_aprovacao": 0.9}
    async with sessoes(app)() as db:
        ajustes = await ler_ajustes(db)
    assert ajustes.aprovacao_automatica is True and ajustes.limiar_aprovacao == 0.9
    auditoria = (await auditorias(app))[-1]
    assert auditoria.acao == "config.descoberta"
    assert auditoria.antes == {"aprovacao_automatica": False, "limiar_aprovacao": 0.8}
    assert auditoria.depois == {"aprovacao_automatica": True, "limiar_aprovacao": 0.9}
    # parcial: só o limiar
    r = await cliente_admin.patch(CONFIG, json={"limiar_aprovacao": 0.85})
    assert r.json()["aprovacao_automatica"] is True and r.json()["limiar_aprovacao"] == 0.85


@pytest.mark.parametrize(
    "corpo",
    [
        {"limiar_aprovacao": 1.5},
        {"limiar_aprovacao": 0.1},
        {"limiar_aprovacao": "alto"},
        {"aprovacao_automatica": "sim"},
        {"aprovacao_automatica": None},
        {"intervalo_varredura_ips_s": 0.01},
        {"outra": 1},
    ],
)
async def test_patch_invalido_422(cliente_admin: httpx.AsyncClient, corpo: dict[str, Any]) -> None:
    assert (await cliente_admin.patch(CONFIG, json=corpo)).status_code == 422


async def test_papel_e_csrf(
    cliente_visualizador: httpx.AsyncClient,
) -> None:
    assert (await cliente_visualizador.get(CONFIG)).status_code == 403
    assert (await cliente_visualizador.patch(CONFIG, json={})).status_code == 403


async def test_patch_sem_csrf_403(cliente_admin: httpx.AsyncClient) -> None:
    del cliente_admin.headers["X-CSRF"]
    r = await cliente_admin.patch(CONFIG, json={"aprovacao_automatica": True})
    assert r.status_code == 403
