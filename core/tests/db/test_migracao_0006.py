"""Migração 0006: aparelho_novo, gateway/linha de base das sub-redes, leitura_uptime."""

import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

NUCLEO = Path(__file__).resolve().parents[2]
T = "2026-11-20 12:00:00"
ALERTA = (
    "INSERT INTO alerta (id, tipo, quedas, afetados, voltaram, aberto_em, breve, silenciado,"
    " envio, envio_tentativas, enviado_para, telegram_msgs{extra}) VALUES"
    " ({id}, '{tipo}', '[]', '[]', '[]', '2026-11-20 12:00:00', 0, 0, 'pendente', 0, '[]',"
    " '{{}}'{valor})"
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


def _consultar(arquivo: Path, sql: str) -> list[tuple[object, ...]]:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        with motor.connect() as conn:
            return [tuple(r) for r in conn.execute(text(sql))]
    finally:
        motor.dispose()


def _executar(arquivo: Path, sql: str, com_fk: bool = False, **p: object) -> None:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        with motor.connect() as conn:
            if com_fk:
                conn.exec_driver_sql("PRAGMA foreign_keys=ON")
            conn.execute(text(sql), p)
            conn.commit()
    finally:
        motor.dispose()


def _indices(arquivo: Path, tabela: str) -> list[list[str | None]]:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        return [i["column_names"] for i in inspect(motor).get_indexes(tabela)]
    finally:
        motor.dispose()


def _alerta(banco: Path, id_: int, tipo: str, descoberta_id: str | None = None) -> None:
    if descoberta_id is None:
        _executar(banco, ALERTA.format(id=id_, tipo=tipo, extra="", valor=""))
    else:
        _executar(
            banco,
            ALERTA.format(id=id_, tipo=tipo, extra=", descoberta_id", valor=f", '{descoberta_id}'"),
        )


def _equipamentos_e_fontes(banco: Path) -> None:
    _executar(
        banco,
        "INSERT INTO classe (id, slug, nome, cor, icone, intervalo_s, critica, ordem)"
        " VALUES (9, 'c9', 'c', '#000000', 'i', 30, 0, 0)",
    )
    for n in (1, 2):
        _executar(
            banco,
            "INSERT INTO equipamento (id, nome, ip, classe_id, classe_origem, checagem, estado,"
            " estado_desde, criado_em, pausado)"
            " VALUES (:id, :id, :ip, 9, 'manual', 'icmp', 'online', :t, :t, 0)",
            id=f"eq{n}",
            ip=f"10.99.0.{n}",
            t=T,
        )
        _executar(
            banco,
            "INSERT INTO fonte (id, tipo, nome, host, porta, tls, credencial_cifrada, ativa,"
            " intervalo_s) VALUES (:id, 'snmp', :id, '10.99.0.9', 161, 0, 'x', 1, 600)",
            id=f"f{n}",
        )


def test_upgrade_de_0005_aceita_aparelho_novo_e_colunas_nulas(tmp_path: Path) -> None:
    banco = tmp_path / "m6.db"
    _alembic(banco, "upgrade", "0005")
    _executar(banco, "INSERT INTO sub_rede (cidr, permite_varredura) VALUES ('192.168.15.0/24', 1)")
    _alerta(banco, 1, "queda")
    _alembic(banco, "upgrade", "0006")
    assert _consultar(
        banco,
        "SELECT cidr, permite_varredura, gateway_ip, ultima_varredura_em, linha_base_em"
        " FROM sub_rede",
    ) == [("192.168.15.0/24", 1, None, None, None)]
    assert _consultar(banco, "SELECT id, tipo, descoberta_id FROM alerta") == [(1, "queda", None)]
    _alerta(banco, 2, "aparelho_novo")
    assert len(_consultar(banco, "SELECT id FROM alerta")) == 2


def test_descoberta_apagada_anula_descoberta_id_do_alerta(tmp_path: Path) -> None:
    banco = tmp_path / "m6.db"
    _alembic(banco, "upgrade", "head")
    _executar(
        banco,
        "INSERT INTO descoberta (id, chave, ip, sinais, confianca, origens, status,"
        " fora_das_subredes, primeira_vez, ultima_vez)"
        " VALUES ('d1', 'k', '10.99.0.5', '{}', 0, '[]', 'pendente', 0, :t, :t)",
        t=T,
    )
    _alerta(banco, 1, "aparelho_novo", "d1")
    _executar(banco, "DELETE FROM descoberta WHERE id = 'd1'", com_fk=True)
    assert _consultar(banco, "SELECT tipo, descoberta_id FROM alerta") == [("aparelho_novo", None)]
    assert ["descoberta_id"] in _indices(banco, "alerta")


def test_leitura_uptime_some_com_a_fonte_ou_o_equipamento(tmp_path: Path) -> None:
    banco = tmp_path / "m6.db"
    _alembic(banco, "upgrade", "head")
    _equipamentos_e_fontes(banco)
    for f, e in (("f1", "eq1"), ("f2", "eq2")):
        _executar(
            banco,
            "INSERT INTO leitura_uptime (fonte_id, equipamento_id, lido_em, uptime_s)"
            " VALUES (:f, :e, :t, 12.5)",
            f=f,
            e=e,
            t=T,
        )
    _executar(banco, "DELETE FROM fonte WHERE id = 'f1'", com_fk=True)
    assert _consultar(banco, "SELECT equipamento_id FROM leitura_uptime") == [("eq2",)]
    _executar(banco, "DELETE FROM equipamento WHERE id = 'eq2'", com_fk=True)
    assert _consultar(banco, "SELECT id FROM leitura_uptime") == []
    assert ["equipamento_id", "lido_em"] in _indices(banco, "leitura_uptime")


def test_downgrade_apaga_aparelho_novo_colunas_tabela_e_ajuste(tmp_path: Path) -> None:
    banco = tmp_path / "m6.db"
    _alembic(banco, "upgrade", "head")
    _executar(
        banco,
        "INSERT INTO sub_rede (cidr, permite_varredura, gateway_ip, linha_base_em)"
        " VALUES ('192.168.15.0/24', 1, '192.168.15.1', :t)",
        t=T,
    )
    _alerta(banco, 1, "queda")
    _alerta(banco, 2, "aparelho_novo")
    _alerta(banco, 3, "instavel")
    for chave in ("varredura_continua_min", "outra"):
        _executar(banco, "INSERT INTO config (chave, valor) VALUES (:c, '1')", c=chave)
    _alembic(banco, "downgrade", "0005")
    motor = create_engine(f"sqlite:///{banco}")
    try:
        i = inspect(motor)
        assert "leitura_uptime" not in i.get_table_names()
        assert {c["name"] for c in i.get_columns("sub_rede")} == {"id", "cidr", "permite_varredura"}
        assert "descoberta_id" not in {c["name"] for c in i.get_columns("alerta")}
    finally:
        motor.dispose()
    assert _consultar(banco, "SELECT id, tipo FROM alerta ORDER BY id") == [
        (1, "queda"),
        (3, "instavel"),
    ]
    assert _consultar(banco, "SELECT cidr, permite_varredura FROM sub_rede") == [
        ("192.168.15.0/24", 1)
    ]
    assert _consultar(banco, "SELECT chave FROM config") == [("outra",)]
    assert _consultar(banco, "PRAGMA foreign_key_check") == []
    # o CHECK antigo voltou: aparelho_novo não entra mais
    with pytest.raises(IntegrityError):
        _alerta(banco, 9, "aparelho_novo")
    _alembic(banco, "upgrade", "head")
