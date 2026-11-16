"""Checagem TCP: abre a conexão e fecha, sem enviar dados."""

import asyncio
import time

from sentinela.monitor.checagens.base import exigir_destino, falha
from sentinela.monitor.estados import ResultadoChecagem
from sentinela.rede.guarda import DestinoAutorizado


class ChecagemTcp:
    custo = 1

    async def executar(
        self,
        destino: DestinoAutorizado,
        timeout: float = 2.0,  # noqa: ASYNC109
    ) -> ResultadoChecagem:
        destino = exigir_destino(destino, "tcp")
        inicio = time.perf_counter()
        try:
            _, escritor = await asyncio.wait_for(
                asyncio.open_connection(str(destino.ip), destino.porta), timeout=timeout
            )
        except TimeoutError:
            return falha("Tempo esgotado")
        except OSError:
            return falha("Conexão TCP recusada ou inalcançável")
        latencia = (time.perf_counter() - inicio) * 1000
        escritor.close()
        try:
            await escritor.wait_closed()
        except OSError:
            pass  # o fechamento é só limpeza; a conexão já foi estabelecida
        return ResultadoChecagem(ok=True, latencia_ms=latencia)
