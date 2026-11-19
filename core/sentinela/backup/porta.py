"""Sonda de porta local: o core está no ar? Só conecta em endereços da própria máquina ou da rede
privada do compose, nunca na internet.

Fica isolado em um módulo minúsculo porque o teste ``test_importacoes_restritas`` limita onde
as chamadas de socket podem aparecer.

Dois lugares são sondados, porque a CLI roda de dois jeitos:

* ``docker compose exec core ...``: está no mesmo contêiner do core; vale ``127.0.0.1``.
* ``docker compose run core ...``: é um contêiner avulso, com rede própria (o loopback dele não é o
  do core), mas na mesma rede ``interna`` do compose; ali o serviço responde pelo nome ``core``.

Ainda assim é uma checagem de melhor esforço: fora do compose (core num servidor remoto) ela não vê
o core. A trava definitiva é o banco: ``restaurar_backup`` recusa um banco com escritor ativo.
"""

import asyncio
import ipaddress
import socket

LOOPBACK = "127.0.0.1"
NOME_DO_SERVICO = "core"  # nome do serviço no docker-compose.yml (DNS da rede interna)
HOSTS_DO_CORE = (LOOPBACK, NOME_DO_SERVICO)


async def _enderecos_locais(host: str) -> list[str]:
    """IPs de ``host`` que são loopback ou privados (os públicos e os ilegíveis ficam de fora)."""
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(
            host, None, family=socket.AF_INET, type=socket.SOCK_STREAM
        )
    except OSError:
        return []
    achados: list[str] = []
    for info in infos:
        ip = str(info[4][0])
        try:
            endereco = ipaddress.ip_address(ip)
        except ValueError:
            continue
        if (endereco.is_loopback or endereco.is_private) and ip not in achados:
            achados.append(ip)
    return achados


async def porta_responde(
    porta: int, espera_s: float = 1.0, hosts: tuple[str, ...] = HOSTS_DO_CORE
) -> bool:
    """``True`` se algo aceita conexão na ``porta`` de algum dos ``hosts`` (fecha sem enviar).

    Só conecta em IPv4 loopback ou privado; um nome que resolva para endereço público é ignorado.
    """
    for host in hosts:
        for ip in await _enderecos_locais(host):
            try:
                _leitor, escritor = await asyncio.wait_for(
                    asyncio.open_connection(ip, porta), timeout=espera_s
                )
            except (OSError, TimeoutError):
                continue
            escritor.close()
            return True
    return False
