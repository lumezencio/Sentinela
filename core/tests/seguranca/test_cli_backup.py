"""CLI: backup-criar, backup-verificar e restaurar."""

import os
import secrets
import socket
import sqlite3
import tarfile
from pathlib import Path

import pytest

from sentinela import cli
from sentinela.backup import porta
from sentinela.config import Settings
from tests.backup.apoio import contar, criar_banco, montar_tar


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'sentinela.db'}",
        chave_sessao="x",
        chave_credenciais=secrets.token_hex(32),
    )


@pytest.fixture
def banco(tmp_path: Path) -> Path:
    return criar_banco(tmp_path / "sentinela.db")


@pytest.fixture
def porta_livre(monkeypatch: pytest.MonkeyPatch) -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        porta = int(s.getsockname()[1])
    monkeypatch.setattr(cli, "PORTA_CORE", porta)
    return porta


async def test_cli_backup_criar_imprime_so_o_nome_e_avisa_do_env(
    settings: Settings, banco: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert await cli.executar(["backup-criar"], settings) == 0
    saida = capsys.readouterr()
    nome = saida.out.strip()
    assert nome.startswith("sentinela-") and nome.endswith("-manual.tar.gz")
    assert (banco.parent / "backups" / nome).is_file()
    assert "não inclui o arquivo .env" in saida.err
    assert await cli.executar(["backup-criar", "--origem", "atualizacao"], settings) == 0
    assert capsys.readouterr().out.strip().endswith("-atualizacao.tar.gz")


async def test_cli_backup_verificar_arquivo_valido(
    settings: Settings, banco: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    await cli.executar(["backup-criar"], settings)
    nome = capsys.readouterr().out.strip()
    assert (
        await cli.executar(["backup-verificar", str(banco.parent / "backups" / nome)], settings)
        == 0
    )


async def test_cli_backup_verificar_arquivo_corrompido_sai_1(
    settings: Settings, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    ruim = tmp_path / "ruim.tar.gz"
    ruim.write_bytes(b"lixo /dados/segredo")
    assert await cli.executar(["backup-verificar", str(ruim)], settings) == 1
    erro = capsys.readouterr().err
    assert "backup inválido" in erro.lower() and "segredo" not in erro and "Traceback" not in erro
    hostil = montar_tar(tmp_path / "h.tar.gz", [("../x", b"x", None)])
    assert await cli.executar(["backup-verificar", str(hostil)], settings) == 1


async def test_cli_restaurar_recusa_com_core_no_ar(
    settings: Settings,
    banco: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await cli.executar(["backup-criar"], settings)
    nome = capsys.readouterr().out.strip()
    with socket.socket() as ouvinte:
        ouvinte.bind(("127.0.0.1", 0))
        ouvinte.listen()
        monkeypatch.setattr(cli, "PORTA_CORE", ouvinte.getsockname()[1])
        codigo = await cli.executar(["restaurar", str(banco.parent / "backups" / nome)], settings)
    assert codigo == 1
    assert "core está no ar" in capsys.readouterr().err
    assert contar(banco) == 50  # nada mudou
    assert not list((banco.parent / "backups").glob("*pre-restore*"))


async def test_cli_restaurar_com_core_parado(
    settings: Settings,
    banco: Path,
    capsys: pytest.CaptureFixture[str],
    porta_livre: int,
) -> None:
    await cli.executar(["backup-criar"], settings)
    nome = capsys.readouterr().out.strip()
    # estraga o banco atual: depois de restaurar volta a ter 50 linhas
    con = sqlite3.connect(banco)
    con.execute("DELETE FROM dado")
    con.commit()
    con.close()
    assert contar(banco) == 0
    assert await cli.executar(["restaurar", str(banco.parent / "backups" / nome)], settings) == 0
    saida = capsys.readouterr()
    assert saida.out.strip().endswith("-pre-restore.tar.gz")
    assert contar(banco) == 50
    with tarfile.open(banco.parent / "backups" / saida.out.strip(), "r:gz") as tar:
        assert sorted(tar.getnames()) == ["manifesto.json", "sentinela.db"]


async def test_cli_restaurar_arquivo_hostil_nao_toca_no_banco(
    settings: Settings,
    banco: Path,
    tmp_path: Path,
    porta_livre: int,
    capsys: pytest.CaptureFixture[str],
) -> None:
    hostil = montar_tar(tmp_path / "h.tar.gz", [("/etc/x", b"x", None)])
    assert await cli.executar(["restaurar", str(hostil)], settings) == 1
    assert contar(banco) == 50
    assert not [p for p in os.listdir(tmp_path) if p.endswith(".novo")]


async def test_cli_sem_alembic_ini_sai_1_sem_traceback(
    settings: Settings,
    banco: Path,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await cli.executar(["backup-criar"], settings)
    nome = capsys.readouterr().out.strip()
    monkeypatch.setenv("SENTINELA_ALEMBIC_INI", str(tmp_path / "nao-existe.ini"))
    assert (
        await cli.executar(["backup-verificar", str(banco.parent / "backups" / nome)], settings)
        == 1
    )
    erro = capsys.readouterr().err
    assert "versão do esquema" in erro and "Traceback" not in erro and "nao-existe" not in erro


async def test_cli_restaurar_recusa_quando_o_core_responde_pelo_nome_do_servico(
    settings: Settings,
    banco: Path,
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``compose run``: o loopback do contêiner avulso não é o do core; vale o nome ``core``."""
    await cli.executar(["backup-criar"], settings)
    nome = capsys.readouterr().out.strip()
    with socket.socket() as ouvinte:
        ouvinte.bind(("127.0.0.1", 0))
        ouvinte.listen()
        monkeypatch.setattr(cli, "PORTA_CORE", ouvinte.getsockname()[1])
        # só o nome do serviço (aqui "localhost") chega ao core; o 127.0.0.1 fica de fora.
        # Nomes só são resolvidos dentro de um contêiner (fora dele seria LLMNR/mDNS).
        monkeypatch.setattr(porta, "em_conteiner", lambda: True)
        monkeypatch.setattr(cli, "HOSTS_CORE", ("host-que-nao-existe.invalid", "localhost"))
        codigo = await cli.executar(["restaurar", str(banco.parent / "backups" / nome)], settings)
    assert codigo == 1
    assert "core está no ar" in capsys.readouterr().err
    assert contar(banco) == 50
    assert not list((banco.parent / "backups").glob("*pre-restore*"))


def test_cli_hosts_do_core_sao_loopback_e_o_servico_do_compose() -> None:
    assert cli.HOSTS_CORE == ("127.0.0.1", "core")
    compose = (Path(__file__).resolve().parents[3] / "docker-compose.yml").read_text(
        encoding="utf-8"
    )
    assert "\n  core:\n" in compose  # o nome sondado é mesmo o do serviço
