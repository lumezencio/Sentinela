"""Rotas do telão (TV sem sessão) e do admin (aprovar, revogar, chave HTTP)."""

import re

import httpx
from fastapi import FastAPI
from sqlalchemy import select

from sentinela.db.modelos import Auditoria, Parede
from tests.api.apoio_parede import (
    APROVAR,
    CONFIG,
    PAREDES,
    PEDIDO,
    SNAPSHOT,
    AbrirTv,
    AbrirWsParede,
    alerta_no_banco,
    atributos,
    cookie,
    criar_equipamento_completo,
    emparelhar,
    ligar_http,
    sem_proibidos,
    sessoes,
)

REGEX_CODIGO = re.compile(r"^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$")
MSG_CODIGO = "Código inválido ou expirado."


# ---- rotas da TV ------------------------------------------------------------------------------


async def test_pedido_cria_codigo_e_cookie_do_pedido(abrir_tv: AbrirTv) -> None:
    tv = abrir_tv()
    r = await tv.post(PEDIDO)
    assert r.status_code == 201
    corpo = r.json()
    assert set(corpo) == {"codigo", "expira_em", "consulta_s"}
    assert REGEX_CODIGO.match(corpo["codigo"]) and corpo["consulta_s"] == 5
    linha = cookie(r, "sentinela_parede_pedido")
    assert {"httponly", "secure", "samesite=strict", "path=/api/v1/parede"} <= atributos(linha)
    assert "max-age=1200" in atributos(linha)  # validade + retenção da entrega
    r = await tv.get(PEDIDO)
    assert (r.status_code, r.json()) == (202, {"estado": "pendente"})


async def test_11o_pedido_do_mesmo_ip_na_hora_429(abrir_tv: AbrirTv) -> None:
    tv = abrir_tv()
    for _ in range(10):
        assert (await tv.post(PEDIDO)).status_code == 201
    r = await tv.post(PEDIDO)
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) > 0
    assert (await abrir_tv(ip="10.99.0.51").post(PEDIDO)).status_code == 201  # outro IP


async def test_mais_de_20_pendentes_429(abrir_tv: AbrirTv) -> None:
    for i in range(20):
        r = await abrir_tv(ip=f"10.99.0.{100 + i}").post(PEDIDO)
        assert r.status_code == 201
    r = await abrir_tv(ip="10.99.0.99").post(PEDIDO)
    assert r.status_code == 429
    assert 0 < int(r.headers["retry-after"]) <= 600


async def test_consulta_sem_cookie_expirado(abrir_tv: AbrirTv) -> None:
    r = await abrir_tv().get(PEDIDO)
    assert (r.status_code, r.json()) == (410, {"estado": "expirado"})


async def test_fluxo_completo_https(abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient) -> None:
    tv = abrir_tv()
    r = await tv.post(PEDIDO)
    codigo = r.json()["codigo"]
    assert (await tv.get(PEDIDO)).status_code == 202
    a = await cliente_admin.post(APROVAR, json={"codigo": codigo, "nome": "TV Portaria"})
    assert a.status_code == 201
    assert a.json()["nome"] == "TV Portaria" and a.json()["modo"] == "https"
    r = await tv.get(PEDIDO)
    assert (r.status_code, r.json()) == (200, {"estado": "aprovado", "nome": "TV Portaria"})
    linha = cookie(r, "sentinela_parede")
    assert {"httponly", "secure", "samesite=strict", "path=/", "max-age=31536000"} <= atributos(
        linha
    )
    snap = await tv.get(SNAPSHOT)
    assert snap.status_code == 200 and snap.json()["nome"] == "TV Portaria"
    apagado = cookie(r, "sentinela_parede_pedido")  # removido com os mesmos atributos
    assert {"httponly", "secure", "samesite=strict", "path=/api/v1/parede"} <= atributos(apagado)
    # entrega única: a segunda consulta já não dá token
    r = await tv.get(PEDIDO)
    assert (r.status_code, r.json()) == (410, {"estado": "expirado"})


async def test_snapshot_sem_ip_mac_fabricante_latencia(
    app: FastAPI, abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient
) -> None:
    eq = await criar_equipamento_completo(app)
    await alerta_no_banco(app, eq)
    await alerta_no_banco(app, eq, fechado=True)
    tv = abrir_tv()
    await emparelhar(tv, cliente_admin)
    r = await tv.get(SNAPSHOT)
    assert r.status_code == 200
    snap = r.json()
    sem_proibidos(snap)
    assert set(snap) == {"nome", "fuso", "classes", "equipamentos", "alertas"}
    assert snap["fuso"] == "America/Sao_Paulo"
    assert set(snap["classes"][0]) == {"slug", "nome", "cor", "icone", "ordem"}
    assert snap["equipamentos"] == [
        {"id": eq, "nome": "Câmera Portaria", "classe": "camera", "estado": "offline",
         "pai_id": None}
    ]  # fmt: skip
    (alerta,) = snap["alertas"]  # só o aberto
    assert set(alerta) == {"id", "tipo", "texto", "aberto_em", "equipamento_id", "afetados"}
    assert alerta["equipamento_id"] == eq and alerta["afetados"] == 0
    assert alerta["texto"] == "Câmera Portaria caiu"


async def test_snapshot_limita_20_alertas(
    app: FastAPI, abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient
) -> None:
    eq = await criar_equipamento_completo(app)
    for _ in range(25):
        await alerta_no_banco(app, eq)
    tv = abrir_tv()
    await emparelhar(tv, cliente_admin)
    assert len((await tv.get(SNAPSHOT)).json()["alertas"]) == 20


async def test_snapshot_sem_token_401(abrir_tv: AbrirTv) -> None:
    assert (await abrir_tv().get(SNAPSHOT)).status_code == 401
    r = await abrir_tv().get(SNAPSHOT, headers={"cookie": "sentinela_parede=inventado"})
    assert r.status_code == 401


async def test_token_parede_nao_abre_api_nem_ws_do_painel(
    abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient, abrir_ws_parede: AbrirWsParede
) -> None:
    tv = abrir_tv()
    _, token = await emparelhar(tv, cliente_admin)
    assert (await tv.get("/api/v1/equipamentos")).status_code == 401
    assert (await tv.get("/api/v1/alertas")).status_code == 401
    # nem colocado no cookie de sessão
    outro = abrir_tv()
    r = await outro.get("/api/v1/equipamentos", headers={"cookie": f"sentinela_sessao={token}"})
    assert r.status_code == 401
    for cookies in (
        {"sentinela_parede": token},
        {"sentinela_sessao": token, "sentinela_parede": token},
    ):
        ws = abrir_ws_parede(cookies=cookies, caminho="/ws")
        assert await ws.recusa() == 4401


async def test_http_desligado_404(abrir_tv: AbrirTv) -> None:
    tv = abrir_tv("http")
    assert (await tv.post(PEDIDO)).status_code == 404
    assert (await tv.get(PEDIDO)).status_code == 404
    assert (await tv.get(SNAPSHOT)).status_code == 404


async def test_http_ligado_cookie_sem_secure_e_ip_amarrado(
    abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient
) -> None:
    await ligar_http(cliente_admin)
    tv = abrir_tv("http")
    r = await tv.post(PEDIDO)
    assert r.status_code == 201
    assert "secure" not in atributos(cookie(r, "sentinela_parede_pedido"))
    a = await cliente_admin.post(APROVAR, json={"codigo": r.json()["codigo"], "nome": "TV"})
    assert a.json()["modo"] == "http"
    r_pend = await tv.get(PEDIDO)
    assert r_pend.status_code == 200
    apagado = atributos(cookie(r_pend, "sentinela_parede_pedido"))
    assert {"httponly", "samesite=strict", "path=/api/v1/parede"} <= apagado
    assert "secure" not in apagado
    r = r_pend
    linha = cookie(r, "sentinela_parede_http")
    attrs = atributos(linha)
    assert {"httponly", "samesite=strict", "path=/"} <= attrs and "secure" not in attrs
    token = linha.split(";")[0].split("=", 1)[1]
    assert (await tv.get(SNAPSHOT)).status_code == 200
    outro_ip = abrir_tv("http", ip="10.99.0.51")
    r = await outro_ip.get(SNAPSHOT, headers={"cookie": f"sentinela_parede_http={token}"})
    assert r.status_code == 401
    await ligar_http(cliente_admin, False)
    assert (await tv.get(SNAPSHOT)).status_code == 404


async def test_token_https_recusado_por_http_e_vice_versa(
    abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient
) -> None:
    await ligar_http(cliente_admin)
    _, token_https = await emparelhar(abrir_tv(), cliente_admin, "TV 1")
    _, token_http = await emparelhar(abrir_tv("http"), cliente_admin, "TV 2")
    http = abrir_tv("http")
    for nome in ("sentinela_parede", "sentinela_parede_http"):
        r = await http.get(SNAPSHOT, headers={"cookie": f"{nome}={token_https}"})
        assert r.status_code == 401
    https = abrir_tv()
    for nome in ("sentinela_parede", "sentinela_parede_http"):
        r = await https.get(SNAPSHOT, headers={"cookie": f"{nome}={token_http}"})
        assert r.status_code == 401


# ---- rotas do admin ---------------------------------------------------------------------------


async def test_visualizador_403(cliente_visualizador: httpx.AsyncClient) -> None:
    c = cliente_visualizador
    assert (await c.get(PAREDES)).status_code == 403
    assert (await c.post(APROVAR, json={"codigo": "K7MQ-2XDP", "nome": "x"})).status_code == 403
    assert (await c.delete(f"{PAREDES}/1")).status_code == 403
    assert (await c.get(CONFIG)).status_code == 403
    assert (await c.patch(CONFIG, json={"permitir_http": True})).status_code == 403


async def test_sem_csrf_403(abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient) -> None:
    codigo = (await abrir_tv().post(PEDIDO)).json()["codigo"]
    csrf = cliente_admin.headers.pop("X-CSRF")
    assert (
        await cliente_admin.post(APROVAR, json={"codigo": codigo, "nome": "x"})
    ).status_code == 403
    assert (await cliente_admin.delete(f"{PAREDES}/1")).status_code == 403
    assert (await cliente_admin.patch(CONFIG, json={"permitir_http": True})).status_code == 403
    cliente_admin.headers["X-CSRF"] = csrf
    r = await cliente_admin.post(APROVAR, json={"codigo": codigo, "nome": "x"})
    assert r.status_code == 201  # o código não foi gasto pelas tentativas recusadas


async def test_sem_login_401(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get(PAREDES)).status_code == 401
    assert (await cliente.get(CONFIG)).status_code == 401


async def test_aprovar_e_revogar_auditados(
    app: FastAPI, abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient
) -> None:
    tv = abrir_tv()
    ident, _ = await emparelhar(tv, cliente_admin)
    lista = (await cliente_admin.get(PAREDES)).json()
    assert len(lista) == 1
    assert set(lista[0]) == {
        "id", "nome", "modo", "criado_em", "ultimo_acesso", "ultimo_ip", "ativa",
    }  # fmt: skip
    assert lista[0]["ativa"] is True
    r = await cliente_admin.delete(f"{PAREDES}/{ident}")
    assert r.status_code == 204
    assert (await tv.get(SNAPSHOT)).status_code == 401
    assert (await cliente_admin.delete(f"{PAREDES}/{ident}")).status_code == 404
    assert (await cliente_admin.get(PAREDES)).json()[0]["ativa"] is False
    async with sessoes(app)() as db:
        acoes = {(a.acao, a.alvo): a for a in (await db.execute(select(Auditoria))).scalars()}
        parede = await db.get(Parede, ident)
        assert parede is not None and parede.token_hash is None
    aprovacao = acoes[("parede.aprovar", str(ident))]
    assert aprovacao.depois == {"nome": "TV Portaria", "modo": "https"}
    assert ("parede.revogar", str(ident)) in acoes


async def test_codigo_errado_404_generico(
    abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient
) -> None:
    for codigo in ("K7MQ-2XDP", "K7MQ-2XD0", "x", ""):
        r = await cliente_admin.post(APROVAR, json={"codigo": codigo, "nome": "TV"})
        assert (r.status_code, r.json()) == (404, {"detail": MSG_CODIGO})
    codigo = (await abrir_tv().post(PEDIDO)).json()["codigo"]
    assert (await cliente_admin.post(APROVAR, json={"codigo": codigo, "nome": "TV"})).is_success
    r = await cliente_admin.post(APROVAR, json={"codigo": codigo, "nome": "TV"})
    assert (r.status_code, r.json()) == (404, {"detail": MSG_CODIGO})


async def test_nome_obrigatorio(abrir_tv: AbrirTv, cliente_admin: httpx.AsyncClient) -> None:
    codigo = (await abrir_tv().post(PEDIDO)).json()["codigo"]
    for nome in ("", "   ", "x" * 65):
        r = await cliente_admin.post(APROVAR, json={"codigo": codigo, "nome": nome})
        assert r.status_code == 422


async def test_config_paredes_auditada(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    assert (await cliente_admin.get(CONFIG)).json() == {"permitir_http": False}
    r = await cliente_admin.patch(CONFIG, json={"permitir_http": True})
    assert r.json() == {"permitir_http": True}
    assert (await cliente_admin.get(CONFIG)).json() == {"permitir_http": True}
    assert (await cliente_admin.patch(CONFIG, json={"permitir_http": "sim"})).status_code == 422
    async with sessoes(app)() as db:
        a = await db.scalar(select(Auditoria).where(Auditoria.acao == "config.paredes"))
        assert a is not None
        assert (a.antes, a.depois) == ({"permitir_http": False}, {"permitir_http": True})


async def test_aprovacao_falha_auditada_sem_codigo(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    r = await cliente_admin.post(APROVAR, json={"codigo": "K7MQ-2XDP", "nome": "TV"})
    assert r.status_code == 404
    async with sessoes(app)() as db:
        (a,) = (
            await db.execute(select(Auditoria).where(Auditoria.acao == "parede.aprovar_falhou"))
        ).scalars()
    assert "K7MQ" not in str((a.alvo, a.antes, a.depois))
