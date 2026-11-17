import secrets
from collections.abc import Iterator
from pathlib import Path
from typing import Literal

import pytest
from sqlalchemy import select

from sentinela import cli
from sentinela.config import Settings
from sentinela.db.modelos import Usuario
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.seguranca.senhas import gerar_hash_async, verificar
from tests.conftest import criar_esquema

SENHA = "senha-do-admin-longa"


@pytest.fixture
def sem_getpass(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    def _falha(prompt: str = "") -> str:
        raise AssertionError("getpass não deveria ser chamado")

    monkeypatch.setattr("getpass.getpass", _falha)
    yield


async def _usuarios(settings: Settings) -> list[Usuario]:
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            return list((await db.execute(select(Usuario))).scalars())
    finally:
        await motor.dispose()


def _settings(tmp_path: Path, ambiente: Literal["teste", "producao"]) -> Settings:
    return Settings(
        ambiente=ambiente,
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'cli.db'}",
        chave_sessao="x",
        chave_credenciais=secrets.token_hex(32),
    )


async def test_criar_admin_por_variavel_em_teste(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, sem_getpass: None
) -> None:
    settings = _settings(tmp_path, "teste")
    await criar_esquema(settings.banco_url)
    monkeypatch.setenv("SENTINELA_ADMIN_SENHA", SENHA)

    assert await cli.executar(["criar-admin", "--login", "chefe"], settings) == 0
    (u,) = await _usuarios(settings)
    assert (u.login, u.papel) == ("chefe", "admin")
    assert u.hash_senha.startswith("$argon2id$")
    assert verificar(u.hash_senha, SENHA)

    # idempotente: segunda vez falha sem duplicar nem alterar
    assert await cli.executar(["criar-admin", "--login", "chefe"], settings) == 1
    assert len(await _usuarios(settings)) == 1


async def test_producao_ignora_variavel_e_usa_getpass(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = _settings(tmp_path, "producao")
    await criar_esquema(settings.banco_url)
    monkeypatch.setenv("SENTINELA_ADMIN_SENHA", "variavel-nao-deve-valer")
    respostas = iter([SENHA, SENHA])
    monkeypatch.setattr("getpass.getpass", lambda prompt="": next(respostas))

    assert await cli.executar(["criar-admin", "--login", "chefe"], settings) == 0
    (u,) = await _usuarios(settings)
    assert verificar(u.hash_senha, SENHA)


async def test_confirmacao_diferente_falha(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = _settings(tmp_path, "producao")
    await criar_esquema(settings.banco_url)
    respostas = iter([SENHA, SENHA + "x"])
    monkeypatch.setattr("getpass.getpass", lambda prompt="": next(respostas))

    assert await cli.executar(["criar-admin", "--login", "chefe"], settings) == 2
    assert await _usuarios(settings) == []


async def test_senha_curta_falha(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    sem_getpass: None,
    capsys: pytest.CaptureFixture[str],
) -> None:
    settings = _settings(tmp_path, "teste")
    await criar_esquema(settings.banco_url)
    monkeypatch.setenv("SENTINELA_ADMIN_SENHA", "curta")

    assert await cli.executar(["criar-admin", "--login", "chefe"], settings) == 2
    assert await _usuarios(settings) == []
    saida = capsys.readouterr()
    assert "curta" not in saida.out + saida.err


async def test_corrida_entre_dois_criar_admin(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    sem_getpass: None,
    capsys: pytest.CaptureFixture[str],
) -> None:
    settings = _settings(tmp_path, "teste")
    await criar_esquema(settings.banco_url)
    monkeypatch.setenv("SENTINELA_ADMIN_SENHA", SENHA)

    async def _outro_processo_cria_antes(senha: str) -> str:
        # outro criar-admin grava o mesmo login entre a checagem e o INSERT
        motor = criar_motor(settings.banco_url)
        try:
            async with fabrica_sessao(motor)() as db:
                db.add(Usuario(login="chefe", hash_senha="x", papel="admin"))
                await db.commit()
        finally:
            await motor.dispose()
        return await gerar_hash_async(senha)

    monkeypatch.setattr("sentinela.cli.gerar_hash_async", _outro_processo_cria_antes)
    assert await cli.executar(["criar-admin", "--login", "chefe"], settings) == 1
    assert "já existe" in capsys.readouterr().err
    assert len(await _usuarios(settings)) == 1
