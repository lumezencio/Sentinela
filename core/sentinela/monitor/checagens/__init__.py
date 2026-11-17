"""Checagens de disponibilidade (ICMP, TCP, HTTP)."""

from sentinela.monitor.checagens.base import Checagem
from sentinela.monitor.checagens.http import ChecagemHttp
from sentinela.monitor.checagens.icmp import ChecagemIcmp
from sentinela.monitor.checagens.tcp import ChecagemTcp

__all__ = [
    "GRAVADOR",
    "Checagem",
    "ChecagemHttp",
    "ChecagemIcmp",
    "ChecagemTcp",
    "checagem_para",
]

# Alvo passivo (câmera atrás de um gravador): nenhuma checagem ativa, o agendador só recebe
# os resultados de fora (``Agendador.aplicar_externo``).
GRAVADOR = "gravador"


def checagem_para(tipo: str) -> Checagem:
    if tipo == "icmp":
        return ChecagemIcmp()
    if tipo == "tcp":
        return ChecagemTcp()
    if tipo == "http":
        return ChecagemHttp()
    if tipo == GRAVADOR:
        raise ValueError("A checagem 'gravador' é passiva: o estado vem da leitura do gravador.")
    raise ValueError(f"Tipo de checagem desconhecido: {tipo}")
