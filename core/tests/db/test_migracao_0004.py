"""Migração 0004: alertas, silêncios, telões; downgrade converte `inalcancavel` em offline."""

import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

NUCLEO = Path(__file__).resolve().parents[2]
NOVAS = {"alerta", "silencio", "parede", "parede_pedido"}
T = "2026-11-18 12:00:00"
ALERTA = (
    "INSERT INTO alerta (tipo, quedas, afetados, voltaram, aberto_em, breve, silenciado,"
    " envio, envio_tentativas, enviado_para, telegram_msgs) VALUES ('{tipo}', '[]', '[]',"
    " '[]', :t, 0, 0, '{envio}', 0, '[]', '{{}}')"
)
CLASSE = (
    "INSERT INTO classe (id, slug, nome, cor, icone, intervalo_s, critica, ordem)"
    " VALUES ({id}, 'c{id}', 'c', '#000000', 'i', 30, 0, 0)"
)
SILENCIO = (
    "INSERT INTO silencio (tipo, alvo_tipo, {col}, inicio, fim, pausados)"
    " VALUES ('silencio', '{alvo}', {val}, :t, '{fim}', '[]')"
)


def _alembic(arquivo: Path, *args: str) -> None:
    r = subprocess.run(  # noqa: S603
        [sys.executable, "-m", "alembic", "-x", f"url=sqlite+aiosqlite:///{arquivo}", *args],
        cwd=NUCLEO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert r.returncode == 0, r.stderr


def _tabelas(arquivo: Path) -> set[str]:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        return set(inspect(motor).get_table_names())
    finally:
        motor.dispose()


def _inserir(arquivo: Path, sql: str, **p: object) -> None:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        with motor.begin() as conn:
            conn.execute(text(sql), p)
    finally:
        motor.dispose()


@pytest.fixture
def banco(tmp_path: Path) -> Path:
    arquivo = tmp_path / "mig4.db"
    _alembic(arquivo, "upgrade", "head")
    return arquivo


def test_upgrade_cria_tabelas_e_checks(banco: Path) -> None:
    assert NOVAS <= _tabelas(banco)
    _inserir(banco, ALERTA.format(tipo="queda", envio="pendente"), t=T)  # linha válida passa
    with pytest.raises(IntegrityError):
        _inserir(banco, ALERTA.format(tipo="xis", envio="pendente"), t=T)
    with pytest.raises(IntegrityError):
        _inserir(banco, ALERTA.format(tipo="queda", envio="xis"), t=T)
    with pytest.raises(IntegrityError):
        _inserir(banco, "INSERT INTO parede (nome, modo, criado_em) VALUES ('t', 'ftp', :t)", t=T)
    _inserir(banco, CLASSE.format(id=900))
    with pytest.raises(IntegrityError):
        _inserir(
            banco,
            SILENCIO.format(col="classe_id", alvo="ceu", val=900, fim="2026-11-18 13:00:00"),
            t=T,
        )


def test_silencio_alvo_exige_coluna_certa(banco: Path) -> None:
    _inserir(banco, CLASSE.format(id=900))
    fim = "2026-11-18 13:00:00"
    _inserir(banco, SILENCIO.format(col="classe_id", alvo="classe", val=900, fim=fim), t=T)
    with pytest.raises(IntegrityError):  # classe com equipamento_id
        _inserir(
            banco, SILENCIO.format(col="equipamento_id", alvo="classe", val="'e1'", fim=fim), t=T
        )
    with pytest.raises(IntegrityError):  # fim <= inicio
        _inserir(banco, SILENCIO.format(col="classe_id", alvo="classe", val=900, fim=T), t=T)


def test_parede_token_hash_nulo_repetido_permitido(banco: Path) -> None:
    for _ in range(2):
        _inserir(banco, "INSERT INTO parede (nome, modo, criado_em) VALUES ('t', 'https', :t)", t=T)
    com_hash = (
        "INSERT INTO parede (nome, modo, token_hash, criado_em) VALUES ('t', 'https', 'h', :t)"
    )
    _inserir(banco, com_hash, t=T)
    with pytest.raises(IntegrityError):
        _inserir(banco, com_hash, t=T)


def test_downgrade_converte_inalcancavel_em_offline(banco: Path) -> None:
    _inserir(banco, CLASSE.format(id=901))
    _inserir(
        banco,
        "INSERT INTO equipamento (id, nome, ip, classe_id, classe_origem, checagem, estado,"
        " estado_desde, pausado, criado_em) VALUES ('e1', 'n', '10.99.0.1', 901, 'manual', 'icmp',"
        " 'inalcancavel', :t, 0, :t)",
        t=T,
    )
    _inserir(
        banco,
        "INSERT INTO evento (equipamento_id, de, para, em) VALUES ('e1', 'online',"
        " 'inalcancavel', :t)",
        t=T,
    )
    for chave in ("telegram", "telegram_status", "paredes_http", "outra"):
        _inserir(banco, "INSERT INTO config (chave, valor) VALUES (:c, '1')", c=chave)
    _alembic(banco, "downgrade", "0003")
    assert not NOVAS & _tabelas(banco)
    motor = create_engine(f"sqlite:///{banco}")
    try:
        with motor.connect() as conn:
            assert conn.execute(text("SELECT estado FROM equipamento")).scalars().all() == [
                "offline"
            ]
            assert conn.execute(text("SELECT para FROM evento")).scalars().all() == ["offline"]
            assert conn.execute(text("SELECT chave FROM config")).scalars().all() == ["outra"]
    finally:
        motor.dispose()
    _alembic(banco, "upgrade", "head")
    assert NOVAS <= _tabelas(banco)
