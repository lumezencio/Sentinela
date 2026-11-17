"""Base OUI da IEEE (fabricante pelo prefixo do MAC), embutida e carregada uma única vez.

O arquivo ``oui.tsv.gz`` (prefixo em hexadecimal maiúsculo e fabricante, separados por TAB)
é gerado à mão por ``scripts/gerar_oui.py`` ou ``sentinela oui-atualizar <csv>``; em
execução nada é baixado. Prefixos de 36 bits (MA-S, 9 dígitos) vencem os de 28 (MA-M, 7
dígitos), que vencem os de 24 (MA-L, 6 dígitos).
"""

import csv
import gzip
import io
import threading
from pathlib import Path
from typing import Self

from sentinela.descoberta.texto import limpar
from sentinela.rede.mac import normalizar_mac

CAMINHO_PADRAO = Path(__file__).with_name("oui.tsv.gz")
_TAMANHOS = (9, 7, 6)  # dígitos hexadecimais: 36, 28 e 24 bits
_LIMITE_NOME = 64
_LIMITE_LINHA = 1_000_000  # defesa contra arquivo adulterado

_cache: "BaseOui | None" = None
_trava = threading.Lock()


class BaseOui:
    def __init__(self, tabelas: dict[int, dict[str, str]] | None = None) -> None:
        self._tabelas = tabelas or {n: {} for n in _TAMANHOS}

    def __len__(self) -> int:
        return sum(len(t) for t in self._tabelas.values())

    @classmethod
    def carregar(cls, caminho: Path | None = None) -> Self:
        """Lê o arquivo (por padrão, o embutido) e guarda em cache na primeira chamada."""
        global _cache  # noqa: PLW0603
        if caminho is None:
            with _trava:
                if _cache is None:
                    _cache = cls._ler(CAMINHO_PADRAO)
                return _cache  # type: ignore[return-value]
        return cls._ler(caminho)

    @classmethod
    def _ler(cls, caminho: Path) -> Self:
        tabelas: dict[int, dict[str, str]] = {n: {} for n in _TAMANHOS}
        with gzip.open(caminho, "rt", encoding="utf-8") as arq:
            for i, linha in enumerate(arq):
                if i >= _LIMITE_LINHA:
                    break
                prefixo, _, nome = linha.rstrip("\n").partition("\t")
                if len(prefixo) in tabelas and nome:
                    tabelas[len(prefixo)][prefixo] = nome
        return cls(tabelas)

    def fabricante(self, mac: str) -> str | None:
        try:
            digitos = normalizar_mac(mac).replace(":", "").upper()
        except ValueError:
            return None
        if int(digitos[:2], 16) & 0b10:  # localmente administrado (aleatório): sem fabricante
            return None
        for n in _TAMANHOS:
            nome = self._tabelas[n].get(digitos[:n])
            if nome:
                return nome
        return None


def _nome_curto(nome: str) -> str | None:
    return limpar(nome, _LIMITE_NOME)


def converter_csv(textos: list[str]) -> bytes:
    """Converte registros CSV da IEEE (``Registry,Assignment,Organization Name,...``) em TSV
    ordenado, já comprimido (gzip determinístico). Entradas inválidas são ignoradas."""
    saida: dict[str, str] = {}
    for texto in textos:
        for linha in csv.reader(io.StringIO(texto)):
            if len(linha) < 3:
                continue
            prefixo = linha[1].strip().upper()
            if len(prefixo) not in _TAMANHOS or any(c not in "0123456789ABCDEF" for c in prefixo):
                continue
            nome = _nome_curto(linha[2])
            if nome:
                saida[prefixo] = nome
    corpo = "".join(f"{p}\t{n}\n" for p, n in sorted(saida.items())).encode("utf-8")
    return gzip.compress(corpo, compresslevel=9, mtime=0)


def atualizar_de_csv(arquivos: list[Path], destino: Path = CAMINHO_PADRAO) -> int:
    """Lê CSVs locais da IEEE e grava o novo ``oui.tsv.gz``; devolve o nº de prefixos."""
    global _cache  # noqa: PLW0603
    textos = [a.read_text(encoding="utf-8-sig") for a in arquivos]
    dados = converter_csv(textos)
    destino.write_bytes(dados)
    with _trava:
        _cache = None
    return len(BaseOui._ler(destino))
