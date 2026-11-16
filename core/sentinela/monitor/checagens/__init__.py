"""Checagens de disponibilidade (ICMP, TCP, HTTP)."""

from sentinela.monitor.checagens.base import Checagem
from sentinela.monitor.checagens.http import ChecagemHttp
from sentinela.monitor.checagens.icmp import ChecagemIcmp
from sentinela.monitor.checagens.tcp import ChecagemTcp

__all__ = ["Checagem", "ChecagemHttp", "ChecagemIcmp", "ChecagemTcp", "checagem_para"]


def checagem_para(tipo: str) -> Checagem:
    if tipo == "icmp":
        return ChecagemIcmp()
    if tipo == "tcp":
        return ChecagemTcp()
    if tipo == "http":
        return ChecagemHttp()
    raise ValueError(f"Tipo de checagem desconhecido: {tipo}")
