"""Credenciais marcadoras nunca aparecem em resposta, log ou auditoria (spec §6 Segurança).

Cria fontes de todos os tipos com segredos marcadores, exercita todas as rotas da descoberta
(sucesso e erro, inclusive exceções do coletor que citam o segredo e entradas inválidas que o
carregam) e procura as marcadoras nas respostas, no ``caplog`` e na tabela ``auditoria``.
"""

import logging
from typing import Any

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select

from sentinela.alertas.telegram import ErroTelegram
from sentinela.config import Settings
from sentinela.db.modelos import Auditoria, Config, Fonte, Usuario
from sentinela.descoberta.fontes.base import CertificadoNaoConfiado, ErroColeta, ResultadoTeste
from sentinela.relogio import RelogioFalso
from tests.api.apoio_descoberta import (
    CONFIG,
    DESCOBERTAS,
    FONTES,
    IMPRESSAO,
    SUBREDES,
    VARREDURA,
    Falsos,
    criar_descoberta,
    sessoes,
    subrede,
)
from tests.apoio_totp import Tempo, codigo_em
from tests.conftest import SENHA_TESTE, CriarUsuario

MARCA_SENHA = "MARCA-senha-7c1e"
MARCA_COMUNIDADE = "MARCA-comunidade-3b9"
MARCA_AUTH = "MARCA-auth-55aa"
MARCA_PRIV = "MARCA-priv-66bb"
MARCA_GRAVADOR = "MARCA-gravador-0d0d"
MARCAS = (MARCA_SENHA, MARCA_COMUNIDADE, MARCA_AUTH, MARCA_PRIV, MARCA_GRAVADOR)
SEGREDOS_POR_FONTE = (
    (MARCA_SENHA,),
    (MARCA_COMUNIDADE,),
    (MARCA_AUTH, MARCA_PRIV),
    (MARCA_GRAVADOR,),
)

FONTES_MARCADAS: list[dict[str, Any]] = [
    {
        "tipo": "mikrotik",
        "nome": "Roteador",
        "host": "10.99.0.1",
        "credencial": {"usuario": "leitor", "senha": MARCA_SENHA},
    },
    {
        "tipo": "snmp",
        "nome": "Switch v2c",
        "host": "10.99.0.2",
        "credencial": {"versao": "2c", "comunidade": MARCA_COMUNIDADE},
    },
    {
        "tipo": "snmp",
        "nome": "Switch v3",
        "host": "10.99.0.3",
        "credencial": {
            "versao": "3",
            "usuario": "monitor",
            "auth": "SHA256",
            "senha_auth": MARCA_AUTH,
            "priv": "AES",
            "senha_priv": MARCA_PRIV,
        },
    },
    {
        "tipo": "hikvision",
        "nome": "NVR",
        "host": "10.99.0.4",
        "credencial": {"usuario": "admin", "senha": MARCA_GRAVADOR},
    },
]


async def test_segredos_nao_vazam(
    app: FastAPI,
    cliente_admin: httpx.AsyncClient,
    relogio: RelogioFalso,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    caplog.set_level(logging.DEBUG, logger="sentinela")
    falsos = Falsos()
    falsos.instalar(app)
    respostas: list[httpx.Response] = []
    c = cliente_admin

    async def pedir(metodo: str, url: str, **kw: Any) -> httpx.Response:
        r = await c.request(metodo, url, **kw)
        respostas.append(r)
        await app.state.orquestrador.ocioso()  # coleta em fundo termina antes da próxima
        await relogio.avancar(31)  # fora do limite de taxa e do "coletar agora"
        return r

    sub = await subrede(c)
    await pedir("PATCH", f"{SUBREDES}/{sub['id']}", json={"permite_varredura": True})
    ids = []
    for corpo in FONTES_MARCADAS:
        r = await pedir("POST", FONTES, json=corpo)
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])

    # entradas inválidas carregando as marcadoras: 422 sem eco
    for ruim in (
        {**FONTES_MARCADAS[0], "host": MARCA_SENHA},
        {**FONTES_MARCADAS[0], "credencial": {"usuario": "a", "senha": MARCA_SENHA * 20}},
        {**FONTES_MARCADAS[0], "credencial": {"usuario": "a", "senha": MARCA_SENHA, "x": 1}},
        {**FONTES_MARCADAS[1], "credencial": {"versao": "9", "comunidade": MARCA_COMUNIDADE}},
        {**FONTES_MARCADAS[0], "credencial": {"versao": "2c", "comunidade": MARCA_COMUNIDADE}},
    ):
        assert (await pedir("POST", FONTES, json=ruim)).status_code == 422
    r = await pedir(
        "PATCH", f"{FONTES}/{ids[0]}", json={"credencial": {"comunidade": MARCA_COMUNIDADE}}
    )
    assert r.status_code == 422

    await pedir("GET", FONTES)
    for id in ids:
        await pedir("PATCH", f"{FONTES}/{id}", json={"nome": "Renomeada"})

    # testar: sucesso, erro do coletor citando o segredo DA PRÓPRIA fonte (o único que ela
    # poderia ver), exceção crua, certificado
    for id, segredos in zip(ids, SEGREDOS_POR_FONTE, strict=True):
        texto = " / ".join(segredos)
        for teste in (
            ResultadoTeste(ok=True, identidade="RB", avisos=["aviso"]),
            ErroColeta(f"login recusado para {texto}"),
            ResultadoTeste(ok=False, erro=f"recusado {texto}", avisos=[f"aviso {texto}"]),
            RuntimeError(f"traceback {texto}"),
            CertificadoNaoConfiado(IMPRESSAO),
        ):
            falsos.coletor.teste = teste
            await pedir("POST", f"{FONTES}/{id}/testar")
    await pedir("POST", f"{FONTES}/{ids[0]}/confiar", json={"impressao": MARCA_SENHA})
    await pedir("POST", f"{FONTES}/{ids[0]}/confiar", json={"impressao": "ef" * 32})
    await pedir("POST", f"{FONTES}/{ids[0]}/confiar", json={"impressao": IMPRESSAO})

    # coletar: erro do coletor citando o segredo da fonte e exceção crua
    for id, segredos in zip(ids, SEGREDOS_POR_FONTE, strict=True):
        texto = " ".join(segredos)
        for erro in (ErroColeta(f"falhou {texto}"), RuntimeError(f"cru {texto}"), None):
            falsos.coletor.erro_coleta = erro
            await pedir("POST", f"{FONTES}/{id}/coletar")
            await pedir("GET", FONTES)
        # termina com erro: o ``ultimo_erro`` gravado conteria o segredo se não fosse mascarado
        falsos.coletor.erro_coleta = ErroColeta(f"recusado para {texto}")
        await pedir("POST", f"{FONTES}/{id}/coletar")
    falsos.coletor.erro_coleta = None
    # lido ANTES de remover as fontes (depois do DELETE não sobra nada para conferir)
    async with sessoes(app)() as db:
        erros_gravados = {f.id: f.ultimo_erro for f in (await db.execute(select(Fonte))).scalars()}
    assert set(erros_gravados) == set(ids)
    for id in ids:
        erro_gravado = erros_gravados[id]
        assert erro_gravado is not None and "recusado para" in erro_gravado, erro_gravado
        assert "***" in erro_gravado  # o caminho de máscara foi de fato exercitado
    await pedir("GET", FONTES)  # e o admin lê o erro mascarado pela API

    # descobertas, varredura e configuração
    d = await criar_descoberta(app)
    fora = await criar_descoberta(app, "10.98.0.9", mac="02:00:00:00:00:99", fora=True)
    await pedir("GET", DESCOBERTAS)
    await pedir("POST", f"{DESCOBERTAS}/{d}/sondar")
    await pedir("POST", f"{DESCOBERTAS}/{fora}/aprovar", json={})
    await pedir("POST", f"{DESCOBERTAS}/aprovar-lote", json={"ids": [d, fora, MARCA_SENHA]})
    await pedir("POST", f"{DESCOBERTAS}/{d}/ignorar")
    await pedir("POST", f"{DESCOBERTAS}/{fora}/declarar-subrede")
    await pedir("POST", VARREDURA, json={"sub_rede_id": sub["id"]})
    await pedir("GET", VARREDURA)
    await pedir("DELETE", VARREDURA)
    await pedir("PATCH", CONFIG, json={"aprovacao_automatica": True})
    await pedir("GET", CONFIG)
    for id in ids:
        assert (await pedir("DELETE", f"{FONTES}/{id}")).status_code == 204
    await app.state.orquestrador.ocioso()

    # o segredo está guardado (cifrado) e o teste realmente exercitou os caminhos
    assert any(r.status_code == 422 for r in respostas)
    assert any(r.status_code == 409 for r in respostas)
    assert any(r.status_code == 200 and '"ok":false' in r.text for r in respostas)

    textos = [r.text for r in respostas] + [str(dict(r.headers)) for r in respostas]
    async with sessoes(app)() as db:
        auditoria = [
            repr((a.acao, a.alvo, a.antes, a.depois, a.ip))
            for a in (await db.execute(select(Auditoria))).scalars()
        ]
        fontes = [repr(e) for e in erros_gravados.values()]
    assert len(auditoria) > 10
    for marca in MARCAS:
        assert not [t for t in textos if marca in t], marca
        assert marca not in caplog.text, marca
        assert not [a for a in auditoria if marca in a], marca
        assert not [f for f in fontes if marca in f], marca


MARCA_TOKEN_TELEGRAM = "MARCA-bot-4e4e-" + "x" * 20


async def test_token_do_telegram_nao_vaza(
    app: FastAPI, cliente_admin: httpx.AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Exceção do cliente com a URL completa (``/bot<token>/sendMessage``) no texto: o token
    não aparece em resposta, log, auditoria nem em ``config.telegram_status``."""
    caplog.set_level(logging.DEBUG)
    caplog.set_level(logging.DEBUG, logger="sentinela")
    token = "123456789:" + MARCA_TOKEN_TELEGRAM

    class Cliente:
        def __init__(self, erro: Exception) -> None:
            self.erro = erro

        async def enviar(self, token: str, chat: str, texto: str) -> int | None:
            raise self.erro

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    erros: list[Exception] = [
        RuntimeError(f"Client error '401' for url '{url}'"),
        httpx.ConnectError(f"falha em {url}"),
        ErroTelegram("Token recusado pelo Telegram.", temporario=False),
    ]
    respostas: list[httpx.Response] = []
    r = await cliente_admin.patch(
        "/api/v1/config/telegram", json={"token": token, "chats": ["-100123"]}
    )
    respostas.append(r)
    assert r.status_code == 200
    respostas.append(
        await cliente_admin.patch("/api/v1/config/telegram", json={"token": "x" + token})
    )
    for erro in erros:
        app.state.cliente_telegram = Cliente(erro)
        r = await cliente_admin.post("/api/v1/config/telegram/teste")
        assert r.status_code == 200 and r.json()["ok"] is False
        respostas.append(r)
        respostas.append(await cliente_admin.get("/api/v1/config/telegram"))
    assert any(r.status_code == 422 for r in respostas)

    textos = [r.text for r in respostas] + [str(dict(r.headers)) for r in respostas]
    async with sessoes(app)() as db:
        auditoria = [
            repr((a.acao, a.alvo, a.antes, a.depois, a.ip))
            for a in (await db.execute(select(Auditoria))).scalars()
        ]
        config = [repr((c.chave, c.valor)) for c in (await db.execute(select(Config))).scalars()]
    status_telegram = [c for c in config if "telegram_status" in c]
    assert status_telegram and "ultimo_erro" in status_telegram[0]
    assert not [t for t in textos if MARCA_TOKEN_TELEGRAM in t]
    assert MARCA_TOKEN_TELEGRAM not in caplog.text
    assert not [a for a in auditoria if MARCA_TOKEN_TELEGRAM in a]
    assert not [c for c in status_telegram if MARCA_TOKEN_TELEGRAM in c]
    # o token só existe cifrado na linha de configuração
    assert not [c for c in config if MARCA_TOKEN_TELEGRAM in c]


async def test_segredo_totp_codigo_e_etapa_nao_vazam(
    app: FastAPI,
    cliente: httpx.AsyncClient,
    criar_usuario: CriarUsuario,
    caplog: pytest.LogCaptureFixture,
    tempo: Tempo,
) -> None:
    """Segredo base32, código de recuperação e token da etapa só aparecem onde a entrega única
    os mostra: nunca em logs, auditoria, ``GET /usuarios`` nem mensagens de erro."""
    caplog.set_level(logging.DEBUG)
    caplog.set_level(logging.DEBUG, logger="sentinela")
    adm = await criar_usuario("adm", SENHA_TESTE, "admin")
    login = {"login": "adm", "senha": SENHA_TESTE}
    assert (await cliente.post("/api/v1/auth/login", json=login)).status_code == 204
    cliente.headers["X-CSRF"] = cliente.cookies["sentinela_csrf"]
    ini = await cliente.post("/api/v1/auth/totp/iniciar", json={"senha": SENHA_TESTE})
    chave = ini.json()["chave"].replace(" ", "")
    ativ = await cliente.post(
        "/api/v1/auth/totp/confirmar", json={"codigo": codigo_em(chave, tempo())}
    )
    codigos = ativ.json()["codigos"]
    assert len(codigos) == 10
    entregues = {chave, *codigos}

    respostas: list[httpx.Response] = []  # tudo que veio DEPOIS da entrega única
    respostas.append(await cliente.get("/api/v1/usuarios"))
    respostas.append(await cliente.get("/api/v1/auth/eu"))
    respostas.append(await cliente.get("/api/v1/auth/totp/qr"))  # 404: ativo
    respostas.append(await cliente.post("/api/v1/auth/totp/iniciar", json={"senha": SENHA_TESTE}))
    respostas.append(await cliente.post("/api/v1/auth/totp/confirmar", json={"codigo": chave}))
    respostas.append(await cliente.post("/api/v1/auth/totp/confirmar", json={"codigo": codigos[0]}))
    # login em duas etapas: erros com o código de recuperação e o segredo no corpo
    cliente.cookies.clear()
    assert (await cliente.post("/api/v1/auth/login", json=login)).status_code == 202
    token = cliente.cookies["sentinela_etapa"]
    for corpo in (
        {"recuperacao": chave[:10]},
        {"codigo": chave[:6]},
        {"codigo": "1", "recuperacao": codigos[0]},
    ):
        respostas.append(await cliente.post("/api/v1/auth/totp/entrar", json=corpo))
    respostas.append(
        await cliente.post("/api/v1/auth/totp/entrar", json={"recuperacao": codigos[1]})
    )
    entregues.add(token)

    for r in respostas:
        for segredo in entregues:
            assert segredo not in r.text
            assert segredo not in str(dict(r.headers))
    async with sessoes(app)() as db:
        auditoria = [
            repr((a.acao, a.alvo, a.antes, a.depois, a.ip))
            for a in (await db.execute(select(Auditoria))).scalars()
        ]
        config = [repr((c.chave, c.valor)) for c in (await db.execute(select(Config))).scalars()]
        usuario = repr(
            (await db.execute(select(Usuario).where(Usuario.id == adm.id))).scalar_one().__dict__
        )
    assert any("totp.ativar" in a for a in auditoria)
    for segredo in entregues:
        assert segredo not in caplog.text
        assert not [a for a in auditoria if segredo in a]
        assert not [c for c in config if segredo in c]
        assert segredo not in usuario  # o segredo só existe cifrado


async def test_codigo_de_instalacao_nunca_aparece(
    app: FastAPI,
    cliente: httpx.AsyncClient,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """O código vive só no terminal: nunca em resposta, log, auditoria nem no arquivo."""
    from datetime import UTC, datetime

    from sentinela.config import pasta_dados
    from sentinela.seguranca import instalacao

    caplog.set_level(logging.DEBUG)
    caplog.set_level(logging.DEBUG, logger="sentinela")
    codigo = instalacao.gerar_codigo()
    variantes = (codigo, codigo.replace("-", ""), codigo.lower(), codigo.lower().replace("-", ""))
    await instalacao.gravar(pasta_dados(settings), codigo, datetime.now(UTC))
    guardado = (pasta_dados(settings) / instalacao.ARQUIVO).read_text()  # some ao concluir
    base = "/api/v1/primeiro-acesso"
    respostas = [
        await cliente.get(base),
        await cliente.post(base + "/conferir", json={"codigo": "ZZZZ-ZZZZ"}),
        await cliente.post(base + "/conferir", json={"codigo": codigo}),
        await cliente.post(base + "/conferir", content=codigo.encode()),
        await cliente.post(
            base + "/concluir",
            json={
                "codigo": codigo,
                "login": "dono",
                "senha": "curta",
                "cidr": "192.168.1.0/24",
                "gateway": None,
                "varredura": False,
            },
        ),
        await cliente.post(
            base + "/concluir",
            json={
                "codigo": codigo,
                "login": "dono",
                "senha": SENHA_TESTE,
                "cidr": "192.168.1.0/24",
                "gateway": "192.168.1.1",
                "varredura": False,
            },
        ),
        await cliente.get(base),  # já com usuário: 404
        await cliente.post(base + "/conferir", json={"codigo": codigo}),
    ]
    assert [r.status_code for r in respostas] == [200, 401, 200, 415, 422, 204, 404, 404]
    textos = [r.text for r in respostas] + [str(dict(r.headers)) for r in respostas]
    async with sessoes(app)() as db:
        auditoria = [
            repr((a.acao, a.alvo, a.antes, a.depois, a.ip))
            for a in (await db.execute(select(Auditoria))).scalars()
        ]
    assert len(auditoria) == 3
    assert guardado and not (pasta_dados(settings) / instalacao.ARQUIVO).exists()
    for variante in variantes:
        assert not [t for t in textos if variante in t], variante
        assert not [a for a in auditoria if variante in a], variante
        assert variante not in caplog.text
        assert variante not in guardado
