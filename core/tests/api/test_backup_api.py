"""GET/POST /backup e o cenário de restauração com outra chave de credenciais."""

import asyncio
import secrets
import sqlite3
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select

from sentinela.backup.arquivo import ErroBackup, restaurar_backup
from sentinela.config import Settings
from sentinela.db.modelos import Fonte
from sentinela.main import criar_app
from sentinela.relogio import RelogioFalso
from tests.api.apoio_descoberta import auditorias, criar_fonte, sessoes, subrede
from tests.backup.apoio import AGORA
from tests.conftest import SENHA_TESTE

BACKUP = "/api/v1/backup"
AVISO = (
    "O backup não inclui o arquivo .env. Guarde-o em outro lugar seguro: sem a chave "
    "SENTINELA_CHAVE_CREDENCIAIS, as senhas das fontes e o token do Telegram não abrem."
)
TOKEN = "123456789:" + "A" * 35


async def test_get_backup_lista_status_e_aviso_fixo(cliente_admin: httpx.AsyncClient) -> None:
    vazio = (await cliente_admin.get(BACKUP)).json()
    assert vazio == {
        "ultimo_em": None,
        "ultimo_tamanho": None,
        "ultimo_erro": None,
        "copias": [],
        "diretorio": "/dados/backups",
        "aviso": AVISO,
    }
    criado = (await cliente_admin.post(BACKUP)).json()
    r = await cliente_admin.get(BACKUP)
    assert r.status_code == 200
    dados = r.json()
    assert dados["aviso"] == AVISO and dados["ultimo_erro"] is None
    assert dados["ultimo_em"] is not None and dados["ultimo_tamanho"] == criado["tamanho"]
    assert [c["nome"] for c in dados["copias"]] == [criado["nome"]]
    assert set(dados["copias"][0]) == {"nome", "tipo", "criado_em", "tamanho"}


async def test_get_backup_so_admin(
    cliente: httpx.AsyncClient, cliente_visualizador: httpx.AsyncClient
) -> None:
    assert (await cliente_visualizador.get(BACKUP)).status_code == 403


async def test_get_backup_sem_sessao_401(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get(BACKUP)).status_code == 401


async def test_post_backup_so_admin_com_csrf_e_audita(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    sem_csrf = await cliente_admin.post(BACKUP, headers={"X-CSRF": "errado"})
    assert sem_csrf.status_code == 403
    r = await cliente_admin.post(BACKUP)
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["tipo"] == "manual" and corpo["tamanho"] > 0
    assert corpo["nome"].endswith("-manual.tar.gz")
    a = (await auditorias(app))[-1]
    assert (a.acao, a.alvo, a.depois) == ("backup.criar", corpo["nome"], {"tipo": "manual"})


async def test_post_backup_visualizador_403(cliente_visualizador: httpx.AsyncClient) -> None:
    assert (await cliente_visualizador.post(BACKUP)).status_code == 403


async def test_post_backup_limitado_por_taxa(cliente_admin: httpx.AsyncClient) -> None:
    codigos = [(await cliente_admin.post(BACKUP)).status_code for _ in range(11)]
    assert codigos[:10] == [201] * 10 and codigos[10] == 429


async def test_post_backup_erro_generico_sem_detalhe(
    app: FastAPI, cliente_admin: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def falha(_tipo: str) -> None:
        raise ErroBackup("/dados/interno.db")

    monkeypatch.setattr(app.state.backup, "criar", falha)
    r = await cliente_admin.post(BACKUP)
    assert r.status_code == 500
    assert r.json() == {"detail": "Não foi possível fazer o backup."}


async def test_banco_restaurado_com_outra_chave_de_credenciais_sobe_e_marca_credencial_ilegivel(
    app: FastAPI, cliente_admin: httpx.AsyncClient, settings: Settings, tmp_path: Path
) -> None:
    await subrede(cliente_admin)
    fonte = await criar_fonte(cliente_admin)
    assert fonte["credencial_ilegivel"] is False
    r = await cliente_admin.patch(
        "/api/v1/config/telegram", json={"token": TOKEN, "chats": ["-100123"]}
    )
    assert r.status_code == 200 and r.json()["token_ilegivel"] is False

    # o banco de produção tem a revisão do Alembic; o create_all dos testes não
    banco_a = Path(settings.banco_url.removeprefix("sqlite+aiosqlite:///"))
    con = sqlite3.connect(banco_a)
    con.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
    con.execute("INSERT INTO alembic_version VALUES ('0005')")
    con.commit()
    con.close()
    nome = (await cliente_admin.post(BACKUP)).json()["nome"]

    # outra máquina: restaura o arquivo com outra SENTINELA_CHAVE_CREDENCIAIS
    pasta = tmp_path / "outra"
    pasta.mkdir()
    banco_b = pasta / "sentinela.db"
    restaurar_backup(banco_a.parent / "backups" / nome, banco_b, AGORA, "0.4.0")
    settings_b = Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{banco_b}",
        chave_sessao="chave-de-teste-nao-secreta",
        chave_credenciais=secrets.token_hex(32),
    )
    relogio = RelogioFalso()
    app_b = criar_app(settings_b, relogio=relogio, iniciar_monitor=True)
    async with app_b.router.lifespan_context(app_b):
        transporte = httpx.ASGITransport(app=app_b)
        async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as c:
            login = await c.post(
                "/api/v1/auth/login", json={"login": "admin-teste", "senha": SENHA_TESTE}
            )
            assert login.status_code == 204
            fontes = await c.get("/api/v1/fontes")
            assert fontes.status_code == 200
            assert [f["credencial_ilegivel"] for f in fontes.json()] == [True]
            assert fontes.json()[0]["credencial_definida"] is True
            tele = await c.get("/api/v1/config/telegram")
            assert tele.status_code == 200
            assert tele.json()["token_definido"] is True and tele.json()["token_ilegivel"] is True
            # os laços rodam a primeira volta (coleta com credencial ilegível, despachante)
            await relogio.avancar(120)
            for _ in range(100):
                await asyncio.sleep(0.02)
                async with sessoes(app_b)() as db:
                    erro = (await db.execute(select(Fonte.ultimo_erro))).scalar_one()
                if erro:
                    break
            assert erro and "ilegível" in erro
            assert app_b.state.monitor_falhou is False
            assert [t.get_name() for t in app_b.state.tarefas_monitor if t.done()] == []
            assert "sentinela-backup" in [t.get_name() for t in app_b.state.tarefas_monitor]
            assert TOKEN not in tele.text
