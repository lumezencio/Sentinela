"""Código de instalação: gerado no terminal, guardado só como argon2id, 24 h de validade."""

import json
import os
import stat
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from sentinela.parede.emparelhamento import ALFABETO
from sentinela.seguranca import instalacao

T0 = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)


def test_codigo_tem_8_do_alfabeto_sem_ambiguos() -> None:
    assert instalacao.ALFABETO == ALFABETO
    for _ in range(200):
        codigo = instalacao.gerar_codigo()
        assert len(codigo) == 9 and codigo[4] == "-"
        limpo = codigo.replace("-", "")
        assert len(limpo) == instalacao.TAMANHO == 8
        assert set(limpo) <= set(ALFABETO)
        assert not set(limpo) & set("01ILO")


def test_normalizar_aceita_minusculas_hifen_e_espaco() -> None:
    assert instalacao.normalizar(" ab3k-9mnp ") == "AB3K9MNP"
    assert instalacao.normalizar("ab3k 9mnp") == "AB3K9MNP"
    assert instalacao.normalizar("AB3K9MNP") == "AB3K9MNP"
    for ruim in ("", "AB3K9MN", "AB3K9MNPX", "AB3K9MN0", "AB3K9MNI", "AB3K-9MN!"):
        assert instalacao.normalizar(ruim) is None


async def test_arquivo_guarda_so_argon2id_e_0600(tmp_path: Path) -> None:
    codigo = instalacao.gerar_codigo()
    await instalacao.gravar(tmp_path, codigo, T0)
    arquivo = tmp_path / instalacao.ARQUIVO
    bruto = arquivo.read_bytes()
    assert codigo.encode() not in bruto
    assert codigo.replace("-", "").encode() not in bruto
    dados = json.loads(bruto)
    assert set(dados) == {"hash", "criado_em"}
    assert dados["hash"].startswith("$argon2id$")
    assert datetime.fromisoformat(dados["criado_em"]) == T0
    if sys.platform != "win32":
        assert stat.S_IMODE(arquivo.stat().st_mode) == 0o600
    assert os.listdir(tmp_path) == [instalacao.ARQUIVO]  # sem temporário


async def test_expira_em_24h(tmp_path: Path) -> None:
    assert instalacao.estado(tmp_path, T0) == "ausente"
    await instalacao.gravar(tmp_path, instalacao.gerar_codigo(), T0)
    assert instalacao.estado(tmp_path, T0) == "ativo"
    assert instalacao.estado(tmp_path, T0 + timedelta(hours=23, minutes=59)) == "ativo"
    assert instalacao.estado(tmp_path, T0 + timedelta(hours=24, seconds=1)) == "expirado"


async def test_conferir_errado_ausente_ou_expirado_e_falso(tmp_path: Path) -> None:
    codigo = instalacao.gerar_codigo()
    assert await instalacao.conferir(tmp_path, codigo, T0) is False  # ausente
    await instalacao.gravar(tmp_path, codigo, T0)
    assert await instalacao.conferir(tmp_path, codigo, T0) is True
    assert await instalacao.conferir(tmp_path, codigo.lower().replace("-", " "), T0) is True
    errado = "2222-2222" if codigo != "2222-2222" else "3333-3333"
    assert await instalacao.conferir(tmp_path, errado, T0) is False
    assert await instalacao.conferir(tmp_path, "curto", T0) is False
    depois = T0 + timedelta(hours=24, seconds=1)
    assert await instalacao.conferir(tmp_path, codigo, depois) is False  # expirado
    (tmp_path / instalacao.ARQUIVO).write_text("{ilegível")
    assert await instalacao.conferir(tmp_path, codigo, T0) is False
    assert instalacao.estado(tmp_path, T0) == "ausente"


async def test_conferir_usa_o_verificador_do_argon2_e_o_ficticio_sem_arquivo(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    chamadas: list[str] = []

    async def verificar(hash_: str, senha: str) -> bool:
        chamadas.append("verificar")
        return True

    async def ficticio(senha: str) -> None:
        chamadas.append("ficticio")

    monkeypatch.setattr(instalacao, "verificar_async", verificar)
    monkeypatch.setattr(instalacao, "verificar_ficticio_async", ficticio)
    assert await instalacao.conferir(tmp_path, "AB3K-9MNP", T0) is False
    assert chamadas == ["ficticio"]  # sem arquivo: gasta o mesmo tempo
    await instalacao.gravar(tmp_path, "AB3K-9MNP", T0)
    assert await instalacao.conferir(tmp_path, "0000-0000", T0) is False  # fora do alfabeto
    assert chamadas == ["ficticio", "ficticio"]
    assert await instalacao.conferir(tmp_path, "ab3k9mnp", T0) is True
    assert chamadas == ["ficticio", "ficticio", "verificar"]


async def test_invalidar_idempotente(tmp_path: Path) -> None:
    instalacao.invalidar(tmp_path)  # nada a apagar
    await instalacao.gravar(tmp_path, instalacao.gerar_codigo(), T0)
    instalacao.invalidar(tmp_path)
    instalacao.invalidar(tmp_path)
    assert instalacao.estado(tmp_path, T0) == "ausente"


async def test_criado_em_no_futuro_conta_como_expirado(tmp_path: Path) -> None:
    await instalacao.gravar(tmp_path, "AB3K-9MNP", T0 + timedelta(minutes=10))
    assert instalacao.estado(tmp_path, T0) == "expirado"
    assert await instalacao.conferir(tmp_path, "AB3K-9MNP", T0) is False
    await instalacao.gravar(tmp_path, "AB3K-9MNP", T0 + timedelta(minutes=4))  # folga de 5 min
    assert instalacao.estado(tmp_path, T0) == "ativo"
