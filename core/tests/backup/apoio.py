"""Apoio dos testes de backup: banco SQLite pequeno e fictício, com ``alembic_version``."""

import hashlib
import io
import json
import sqlite3
import tarfile
from datetime import UTC, datetime
from pathlib import Path

AGORA = datetime(2026, 11, 18, 12, 0, tzinfo=UTC)
CONHECIDAS = frozenset({"0001", "0002", "0003", "0004", "0005"})


def criar_banco(caminho: Path, esquema: str = "0005", linhas: int = 50) -> Path:
    con = sqlite3.connect(caminho)
    con.execute("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
    con.execute("INSERT INTO alembic_version VALUES (?)", (esquema,))
    con.execute("CREATE TABLE dado (id INTEGER PRIMARY KEY, texto TEXT)")
    con.executemany("INSERT INTO dado (texto) VALUES (?)", [(f"linha {i}",) for i in range(linhas)])
    con.commit()
    con.close()
    return caminho


def contar(caminho: Path) -> int:
    con = sqlite3.connect(caminho)
    try:
        return int(con.execute("SELECT count(*) FROM dado").fetchone()[0])
    finally:
        con.close()


def montar_tar(
    destino: Path,
    membros: list[tuple[str, bytes, bytes | None]],
) -> Path:
    """Tar.gz à mão; membro ``(nome, conteúdo, tipo)``, tipo ``b"l:alvo"`` = link simbólico."""
    with tarfile.open(destino, "w:gz") as tar:
        for nome, dados, tipo in membros:
            info = tarfile.TarInfo(nome)
            if tipo is not None and tipo.startswith(b"l:"):
                info.type = tarfile.SYMTYPE
                info.linkname = tipo[2:].decode()
                tar.addfile(info)
            else:
                info.size = len(dados)
                tar.addfile(info, io.BytesIO(dados))
    return destino


def manifesto_json(banco: Path, **troca: object) -> bytes:
    dados = banco.read_bytes()
    base: dict[str, object] = {
        "formato": 1,
        "sentinela": "0.4.0",
        "esquema": "0005",
        "criado_em": AGORA.isoformat(),
        "sha256": hashlib.sha256(dados).hexdigest(),
        "tamanho_db": len(dados),
    }
    return json.dumps(base | troca).encode()
