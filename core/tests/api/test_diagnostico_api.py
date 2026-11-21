import csv
import io
import uuid
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.config import Settings
from sentinela.db.modelos import Classe, Equipamento, Evento, Usuario
from sentinela.main import criar_app
from sentinela.relogio import RelogioFalso
from sentinela.seguranca.senhas import gerar_hash
from tests.conftest import SENHA_TESTE, criar_esquema

URL = "/api/v1/diagnostico"


async def _queda_recente(app: FastAPI) -> None:
    sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
    agora = datetime.now(UTC)
    async with sessoes() as db:
        c = await db.scalar(select(Classe).where(Classe.slug == "camera"))
        assert c is not None
        e = Equipamento(
            id=str(uuid.uuid4()),
            nome="Câmera Teste",
            ip="10.99.7.1",
            classe_id=c.id,
            estado="online",
            estado_desde=agora,
            criado_em=agora,
        )
        db.add(e)
        db.add(
            Evento(equipamento_id=e.id, de="online", para="offline", em=agora - timedelta(hours=1))
        )
        db.add(
            Evento(
                equipamento_id=e.id,
                de="offline",
                para="online",
                em=agora - timedelta(minutes=58),
            )
        )
        await db.commit()


async def test_diagnostico_exige_sessao(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get(URL)).status_code == 401
    assert (await cliente.get(f"{URL}/laudo.csv")).status_code == 401


async def test_visualizador_le(app: FastAPI, cliente_visualizador: httpx.AsyncClient) -> None:
    await _queda_recente(app)
    r = await cliente_visualizador.get(URL, params={"periodo": "24h"})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["periodo"] == "24h" and len(corpo["horas"]) == 24
    assert corpo["resumo"]["incidentes"] == 1
    (inc,) = corpo["incidentes"]
    assert inc["tipo"] == "queda_isolada" and inc["certeza"] == "provavel"
    assert inc["porque"] and inc["sugestoes"] and inc["rotulo"].endswith("(provável)")
    assert inc["equipamentos"][0]["nome"] == "Câmera Teste"
    assert inc["equipamentos"][0]["classe"] == "camera"
    assert corpo["gateway_configurado"] is False and corpo["aviso_energia"]
    assert "10.99.7.1" not in r.text  # nunca o IP


async def test_periodo_invalido_422(cliente_visualizador: httpx.AsyncClient) -> None:
    for p in ("1h", "", "90d"):
        assert (await cliente_visualizador.get(URL, params={"periodo": p})).status_code == 422
        assert (
            await cliente_visualizador.get(f"{URL}/laudo.csv", params={"periodo": p})
        ).status_code == 422


async def test_csv_bom_cabecalho_e_nome_do_arquivo(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    await _queda_recente(app)
    r = await cliente_visualizador.get(f"{URL}/laudo.csv", params={"periodo": "7d"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "text/csv; charset=utf-8"
    assert r.headers["cache-control"] == "no-store"
    disp = r.headers["content-disposition"]
    assert disp.startswith('attachment; filename="sentinela-diagnostico-')
    assert disp.endswith('-7d.csv"')
    assert r.content[:3] == b"\xef\xbb\xbf"
    linhas = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig"), newline=""), delimiter=";"))
    assert linhas[0][0] == "inicio" and len(linhas[0]) == 7 and len(linhas) == 2
    assert "Câmera Teste" in linhas[1][4]


async def test_csv_tem_limite_de_taxa(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    codigos = [(await cliente_visualizador.get(f"{URL}/laudo.csv")).status_code for _ in range(12)]
    assert codigos[0] == 200 and codigos[-1] == 429


async def test_demo_tem_incidentes_de_exemplo(settings: Settings) -> None:
    app = criar_app(
        settings.model_copy(update={"demo": True}), relogio=RelogioFalso(), iniciar_monitor=False
    )
    await criar_esquema(settings.banco_url)
    async with app.router.lifespan_context(app):
        sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
        async with sessoes() as db:
            db.add(
                Usuario(
                    login="visual-demo", hash_senha=gerar_hash(SENHA_TESTE), papel="visualizador"
                )
            )
            await db.commit()
        transporte = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as c:
            r = await c.post(
                "/api/v1/auth/login", json={"login": "visual-demo", "senha": SENHA_TESTE}
            )
            assert r.status_code == 204
            r30 = (await c.get(URL, params={"periodo": "30d"})).json()
    assert r30["gateway_configurado"] is True
    tipos = r30["resumo"]["por_tipo"]
    assert tipos.get("roteador_reiniciou", 0) >= 15
    assert {"queda_isolada", "instabilidade", "quedas_simultaneas"} <= set(tipos)
    assert all(i["certeza"] == "provavel" for i in r30["incidentes"])
    # reinícios concentrados às 19 h locais
    horas = r30["horas"]
    assert horas[19] >= 15 and horas[19] == max(horas)
    assert "10.99." not in str(r30)


async def test_json_tem_limite_de_taxa(cliente_visualizador: httpx.AsyncClient) -> None:
    codigos = [(await cliente_visualizador.get(URL)).status_code for _ in range(62)]
    assert codigos[:60] == [200] * 60 and codigos[-1] == 429  # 60 por minuto


async def test_baldes_separados_do_diagnostico(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    # esgotar a descoberta (10/min) não tira o Diagnóstico, e alternar períodos várias vezes
    # nunca chega ao limite
    async with app.state.sessoes() as db:
        uid = await db.scalar(select(Usuario.id).where(Usuario.login == "visual-teste"))
    for _ in range(12):
        app.state.taxa_descoberta.reservar(f"usuario:{uid}")
    assert app.state.taxa_descoberta.restante(f"usuario:{uid}") > 0
    codigos = [
        (await cliente_visualizador.get(URL, params={"periodo": p})).status_code
        for p in ["24h", "7d", "30d", "24h"] * 4
    ]
    assert codigos == [200] * 16
    # e o CSV tem o balde dele: esgotá-lo não derruba o JSON
    for _ in range(12):
        await cliente_visualizador.get(f"{URL}/laudo.csv")
    assert (await cliente_visualizador.get(URL)).status_code == 200


async def test_resposta_tem_teto_de_equipamentos(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _queda_recente(app)
    monkeypatch.setattr("sentinela.api.diagnostico.MAX_ENTRADAS_EQUIPAMENTO", 0)
    corpo = (await cliente_visualizador.get(URL)).json()
    assert corpo["truncado"] is True
    assert corpo["incidentes"][0]["equipamentos"] == []
    assert corpo["incidentes"][0]["equipamentos_total"] == 1
