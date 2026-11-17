import subprocess
import sys
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import Connection, Engine, create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

NUCLEO = Path(__file__).resolve().parents[2]


def _alembic(arquivo: Path, *args: str) -> None:
    r = subprocess.run(  # noqa: S603
        [sys.executable, "-m", "alembic", "-x", f"url=sqlite+aiosqlite:///{arquivo}", *args],
        cwd=NUCLEO,
        capture_output=True,
        text=True,
        check=False,
    )
    assert r.returncode == 0, r.stderr


@pytest.fixture
def banco(tmp_path: Path) -> Iterator[tuple[Path, Engine]]:
    arquivo = tmp_path / "mig.db"
    _alembic(arquivo, "upgrade", "head")
    motor = create_engine(f"sqlite:///{arquivo}")
    with motor.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO classe (id, slug, nome, cor, icone, intervalo_s, critica, ordem) "
                "VALUES (1, 'x', 'X', '#000000', 'i', 30, 0, 0)"
            )
        )
    yield arquivo, motor
    motor.dispose()


def _agora() -> str:
    return datetime.now(UTC).replace(tzinfo=None).isoformat(sep=" ")


def _equip(conn: Connection, ip: str, checagem: str, id_: str) -> None:
    conn.execute(
        text(
            "INSERT INTO equipamento (id, nome, ip, classe_id, classe_origem, checagem, estado, "
            "estado_desde, pausado, criado_em) VALUES (:id, 'n', :ip, 1, 'manual', :c, "
            "'desconhecido', :t, 0, :t)"
        ),
        {"id": id_, "ip": ip, "c": checagem, "t": _agora()},
    )


def _fonte(conn: Connection, id_: str, tipo: str = "mikrotik", intervalo: int = 600) -> None:
    conn.execute(
        text(
            "INSERT INTO fonte (id, tipo, nome, host, porta, tls, credencial_cifrada, ativa, "
            "intervalo_s) VALUES (:i, :t, 'n', '10.99.200.1', 8729, 1, :b, 1, :iv)"
        ),
        {"i": id_, "t": tipo, "b": b"x", "iv": intervalo},
    )


def _descoberta(conn: Connection, id_: str, chave: str, status: str = "pendente") -> None:
    conn.execute(
        text(
            "INSERT INTO descoberta (id, chave, ip, sinais, origens, confianca, status, "
            "fora_das_subredes, primeira_vez, ultima_vez) VALUES (:id, :k, '10.99.200.5', "
            "'{}', '[]', 0, :s, 0, :t, :t)"
        ),
        {"id": id_, "k": chave, "s": status, "t": _agora()},
    )


def test_upgrade_cria_tabelas_e_colunas(banco: tuple[Path, Engine]) -> None:
    _, motor = banco
    insp = inspect(motor)
    assert {"fonte", "descoberta", "config"} <= set(insp.get_table_names())
    cols_eq = {c["name"] for c in insp.get_columns("equipamento")}
    assert {"pai_id", "canal"} <= cols_eq
    assert "permite_varredura" in {c["name"] for c in insp.get_columns("sub_rede")}
    with motor.begin() as conn:
        conn.execute(text("INSERT INTO sub_rede (cidr) VALUES ('10.99.200.0/24')"))
        v = conn.execute(text("SELECT permite_varredura FROM sub_rede")).scalar_one()
    assert not v


def test_ip_repetido_permitido_so_para_gravador(banco: tuple[Path, Engine]) -> None:
    _, motor = banco
    with motor.begin() as conn:
        _equip(conn, "10.99.200.2", "gravador", "a")
        _equip(conn, "10.99.200.2", "gravador", "b")
        _equip(conn, "10.99.200.3", "icmp", "c")
    with pytest.raises(IntegrityError), motor.begin() as conn:
        _equip(conn, "10.99.200.3", "icmp", "d")
    with pytest.raises(IntegrityError), motor.begin() as conn:
        _equip(conn, "10.99.200.3", "tcp", "e")


def test_descoberta_chave_unica(banco: tuple[Path, Engine]) -> None:
    _, motor = banco
    with motor.begin() as conn:
        _descoberta(conn, "d1", "02:00:00:00:00:01")
    with pytest.raises(IntegrityError), motor.begin() as conn:
        _descoberta(conn, "d2", "02:00:00:00:00:01")


def test_fonte_tipo_restrito(banco: tuple[Path, Engine]) -> None:
    _, motor = banco
    with pytest.raises(IntegrityError), motor.begin() as conn:
        _fonte(conn, "fx", "ftp")
    with motor.begin() as conn:
        for i, tipo in enumerate(["mikrotik", "snmp", "hikvision", "dahua", "simulada"]):
            _fonte(conn, f"f{i}", tipo)


def test_fonte_intervalo_restrito(banco: tuple[Path, Engine]) -> None:
    _, motor = banco
    for i, iv in enumerate([299, 3601]):
        with pytest.raises(IntegrityError), motor.begin() as conn:
            _fonte(conn, f"x{i}", "snmp", iv)
    with motor.begin() as conn:
        _fonte(conn, "ok1", "snmp", 300)
        _fonte(conn, "ok2", "snmp", 3600)


def test_descoberta_status_restrito(banco: tuple[Path, Engine]) -> None:
    _, motor = banco
    with motor.begin() as conn:
        for i, st in enumerate(["pendente", "aprovada", "ignorada"]):
            _descoberta(conn, f"d{i}", f"k{i}", st)
    with pytest.raises(IntegrityError), motor.begin() as conn:
        _descoberta(conn, "dx", "kx", "outro")


def test_downgrade_volta_ao_0001_sem_perder_equipamentos(banco: tuple[Path, Engine]) -> None:
    arquivo, motor = banco
    with motor.begin() as conn:
        for i in range(3):
            _equip(conn, f"10.99.200.{i + 10}", "icmp", f"e{i}")
    motor.dispose()
    _alembic(arquivo, "downgrade", "0001")
    novo = create_engine(f"sqlite:///{arquivo}")
    try:
        insp = inspect(novo)
        assert not {"fonte", "descoberta", "config"} & set(insp.get_table_names())
        assert "pai_id" not in {c["name"] for c in insp.get_columns("equipamento")}
        assert "permite_varredura" not in {c["name"] for c in insp.get_columns("sub_rede")}
        with novo.connect() as conn:
            assert conn.execute(text("SELECT count(*) FROM equipamento")).scalar_one() == 3
        with pytest.raises(IntegrityError), novo.begin() as conn:
            _equip(conn, "10.99.200.10", "icmp", "dup")
    finally:
        novo.dispose()


def test_historico_sobrevive_ao_upgrade_e_ao_downgrade(tmp_path: Path) -> None:
    arquivo = tmp_path / "hist.db"
    _alembic(arquivo, "upgrade", "0001")
    motor = create_engine(f"sqlite:///{arquivo}")
    with motor.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO classe (id, slug, nome, cor, icone, intervalo_s, critica, ordem) "
                "VALUES (1, 'x', 'X', '#000000', 'i', 30, 0, 0)"
            )
        )
        _equip(conn, "10.99.200.20", "icmp", "e1")
        conn.execute(
            text(
                "INSERT INTO evento (equipamento_id, de, para, em) "
                "VALUES ('e1', 'online', 'offline', :t)"
            ),
            {"t": _agora()},
        )
        conn.execute(
            text("INSERT INTO amostra (equipamento_id, ts, ok) VALUES ('e1', :t, 1)"),
            {"t": _agora()},
        )
    motor.dispose()
    for destino in ("head", "0001"):
        _alembic(arquivo, "upgrade" if destino == "head" else "downgrade", destino)
        novo = create_engine(f"sqlite:///{arquivo}")
        try:
            with novo.connect() as conn:
                assert conn.execute(text("SELECT count(*) FROM evento")).scalar_one() == 1
                assert conn.execute(text("SELECT count(*) FROM amostra")).scalar_one() == 1
        finally:
            novo.dispose()
