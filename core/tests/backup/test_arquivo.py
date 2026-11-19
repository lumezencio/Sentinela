import json
import os
import shutil
import sqlite3
import stat
import tarfile
import threading
from datetime import timedelta
from pathlib import Path

import pytest

from sentinela.backup import arquivo as arq
from sentinela.backup.arquivo import (
    RETER,
    ErroBackup,
    criar_backup,
    ler_manifesto,
    listar,
    restaurar_backup,
    rotacionar,
    verificar_backup,
)
from tests.backup.apoio import AGORA, CONHECIDAS, contar, criar_banco, manifesto_json, montar_tar


@pytest.fixture
def banco(tmp_path: Path) -> Path:
    return criar_banco(tmp_path / "sentinela.db")


@pytest.fixture
def destino(tmp_path: Path) -> Path:
    return tmp_path / "backups"


def test_backup_tem_manifesto_e_sha256_do_banco(banco: Path, destino: Path) -> None:
    caminho = criar_backup(banco, destino, "manual", AGORA, "0.4.0")
    assert caminho.name == "sentinela-20261118T120000Z-manual.tar.gz"
    with tarfile.open(caminho, "r:gz") as tar:
        assert sorted(tar.getnames()) == ["manifesto.json", "sentinela.db"]
    m = ler_manifesto(caminho)
    assert (m.formato, m.sentinela, m.esquema, m.criado_em) == (1, "0.4.0", "0005", AGORA)
    assert len(m.sha256) == 64 and m.tamanho_db > 0
    assert verificar_backup(caminho, CONHECIDAS) == m


def test_permissoes_0600_arquivo_e_0700_diretorio(banco: Path, destino: Path) -> None:
    caminho = criar_backup(banco, destino, "diario", AGORA, "0.4.0")
    if os.name != "nt":
        assert stat.S_IMODE(caminho.stat().st_mode) == 0o600
        assert stat.S_IMODE(destino.stat().st_mode) == 0o700
    assert not [p for p in destino.iterdir() if p.name.startswith(".tmp-")]


def test_backup_com_escritas_concorrentes_e_consistente(banco: Path, destino: Path) -> None:
    parar = threading.Event()

    def escrever() -> None:
        con = sqlite3.connect(banco, timeout=30)
        con.execute("PRAGMA journal_mode=WAL")
        while not parar.is_set():
            con.execute("INSERT INTO dado (texto) VALUES ('x')")
            con.commit()
        con.close()

    t = threading.Thread(target=escrever)
    t.start()
    try:
        caminhos = [
            criar_backup(banco, destino, "manual", AGORA + timedelta(seconds=i), "0.4.0")
            for i in range(3)
        ]
    finally:
        parar.set()
        t.join()
    for c in caminhos:
        verificar_backup(c, CONHECIDAS)


def test_verificar_aceita_esquema_mais_antigo_e_recusa_mais_novo(
    banco: Path, destino: Path
) -> None:
    caminho = criar_backup(banco, destino, "manual", AGORA, "0.4.0")
    assert verificar_backup(caminho, CONHECIDAS).esquema == "0005"
    # código mais antigo que o backup: recusa
    with pytest.raises(ErroBackup, match="versão mais nova"):
        verificar_backup(caminho, frozenset({"0001", "0002", "0003", "0004"}))
    # backup de esquema antigo, código mais novo: aceita
    antigo = criar_banco(banco.with_name("antigo.db"), esquema="0003")
    c2 = criar_backup(antigo, destino, "diario", AGORA, "0.3.0")
    assert verificar_backup(c2, CONHECIDAS).esquema == "0003"


def _tar_valido(tmp_path: Path, banco: Path, **troca: object) -> Path:
    return montar_tar(
        tmp_path / "x.tar.gz",
        [
            ("manifesto.json", manifesto_json(banco, **troca), None),
            ("sentinela.db", banco.read_bytes(), None),
        ],
    )


def test_tar_artesanal_valido_passa(tmp_path: Path, banco: Path) -> None:
    assert verificar_backup(_tar_valido(tmp_path, banco), CONHECIDAS).esquema == "0005"


def test_sha256_adulterado_recusado(tmp_path: Path, banco: Path) -> None:
    with pytest.raises(ErroBackup):
        verificar_backup(_tar_valido(tmp_path, banco, sha256="0" * 64), CONHECIDAS)


def test_tamanho_declarado_diferente_recusado(tmp_path: Path, banco: Path) -> None:
    tamanho = banco.stat().st_size
    with pytest.raises(ErroBackup):
        verificar_backup(_tar_valido(tmp_path, banco, tamanho_db=tamanho + 1), CONHECIDAS)
    with pytest.raises(ErroBackup):
        verificar_backup(_tar_valido(tmp_path, banco, tamanho_db=tamanho - 1), CONHECIDAS)


def test_esquema_do_manifesto_diferente_do_banco_recusado(tmp_path: Path, banco: Path) -> None:
    with pytest.raises(ErroBackup):
        verificar_backup(_tar_valido(tmp_path, banco, esquema="0002"), CONHECIDAS)


def test_banco_corrompido_recusado(tmp_path: Path, banco: Path) -> None:
    grande = criar_banco(tmp_path / "grande.db", linhas=3000)
    dados = bytearray(grande.read_bytes())
    dados[3 * 4096 : 4 * 4096] = b"\xff" * 4096  # uma página interna destruída
    ruim = tmp_path / "ruim.db"
    ruim.write_bytes(bytes(dados))
    tar = montar_tar(
        tmp_path / "r.tar.gz",
        [("manifesto.json", manifesto_json(ruim), None), ("sentinela.db", ruim.read_bytes(), None)],
    )
    with pytest.raises(ErroBackup):
        verificar_backup(tar, CONHECIDAS)


@pytest.mark.parametrize(
    "membros",
    [
        [("../x", b"x", None)],
        [("/etc/x", b"x", None)],
        [("sentinela.db", b"", b"l:/etc/passwd")],
        [("manifesto.json", b"{}", None), ("sentinela.db", b"x", None), ("extra", b"x", None)],
        [
            ("manifesto.json", b"{}", None),
            ("sentinela.db", b"x", None),
            ("sentinela.db", b"y", None),
        ],
        [("sentinela.db", b"x", None)],
    ],
    ids=["pai", "absoluto", "link", "extra", "dois-db", "sem-manifesto"],
)
def test_tar_com_membro_perigoso_recusado_sem_extrair(
    tmp_path: Path, membros: list[tuple[str, bytes, bytes | None]]
) -> None:
    pasta = tmp_path / "caixa"
    pasta.mkdir()
    tar = montar_tar(pasta / "h.tar.gz", membros)
    antes = {p.name for p in tmp_path.rglob("*")}
    with pytest.raises(ErroBackup):
        verificar_backup(tar, CONHECIDAS)
    with pytest.raises(ErroBackup):
        restaurar_backup(tar, tmp_path / "alvo.db", AGORA, "0.4.0")
    assert {p.name for p in tmp_path.rglob("*")} == antes  # nada extraído, nada sobrou
    assert not (tmp_path / "x").exists()


def test_arquivo_que_nao_e_tar_ou_link_recusado(tmp_path: Path, banco: Path, destino: Path) -> None:
    lixo = tmp_path / "lixo.tar.gz"
    lixo.write_bytes(b"nao e tar")
    with pytest.raises(ErroBackup):
        verificar_backup(lixo, CONHECIDAS)
    real = criar_backup(banco, destino, "manual", AGORA, "0.4.0")
    elo = tmp_path / "elo.tar.gz"
    try:
        elo.symlink_to(real)
    except OSError:
        pytest.skip("sem permissão para criar link simbólico")
    with pytest.raises(ErroBackup):
        verificar_backup(elo, CONHECIDAS)


def test_restaurar_remove_wal_e_shm_do_banco_antigo(
    tmp_path: Path, banco: Path, destino: Path
) -> None:
    copia = criar_backup(banco, destino, "manual", AGORA, "0.4.0")
    alvo = criar_banco(tmp_path / "vivo.db", linhas=3)
    wal = alvo.with_name("vivo.db-wal")
    shm = alvo.with_name("vivo.db-shm")
    wal.write_bytes(b"wal velho")
    shm.write_bytes(b"shm velho")
    restaurar_backup(copia, alvo, AGORA + timedelta(minutes=1), "0.4.0")
    assert not wal.exists() and not shm.exists()
    assert contar(alvo) == 50
    assert not alvo.with_name("vivo.db.novo").exists()


def test_restaurar_faz_pre_restore_do_banco_atual(
    tmp_path: Path, banco: Path, destino: Path
) -> None:
    copia = criar_backup(banco, destino, "manual", AGORA, "0.4.0")
    vivo = criar_banco(tmp_path / "vivo.db", linhas=3)
    pre = restaurar_backup(copia, vivo, AGORA + timedelta(minutes=1), "0.4.0")
    assert pre is not None and pre.name.endswith("-pre-restore.tar.gz")
    assert pre.parent == vivo.parent / "backups"
    assert contar(vivo) == 50
    # o pre-restore guarda o banco que existia antes (3 linhas)
    with tarfile.open(pre, "r:gz") as tar:
        membro = tar.extractfile("sentinela.db")
        assert membro is not None
        (tmp_path / "antes.db").write_bytes(membro.read())
    assert contar(tmp_path / "antes.db") == 3


def test_restaurar_banco_atual_corrompido_guarda_ao_lado(
    tmp_path: Path, banco: Path, destino: Path
) -> None:
    copia = criar_backup(banco, destino, "manual", AGORA, "0.4.0")
    vivo = tmp_path / "vivo.db"
    vivo.write_bytes(b"isto nao e sqlite" * 400)
    pre = restaurar_backup(copia, vivo, AGORA + timedelta(minutes=1), "0.4.0")
    assert pre is not None and pre.read_bytes().startswith(b"isto nao")
    assert contar(vivo) == 50


def test_restaurar_recusa_esquema_mais_novo_sem_tocar_no_banco(
    tmp_path: Path, destino: Path
) -> None:
    futuro = criar_banco(tmp_path / "futuro.db", esquema="9999")
    copia = criar_backup(futuro, destino, "manual", AGORA, "9.9.9")
    vivo = criar_banco(tmp_path / "vivo.db", linhas=3)
    with pytest.raises(ErroBackup, match="versão mais nova"):
        restaurar_backup(copia, vivo, AGORA, "0.4.0")
    assert contar(vivo) == 3
    assert not (tmp_path / "vivo.db.novo").exists()


def test_falha_no_meio_nao_deixa_parcial_nem_rotaciona(
    banco: Path, destino: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    for i in range(RETER["manual"]):
        criar_backup(banco, destino, "manual", AGORA + timedelta(seconds=i), "0.4.0")
    antes = sorted(p.name for p in destino.iterdir())

    def explode(*_a: object, **_k: object) -> None:
        raise OSError("disco falhou")

    monkeypatch.setattr(arq.os, "replace", explode)
    with pytest.raises(ErroBackup) as e:
        criar_backup(banco, destino, "manual", AGORA + timedelta(hours=1), "0.4.0")
    assert "disco" not in str(e.value)
    assert sorted(p.name for p in destino.iterdir()) == antes  # nada parcial, nada apagado


def test_sem_espaco_recusa_e_nada_e_apagado(
    banco: Path, destino: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    criar_backup(banco, destino, "manual", AGORA, "0.4.0")
    antes = sorted(p.name for p in destino.iterdir())
    tamanho = banco.stat().st_size
    pouco = shutil._ntuple_diskusage(10 * tamanho, 9 * tamanho, tamanho)  # livre < 2x o banco
    monkeypatch.setattr(arq.shutil, "disk_usage", lambda _p: pouco)
    with pytest.raises(ErroBackup, match="Sem espaço em disco para o backup."):
        criar_backup(banco, destino, "manual", AGORA + timedelta(hours=1), "0.4.0")
    assert sorted(p.name for p in destino.iterdir()) == antes


def _nomes(tipo: str, n: int) -> list[str]:
    return [f"sentinela-202611{d:02d}T030000Z-{tipo}.tar.gz" for d in range(1, n + 1)]


def test_rotacao_7_diarios_4_semanais_e_5_manuais(destino: Path) -> None:
    destino.mkdir()
    quantidades = (("diario", 12), ("semanal", 7), ("manual", 9), ("atualizacao", 8))
    for tipo, n in (*quantidades, ("pre-restore", 6)):
        for nome in _nomes(tipo, n):
            (destino / nome).write_bytes(b"x")
    apagados = rotacionar(destino)
    restantes = listar(destino)
    for tipo, mantidos in RETER.items():
        assert len([i for i in restantes if i.tipo == tipo]) == mantidos
    # os mais antigos saem primeiro: dos diários ficam os dias 6..12
    assert sorted(i.nome for i in restantes if i.tipo == "diario") == _nomes("diario", 12)[5:]
    assert len(apagados) == (12 - 7) + (7 - 4) + (9 - 5) + (8 - 5) + (6 - 3)


def test_listar_ignora_link_simbolico_e_nomes_estranhos(tmp_path: Path, destino: Path) -> None:
    destino.mkdir()
    ok = destino / "sentinela-20261118T030000Z-diario.tar.gz"
    ok.write_bytes(b"1234")
    (destino / "sentinela-20261118T030000Z-estranho.tar.gz").write_bytes(b"x")
    (destino / "qualquer.tar.gz").write_bytes(b"x")
    (destino / "sentinela-20261118T030000Z-semanal.tar.gz").mkdir()
    alvo = tmp_path / "fora.tar.gz"
    alvo.write_bytes(b"x")
    try:
        (destino / "sentinela-20261117T030000Z-manual.tar.gz").symlink_to(alvo)
    except OSError:
        pass
    itens = listar(destino)
    assert [(i.nome, i.tipo, i.tamanho) for i in itens] == [(ok.name, "diario", 4)]


def test_backup_nunca_inclui_env(banco: Path, destino: Path, tmp_path: Path) -> None:
    (tmp_path / ".env").write_text("SENTINELA_CHAVE_CREDENCIAIS=segredo-fake")
    caminho = criar_backup(banco, destino, "manual", AGORA, "0.4.0")
    with tarfile.open(caminho, "r:gz") as tar:
        assert ".env" not in tar.getnames()
        manifesto = tar.extractfile("manifesto.json")
        assert manifesto is not None
        assert "segredo-fake" not in json.dumps(json.loads(manifesto.read()))
