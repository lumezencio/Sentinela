"""Gera ``sentinela/descoberta/classificador/oui.tsv.gz`` a partir dos registros públicos da IEEE.

Rodado à mão pelo mantenedor (``cd core && uv run python scripts/gerar_oui.py``); o Sentinela
em execução nunca baixa nada. Dados públicos: MA-L (24 bits), MA-M (28) e MA-S (36).
"""

import sys
import urllib.request
from pathlib import Path

from sentinela.descoberta.classificador.oui import CAMINHO_PADRAO, BaseOui, converter_csv

URLS = (
    "https://standards-oui.ieee.org/oui/oui.csv",
    "https://standards-oui.ieee.org/oui28/mam.csv",
    "https://standards-oui.ieee.org/oui36/oui36.csv",
)


def baixar(url: str) -> str:
    pedido = urllib.request.Request(url, headers={"User-Agent": "sentinela-gerar-oui"})  # noqa: S310
    with urllib.request.urlopen(pedido, timeout=60) as resposta:  # noqa: S310
        return resposta.read().decode("utf-8-sig")


def main() -> int:
    textos = [baixar(u) for u in URLS]
    destino = Path(CAMINHO_PADRAO)
    destino.write_bytes(converter_csv(textos))
    print(
        f"{len(BaseOui.carregar(destino))} prefixos em {destino} ({destino.stat().st_size} bytes)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
