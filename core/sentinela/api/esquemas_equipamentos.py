"""Esquemas de entrada/saída da API de equipamentos."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from sentinela.api.comum import normalizar_mac
from sentinela.db.modelos import Equipamento, Evento

Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Mac = Annotated[str, StringConstraints(max_length=32), AfterValidator(normalizar_mac)]
Ip = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=45)]
ChaveClasse = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
TipoChecagem = Literal["icmp", "tcp", "http"]
EstadoFiltro = Literal["desconhecido", "online", "instavel", "suspeito", "offline", "pausado"]


class EquipamentoEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: Nome
    ip: Ip
    mac: Mac | None = None
    classe: ChaveClasse
    checagem: TipoChecagem = "icmp"
    porta: int | None = None


class EquipamentoEdicao(BaseModel):
    """Campos ausentes não mudam; ``mac``/``porta`` com null são apagados."""

    model_config = ConfigDict(extra="forbid")

    nome: Nome | None = None
    ip: Ip | None = None
    mac: Mac | None = None
    classe: ChaveClasse | None = None
    checagem: TipoChecagem | None = None
    porta: int | None = None


class EquipamentoSaida(BaseModel):
    id: str
    nome: str
    ip: str
    mac: str | None
    fabricante: str | None
    classe: str
    classe_origem: str
    checagem: str
    porta: int | None
    estado: str
    estado_desde: datetime
    latencia_ms: float | None
    pausado: bool
    criado_em: datetime
    visto_em: datetime | None

    @classmethod
    def de(cls, eq: Equipamento, classe_slug: str) -> "EquipamentoSaida":
        return cls(
            id=eq.id,
            nome=eq.nome,
            ip=eq.ip,
            mac=eq.mac,
            fabricante=eq.fabricante,
            classe=classe_slug,
            classe_origem=eq.classe_origem,
            checagem=eq.checagem,
            porta=eq.porta,
            estado=eq.estado,
            estado_desde=eq.estado_desde,
            latencia_ms=eq.latencia_ms,
            pausado=eq.pausado,
            criado_em=eq.criado_em,
            visto_em=eq.visto_em,
        )


class Pagina(BaseModel):
    itens: list[EquipamentoSaida]
    total: int


class EventoSaida(BaseModel):
    id: int
    de: str
    para: str
    em: datetime
    duracao_s: float | None
    causa: str | None

    @classmethod
    def de_linha(cls, ev: Evento) -> "EventoSaida":
        return cls(
            id=ev.id, de=ev.de, para=ev.para, em=ev.em, duracao_s=ev.duracao_s, causa=ev.causa
        )


class ErroLinha(BaseModel):
    linha: int
    motivo: str


class ResultadoImportacao(BaseModel):
    importados: int
    erros: list[ErroLinha] = Field(default_factory=list)  # só as primeiras ``MAX_ERROS``
    total_erros: int = 0  # todas as linhas com erro, inclusive as que não vieram em ``erros``
