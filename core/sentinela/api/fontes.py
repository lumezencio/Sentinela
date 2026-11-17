"""Fontes de descoberta (MikroTik, SNMP, gravadores): CRUD, testar, confiar e coletar agora.

- Credencial só entra (cifrada pelo ``Cofre``) e nunca sai: a saída diz
  ``credencial_definida``. PATCH sem ``credencial`` mantém a antiga.
- O host passa pela Guarda na gravação, com o protocolo do tipo (MikroTik ``tcp``, SNMP
  ``udp``, gravador ``http``/``https``); recusa é 422 com mensagem fixa.
- **Impressão TLS (§9.4)**: ``testar`` guarda em memória a última impressão mostrada por
  fonte (``app.state.impressoes_mostradas``); ``confiar`` só aceita exatamente essa (64 hex
  minúsculos, validada antes de comparar), senão 409. Vale uma vez; editar host/porta/TLS ou
  remover a fonte apaga a mostrada e a confiada. Reiniciar o processo também a esquece
  (o admin testa de novo): nada de impressão "mostrada" persiste fora do teste.
- testar/coletar contam no limite de 10 por minuto por usuário. ``coletar`` responde 202 na
  hora e coleta em fundo (o fim chega pelo WebSocket como ``fonte``/``coletada``).
- Toda escrita é auditada sem segredo; erros ao cliente são genéricos.
"""

import hmac
import logging
import math
import re
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, Request, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.api.comum import auditar, erro, limitar_taxa, nao_encontrado
from sentinela.api.deps import SessaoDB, exigir_admin
from sentinela.api.esquemas_descoberta import (
    MSG_CREDENCIAL_TIPO,
    ConfiarEntrada,
    FonteEdicao,
    FonteEntrada,
    FonteSaida,
    TesteSaida,
    credencial_combina,
    credencial_em_texto,
)
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import Descoberta, Fonte, Usuario
from sentinela.descoberta.fontes.base import ResultadoTeste
from sentinela.descoberta.mescla import APROVADA
from sentinela.descoberta.orquestrador import ColetaRecente, FonteInexistente, Orquestrador
from sentinela.rede.guarda import DestinoProibido, Guarda, Protocolo
from sentinela.seguranca.cofre import Cofre

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/fontes", tags=["fontes"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
IdFonte = Annotated[str, Path()]  # qualquer id desconhecido é 404

MAX_FONTES = 32
MSG_HOST = "Host inválido ou fora das sub-redes monitoradas."
MSG_LIMITE = "Limite de fontes atingido."
MSG_IMPRESSAO = "A impressão não confere com a mostrada no último teste; teste de novo."
_HEX64 = re.compile(r"[0-9a-f]{64}")
_CAMPOS_CONEXAO = ("host", "porta", "tls")


def _orq(request: Request) -> Orquestrador:
    o: Orquestrador = request.app.state.orquestrador
    return o


def _mostradas(request: Request) -> dict[str, str]:
    m: dict[str, str] = request.app.state.impressoes_mostradas
    return m


def _protocolo(tipo: str, tls: bool) -> Protocolo:
    if tipo == "mikrotik":
        return "tcp"
    if tipo == "snmp":
        return "udp"
    return "https" if tls else "http"


def porta_padrao(tipo: str, tls: bool) -> int:
    if tipo == "mikrotik":
        return 8729 if tls else 8728
    if tipo == "snmp":
        return 161
    return 443 if tls else 80


def _validar_host(guarda: Guarda, tipo: str, host: str, porta: int, tls: bool) -> str:
    try:
        return str(guarda.validar(host, porta, _protocolo(tipo, tls)).ip)
    except DestinoProibido:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, MSG_HOST) from None


def _retrato(f: Fonte) -> dict[str, Any]:
    """Estado da fonte para a auditoria: NUNCA a credencial."""
    return {
        "tipo": f.tipo,
        "nome": f.nome,
        "host": f.host,
        "porta": f.porta,
        "tls": f.tls,
        "ativa": f.ativa,
        "intervalo_s": f.intervalo_s,
        "impressao_tls": f.impressao_tls,
    }


def _texto(texto: str | None, segredos: list[str], limite: int = 200) -> str | None:
    return None if texto is None else Cofre.mascarar(texto, segredos)[:limite]


async def _carregar(db: AsyncSession, id: str) -> Fonte:
    fonte = await db.get(Fonte, id)
    if fonte is None:
        raise nao_encontrado()
    return fonte


@router.get("", response_model=list[FonteSaida])
async def listar(db: SessaoDB, _admin: Admin) -> list[FonteSaida]:
    fontes = (await db.execute(select(Fonte).order_by(Fonte.nome, Fonte.id))).scalars()
    return [FonteSaida.de(f) for f in fontes]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=FonteSaida)
async def criar(entrada: FonteEntrada, request: Request, db: SessaoDB, admin: Admin) -> FonteSaida:
    tls = entrada.tls and entrada.tipo != "snmp"  # SNMP não tem TLS
    porta = entrada.porta or porta_padrao(entrada.tipo, tls)
    host = _validar_host(request.app.state.guarda, entrada.tipo, entrada.host, porta, tls)
    if (await db.scalar(select(func.count()).select_from(Fonte)) or 0) >= MAX_FONTES:
        raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, MSG_LIMITE)
    cofre: Cofre = request.app.state.cofre
    fonte = Fonte(
        id=str(uuid.uuid4()),
        tipo=entrada.tipo,
        nome=entrada.nome,
        host=host,
        porta=porta,
        tls=tls,
        credencial_cifrada=cofre.cifrar(credencial_em_texto(entrada.credencial)),
        ativa=entrada.ativa,
        intervalo_s=entrada.intervalo_s,
    )
    db.add(fonte)
    auditar(db, request, admin, "fonte.criar", fonte.id, depois=_retrato(fonte))
    await db.commit()
    _orq(request).fonte_alterada(fonte.id)
    return FonteSaida.de(fonte)


@router.patch("/{id}", response_model=FonteSaida)
async def editar(
    id: IdFonte, edicao: FonteEdicao, request: Request, db: SessaoDB, admin: Admin
) -> FonteSaida:
    fonte = await _carregar(db, id)
    antes = _retrato(fonte)
    dados = edicao.model_dump(exclude_unset=True)
    tls = bool(dados.get("tls", fonte.tls)) and fonte.tipo != "snmp"
    porta = int(dados.get("porta", fonte.porta))
    if (
        "tls" in dados
        and "porta" not in dados
        and fonte.porta == porta_padrao(fonte.tipo, fonte.tls)
    ):
        porta = porta_padrao(fonte.tipo, tls)  # porta padrão acompanha o TLS
    host = str(dados.get("host", fonte.host))
    conexao_mudou = (host, porta, tls) != (fonte.host, fonte.porta, fonte.tls)
    if conexao_mudou:
        host = _validar_host(request.app.state.guarda, fonte.tipo, host, porta, tls)
        conexao_mudou = (host, porta, tls) != (fonte.host, fonte.porta, fonte.tls)
    credencial_alterada = edicao.credencial is not None
    if edicao.credencial is not None:
        if not credencial_combina(fonte.tipo, edicao.credencial):
            raise erro(status.HTTP_422_UNPROCESSABLE_CONTENT, MSG_CREDENCIAL_TIPO)
        cofre: Cofre = request.app.state.cofre
        fonte.credencial_cifrada = cofre.cifrar(credencial_em_texto(edicao.credencial))
    fonte.host, fonte.porta, fonte.tls = host, porta, tls
    if conexao_mudou:
        # outro aparelho (ou outra porta/TLS): a confiança no certificado não vale mais
        fonte.impressao_tls = None
        _mostradas(request).pop(fonte.id, None)
    for campo in ("nome", "ativa", "intervalo_s"):
        if campo in dados:
            setattr(fonte, campo, dados[campo])
    depois = {**_retrato(fonte), "credencial_alterada": credencial_alterada}
    auditar(db, request, admin, "fonte.editar", fonte.id, antes, depois)
    await db.commit()
    _orq(request).fonte_alterada(fonte.id)
    return FonteSaida.de(fonte)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover(id: IdFonte, request: Request, db: SessaoDB, admin: Admin) -> Response:
    fonte = await _carregar(db, id)
    # câmeras ainda não aprovadas deste gravador não têm mais como ser aprovadas
    orfas = list(
        (
            await db.execute(
                select(Descoberta.id).where(
                    Descoberta.chave.like(f"nvr:{fonte.id}:%"), Descoberta.status != APROVADA
                )
            )
        ).scalars()
    )
    if orfas:
        await db.execute(delete(Descoberta).where(Descoberta.id.in_(orfas)))
    auditar(
        db,
        request,
        admin,
        "fonte.remover",
        fonte.id,
        antes={**_retrato(fonte), "cameras_removidas_da_fila": len(orfas)},
    )
    await db.delete(fonte)
    await db.commit()
    _mostradas(request).pop(id, None)
    orq = _orq(request)
    orq.fonte_alterada(id)
    if orfas:
        barramento: Barramento = request.app.state.barramento
        for d_id in orfas:
            dados = {"acao": "removida", "id": d_id, "classe_sugerida": None, "confianca": 0.0}
            barramento.publicar(Mensagem("descoberta", dados))
        await orq.publicar_pendentes()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{id}/testar", response_model=TesteSaida)
async def testar(id: IdFonte, request: Request, db: SessaoDB, admin: Admin) -> TesteSaida:
    """Conecta e mostra identidade/versão/avisos/impressão. ``Orquestrador.testar`` já roda
    ``apos_teste`` (§9.3: liga ou cria o gravador) e converte qualquer falha em erro
    genérico com a credencial mascarada; aqui os textos são mascarados de novo, por
    garantia, antes de sair."""
    limitar_taxa(request, admin)
    fonte = await _carregar(db, id)
    try:
        resultado: ResultadoTeste = await _orq(request).testar(id)
    except FonteInexistente:
        raise nao_encontrado() from None
    cofre: Cofre = request.app.state.cofre
    segredos = cofre.segredos(fonte.credencial_cifrada)
    impressao = resultado.impressao_tls
    if impressao is None or not _HEX64.fullmatch(impressao):
        impressao = None
        _mostradas(request).pop(id, None)
    else:
        _mostradas(request)[id] = impressao
    saida = TesteSaida(
        ok=resultado.ok,
        identidade=_texto(resultado.identidade, segredos, 120),
        versao=_texto(resultado.versao, segredos, 64),
        avisos=[a for a in (_texto(x, segredos) for x in resultado.avisos[:10]) if a],
        impressao_tls=impressao,
        erro=_texto(resultado.erro, segredos),
    )
    auditar(
        db, request, admin, "fonte.testar", id, depois={"ok": saida.ok, "impressao_tls": impressao}
    )
    await db.commit()
    return saida


@router.post("/{id}/confiar", response_model=FonteSaida)
async def confiar(
    id: IdFonte, entrada: ConfiarEntrada, request: Request, db: SessaoDB, admin: Admin
) -> FonteSaida:
    fonte = await _carregar(db, id)
    mostrada = _mostradas(request).get(id)
    # as duas já são 64 hex ASCII: compare_digest não levanta
    if mostrada is None or not hmac.compare_digest(mostrada, entrada.impressao):
        raise erro(status.HTTP_409_CONFLICT, MSG_IMPRESSAO)
    antes = {"impressao_tls": fonte.impressao_tls}
    fonte.impressao_tls = entrada.impressao
    auditar(db, request, admin, "fonte.confiar", id, antes, {"impressao_tls": entrada.impressao})
    await db.commit()
    _mostradas(request).pop(id, None)
    _orq(request).fonte_alterada(id)
    return FonteSaida.de(fonte)


@router.post("/{id}/coletar", status_code=status.HTTP_202_ACCEPTED, response_model=FonteSaida)
async def coletar(id: IdFonte, request: Request, db: SessaoDB, admin: Admin) -> FonteSaida:
    """Pede a coleta e volta na hora (202, estado atual da fonte): a coleta pode passar do
    tempo do proxy (nginx 60 s). Ela roda em fundo no orquestrador e o fim chega pelo
    WebSocket (``fonte``/``coletada``); detalhes em ``GET /fontes``. No máximo 1 por fonte a
    cada 30 s: 429 imediato com ``Retry-After``."""
    limitar_taxa(request, admin)
    fonte = await _carregar(db, id)
    try:
        await _orq(request).coletar_em_fundo(id)
    except ColetaRecente as e:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
            headers={"Retry-After": str(max(1, math.ceil(e.espera_s)))},
        ) from None
    except FonteInexistente:
        raise nao_encontrado() from None
    auditar(db, request, admin, "fonte.coletar", id)
    await db.commit()
    return FonteSaida.de(fonte)
