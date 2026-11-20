"""GET/PATCH /atualizacao: estado da atualização automática e a chave liga/desliga (admin)."""

from datetime import UTC, datetime

import httpx
import pytest
from fastapi import FastAPI

from sentinela import __version__, atualizacao
from sentinela.config import Settings, pasta_dados
from tests.api.apoio_descoberta import auditorias

URL = "/api/v1/atualizacao"


async def test_sem_arquivo_sem_agendamento(cliente_visualizador: httpx.AsyncClient) -> None:
    r = await cliente_visualizador.get(URL)
    assert r.status_code == 200
    assert r.json() == {
        "versao": __version__,
        "ativo": True,
        "agendado": False,
        "ultima_verificacao": None,
        "ultima_verificacao_ok": None,
        "resultado": None,
        "de": None,
        "para": None,
        "mensagem": None,
        "aviso": None,
        "comando_manual": "./update.sh",
        "arquivo_ilegivel": False,
    }


async def test_get_qualquer_usuario_ve_versao_e_aviso(
    cliente_visualizador: httpx.AsyncClient, settings: Settings
) -> None:
    atualizacao.registrar(
        pasta_dados(settings), "atualizado", "0.4.0", "0.5.0", None, datetime.now(UTC)
    )
    corpo = (await cliente_visualizador.get(URL)).json()
    assert corpo["versao"] == __version__
    assert corpo["aviso"] == "Atualizado para 0.5.0"
    assert corpo["resultado"] == "atualizado" and corpo["para"] == "0.5.0"


async def test_get_sem_sessao_401(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get(URL)).status_code == 401


async def test_arquivo_ilegivel_e_informado_e_nao_desliga(
    cliente_admin: httpx.AsyncClient, settings: Settings
) -> None:
    (pasta_dados(settings) / atualizacao.ARQUIVO).write_bytes(b"{lixo")
    corpo = (await cliente_admin.get(URL)).json()
    assert corpo["ativo"] is True and corpo["arquivo_ilegivel"] is True


async def test_patch_so_admin_csrf_audita(
    app: FastAPI,
    cliente_admin: httpx.AsyncClient,
    settings: Settings,
) -> None:
    sem = await cliente_admin.patch(URL, json={"ativo": False}, headers={"X-CSRF": "errado"})
    assert sem.status_code == 403
    assert atualizacao.ler(pasta_dados(settings)).ativo is True
    r = await cliente_admin.patch(URL, json={"ativo": False})
    assert r.status_code == 200 and r.json()["ativo"] is False
    assert atualizacao.ler(pasta_dados(settings)).ativo is False
    a = (await auditorias(app))[-1]
    assert (a.acao, a.antes, a.depois) == (
        "atualizacao.ativo",
        {"ativo": True},
        {"ativo": False},
    )
    religa = await cliente_admin.patch(URL, json={"ativo": True})
    assert religa.json()["ativo"] is True


async def test_patch_visualizador_403(
    cliente_visualizador: httpx.AsyncClient, settings: Settings
) -> None:
    assert (await cliente_visualizador.patch(URL, json={"ativo": False})).status_code == 403
    assert atualizacao.ler(pasta_dados(settings)).ativo is True


async def test_patch_sem_sessao_recusado(cliente: httpx.AsyncClient, settings: Settings) -> None:
    # sem sessão não há CSRF válido: a verificação do CSRF recusa antes da autenticação
    assert (await cliente.patch(URL, json={"ativo": False})).status_code in {401, 403}
    assert atualizacao.ler(pasta_dados(settings)).ativo is True


async def test_patch_corpo_invalido_422(cliente_admin: httpx.AsyncClient) -> None:
    for corpo in ({}, {"ativo": "talvez"}, {"ativo": None}, {"ativo": True, "x": 1}, []):
        r = await cliente_admin.patch(URL, json=corpo)
        assert r.status_code == 422, corpo


async def test_patch_limitado_por_taxa(cliente_admin: httpx.AsyncClient) -> None:
    codigos = [
        (await cliente_admin.patch(URL, json={"ativo": True})).status_code for _ in range(11)
    ]
    assert codigos[:10] == [200] * 10 and codigos[10] == 429


async def test_patch_erro_de_disco_e_generico(
    cliente_admin: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def quebra(*_a: object, **_k: object) -> None:
        raise OSError("/segredo/caminho")

    monkeypatch.setattr("sentinela.api.atualizacao.atualizacao.definir_ativo", quebra)
    r = await cliente_admin.patch(URL, json={"ativo": False})
    assert r.status_code == 500
    assert "segredo" not in r.text
