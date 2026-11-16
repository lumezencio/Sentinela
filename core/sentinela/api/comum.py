"""Peças comuns da API de cadastro: auditoria, validação de destino e MAC, pausa/retomada."""

import re
from datetime import datetime
from typing import Any, cast

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.api.deps import agora_utc
from sentinela.db.modelos import Auditoria, Classe, Equipamento, Evento, Usuario
from sentinela.monitor.agendador import Agendador, Alvo
from sentinela.monitor.estados import Estado
from sentinela.monitor.montagem import alvo_de
from sentinela.rede.guarda import DestinoProibido, Guarda, Protocolo

CAUSA_FORA = "fora_das_subredes"
CAUSA_MANUAL = "manual"
MSG_MAC = "MAC inválido."
MSG_CLASSE = "Classe inexistente."
MSG_IP_DUPLICADO = "Já existe um equipamento com este IP."
MSG_MAC_DUPLICADO = "Já existe um equipamento com este MAC."
_MAC = re.compile(r"^[0-9a-f]{2}([:-])[0-9a-f]{2}(\1[0-9a-f]{2}){4}$")


def erro(codigo: int, motivo: str) -> HTTPException:
    """Erro com ``{"detail": motivo}`` (motivo fixo em português, nunca a entrada)."""
    return HTTPException(codigo, detail=motivo)


def nao_encontrado() -> HTTPException:
    return erro(status.HTTP_404_NOT_FOUND, "Não encontrado.")


def normalizar_mac(mac: str) -> str:
    """``AA-BB-...`` ou ``aa:bb:...`` → ``aa:bb:cc:dd:ee:ff``; ValueError se inválido."""
    valor = mac.strip().lower()
    if not _MAC.fullmatch(valor):
        raise ValueError(MSG_MAC)
    return valor.replace("-", ":")


def validar_destino(guarda: Guarda, ip: str, porta: int | None, checagem: str) -> str:
    """Valida com a Guarda viva; devolve o IP normalizado ou levanta DestinoProibido."""
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


def marcar_pausa(db: AsyncSession, agendador: Agendador, eq: Equipamento, causa: str) -> bool:
    """Parte transacional da pausa. True: chamar ``agendador.pausar`` DEPOIS do commit
    (o gravador escreve em outra sessão; antes do commit ele esperaria o nosso bloqueio)."""
    eq.pausado = True
    if agendador.estado_de(eq.id) is not None:
        return True
    _evento_direto(db, eq, Estado.PAUSADO, causa, agora_utc())
    return False


def marcar_retomada(db: AsyncSession, agendador: Agendador, eq: Equipamento, causa: str) -> bool:
    """Parte transacional da retomada; True: chamar ``agendador.retomar`` após o commit."""
    eq.pausado = False
    if agendador.estado_de(eq.id) is not None:
        return True
    _evento_direto(db, eq, Estado.DESCONHECIDO, causa, agora_utc())
    return False


async def classe_de(db: AsyncSession, eq: Equipamento) -> Classe:
    classe = await db.get(Classe, eq.classe_id)
    if classe is None:  # chave estrangeira garante; defensivo
        raise nao_encontrado()
    return classe


async def sincronizar(
    db: AsyncSession, agendador: Agendador, candidata: Guarda
) -> tuple[list[str], list[Alvo]]:
    """Classifica os equipamentos pelas sub-redes ``candidata`` (ainda não aplicadas).

    Os que ficam de fora (e não estavam pausados) recebem ``marcar_pausa`` nesta transação.
    Devolve (ids a pausar no agendador, alvos a registrar) para aplicar DEPOIS do commit e de
    ``guarda.atualizar``, na ordem: atualizar a guarda, pausar, adicionar.
    """
    pausar: list[str] = []
    adicionar: list[Alvo] = []
    linhas = await db.execute(
        select(Equipamento, Classe).join(Classe, Equipamento.classe_id == Classe.id)
    )
    for eq, classe in linhas:
        try:
            validar_destino(candidata, eq.ip, eq.porta, eq.checagem)
        except DestinoProibido:
            if not eq.pausado and marcar_pausa(db, agendador, eq, CAUSA_FORA):
                pausar.append(eq.id)
            continue
        if agendador.estado_de(eq.id) is None:
            adicionar.append(alvo_de(eq, classe))
    return pausar, adicionar


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
