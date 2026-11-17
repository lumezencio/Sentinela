"""Peças comuns da API de cadastro: auditoria, validação de destino e MAC, pausa/retomada."""

import math
from dataclasses import dataclass, field
from datetime import datetime
from ipaddress import IPv4Address
from typing import Any, cast

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.api.deps import agora_utc
from sentinela.db.modelos import Auditoria, Classe, Equipamento, Evento, Usuario
from sentinela.monitor.agendador import CAUSA_FORA, Agendador, Alvo
from sentinela.monitor.checagens import GRAVADOR
from sentinela.monitor.estados import Estado
from sentinela.monitor.montagem import alvo_de
from sentinela.rede.guarda import DestinoProibido, Guarda, Protocolo
from sentinela.rede.mac import MSG_MAC, normalizar_mac
from sentinela.seguranca.bloqueio import LimitadorIP

# reexportados: a mesma causa do agendador; MAC vive em rede/mac.py (usado pela descoberta)
__all__ = ["CAUSA_FORA", "MSG_MAC", "normalizar_mac"]

CAUSA_MANUAL = "manual"
CAUSA_DENTRO = "dentro_das_subredes"  # retomada automática: a sub-rede voltou
MSG_CLASSE = "Classe inexistente."
MSG_IP_DUPLICADO = "Já existe um equipamento com este IP."
MSG_MAC_DUPLICADO = "Já existe um equipamento com este MAC."


def erro(codigo: int, motivo: str) -> HTTPException:
    """Erro com ``{"detail": motivo}`` (motivo fixo em português, nunca a entrada)."""
    return HTTPException(codigo, detail=motivo)


def nao_encontrado() -> HTTPException:
    return erro(status.HTTP_404_NOT_FOUND, "Não encontrado.")


MSG_TAXA = "Muitas solicitações; aguarde um pouco."


def limitar_taxa(request: Request, usuario: Usuario) -> None:
    """10 por minuto por usuário nas ações que falam com a rede (testar, coletar, sondar,
    iniciar varredura): a mesma janela deslizante do bloqueio de login (``LimitadorIP``),
    com a chave no id do usuário. 429 com ``Retry-After`` quando estourar."""
    limitador: LimitadorIP = request.app.state.taxa_descoberta
    espera = limitador.reservar(f"usuario:{usuario.id}")
    if espera:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=MSG_TAXA,
            headers={"Retry-After": str(max(1, math.ceil(espera)))},
        )


def validar_destino(guarda: Guarda, ip: str, porta: int | None, checagem: str) -> str:
    """Valida com a Guarda viva; devolve o IP normalizado ou levanta DestinoProibido.

    Câmera atrás de gravador (``checagem == "gravador"``, R3) não passa pela Guarda: nenhum
    socket vai até ela (o estado vem do gravador, cujo host é validado); o IP interno só
    precisa ser um IPv4 bem formado.
    """
    if checagem == GRAVADOR:
        try:
            return str(IPv4Address(ip.strip()))
        except ValueError:
            raise DestinoProibido("Endereço IPv4 inválido.") from None
    destino = guarda.validar(ip, porta, cast(Protocolo, checagem))
    return str(destino.ip)


def validar_destino_http(guarda: Guarda, ip: str, porta: int | None, checagem: str) -> str:
    try:
        return validar_destino(guarda, ip, porta, checagem)
    except DestinoProibido as e:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, e.motivo) from None


def retrato(eq: Equipamento, classe_slug: str) -> dict[str, Any]:
    """Estado cadastral para a auditoria (sem segredos)."""
    return {
        "nome": eq.nome,
        "ip": eq.ip,
        "mac": eq.mac,
        "classe": classe_slug,
        "checagem": eq.checagem,
        "porta": eq.porta,
        "pausado": eq.pausado,
    }


def auditar(
    db: AsyncSession,
    request: Request,
    usuario: Usuario,
    acao: str,
    alvo: str | None,
    antes: dict[str, Any] | None = None,
    depois: dict[str, Any] | None = None,
) -> None:
    db.add(
        Auditoria(
            usuario_id=usuario.id,
            acao=acao,
            alvo=alvo,
            antes=antes,
            depois=depois,
            ip=request.client.host if request.client else None,
            em=agora_utc(),
        )
    )


def _evento_direto(
    db: AsyncSession, eq: Equipamento, para: Estado, causa: str, agora: datetime
) -> None:
    """Transição gravada pela própria rota quando o agendador não conhece o equipamento."""
    if eq.estado == para.value:
        return
    db.add(
        Evento(
            equipamento_id=eq.id,
            de=eq.estado,
            para=para.value,
            em=agora,
            duracao_s=max(0.0, (agora - eq.estado_desde).total_seconds()),
            causa=causa,
        )
    )
    eq.estado = para.value
    eq.estado_desde = agora


def _registrado(agendador: Agendador | None, eq: Equipamento) -> bool:
    return agendador is not None and agendador.estado_de(eq.id) is not None


def marcar_pausa(
    db: AsyncSession, agendador: Agendador | None, eq: Equipamento, causa: str
) -> bool:
    """Parte transacional da pausa. True: chamar ``agendador.pausar`` DEPOIS do commit
    (o gravador escreve em outra sessão; antes do commit ele esperaria o nosso bloqueio).
    Sem agendador (CLI com o core parado) o evento é sempre gravado aqui."""
    eq.pausado = True
    if _registrado(agendador, eq):
        return True
    _evento_direto(db, eq, Estado.PAUSADO, causa, agora_utc())
    return False


def marcar_retomada(
    db: AsyncSession, agendador: Agendador | None, eq: Equipamento, causa: str
) -> bool:
    """Parte transacional da retomada; True: chamar ``agendador.retomar`` após o commit."""
    eq.pausado = False
    if _registrado(agendador, eq):
        return True
    _evento_direto(db, eq, Estado.DESCONHECIDO, causa, agora_utc())
    return False


async def classe_de(db: AsyncSession, eq: Equipamento) -> Classe:
    classe = await db.get(Classe, eq.classe_id)
    if classe is None:  # chave estrangeira garante; defensivo
        raise nao_encontrado()
    return classe


async def ultima_causa_de_pausa(db: AsyncSession, equipamento_id: str) -> str | None:
    consulta = (
        select(Evento.causa)
        .where(Evento.equipamento_id == equipamento_id, Evento.para == Estado.PAUSADO.value)
        .order_by(Evento.em.desc(), Evento.id.desc())
        .limit(1)
    )
    causa: str | None = await db.scalar(consulta)
    return causa


@dataclass
class Sincronizacao:
    """O que aplicar no agendador DEPOIS do commit e de ``guarda.atualizar``, nesta ordem."""

    pausar: list[str] = field(default_factory=list)
    retomar: list[str] = field(default_factory=list)
    adicionar: list[Alvo] = field(default_factory=list)


async def sincronizar(
    db: AsyncSession, agendador: Agendador | None, candidata: Guarda
) -> Sincronizacao:
    """Classifica os equipamentos pelas sub-redes ``candidata`` (ainda não aplicadas).

    - fora (e não pausado): ``marcar_pausa`` com causa ``fora_das_subredes``;
    - dentro e pausado SÓ por estar fora (última causa de pausa ``fora_das_subredes``):
      ``marcar_retomada`` com causa ``dentro_das_subredes``; pausa manual continua;
    - dentro e ainda não registrado no agendador: vira alvo a adicionar.

    Câmera atrás de gravador (R3) nunca é pausada nem retomada por sub-rede: segue o
    gravador; só entra como alvo a adicionar se ainda não estiver no agendador.
    """
    r = Sincronizacao()
    linhas = await db.execute(
        select(Equipamento, Classe).join(Classe, Equipamento.classe_id == Classe.id)
    )
    for eq, classe in linhas:
        if eq.checagem == GRAVADOR:
            if not eq.pausado and not _registrado(agendador, eq):
                r.adicionar.append(alvo_de(eq, classe))
            continue
        try:
            validar_destino(candidata, eq.ip, eq.porta, eq.checagem)
        except DestinoProibido:
            if not eq.pausado and marcar_pausa(db, agendador, eq, CAUSA_FORA):
                r.pausar.append(eq.id)
            continue
        if eq.pausado and await ultima_causa_de_pausa(db, eq.id) == CAUSA_FORA:
            if marcar_retomada(db, agendador, eq, CAUSA_DENTRO):
                r.retomar.append(eq.id)
                continue
        if not _registrado(agendador, eq):
            r.adicionar.append(alvo_de(eq, classe))
    return r


async def mapa_classes(db: AsyncSession) -> dict[str, Classe]:
    """Classes por slug e por nome, sem diferenciar maiúsculas (``casefold``)."""
    mapa: dict[str, Classe] = {}
    for c in (await db.execute(select(Classe).order_by(Classe.ordem))).scalars():
        mapa.setdefault(c.nome.casefold(), c)
        mapa[c.slug.casefold()] = c  # slug tem prioridade sobre nome igual
    return mapa


async def classe_por_chave(db: AsyncSession, chave: str) -> Classe:
    classe = (await mapa_classes(db)).get(chave.strip().casefold())
    if classe is None:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, MSG_CLASSE)
    return classe
