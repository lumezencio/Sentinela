"""Migração 0003: índices de ``descoberta(ip)`` e ``descoberta(status)``; reversível."""

import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

NUCLEO = Path(__file__).resolve().parents[2]
INDICES = {"ix_descoberta_ip", "ix_descoberta_status"}


def _alembic(arquivo: Path, *args: str) -> None:
    r = subprocess.run(  # noqa: S603
        [sys.executable, "-m", "alembic", "-x", f"url=sqlite+aiosqlite:///{arquivo}", *args],
        cwd=NUCLEO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert r.returncode == 0, r.stderr


def _indices(arquivo: Path) -> set[str]:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        return {i["name"] for i in inspect(motor).get_indexes("descoberta") if i["name"]}
    finally:
        motor.dispose()


def test_upgrade_cria_indices_e_downgrade_remove_sem_perder_descobertas(tmp_path: Path) -> None:
    arquivo = tmp_path / "mig3.db"
    _alembic(arquivo, "upgrade", "0002")
    assert not INDICES & _indices(arquivo)
    motor = create_engine(f"sqlite:///{arquivo}")
    agora = datetime.now(UTC).replace(tzinfo=None).isoformat(sep=" ")
    with motor.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO descoberta (id, chave, ip, sinais, origens, confianca, status, "
                "fora_das_subredes, primeira_vez, ultima_vez) VALUES ('d1', 'k1', "
                "'10.99.200.5', '{}', '[]', 0, 'pendente', 0, :t, :t)"
            ),
            {"t": agora},
        )
    motor.dispose()
    _alembic(arquivo, "upgrade", "0003")
    assert INDICES <= _indices(arquivo)
    _alembic(arquivo, "downgrade", "0002")
    assert not INDICES & _indices(arquivo)
    _alembic(arquivo, "upgrade", "head")
    assert INDICES <= _indices(arquivo)
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        with motor.connect() as conn:
            assert conn.execute(text("SELECT count(*) FROM descoberta")).scalar_one() == 1
    finally:
        motor.dispose()
