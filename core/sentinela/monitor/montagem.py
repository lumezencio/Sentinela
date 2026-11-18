"""Montagem do monitor a partir do banco: Guarda, barramento, limitador e agendador.

Usado pelo lifespan (R4). Os laços (``executar``, descarregar) NÃO são iniciados aqui.
"""

from collections.abc import Callable
from dataclasses import dataclass
from ipaddress import IPv4Network

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.barramento import Barramento
from sentinela.config import Settings
from sentinela.db.modelos import Classe, Equipamento, SubRede
from sentinela.monitor.agendador import Agendador, Alvo
from sentinela.monitor.checagens import Checagem, checagem_para
from sentinela.monitor.estados import Estado
from sentinela.monitor.gravador import GravadorSql
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoProibido, Guarda
from sentinela.relogio import Relogio, RelogioReal


@dataclass
class Monitor:
    guarda: Guarda
    barramento: Barramento
    limitador: Limitador
    gravador: GravadorSql
    agendador: Agendador


def estado_inicial(eq: Equipamento) -> Estado:
    if eq.pausado:
        return Estado.PAUSADO
    try:
        estado = Estado(eq.estado)
    except ValueError:
        return Estado.DESCONHECIDO
    # pausado sem a flag e inalcançável (o pai é reavaliado do zero ao subir): desconhecido
    if estado in (Estado.PAUSADO, Estado.INALCANCAVEL):
        return Estado.DESCONHECIDO
    return estado


def alvo_de(eq: Equipamento, classe: Classe) -> Alvo:
    """Alvo do agendador: intervalo e criticidade vêm da classe (R16).

    Câmera atrás de gravador (``checagem == "gravador"``) vira alvo passivo: o agendador a
    registra sem passar pela Guarda e nunca a checa; o estado vem da leitura de canais.
    """
    return Alvo(
        id=eq.id,
        ip=eq.ip,
        porta=eq.porta,
        checagem=eq.checagem,
        intervalo_s=float(classe.intervalo_s),
        critico=classe.critica,
        estado=estado_inicial(eq),
        pai_id=eq.pai_id,
    )


async def registrar_no_agendador(
    agendador: Agendador, db: AsyncSession, eq: Equipamento, classe: Classe, *, novo: bool
) -> None:
    """Põe (ou atualiza) o equipamento no agendador vivo, sem reiniciar. Chamar DEPOIS do
    commit. Se o agendador recusar (Guarda mudou no meio), ele pausa com causa
    ``fora_das_subredes``; a linha é relida para refletir esse estado gravado.

    Caminho único do cadastro manual (API) e da aprovação de descobertas.
    """
    alvo = alvo_de(eq, classe)
    if novo:
        agendador.adicionar(alvo)
    else:
        agendador.atualizar(alvo)
    if agendador.estado_de(eq.id) is None and not eq.pausado:
        await agendador.aguardar_gravacoes()
        await db.refresh(eq)


async def sub_redes_do_banco(db: AsyncSession) -> list[IPv4Network]:
    """Sub-redes válidas gravadas; uma linha inválida (editada à mão) é ignorada."""
    redes: list[IPv4Network] = []
    for cidr in (await db.execute(select(SubRede.cidr).order_by(SubRede.id))).scalars():
        try:
            redes.append(Guarda.validar_sub_rede(cidr))
        except DestinoProibido:
            continue
    return redes


async def montar_monitor(
    sessoes: async_sessionmaker[AsyncSession],
    settings: Settings,
    checagens: Callable[[str], Checagem] = checagem_para,
    relogio: Relogio | None = None,
) -> Monitor:
    relogio = relogio or RelogioReal()
    async with sessoes() as db:
        guarda = Guarda(await sub_redes_do_banco(db))
        barramento = Barramento()
        limitador = Limitador(settings.teto_pps, relogio)
        gravador = GravadorSql(sessoes)
        agendador = Agendador(
            guarda=guarda,
            limitador=limitador,
            relogio=relogio,
            barramento=barramento,
            gravador=gravador,
            checagens=checagens,
            latencia_instavel_ms=settings.latencia_instavel_ms,
        )
        linhas = await db.execute(
            select(Equipamento, Classe).join(Classe, Equipamento.classe_id == Classe.id)
        )
        # um único recalcular para todos; fora das sub-redes: recusado e pausado
        agendador.adicionar_lote(alvo_de(eq, classe) for eq, classe in linhas)
    await agendador.aguardar_gravacoes()  # pausas por recusa já gravadas ao subir
    return Monitor(guarda, barramento, limitador, gravador, agendador)
