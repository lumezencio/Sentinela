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

from sentinela.db.modelos import Auditoria, Fonte
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
