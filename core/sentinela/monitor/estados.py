"""Máquina de estados de um equipamento, com histerese (sem I/O)."""

from dataclasses import dataclass
from enum import StrEnum

FALHAS_PARA_OFFLINE = 3
OKS_PARA_VOLTAR_DE_OFFLINE = 2
OKS_NORMAIS_PARA_SAIR_DE_INSTAVEL = 3


class Estado(StrEnum):
    DESCONHECIDO = "desconhecido"
    ONLINE = "online"
    INSTAVEL = "instavel"
    SUSPEITO = "suspeito"
    OFFLINE = "offline"
    PAUSADO = "pausado"


@dataclass(frozen=True)
class ResultadoChecagem:
    ok: bool
    latencia_ms: float | None
    erro: str | None = None


@dataclass(frozen=True)
class Transicao:
    de: Estado
    para: Estado


class MaquinaEstados:
    def __init__(
        self,
        estado: Estado = Estado.DESCONHECIDO,
        latencia_instavel_ms: float = 200.0,
    ) -> None:
        self._estado = estado
        self._limite = latencia_instavel_ms
        self._falhas = 0
        self._oks = 0

    @property
    def estado(self) -> Estado:
        return self._estado

    @property
    def precisa_confirmar(self) -> bool:
        return self._estado is Estado.SUSPEITO

    def _zerar(self) -> None:
        self._falhas = 0
        self._oks = 0

    def _ir_para(self, novo: Estado) -> Transicao | None:
        if novo is self._estado:
            return None
        antigo = self._estado
        self._estado = novo
        return Transicao(antigo, novo)

    def _lento(self, r: ResultadoChecagem) -> bool:
        return r.latencia_ms is not None and r.latencia_ms > self._limite

    def aplicar(self, r: ResultadoChecagem) -> Transicao | None:
        if self._estado is Estado.PAUSADO:
            return None
        if r.ok:
            return self._aplicar_ok(self._lento(r))
        return self._aplicar_falha()

    def _aplicar_ok(self, lento: bool) -> Transicao | None:
        self._falhas = 0
        alvo = Estado.INSTAVEL if lento else Estado.ONLINE
        if self._estado is Estado.OFFLINE:
            self._oks += 1
            if self._oks < OKS_PARA_VOLTAR_DE_OFFLINE:
                return None
            self._zerar()
            return self._ir_para(alvo)
        if self._estado is Estado.INSTAVEL and not lento:
            self._oks += 1
            if self._oks < OKS_NORMAIS_PARA_SAIR_DE_INSTAVEL:
                return None
            self._zerar()
            return self._ir_para(Estado.ONLINE)
        self._zerar()
        return self._ir_para(alvo)

    def _aplicar_falha(self) -> Transicao | None:
        self._oks = 0
        if self._estado is Estado.OFFLINE:
            return None
        if self._estado in (Estado.ONLINE, Estado.INSTAVEL, Estado.DESCONHECIDO):
            self._falhas = 1
            return self._ir_para(Estado.SUSPEITO)
        self._falhas += 1
        if self._falhas >= FALHAS_PARA_OFFLINE:
            return self._ir_para(Estado.OFFLINE)
        return None

    def pausar(self) -> Transicao | None:
        self._zerar()
        return self._ir_para(Estado.PAUSADO)

    def retomar(self) -> Transicao | None:
        if self._estado is not Estado.PAUSADO:
            return None
        self._zerar()
        return self._ir_para(Estado.DESCONHECIDO)
