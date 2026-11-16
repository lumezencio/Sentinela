"""Guarda de rede: ponto único de passagem de todo destino de saída.

Recusa broadcast, multicast, loopback, link-local e qualquer endereço fora das
sub-redes privadas declaradas pelo administrador. Só a Guarda consegue criar um
``DestinoAutorizado``; as camadas de envio exigem esse objeto.
"""

from collections.abc import Iterable
from dataclasses import dataclass, field
from ipaddress import AddressValueError, IPv4Address, IPv4Network
from typing import Literal, get_args

Protocolo = Literal["icmp", "tcp", "http"]

_PROTOCOLOS: tuple[str, ...] = get_args(Protocolo)
_PROTOCOLOS_COM_PORTA: frozenset[str] = frozenset({"tcp", "http"})
_RFC1918 = (
    IPv4Network("10.0.0.0/8"),
    IPv4Network("172.16.0.0/12"),
    IPv4Network("192.168.0.0/16"),
)
_PREFIXO_MIN = 16
_PREFIXO_MAX = 30

# Sentinela privada do módulo: só a Guarda a conhece.
_TOKEN = object()


class DestinoProibido(ValueError):
    """Destino recusado pela Guarda; ``motivo`` explica em português."""

    def __init__(self, motivo: str) -> None:
        super().__init__(motivo)
        self.motivo = motivo


@dataclass(frozen=True)
class DestinoAutorizado:
    """Destino validado. Não pode ser construído fora da Guarda."""

    ip: IPv4Address
    porta: int | None
    protocolo: Protocolo
    _token: object = field(repr=False, compare=False)

    def __post_init__(self) -> None:
        if self._token is not _TOKEN:
            raise TypeError("DestinoAutorizado só pode ser criado pela Guarda")


class Guarda:
    def __init__(self, sub_redes: Iterable[IPv4Network], permitir_loopback: bool = False) -> None:
        self._sub_redes: tuple[IPv4Network, ...] = tuple(sub_redes)
        self._permitir_loopback = permitir_loopback

    @staticmethod
    def validar_sub_rede(cidr: str) -> IPv4Network:
        try:
            rede = IPv4Network(cidr, strict=True)
        except ValueError as e:
            raise DestinoProibido(f"Sub-rede inválida: {cidr!r}.") from e
        if not any(rede.subnet_of(privada) for privada in _RFC1918):
            raise DestinoProibido("A sub-rede deve ser privada (RFC 1918).")
        if not _PREFIXO_MIN <= rede.prefixlen <= _PREFIXO_MAX:
            raise DestinoProibido(
                f"O prefixo da sub-rede deve ficar entre /{_PREFIXO_MIN} e /{_PREFIXO_MAX}."
            )
        return rede

    def validar(
        self, ip: str | IPv4Address, porta: int | None, protocolo: Protocolo
    ) -> DestinoAutorizado:
        endereco = self._parse_ip(ip)
        self._checar_protocolo_porta(porta, protocolo)
        self._checar_endereco(endereco)
        return DestinoAutorizado(endereco, porta, protocolo, _TOKEN)

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
        if isinstance(porta, bool) or not isinstance(porta, int) or not 1 <= porta <= 65535:
            raise DestinoProibido("Porta fora do intervalo 1-65535.")

    def _checar_endereco(self, ip: IPv4Address) -> None:
        if ip.is_loopback:
            if self._permitir_loopback:
                return
            raise DestinoProibido("Loopback não é permitido.")
        if ip == IPv4Address("255.255.255.255"):
            raise DestinoProibido("Broadcast não é permitido.")
        if ip.is_unspecified:
            raise DestinoProibido("Endereço não especificado (0.0.0.0) não é permitido.")
        if ip.is_multicast:
            raise DestinoProibido("Multicast não é permitido.")
        if ip.is_link_local:
            raise DestinoProibido("Endereço link-local não é permitido.")
        rede = next((r for r in self._sub_redes if ip in r), None)
        if rede is None:
            raise DestinoProibido("Destino fora das sub-redes declaradas.")
        if ip == rede.network_address:
            raise DestinoProibido("Endereço de rede da sub-rede não é permitido.")
        if ip == rede.broadcast_address:
            raise DestinoProibido("Broadcast da sub-rede não é permitido.")
