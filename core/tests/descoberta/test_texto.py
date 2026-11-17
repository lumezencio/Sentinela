from sentinela.descoberta.texto import limpar


def test_limpar_remove_controles_e_trunca() -> None:
    assert limpar("  rb\x00-\x1b[31mcasa\r\n  sala\t ") == "rb-[31mcasa sala"
    assert limpar("a‮b​c") == "abc"  # controles de formatação (bidi, largura zero)
    assert limpar("x" * 500) == "x" * 120
    assert limpar("abcdef", limite=3) == "abc"
    assert limpar("abc   " + "d" * 10, limite=5) == "abc d"[:5]
    assert limpar("ab   cd", limite=3) == "ab"  # não termina em espaço
    assert limpar(None) is None
    assert limpar("") is None
    assert limpar(" \x00\t\n ") is None
    assert limpar(42) == "42"
    assert limpar(b"r\xc3\xa1dio\xff") == "rádio�"
