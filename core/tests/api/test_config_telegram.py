"""GET/PATCH /config/telegram, POST /config/telegram/teste e GET /config/geral."""

import logging
from typing import Any

import httpx
import pytest
from fastapi import FastAPI

from sentinela.alertas.ajustes import decifrar_token, ler_status, ler_telegram
from sentinela.alertas.telegram import ErroTelegram
from sentinela.alertas.textos import TEXTO_TESTE
from tests.api.apoio_descoberta import auditorias, sessoes

TELEGRAM = "/api/v1/config/telegram"
TESTE = f"{TELEGRAM}/teste"
GERAL = "/api/v1/config/geral"
TOKEN = "123456789:" + "A" * 35
OUTRO_TOKEN = "987654321:" + "b" * 35


class ClienteFalso:
    def __init__(self, erro: Exception | None = None) -> None:
        self.erro = erro
        self.envios: list[tuple[str, str, str]] = []

    async def enviar(self, token: str, chat: str, texto: str) -> int | None:
        self.envios.append((token, chat, texto))
        if self.erro is not None:
            raise self.erro
        return 1


def instalar(app: FastAPI, erro: Exception | None = None) -> ClienteFalso:
    falso = ClienteFalso(erro)
    app.state.cliente_telegram = falso
    return falso


async def configurar(c: httpx.AsyncClient, **extra: Any) -> httpx.Response:
    r = await c.patch(TELEGRAM, json={"token": TOKEN, "chats": ["-100123", "@canal_teste"]} | extra)
    assert r.status_code == 200, r.text
    return r


async def test_get_padrao(cliente_admin: httpx.AsyncClient) -> None:
    r = await cliente_admin.get(TELEGRAM)
    assert r.status_code == 200
    assert r.json() == {
        "token_definido": False,
        "token_ilegivel": False,
        "chats": [],
        "incluir_ip": False,
        "ultimo_envio": None,
        "ultimo_erro": None,
    }


async def test_patch_grava_cifrado_e_audita(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    r = await configurar(cliente_admin, incluir_ip=True)
    assert r.json()["token_definido"] is True and r.json()["incluir_ip"] is True
    assert r.json()["chats"] == ["-100123", "@canal_teste"]
    async with sessoes(app)() as db:
        ajustes = await ler_telegram(db)
    assert ajustes.token_cifrado and TOKEN not in ajustes.token_cifrado
    assert decifrar_token(app.state.cofre, ajustes.token_cifrado) == TOKEN
    a = (await auditorias(app))[-1]
    assert a.acao == "config.telegram"
    assert a.depois == {"token_alterado": True, "chats": 2, "incluir_ip": True}


async def test_token_nunca_sai(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    textos = [(await configurar(cliente_admin)).text]
    textos.append((await cliente_admin.get(TELEGRAM)).text)
    instalar(app)
    textos.append((await cliente_admin.post(TESTE)).text)
    instalar(app, ErroTelegram("Token recusado.", temporario=False))
    textos.append((await cliente_admin.post(TESTE)).text)
    textos.append((await cliente_admin.patch(TELEGRAM, json={"token": TOKEN + "!"})).text)
    assert not [t for t in textos if TOKEN in t or "A" * 35 in t]


async def test_patch_sem_token_mantem_o_antigo(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await configurar(cliente_admin)
    r = await cliente_admin.patch(TELEGRAM, json={"chats": ["42"]})
    assert r.json()["token_definido"] is True and r.json()["chats"] == ["42"]
    async with sessoes(app)() as db:
        ajustes = await ler_telegram(db)
    assert decifrar_token(app.state.cofre, ajustes.token_cifrado) == TOKEN
    assert (await auditorias(app))[-1].depois == {
        "token_alterado": False,
        "chats": 1,
        "incluir_ip": False,
    }
    r = await cliente_admin.patch(TELEGRAM, json={"token": OUTRO_TOKEN})
    async with sessoes(app)() as db:
        ajustes = await ler_telegram(db)
    assert decifrar_token(app.state.cofre, ajustes.token_cifrado) == OUTRO_TOKEN
    assert r.json()["chats"] == ["42"]


async def test_token_vazio_apaga(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await configurar(cliente_admin)
    r = await cliente_admin.patch(TELEGRAM, json={"token": ""})
    assert r.status_code == 200 and r.json()["token_definido"] is False
    async with sessoes(app)() as db:
        assert (await ler_telegram(db)).token_cifrado is None
    depois = (await auditorias(app))[-1].depois
    assert depois is not None and depois["token_alterado"] is True


async def test_onze_chats_422(cliente_admin: httpx.AsyncClient) -> None:
    r = await cliente_admin.patch(TELEGRAM, json={"chats": [str(i) for i in range(11)]})
    assert r.status_code == 422
    r = await cliente_admin.patch(TELEGRAM, json={"chats": [str(i) for i in range(10)]})
    assert r.status_code == 200


@pytest.mark.parametrize("chat", ["abc", "@abc", "12a", "-", "", "1" * 21, "@" + "a" * 33, " 1"])
async def test_chat_invalido_422(cliente_admin: httpx.AsyncClient, chat: str) -> None:
    assert (await cliente_admin.patch(TELEGRAM, json={"chats": [chat]})).status_code == 422


async def test_chats_repetidos_422(cliente_admin: httpx.AsyncClient) -> None:
    assert (await cliente_admin.patch(TELEGRAM, json={"chats": ["1", "1"]})).status_code == 422


@pytest.mark.parametrize(
    "token",
    ["abc", "1234:" + "A" * 35, "123456789:" + "A" * 29, "123456789:" + "A" * 51, "x" + TOKEN],
)
async def test_token_invalido_422(cliente_admin: httpx.AsyncClient, token: str) -> None:
    assert (await cliente_admin.patch(TELEGRAM, json={"token": token})).status_code == 422


async def test_papel_e_csrf(cliente_visualizador: httpx.AsyncClient) -> None:
    assert (await cliente_visualizador.get(TELEGRAM)).status_code == 403
    assert (await cliente_visualizador.patch(TELEGRAM, json={})).status_code == 403
    assert (await cliente_visualizador.post(TESTE)).status_code == 403


async def test_patch_sem_csrf_403(cliente_admin: httpx.AsyncClient) -> None:
    del cliente_admin.headers["X-CSRF"]
    assert (await cliente_admin.patch(TELEGRAM, json={"incluir_ip": True})).status_code == 403
    assert (await cliente_admin.post(TESTE)).status_code == 403


async def test_teste_envia_texto_fixo(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await configurar(cliente_admin)
    falso = instalar(app)
    r = await cliente_admin.post(TESTE)
    assert r.status_code == 200 and r.json() == {"ok": True, "erro": None}
    assert falso.envios == [(TOKEN, "-100123", TEXTO_TESTE), (TOKEN, "@canal_teste", TEXTO_TESTE)]
    async with sessoes(app)() as db:
        assert (await ler_status(db))["ultimo_envio"] is not None


async def test_teste_com_erro_devolve_texto_fixo(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await configurar(cliente_admin)
    instalar(app, ErroTelegram("Token recusado pelo Telegram.", temporario=False))
    r = await cliente_admin.post(TESTE)
    assert r.status_code == 200
    assert r.json() == {"ok": False, "erro": "Token recusado pelo Telegram."}
    assert (await cliente_admin.get(TELEGRAM)).json()["ultimo_erro"] == (
        "Token recusado pelo Telegram."
    )


async def test_teste_sem_configuracao_409(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    instalar(app)
    r = await cliente_admin.post(TESTE)
    assert r.status_code == 409 and r.json()["detail"] == "Configure o token e ao menos um chat."
    await cliente_admin.patch(TELEGRAM, json={"token": TOKEN})
    assert (await cliente_admin.post(TESTE)).status_code == 409


async def test_teste_demo_409(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await configurar(cliente_admin)
    app.state.cliente_telegram = None
    r = await cliente_admin.post(TESTE)
    assert r.status_code == 409 and r.json()["detail"] == "Indisponível no modo demonstração."


async def test_teste_429_na_11a_vez(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await configurar(cliente_admin)
    instalar(app)
    codigos = [(await cliente_admin.post(TESTE)).status_code for _ in range(11)]
    assert codigos[:10] == [200] * 10 and codigos[10] == 429


async def test_config_geral_mostra_fuso(cliente_visualizador: httpx.AsyncClient) -> None:
    r = await cliente_visualizador.get(GERAL)
    assert r.status_code == 200 and r.json() == {"fuso": "America/Sao_Paulo"}


async def test_config_geral_exige_login(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get(GERAL)).status_code == 401


async def test_log_sem_token(
    app: FastAPI, cliente_admin: httpx.AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    await configurar(cliente_admin)
    instalar(app, ErroTelegram("Falha de conexão.", temporario=True))
    await cliente_admin.post(TESTE)
    assert TOKEN not in caplog.text
