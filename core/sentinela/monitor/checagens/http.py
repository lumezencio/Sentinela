"""Checagem HTTP: HEAD com fallback GET, sem seguir redirecionamentos nem ler o corpo."""

import asyncio
import time

import httpx

from sentinela.monitor.checagens.base import exigir_destino, falha
from sentinela.monitor.estados import ResultadoChecagem
from sentinela.rede.guarda import DestinoAutorizado

_SEM_HEAD = frozenset({405, 501})


class ChecagemHttp:
    custo = 3

    async def executar(
        self,
        destino: DestinoAutorizado,
        timeout: float = 2.0,  # noqa: ASYNC109
    ) -> ResultadoChecagem:
        destino = exigir_destino(destino, "http")
        https = destino.porta == 443
        url = f"{'https' if https else 'http'}://{destino.ip}:{destino.porta}/"
        inicio = time.perf_counter()
        try:
            # Prazo total: o timeout do httpx vale por fase, então limitamos o conjunto
            # (HEAD e eventual GET) com um prazo único.
            async with (
                asyncio.timeout(timeout),
                httpx.AsyncClient(
                    follow_redirects=False,
                    trust_env=False,
                    timeout=timeout,
                    # Certificado autoassinado de equipamento; IP já autorizado pela Guarda.
                    verify=not https,  # noqa: S501
                ) as cliente,
            ):
                status = await self._status(cliente, url)
        except (TimeoutError, httpx.TimeoutException):
            return falha("Tempo esgotado")
        except httpx.HTTPError:
            return falha("Falha na requisição HTTP")
        except Exception:  # noqa: BLE001 - rede de segurança para o agendador
            return falha("Erro inesperado na checagem HTTP")
        latencia = (time.perf_counter() - inicio) * 1000
        if status >= 500:
            return ResultadoChecagem(ok=False, latencia_ms=None, erro=f"HTTP {status}")
        return ResultadoChecagem(ok=True, latencia_ms=latencia)

    @staticmethod
    async def _status(cliente: httpx.AsyncClient, url: str) -> int:
        resposta = await cliente.head(url)
        if resposta.status_code not in _SEM_HEAD:
            return resposta.status_code
        # GET em streaming: só os cabeçalhos são lidos; fechar descarta o corpo.
        async with cliente.stream("GET", url) as resposta_get:
            return resposta_get.status_code
