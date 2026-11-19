"""Configuração do Telegram (admin): token cifrado no cofre, chats e "incluir IP".

O token nunca sai: nem em resposta, log, auditoria ou erro. ``ultimo_erro`` e o erro do teste
são sempre textos fixos do ``ClienteTelegram``.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from sentinela.alertas.ajustes import (
    AjustesTelegram,
    cifrar_token,
    decifrar_token,
    gravar_telegram,
    ler_status,
    ler_telegram,
    registrar_status,
)
from sentinela.alertas.telegram import ErroTelegram
from sentinela.alertas.textos import TEXTO_TESTE
from sentinela.api.comum import auditar, limitar_taxa
from sentinela.api.deps import SessaoDB, agora_utc, exigir_admin
from sentinela.api.esquemas_alertas import TelegramEdicao, TelegramSaida, TesteSaida
from sentinela.db.modelos import Usuario
from sentinela.seguranca.cofre import Cofre

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/config/telegram", tags=["config"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
MSG_DEMO = "Indisponível no modo demonstração."
MSG_CONFIGURAR = "Configure o token e ao menos um chat."
MSG_FALHA = "Falha no envio ao Telegram."


async def _saida(db: SessaoDB, cofre: Cofre) -> TelegramSaida:
    a = await ler_telegram(db)
    st = await ler_status(db)
    return TelegramSaida(
        token_definido=a.token_cifrado is not None,
        token_ilegivel=a.token_cifrado is not None
        and decifrar_token(cofre, a.token_cifrado) is None,
        chats=list(a.chats),
        incluir_ip=a.incluir_ip,
        ultimo_envio=st["ultimo_envio"],
        ultimo_erro=st["ultimo_erro"],
    )


@router.get("", response_model=TelegramSaida)
async def ver(request: Request, db: SessaoDB, _admin: Admin) -> TelegramSaida:
    return await _saida(db, request.app.state.cofre)


@router.patch("", response_model=TelegramSaida)
async def editar(
    edicao: TelegramEdicao, request: Request, db: SessaoDB, admin: Admin
) -> TelegramSaida:
    atual = await ler_telegram(db)
    token_cifrado = atual.token_cifrado
    token_alterado = edicao.token is not None
    if edicao.token is not None:
        token_cifrado = (
            cifrar_token(request.app.state.cofre, edicao.token) if edicao.token else None
        )
    novo = AjustesTelegram(
        token_cifrado=token_cifrado,
        chats=list(edicao.chats) if edicao.chats is not None else list(atual.chats),
        incluir_ip=edicao.incluir_ip if edicao.incluir_ip is not None else atual.incluir_ip,
    )
    await gravar_telegram(db, novo)
    auditar(
        db,
        request,
        admin,
        "config.telegram",
        "telegram",
        None,
        {"token_alterado": token_alterado, "chats": len(novo.chats), "incluir_ip": novo.incluir_ip},
    )
    await db.commit()
    return await _saida(db, request.app.state.cofre)


@router.post("/teste", response_model=TesteSaida)
async def testar(request: Request, db: SessaoDB, admin: Admin) -> TesteSaida:
    limitar_taxa(request, admin)
    cliente = request.app.state.cliente_telegram
    if cliente is None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=MSG_DEMO)
    ajustes = await ler_telegram(db)
    token = decifrar_token(request.app.state.cofre, ajustes.token_cifrado)
    if token is None or not ajustes.chats:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=MSG_CONFIGURAR)
    enviou = False
    erro: str | None = None
    for chat in ajustes.chats:
        falha: str | None = None
        try:
            await cliente.enviar(token, chat, TEXTO_TESTE)
            enviou = True
        except ErroTelegram as e:
            falha = e.mensagem
        except Exception:  # noqa: BLE001 - nada da pilha HTTP (URL com o token) sai daqui
            log.warning("telegram: falha inesperada no teste")
            falha = MSG_FALHA
        if falha is not None and erro is None:
            erro = falha
    await registrar_status(db, enviou, erro, agora_utc())
    await db.commit()
    return TesteSaida(ok=erro is None, erro=erro)
