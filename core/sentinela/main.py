import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from sentinela.api import auth, classes, equipamentos, importacao, saude, subredes, ws
from sentinela.api.deps import verificar_csrf
from sentinela.config import Settings, obter_settings
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.monitor.gravador import GravadorAmostras
from sentinela.monitor.montagem import montar_monitor
from sentinela.relogio import Relogio, RelogioReal
from sentinela.seguranca.bloqueio import BloqueioFantasma, LimitadorIP

log = logging.getLogger(__name__)

DESCARGA_S = 60.0  # amostras gravadas em lote a cada 60 s


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
    monitor = await montar_monitor(app.state.sessoes, settings)
    app.state.guarda = monitor.guarda
    app.state.barramento = monitor.barramento
    app.state.limitador = monitor.limitador
    app.state.gravador = monitor.gravador
    app.state.agendador = monitor.agendador


@asynccontextmanager
async def _lacos_do_monitor(app: FastAPI) -> AsyncIterator[None]:
    """Inicia ``agendador.executar`` e a descarga periódica; no shutdown, encerra e espera.

    A descarga para primeiro; o agendador cancelado drena as transições e descarrega o resto.
    """
    tarefas: list[asyncio.Task[None]] = []
    app.state.tarefas_monitor = tarefas
    if app.state.iniciar_monitor:
        tarefas.append(
            asyncio.create_task(
                _descarregar_periodicamente(app.state.gravador, app.state.relogio, DESCARGA_S),
                name="sentinela-descarga",
            )
        )
        tarefas.append(
            asyncio.create_task(app.state.agendador.executar(), name="sentinela-agendador")
        )
    try:
        yield
    finally:
        for tarefa in tarefas:  # uma de cada vez, na ordem: descarga, agendador
            tarefa.cancel()
            try:
                await tarefa
            except asyncio.CancelledError:
                pass
            except Exception:
                log.exception("tarefa do monitor terminou com erro")


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
) -> FastAPI:
    """``iniciar_monitor=False`` monta o monitor sem iniciar os laços (testes sem sondas)."""
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
    app.state.config_ws = ws.ConfigWs()
    app.state.falhas_ip = LimitadorIP(relogio)
    app.state.falhas_fantasma = BloqueioFantasma(relogio)
    app.include_router(saude.router)
    app.include_router(auth.router)
    app.include_router(subredes.router)
    app.include_router(classes.router)
    app.include_router(importacao.router)  # antes de /equipamentos/{id}
    app.include_router(equipamentos.router)
    app.include_router(ws.router)
    return app
