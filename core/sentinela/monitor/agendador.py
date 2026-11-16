"""Agendador das checagens: heap por horário, teto global, reconfirmação rápida e esticamento.

O tempo do agendamento vem só de ``relogio.agora()`` (monotônico). O relógio de parede
(``agora_parede``) é usado apenas para gravar e publicar horários.

Esticamento (R11/R12): se Σ(custo/intervalo) dos ativos passa da taxa do limitador, os
intervalos não críticos são multiplicados pelo menor fator que resolve, até
``ESTICAMENTO_MAX_NAO_CRITICOS`` (10×: 60 s viram 10 min). Se isso não basta, os não críticos
ficam em 10× e os críticos esticam também; acima de 10× para os críticos, todos usam o mesmo
fator.

Transições são publicadas na hora e gravadas por um único escritor serial (ordem garantida
por equipamento); o encerramento drena esse escritor antes de ``descarregar``.
"""

import asyncio
import heapq
import itertools
import logging
import math
import random
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import cast

from sentinela.barramento import Barramento, Mensagem
from sentinela.monitor.checagens import Checagem, checagem_para
from sentinela.monitor.estados import Estado, MaquinaEstados, ResultadoChecagem, Transicao
from sentinela.monitor.gravador import GravadorAmostras, GravadorSql
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, DestinoProibido, Guarda, Protocolo
from sentinela.relogio import Relogio

__all__ = ["Agendador", "Alvo", "GravadorAmostras", "GravadorSql"]

log = logging.getLogger(__name__)

JITTER = 0.2
RECONFIRMAR_S = 5.0
MAX_EM_VOO = 50
LOTE_LATENCIAS_S = 5.0
FOLGA_DETECCAO = 1.2  # pior caso do jitter
ESTICAMENTO_MAX_NAO_CRITICOS = 10.0  # 60 s -> 10 min antes de esticar também os críticos
PRIMEIRA_RAPIDA_S = 5.0  # alvo novo com o laço rodando: primeira checagem em até 5 s


@dataclass
class Alvo:
    id: str
    ip: str
    porta: int | None
    checagem: str
    intervalo_s: float
    critico: bool
    estado: Estado


@dataclass
class _Registro:
    alvo: Alvo
    destino: DestinoAutorizado
    checagem: Checagem
    maquina: MaquinaEstados
    versao: int = 0
    em_voo: bool = False
    reconfirmar: bool = False

    @property
    def ativo(self) -> bool:
        return self.maquina.estado is not Estado.PAUSADO

    @property
    def demanda(self) -> float:
        return self.checagem.custo / self.alvo.intervalo_s


class Agendador:
    def __init__(
        self,
        *,
        guarda: Guarda,
        limitador: Limitador,
        relogio: Relogio,
        barramento: Barramento,
        gravador: GravadorAmostras,
        checagens: Callable[[str], Checagem] = checagem_para,
        rng: random.Random | None = None,
        agora_parede: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._guarda = guarda
        self._limitador = limitador
        self._relogio = relogio
        self._barramento = barramento
        self._gravador = gravador
        self._checagens = checagens
        self._rng = rng or random.Random()  # noqa: S311 - jitter, não criptografia
        self._agora_parede = agora_parede
        self._registros: dict[str, _Registro] = {}
        self._heap: list[tuple[float, int, str]] = []
        self._vigente: dict[str, int] = {}  # id -> seq da entrada válida no heap
        self._seq = itertools.count()
        self._fator_critico = 1.0
        self._fator_nao_critico = 1.0
        self._em_voo = asyncio.Semaphore(MAX_EM_VOO)
        self._tarefas: set[asyncio.Task[None]] = set()  # checagens em voo
        self._transicoes: deque[tuple[str, Transicao, datetime, str | None]] = deque()
        self._escritor: asyncio.Task[None] | None = None  # único gravador de transições
        self._rodando = False
        self._sinal: asyncio.Future[None] | None = None
        self._lote: dict[str, float | None] = {}

    # ---- cadastro ---------------------------------------------------------------------------

    def adicionar(self, alvo: Alvo) -> None:
        if alvo.id in self._registros:
            self.atualizar(alvo)
            return
        autorizado = self._autorizar(alvo)
        if autorizado is None:
            return
        destino, checagem = autorizado
        inicial = Estado.ONLINE if alvo.estado is Estado.SUSPEITO else alvo.estado
        reg = _Registro(replace(alvo), destino, checagem, MaquinaEstados(inicial))
        self._registros[alvo.id] = reg
        self.recalcular()
        if reg.ativo:
            self._agendar_inicial(reg, rapido=self._rodando)

    def remover(self, id: str) -> None:
        if self._registros.pop(id, None) is not None:
            self._vigente.pop(id, None)
            self.recalcular()

    def atualizar(self, alvo: Alvo) -> None:
        reg = self._registros.get(alvo.id)
        if reg is None:
            self.adicionar(alvo)
            return
        autorizado = self._autorizar(alvo)
        if autorizado is None:
            self.remover(alvo.id)
            return
        reg.destino, reg.checagem = autorizado
        reg.alvo = replace(alvo, estado=reg.maquina.estado)
        reg.versao += 1  # resultado em voo é do destino antigo: descartado
        self.recalcular()
        if reg.ativo and not reg.em_voo:
            if reg.maquina.precisa_confirmar:
                self._agendar_proxima(reg)  # mantém a reconfirmação em 5 s com prioridade
            else:
                self._agendar_inicial(reg)

    def pausar(self, id: str, causa: str | None = None) -> None:
        reg = self._registros.get(id)
        if reg is None:
            return
        reg.versao += 1
        self._vigente.pop(id, None)
        self._transicao(id, reg.maquina.pausar(), causa=causa)
        self.recalcular()

    def retomar(self, id: str, causa: str | None = None) -> None:
        reg = self._registros.get(id)
        if reg is None:
            return
        t = reg.maquina.retomar()
        if t is None:
            return
        reg.versao += 1
        self._transicao(id, t, causa=causa)
        self.recalcular()
        if not reg.em_voo:
            self._agendar_inicial(reg)

    def estado_de(self, id: str) -> Estado | None:
        reg = self._registros.get(id)
        return None if reg is None else reg.maquina.estado

    def _autorizar(self, alvo: Alvo) -> tuple[DestinoAutorizado, Checagem] | None:
        try:
            destino = self._guarda.validar(alvo.ip, alvo.porta, cast(Protocolo, alvo.checagem))
            if not math.isfinite(alvo.intervalo_s) or alvo.intervalo_s <= 0:
                raise DestinoProibido("Intervalo de checagem inválido.")
            return destino, self._checagens(alvo.checagem)
        except (DestinoProibido, ValueError) as e:
            motivo = e.motivo if isinstance(e, DestinoProibido) else "Checagem inválida."
            self._barramento.publicar(Mensagem("alvo_recusado", {"id": alvo.id, "motivo": motivo}))
            return None

    # ---- orçamento ----------------------------------------------------------------------------

    def recalcular(self) -> None:
        """Recalcula o esticamento (chamar também depois de ``limitador.definir_taxa``)."""
        taxa = self._limitador.taxa
        ativos = [r for r in self._registros.values() if r.ativo]
        criticos = math.fsum(r.demanda for r in ativos if r.alvo.critico)
        demais = math.fsum(r.demanda for r in ativos if not r.alvo.critico)
        if criticos + demais <= taxa:
            self._fator_critico, self._fator_nao_critico = 1.0, 1.0
        elif criticos < taxa and demais / (taxa - criticos) <= ESTICAMENTO_MAX_NAO_CRITICOS:
            self._fator_critico, self._fator_nao_critico = 1.0, demais / (taxa - criticos)
        else:
            resto = taxa - demais / ESTICAMENTO_MAX_NAO_CRITICOS
            fator = criticos / resto if resto > 0 else math.inf
            if fator <= ESTICAMENTO_MAX_NAO_CRITICOS:
                self._fator_critico, self._fator_nao_critico = fator, ESTICAMENTO_MAX_NAO_CRITICOS
            else:
                igual = (criticos + demais) / taxa
                self._fator_critico, self._fator_nao_critico = igual, igual

    def intervalo_efetivo(self, id: str) -> float | None:
        reg = self._registros.get(id)
        return None if reg is None else self._intervalo(reg)

    def _intervalo(self, reg: _Registro) -> float:
        fator = self._fator_critico if reg.alvo.critico else self._fator_nao_critico
        return reg.alvo.intervalo_s * fator

    def tempo_max_deteccao_s(self) -> float:
        ativos = [r for r in self._registros.values() if r.ativo]
        base = [r for r in ativos if r.alvo.critico] or ativos
        if not base:
            return 0.0
        return max(self._intervalo(r) for r in base) * FOLGA_DETECCAO + 2 * RECONFIRMAR_S

    # ---- heap -------------------------------------------------------------------------------

    def _agendar(self, reg: _Registro, quando: float) -> None:
        seq = next(self._seq)
        self._vigente[reg.alvo.id] = seq
        heapq.heappush(self._heap, (quando, seq, reg.alvo.id))
        if self._sinal is not None and not self._sinal.done():
            self._sinal.set_result(None)

    def _agendar_inicial(self, reg: _Registro, rapido: bool = False) -> None:
        """Primeira checagem espalhada no intervalo (ou em até 5 s se ``rapido``)."""
        reg.reconfirmar = False
        janela = self._intervalo(reg)
        if rapido:
            janela = min(janela, PRIMEIRA_RAPIDA_S)
        self._agendar(reg, self._relogio.agora() + janela * self._rng.random())

    def _agendar_proxima(self, reg: _Registro) -> None:
        reg.reconfirmar = reg.maquina.precisa_confirmar
        if reg.reconfirmar:
            espera = RECONFIRMAR_S
        else:
            espera = self._intervalo(reg) * self._rng.uniform(1 - JITTER, 1 + JITTER)
        self._agendar(reg, self._relogio.agora() + espera)

    def _topo(self) -> tuple[float, int, str] | None:
        while self._heap:
            quando, seq, id = self._heap[0]
            if self._vigente.get(id) == seq:
                return self._heap[0]
            heapq.heappop(self._heap)  # entrada obsoleta (removido, pausado ou reagendado)
        return None

    # ---- execução ---------------------------------------------------------------------------

    async def executar(self) -> None:
        lote = asyncio.create_task(self._publicar_lotes())
        self._rodando = True
        try:
            while True:
                topo = self._topo()
                if topo is None:
                    await self._esperar(None)
                    continue
                falta = topo[0] - self._relogio.agora()
                if falta > 0:
                    await self._esperar(falta)
                    continue
                await self._em_voo.acquire()
                topo = self._topo()
                if topo is None or topo[0] > self._relogio.agora():
                    self._em_voo.release()
                    continue
                heapq.heappop(self._heap)
                id = topo[2]
                del self._vigente[id]
                self._lancar(self._registros[id])
        finally:
            self._rodando = False
            # blindado: um segundo cancelamento não pula a drenagem nem o descarregar
            await asyncio.shield(self._encerrar(lote))

    async def _encerrar(self, lote: asyncio.Task[None]) -> None:
        canceladas = [lote, *self._tarefas]
        for t in canceladas:
            t.cancel()
        await asyncio.gather(*canceladas, return_exceptions=True)
        self._preparar_reinicio()
        while self._escritor is not None and not self._escritor.done():
            await asyncio.gather(self._escritor, return_exceptions=True)
        try:
            await self._gravador.descarregar()
        except Exception:
            log.exception("falha ao descarregar amostras no encerramento")

    def _preparar_reinicio(self) -> None:
        """Checagens canceladas antes de começar não devolvem a vaga nem se reagendam."""
        self._em_voo = asyncio.Semaphore(MAX_EM_VOO)
        for id, reg in self._registros.items():
            reg.em_voo = False
            if reg.ativo and id not in self._vigente:
                self._agendar_inicial(reg)

    async def _esperar(self, segundos: float | None) -> None:
        """Dorme até o prazo ou até alguém agendar algo novo."""
        self._sinal = asyncio.get_running_loop().create_future()
        esperas: set[asyncio.Future[None]] = {self._sinal}
        dormir = None
        if segundos is not None:
            dormir = asyncio.ensure_future(self._relogio.dormir(segundos))
            esperas.add(dormir)
        try:
            await asyncio.wait(esperas, return_when=asyncio.FIRST_COMPLETED)
        finally:
            if dormir is not None:
                dormir.cancel()
            self._sinal = None

    def _lancar(self, reg: _Registro) -> None:
        reg.em_voo = True
        tarefa = asyncio.create_task(self._rodar(reg, reg.versao, reg.reconfirmar))
        self._tarefas.add(tarefa)
        tarefa.add_done_callback(self._tarefas.discard)

    async def _rodar(self, reg: _Registro, versao: int, prioritario: bool) -> None:
        try:
            await self._limitador.adquirir(reg.checagem.custo, prioritario=prioritario)
            if reg.versao != versao:  # pausado/alterado enquanto esperava token
                return
            r = await self._checar(reg)
            if reg.versao == versao and self._registros.get(reg.alvo.id) is reg:
                self._registrar(reg, r)
        except Exception:
            log.exception("falha inesperada na checagem (equipamento %s)", reg.alvo.id)
        finally:
            self._em_voo.release()
            reg.em_voo = False
            if self._registros.get(reg.alvo.id) is reg and reg.ativo:
                self._agendar_proxima(reg)

    async def _checar(self, reg: _Registro) -> ResultadoChecagem:
        try:
            return await reg.checagem.executar(reg.destino)
        except Exception:
            log.exception("checagem falhou de forma inesperada (equipamento %s)", reg.alvo.id)
            return ResultadoChecagem(ok=False, latencia_ms=None, erro="erro interno")

    def _registrar(self, reg: _Registro, r: ResultadoChecagem) -> None:
        id = reg.alvo.id
        em = self._agora_parede()
        self._lote[id] = r.latencia_ms
        try:
            self._gravador.acumular_amostra(id, r, em)
        except Exception:
            log.exception("falha ao acumular amostra (equipamento %s)", id)
        self._transicao(id, reg.maquina.aplicar(r), em)

    def _transicao(
        self,
        id: str,
        t: Transicao | None,
        em: datetime | None = None,
        causa: str | None = None,
    ) -> None:
        """Publica na hora e enfileira a gravação no escritor serial (sem ``await``: a vaga
        de checagem é liberada antes da escrita no banco e não há gravação perdida)."""
        if t is None:
            return
        if em is None:
            em = self._agora_parede()
        dados = {"id": id, "estado": t.para.value, "desde": em.isoformat()}
        self._barramento.publicar(Mensagem("estado", dados))
        self._transicoes.append((id, t, em, causa))
        if self._escritor is None or self._escritor.done():
            self._escritor = asyncio.get_running_loop().create_task(self._escrever())

    async def _escrever(self) -> None:
        while self._transicoes:
            id, t, em, causa = self._transicoes.popleft()
            try:
                await self._gravador.registrar_transicao(id, t, em, causa=causa)
            except Exception:
                log.exception("falha ao gravar transição (equipamento %s)", id)

    async def aguardar_gravacoes(self) -> None:
        """Espera o escritor serial esvaziar a fila (sem cancelá-lo se quem espera cair)."""
        while self._escritor is not None and not self._escritor.done():
            await asyncio.wait({self._escritor})

    async def _publicar_lotes(self) -> None:
        while True:
            await self._relogio.dormir(LOTE_LATENCIAS_S)
            if self._lote:
                lote = [[id, ms] for id, ms in self._lote.items()]
                self._lote = {}
                self._barramento.publicar(Mensagem("latencias", {"lote": lote}))
