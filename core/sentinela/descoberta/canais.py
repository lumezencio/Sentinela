"""Leitura periódica do estado dos canais dos gravadores (câmeras atrás de NVR/DVR).

Quem decide o estado de uma câmera atrás de um gravador é esta leitura (spec §9.7): a câmera
nunca é contatada; o único socket é para o host do gravador, validado pela Guarda dentro da
fonte. Cada canal vira uma amostra ok/falha entregue a ``Agendador.aplicar_externo`` (mesma
máquina de estados e histerese da Fase 1). Canal ausente da resposta conta como falha daquele
filho. Se a leitura de um gravador falhar (erro, exceção ou tempo esgotado), **só** os filhos
daquele gravador vão para ``desconhecido`` com causa "gravador sem resposta"
(``forcar_desconhecido``); os demais gravadores seguem normalmente.

Ritmo: o intervalo da classe ``camera`` (mínimo 15 s), relido a cada ciclo. Alvos passivos
**não** têm a reconfirmação rápida de 5 s do agendador: uma câmera suspeita só é reavaliada
na próxima leitura de canais, então chegar a ``offline`` leva 3 leituras (≈ 2 intervalos).

Custo: 1 ficha de prioridade **normal** por gravador por ciclo (spec §9.6). Só são lidos
gravadores de fontes ativas (``hikvision``/``dahua``) com ao menos um equipamento filho
aprovado e não pausado (``checagem == "gravador"``, ``pai_id`` = ``fonte.equipamento_id``).
O mapa gravador → filhos é relido do banco a cada ciclo, então câmeras aprovadas entram sem
reiniciar. Fonte sem coletor em ``fontes_por_id`` (ainda não instanciada) é pulada sem
alterar o estado dos filhos.

Certificado (spec §9.4, R7): se o gravador apresentar certificado não confiado ou diferente
do confiado, a fonte é **suspensa** (nenhuma leitura até ``retomar``, chamado quando o admin
confia de novo), ``fonte.ultimo_erro`` recebe o texto genérico e os filhos vão para
``desconhecido`` com causa própria (não "gravador sem resposta").

Robustez: uma exceção inesperada num ciclo é registrada (texto genérico) e o laço segue;
as leituras de um ciclo sempre terminam juntas (nenhuma fica órfã).
"""

import asyncio
import logging
from collections.abc import Mapping
from typing import Protocol

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Classe, Equipamento, Fonte
from sentinela.descoberta.fontes.base import CertificadoMudou, CertificadoNaoConfiado, ErroColeta
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.checagens import GRAVADOR
from sentinela.monitor.estados import ResultadoChecagem
from sentinela.monitor.limitador import Limitador
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

# "simulada": o gravador sintético do modo demonstração (nenhum socket)
TIPOS_GRAVADOR = ("hikvision", "dahua", "simulada")
CLASSE_CAMERA = "camera"
INTERVALO_MIN_S = 15.0
TIMEOUT_LEITURA_S = 15.0  # teto da leitura de um gravador (o cliente já tem 5 s por pedido)
CAUSA_GRAVADOR_MUDO = "gravador sem resposta"
CAUSA_CERTIFICADO_MUDOU = "certificado do gravador mudou"
CAUSA_CERTIFICADO_NAO_CONFIADO = "certificado do gravador ainda não confiado"
ERRO_CANAL_OFFLINE = "câmera offline no gravador"
ERRO_CANAL_AUSENTE = "canal ausente na resposta do gravador"

Filhos = list[tuple[str, int]]  # (equipamento_id, canal)


class LeitorStatus(Protocol):
    async def status_canais(self) -> dict[int, bool]: ...


class LeitorCanais:
    def __init__(
        self,
        sessoes: async_sessionmaker[AsyncSession],
        agendador: Agendador,
        fontes_por_id: Mapping[str, LeitorStatus],
        limitador: Limitador,
        relogio: Relogio,
        *,
        timeout_s: float = TIMEOUT_LEITURA_S,
    ) -> None:
        self._sessoes = sessoes
        self._agendador = agendador
        self._fontes = fontes_por_id  # mapa vivo, mantido por quem gerencia as fontes
        self._limitador = limitador
        self._relogio = relogio
        self._timeout = timeout_s
        self._filhos: dict[str, Filhos] = {}
        self._intervalo = INTERVALO_MIN_S
        self._suspensas: set[str] = set()

    def suspensa(self, fonte_id: str) -> bool:
        return fonte_id in self._suspensas

    def suspender(self, fonte_id: str, causa: str) -> None:
        """Para de ler o gravador e leva os filhos conhecidos a ``desconhecido`` com ``causa``."""
        self._suspensas.add(fonte_id)
        filhos = self._filhos.get(fonte_id, [])
        self._agendador.forcar_desconhecido([eq for eq, _ in filhos], causa)

    def retomar(self, fonte_id: str) -> None:
        """O admin confiou de novo no certificado (ou a fonte mudou): volta a ler."""
        self._suspensas.discard(fonte_id)

    async def executar(self) -> None:
        """Laço sem fim: um ciclo agora e depois a cada intervalo (sem acumular atraso)."""
        while True:
            inicio = self._relogio.agora()
            try:
                intervalo = await self.ciclo()
            except Exception as e:  # noqa: BLE001 - o laço nunca morre por um ciclo ruim
                log.error("ciclo da leitura de canais falhou: %s", type(e).__name__)
                intervalo = self._intervalo
            await self._relogio.dormir(max(0.0, inicio + intervalo - self._relogio.agora()))

    async def ciclo(self) -> float:
        """Relê o mapa do banco, lê todos os gravadores em paralelo; devolve o intervalo."""
        await self._recarregar()
        leituras = [
            self._ler(fonte_id, filhos)
            for fonte_id, filhos in self._filhos.items()
            if filhos and fonte_id in self._fontes and fonte_id not in self._suspensas
        ]
        if leituras:
            # todas terminam juntas: a falha de uma não deixa as outras órfãs
            for r in await asyncio.gather(*leituras, return_exceptions=True):
                if isinstance(r, BaseException):
                    log.error("leitura de canais falhou de forma inesperada: %s", type(r).__name__)
        return self._intervalo

    async def _recarregar(self) -> None:
        try:
            async with self._sessoes() as db:
                intervalo = await db.scalar(
                    select(Classe.intervalo_s).where(Classe.slug == CLASSE_CAMERA)
                )
                linhas = (
                    await db.execute(
                        select(Fonte.id, Equipamento.id, Equipamento.canal)
                        .join(Equipamento, Equipamento.pai_id == Fonte.equipamento_id)
                        .where(
                            Fonte.tipo.in_(TIPOS_GRAVADOR),
                            Fonte.ativa.is_(True),
                            Equipamento.checagem == GRAVADOR,
                            Equipamento.pausado.is_(False),
                            Equipamento.canal.is_not(None),
                        )
                    )
                ).all()
        except Exception:
            # banco indisponível: mantém o mapa e o intervalo do ciclo anterior
            log.exception("falha ao reler gravadores e câmeras; mantendo o mapa anterior")
            return
        filhos: dict[str, Filhos] = {}
        for fonte_id, equipamento_id, canal in linhas:
            if canal is not None:  # já filtrado na consulta; aqui só estreita o tipo
                filhos.setdefault(fonte_id, []).append((equipamento_id, canal))
        self._filhos = filhos
        self._intervalo = max(INTERVALO_MIN_S, float(intervalo or 0))

    async def _ler(self, fonte_id: str, filhos: Filhos) -> None:
        coletor = self._fontes.get(fonte_id)
        if coletor is None:
            return
        await self._limitador.adquirir(1, prioridade="normal")
        try:
            async with asyncio.timeout(self._timeout):
                estados = await coletor.status_canais()
        except (CertificadoMudou, CertificadoNaoConfiado) as e:
            log.warning("leitura de canais suspensa: certificado (fonte %s)", fonte_id)
            mudou = isinstance(e, CertificadoMudou)
            self.suspender(
                fonte_id, CAUSA_CERTIFICADO_MUDOU if mudou else CAUSA_CERTIFICADO_NAO_CONFIADO
            )
            await self._registrar_erro(fonte_id, str(e))
            return
        except (ErroColeta, TimeoutError):
            log.warning("leitura de canais sem resposta (fonte %s)", fonte_id)
            self._agendador.forcar_desconhecido([eq for eq, _ in filhos], CAUSA_GRAVADOR_MUDO)
            return
        except Exception as e:  # noqa: BLE001 - um gravador com defeito não derruba os outros
            log.warning("leitura de canais falhou (fonte %s): %s", fonte_id, type(e).__name__)
            self._agendador.forcar_desconhecido([eq for eq, _ in filhos], CAUSA_GRAVADOR_MUDO)
            return
        for equipamento_id, canal in filhos:
            online = estados.get(canal)
            if online:
                r = ResultadoChecagem(ok=True, latencia_ms=None)
            else:
                erro = ERRO_CANAL_AUSENTE if online is None else ERRO_CANAL_OFFLINE
                r = ResultadoChecagem(ok=False, latencia_ms=None, erro=erro)
            self._agendador.aplicar_externo(equipamento_id, r)

    async def _registrar_erro(self, fonte_id: str, erro: str) -> None:
        """Grava o texto genérico em ``fonte.ultimo_erro`` (falha do banco só vai ao log)."""
        try:
            async with self._sessoes() as db:
                await db.execute(update(Fonte).where(Fonte.id == fonte_id).values(ultimo_erro=erro))
                await db.commit()
        except Exception as e:  # noqa: BLE001
            log.error("falha ao registrar erro da fonte %s: %s", fonte_id, type(e).__name__)
