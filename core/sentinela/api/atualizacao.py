"""Atualização automática: estado para qualquer usuário e a chave liga/desliga (admin).

A API só lê e grava o ``atualizacao.json``; quem atualiza é o ``update.sh`` no host (timer do
systemd). O core não tem socket do Docker nem executa processo.
"""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict

from sentinela import __version__, atualizacao
from sentinela.api.comum import auditar, limitar_taxa, nao_encontrado
from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc, exigir_admin
from sentinela.atualizacao import EstadoAtualizacao
from sentinela.config import pasta_dados
from sentinela.db.modelos import Usuario

log = logging.getLogger("sentinela.atualizacao")
router = APIRouter(prefix="/api/v1/atualizacao", tags=["atualizacao"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
COMANDO_MANUAL = "./update.sh"
MSG_FALHA = "Não foi possível salvar a configuração."


class AtualizacaoSaida(BaseModel):
    versao: str
    ativo: bool
    agendado: bool
    ultima_verificacao: datetime | None
    ultima_verificacao_ok: datetime | None
    resultado: str | None
    de: str | None
    para: str | None
    mensagem: str | None
    aviso: str | None
    comando_manual: str
    arquivo_ilegivel: bool


class AtualizacaoEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ativo: bool


def _pasta(request: Request) -> Path:
    try:
        return pasta_dados(request.app.state.settings)
    except ValueError:  # banco em memória: sem pasta de dados, sem atualização
        raise nao_encontrado() from None


def _saida(request: Request, e: EstadoAtualizacao, ilegivel: bool) -> AtualizacaoSaida:
    return AtualizacaoSaida(
        versao=__version__,
        ativo=e.ativo,
        agendado=e.agendado,
        ultima_verificacao=e.ultima_verificacao,
        ultima_verificacao_ok=e.ultimo_sucesso,
        resultado=e.resultado,
        de=e.de,
        para=e.para,
        mensagem=e.mensagem,
        aviso=atualizacao.aviso(e, agora_utc()),
        comando_manual=COMANDO_MANUAL,
        arquivo_ilegivel=ilegivel,
    )


@router.get("", response_model=AtualizacaoSaida)
async def ver(request: Request, _usuario: UsuarioAtual) -> AtualizacaoSaida:
    pasta = _pasta(request)
    return _saida(request, atualizacao.ler(pasta), atualizacao.ilegivel(pasta))


@router.patch("", response_model=AtualizacaoSaida)
async def definir(
    request: Request, corpo: AtualizacaoEntrada, db: SessaoDB, admin: Admin
) -> AtualizacaoSaida:
    limitar_taxa(request, admin)
    pasta = _pasta(request)
    antes = atualizacao.ler(pasta)
    try:
        # a trava em arquivo pode esperar até 10 s: fora do laço de eventos
        novo = await asyncio.to_thread(atualizacao.definir_ativo, pasta, corpo.ativo)
    except OSError:
        log.error("não foi possível gravar o atualizacao.json")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=MSG_FALHA) from None
    auditar(
        db, request, admin, "atualizacao.ativo", None, {"ativo": antes.ativo}, {"ativo": novo.ativo}
    )
    await db.commit()
    return _saida(request, novo, False)
