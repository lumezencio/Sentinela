"""WebSocket do telão (``/ws/parede``): só leitura, campos reduzidos, revogação na hora."""

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import update

from sentinela.api import ws_parede
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import Parede
from sentinela.relogio import RelogioFalso
from tests.api.apoio_parede import (
    DESDE,
    PAREDES,
    AbrirTv,
    AbrirWsParede,
    ClienteWsParede,
    alerta_no_banco,
    criar_equipamento_completo,
    emparelhar,
    ligar_http,
    sem_proibidos,
    sessoes,
)


async def _aberto(abrir_ws_parede: AbrirWsParede, token: str, **kw: str) -> ClienteWsParede:
    ws = abrir_ws_parede(cookies={"sentinela_parede": token}, **kw)
    assert (await ws.conectar())["type"] == "websocket.accept"
    return ws


@pytest.fixture
async def token(abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient) -> str:
    _, t = await emparelhar(abrir_tv(), cliente_admin)
    return t


async def test_ws_parede_snapshot_reduzido(
    app: FastAPI,
    cliente_admin: httpx.AsyncClient,
    abrir_tv: AbrirTv,
    abrir_ws_parede: AbrirWsParede,
) -> None:
    eq = await criar_equipamento_completo(app)
    await alerta_no_banco(app, eq)
    _, token = await emparelhar(abrir_tv(), cliente_admin)
    ws = await _aberto(abrir_ws_parede, token)
    snap = await ws.json()
    sem_proibidos(snap)
    assert set(snap) == {"tipo", "nome", "fuso", "classes", "equipamentos", "alertas"}
    assert snap["tipo"] == "snapshot" and snap["nome"] == "TV Portaria"
    assert set(snap["equipamentos"][0]) == {"id", "nome", "classe", "estado", "pai_id"}
    assert set(snap["alertas"][0]) == {
        "id", "tipo", "texto", "aberto_em", "equipamento_id", "afetados",
    }  # fmt: skip


async def test_sem_token_ou_token_invalido_4401(abrir_ws_parede: AbrirWsParede) -> None:
    assert await abrir_ws_parede().recusa() == 4401
    assert await abrir_ws_parede(cookies={"sentinela_parede": "inventado"}).recusa() == 4401


async def test_sessao_do_painel_nao_abre_ws_parede(
    cliente_admin: httpx.AsyncClient, abrir_ws_parede: AbrirWsParede
) -> None:
    sessao = cliente_admin.cookies["sentinela_sessao"]
    assert await abrir_ws_parede(cookies={"sentinela_sessao": sessao}).recusa() == 4401


@pytest.mark.parametrize("origem", [None, "https://outro.exemplo", "null", "http://teste"])
async def test_origem_estranha_4403(
    token: str, abrir_ws_parede: AbrirWsParede, origem: str | None
) -> None:
    ws = abrir_ws_parede(cookies={"sentinela_parede": token}, origem=origem)
    assert await ws.recusa() == 4403


async def test_latencias_nao_repassadas(
    app: FastAPI, token: str, abrir_ws_parede: AbrirWsParede
) -> None:
    eq = await criar_equipamento_completo(app)
    ws = await _aberto(abrir_ws_parede, token)
    await ws.json()  # snapshot
    barramento: Barramento = app.state.barramento
    barramento.publicar(Mensagem("latencias", {"lote": [[eq, 2.5]]}))
    barramento.publicar(Mensagem("descoberta", {"acao": "nova", "id": "d1"}))
    barramento.publicar(Mensagem("varredura", {"cidr": "10.99.0.0/24"}))
    barramento.publicar(Mensagem("fonte", {"acao": "coletada", "id": "f1"}))
    barramento.publicar(Mensagem("pendentes", {"total": 3}))
    estado = {"id": eq, "estado": "inalcancavel", "desde": DESDE.isoformat(), "causa": "pai:x"}
    barramento.publicar(Mensagem("estado", {**estado, "latencia_ms": 3.0, "ip": "10.99.5.1"}))
    assert await ws.json() == {"tipo": "estado", **estado}
    barramento.publicar(Mensagem("equipamento", {"acao": "atualizado", "id": eq}))
    msg = await ws.json()
    sem_proibidos(msg)
    assert msg == {
        "tipo": "equipamento",
        "acao": "atualizado",
        "equipamento": {
            "id": eq, "nome": "Câmera Portaria", "classe": "camera", "estado": "offline",
            "pai_id": None,
        },
    }  # fmt: skip
    barramento.publicar(Mensagem("equipamento", {"acao": "atualizado", "id": "sumiu"}))
    assert await ws.json() == {"tipo": "equipamento", "acao": "removido", "id": "sumiu"}


async def test_alertas_reduzidos(app: FastAPI, token: str, abrir_ws_parede: AbrirWsParede) -> None:
    eq = await criar_equipamento_completo(app)
    ws = await _aberto(abrir_ws_parede, token)
    await ws.json()  # snapshot
    barramento: Barramento = app.state.barramento
    aberto = await alerta_no_banco(app, eq)
    barramento.publicar(Mensagem("alerta", {"acao": "aberto", "id": aberto, "abertos": 1}))
    msg = await ws.json()
    sem_proibidos(msg)
    assert msg == {
        "tipo": "alerta",
        "acao": "aberto",
        "alerta": {
            "id": aberto, "tipo": "queda", "texto": "Câmera Portaria caiu",
            "aberto_em": DESDE.isoformat(), "equipamento_id": eq, "afetados": 0,
        },
    }  # fmt: skip
    fechado = await alerta_no_banco(app, eq, fechado=True)
    barramento.publicar(Mensagem("alerta", {"acao": "atualizado", "id": fechado, "abertos": 1}))
    assert await ws.json() == {"tipo": "alerta", "acao": "fechado", "id": fechado}
    barramento.publicar(Mensagem("alerta", {"acao": "removido", "id": aberto, "abertos": 0}))
    assert await ws.json() == {"tipo": "alerta", "acao": "removido", "id": aberto}
    barramento.publicar(Mensagem("alerta", {"acao": "atualizado", "id": 9999, "abertos": 0}))
    assert await ws.json() == {"tipo": "alerta", "acao": "removido", "id": 9999}


async def test_revogar_derruba_ws_na_hora(
    app: FastAPI,
    abrir_tv: AbrirTv,
    cliente_admin: httpx.AsyncClient,
    abrir_ws_parede: AbrirWsParede,
) -> None:
    ident, token = await emparelhar(abrir_tv(), cliente_admin, "TV 1")
    outra, _ = await emparelhar(abrir_tv(ip="10.99.0.51"), cliente_admin, "TV 2")
    ws = await _aberto(abrir_ws_parede, token)
    await ws.json()  # snapshot
    assert (await cliente_admin.delete(f"{PAREDES}/{outra}")).status_code == 204
    # a revogação de outra TV não a derruba: o marcador seguinte chega normalmente
    barramento_: Barramento = app.state.barramento
    marcador = {"id": "marcador", "estado": "online", "desde": DESDE.isoformat()}
    barramento_.publicar(Mensagem("estado", marcador))
    assert await ws.json() == {"tipo": "estado", **marcador}
    assert (await cliente_admin.delete(f"{PAREDES}/{ident}")).status_code == 204
    assert await ws.fechamento() == 4401  # sem avançar o relógio da revalidação
    barramento: Barramento = app.state.barramento
    assert barramento.total_assinantes == 0


async def test_revalidacao_a_cada_60s(
    app: FastAPI, relogio: RelogioFalso, token: str, abrir_ws_parede: AbrirWsParede
) -> None:
    ws = await _aberto(abrir_ws_parede, token)
    await ws.json()  # snapshot
    await relogio.avancar(25)
    assert await ws.json() == {"tipo": "ping"}
    await relogio.avancar(35)  # revalidação com token válido: segue aberto
    async with sessoes(app)() as db:  # revogada direto no banco, sem mensagem no barramento
        await db.execute(update(Parede).values(token_hash=None))
        await db.commit()
    await relogio.avancar(60)
    assert await ws.fechamento() == 4401


async def test_origem_http_so_com_chave(
    abrir_tv: AbrirTv,
    cliente_admin: httpx.AsyncClient,
    abrir_ws_parede: AbrirWsParede,
    relogio: RelogioFalso,
) -> None:
    await ligar_http(cliente_admin)
    _, token = await emparelhar(abrir_tv("http"), cliente_admin)
    cookies = {"sentinela_parede_http": token}
    ws = abrir_ws_parede(cookies=cookies, origem="http://teste", esquema="ws")
    assert (await ws.conectar())["type"] == "websocket.accept"
    assert (await ws.json())["tipo"] == "snapshot"
    # token http não vale por https, nem de outro IP
    assert await abrir_ws_parede(cookies={"sentinela_parede": token}).recusa() == 4401
    outro = abrir_ws_parede(cookies=cookies, origem="http://teste", esquema="ws", ip="10.99.0.9")
    assert await outro.recusa() == 4401
    # origem http em conexão wss (ou o contrário) é recusada
    misto = abrir_ws_parede(cookies=cookies, origem="http://teste", esquema="wss")
    assert await misto.recusa() == 4403
    # chave desligada: recusa nova conexão e derruba a aberta na revalidação
    await ligar_http(cliente_admin, False)
    nova = abrir_ws_parede(cookies=cookies, origem="http://teste", esquema="ws")
    assert await nova.recusa() == 4403
    await relogio.avancar(60)
    assert await ws.fechamento() == 4401


async def test_origem_checada_antes_do_banco(
    token: str, abrir_ws_parede: AbrirWsParede, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def proibido(*_args: object) -> None:
        raise AssertionError("consultou o banco com Origin inválido")

    monkeypatch.setattr(ws_parede, "parede_do_token", proibido)
    ws = abrir_ws_parede(cookies={"sentinela_parede": token}, origem="https://outro.exemplo")
    assert await ws.recusa() == 4403


async def test_revogada_entre_autenticar_e_assinar_fecha_na_hora(
    app: FastAPI, token: str, abrir_ws_parede: AbrirWsParede, monkeypatch: pytest.MonkeyPatch
) -> None:
    agendador = app.state.agendador
    original = agendador.aguardar_gravacoes

    async def revogar_no_meio() -> None:  # já depois da assinatura do barramento
        async with sessoes(app)() as db:  # revogação cuja mensagem se perdeu
            await db.execute(update(Parede).values(token_hash=None))
            await db.commit()
        await original()

    monkeypatch.setattr(agendador, "aguardar_gravacoes", revogar_no_meio)
    ws = await _aberto(abrir_ws_parede, token)
    msg = await ws.proxima()  # nada de snapshot: fecha sem esperar a revalidação
    assert msg["type"] == "websocket.close" and msg["code"] == 4401
    await ws.terminar()


async def test_desligar_http_derruba_conexoes_http_na_hora(
    app: FastAPI,
    abrir_tv: AbrirTv,
    cliente_admin: httpx.AsyncClient,
    abrir_ws_parede: AbrirWsParede,
) -> None:
    await ligar_http(cliente_admin)
    _, token_http = await emparelhar(abrir_tv("http"), cliente_admin, "TV http")
    _, token_https = await emparelhar(abrir_tv(ip="10.99.0.51"), cliente_admin, "TV https")
    http = abrir_ws_parede(
        cookies={"sentinela_parede_http": token_http}, origem="http://teste", esquema="ws"
    )
    assert (await http.conectar())["type"] == "websocket.accept"
    await http.json()  # snapshot
    https = abrir_ws_parede(cookies={"sentinela_parede": token_https}, ip="10.99.0.51")
    assert (await https.conectar())["type"] == "websocket.accept"
    await https.json()  # snapshot
    await ligar_http(cliente_admin, True)  # ligado -> ligado: nada cai
    await ligar_http(cliente_admin, False)
    assert await http.fechamento() == 4401  # sem avançar o relógio
    marcador = {"id": "marcador", "estado": "online", "desde": DESDE.isoformat()}
    barramento: Barramento = app.state.barramento
    barramento.publicar(Mensagem("estado", marcador))
    assert await https.json() == {"tipo": "estado", **marcador}  # a https segue aberta
