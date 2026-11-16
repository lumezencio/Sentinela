"""Checagem ICMP (ping sem privilégio, um pacote)."""

import icmplib

from sentinela.monitor.checagens.base import exigir_destino, falha
from sentinela.monitor.estados import ResultadoChecagem
from sentinela.rede.guarda import DestinoAutorizado


class ChecagemIcmp:
    custo = 1

    async def executar(
        self,
        destino: DestinoAutorizado,
        timeout: float = 2.0,  # noqa: ASYNC109
    ) -> ResultadoChecagem:
        destino = exigir_destino(destino, "icmp")
        try:
            host = await icmplib.async_ping(
                str(destino.ip), count=1, timeout=timeout, privileged=False
            )
        except icmplib.SocketPermissionError:
            return falha("ICMP sem permissão no host")
        except icmplib.ICMPLibError:
            return falha("Falha ao enviar ICMP")
        except OSError:
            return falha("Erro de rede no ICMP")
        if not host.is_alive:
            return falha("Sem resposta ao ping")
        return ResultadoChecagem(ok=True, latencia_ms=float(host.avg_rtt))
