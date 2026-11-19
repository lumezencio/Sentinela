"""Sonda de porta local: o core está no ar? Só conecta em 127.0.0.1, nunca sai da máquina.

Fica isolado em um módulo minúsculo porque o teste ``test_importacoes_restritas`` limita onde
as chamadas de socket podem aparecer.
"""

import asyncio

LOOPBACK = "127.0.0.1"


async def porta_responde(porta: int, espera_s: float = 1.0) -> bool:
    """``True`` se algo aceita conexão em ``127.0.0.1:porta`` (a conexão é fechada sem enviar)."""
    try:
        _leitor, escritor = await asyncio.wait_for(
            asyncio.open_connection(LOOPBACK, porta), timeout=espera_s
        )
    except (OSError, TimeoutError):
        return False
    escritor.close()
    return True
