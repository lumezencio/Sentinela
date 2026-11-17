"""Contrato comum das checagens e validação do destino autorizado."""

from typing import Protocol

from sentinela.monitor.estados import ResultadoChecagem
from sentinela.rede.guarda import DestinoAutorizado


class Checagem(Protocol):
    custo: int

    async def executar(
        self,
        destino: DestinoAutorizado,
        timeout: float = 2.0,  # noqa: ASYNC109 - contrato do plano
    ) -> ResultadoChecagem: ...


def exigir_destino(destino: object, protocolo: str) -> DestinoAutorizado:
    """Garante em tempo de execução que o destino veio da Guarda e serve a esta checagem."""
    if not isinstance(destino, DestinoAutorizado):
        raise TypeError("A checagem exige um DestinoAutorizado emitido pela Guarda")
    if destino.protocolo != protocolo:
        raise ValueError(f"protocolo do destino ({destino.protocolo}) difere de {protocolo}")
    return destino


def falha(erro: str) -> ResultadoChecagem:
    return ResultadoChecagem(ok=False, latencia_ms=None, erro=erro)
