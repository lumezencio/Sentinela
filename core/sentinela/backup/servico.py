"""Serviço de backup: agenda diária (03:00 no fuso), cópia manual e status.

O trabalho pesado (API de backup do SQLite, tar, gzip) roda em ``asyncio.to_thread``: o laço de
eventos nunca bloqueia. Um backup por vez (``asyncio.Lock``). Erros viram texto fixo em
``config.backup_status``; nunca a exceção da pilha.
"""

import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, datetime, time, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.backup.arquivo import (
    ErroBackup,
    InfoBackup,
    TipoBackup,
    criar_backup,
    info_de,
    listar,
)
from sentinela.db.modelos import Config
from sentinela.relogio import Relogio

log = logging.getLogger(__name__)

CHAVE_STATUS = "backup_status"
HORA_DISPARO = time(3, 0)
RECUPERAR_APOS_H = 26
ESPERA_RECUPERACAO_S = 60.0
MSG_ERRO = "Não foi possível fazer o backup."
DOMINGO = 6


def proximo_disparo(agora: datetime, zona: ZoneInfo) -> datetime:
    """Próximo 03:00 no fuso dado (estritamente depois de ``agora``), devolvido em UTC; correto
    na troca de horário de verão."""
    local = agora.astimezone(zona)
    dia = local.date()
    while True:
        alvo = datetime.combine(dia, HORA_DISPARO, tzinfo=zona).astimezone(UTC)
        if alvo > agora:
            return alvo
        dia += timedelta(days=1)


class ServicoBackup:
    def __init__(
        self,
        sessoes: async_sessionmaker[AsyncSession],
        banco: Path,
        destino: Path,
        relogio: Relogio,
        agora: Callable[[], datetime],
        zona: ZoneInfo,
        versao: str,
    ) -> None:
        self._sessoes = sessoes
        self.banco = banco
        self.destino = destino
        self._relogio = relogio
        self._agora = agora
        self._zona = zona
        self._versao = versao
        self._trava = asyncio.Lock()

    async def criar(self, tipo: TipoBackup) -> InfoBackup:
        """Um backup por vez (os demais esperam na fila). Levanta ``ErroBackup`` (texto fixo)."""
        async with self._trava:
            agora = self._agora()
            try:
                caminho = await asyncio.to_thread(
                    criar_backup, self.banco, self.destino, tipo, agora, self._versao
                )
                info = await asyncio.to_thread(info_de, caminho)
                if info is None:  # nunca: o nome vem do próprio criar_backup
                    raise ErroBackup(MSG_ERRO)
            except ErroBackup as e:
                await self._gravar_status(None, None, str(e) or MSG_ERRO, agora)
                raise
            except Exception:
                log.exception("backup: falha inesperada")
                await self._gravar_status(None, None, MSG_ERRO, agora)
                raise ErroBackup(MSG_ERRO) from None
            await self._gravar_status(agora, info.tamanho, None, agora)
            return info

    async def _gravar_status(
        self, ok_em: datetime | None, tamanho: int | None, erro: str | None, agora: datetime
    ) -> None:
        """Sucesso (``ok_em``) zera o erro; falha mantém o último sucesso e grava o erro."""
        try:
            async with self._sessoes() as db:
                atual = await self._ler(db)
                valor: dict[str, Any] = {
                    "ultimo_em": ok_em.isoformat() if ok_em else atual["ultimo_em"],
                    "ultimo_tamanho": tamanho if ok_em else atual["ultimo_tamanho"],
                    "ultimo_erro": erro,
                }
                linha = await db.get(Config, CHAVE_STATUS)
                if linha is None:
                    db.add(Config(chave=CHAVE_STATUS, valor=valor))
                else:
                    linha.valor = valor
                await db.commit()
        except Exception:
            log.exception("backup: não foi possível gravar o status")

    @staticmethod
    async def _ler(db: AsyncSession) -> dict[str, Any]:
        linha = await db.get(Config, CHAVE_STATUS)
        valor = linha.valor if linha is not None and isinstance(linha.valor, dict) else {}
        em = valor.get("ultimo_em")
        tamanho = valor.get("ultimo_tamanho")
        erro = valor.get("ultimo_erro")
        return {
            "ultimo_em": em if isinstance(em, str) else None,
            "ultimo_tamanho": tamanho if type(tamanho) is int else None,
            "ultimo_erro": erro if isinstance(erro, str) else None,
        }

    async def status(self, db: AsyncSession) -> dict[str, Any]:
        """``ultimo_em`` (ISO), ``ultimo_tamanho``, ``ultimo_erro`` e ``copias``."""
        base = await self._ler(db)
        copias = await asyncio.to_thread(listar, self.destino)
        base["copias"] = [
            {
                "nome": c.nome,
                "tipo": c.tipo,
                "criado_em": c.criado_em.isoformat(),
                "tamanho": c.tamanho,
            }
            for c in copias
        ]
        return base

    async def _recuperar(self) -> None:
        """Ao subir: último backup com mais de 26 h (ou nenhum) → um backup após 60 s."""
        copias = await asyncio.to_thread(listar, self.destino)
        if copias and self._agora() - copias[0].criado_em <= timedelta(hours=RECUPERAR_APOS_H):
            return
        await self._relogio.dormir(ESPERA_RECUPERACAO_S)
        await self._tentar("diario")

    async def _tentar(self, tipo: TipoBackup) -> None:
        try:
            await self.criar(tipo)
        except ErroBackup:
            pass  # já registrado no status; o laço segue para o próximo disparo

    async def executar(self) -> None:
        await self._recuperar()
        while True:
            alvo = proximo_disparo(self._agora(), self._zona)
            while (falta := (alvo - self._agora()).total_seconds()) > 0:
                await self._relogio.dormir(falta)
            await self._tentar("diario")
            if alvo.astimezone(self._zona).weekday() == DOMINGO:
                await self._tentar("semanal")
