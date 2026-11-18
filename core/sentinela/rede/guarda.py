"""Guarda de rede: ponto único de passagem de todo destino de saída.

Recusa broadcast, multicast, loopback, link-local e qualquer endereço fora das
sub-redes privadas declaradas pelo administrador. Só a Guarda consegue criar um
``DestinoAutorizado``; as camadas de envio exigem esse objeto.

Exceção nomeada única para a internet: ``DestinoExterno("telegram")`` (``api.telegram.org:443``),
com o IP que o nome resolver, desde que não seja broadcast, multicast, loopback, link-local,
``0.0.0.0/8`` nem reservado. Nenhum outro host externo existe.
"""

from collections.abc import Iterable
from dataclasses import InitVar, dataclass
from ipaddress import AddressValueError, IPv4Address, IPv4Network
from typing import Literal, cast, get_args

# udp (SNMP) e https (gravador, MikroTik api-ssl) entram com a descoberta da Fase 3; todos
# menos icmp exigem porta, e broadcast/multicast continuam recusados para qualquer protocolo.
Protocolo = Literal["icmp", "tcp", "http", "https", "udp"]

# destinos externos nomeados: nome -> (host, porta). Só o Telegram.
NomeExterno = Literal["telegram"]
_EXTERNOS: dict[str, tuple[str, int]] = {"telegram": ("api.telegram.org", 443)}

_PROTOCOLOS: tuple[str, ...] = get_args(Protocolo)
_PROTOCOLOS_COM_PORTA: frozenset[str] = frozenset({"tcp", "http", "https", "udp"})
_RFC1918 = (
    IPv4Network("10.0.0.0/8"),
    IPv4Network("172.16.0.0/12"),
    IPv4Network("192.168.0.0/16"),
)
_PREFIXO_MIN = 16
_PREFIXO_MAX = 30
_BROADCAST_GLOBAL = IPv4Address("255.255.255.255")
_LOOPBACK_TESTE = IPv4Address("127.0.0.1")
_ESTE_HOST = IPv4Network("0.0.0.0/8")

# Sentinela privada do módulo: só a Guarda a conhece.
_TOKEN = object()


class DestinoProibido(ValueError):
    """Destino recusado pela Guarda; ``motivo`` explica em português."""

    def __init__(self, motivo: str) -> None:
        super().__init__(motivo)
        self.motivo = motivo


@dataclass(frozen=True)
class DestinoAutorizado:
    """Destino validado. Não pode ser construído fora da Guarda.

    O token é um InitVar sem valor padrão: não fica guardado na instância, então
    ``dataclasses.replace`` falha em vez de reaproveitá-lo. Honestidade: em Python
    ``object.__setattr__`` e ``__new__`` não podem ser totalmente impedidos; a
    proteção barra uso acidental e caminhos comuns, não código deliberadamente hostil.
    """

    ip: IPv4Address
    porta: int | None
    protocolo: Protocolo
    _token: InitVar[object]

    def __post_init__(self, _token: object) -> None:
        if _token is not _TOKEN:
            raise TypeError("DestinoAutorizado só pode ser criado pela Guarda")


@dataclass(frozen=True)
class DestinoExterno:
    """Destino na internet validado (só os nomes de ``NomeExterno``); mesma trava do
    ``DestinoAutorizado``: só a Guarda o cria."""

    nome: NomeExterno
    host: str
    porta: int
    ip: IPv4Address
    _token: InitVar[object]

    def __post_init__(self, _token: object) -> None:
        if _token is not _TOKEN:
            raise TypeError("DestinoExterno só pode ser criado pela Guarda")


class Guarda:
    def __init__(self, sub_redes: Iterable[IPv4Network], permitir_loopback: bool = False) -> None:
        self._sub_redes: tuple[IPv4Network, ...] = ()
        self._reservados: frozenset[IPv4Address] = frozenset()
        self.atualizar(sub_redes)
        self._permitir_loopback = permitir_loopback

    def atualizar(self, sub_redes: Iterable[IPv4Network]) -> None:
        """Troca as sub-redes in-place (quem guarda a referência vê a mudança).

        Tudo é validado e calculado antes da troca: se uma rede é inválida, nada muda.
        Lista vazia é permitida e recusa todo destino.
        """
        redes = tuple(sub_redes)
        for rede in redes:
            self._checar_sub_rede(rede)
        reservados = frozenset(a for r in redes for a in (r.network_address, r.broadcast_address))
        self._sub_redes, self._reservados = redes, reservados

    @staticmethod
    def _checar_sub_rede(rede: IPv4Network) -> IPv4Network:
        if not isinstance(rede, IPv4Network):
            raise DestinoProibido("Sub-rede inválida: esperado IPv4Network.")
        if not any(rede.subnet_of(privada) for privada in _RFC1918):
            raise DestinoProibido("A sub-rede deve ser privada (RFC 1918).")
        if not _PREFIXO_MIN <= rede.prefixlen <= _PREFIXO_MAX:
            raise DestinoProibido(
                f"O prefixo da sub-rede deve ficar entre /{_PREFIXO_MIN} e /{_PREFIXO_MAX}."
            )
        return rede

    @staticmethod
    def validar_sub_rede(cidr: str) -> IPv4Network:
        try:
            rede = IPv4Network(cidr, strict=True)
        except ValueError as e:
            raise DestinoProibido(f"Sub-rede inválida: {cidr!r}.") from e
        return Guarda._checar_sub_rede(rede)

    def validar(
        self, ip: str | IPv4Address, porta: int | None, protocolo: Protocolo
    ) -> DestinoAutorizado:
        endereco = self._parse_ip(ip)
        self._checar_protocolo_porta(porta, protocolo)
        self._checar_endereco(endereco)
        return DestinoAutorizado(endereco, porta, protocolo, _TOKEN)

    def validar_externo(self, nome: str, ip: str | IPv4Address) -> DestinoExterno:
        """Destino nomeado na internet com o IP resolvido; IP privado é aceito (rede com DNS
        próprio ou proxy transparente), as sub-redes declaradas não se aplicam."""
        alvo = _EXTERNOS.get(nome) if isinstance(nome, str) else None
        if alvo is None:
            raise DestinoProibido("Destino externo não permitido.")
        endereco = self._parse_ip(ip)
        if not self._checar_especiais(endereco):
            if endereco in _ESTE_HOST:
                raise DestinoProibido("Endereço 0.0.0.0/8 não é permitido.")
            if endereco.is_reserved:
                raise DestinoProibido("Endereço reservado não é permitido.")
        host, porta = alvo
        return DestinoExterno(cast(NomeExterno, nome), host, porta, endereco, _TOKEN)

    @staticmethod
    def _parse_ip(ip: str | IPv4Address) -> IPv4Address:
        if isinstance(ip, IPv4Address):
            return ip
        if not isinstance(ip, str):
            raise DestinoProibido("Endereço IP inválido.")
        try:
            return IPv4Address(ip)
        except AddressValueError as e:
            if ":" in ip:
                raise DestinoProibido("IPv6 não é suportado na v1 (somente IPv4).") from e
            raise DestinoProibido("Endereço IPv4 inválido.") from e

    @staticmethod
    def _checar_protocolo_porta(porta: int | None, protocolo: str) -> None:
        if protocolo not in _PROTOCOLOS:
            raise DestinoProibido("Protocolo não permitido.")
        if porta is None:
            if protocolo in _PROTOCOLOS_COM_PORTA:
                raise DestinoProibido("Este protocolo exige uma porta.")
            return
        if protocolo == "icmp":
            raise DestinoProibido("ICMP não usa porta.")
        if isinstance(porta, bool) or not isinstance(porta, int) or not 1 <= porta <= 65535:
            raise DestinoProibido("Porta fora do intervalo 1-65535.")

    def _checar_endereco(self, ip: IPv4Address) -> None:
        if self._checar_especiais(ip):
            return
        if not any(ip in r for r in self._sub_redes):
            raise DestinoProibido("Destino fora das sub-redes declaradas.")
        if ip in self._reservados:
            raise DestinoProibido("Endereço de rede ou broadcast de sub-rede não é permitido.")

    def _checar_especiais(self, ip: IPv4Address) -> bool:
        """Loopback (salvo 127.0.0.1 com ``permitir_loopback``), broadcast global, 0.0.0.0,
        multicast e link-local: recusados para qualquer destino, interno ou externo.
        Devolve ``True`` para o loopback de teste (aceito sem as demais regras)."""
        if ip.is_loopback:
            if self._permitir_loopback and ip == _LOOPBACK_TESTE:
                return True
            raise DestinoProibido("Loopback não é permitido.")
        if ip == _BROADCAST_GLOBAL:
            raise DestinoProibido("Broadcast não é permitido.")
        if ip.is_unspecified:
            raise DestinoProibido("Endereço não especificado (0.0.0.0) não é permitido.")
        if ip.is_multicast:
            raise DestinoProibido("Multicast não é permitido.")
        if ip.is_link_local:
            raise DestinoProibido("Endereço link-local não é permitido.")
        return False
