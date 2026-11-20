"""A versão do pacote acompanha o pyproject (a release confere contra a tag)."""

import tomllib
from pathlib import Path

import sentinela


def test_versao_do_pacote_e_0_4_1() -> None:
    pyproject = Path(__file__).resolve().parents[1] / "pyproject.toml"
    declarada = tomllib.loads(pyproject.read_text(encoding="utf-8"))["project"]["version"]
    assert declarada == "0.4.1"
    assert sentinela.__version__ == "0.4.1"
