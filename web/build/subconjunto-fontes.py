"""Gera as fontes próprias do Sentinela em web/src/fontes/ (e a cópia do telão em
web/src/parede/fontes/), a partir dos pacotes do Fontsource (OFL 1.1), sem nada em tempo de
execução vindo de fora: a CSP é ``default-src 'self'`` e a instalação roda em rede local.

Recorte: Latim básico + Latim-1 (U+0020-007E, U+00A0-00FF) e a pontuação que as telas usam
(travessões, aspas curvas, reticências, setas, sinal de menos, euro). Sem hinting, só o
``kern`` nas proporcionais (o resto das features sai: cada KB conta no orçamento da primeira
tela). Inter variável limitada a 400-700; Sora só no 700 (títulos e números); JetBrains Mono
só no 500 (IPs, latência, versão).

Rodar a partir de web/ (baixa os pacotes com ``npm pack`` numa pasta temporária)::

    uv run --no-project --with fonttools==4.60.1 --with brotli==1.1.0 \\
        python -I build/subconjunto-fontes.py

O resultado é determinístico para as mesmas versões; os .woff2 ficam commitados e o
``ORIGEM.txt`` registra versões e sha256.
"""

import hashlib
import io
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

WEB = Path(__file__).resolve().parents[1]
DESTINO = WEB / "src" / "fontes"
DESTINO_TELAO = WEB / "src" / "parede" / "fontes"

PACOTES = {
    "inter": ("@fontsource-variable/inter", "5.3.0", "files/inter-latin-wght-normal.woff2"),
    "sora": ("@fontsource-variable/sora", "5.3.0", "files/sora-latin-wght-normal.woff2"),
    "mono": ("@fontsource/jetbrains-mono", "5.3.0", "files/jetbrains-mono-latin-500-normal.woff2"),
}

UNICODES = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026]
    + [0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x20AC]
)

# arquivo de saída -> (pacote, faixa ou peso fixo do eixo wght, features)
SAIDAS = {
    "inter.woff2": ("inter", (400, 700), ["kern"]),
    "sora-700.woff2": ("sora", 700, []),
    "jetbrains-mono-500.woff2": ("mono", None, []),
}
# o telão (HTTP só serve /parede/) usa Inter e Sora; os IPs nunca aparecem lá
SAIDAS_TELAO = ("inter.woff2", "sora-700.woff2")


def baixar(pasta: Path) -> dict[str, tuple[Path, str]]:
    achados: dict[str, tuple[Path, str]] = {}
    for chave, (nome, versao, arquivo) in PACOTES.items():
        saida = subprocess.run(
            ["npm", "pack", f"{nome}@{versao}", "--silent"],
            cwd=pasta, check=True, capture_output=True, text=True, shell=sys.platform == "win32",
        ).stdout.strip().splitlines()[-1]
        alvo = pasta / chave
        with tarfile.open(pasta / saida) as tar:
            tar.extractall(alvo, filter="data")
        achados[chave] = (alvo / "package" / arquivo, f"{nome}@{versao}")
        shutil.copy(alvo / "package" / "LICENSE", pasta / f"LICENSE-{chave}.txt")
    return achados


def recortar(origem: Path, eixo: object, features: list[str]) -> bytes:
    fonte = TTFont(origem, lazy=False)
    opcoes = subset.Options()
    opcoes.flavor = "woff2"
    opcoes.layout_features = features
    opcoes.hinting = False
    opcoes.desubroutinize = True
    opcoes.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # nomes, copyright e licença (OFL)
    opcoes.drop_tables += ["DSIG"]
    recorte = subset.Subsetter(opcoes)
    recorte.populate(unicodes=UNICODES)
    recorte.subset(fonte)
    if "fvar" in fonte and eixo is not None:
        fonte = instancer.instantiateVariableFont(fonte, {"wght": eixo})
    fonte.flavor = "woff2"
    buf = io.BytesIO()
    fonte.save(buf)
    return buf.getvalue()


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    DESTINO_TELAO.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        pasta = Path(tmp)
        achados = baixar(pasta)
        linhas = [
            "Fontes recortadas por build/subconjunto-fontes.py (Latim básico + Latim-1 + pontuação",
            "das telas, sem hinting). Licença: SIL Open Font License 1.1 (OFL-*.txt).",
            "",
        ]
        for arquivo, (chave, eixo, features) in SAIDAS.items():
            dados = recortar(achados[chave][0], eixo, features)
            (DESTINO / arquivo).write_bytes(dados)
            if arquivo in SAIDAS_TELAO:
                (DESTINO_TELAO / arquivo).write_bytes(dados)
            linhas.append(
                f"{arquivo}: {achados[chave][1]}, wght={eixo}, features={features or 'nenhuma'}, "
                f"{len(dados)} bytes, sha256 {hashlib.sha256(dados).hexdigest()}"
            )
        for chave, nome in (("inter", "Inter"), ("sora", "Sora"), ("mono", "JetBrainsMono")):
            texto = (pasta / f"LICENSE-{chave}.txt").read_text(encoding="utf-8")
            (DESTINO / f"OFL-{nome}.txt").write_text(texto, encoding="utf-8", newline="\n")
            if chave != "mono":
                (DESTINO_TELAO / f"OFL-{nome}.txt").write_text(texto, encoding="utf-8", newline="\n")
        origem = "\n".join(linhas) + "\n"
        (DESTINO / "ORIGEM.txt").write_text(origem, encoding="utf-8", newline="\n")
        (DESTINO_TELAO / "ORIGEM.txt").write_text(origem, encoding="utf-8", newline="\n")
        print(origem)


if __name__ == "__main__":
    main()
