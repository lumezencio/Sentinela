"""Varredura lenta (spec §5.2, §9.1 a): ICMP echo unicast em cada IP de uma sub-rede.

- Só sub-redes com ``permite_varredura``; uma varredura por vez; cancelável.
- Ritmo: um IP a cada ``intervalo_varredura_ips_s`` (padrão 0,5 s = 2 IPs/s), medido no
  relógio injetado; cada IP custa 1 ficha de prioridade **baixa** no limitador.
- Endereço de rede/broadcast da sub-rede varrida (e qualquer IP que a Guarda viva recuse,
  ex.: sub-rede removida no meio) é pulado sem enviar nada: o pacote só sai com um
  ``DestinoAutorizado``.
- Quem responde vira ``Achado(origem="varredura")``, entregue na hora a ``entregar``
  (o orquestrador mescla, classifica e publica).
- Progresso no barramento: ``varredura`` com ``cidr``, ``feitos``, ``total``, ``achados`` e
  ``estado`` (rodando/concluida/cancelada/falhou).
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from ipaddress import IPv4Network
from typing import Any

import icmplib
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import SubRede
from sentinela.descoberta.ajustes import ler_ajustes
from sentinela.descoberta.fontes.base import Achado
from sentinela.descoberta.mescla import FONTE_VARREDURA
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, DestinoProibido, Guarda
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

TIMEOUT_PING_S = 1.0

Ping = Callable[[DestinoAutorizado], Awaitable[bool]]
Entregar = Callable[[list[Achado]], Awaitable[None]]


class ErroVarredura(Exception):
    """Recusa da varredura; mensagem fixa, pode ir ao cliente."""


class VarreduraEmAndamento(ErroVarredura):
    def __init__(self) -> None:
        super().__init__("Já existe uma varredura em andamento.")


class VarreduraNaoPermitida(ErroVarredura):
    def __init__(self, motivo: str = "A sub-rede não permite varredura.") -> None:
        super().__init__(motivo)


class SubRedeInexistente(VarreduraNaoPermitida):
    def __init__(self) -> None:
        super().__init__("Sub-rede não encontrada.")


async def ping_icmp(destino: DestinoAutorizado) -> bool:
    """Um echo ICMP sem privilégio (unicast; o destino já passou pela Guarda)."""
    try:
        async with asyncio.timeout(TIMEOUT_PING_S + 1.0):
            host = await icmplib.async_ping(
                str(destino.ip), count=1, timeout=TIMEOUT_PING_S, privileged=False
            )
    except (TimeoutError, icmplib.ICMPLibError, OSError):
        return False
    return bool(host.is_alive)


async def _descartar(_achados: list[Achado]) -> None:
    return None


class Varredura:
    def __init__(
        self,
        sessoes: async_sessionmaker[AsyncSession],
        guarda: Guarda,
        limitador: Limitador,
        barramento: Barramento,
        relogio: Relogio,
        *,
        ping: Ping = ping_icmp,
        entregar: Entregar = _descartar,
    ) -> None:
        self._sessoes = sessoes
        self._guarda = guarda
        self._limitador = limitador
        self._barramento = barramento
        self._relogio = relogio
        self._ping = ping
        self._entregar = entregar
        self._tarefa: asyncio.Task[None] | None = None
        self._progresso: dict[str, Any] = {}

    def _rodando(self) -> bool:
        return self._tarefa is not None and not self._tarefa.done()

    def progresso(self) -> dict[str, Any] | None:
        """``{"cidr", "feitos", "total", "achados"}`` da varredura em curso, ou None."""
        return dict(self._progresso) if self._rodando() else None

    async def iniciar(self, sub_rede_id: int) -> dict[str, Any]:
        if self._rodando():
            raise VarreduraEmAndamento
        async with self._sessoes() as db:
            sub = await db.get(SubRede, sub_rede_id)
            if sub is None:
                raise SubRedeInexistente
            if not sub.permite_varredura:
                raise VarreduraNaoPermitida
            ajustes = await ler_ajustes(db)
            cidr = sub.cidr
        if self._rodando():  # outra começou enquanto líamos o banco
            raise VarreduraEmAndamento
        rede = IPv4Network(cidr)
        self._progresso = {
            "cidr": str(rede),
            "feitos": 0,
            "total": rede.num_addresses,
            "achados": 0,
        }
        self._tarefa = asyncio.create_task(
            self._rodar(rede, ajustes.intervalo_varredura_ips_s), name="sentinela-varredura"
        )
        self._publicar("rodando")
        return dict(self._progresso)

    def cancelar(self) -> None:
        if self._tarefa is not None:
            self._tarefa.cancel()

    async def encerrar(self) -> None:
        """Cancela e espera o fim (desligamento do processo e testes)."""
        tarefa = self._tarefa
        if tarefa is not None:
            tarefa.cancel()
            await asyncio.gather(tarefa, return_exceptions=True)

    def _publicar(self, estado: str) -> None:
        self._barramento.publicar(Mensagem("varredura", {**self._progresso, "estado": estado}))

    async def _rodar(self, rede: IPv4Network, intervalo: float) -> None:
        estado = "falhou"
        inicio = self._relogio.agora()
        try:
            for i, ip in enumerate(rede):
                espera = inicio + i * intervalo - self._relogio.agora()
                if espera > 0:
                    await self._relogio.dormir(espera)
                if ip not in (rede.network_address, rede.broadcast_address):
                    await self._um_ip(str(ip))
                self._progresso["feitos"] += 1
                self._publicar("rodando")
            estado = "concluida"
        except asyncio.CancelledError:
            estado = "cancelada"
            raise
        except Exception as e:  # noqa: BLE001 - registra e encerra; nada de texto cru
            log.error("varredura falhou: %s", type(e).__name__)
        finally:
            self._publicar(estado)

    async def _um_ip(self, ip: str) -> None:
        try:
            destino = self._guarda.validar(ip, None, "icmp")
        except DestinoProibido:
            return  # rede/broadcast ou fora da Guarda viva: nenhum pacote
        await self._limitador.adquirir(1, prioridade="baixa")
        try:
            vivo = await self._ping(destino)
        except Exception as e:  # noqa: BLE001 - um IP com problema não para a varredura
            log.warning("ping da varredura falhou: %s", type(e).__name__)
            return
        if not vivo:
            return
        self._progresso["achados"] += 1
        try:
            await self._entregar([Achado(ip, None, "varredura", FONTE_VARREDURA)])
        except Exception as e:  # noqa: BLE001
            log.error("falha ao entregar achado da varredura: %s", type(e).__name__)
