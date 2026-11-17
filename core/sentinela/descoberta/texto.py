"""Saneamento de texto vindo da rede (identidade, versão, nomes DHCP, títulos)."""

import unicodedata

LIMITE_PADRAO = 120


def limpar(valor: object, limite: int = LIMITE_PADRAO) -> str | None:
    """Tira caracteres de controle/formatação, colapsa espaços e trunca em ``limite``.

    Bytes são decodificados como UTF-8 (com substituição). Texto vazio vira ``None``.
    """
    if valor is None:
        return None
    if isinstance(valor, bytes | bytearray):
        texto = bytes(valor).decode("utf-8", errors="replace")
    else:
        texto = str(valor)
    # espaços (inclusive \t, \r, \n) separam palavras; os demais controles somem
    texto = "".join(c for c in texto if c.isspace() or not unicodedata.category(c).startswith("C"))
    texto = " ".join(texto.split())[: max(limite, 0)].rstrip()
    return texto or None
