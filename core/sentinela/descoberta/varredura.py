"""Varredura lenta (spec §5.2, §9.1 a): ICMP echo unicast em cada IP de uma sub-rede.

- Só sub-redes com ``permite_varredura``; uma varredura por vez; cancelável. A API cancela na
  hora (``revogar``) a varredura da sub-rede que perde a permissão ou é removida; além disso a
  permissão é relida do banco a cada ``VERIFICAR_A_CADA_IPS`` IPs (numa tarefa à parte, sem
  atrasar o ritmo) e, se tiver caído, a varredura para como "cancelada".
- Ritmo: no mínimo ``intervalo_varredura_ips_s`` (padrão 0,5 s = 2 IPs/s) entre dois envios,
  medido no relógio injetado desde o envio anterior (atrasos nunca viram
  rajada); cada IP custa 1 ficha de prioridade **baixa** no limitador.
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
VERIFICAR_A_CADA_IPS = 8  # releitura de ``permite_varredura`` durante a varredura

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
        self._intervalo = 0.5
        self._ultimo_envio: float | None = None
        self._sub_rede_id: int | None = None
        self._desde_verificacao = 0
        self._verificacao: asyncio.Task[None] | None = None

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
        self._sub_rede_id = sub_rede_id
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

    async def revogar(self, sub_rede_id: int) -> bool:
        """A sub-rede perdeu a permissão (ou foi removida): cancela e espera o fim da
        varredura dela, se for a que está rodando. True se cancelou."""
        tarefa = self._tarefa
        if tarefa is None or tarefa.done() or self._sub_rede_id != sub_rede_id:
            return False
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)
        return True

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
        self._intervalo = intervalo
        self._ultimo_envio = None
        self._desde_verificacao = 0
        try:
            for ip in rede:
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
            if self._verificacao is not None:
                # leitura curta do banco: espera terminar (cancelar no meio deixa a sessão
                # presa); ela só cancela a varredura se ainda estiver rodando
                await asyncio.gather(self._verificacao, return_exceptions=True)
            self._publicar(estado)

    async def _verificar_permissao(self, tarefa: asyncio.Task[None], sub_rede_id: int) -> None:
        """Relê a sub-rede; sem permissão (ou removida), cancela a varredura."""
        try:
            async with self._sessoes() as db:
                sub = await db.get(SubRede, sub_rede_id)
                permitida = sub is not None and bool(sub.permite_varredura)
        except Exception as e:  # noqa: BLE001 - banco indisponível: a próxima verificação tenta
            log.warning("permissão da varredura não relida: %s", type(e).__name__)
            return
        if not permitida and not tarefa.done():
            log.warning("varredura interrompida: a sub-rede não permite mais varredura")
            tarefa.cancel()

    def _agendar_verificacao(self) -> None:
        tarefa, sub_rede_id = self._tarefa, self._sub_rede_id
        if tarefa is None or sub_rede_id is None:
            return
        if self._verificacao is not None and not self._verificacao.done():
            return  # a anterior ainda não terminou
        self._verificacao = asyncio.create_task(
            self._verificar_permissao(tarefa, sub_rede_id), name="sentinela-varredura-permissao"
        )

    async def _um_ip(self, ip: str) -> None:
        try:
            destino = self._guarda.validar(ip, None, "icmp")
        except DestinoProibido:
            return  # rede/broadcast ou fora da Guarda viva: nenhum pacote
        self._desde_verificacao += 1
        if self._desde_verificacao >= VERIFICAR_A_CADA_IPS:
            self._desde_verificacao = 0
            self._agendar_verificacao()  # em paralelo: não mexe no ritmo
        await self._limitador.adquirir(1, prioridade="baixa")
        # ritmo medido desde o envio anterior: atraso (ping lento, fichas, entrega) nunca
        # vira rajada para "recuperar o tempo"
        if self._ultimo_envio is not None:
            espera = self._ultimo_envio + self._intervalo - self._relogio.agora()
            if espera > 0:
                await self._relogio.dormir(espera)
        self._ultimo_envio = self._relogio.agora()
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
