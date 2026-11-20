"""Orquestrador da descoberta: roda cada fonte no seu intervalo, mescla, classifica e aprova.

- **Coleta**: a cada ``TICK_S`` relê as fontes do banco e coleta as vencidas (cada uma no
  seu ``intervalo_s``), em paralelo e cada uma isolada: falha de uma grava ``ultimo_erro``
  (texto genérico, credencial mascarada) e não para as outras. Exceção que não é
  ``ErroColeta`` vira ``MSG_COLETA_INESPERADA`` (nunca texto do aparelho nem traceback).
  "Coletar agora" no máximo 1 vez a cada 30 s por fonte.
- **Coletores**: um por fonte, recriado quando os campos de conexão mudam (host, porta, TLS,
  credencial, impressão). Fontes de gravador entram em ``gravadores`` (mapa vivo lido pelo
  ``LeitorCanais``). Certificado não confiado/trocado suspende a leitura de canais daquele
  gravador; quando a impressão confiada muda, o coletor é recriado e a leitura volta.
- **Aprovação**: cria o ``Equipamento`` (checagem sugerida: ``gravador`` para canal; ``icmp``
  se respondeu à varredura; ``tcp`` na primeira porta aberta da lista; senão ``icmp``) e o
  registra no agendador vivo pelo mesmo caminho do cadastro manual. Câmera cujo gravador
  ainda não foi aprovado aprova o gravador junto, na mesma transação, auditado (§9.3).
  Aprovação automática (desligada por padrão) só para pendentes dentro das sub-redes, sem
  conflito de IP, com classe conhecida e confiança ≥ limiar.
- **Barramento**: ``descoberta`` (``acao`` nova/atualizada/removida, ``id``,
  ``classe_sugerida``, ``confianca``), ``pendentes`` (``total``) e ``equipamento``
  (``criado`` por toda aprovação, manual ou automática, inclusive o gravador aprovado junto;
  ``atualizado`` quando o IP muda automaticamente).
- **Tetos**: no máximo ``MAX_ACHADOS_COLETA`` achados por coleta e ``mescla.MAX_PENDENTES``
  descobertas pendentes; acima disso o excesso é descartado e a fonte recebe o aviso genérico
  ``MSG_TRUNCADA`` em ``ultimo_erro``.
- **Sondagem em fundo** (§9.1 a): só se o IP ainda estiver numa sub-rede com
  ``permite_varredura`` quando ela vai rodar; o resultado só é gravado se a descoberta ainda
  estiver pendente e com o mesmo IP sondado.

Nenhum socket é aberto aqui: só os coletores (e a sondagem) falam com a rede, sempre por um
``DestinoAutorizado`` da Guarda.
"""

import asyncio
import functools
import logging
import uuid
from collections.abc import Awaitable, Callable, Coroutine, Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import (
    Auditoria,
    Classe,
    Config,
    Descoberta,
    Equipamento,
    Fonte,
    Usuario,
)
from sentinela.descoberta.ajustes import ler_ajustes
from sentinela.descoberta.canais import (
    CAUSA_CERTIFICADO_MUDOU,
    CAUSA_CERTIFICADO_NAO_CONFIADO,
    LeitorCanais,
    LeitorStatus,
)
from sentinela.descoberta.classificador.oui import BaseOui
from sentinela.descoberta.classificador.regras import CLASSE_DESCONHECIDA
from sentinela.descoberta.classificador.sondagem import PORTAS, sondar
from sentinela.descoberta.fontes.base import (
    Achado,
    CertificadoMudou,
    CertificadoNaoConfiado,
    Coletor,
    ErroColeta,
    ResultadoTeste,
)
from sentinela.descoberta.fontes.dahua import FonteDahua
from sentinela.descoberta.fontes.hikvision import FonteHikvision
from sentinela.descoberta.fontes.mikrotik import FonteMikrotik
from sentinela.descoberta.fontes.simulada import ColetorSimulado, perfil_simulado
from sentinela.descoberta.fontes.snmp import FonteSnmp
from sentinela.descoberta.mescla import (
    APROVADA,
    FONTE_VARREDURA,
    PENDENTE,
    ResultadoMescla,
    auditar_sistema,
    dentro_das_subredes,
    equipamento_por_ip,
    mesclar,
    na_rede,
    reclassificar,
    redes_com_varredura,
    sub_rede_com_linha_base,
)
from sentinela.descoberta.varredura import Ping, ping_icmp
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.checagens import GRAVADOR
from sentinela.monitor.limitador import Limitador
from sentinela.monitor.montagem import registrar_no_agendador
from sentinela.rede.guarda import DestinoProibido, Guarda
from sentinela.relogio import Relogio
from sentinela.seguranca.cofre import Cofre

log = logging.getLogger(__name__)

TICK_S = 5.0
COLETA_MIN_S = 30.0  # "coletar agora": no máximo 1 vez a cada 30 s por fonte
TIMEOUT_COLETA_S = 300.0  # teto de uma coleta inteira (cada pedido já tem o seu)
LIMITE_ERRO = 200
LIMITE_NOME = 80
MAX_ACHADOS_COLETA = 5_000  # teto por coleta: uma fonte hostil não enche o banco
TIPOS_GRAVADOR = ("hikvision", "dahua")

MSG_COLETA_INESPERADA = "falha inesperada na coleta"
MSG_GRAVAR = "falha ao gravar o resultado da coleta"
MSG_TESTE_INESPERADO = "falha inesperada ao testar a fonte"
MSG_TEMPO = "a fonte não respondeu a tempo"
MSG_FABRICA = "configuração da fonte inválida"
LINHA_BASE_FONTE = "fonte_base:"  # + id da fonte: a primeira coleta dela já passou
MSG_TRUNCADA = "coleta truncada: limite de aparelhos por coleta ou de pendentes atingido"
MSG_FORA = "IP fora das sub-redes monitoradas: declare a sub-rede antes de aprovar."
MSG_NAO_PENDENTE = "A descoberta não está pendente."
MSG_IP_EM_USO = "Já existe um equipamento com este IP."
MSG_MAC_EM_USO = "Já existe um equipamento com este MAC."
MSG_CLASSE = "Classe inexistente."
MSG_CONFLITO = "Conflito com outro equipamento."
MSG_SEM_GRAVADOR = "O gravador desta câmera não está mais cadastrado como fonte."
MSG_SONDAR_CANAL = "Câmera atrás de gravador não é sondada: o estado vem do gravador."
MSG_SONDAR_FALHOU = "Não foi possível sondar o aparelho."

FabricaColetor = Callable[[Fonte, Cofre, Guarda, Limitador], Coletor]
FuncaoSondar = Callable[[str, Guarda, Limitador], Awaitable[tuple[set[int], str | None]]]


class ErroDescoberta(Exception):
    """Recusa de uma ação da descoberta; a mensagem é fixa e pode ir ao cliente."""


class ColetaRecente(ErroDescoberta):
    def __init__(self, espera_s: float = COLETA_MIN_S) -> None:
        super().__init__("Coleta feita há menos de 30 s; aguarde.")
        self.espera_s = espera_s  # segundos até poder coletar de novo (Retry-After)


class FonteInexistente(ErroDescoberta):
    def __init__(self) -> None:
        super().__init__("Fonte não encontrada.")


class DescobertaInexistente(ErroDescoberta):
    def __init__(self) -> None:
        super().__init__("Descoberta não encontrada.")


class AprovacaoRecusada(ErroDescoberta):
    pass


class SondagemRecusada(ErroDescoberta):
    pass


def fabricar_coletor(fonte: Fonte, cofre: Cofre, guarda: Guarda, limitador: Limitador) -> Coletor:
    """Fábrica real: um coletor por tipo (``simulada`` nunca abre socket)."""
    tipos: dict[str, FabricaColetor] = {
        "mikrotik": FonteMikrotik,
        "snmp": FonteSnmp,
        "hikvision": FonteHikvision,
        "dahua": FonteDahua,
        "simulada": ColetorSimulado,
    }
    fabrica = tipos.get(fonte.tipo)
    if fabrica is None:
        raise ValueError("tipo de fonte desconhecido")
    return fabrica(fonte, cofre, guarda, limitador)


def e_gravador(fonte: Fonte) -> bool:
    if fonte.tipo in TIPOS_GRAVADOR:
        return True
    return fonte.tipo == "simulada" and perfil_simulado(fonte.tipo, fonte.porta) == "gravador"


def e_canal(d: Descoberta) -> bool:
    return d.canal is not None and d.chave.startswith("nvr:")


def _respondeu_icmp(d: Descoberta) -> bool:
    """Respondeu ao eco da varredura lenta (ICMP comprovado)."""
    return any(isinstance(o, dict) and o.get("origem") == "varredura" for o in d.origens or [])


def checagem_sugerida(d: Descoberta) -> tuple[str, int | None]:
    """``gravador`` para canal; ``icmp`` se respondeu à varredura (ICMP); senão ``tcp`` na
    primeira porta aberta da lista fixa; senão ``icmp`` (spec §5.2 e §9.1)."""
    if e_canal(d):
        return GRAVADOR, None
    if _respondeu_icmp(d):
        return "icmp", None
    abertas = (d.sinais or {}).get("portas")
    if isinstance(abertas, list):
        for porta in PORTAS:
            if porta in abertas:
                return "tcp", porta
    return "icmp", None


async def _existe(db: AsyncSession, equipamento_id: str | None) -> bool:
    return equipamento_id is not None and await db.get(Equipamento, equipamento_id) is not None


def _assinatura(fonte: Fonte) -> tuple[Any, ...]:
    return (
        fonte.tipo,
        fonte.host,
        fonte.porta,
        fonte.tls,
        fonte.credencial_cifrada,
        fonte.impressao_tls,
    )


@dataclass
class _Aprovacao:
    """O que aplicar depois do commit de uma aprovação."""

    equipamentos: list[tuple[Equipamento, Classe]] = field(default_factory=list)
    descobertas: list[str] = field(default_factory=list)
    # (equipamento, descoberta) cuja checagem icmp não veio de dado conhecido: §9.1 c
    verificar: list[tuple[str, str | None]] = field(default_factory=list)


class Orquestrador:
    def __init__(
        self,
        sessoes: async_sessionmaker[AsyncSession],
        guarda: Guarda,
        limitador: Limitador,
        barramento: Barramento,
        agendador: Agendador,
        cofre: Cofre,
        relogio: Relogio,
        fabrica_fontes: FabricaColetor = fabricar_coletor,
        *,
        sondar: FuncaoSondar = sondar,
        ping: Ping = ping_icmp,
        timeout_coleta_s: float = TIMEOUT_COLETA_S,
        oui: BaseOui | None = None,
        agora_parede: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._sessoes = sessoes
        self._guarda = guarda
        self._limitador = limitador
        self._barramento = barramento
        self._agendador = agendador
        self._cofre = cofre
        self._relogio = relogio
        self._fabrica = fabrica_fontes
        self._sondar = sondar
        self._ping = ping
        self._timeout_coleta = timeout_coleta_s
        self._oui = oui
        self._agora_parede = agora_parede
        # mapa vivo fonte_id -> coletor de gravador, lido pelo LeitorCanais
        self.gravadores: dict[str, LeitorStatus] = {}
        self.leitor_canais: LeitorCanais | None = None
        self._coletores: dict[str, tuple[tuple[Any, ...], Coletor]] = {}
        self._agenda: dict[str, float] = {}  # fonte ativa -> intervalo_s
        self._proxima: dict[str, float] = {}
        self._inicio: dict[str, float] = {}  # início da última coleta (relógio monotônico)
        self._travas: dict[str, asyncio.Lock] = {}
        # coletas rodam em paralelo, mas a mescla é serial: duas fontes vendo o mesmo MAC
        # ao mesmo tempo não podem criar duas descobertas com a mesma chave
        # (só a parte no banco: sondagens e coletas de rede ficam fora dela)
        self._trava_mescla = asyncio.Lock()
        self._em_curso: dict[str, asyncio.Task[None]] = {}  # coleta agendada por fonte
        self._fundo: set[asyncio.Task[None]] = set()  # sondagens e verificações
        self._sondando: set[str] = set()

    # ---- laço -------------------------------------------------------------------------------

    async def executar(self) -> None:
        """Laço sem fim; nenhum ciclo ruim o derruba (cancelamento encerra as coletas)."""
        try:
            while True:
                try:
                    await self.ciclo()
                except Exception as e:  # noqa: BLE001
                    log.error("ciclo do orquestrador falhou: %s", type(e).__name__)
                await self._relogio.dormir(TICK_S)
        finally:
            await self.encerrar()

    async def ciclo(self) -> None:
        """Relê as fontes e dispara, cada uma na sua tarefa, as que venceram o intervalo.

        Não espera as coletas: uma fonte lenta ou travada (limitada por ``timeout_coleta``)
        não atrasa o agendamento das outras; a mesma fonte não roda duas vezes ao mesmo tempo.
        """
        await self._recarregar()
        agora = self._relogio.agora()
        for fonte_id, intervalo in self._agenda.items():
            if fonte_id in self._em_curso or agora < self._proxima.get(fonte_id, agora):
                continue
            self._proxima[fonte_id] = agora + intervalo
            tarefa = asyncio.create_task(self._coletar(fonte_id), name="sentinela-coleta")
            self._em_curso[fonte_id] = tarefa
            tarefa.add_done_callback(functools.partial(self._fim_coleta, fonte_id))

    def _fim_coleta(self, fonte_id: str, tarefa: asyncio.Task[None]) -> None:
        if self._em_curso.get(fonte_id) is tarefa:
            del self._em_curso[fonte_id]

    def _lancar(self, coro: Coroutine[Any, Any, None]) -> None:
        """Tarefa de fundo (sondagem/verificação): isolada, cancelada no encerramento."""
        tarefa = asyncio.create_task(coro, name="sentinela-descoberta-fundo")
        self._fundo.add(tarefa)
        tarefa.add_done_callback(self._fundo.discard)

    async def ocioso(self) -> None:
        """Espera as coletas agendadas e as tarefas de fundo terminarem (testes, demo)."""
        while self._em_curso or self._fundo:
            await asyncio.gather(*self._em_curso.values(), *self._fundo, return_exceptions=True)

    async def encerrar(self) -> None:
        """Cancela coletas e tarefas de fundo e espera o fim (nenhuma fica órfã)."""
        tarefas = [*self._em_curso.values(), *self._fundo]
        for t in tarefas:
            t.cancel()
        if tarefas:
            await asyncio.gather(*tarefas, return_exceptions=True)

    async def coletar_todas(self) -> None:
        """Coleta todas as fontes ativas agora (demo e testes), sem o limite de 30 s."""
        await self._recarregar()
        await asyncio.gather(*(self._coletar(f) for f in list(self._agenda)))

    async def _recarregar(self) -> None:
        async with self._sessoes() as db:
            fontes = list((await db.execute(select(Fonte))).scalars())
        vivas = {f.id for f in fontes}
        for fonte_id in list(self._coletores):
            if fonte_id not in vivas:
                self._esquecer(fonte_id)
        self._agenda = {}
        for fonte in fontes:
            if not fonte.ativa:
                self.gravadores.pop(fonte.id, None)
                continue
            self._agenda[fonte.id] = float(fonte.intervalo_s)
            try:
                self._coletor_para(fonte)
            except Exception as e:  # noqa: BLE001 - fonte com configuração inválida
                log.warning("fonte %s não instanciada: %s", fonte.id, type(e).__name__)

    def _esquecer(self, fonte_id: str) -> None:
        self._coletores.pop(fonte_id, None)
        self.gravadores.pop(fonte_id, None)
        self._agenda.pop(fonte_id, None)
        self._proxima.pop(fonte_id, None)

    def fonte_alterada(self, fonte_id: str) -> None:
        """A API mudou/removeu a fonte (ex.: confiou na impressão): recria o coletor na
        próxima coleta e retoma a leitura de canais suspensa."""
        self._coletores.pop(fonte_id, None)
        self.gravadores.pop(fonte_id, None)
        if self.leitor_canais is not None:
            self.leitor_canais.retomar(fonte_id)

    def _coletor_para(self, fonte: Fonte) -> Coletor:
        assinatura = _assinatura(fonte)
        atual = self._coletores.get(fonte.id)
        if atual is not None and atual[0] == assinatura:
            return atual[1]
        coletor = self._fabrica(fonte, self._cofre, self._guarda, self._limitador)
        self._coletores[fonte.id] = (assinatura, coletor)
        if atual is not None and self.leitor_canais is not None:
            self.leitor_canais.retomar(fonte.id)  # conexão/impressão mudou: tenta de novo
        if e_gravador(fonte) and callable(getattr(coletor, "status_canais", None)):
            self.gravadores[fonte.id] = cast(LeitorStatus, coletor)
        else:
            self.gravadores.pop(fonte.id, None)
        return coletor

    def _trava(self, fonte_id: str) -> asyncio.Lock:
        return self._travas.setdefault(fonte_id, asyncio.Lock())

    # ---- coleta -----------------------------------------------------------------------------

    async def _reservar_coleta(self, fonte_id: str) -> None:
        """``ColetaRecente`` (com a espera restante) se a última começou há < 30 s;
        ``FonteInexistente``; senão marca o início já (dois pedidos seguidos: o 2º é 429)."""
        ultimo = self._inicio.get(fonte_id)
        if ultimo is not None:
            passado = self._relogio.agora() - ultimo
            if passado < COLETA_MIN_S:
                raise ColetaRecente(COLETA_MIN_S - passado)
        async with self._sessoes() as db:
            if await db.get(Fonte, fonte_id) is None:
                raise FonteInexistente
        self._inicio[fonte_id] = self._relogio.agora()

    async def coletar_agora(self, fonte_id: str) -> None:
        """Coleta já e espera o fim; ``ColetaRecente`` se a última começou há < 30 s."""
        await self._reservar_coleta(fonte_id)
        await self._coletar(fonte_id)

    async def coletar_em_fundo(self, fonte_id: str) -> None:
        """Rota "coletar": as recusas (``ColetaRecente``/``FonteInexistente``) saem na hora; a
        coleta roda numa tarefa de fundo do orquestrador (cancelada no encerramento, limitada
        por ``timeout_coleta``) e o fim é publicado como ``fonte``/``coletada``."""
        await self._reservar_coleta(fonte_id)
        self._lancar(self._coletar(fonte_id))

    async def _coletar(self, fonte_id: str) -> None:
        try:
            async with self._trava(fonte_id):
                self._inicio[fonte_id] = self._relogio.agora()
                await self._coletar_fonte(fonte_id)
        except Exception as e:  # noqa: BLE001 - uma fonte nunca derruba as outras
            log.error("coleta da fonte %s falhou: %s", fonte_id, type(e).__name__)
            return
        await self._publicar_coleta(fonte_id)

    async def _publicar_coleta(self, fonte_id: str) -> None:
        """``fonte`` ``{acao: "coletada", id, ok, ultima_coleta}`` ao fim de toda coleta.
        Sem o texto do erro: o WebSocket chega também ao visualizador; o admin lê
        ``ultimo_erro`` em ``GET /fontes``."""
        try:
            async with self._sessoes() as db:
                fonte = await db.get(Fonte, fonte_id)
        except Exception as e:  # noqa: BLE001
            log.warning("fonte %s não lida após a coleta: %s", fonte_id, type(e).__name__)
            return
        if fonte is None:
            return
        dados = {
            "acao": "coletada",
            "id": fonte_id,
            "ok": fonte.ultimo_erro is None,
            "ultima_coleta": fonte.ultima_coleta.isoformat() if fonte.ultima_coleta else None,
        }
        self._barramento.publicar(Mensagem("fonte", dados))

    async def _coletar_fonte(self, fonte_id: str) -> None:
        async with self._sessoes() as db:
            fonte = await db.get(Fonte, fonte_id)
        if fonte is None:
            self._esquecer(fonte_id)
            return
        erro: str | None = None
        achados: list[Achado] = []
        try:
            coletor = self._coletor_para(fonte)
        except Exception as e:  # noqa: BLE001
            log.warning("fonte %s não instanciada: %s", fonte_id, type(e).__name__)
            await self._registrar_erro(fonte_id, MSG_FABRICA)
            return
        try:
            async with asyncio.timeout(self._timeout_coleta):
                achados = await coletor.coletar()
        except TimeoutError:
            erro = MSG_TEMPO
        except (CertificadoMudou, CertificadoNaoConfiado) as e:
            erro = str(e)
            if e_gravador(fonte) and self.leitor_canais is not None:
                mudou = isinstance(e, CertificadoMudou)
                causa = CAUSA_CERTIFICADO_MUDOU if mudou else CAUSA_CERTIFICADO_NAO_CONFIADO
                self.leitor_canais.suspender(fonte_id, causa)
        except ErroColeta as e:
            erro = self._mascarar(fonte, str(e))
        except Exception as e:  # noqa: BLE001 - texto do aparelho/traceback nunca sai
            log.error("coleta da fonte %s falhou: %s", fonte_id, type(e).__name__)
            erro = MSG_COLETA_INESPERADA
        if erro is not None:
            log.warning("coleta da fonte %s sem sucesso", fonte_id)
            await self._registrar_erro(fonte_id, erro)
            return
        truncado = len(achados) > MAX_ACHADOS_COLETA
        if truncado:
            log.warning("coleta da fonte %s truncada em %d achados", fonte_id, MAX_ACHADOS_COLETA)
            achados = achados[:MAX_ACHADOS_COLETA]
        await self.processar_achados(achados, fonte_id=fonte_id, truncado=truncado)

    def _mascarar(self, fonte: Fonte, texto: str) -> str:
        segredos = self._cofre.segredos(fonte.credencial_cifrada)
        return Cofre.mascarar(texto, segredos)[:LIMITE_ERRO]

    async def _registrar_erro(self, fonte_id: str, erro: str) -> None:
        try:
            async with self._sessoes() as db:
                await db.execute(
                    update(Fonte).where(Fonte.id == fonte_id).values(ultimo_erro=erro[:LIMITE_ERRO])
                )
                await db.commit()
        except Exception as e:  # noqa: BLE001
            log.error("falha ao registrar erro da fonte %s: %s", fonte_id, type(e).__name__)

    async def processar_achados(
        self, achados: list[Achado], *, fonte_id: str | None = None, truncado: bool = False
    ) -> None:
        """Mescla, grava, reagenda equipamentos com IP novo, publica e aprova automaticamente.
        Usado pela coleta das fontes e pela varredura lenta (``fonte_id`` None)."""
        agora = self._agora_parede()
        if self._oui is None:
            self._oui = BaseOui.carregar()
        novos: list[str] = []  # descobertas a anunciar como "aparelho novo" (depois do commit)
        try:
            # só banco dentro da trava; a sondagem (lenta) roda depois, em fundo
            async with self._trava_mescla, self._sessoes() as db:
                r = await mesclar(db, achados, self._guarda, agora, oui=self._oui)
                aviso = MSG_TRUNCADA if truncado or r.truncado else None
                linha_base = fonte_id is None  # varredura: vale a linha de base da sub-rede
                if fonte_id is not None:
                    fonte = await db.get(Fonte, fonte_id)
                    if fonte is not None:
                        # a primeira coleta da fonte (com a marca) é a linha de base dela. Fonte
                        # que já coletava antes da marca existir (atualização) também: a
                        # primeira coleta depois da atualização não avisa ninguém.
                        marca = f"{LINHA_BASE_FONTE}{fonte_id}"
                        linha_base = await db.get(Config, marca) is not None
                        if not linha_base:
                            db.add(Config(chave=marca, valor=True))
                        fonte.ultima_coleta, fonte.ultimo_erro = agora, aviso
                elif aviso is not None:
                    log.warning("achados da varredura descartados: fila de pendentes cheia")
                try:
                    novos = await self._aparelhos_novos(db, r.novas, fonte_id is None, linha_base)
                except Exception as e:  # noqa: BLE001 - o aviso nunca descarta a gravação
                    log.warning("decisão de aparelho novo falhou: %s", type(e).__name__)
                await db.commit()
        except Exception as e:  # noqa: BLE001
            log.error("falha ao gravar achados: %s", type(e).__name__)
            if fonte_id is not None:
                await self._registrar_erro(fonte_id, MSG_GRAVAR)
            return
        for eq_id in r.equipamentos_atualizados:
            await self._reagendar(eq_id)
        await self._publicar_resultado(r)
        for id in novos:
            self._barramento.publicar(Mensagem("aparelho_novo", {"descoberta_id": id}))
        await self._aprovar_automaticamente([*r.novas, *r.atualizadas])
        for id in r.a_sondar:
            if id not in self._sondando:
                self._sondando.add(id)
                self._lancar(self._sondar_em_fundo(id))

    @staticmethod
    async def _aparelhos_novos(
        db: AsyncSession, ids: list[str], da_varredura: bool, linha_base: bool
    ) -> list[str]:
        """Das descobertas novas, as que merecem o aviso "aparelho novo". Canal de gravador
        nunca avisa. Da varredura: só com o IP numa sub-rede que já tem linha de base. De fonte:
        só se a fonte já tinha coletado antes (``linha_base``)."""
        if not ids or (not da_varredura and not linha_base):
            return []
        linhas = await db.execute(
            select(Descoberta.id, Descoberta.chave, Descoberta.ip).where(Descoberta.id.in_(ids))
        )
        por_id = {id: (chave, ip) for id, chave, ip in linhas}
        saida: list[str] = []
        for id in ids:
            chave, ip = por_id.get(id, ("nvr:", ""))
            if chave.startswith("nvr:"):
                continue
            if da_varredura and not await sub_rede_com_linha_base(db, ip):
                continue
            saida.append(id)
        return saida

    async def _sondar_em_fundo(self, descoberta_id: str) -> None:
        """§9.1 a: sondagem de descoberta em sub-rede com varredura, fora da trava; o
        resultado entra num passo curto e serial no banco."""
        try:
            async with self._sessoes() as db:
                d = await db.get(Descoberta, descoberta_id)
                # a permissão pode ter caído entre a mescla e agora (PATCH/remoção da sub-rede)
                redes = await redes_com_varredura(db)
            if d is None or d.status != PENDENTE or not dentro_das_subredes(self._guarda, d.ip):
                return
            if not na_rede(d.ip, redes):
                return
            ip = d.ip
            portas, titulo = await self._sondar(ip, self._guarda, self._limitador)
            atual = await self._gravar_sonda(descoberta_id, ip, portas, titulo, so_pendente=True)
            if atual is not None:
                self._publicar_descoberta(
                    "atualizada", atual.id, atual.classe_sugerida, atual.confianca
                )
                await self._aprovar_automaticamente([descoberta_id])
        except Exception as e:  # noqa: BLE001 - sondagem é só um sinal a mais
            log.warning("sondagem em fundo falhou: %s", type(e).__name__)
        finally:
            self._sondando.discard(descoberta_id)

    async def _gravar_sonda(
        self,
        descoberta_id: str,
        ip: str,
        portas: set[int],
        titulo: str | None,
        *,
        so_pendente: bool = False,
    ) -> Descoberta | None:
        """Grava o resultado só se a descoberta ainda tem o IP sondado (e, para a sondagem
        automática, ainda está pendente); senão o resultado é de outro aparelho/momento."""
        async with self._trava_mescla, self._sessoes() as db:
            atual = await db.get(Descoberta, descoberta_id)
            if atual is None or atual.ip != ip:
                return None
            if so_pendente and atual.status != PENDENTE:
                return None
            atual.sinais = {**(atual.sinais or {}), "portas": sorted(portas), "titulo": titulo}
            atual.sondada_em = self._agora_parede()
            reclassificar(atual)
            await db.commit()
            return atual

    async def _reagendar(self, eq_id: str) -> None:
        async with self._sessoes() as db:
            eq = await db.get(Equipamento, eq_id)
            classe = await db.get(Classe, eq.classe_id) if eq is not None else None
            if eq is None or classe is None:
                return
            await registrar_no_agendador(self._agendador, db, eq, classe, novo=False)
            ip = eq.ip
        self._barramento.publicar(
            Mensagem("equipamento", {"acao": "atualizado", "id": eq_id, "ip": ip})
        )

    async def _publicar_resultado(self, r: ResultadoMescla) -> None:
        mudadas = [(i, "nova") for i in r.novas] + [(i, "atualizada") for i in r.atualizadas]
        if mudadas:
            async with self._sessoes() as db:
                linhas = await db.execute(
                    select(Descoberta.id, Descoberta.classe_sugerida, Descoberta.confianca).where(
                        Descoberta.id.in_([i for i, _ in mudadas])
                    )
                )
                resumo = {id: (classe, conf) for id, classe, conf in linhas}
            for id, acao in mudadas:
                classe, conf = resumo.get(id, (None, 0.0))
                self._publicar_descoberta(acao, id, classe, conf)
        for id in r.removidas:
            self._publicar_descoberta("removida", id, None, 0.0)
        if mudadas or r.removidas:
            await self.publicar_pendentes()

    def _publicar_descoberta(
        self, acao: str, id: str, classe: str | None, confianca: float
    ) -> None:
        dados = {"acao": acao, "id": id, "classe_sugerida": classe, "confianca": confianca}
        self._barramento.publicar(Mensagem("descoberta", dados))

    async def total_pendentes(self) -> int:
        async with self._sessoes() as db:
            consulta = select(func.count()).select_from(Descoberta)
            return int(await db.scalar(consulta.where(Descoberta.status == PENDENTE)) or 0)

    async def publicar_pendentes(self) -> None:
        total = await self.total_pendentes()
        self._barramento.publicar(Mensagem("pendentes", {"total": total}))

    async def _aprovar_automaticamente(self, ids: Iterable[str]) -> None:
        ids = list(ids)
        if not ids:
            return
        async with self._sessoes() as db:
            ajustes = await ler_ajustes(db)
        if not ajustes.aprovacao_automatica:
            return
        for id in ids:
            try:
                async with self._sessoes() as db:
                    d = await db.get(Descoberta, id)
                    if d is None or not self._aprovavel_sozinha(d, ajustes.limiar_aprovacao):
                        continue
                    await self.aprovar(db, id, None, None, None)
            except ErroDescoberta:
                continue  # fica pendente para o admin
            except Exception as e:  # noqa: BLE001
                log.error("aprovação automática falhou: %s", type(e).__name__)

    @staticmethod
    def _aprovavel_sozinha(d: Descoberta, limiar: float) -> bool:
        return (
            d.status == PENDENTE
            and not d.fora_das_subredes
            and d.conflito_com is None
            and d.classe_sugerida not in (None, CLASSE_DESCONHECIDA)
            and d.confianca >= limiar
        )

    # ---- teste de fonte (§9.3) --------------------------------------------------------------

    async def testar(self, fonte_id: str) -> ResultadoTeste:
        """Testa com um coletor novo; qualquer exceção vira erro genérico (credencial
        mascarada). Sucesso numa fonte de gravador liga/cria o gravador (``apos_teste``)."""
        async with self._sessoes() as db:
            fonte = await db.get(Fonte, fonte_id)
        if fonte is None:
            raise FonteInexistente
        try:
            coletor = self._fabrica(fonte, self._cofre, self._guarda, self._limitador)
            resultado = await coletor.testar()
        except ErroColeta as e:
            resultado = ResultadoTeste(
                ok=False, erro=str(e), impressao_tls=getattr(e, "impressao", None)
            )
        except Exception as e:  # noqa: BLE001 - texto do aparelho/traceback nunca sai
            log.error("teste da fonte %s falhou: %s", fonte_id, type(e).__name__)
            resultado = ResultadoTeste(ok=False, erro=MSG_TESTE_INESPERADO)
        if resultado.erro is not None:
            resultado.erro = self._mascarar(fonte, resultado.erro)
        try:
            await self.apos_teste(fonte_id, resultado)
        except Exception as e:  # noqa: BLE001
            log.error("pós-teste da fonte %s falhou: %s", fonte_id, type(e).__name__)
        return resultado

    async def apos_teste(self, fonte_id: str, resultado: ResultadoTeste) -> None:
        """§9.3: teste OK de gravador liga ``fonte.equipamento_id`` ao equipamento com o IP
        do gravador; sem ele, cria (ou atualiza) a descoberta do próprio gravador."""
        if not resultado.ok:
            return
        agora = self._agora_parede()
        publicar: tuple[str, Descoberta] | None = None
        async with self._sessoes() as db:
            fonte = await db.get(Fonte, fonte_id)
            if fonte is None or not e_gravador(fonte):
                return
            if await _existe(db, fonte.equipamento_id):
                return
            eq = await equipamento_por_ip(db, fonte.host)
            if eq is not None:
                await self._ligar_fonte(db, fonte, eq.id)
                await db.commit()
                return
            d = await db.scalar(
                select(Descoberta)
                .where(Descoberta.ip == fonte.host, Descoberta.chave.not_like("nvr:%"))
                .limit(1)
            )
            origem = {"fonte_id": fonte.id, "origem": "gravador"}
            if d is None:
                d = Descoberta(
                    id=str(uuid.uuid4()),
                    chave=f"ip:{fonte.host}",
                    ip=fonte.host,
                    status=PENDENTE,
                    sinais={},
                    origens=[origem],
                    primeira_vez=agora,
                    ultima_vez=agora,
                    fora_das_subredes=not dentro_das_subredes(self._guarda, fonte.host),
                )
                db.add(d)
                publicar = ("nova", d)
            elif d.status == PENDENTE:
                if origem not in d.origens:
                    d.origens = [*d.origens, origem]
                publicar = ("atualizada", d)
            else:
                return
            d.nome_sugerido = (resultado.identidade or d.nome_sugerido or fonte.nome)[:120]
            d.ultima_vez = agora
            reclassificar(d)
            await db.commit()
        if publicar is not None:
            acao, d = publicar
            self._publicar_descoberta(acao, d.id, d.classe_sugerida, d.confianca)
            await self.publicar_pendentes()

    @staticmethod
    async def _ligar_fonte(db: AsyncSession, fonte: Fonte, equipamento_id: str) -> None:
        """A fonte passa a representar o equipamento; as câmeras dela ganham o pai."""
        fonte.equipamento_id = equipamento_id
        await db.execute(
            update(Descoberta)
            .where(Descoberta.chave.like(f"nvr:{fonte.id}:%"))
            .values(pai_equipamento_id=equipamento_id)
        )

    # ---- sondagem pelo admin (§9.1 b) -------------------------------------------------------

    async def sondar_descoberta(self, descoberta_id: str) -> Descoberta:
        """Botão "Sondar" (a rota audita): portas + título, grava e reclassifica."""
        async with self._sessoes() as db:
            d = await db.get(Descoberta, descoberta_id)
        if d is None:
            raise DescobertaInexistente
        if e_canal(d):
            raise SondagemRecusada(MSG_SONDAR_CANAL)
        if not dentro_das_subredes(self._guarda, d.ip):
            raise SondagemRecusada(MSG_FORA)
        ip = d.ip
        try:
            portas, titulo = await self._sondar(ip, self._guarda, self._limitador)
        except DestinoProibido:
            raise SondagemRecusada(MSG_FORA) from None
        except Exception as e:  # noqa: BLE001
            log.warning("sondagem pedida falhou: %s", type(e).__name__)
            raise SondagemRecusada(MSG_SONDAR_FALHOU) from None
        atual = await self._gravar_sonda(descoberta_id, ip, portas, titulo)
        if atual is None:
            async with self._sessoes() as db:
                if await db.get(Descoberta, descoberta_id) is None:
                    raise DescobertaInexistente
            raise SondagemRecusada(MSG_SONDAR_FALHOU)  # o IP mudou durante a sondagem
        self._publicar_descoberta("atualizada", atual.id, atual.classe_sugerida, atual.confianca)
        return atual

    # ---- aprovação --------------------------------------------------------------------------

    async def aprovar(
        self,
        db: AsyncSession,
        descoberta_id: str,
        classe_slug: str | None,
        nome: str | None,
        usuario: Usuario | None,
        *,
        ip: str | None = None,
    ) -> Equipamento:
        """Aprova (com commit próprio) e registra no agendador vivo. ``usuario`` None é a
        aprovação automática. ``ip`` é o do cliente, para a auditoria."""
        agora = self._agora_parede()
        d = await db.get(Descoberta, descoberta_id)
        if d is None:
            raise DescobertaInexistente
        feito = _Aprovacao()
        try:
            eq = await self._aprovar_uma(db, d, classe_slug, nome, usuario, ip, agora, feito)
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise AprovacaoRecusada(MSG_CONFLITO) from None
        except ErroDescoberta:
            await db.rollback()
            raise
        for equipamento, classe in feito.equipamentos:
            await registrar_no_agendador(self._agendador, db, equipamento, classe, novo=True)
        for equipamento, _classe in feito.equipamentos:
            # toda aprovação (manual, lote ou automática) aparece ao vivo, gravador junto
            dados = {"acao": "criado", "id": equipamento.id}
            self._barramento.publicar(Mensagem("equipamento", dados))
        for id in feito.descobertas:
            self._publicar_descoberta("removida", id, None, 0.0)
        await self.publicar_pendentes()
        for eq_id, d_id in feito.verificar:
            self._lancar(self._verificar_checagem(eq_id, d_id))
        return eq

    async def _verificar_checagem(self, eq_id: str, descoberta_id: str | None) -> None:
        """§9.1 c (R8): depois da aprovação, 1 eco ICMP e a sondagem das portas, em fundo e
        com fichas baixas. ICMP sem resposta e porta da lista aberta: a checagem passa a
        ``tcp`` na primeira porta aberta (auditado, reagendado, publicado). Qualquer falha
        deixa a checagem como está."""
        try:
            async with self._sessoes() as db:
                eq = await db.get(Equipamento, eq_id)
            if eq is None or eq.checagem != "icmp":
                return
            ip = eq.ip
            destino = self._guarda.validar(ip, None, "icmp")
            await self._limitador.adquirir(1, prioridade="baixa")
            respondeu = await self._ping(destino)
            portas, titulo = await self._sondar(ip, self._guarda, self._limitador)
            if descoberta_id is not None:
                await self._gravar_sonda(descoberta_id, ip, portas, titulo)
            if respondeu:
                return
            porta = next((p for p in PORTAS if p in portas), None)
            if porta is not None:
                await self._trocar_para_tcp(eq_id, ip, porta)
        except Exception as e:  # noqa: BLE001 - verificação é só uma sugestão
            log.warning("verificação da checagem falhou: %s", type(e).__name__)

    async def _trocar_para_tcp(self, eq_id: str, ip: str, porta: int) -> None:
        async with self._trava_mescla, self._sessoes() as db:
            eq = await db.get(Equipamento, eq_id)
            if eq is None or eq.checagem != "icmp" or eq.ip != ip:
                return  # o admin (ou a mescla) mudou o equipamento nesse meio-tempo
            classe = await db.get(Classe, eq.classe_id)
            if classe is None:
                return
            eq.checagem, eq.porta = "tcp", porta
            auditar_sistema(
                db,
                "equipamento.checagem_automatica",
                eq.id,
                self._agora_parede(),
                {"checagem": "icmp", "porta": None},
                {"checagem": "tcp", "porta": porta},
            )
            await db.commit()
            await registrar_no_agendador(self._agendador, db, eq, classe, novo=False)
        dados = {"acao": "atualizado", "id": eq_id, "ip": ip, "checagem": "tcp", "porta": porta}
        self._barramento.publicar(Mensagem("equipamento", dados))

    async def _aprovar_uma(
        self,
        db: AsyncSession,
        d: Descoberta,
        classe_slug: str | None,
        nome: str | None,
        usuario: Usuario | None,
        ip: str | None,
        agora: datetime,
        feito: _Aprovacao,
    ) -> Equipamento:
        if d.status != PENDENTE:
            raise AprovacaoRecusada(MSG_NAO_PENDENTE)
        canal = e_canal(d)
        if not canal:
            if not dentro_das_subredes(self._guarda, d.ip):
                raise AprovacaoRecusada(MSG_FORA)
            if await equipamento_por_ip(db, d.ip) is not None:
                raise AprovacaoRecusada(MSG_IP_EM_USO)
        if d.mac and await db.scalar(select(Equipamento.id).where(Equipamento.mac == d.mac)):
            raise AprovacaoRecusada(MSG_MAC_EM_USO)
        slug = classe_slug or d.classe_sugerida or CLASSE_DESCONHECIDA
        classe = await db.scalar(select(Classe).where(Classe.slug == slug))
        if classe is None:
            raise AprovacaoRecusada(MSG_CLASSE)
        pai = await self._gravador_do_canal(db, d, usuario, ip, agora, feito) if canal else None
        checagem, porta = checagem_sugerida(d)
        eq = Equipamento(
            id=str(uuid.uuid4()),
            nome=(nome or d.nome_sugerido or f"{classe.nome} {d.ip}")[:LIMITE_NOME],
            ip=d.ip,
            mac=d.mac,
            fabricante=d.fabricante,
            classe_id=classe.id,
            classe_origem="auto" if classe_slug in (None, d.classe_sugerida) else "manual",
            checagem=checagem,
            porta=porta,
            estado="desconhecido",
            estado_desde=agora,
            pausado=False,
            criado_em=agora,
            pai_id=pai,
            canal=d.canal if canal else None,
        )
        db.add(eq)
        await db.flush()  # o equipamento existe antes de a descoberta apontar para ele
        d.status, d.equipamento_id, d.conflito_com = APROVADA, eq.id, None
        self._auditar_aprovacao(db, eq, classe, d.id, usuario, ip, agora)
        await db.flush()
        feito.equipamentos.append((eq, classe))
        feito.descobertas.append(d.id)
        if checagem == "icmp" and not _respondeu_icmp(d):
            feito.verificar.append((eq.id, d.id))
        if not canal:
            await self._ligar_fontes_do_ip(db, eq)
        return eq

    @staticmethod
    def _auditar_aprovacao(
        db: AsyncSession,
        eq: Equipamento,
        classe: Classe,
        descoberta_id: str,
        usuario: Usuario | None,
        ip: str | None,
        agora: datetime,
    ) -> None:
        depois = {
            "descoberta": descoberta_id,
            "nome": eq.nome,
            "ip": eq.ip,
            "mac": eq.mac,
            "classe": classe.slug,
            "checagem": eq.checagem,
            "porta": eq.porta,
            "pai_id": eq.pai_id,
            "canal": eq.canal,
        }
        acao = "descoberta.aprovar" if usuario is not None else "descoberta.aprovar_automatica"
        db.add(
            Auditoria(
                usuario_id=usuario.id if usuario is not None else None,
                acao=acao,
                alvo=eq.id,
                depois=depois,
                ip=ip,
                em=agora,
            )
        )

    async def _ligar_fontes_do_ip(self, db: AsyncSession, eq: Equipamento) -> None:
        """Gravador aprovado: as fontes de gravador nesse host passam a apontar para ele."""
        fontes = (
            await db.execute(
                select(Fonte).where(Fonte.host == eq.ip, Fonte.equipamento_id.is_(None))
            )
        ).scalars()
        for fonte in fontes:
            if e_gravador(fonte):
                await self._ligar_fonte(db, fonte, eq.id)

    async def _gravador_do_canal(
        self,
        db: AsyncSession,
        d: Descoberta,
        usuario: Usuario | None,
        ip: str | None,
        agora: datetime,
        feito: _Aprovacao,
    ) -> str:
        """Id do equipamento do gravador da câmera; aprova/cria o gravador se preciso."""
        fonte = await db.get(Fonte, d.chave.split(":", 2)[1])
        if fonte is None:
            raise AprovacaoRecusada(MSG_SEM_GRAVADOR)
        if fonte.equipamento_id is not None and await _existe(db, fonte.equipamento_id):
            return fonte.equipamento_id
        existente = await equipamento_por_ip(db, fonte.host)
        if existente is not None:
            await self._ligar_fonte(db, fonte, existente.id)
            return existente.id
        d_gravador = await db.scalar(
            select(Descoberta)
            .where(
                Descoberta.ip == fonte.host,
                Descoberta.status == PENDENTE,
                Descoberta.chave.not_like("nvr:%"),
            )
            .limit(1)
        )
        if d_gravador is not None:
            gravador = await self._aprovar_uma(
                db, d_gravador, "gravador", None, usuario, ip, agora, feito
            )
        else:
            gravador = await self._gravador_pela_fonte(db, fonte, usuario, ip, agora, feito)
        await self._ligar_fonte(db, fonte, gravador.id)
        return gravador.id

    async def _gravador_pela_fonte(
        self,
        db: AsyncSession,
        fonte: Fonte,
        usuario: Usuario | None,
        ip: str | None,
        agora: datetime,
        feito: _Aprovacao,
    ) -> Equipamento:
        if not dentro_das_subredes(self._guarda, fonte.host):
            raise AprovacaoRecusada(MSG_FORA)
        classe = await db.scalar(select(Classe).where(Classe.slug == "gravador"))
        if classe is None:
            raise AprovacaoRecusada(MSG_CLASSE)
        eq = Equipamento(
            id=str(uuid.uuid4()),
            nome=fonte.nome[:LIMITE_NOME],
            ip=fonte.host,
            classe_id=classe.id,
            classe_origem="auto",
            checagem="icmp",
            estado="desconhecido",
            estado_desde=agora,
            pausado=False,
            criado_em=agora,
        )
        db.add(eq)
        self._auditar_aprovacao(db, eq, classe, f"fonte:{fonte.id}", usuario, ip, agora)
        await db.flush()
        feito.equipamentos.append((eq, classe))
        feito.verificar.append((eq.id, None))
        return eq


__all__ = [
    "FONTE_VARREDURA",
    "AprovacaoRecusada",
    "ColetaRecente",
    "DescobertaInexistente",
    "ErroDescoberta",
    "FonteInexistente",
    "Orquestrador",
    "SondagemRecusada",
    "auditar_sistema",
    "checagem_sugerida",
    "fabricar_coletor",
]
