import asyncio
import functools
import logging
import os
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from sentinela.alertas.agrupador import Agrupador
from sentinela.alertas.despachante import Despachante
from sentinela.alertas.silencios import Silencios
from sentinela.alertas.telegram import ClienteTelegram
from sentinela.api import (
    alertas,
    auth,
    classes,
    config_descoberta,
    config_geral,
    config_telegram,
    descobertas,
    equipamentos,
    fontes,
    importacao,
    saude,
    silencios,
    subredes,
    varredura,
    ws,
)
from sentinela.api.deps import agora_utc, verificar_csrf
from sentinela.config import Settings, obter_settings
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.demo.simulador import (
    ChecagemSimulada,
    banco_e_demo,
    semear_demo,
    semear_fontes_demo,
    tem_equipamentos,
)
from sentinela.descoberta.canais import LeitorCanais
from sentinela.descoberta.classificador.sondagem import sondar
from sentinela.descoberta.fontes.simulada import fabricar_simulado, ping_simulado, sondar_simulado
from sentinela.descoberta.orquestrador import (
    FabricaColetor,
    FuncaoSondar,
    Orquestrador,
    fabricar_coletor,
)
from sentinela.descoberta.varredura import Ping, Varredura, ping_icmp
from sentinela.horario import zona
from sentinela.monitor.gravador import GravadorAmostras
from sentinela.monitor.limpeza import limpar_periodicamente
from sentinela.monitor.montagem import Monitor, montar_monitor
from sentinela.registro import configurar_logs
from sentinela.relogio import Relogio, RelogioReal
from sentinela.seguranca.bloqueio import BloqueioFantasma, LimitadorIP
from sentinela.seguranca.cofre import Cofre

log = logging.getLogger(__name__)

DESCARGA_S = 60.0  # amostras gravadas em lote a cada 60 s
GRACA_SAIDA_S = 5.0  # monitor morto: tempo para o log sair antes de encerrar o processo
CODIGO_MONITOR_MORTO = 3


def _sair_do_processo() -> None:
    """Encerra na hora com código != 0; o ``restart: unless-stopped`` do compose reinicia."""
    os._exit(CODIGO_MONITOR_MORTO)


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI) -> AsyncIterator[None]:
    """Recursos de longa duração do processo.

    O esquema do banco NÃO é criado aqui: em produção roda ``alembic upgrade head``
    antes do uvicorn. Novos recursos entram entre a criação do motor e o ``yield``.
    """
    settings: Settings = app.state.settings
    motor = criar_motor(settings.banco_url)
    app.state.motor = motor
    app.state.sessoes = fabrica_sessao(motor)
    try:
        async with app.state.sessoes() as db:
            await semear_classes(db)
        await _montar_monitor(app, settings)
        async with _lacos_do_monitor(app):
            yield
    finally:
        await motor.dispose()


async def _montar_monitor(app: FastAPI, settings: Settings) -> None:
    """Guarda, barramento, limitador e agendador com os alvos do banco (laços não iniciados)."""
    if settings.demo:
        if await tem_equipamentos(app.state.sessoes) and not await banco_e_demo(app.state.sessoes):
            raise RuntimeError(
                "SENTINELA_DEMO=true num banco com dados reais; "
                "use um banco separado para a demonstração"
            )
        log.warning("modo demonstração: as checagens são simuladas, nenhum pacote é enviado")
        await semear_demo(app.state.sessoes)
        await semear_fontes_demo(app.state.sessoes)
        simulada = ChecagemSimulada(relogio=app.state.relogio)  # uma por app, para todo tipo
        monitor = await montar_monitor(
            app.state.sessoes, settings, lambda _tipo: simulada, app.state.relogio
        )
    else:
        if await banco_e_demo(app.state.sessoes):
            log.warning("banco de demonstração em uso com demo desligado")
        monitor = await montar_monitor(app.state.sessoes, settings)
    app.state.guarda = monitor.guarda
    app.state.barramento = monitor.barramento
    app.state.limitador = monitor.limitador
    app.state.gravador = monitor.gravador
    app.state.agendador = monitor.agendador
    app.state.silencios = Silencios(
        app.state.sessoes, monitor.agendador, monitor.barramento, app.state.relogio, agora_utc
    )
    app.state.agrupador = Agrupador(
        app.state.sessoes, monitor.barramento, app.state.silencios, app.state.relogio, agora_utc
    )
    _montar_descoberta(app, settings, monitor)
    _montar_telegram(app, settings, monitor)


def _montar_telegram(app: FastAPI, settings: Settings, monitor: Monitor) -> None:
    """Cliente e despachante do Telegram (laço não iniciado). No modo demonstração não há
    cliente nem despachante: nenhum pacote sai, nem para a internet."""
    if settings.demo:
        app.state.cliente_telegram = None
        app.state.despachante = None
        return
    cliente = ClienteTelegram(monitor.guarda, ca_adicional=settings.ca_adicional)
    app.state.cliente_telegram = cliente
    app.state.despachante = Despachante(
        app.state.sessoes, cliente, app.state.cofre, app.state.relogio, agora_utc, zona(settings)
    )


def _montar_descoberta(app: FastAPI, settings: Settings, monitor: Monitor) -> None:
    """Orquestrador, leitura de canais e varredura (laços não iniciados). No modo
    demonstração toda fonte, sondagem e ping são simulados: nenhum pacote sai."""
    cofre = Cofre(settings.chave_credenciais)
    fabrica: FabricaColetor = fabricar_simulado if settings.demo else fabricar_coletor
    sondador: FuncaoSondar = sondar_simulado if settings.demo else sondar
    ping: Ping = ping_simulado if settings.demo else ping_icmp
    orquestrador = Orquestrador(
        app.state.sessoes,
        monitor.guarda,
        monitor.limitador,
        monitor.barramento,
        monitor.agendador,
        cofre,
        app.state.relogio,
        fabrica,
        sondar=sondador,
        ping=ping,
    )
    leitor = LeitorCanais(
        app.state.sessoes,
        monitor.agendador,
        orquestrador.gravadores,
        monitor.limitador,
        app.state.relogio,
    )
    orquestrador.leitor_canais = leitor
    app.state.cofre = cofre
    app.state.orquestrador = orquestrador
    app.state.leitor_canais = leitor
    app.state.varredura = Varredura(
        app.state.sessoes,
        monitor.guarda,
        monitor.limitador,
        monitor.barramento,
        app.state.relogio,
        ping=ping,
        entregar=orquestrador.processar_achados,
    )


@asynccontextmanager
async def _lacos_do_monitor(app: FastAPI) -> AsyncIterator[None]:
    """Inicia a limpeza diária, a descarga periódica, a descoberta (orquestrador e leitura de
    canais), os silêncios, o agrupador de alertas, o envio ao Telegram (fora do modo
    demonstração) e ``agendador.executar``; no shutdown,
    cancela a varredura e encerra e espera, nessa ordem (o agendador cancelado drena as
    transições e descarrega).
    """
    tarefas: list[asyncio.Task[None]] = []
    app.state.tarefas_monitor = tarefas
    app.state.monitor_falhou = False
    app.state.monitor_motivo = None
    if app.state.iniciar_monitor:
        tarefas.append(
            asyncio.create_task(
                limpar_periodicamente(app.state.sessoes, app.state.relogio),
                name="sentinela-limpeza",
            )
        )
        tarefas.append(
            asyncio.create_task(
                _descarregar_periodicamente(app.state.gravador, app.state.relogio, DESCARGA_S),
                name="sentinela-descarga",
            )
        )
        tarefas.append(
            asyncio.create_task(app.state.orquestrador.executar(), name="sentinela-descoberta")
        )
        tarefas.append(
            asyncio.create_task(app.state.leitor_canais.executar(), name="sentinela-canais")
        )
        tarefas.append(
            asyncio.create_task(app.state.silencios.executar(), name="sentinela-silencios")
        )
        # antes do agendador: assina o barramento antes da primeira transição
        tarefas.append(
            asyncio.create_task(app.state.agrupador.executar(), name="sentinela-alertas")
        )
        if app.state.despachante is not None:  # nunca no modo demonstração
            tarefas.append(
                asyncio.create_task(app.state.despachante.executar(), name="sentinela-telegram")
            )
        # o agendador por último: os laços da descoberta o usam e param antes dele
        tarefas.append(
            asyncio.create_task(app.state.agendador.executar(), name="sentinela-agendador")
        )
        for tarefa in tarefas:
            tarefa.add_done_callback(functools.partial(_laco_terminou, app))
    try:
        yield
    finally:
        await app.state.varredura.encerrar()
        # coletas e tarefas de fundo (sondagem, verificação pós-aprovação) da API também
        await app.state.orquestrador.encerrar()
        for tarefa in tarefas:  # uma de cada vez, na ordem: limpeza, descarga, descoberta,
            # leitura de canais, silêncios, alertas, Telegram e agendador
            tarefa.cancel()
            # falha já registrada por ``_laco_terminou``; aqui só espera o fim
            await asyncio.gather(tarefa, return_exceptions=True)


def _laco_terminou(app: FastAPI, tarefa: asyncio.Task[None]) -> None:
    """Laço que termina sem ser cancelado parou o monitor: log de erro e /saude em 503.

    Com ``SENTINELA_SAIR_SE_MONITOR_MORRER=true`` (imagem Docker), o processo também é
    encerrado depois de ``GRACA_SAIDA_S`` para o compose reiniciar o core.
    """
    if tarefa.cancelled():
        return
    app.state.monitor_falhou = True
    app.state.monitor_motivo = tarefa.get_name()
    log.error("laço do monitor parou: %s", tarefa.get_name(), exc_info=tarefa.exception())
    settings: Settings = app.state.settings
    if settings.sair_se_monitor_morrer:
        log.critical("encerrando o processo em %.0f s para reinício automático", GRACA_SAIDA_S)
        asyncio.get_running_loop().call_later(GRACA_SAIDA_S, app.state.terminar)


async def _descarregar_periodicamente(
    gravador: GravadorAmostras, relogio: Relogio, intervalo_s: float
) -> None:
    while True:
        await relogio.dormir(intervalo_s)
        try:
            await gravador.descarregar()
        except Exception:
            log.exception("falha ao descarregar amostras (nova tentativa no próximo ciclo)")


async def _erro_de_validacao(_request: Request, exc: Exception) -> JSONResponse:
    """422 sem ecoar a entrada: ``input`` e ``ctx`` podem conter senha digitada."""
    if not isinstance(exc, RequestValidationError):  # registrado só para ela
        raise exc
    detalhes = [
        {chave: erro[chave] for chave in ("loc", "msg", "type") if chave in erro}
        for erro in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(detalhes)})


def criar_app(
    settings: Settings | None = None,
    *,
    relogio: Relogio | None = None,
    iniciar_monitor: bool = True,
    terminar: Callable[[], None] = _sair_do_processo,
) -> FastAPI:
    """``iniciar_monitor=False`` monta o monitor sem iniciar os laços (testes sem sondas).

    ``terminar`` só é chamado se ``settings.sair_se_monitor_morrer`` (testes injetam um falso).
    """
    configurar_logs()
    settings = settings or obter_settings()
    relogio = relogio or RelogioReal()
    producao = settings.ambiente == "producao"
    app = FastAPI(
        title="Sentinela",
        docs_url=None if producao else "/docs",
        redoc_url=None if producao else "/redoc",
        openapi_url=None if producao else "/openapi.json",
        lifespan=ciclo_de_vida,
        # CSRF em toda escrita, inclusive rotas futuras; isenções via `isento_de_csrf`
        dependencies=[Depends(verificar_csrf)],
    )
    app.add_exception_handler(RequestValidationError, _erro_de_validacao)
    app.state.settings = settings
    app.state.relogio = relogio
    app.state.iniciar_monitor = iniciar_monitor
    app.state.terminar = terminar
    app.state.config_ws = ws.ConfigWs()
    app.state.falhas_ip = LimitadorIP(relogio)
    app.state.falhas_fantasma = BloqueioFantasma(relogio)
    # testar/coletar/sondar/varredura: 10 por minuto por usuário (mesma janela do login)
    app.state.taxa_descoberta = LimitadorIP(relogio, max_falhas=10, janela_s=60.0)
    app.state.impressoes_mostradas = {}  # fonte_id -> impressão TLS mostrada no último teste
    app.include_router(saude.router)
    app.include_router(auth.router)
    app.include_router(subredes.router)
    app.include_router(classes.router)
    app.include_router(importacao.router)  # antes de /equipamentos/{id}
    app.include_router(equipamentos.router)
    app.include_router(fontes.router)
    app.include_router(descobertas.router)
    app.include_router(varredura.router)
    app.include_router(silencios.router)
    app.include_router(alertas.router)
    app.include_router(config_descoberta.router)
    app.include_router(config_geral.router)
    app.include_router(config_telegram.router)
    app.include_router(ws.router)
    return app
