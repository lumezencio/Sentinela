"""Base OUI embutida, conversão do CSV da IEEE e o comando ``oui-atualizar`` (sem rede)."""

import gzip
import time
from pathlib import Path

import pytest

from sentinela.cli import executar
from sentinela.config import Settings
from sentinela.descoberta.classificador.oui import CAMINHO_PADRAO, BaseOui, atualizar_de_csv

CSV = Path(__file__).resolve().parents[1] / "fixtures" / "oui_ieee_amostra.csv"


def _base(tmp_path: Path) -> BaseOui:
    destino = tmp_path / "oui.tsv.gz"
    assert atualizar_de_csv([CSV], destino) == 4
    return BaseOui.carregar(destino)


def test_base_embutida_conhece_fabricante_real() -> None:
    base = BaseOui.carregar()
    assert len(base) > 20_000
    assert base.fabricante("00:0c:29:aa:bb:cc") is not None  # VMware, registro público
    assert BaseOui.carregar() is base  # carregada uma vez só (cache)


def test_carga_embutida_e_rapida() -> None:
    inicio = time.perf_counter()
    BaseOui.carregar()
    assert time.perf_counter() - inicio < 2.0
    assert CAMINHO_PADRAO.stat().st_size < 1_000_000


def test_prefixo_36_vence_24(tmp_path: Path) -> None:
    base = _base(tmp_path)
    assert base.fabricante("4c:1b:2c:00:00:01") == "Fabricante Exemplo Ltda"  # 24 bits
    assert base.fabricante("4c:1b:2e:10:00:01") == "Prefixo Medio Exemplo"  # 28 bits
    assert base.fabricante("4c:1b:2f:12:30:01") == "Prefixo Pequeno Exemplo"  # 36 bits
    assert base.fabricante("4c:1b:2f:99:99:99") is None  # 4C1B2F sozinho não é MA-L
    assert base.fabricante("4c-1b-2d-00-00-01") == "Outro, Exemplo S.A."


def test_prefixo_36_vence_24_no_mesmo_bloco(tmp_path: Path) -> None:
    csv = tmp_path / "f" / "x.csv"
    csv.parent.mkdir()
    csv.write_text(
        "Registry,Assignment,Organization Name,Organization Address\n"
        "MA-L,4C1B30,Grande,x\nMA-S,4C1B30123,Pequeno,x\n",
        encoding="utf-8",
    )
    destino = tmp_path / "o.tsv.gz"
    atualizar_de_csv([csv], destino)
    base = BaseOui.carregar(destino)
    assert base.fabricante("4c:1b:30:12:30:00") == "Pequeno"
    assert base.fabricante("4c:1b:30:ff:00:00") == "Grande"


def test_mac_local_sem_fabricante(tmp_path: Path) -> None:
    base = _base(tmp_path)
    # 4c: bit "localmente administrado" desligado → tem fabricante; 02 (ligado) → nunca
    assert base.fabricante("4c:1b:2c:00:00:01") == "Fabricante Exemplo Ltda"
    csv = tmp_path / "f" / "l.csv"
    csv.parent.mkdir()
    csv.write_text(
        "Registry,Assignment,Organization Name,Organization Address\nMA-L,021B2C,Local,x\n",
        encoding="utf-8",
    )
    destino = tmp_path / "l.tsv.gz"
    atualizar_de_csv([csv], destino)
    assert BaseOui.carregar(destino).fabricante("02:1b:2c:00:00:01") is None


def test_mac_invalido_sem_fabricante(tmp_path: Path) -> None:
    assert _base(tmp_path).fabricante("isto não é mac") is None


def test_conversao_gera_tsv_ordenado_e_aparado(tmp_path: Path) -> None:
    destino = tmp_path / "o.tsv.gz"
    atualizar_de_csv([CSV], destino)
    linhas = gzip.decompress(destino.read_bytes()).decode().splitlines()
    assert linhas == sorted(linhas)
    assert "4C1B2C\tFabricante Exemplo Ltda" in linhas
    assert all("ZZZZZZ" not in linha for linha in linhas)


async def test_cli_oui_atualizar_le_arquivo_local(
    tmp_path: Path, settings: Settings, capsys: pytest.CaptureFixture[str]
) -> None:
    saida = tmp_path / "novo.tsv.gz"
    codigo = await executar(["oui-atualizar", str(CSV), "--saida", str(saida)], settings)
    assert codigo == 0
    assert "4 prefixos" in capsys.readouterr().out
    assert BaseOui.carregar(saida).fabricante("4c:1b:2c:00:00:01") == "Fabricante Exemplo Ltda"


async def test_cli_oui_atualizar_arquivo_inexistente(
    tmp_path: Path, settings: Settings, capsys: pytest.CaptureFixture[str]
) -> None:
    codigo = await executar(
        ["oui-atualizar", str(tmp_path / "nao-existe.csv"), "--saida", str(tmp_path / "o.gz")],
        settings,
    )
    assert codigo == 2
    assert "erro" in capsys.readouterr().err
