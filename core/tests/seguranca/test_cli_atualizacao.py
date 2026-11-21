"""CLI ``atualizacao-registrar`` e ``atualizacao-ativa`` (chamadas pelo update.sh)."""

import secrets
from pathlib import Path

import pytest

from sentinela import atualizacao, cli
from sentinela.config import Settings


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'cli.db'}",
        chave_sessao="x",
        chave_credenciais=secrets.token_hex(32),
    )


async def test_cli_registrar_e_ativa_0_e_3(settings: Settings, tmp_path: Path) -> None:
    assert await cli.executar(["atualizacao-ativa"], settings) == 0
    argv = [
        "atualizacao-registrar",
        "--resultado",
        "voltou",
        "--de",
        "0.4.0",
        "--para",
        "0.5.0",
        "--mensagem=-falhou na saúde",
    ]
    assert await cli.executar(argv, settings) == 0
    e = atualizacao.ler(tmp_path)
    assert (e.resultado, e.de, e.para, e.mensagem) == (
        "voltou",
        "0.4.0",
        "0.5.0",
        "-falhou na saúde",
    )
    assert e.ultima_verificacao is not None
    atualizacao.definir_ativo(tmp_path, False)
    assert await cli.executar(["atualizacao-ativa"], settings) == 3
    atualizacao.definir_ativo(tmp_path, True)
    assert await cli.executar(["atualizacao-ativa"], settings) == 0


async def test_cli_agendado(settings: Settings, tmp_path: Path) -> None:
    assert await cli.executar(["atualizacao-registrar", "--agendado"], settings) == 0
    assert atualizacao.ler(tmp_path).agendado is True


async def test_cli_registrar_entradas_invalidas(
    settings: Settings, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    for argv in (
        ["atualizacao-registrar"],
        ["atualizacao-registrar", "--resultado", "voltou", "--de", "1.2"],
        ["atualizacao-registrar", "--agendado", "--resultado", "falhou"],
    ):
        assert await cli.executar(argv, settings) == 2, argv
    assert not (tmp_path / atualizacao.ARQUIVO).exists()
    capsys.readouterr()


async def test_cli_ativa_com_arquivo_corrompido_e_ligada(
    settings: Settings, tmp_path: Path
) -> None:
    (tmp_path / atualizacao.ARQUIVO).write_bytes(b"\x00lixo")
    assert await cli.executar(["atualizacao-ativa"], settings) == 0
