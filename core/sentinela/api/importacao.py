"""Importação de equipamentos por CSV (admin, multipart, até 1 MB, até 5000 linhas).

As linhas válidas entram numa única transação; cada linha inválida vira ``{linha, motivo}``.
"""

import uuid
from dataclasses import dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import UploadFile
from starlette.types import Message

from sentinela.api import comum
from sentinela.api.comum import auditar, erro
from sentinela.api.deps import SessaoDB, agora_utc, exigir_admin
from sentinela.api.esquemas_equipamentos import ErroLinha, ResultadoImportacao
from sentinela.api.leitor_csv import ArquivoInvalido, decodificar, ler_linhas
from sentinela.db.modelos import Classe, Equipamento, Usuario
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.montagem import alvo_de
from sentinela.rede.guarda import DestinoProibido, Guarda

router = APIRouter(prefix="/api/v1/equipamentos", tags=["equipamentos"])
Admin = Annotated[Usuario, Depends(exigir_admin)]

LIMITE_ARQUIVO = 1024 * 1024
LIMITE_CORPO = LIMITE_ARQUIVO + 64 * 1024  # folga para os cabeçalhos do multipart
MAX_ERROS = 200
_CHECAGENS = ("icmp", "tcp", "http")
_GRANDE = "Arquivo maior que 1 MB."


class _LinhaInvalida(ValueError):
    def __init__(self, motivo: str) -> None:
        super().__init__(motivo)
        self.motivo = motivo


@dataclass
class _Contexto:
    guarda: Guarda
    classes: dict[str, Classe]
    ips: dict[str, int | None]  # ip -> linha do arquivo (None: já no banco)
    macs: dict[str, int | None]


async def _ler_arquivo(request: Request) -> bytes:
    """Lê o corpo com teto (antes de qualquer parse) e extrai o campo ``arquivo``."""
    declarado = request.headers.get("content-length", "")
    if declarado.isdigit() and int(declarado) > LIMITE_CORPO:
        raise erro(status.HTTP_413_CONTENT_TOO_LARGE, _GRANDE)
    corpo = bytearray()
    async for parte in request.stream():
        corpo += parte
        if len(corpo) > LIMITE_CORPO:
            raise erro(status.HTTP_413_CONTENT_TOO_LARGE, _GRANDE)

    async def reenviar() -> Message:
        return {"type": "http.request", "body": bytes(corpo), "more_body": False}

    async with Request(request.scope, reenviar).form(max_files=1, max_fields=8) as form:
        arquivo = form.get("arquivo")
        if not isinstance(arquivo, UploadFile):
            raise erro(
                status.HTTP_422_UNPROCESSABLE_CONTENT, "Envie o CSV no campo 'arquivo' (multipart)."
            )
        dados = await arquivo.read(LIMITE_ARQUIVO + 1)
    if len(dados) > LIMITE_ARQUIVO:
        raise erro(status.HTTP_413_CONTENT_TOO_LARGE, _GRANDE)
    return dados


async def _contexto(db: AsyncSession, guarda: Guarda) -> _Contexto:
    ips = (await db.execute(select(Equipamento.ip))).scalars()
    macs = (await db.execute(select(Equipamento.mac).where(Equipamento.mac.is_not(None)))).scalars()
    return _Contexto(
        guarda=guarda,
        classes=await comum.mapa_classes(db),
        ips=dict.fromkeys(ips),
        macs={m: None for m in macs if m is not None},
    )


def _repetido(origem: int | None, msg_banco: str, campo: str) -> _LinhaInvalida:
    if origem is None:
        return _LinhaInvalida(msg_banco)
    return _LinhaInvalida(f"{campo} repetido no arquivo (igual à linha {origem}).")


def _validar(linha: int, reg: dict[str, str], ctx: _Contexto) -> tuple[Equipamento, Classe]:
    nome = reg.get("nome", "")
    if not 1 <= len(nome) <= 80:
        raise _LinhaInvalida("Nome obrigatório, de 1 a 80 caracteres.")
    classe = ctx.classes.get(reg.get("classe", "").casefold())
    if classe is None:
        raise _LinhaInvalida(comum.MSG_CLASSE)
    checagem = reg.get("checagem", "").casefold() or "icmp"
    if checagem not in _CHECAGENS:
        raise _LinhaInvalida("Checagem inválida: use icmp, tcp ou http.")
    texto_porta = reg.get("porta", "")
    if texto_porta and not (texto_porta.isdecimal() and len(texto_porta) <= 5):
        raise _LinhaInvalida("Porta fora do intervalo 1-65535.")
    porta = int(texto_porta) if texto_porta else None
    try:
        ip = comum.validar_destino(ctx.guarda, reg.get("ip", ""), porta, checagem)
        mac = comum.normalizar_mac(reg["mac"]) if reg.get("mac") else None
    except DestinoProibido as e:
        raise _LinhaInvalida(e.motivo) from None
    except ValueError:
        raise _LinhaInvalida(comum.MSG_MAC) from None
    if ip in ctx.ips:
        raise _repetido(ctx.ips[ip], comum.MSG_IP_DUPLICADO, "IP")
    if mac is not None and mac in ctx.macs:
        raise _repetido(ctx.macs[mac], comum.MSG_MAC_DUPLICADO, "MAC")
    ctx.ips[ip] = linha
    if mac is not None:
        ctx.macs[mac] = linha
    agora = agora_utc()
    eq = Equipamento(
        id=str(uuid.uuid4()),
        nome=nome,
        ip=ip,
        mac=mac,
        classe_id=classe.id,
        classe_origem="manual",
        checagem=checagem,
        porta=porta,
        estado="desconhecido",
        estado_desde=agora,
        pausado=False,
        criado_em=agora,
    )
    return eq, classe


@router.post("/importar", response_model=ResultadoImportacao)
async def importar(request: Request, db: SessaoDB, admin: Admin) -> ResultadoImportacao:
    dados = await _ler_arquivo(request)
    try:
        linhas = ler_linhas(decodificar(dados))
    except ArquivoInvalido as e:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, e.motivo) from None

    guarda: Guarda = request.app.state.guarda
    ctx = await _contexto(db, guarda)
    novos: list[tuple[Equipamento, Classe]] = []
    erros: list[ErroLinha] = []
    total_erros = 0
    for linha, reg in linhas:
        try:
            novos.append(_validar(linha, reg, ctx))
        except _LinhaInvalida as e:
            total_erros += 1
            if len(erros) < MAX_ERROS:
                erros.append(ErroLinha(linha=linha, motivo=e.motivo))

    db.add_all(eq for eq, _ in novos)
    resumo = {"importados": len(novos), "erros": total_erros}
    auditar(db, request, admin, "equipamento.importar", None, depois=resumo)
    try:
        await db.commit()
    except IntegrityError:  # outra escrita concorrente ocupou um IP/MAC
        await db.rollback()
        raise erro(status.HTTP_409_CONFLICT, "Conflito com outro equipamento.") from None

    agendador: Agendador = request.app.state.agendador
    for eq, classe in novos:
        agendador.adicionar(alvo_de(eq, classe))
    return ResultadoImportacao(importados=len(novos), erros=erros)
