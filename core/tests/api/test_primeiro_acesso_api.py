"""Primeiro acesso pela tela: código de instalação, rede sugerida e criação do administrador."""

import asyncio
import logging
import secrets
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import func, select

from sentinela.api import primeiro_acesso
from sentinela.config import Settings, pasta_dados
from sentinela.db.modelos import Auditoria, Classe, Equipamento, SubRede, Usuario
from sentinela.main import criar_app
from sentinela.relogio import RelogioFalso
from sentinela.seguranca import instalacao
from tests.api.apoio_descoberta import sessoes
from tests.conftest import SENHA_TESTE, CriarUsuario, criar_esquema

BASE = "/api/v1/primeiro-acesso"
CODIGO = "AB3K-9MNP"
IP_PADRAO = "127.0.0.1"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'teste.db'}",
        chave_sessao="chave-de-teste-nao-secreta",
        chave_credenciais=secrets.token_hex(32),
        rede_sugerida="192.168.1.0/24",
        gateway_sugerido="192.168.1.1",
    )


@pytest.fixture
async def codigo(cliente: httpx.AsyncClient, settings: Settings) -> str:
    await instalacao.gravar(pasta_dados(settings), CODIGO, datetime.now(UTC))
    return CODIGO


@pytest.fixture
def varreduras(app: FastAPI, monkeypatch: pytest.MonkeyPatch) -> list[tuple[int, str]]:
    chamadas: list[tuple[int, str]] = []

    async def iniciar(sub_rede_id: int, origem: str = "manual") -> dict[str, Any]:
        chamadas.append((sub_rede_id, origem))
        return {}

    monkeypatch.setattr(app.state.varredura, "iniciar", iniciar)
    return chamadas


def corpo(**mudancas: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "codigo": CODIGO,
        "login": "dono",
        "senha": SENHA_TESTE,
        "cidr": "192.168.1.0/24",
        "gateway": "192.168.1.1",
        "varredura": True,
    }
    return base | mudancas


async def _contar(app: FastAPI, modelo: type) -> int:  # type: ignore[type-arg]
    async with sessoes(app)() as db:
        return int(await db.scalar(select(func.count()).select_from(modelo)) or 0)


async def test_rotas_dao_404_com_qualquer_usuario(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario, codigo: str
) -> None:
    await criar_usuario("so-leitura", SENHA_TESTE, "visualizador")  # nem admin precisa ser
    assert (await cliente.get(BASE)).status_code == 404
    for rota, dados in (("/conferir", {"codigo": CODIGO}), ("/concluir", corpo())):
        r = await cliente.post(BASE + rota, json=dados)
        assert r.status_code == 404 and r.json() == {"detail": "Não encontrado."}
        # o 404 vem antes do 415 e do 422
        assert (await cliente.post(BASE + rota, content=b"x")).status_code == 404
        assert (await cliente.post(BASE + rota, json={})).status_code == 404


async def test_rotas_dao_404_no_modo_demo(tmp_path: Path) -> None:
    s = Settings(
        ambiente="teste",
        demo=True,
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'demo.db'}",
        chave_sessao="x",
        chave_credenciais=secrets.token_hex(32),
    )
    await criar_esquema(s.banco_url)
    app = criar_app(s, relogio=RelogioFalso(), iniciar_monitor=False)
    async with app.router.lifespan_context(app):
        transporte = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as c:
            assert (await c.get(BASE)).status_code == 404
            assert (await c.post(BASE + "/conferir", json={"codigo": CODIGO})).status_code == 404


async def test_get_sem_usuario_mostra_estado(
    cliente: httpx.AsyncClient, settings: Settings
) -> None:
    assert (await cliente.get(BASE)).json() == {"codigo": "ausente"}
    await instalacao.gravar(pasta_dados(settings), CODIGO, datetime.now(UTC))
    assert (await cliente.get(BASE)).json() == {"codigo": "ativo"}
    await instalacao.gravar(
        pasta_dados(settings), CODIGO, datetime.now(UTC) - timedelta(hours=24, seconds=1)
    )
    assert (await cliente.get(BASE)).json() == {"codigo": "expirado"}


async def test_conferir_certo_devolve_rede_sugerida(
    cliente: httpx.AsyncClient, codigo: str
) -> None:
    r = await cliente.post(BASE + "/conferir", json={"codigo": CODIGO.lower()})
    assert r.status_code == 200
    assert r.json() == {"rede": {"cidr": "192.168.1.0/24", "gateway": "192.168.1.1"}}


async def test_conferir_errado_401_generico(cliente: httpx.AsyncClient, codigo: str) -> None:
    for tentativa in ("ZZZZ-ZZZZ", "curto", "0000-0000"):
        r = await cliente.post(BASE + "/conferir", json={"codigo": tentativa})
        assert r.status_code == 401 and r.json() == {"detail": "Código inválido."}
    assert (await cliente.post(BASE + "/conferir", json={"codigo": "x" * 17})).status_code == 422


async def test_sem_json_415(cliente: httpx.AsyncClient, codigo: str) -> None:
    r = await cliente.post(BASE + "/conferir", content=f"codigo={CODIGO}".encode())
    assert r.status_code == 415
    r = await cliente.post(
        BASE + "/concluir",
        content=b"codigo=x",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 415


async def test_limite_de_20_por_ip_em_10_min(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, relogio: RelogioFalso
) -> None:
    assert (await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})).status_code == 200
    for _ in range(20):  # (a 1ª chamada fixou a marca do código; sem código novo, nada reinicia)
        app.state.falhas_codigo.registrar_falha(IP_PADRAO)
    for dados in ({"codigo": "ZZZZ-ZZZZ"}, {"codigo": CODIGO}):  # reserva ANTES de verificar
        r = await cliente.post(BASE + "/conferir", json=dados)
        assert r.status_code == 429
        assert int(r.headers["Retry-After"]) >= 1
    assert (await cliente.post(BASE + "/concluir", json=corpo())).status_code == 429
    await relogio.avancar(601)
    assert (await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})).status_code == 200


async def test_bloqueio_global_5_falhas_1_min(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, relogio: RelogioFalso
) -> None:
    for _ in range(5):
        r = await cliente.post(BASE + "/conferir", json={"codigo": "ZZZZ-ZZZZ"})
        assert r.status_code == 401
    r = await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})  # nem o certo passa
    assert r.status_code == 429 and 1 <= int(r.headers["Retry-After"]) <= 60
    transporte = httpx.ASGITransport(app=app, client=("10.99.0.9", 4000))
    async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as outro:
        r = await outro.post(BASE + "/conferir", json={"codigo": CODIGO})
        assert r.status_code == 429  # outro IP também espera
    await relogio.avancar(61)
    assert (await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})).status_code == 200


async def test_acerto_devolve_as_reservas(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str
) -> None:
    for _ in range(30):  # muitos acertos seguidos não gastam a cota nem bloqueiam
        assert (await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})).status_code == 200
    assert app.state.falhas_codigo.restante(IP_PADRAO) == 0
    assert app.state.bloqueio_codigo.restante("instalacao") == 0


async def test_concluir_cria_admin_subrede_roteador_varre_e_entra(
    app: FastAPI,
    cliente: httpx.AsyncClient,
    codigo: str,
    varreduras: list[tuple[int, str]],
) -> None:
    r = await cliente.post(BASE + "/concluir", json=corpo())
    assert r.status_code == 204, r.text
    assert "sentinela_sessao" in r.headers.get("set-cookie", "")
    assert cliente.cookies.get("sentinela_csrf")
    eu = await cliente.get("/api/v1/auth/eu")
    assert eu.status_code == 200 and eu.json()["login"] == "dono" and eu.json()["papel"] == "admin"

    async with sessoes(app)() as db:
        sub = (await db.execute(select(SubRede))).scalar_one()
        assert (sub.cidr, sub.permite_varredura, sub.gateway_ip) == (
            "192.168.1.0/24",
            True,
            "192.168.1.1",
        )
        eq = (await db.execute(select(Equipamento))).scalar_one()
        classe = await db.get(Classe, eq.classe_id)
        assert classe is not None and classe.slug == "roteador"
        assert (eq.nome, eq.ip, eq.checagem, eq.classe_origem) == (
            "Roteador",
            "192.168.1.1",
            "icmp",
            "manual",
        )
        admin = (await db.execute(select(Usuario))).scalar_one()
        assert admin.papel == "admin" and admin.hash_senha.startswith("$argon2id$")
        acoes = list((await db.execute(select(Auditoria).order_by(Auditoria.id))).scalars())
        assert {a.acao for a in acoes} == {
            "primeiro_acesso.concluir",
            "subrede.criar",
            "equipamento.criar",
        }
        assert all(a.usuario_id == admin.id for a in acoes)
    assert varreduras == [(sub.id, "primeiro_acesso")]
    app.state.guarda.validar("192.168.1.1", None, "icmp")  # a Guarda já vale para a rede nova


async def test_concluir_sem_varredura_nao_varre(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, varreduras: list[tuple[int, str]]
) -> None:
    r = await cliente.post(BASE + "/concluir", json=corpo(varredura=False, gateway=None))
    assert r.status_code == 204, r.text
    assert varreduras == []
    async with sessoes(app)() as db:
        sub = (await db.execute(select(SubRede))).scalar_one()
        assert sub.permite_varredura is False and sub.gateway_ip is None
    assert await _contar(app, Equipamento) == 0  # sem gateway, sem roteador


async def test_falha_ao_varrer_nao_desfaz_nada(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def quebra(*_a: Any, **_k: Any) -> None:
        raise RuntimeError("falha de teste")

    monkeypatch.setattr(app.state.varredura, "iniciar", quebra)
    assert (await cliente.post(BASE + "/concluir", json=corpo())).status_code == 204
    assert (await cliente.get("/api/v1/auth/eu")).status_code == 200
    assert await _contar(app, Usuario) == 1


async def test_codigo_invalidado_depois_de_concluir(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, settings: Settings
) -> None:
    assert (await cliente.post(BASE + "/concluir", json=corpo())).status_code == 204
    assert instalacao.estado(pasta_dados(settings), datetime.now(UTC)) == "ausente"
    assert (await cliente.get(BASE)).status_code == 404
    assert (await cliente.post(BASE + "/concluir", json=corpo(login="outro"))).status_code == 404
    assert await _contar(app, Usuario) == 1


async def test_codigo_errado_no_concluir_401_sem_criar(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str
) -> None:
    r = await cliente.post(BASE + "/concluir", json=corpo(codigo="ZZZZ-ZZZZ"))
    assert r.status_code == 401 and r.json() == {"detail": "Código inválido."}
    assert await _contar(app, Usuario) == 0


async def test_senha_curta_422_sem_criar_nada(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str
) -> None:
    r = await cliente.post(BASE + "/concluir", json=corpo(senha="curta"))
    assert r.status_code == 422
    assert "12" in r.json()["detail"] and "curta" not in r.text
    for modelo in (Usuario, SubRede, Equipamento, Auditoria):
        assert await _contar(app, modelo) == 0
    # a recusa de formulário não gasta o código nem a cota
    assert (await cliente.post(BASE + "/concluir", json=corpo())).status_code == 204


@pytest.mark.parametrize("cidr", ["8.8.8.0/24", "10.0.0.0/8", "192.168.1.5/24", "lixo"])
async def test_cidr_publico_ou_barra_8_422(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, cidr: str
) -> None:
    r = await cliente.post(BASE + "/concluir", json=corpo(cidr=cidr, gateway=None))
    assert r.status_code == 422, r.text
    assert cidr not in r.text  # sem eco da entrada
    assert await _contar(app, Usuario) == 0 and await _contar(app, SubRede) == 0


@pytest.mark.parametrize("gateway", ["192.168.2.1", "192.168.1.0", "192.168.1.255", "x"])
async def test_gateway_fora_da_rede_422(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, gateway: str
) -> None:
    r = await cliente.post(BASE + "/concluir", json=corpo(gateway=gateway))
    assert r.status_code == 422
    assert r.json()["detail"] == "O gateway precisa estar dentro da sub-rede."
    assert await _contar(app, Usuario) == 0


async def test_dois_concluir_simultaneos_um_so_admin(
    app: FastAPI,
    cliente: httpx.AsyncClient,
    codigo: str,
    varreduras: list[tuple[int, str]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Barreira: os dois passam pela pré-checagem (404 de dependência) e pelo código ANTES de
    qualquer INSERT; quem decide é o INSERT guardado por NOT EXISTS."""
    chegaram = 0
    ambos = asyncio.Event()
    original = primeiro_acesso.gerar_hash_async

    async def com_barreira(senha: str) -> str:
        nonlocal chegaram
        chegaram += 1
        if chegaram == 2:
            ambos.set()
        await asyncio.wait_for(ambos.wait(), timeout=10)
        return await original(senha)

    monkeypatch.setattr(primeiro_acesso, "gerar_hash_async", com_barreira)
    a, b = await asyncio.gather(
        cliente.post(BASE + "/concluir", json=corpo(login="primeiro")),
        cliente.post(BASE + "/concluir", json=corpo(login="segundo")),
    )
    assert chegaram == 2  # ambos passaram da pré-checagem
    assert sorted([a.status_code, b.status_code]) == [204, 404]
    assert await _contar(app, Usuario) == 1
    assert await _contar(app, SubRede) == 1 and await _contar(app, Equipamento) == 1
    assert len(varreduras) == 1


async def test_codigo_com_24h_e_1s_401_mesmo_certo(
    cliente: httpx.AsyncClient, settings: Settings
) -> None:
    await instalacao.gravar(
        pasta_dados(settings), CODIGO, datetime.now(UTC) - timedelta(hours=24, seconds=1)
    )
    r = await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})
    assert r.status_code == 401 and r.json() == {"detail": "Código inválido."}
    r = await cliente.post(BASE + "/concluir", json=corpo())
    assert r.status_code == 401


async def test_rede_ja_cadastrada_e_reaproveitada(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, varreduras: list[tuple[int, str]]
) -> None:
    async with sessoes(app)() as db:  # p.ex. criada antes pela CLI sub-rede adicionar
        db.add(SubRede(cidr="192.168.1.0/24"))
        await db.commit()
    assert (await cliente.post(BASE + "/concluir", json=corpo())).status_code == 204
    async with sessoes(app)() as db:
        sub = (await db.execute(select(SubRede))).scalar_one()
        assert sub.permite_varredura is True and sub.gateway_ip == "192.168.1.1"


async def test_correto_depois_de_5_erros_e_1_min_conclui(
    app: FastAPI,
    cliente: httpx.AsyncClient,
    codigo: str,
    relogio: RelogioFalso,
    varreduras: list[tuple[int, str]],
) -> None:
    for _ in range(5):
        r = await cliente.post(BASE + "/conferir", json={"codigo": "ZZZZ-ZZZZ"})
        assert r.status_code == 401
    await relogio.avancar(61)
    assert (await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})).status_code == 200
    assert (await cliente.post(BASE + "/concluir", json=corpo())).status_code == 204


async def test_codigo_novo_da_cli_zera_bloqueio_e_contadores(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, settings: Settings
) -> None:
    for _ in range(5):
        await cliente.post(BASE + "/conferir", json={"codigo": "ZZZZ-ZZZZ"})
    r = await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})
    assert r.status_code == 429
    assert "codigo-instalacao" in r.json()["detail"]  # diz como obter um código novo
    for _ in range(20):
        app.state.falhas_codigo.registrar_falha(IP_PADRAO)
    # a CLI (outro processo) grava um código novo: a marca do arquivo muda
    await instalacao.gravar(pasta_dados(settings), "CD4F-7GHJ", datetime.now(UTC))
    r = await cliente.post(BASE + "/conferir", json={"codigo": "CD4F-7GHJ"})
    assert r.status_code == 200
    assert (await cliente.post(BASE + "/conferir", json={"codigo": CODIGO})).status_code == 401


async def test_codigo_recusado_vai_ao_log_sem_o_texto(
    cliente: httpx.AsyncClient, codigo: str, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger="sentinela")
    await cliente.post(BASE + "/conferir", json={"codigo": "QWER-TYUP"})
    registro = [r.getMessage() for r in caplog.records if "recusado" in r.getMessage()]
    assert registro and IP_PADRAO in registro[0] and "falhas_do_ip=1" in registro[0]
    assert "QWER" not in caplog.text and "TYUP" not in caplog.text


async def test_rede_ja_cadastrada_audita_como_edicao(
    app: FastAPI, cliente: httpx.AsyncClient, codigo: str, varreduras: list[tuple[int, str]]
) -> None:
    async with sessoes(app)() as db:
        db.add(SubRede(cidr="192.168.1.0/24"))
        await db.commit()
    assert (await cliente.post(BASE + "/concluir", json=corpo())).status_code == 204
    async with sessoes(app)() as db:
        auds = {a.acao: a for a in (await db.execute(select(Auditoria))).scalars()}
    assert "subrede.criar" not in auds
    assert auds["subrede.editar"].antes == {"permite_varredura": False, "gateway_ip": None}
    assert auds["subrede.editar"].depois == {"permite_varredura": True, "gateway_ip": "192.168.1.1"}
