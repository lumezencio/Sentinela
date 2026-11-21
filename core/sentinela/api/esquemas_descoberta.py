"""Esquemas de entrada/saída da API da descoberta (fontes, descobertas, varredura, ajustes).

Credencial só ENTRA (por tipo, campos fechados e comprimentos limitados) e nunca sai: a saída
da fonte diz apenas ``credencial_definida``. Os erros 422 não ecoam a entrada (o tratador
global de ``main`` tira ``input`` e ``ctx``).
"""

from datetime import datetime
from typing import Annotated, Any, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StringConstraints, model_validator

from sentinela.db.modelos import Descoberta, Fonte
from sentinela.seguranca.cofre import Cofre, ErroCofre

TipoFonte = Literal["mikrotik", "snmp", "hikvision", "dahua"]
StatusDescoberta = Literal["pendente", "aprovada", "ignorada"]

NomeFonte = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
Host = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=45)]
Usuario = Annotated[str, StringConstraints(min_length=1, max_length=64)]
Segredo = Annotated[str, StringConstraints(min_length=1, max_length=128)]
SegredoV3 = Annotated[str, StringConstraints(min_length=8, max_length=128)]  # mínimo do USM
# impressão SHA-256 do certificado: exatamente 64 hex minúsculos (ASCII), nada mais
Impressao = Annotated[str, StringConstraints(max_length=64, pattern=r"^[0-9a-f]{64}$")]
IdDescoberta = Annotated[str, StringConstraints(pattern=r"^[0-9a-f-]{36}$")]
ChaveClasse = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)]
NomeEquip = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]

MSG_CREDENCIAL_TIPO = "credencial incompatível com o tipo da fonte"
MSG_NULO = "campo não pode ser nulo"
MAX_LOTE = 200


# ---- credenciais (só entrada) -------------------------------------------------------------


class _Fechado(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CredUsuarioSenha(_Fechado):
    """MikroTik (API RouterOS) e gravadores Hikvision/Dahua."""

    usuario: Usuario
    senha: Segredo


class CredSnmpV2c(_Fechado):
    versao: Literal["2c"]
    comunidade: Segredo


class CredSnmpV3(_Fechado):
    versao: Literal["3"]
    usuario: Usuario
    auth: Literal["SHA", "SHA256"]
    senha_auth: SegredoV3
    priv: Literal["AES", "AES256"] | None = None
    senha_priv: SegredoV3 | None = None

    @model_validator(mode="after")
    def _priv_com_senha(self) -> Self:
        if (self.priv is None) != (self.senha_priv is None):
            raise ValueError("priv e senha_priv vão juntos")
        return self


Credencial = Annotated[
    CredUsuarioSenha | CredSnmpV2c | CredSnmpV3, Field(union_mode="left_to_right")
]


def credencial_combina(tipo: str, credencial: BaseModel) -> bool:
    if tipo == "snmp":
        return isinstance(credencial, CredSnmpV2c | CredSnmpV3)
    return isinstance(credencial, CredUsuarioSenha)


def credencial_em_texto(credencial: BaseModel) -> dict[str, str]:
    """Dicionário que vai ao cofre (só campos preenchidos, todos texto)."""
    return {k: str(v) for k, v in credencial.model_dump(exclude_none=True).items()}


# ---- fontes -------------------------------------------------------------------------------


class FonteEntrada(_Fechado):
    tipo: TipoFonte
    nome: NomeFonte
    host: Host
    porta: int | None = Field(default=None, ge=1, le=65535)
    tls: bool = True
    ativa: bool = True
    intervalo_s: int = Field(default=600, ge=300, le=3600)
    credencial: Credencial

    @model_validator(mode="after")
    def _credencial_do_tipo(self) -> Self:
        if not credencial_combina(self.tipo, self.credencial):
            raise ValueError(MSG_CREDENCIAL_TIPO)
        return self


class FonteEdicao(_Fechado):
    """Campos ausentes não mudam; sem ``credencial`` a antiga é mantida. O tipo não muda."""

    nome: NomeFonte | None = None
    host: Host | None = None
    porta: int | None = Field(default=None, ge=1, le=65535)
    tls: bool | None = None
    ativa: bool | None = None
    intervalo_s: int | None = Field(default=None, ge=300, le=3600)
    credencial: Credencial | None = None

    @model_validator(mode="after")
    def _sem_nulos(self) -> Self:
        if any(getattr(self, campo) is None for campo in self.model_fields_set):
            raise ValueError(MSG_NULO)
        return self


def _ilegivel(f: Fonte, cofre: Cofre | None) -> bool:
    if cofre is None or not f.credencial_cifrada:
        return False
    try:
        cofre.decifrar(f.credencial_cifrada)
    except ErroCofre:
        return True
    return False


class FonteSaida(BaseModel):
    id: str
    tipo: str
    nome: str
    host: str
    porta: int
    tls: bool
    ativa: bool
    intervalo_s: int
    impressao_tls: str | None
    ultima_coleta: datetime | None
    ultimo_erro: str | None
    equipamento_id: str | None
    credencial_definida: bool
    # a credencial existe mas não abre com a chave atual (banco restaurado de outra instalação)
    credencial_ilegivel: bool = False

    @classmethod
    def de(cls, f: Fonte, cofre: Cofre | None = None) -> "FonteSaida":
        return cls(
            id=f.id,
            tipo=f.tipo,
            nome=f.nome,
            host=f.host,
            porta=f.porta,
            tls=f.tls,
            ativa=f.ativa,
            intervalo_s=f.intervalo_s,
            impressao_tls=f.impressao_tls,
            ultima_coleta=f.ultima_coleta,
            ultimo_erro=f.ultimo_erro,
            equipamento_id=f.equipamento_id,
            credencial_definida=bool(f.credencial_cifrada),
            credencial_ilegivel=_ilegivel(f, cofre),
        )


class TesteSaida(BaseModel):
    ok: bool
    identidade: str | None
    versao: str | None
    avisos: list[str]
    impressao_tls: str | None
    erro: str | None


class ConfiarEntrada(_Fechado):
    impressao: Impressao


# ---- descobertas --------------------------------------------------------------------------


class SinalSaida(BaseModel):
    descricao: str
    pontos: dict[str, int]


class OrigemSaida(BaseModel):
    origem: str
    fonte_id: str | None


class DescobertaSaida(BaseModel):
    id: str
    ip: str
    mac: str | None
    fabricante: str | None
    nome_sugerido: str | None
    classe_sugerida: str | None
    confianca: float
    sinais: list[SinalSaida]
    origens: list[OrigemSaida]
    status: str
    fora_das_subredes: bool
    conflito_com_nome: str | None
    pai_equipamento_id: str | None
    canal: int | None
    # câmera de gravador: id da fonte do gravador (para agrupar antes de o gravador ser aprovado)
    gravador_fonte_id: str | None
    primeira_vez: datetime
    ultima_vez: datetime

    @classmethod
    def de(cls, d: Descoberta, conflito_com_nome: str | None = None) -> "DescobertaSaida":
        gravador = d.chave.split(":", 2)[1] if d.chave.startswith("nvr:") else None
        return cls(
            id=d.id,
            ip=d.ip,
            mac=d.mac,
            fabricante=d.fabricante,
            nome_sugerido=d.nome_sugerido,
            classe_sugerida=d.classe_sugerida,
            confianca=d.confianca,
            sinais=_sinais(d.sinais),
            origens=_origens(d.origens),
            status=d.status,
            fora_das_subredes=d.fora_das_subredes,
            conflito_com_nome=conflito_com_nome,
            pai_equipamento_id=d.pai_equipamento_id,
            canal=d.canal,
            gravador_fonte_id=gravador,
            primeira_vez=d.primeira_vez,
            ultima_vez=d.ultima_vez,
        )


def _sinais(sinais: Any) -> list[SinalSaida]:
    """Os motivos gravados pelo classificador (``sinais["motivos"]``), tolerante a linha
    antiga ou editada à mão."""
    motivos = sinais.get("motivos") if isinstance(sinais, dict) else None
    saida: list[SinalSaida] = []
    for m in motivos if isinstance(motivos, list) else []:
        if not isinstance(m, dict) or not isinstance(m.get("descricao"), str):
            continue
        pontos = m.get("pontos")
        if not isinstance(pontos, dict):
            continue
        validos = {
            str(k): v for k, v in pontos.items() if isinstance(v, int) and not isinstance(v, bool)
        }
        saida.append(SinalSaida(descricao=m["descricao"][:200], pontos=validos))
    return saida


def _origens(origens: Any) -> list[OrigemSaida]:
    saida: list[OrigemSaida] = []
    for o in origens if isinstance(origens, list) else []:
        if isinstance(o, dict) and o.get("origem") is not None:
            fonte = o.get("fonte_id")
            saida.append(
                OrigemSaida(
                    origem=str(o["origem"])[:32],
                    fonte_id=str(fonte)[:36] if fonte is not None else None,
                )
            )
    return saida


class PaginaDescobertas(BaseModel):
    itens: list[DescobertaSaida]
    total: int


class AprovarEntrada(_Fechado):
    classe: ChaveClasse | None = None
    nome: NomeEquip | None = None


class LoteEntrada(_Fechado):
    ids: list[IdDescoberta] = Field(min_length=1, max_length=MAX_LOTE)


class Recusa(BaseModel):
    id: str
    motivo: str


class LoteSaida(BaseModel):
    aprovadas: list[str]  # ids das descobertas aprovadas (R4: ids são UUID em texto)
    recusadas: list[Recusa]


# ---- varredura e ajustes ------------------------------------------------------------------


class VarreduraEntrada(_Fechado):
    sub_rede_id: int = Field(ge=1)


class VarreduraSaida(BaseModel):
    rodando: bool
    progresso: dict[str, Any] | None


class AjustesSaida(BaseModel):
    aprovacao_automatica: bool
    limiar_aprovacao: float
    intervalo_varredura_ips_s: float
    varredura_continua_min: int


class AjustesEdicao(_Fechado):
    """Aprovação automática, limiar e intervalo da varredura contínua mudam pela API (o ritmo
    por IP da varredura é fixo)."""

    aprovacao_automatica: bool | None = None
    limiar_aprovacao: float | None = Field(default=None, ge=0.5, le=1.0)
    varredura_continua_min: StrictInt | None = Field(default=None, ge=15, le=240)

    @model_validator(mode="after")
    def _sem_nulos(self) -> Self:
        if any(getattr(self, campo) is None for campo in self.model_fields_set):
            raise ValueError(MSG_NULO)
        return self
