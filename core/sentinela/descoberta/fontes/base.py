"""Contrato comum das fontes de descoberta: ``Achado``, ``ResultadoTeste`` e ``Coletor``."""

from dataclasses import dataclass, field
from typing import Literal, Protocol, runtime_checkable

Origem = Literal[
    "arp",
    "dhcp",
    "vizinho",
    "wifi",
    "snmp_arp",
    "snmp_fdb",
    "lldp",
    "gravador_canal",
    "gravador",
    "varredura",
    "simulada",
]


class ErroColeta(Exception):
    """Falha de uma fonte. A mensagem é sempre genérica, em português, e pode ser guardada em
    ``fonte.ultimo_erro``: nunca carrega usuário, senha nem resposta bruta do aparelho."""


MSG_NAO_CONFIADO = "certificado do aparelho ainda não confiado"
MSG_MUDOU = "certificado do aparelho mudou"


class CertificadoNaoConfiado(ErroColeta):
    """TLS sem impressão confiada ainda (spec §9.4): ``impressao`` é a SHA-256 (hex) do
    certificado apresentado, para o admin conferir e confiar. Nenhuma credencial saiu."""

    def __init__(self, impressao: str) -> None:
        super().__init__(MSG_NAO_CONFIADO)
        self.impressao = impressao


class CertificadoMudou(ErroColeta):
    """A impressão apresentada difere da confiada: coleta bloqueada até nova confirmação."""

    def __init__(self, impressao: str) -> None:
        super().__init__(MSG_MUDOU)
        self.impressao = impressao


@dataclass(frozen=True)
class Achado:
    """Um aparelho visto por uma fonte. Textos já passaram por ``texto.limpar``; o MAC, se
    houver, está normalizado (``02:00:00:0a:0b:0c``)."""

    ip: str | None
    mac: str | None
    origem: Origem
    fonte_id: str  # id (UUID) do modelo ``Fonte``
    nome: str | None = None
    fabricante: str | None = None
    pai_fonte_id: str | None = None
    canal: int | None = None
    sinais: dict[str, str] = field(default_factory=dict)


@dataclass
class ResultadoTeste:
    ok: bool
    identidade: str | None = None
    versao: str | None = None
    avisos: list[str] = field(default_factory=list)
    impressao_tls: str | None = None
    erro: str | None = None


@runtime_checkable
class Coletor(Protocol):
    """O que toda fonte oferece ao orquestrador (R1: não colide com o modelo ``Fonte``)."""

    async def coletar(self) -> list[Achado]: ...

    async def testar(self) -> ResultadoTeste: ...


@runtime_checkable
class ComUptime(Protocol):
    """Fonte que, na mesma coleta, também lê o tempo ligado do próprio equipamento (segundos).
    ``None`` quando o aparelho não informou ou a leitura falhou; nunca afeta a coleta."""

    ultimo_uptime_s: float | None
