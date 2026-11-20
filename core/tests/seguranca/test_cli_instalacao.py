"""CLI ``codigo-instalacao``: imprime só o código; o arquivo guarda só o hash."""

import json
import secrets
from datetime import UTC, datetime
from pathlib import Path

import pytest

from sentinela import cli
from sentinela.config import Settings
from sentinela.db.modelos import Usuario
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.seguranca import instalacao
from sentinela.seguranca.senhas import gerar_hash
from tests.conftest import criar_esquema


@pytest.fixture
async def settings(tmp_path: Path) -> Settings:
    s = Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'cli.db'}",
        chave_sessao="x",
        chave_credenciais=secrets.token_hex(32),
    )
    await criar_esquema(s.banco_url)
    return s


async def _usuario(settings: Settings) -> None:
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            db.add(Usuario(login="a", hash_senha=gerar_hash("senha-longa-123"), papel="admin"))
            await db.commit()
    finally:
        await motor.dispose()


async def test_cli_imprime_so_o_codigo_e_grava_o_hash(
    settings: Settings, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert await cli.executar(["codigo-instalacao"], settings) == 0
    saida = capsys.readouterr()
    codigo = saida.out.strip()
    assert saida.err == ""
    assert instalacao.normalizar(codigo) is not None and len(codigo) == 9
    bruto = (tmp_path / instalacao.ARQUIVO).read_bytes()
    assert codigo.encode() not in bruto and codigo.replace("-", "").encode() not in bruto
    assert json.loads(bruto)["hash"].startswith("$argon2id$")
    assert await instalacao.conferir(tmp_path, codigo, datetime.now(UTC)) is True


async def test_cli_com_usuario_sai_3_sem_arquivo(
    settings: Settings, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    await _usuario(settings)
    assert await cli.executar(["codigo-instalacao"], settings) == 3
    saida = capsys.readouterr()
    assert saida.out == ""
    assert "já existe um administrador; o primeiro acesso está encerrado" in saida.err
    assert not (tmp_path / instalacao.ARQUIVO).exists()


async def test_cli_de_novo_troca_o_anterior(
    settings: Settings, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert await cli.executar(["codigo-instalacao"], settings) == 0
    velho = capsys.readouterr().out.strip()
    assert await cli.executar(["codigo-instalacao"], settings) == 0
    novo = capsys.readouterr().out.strip()
    agora = datetime.now(UTC)
    assert velho != novo
    assert await instalacao.conferir(tmp_path, velho, agora) is False
    assert await instalacao.conferir(tmp_path, novo, agora) is True
