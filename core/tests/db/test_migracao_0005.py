"""Migração 0005: colunas de TOTP em `usuario` e tabela `codigo_recuperacao`."""

import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

NUCLEO = Path(__file__).resolve().parents[2]
T = "2026-11-18 12:00:00"
USUARIO = (
    "INSERT INTO usuario (id, login, hash_senha, papel, falhas) VALUES ({id}, 'u{id}', 'h',"
    " 'admin', 0)"
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


def _executar(arquivo: Path, sql: str, **p: object) -> None:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        with motor.begin() as conn:
            conn.execute(text(sql), p)
    finally:
        motor.dispose()


def _executar_com_fk(arquivo: Path, sql: str) -> None:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        with motor.connect() as conn:
            conn.exec_driver_sql("PRAGMA foreign_keys=ON")
            conn.execute(text(sql))
            conn.commit()
    finally:
        motor.dispose()


def _estrutura(arquivo: Path) -> tuple[set[str], dict[str, set[str]], list[list[str | None]]]:
    motor = create_engine(f"sqlite:///{arquivo}")
    try:
        i = inspect(motor)
        tabelas = set(i.get_table_names())
        colunas = {t: {c["name"] for c in i.get_columns(t)} for t in tabelas}
        indices = (
            [ix["column_names"] for ix in i.get_indexes("codigo_recuperacao")]
            if "codigo_recuperacao" in tabelas
            else []
        )
        return tabelas, colunas, indices
    finally:
        motor.dispose()


def test_upgrade_de_0004_com_usuarios_existentes_totp_nulo(tmp_path: Path) -> None:
    banco = tmp_path / "m5.db"
    _alembic(banco, "upgrade", "0004")
    _executar(banco, USUARIO.format(id=1))
    _alembic(banco, "upgrade", "0005")
    assert _consultar(banco, "SELECT login, totp_cifrado, totp_ultimo_contador FROM usuario") == [
        ("u1", None, None)
    ]


def test_upgrade_cria_codigo_recuperacao_com_indice(tmp_path: Path) -> None:
    banco = tmp_path / "m5.db"
    _alembic(banco, "upgrade", "head")
    tabelas, colunas, indices = _estrutura(banco)
    assert "codigo_recuperacao" in tabelas
    assert colunas["codigo_recuperacao"] == {
        "id",
        "usuario_id",
        "hash_codigo",
        "criado_em",
        "usado_em",
    }
    assert ["usuario_id"] in indices


def test_codigo_recuperacao_some_ao_apagar_usuario(tmp_path: Path) -> None:
    banco = tmp_path / "m5.db"
    _alembic(banco, "upgrade", "head")
    _executar(banco, USUARIO.format(id=1))
    _executar(banco, USUARIO.format(id=2))
    for uid in (1, 2):
        _executar(
            banco,
            "INSERT INTO codigo_recuperacao (usuario_id, hash_codigo, criado_em)"
            " VALUES (:u, 'h', :t)",
            u=uid,
            t=T,
        )
    _executar_com_fk(banco, "DELETE FROM usuario WHERE id = 1")
    assert _consultar(banco, "SELECT usuario_id FROM codigo_recuperacao") == [(2,)]


def test_downgrade_remove_colunas_e_tabela_e_a_chave_seguranca_do_config(tmp_path: Path) -> None:
    banco = tmp_path / "m5.db"
    _alembic(banco, "upgrade", "head")
    _executar(banco, USUARIO.format(id=1))
    _executar(
        banco,
        "UPDATE usuario SET totp_cifrado = 'x', totp_ultimo_contador = 5 WHERE id = 1",
    )
    for chave in ("seguranca", "outra"):
        _executar(banco, "INSERT INTO config (chave, valor) VALUES (:c, '1')", c=chave)
    _alembic(banco, "downgrade", "0004")
    tabelas, colunas, _ = _estrutura(banco)
    assert "codigo_recuperacao" not in tabelas
    assert not {"totp_cifrado", "totp_ultimo_contador"} & colunas["usuario"]
    assert {"usuario", "alerta", "parede", "config"} <= tabelas
    assert _consultar(banco, "SELECT login, papel FROM usuario") == [("u1", "admin")]
    assert _consultar(banco, "SELECT chave FROM config") == [("outra",)]
    _alembic(banco, "upgrade", "head")
    assert _consultar(banco, "SELECT totp_cifrado FROM usuario") == [(None,)]


def _popular_vinculos(banco: Path) -> None:
    _executar(banco, USUARIO.format(id=1))
    _executar(
        banco,
        "INSERT INTO sessao (jti, usuario_id, expira_em, revogada) VALUES ('j1', 1, :t, 0)",
        t=T,
    )
    _executar(
        banco,
        "INSERT INTO auditoria (usuario_id, acao, em) VALUES (1, 'x', :t)",
        t=T,
    )
    _executar(
        banco,
        "INSERT INTO alerta (tipo, quedas, afetados, voltaram, aberto_em, breve, silenciado,"
        " envio, envio_tentativas, enviado_para, telegram_msgs, reconhecido_por) VALUES"
        " ('queda', '[]', '[]', '[]', :t, 0, 0, 'pendente', 0, '[]', '{}', 1)",
        t=T,
    )
    _executar(
        banco,
        "INSERT INTO classe (id, slug, nome, cor, icone, intervalo_s, critica, ordem)"
        " VALUES (9, 'c9', 'c', '#000000', 'i', 30, 0, 0)",
    )
    _executar(
        banco,
        "INSERT INTO silencio (tipo, alvo_tipo, classe_id, inicio, fim, pausados, criado_por)"
        " VALUES ('silencio', 'classe', 9, :t, '2026-11-18 13:00:00', '[]', 1)",
        t=T,
    )


def _vinculos(banco: Path) -> list[object]:
    return [
        _consultar(banco, "SELECT usuario_id FROM sessao"),
        _consultar(banco, "SELECT usuario_id FROM auditoria"),
        _consultar(banco, "SELECT reconhecido_por FROM alerta"),
        _consultar(banco, "SELECT criado_por FROM silencio"),
    ]


ESPERADO = [[(1,)], [(1,)], [(1,)], [(1,)]]


def test_downgrade_preserva_sessoes_e_vinculos_ao_usuario(tmp_path: Path) -> None:
    banco = tmp_path / "m5.db"
    _alembic(banco, "upgrade", "head")
    _popular_vinculos(banco)
    _alembic(banco, "downgrade", "0004")
    assert _vinculos(banco) == ESPERADO
    assert _consultar(banco, "PRAGMA foreign_key_check") == []


def test_upgrade_preserva_sessoes_e_vinculos_ao_usuario(tmp_path: Path) -> None:
    banco = tmp_path / "m5.db"
    _alembic(banco, "upgrade", "0004")
    _popular_vinculos(banco)
    _alembic(banco, "upgrade", "0005")
    assert _vinculos(banco) == ESPERADO
