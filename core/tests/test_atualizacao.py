"""Núcleo do ``atualizacao.json``: leitura tolerante, gravação atômica e o aviso de 24 h."""

import json
import os
import stat
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from sentinela import atualizacao
from sentinela.atualizacao import EstadoAtualizacao

AGORA = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)


def test_ler_ausente_e_ligado_sem_agendamento(tmp_path: Path) -> None:
    e = atualizacao.ler(tmp_path)
    assert e == EstadoAtualizacao()
    assert e.ativo is True and e.agendado is False
    assert atualizacao.ilegivel(tmp_path) is False


def test_campos_hostis_viram_padrao(tmp_path: Path) -> None:
    (tmp_path / atualizacao.ARQUIVO).write_text(
        json.dumps(
            {
                "ativo": "sim",
                "agendado": 1,
                "ultima_verificacao": "ontem",
                "resultado": "explodiu",
                "de": "1.2",
                "para": "1.2.3\n",
                "mensagem": "x" * 250 + "\x1b[31m" + "y" * 250,
            }
        ),
        encoding="utf-8",
    )
    e = atualizacao.ler(tmp_path)
    assert e.ativo is True and e.agendado is False
    assert e.ultima_verificacao is None and e.resultado is None
    assert e.de is None and e.para is None
    assert e.mensagem is not None and len(e.mensagem) <= atualizacao.MAX_MENSAGEM
    assert "\x1b" not in e.mensagem
    assert atualizacao.ilegivel(tmp_path) is True


def test_arquivo_corrompido_nao_desliga_e_e_sinalizado(tmp_path: Path) -> None:
    (tmp_path / atualizacao.ARQUIVO).write_bytes(b"\xff\xfe{nao e json")
    assert atualizacao.ler(tmp_path) == EstadoAtualizacao()
    assert atualizacao.ilegivel(tmp_path) is True
    (tmp_path / atualizacao.ARQUIVO).write_text("[1, 2]", encoding="utf-8")
    assert atualizacao.ler(tmp_path).ativo is True
    assert atualizacao.ilegivel(tmp_path) is True


def test_desligado_valido_e_respeitado_campo_a_campo(tmp_path: Path) -> None:
    (tmp_path / atualizacao.ARQUIVO).write_text(
        json.dumps({"ativo": False, "para": "lixo"}), encoding="utf-8"
    )
    e = atualizacao.ler(tmp_path)
    assert e.ativo is False and e.para is None


def test_registrar_preserva_ativo_e_agendado(tmp_path: Path) -> None:
    atualizacao.definir_ativo(tmp_path, False)
    atualizacao.marcar_agendado(tmp_path)
    e = atualizacao.registrar(tmp_path, "atualizado", "0.4.0", "0.5.0", None, AGORA)
    assert (e.ativo, e.agendado) == (False, True)
    assert (e.resultado, e.de, e.para, e.ultima_verificacao) == (
        "atualizado",
        "0.4.0",
        "0.5.0",
        AGORA,
    )
    assert atualizacao.ler(tmp_path) == e
    assert atualizacao.definir_ativo(tmp_path, True).resultado == "atualizado"


def test_registrar_saneia_mensagem_e_versoes(tmp_path: Path) -> None:
    e = atualizacao.registrar(tmp_path, "falhou", "abc", "0.5.0", "ruim\x00\n" + "z" * 400, AGORA)
    assert e.de is None and e.para == "0.5.0"
    assert e.mensagem is not None and len(e.mensagem) <= 200
    assert "\x00" not in e.mensagem and "\n" not in e.mensagem


def test_aviso_24h_atualizado_e_voltou() -> None:
    def estado(resultado: str, horas: float) -> EstadoAtualizacao:
        return EstadoAtualizacao(
            resultado=resultado,  # type: ignore[arg-type]
            de="0.4.0",
            para="0.5.0",
            ultima_verificacao=AGORA - timedelta(hours=horas),
        )

    assert atualizacao.aviso(estado("atualizado", 23), AGORA) == "Atualizado para 0.5.0"
    assert atualizacao.aviso(estado("atualizado", 25), AGORA) is None
    assert (
        atualizacao.aviso(estado("voltou", 23), AGORA)
        == "A atualização para 0.5.0 falhou; o Sentinela voltou para 0.4.0"
    )
    assert atualizacao.aviso(estado("voltou", 25), AGORA) is None
    for nunca in ("falhou", "sem_novidade"):
        assert atualizacao.aviso(estado(nunca, 1), AGORA) is None
    assert atualizacao.aviso(EstadoAtualizacao(), AGORA) is None


def test_gravar_atomico_0600(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    atualizacao.gravar(tmp_path, EstadoAtualizacao(ativo=False))
    destino = tmp_path / atualizacao.ARQUIVO
    if os.name != "nt":
        assert stat.S_IMODE(destino.stat().st_mode) == 0o600
    assert [p.name for p in tmp_path.iterdir()] == [atualizacao.ARQUIVO]
    # troca por os.replace: o conteúdo antigo continua inteiro se a escrita falhar no meio
    antigo = destino.read_bytes()

    def quebra(*_a: object, **_k: object) -> None:
        raise OSError("disco cheio")

    monkeypatch.setattr(os, "replace", quebra)
    with pytest.raises(OSError, match="disco cheio"):
        atualizacao.gravar(tmp_path, EstadoAtualizacao(ativo=True))
    monkeypatch.undo()
    assert destino.read_bytes() == antigo
    assert [p.name for p in tmp_path.iterdir()] == [atualizacao.ARQUIVO]
