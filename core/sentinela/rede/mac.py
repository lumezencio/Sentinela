"""Normalização de MAC, compartilhada pela API de cadastro e pela descoberta."""

import re

MSG_MAC = "MAC inválido."
_MAC = re.compile(r"^[0-9a-f]{2}([:-])[0-9a-f]{2}(\1[0-9a-f]{2}){4}$")


def normalizar_mac(mac: str) -> str:
    """``02-00-00-0A-0B-0C`` ou ``02:00:00:0a:0b:0c`` → ``02:00:00:0a:0b:0c``; ValueError
    se inválido."""
    valor = mac.strip().lower()
    if not _MAC.fullmatch(valor):
        raise ValueError(MSG_MAC)
    return valor.replace("-", ":")
