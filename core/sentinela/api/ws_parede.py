"""WebSocket do telão (``/ws/parede``): só leitura, só token ``parede``, campos reduzidos.

Protocolo (servidor → cliente, JSON):

- ``{"tipo": "snapshot", "nome", "fuso", "classes", "equipamentos", "alertas"}`` ao conectar,
  igual ao ``GET /api/v1/parede/snapshot``;
- ``{"tipo": "estado", "id", "estado", "desde"[, "causa"]}`` a cada transição;
- ``{"tipo": "equipamento", "acao": "criado"|"atualizado", "equipamento": {id, nome, classe,
  estado, pai_id}}`` ou ``{"tipo": "equipamento", "acao": "removido", "id"}``;
- ``{"tipo": "alerta", "acao": "aberto"|"atualizado", "alerta": {id, tipo, texto,
  aberto_em}}`` enquanto aberto; ``{"tipo": "alerta", "acao": "fechado"|"removido", "id"}``;
- ``{"tipo": "ping"}`` a cada 25 s.

Nada de latências, descobertas, varreduras, fontes, IP, MAC ou fabricante.

Origem: ``https://{Host}`` em conexão ``wss``; ``http://{Host}`` em ``ws`` só com a chave
"permitir telão sem HTTPS" ligada (e então só o cookie ``http``, amarrado ao IP da TV).
Fechamentos: ``4403`` origem, ``4401`` sem token válido, revogado (na hora, pela mensagem
``parede_revogada``) ou recusado na revalidação a cada 60 s (inclui a chave HTTP desligada).
"""

from typing import Any

from fastapi import APIRouter, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.api.deps import agora_utc
from sentinela.api.parede import (
    cookie_do_token,
    equipamento_reduzido,
    ip_do_cliente,
    item_alerta,
    modo_da_conexao,
    montar_snapshot,
)
from sentinela.api.ws import (
    FECHA_NAO_AUTENTICADO,
    FECHA_ORIGEM_PROIBIDA,
    FecharConexao,
    Transformar,
    atender,
    recusar,
)
from sentinela.barramento import Mensagem
from sentinela.db.modelos import Alerta, Parede
from sentinela.parede.emparelhamento import Modo, parede_do_token, paredes_http

router = APIRouter()

CAMPOS_ESTADO = ("id", "estado", "desde", "causa")


def _origem_confere(websocket: WebSocket, modo: Modo) -> bool:
    """``Origin`` obrigatório, do mesmo host e do mesmo esquema da conexão."""
    host = websocket.headers.get("host")
    origem = websocket.headers.get("origin")
    return bool(host and origem) and origem == f"{modo}://{host}"


async def _autenticar(
    sessoes: async_sessionmaker[AsyncSession], websocket: WebSocket, modo: Modo
) -> Parede | int:
    """Parede do cookie desta conexão, ou o código de fechamento (4403 se a chave HTTP está
    desligada numa conexão ``ws``; 4401 sem token válido)."""
    async with sessoes() as db:
        if modo == "http" and not await paredes_http(db):
            return FECHA_ORIGEM_PROIBIDA
        token = websocket.cookies.get(cookie_do_token(modo), "")
        parede = await parede_do_token(db, token, modo, ip_do_cliente(websocket), agora_utc())
        await db.commit()
        return FECHA_NAO_AUTENTICADO if parede is None else parede


def transformador_parede(sessoes: async_sessionmaker[AsyncSession], parede_id: int) -> Transformar:
    async def transformar(m: Mensagem) -> dict[str, Any] | None:
        if m.tipo == "parede_revogada":
            if m.dados.get("id") == parede_id:
                raise FecharConexao(FECHA_NAO_AUTENTICADO)
            return None
        if m.tipo == "estado":
            return {"tipo": "estado", **{k: m.dados[k] for k in CAMPOS_ESTADO if k in m.dados}}
        if m.tipo == "equipamento" and isinstance(m.dados.get("id"), str):
            id = m.dados["id"]
            async with sessoes() as db:
                item = await equipamento_reduzido(db, id)
            if item is None:
                return {"tipo": "equipamento", "acao": "removido", "id": id}
            acao = "criado" if m.dados.get("acao") == "criado" else "atualizado"
            return {"tipo": "equipamento", "acao": acao, "equipamento": item}
        if m.tipo == "alerta" and isinstance(m.dados.get("id"), int):
            id = m.dados["id"]
            acao = str(m.dados.get("acao"))
            async with sessoes() as db:
                alerta = None if acao == "removido" else await db.get(Alerta, id)
                if alerta is None:
                    return {"tipo": "alerta", "acao": "removido", "id": id}
                if alerta.fechado_em is not None:
                    return {"tipo": "alerta", "acao": "fechado", "id": id}
                acao = "aberto" if acao == "aberto" else "atualizado"
                return {"tipo": "alerta", "acao": acao, "alerta": await item_alerta(db, alerta)}
        return None

    return transformar


@router.websocket("/ws/parede")
async def ao_vivo_parede(websocket: WebSocket) -> None:
    modo = modo_da_conexao(websocket)
    if not _origem_confere(websocket, modo):  # antes de qualquer consulta ao banco
        await recusar(websocket, FECHA_ORIGEM_PROIBIDA)
        return
    estado = websocket.app.state
    sessoes: async_sessionmaker[AsyncSession] = estado.sessoes
    parede = await _autenticar(sessoes, websocket, modo)
    if isinstance(parede, int):
        await recusar(websocket, parede)
        return
    await websocket.accept()
    nome, parede_id, fuso = parede.nome, parede.id, estado.settings.fuso

    async def snapshot(db: AsyncSession) -> dict[str, Any]:
        return {"tipo": "snapshot", **await montar_snapshot(db, nome, fuso)}

    async def validar() -> bool:
        return not isinstance(await _autenticar(sessoes, websocket, modo), int)

    await atender(websocket, snapshot, transformador_parede(sessoes, parede_id), validar)
