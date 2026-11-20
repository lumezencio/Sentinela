"""Rotas da TV do telão, sem sessão: pedir código, consultar o pedido e ler o snapshot.

Isentas do CSRF (a TV não tem sessão) e limitadas: 10 pedidos por IP por hora, 20 pendentes.
Por HTTP (porta 80, ``X-Forwarded-Proto: http`` do nginx) só respondem com a chave
"permitir telão sem HTTPS" ligada; desligada, 404 como se não existissem.

O token ``parede`` só abre o snapshot daqui e o ``/ws/parede``: nome, classe, estado e pai de
cada equipamento (``id`` opaco), nunca IP, MAC, fabricante ou latência.
"""

import math
from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.requests import HTTPConnection
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela import __version__
from sentinela.alertas.textos import dados_do_alerta, texto_painel
from sentinela.api.deps import SessaoDB, agora_utc, isento_de_csrf
from sentinela.db.modelos import Alerta, Classe, Equipamento, Parede
from sentinela.parede.emparelhamento import (
    COOKIE_PAREDE,
    COOKIE_PAREDE_HTTP,
    COOKIE_PEDIDO,
    RETENCAO_PEDIDO,
    VALIDADE_PEDIDO,
    LimitePedidos,
    Modo,
    consultar,
    criar_pedido,
    parede_do_token,
    paredes_http,
)
from sentinela.seguranca.bloqueio import LimitadorIP

router = APIRouter(prefix="/api/v1/parede", tags=["parede"])

CONSULTA_S = 5
MAX_ALERTAS = 20
DURACAO_TOKEN = timedelta(days=365)
CAMINHO_PEDIDO = "/api/v1/parede"
MSG_TAXA = "Muitos pedidos; aguarde um pouco."


def modo_da_conexao(conexao: HTTPConnection) -> Modo:
    """``http``/``ws`` (porta 80 do nginx) ou ``https``/``wss``."""
    return "http" if conexao.url.scheme in ("http", "ws") else "https"


def cookie_do_token(modo: Modo) -> str:
    return COOKIE_PAREDE_HTTP if modo == "http" else COOKIE_PAREDE


def ip_do_cliente(conexao: HTTPConnection) -> str:
    return conexao.client.host if conexao.client else ""


async def exigir_canal(request: Request) -> Modo:
    """Modo da requisição; por HTTP com a chave desligada, 404 (a rota "não existe")."""
    modo = modo_da_conexao(request)
    if modo == "http":
        sessoes: async_sessionmaker[AsyncSession] = request.app.state.sessoes
        async with sessoes() as db:
            if not await paredes_http(db):
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Not Found")
    return modo


Canal = Annotated[Modo, Depends(exigir_canal)]


def item_equipamento(eq: Equipamento, slug: str) -> dict[str, Any]:
    """Linha reduzida do telão: sem IP, MAC, fabricante, latência ou checagem."""
    return {"id": eq.id, "nome": eq.nome, "classe": slug, "estado": eq.estado, "pai_id": eq.pai_id}


async def item_alerta(db: AsyncSession, a: Alerta) -> dict[str, Any]:
    """Alerta reduzido: ``equipamento_id`` (opaco, o mesmo do snapshot) e o total de afetados
    deixam o telão montar o cartão de queda com dados do próprio snapshot (sem IP)."""
    d = await dados_do_alerta(db, a)
    return {
        "id": a.id,
        "tipo": a.tipo,
        "texto": texto_painel(d),
        "aberto_em": a.aberto_em.isoformat(),
        "equipamento_id": a.equipamento_id,
        "afetados": d.afetados,
        "silenciado": a.silenciado,
    }


async def equipamento_reduzido(db: AsyncSession, id: str) -> dict[str, Any] | None:
    linha = (
        await db.execute(
            select(Equipamento, Classe.slug)
            .join(Classe, Equipamento.classe_id == Classe.id)
            .where(Equipamento.id == id)
        )
    ).first()
    return None if linha is None else item_equipamento(*linha)


async def montar_snapshot(db: AsyncSession, nome: str, fuso: str) -> dict[str, Any]:
    """Nome da TV, fuso, classes, equipamentos reduzidos e até 20 alertas abertos."""
    classes = (await db.execute(select(Classe).order_by(Classe.ordem, Classe.id))).scalars()
    linhas = await db.execute(
        select(Equipamento, Classe.slug)
        .join(Classe, Equipamento.classe_id == Classe.id)
        .order_by(Equipamento.nome, Equipamento.id)
    )
    alertas = (
        await db.execute(
            select(Alerta)
            .where(Alerta.fechado_em.is_(None))
            .order_by(Alerta.aberto_em.desc(), Alerta.id.desc())
            .limit(MAX_ALERTAS)
        )
    ).scalars()
    return {
        "nome": nome,
        "versao": __version__,
        "fuso": fuso,
        "classes": [
            {"slug": c.slug, "nome": c.nome, "cor": c.cor, "icone": c.icone, "ordem": c.ordem}
            for c in classes
        ],
        "equipamentos": [item_equipamento(eq, slug) for eq, slug in linhas],
        "alertas": [await item_alerta(db, a) for a in alertas],
    }


def _apagar_cookie(response: Response, modo: Modo, nome: str, path: str) -> None:
    """Remove com os mesmos atributos usados ao gravar."""
    response.delete_cookie(
        nome, path=path, httponly=True, secure=modo == "https", samesite="strict"
    )


def _gravar_cookie(
    response: Response, modo: Modo, nome: str, valor: str, max_age: int, path: str
) -> None:
    response.set_cookie(
        nome,
        valor,
        max_age=max_age,
        path=path,
        httponly=True,
        secure=modo == "https",  # por HTTP o navegador não guardaria um cookie ``Secure``
        samesite="strict",
    )


@router.post("/pedido", status_code=status.HTTP_201_CREATED)
@isento_de_csrf
async def pedir(request: Request, response: Response, db: SessaoDB, modo: Canal) -> dict[str, Any]:
    ip = ip_do_cliente(request)
    limitador: LimitadorIP = request.app.state.pedidos_ip
    espera = limitador.reservar(ip)
    if espera:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=MSG_TAXA,
            headers={"Retry-After": str(max(1, math.ceil(espera)))},
        )
    try:
        pedido, codigo, segredo = await criar_pedido(db, ip, modo, agora_utc())
    except LimitePedidos as e:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=MSG_TAXA,
            headers={"Retry-After": str(e.espera_s)},
        ) from None
    await db.commit()
    _gravar_cookie(
        response,
        modo,
        COOKIE_PEDIDO,
        segredo,
        int((VALIDADE_PEDIDO + RETENCAO_PEDIDO).total_seconds()),
        CAMINHO_PEDIDO,
    )
    return {"codigo": codigo, "expira_em": pedido.expira_em.isoformat(), "consulta_s": CONSULTA_S}


@router.get("/pedido")
async def consultar_pedido(
    request: Request, response: Response, db: SessaoDB, canal: Canal
) -> dict[str, Any]:
    resultado = await consultar(db, request.cookies.get(COOKIE_PEDIDO, ""), agora_utc())
    if resultado == "pendente":
        response.status_code = status.HTTP_202_ACCEPTED
        return {"estado": "pendente"}
    _apagar_cookie(response, canal, COOKIE_PEDIDO, CAMINHO_PEDIDO)
    if resultado == "expirado":
        response.status_code = status.HTTP_410_GONE
        return {"estado": "expirado"}
    parede, token = resultado
    await db.commit()
    modo: Modo = "http" if parede.modo == "http" else "https"
    _gravar_cookie(
        response, modo, cookie_do_token(modo), token, int(DURACAO_TOKEN.total_seconds()), "/"
    )
    return {"estado": "aprovado", "nome": parede.nome}


async def parede_da_conexao(db: AsyncSession, conexao: HTTPConnection, modo: Modo) -> Parede | None:
    """Parede do cookie do modo da conexão (``http``: amarrada ao IP), já com o acesso
    registrado e confirmado."""
    token = conexao.cookies.get(cookie_do_token(modo), "")
    parede = await parede_do_token(db, token, modo, ip_do_cliente(conexao), agora_utc())
    await db.commit()
    return parede


@router.get("/snapshot")
async def snapshot(request: Request, db: SessaoDB, modo: Canal) -> dict[str, Any]:
    parede = await parede_da_conexao(db, request, modo)
    if parede is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Não autenticado.")
    return await montar_snapshot(db, parede.nome, request.app.state.settings.fuso)
