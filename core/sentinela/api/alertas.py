"""Alertas: qualquer usuário lê; só admin reconhece (auditado, idempotente).

O reconhecimento escreve apenas ``reconhecido_por``/``reconhecido_em``: o ``envio`` é do
contrato agrupador × despachante e nunca é tocado aqui.
"""

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, Path, Query, Request
from pydantic import AwareDatetime
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.alertas.textos import dados_do_alerta, texto_painel
from sentinela.api.comum import auditar, nao_encontrado
from sentinela.api.deps import SessaoDB, UsuarioAtual, agora_utc, exigir_admin
from sentinela.api.esquemas_alertas import (
    AfetadoSaida,
    AlertaDetalhe,
    AlertaSaida,
    PaginaAlertas,
)
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import Alerta, Classe, Equipamento, Usuario

router = APIRouter(prefix="/api/v1/alertas", tags=["alertas"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
IdAlerta = Annotated[int, Path(ge=1, le=2**31)]
MAX_AFETADOS = 500


async def contar_abertos(db: AsyncSession) -> int:
    n = await db.scalar(select(func.count()).select_from(Alerta).where(Alerta.fechado_em.is_(None)))
    return int(n or 0)


async def saida_alerta(db: AsyncSession, a: Alerta) -> AlertaSaida:
    d = await dados_do_alerta(db, a)
    login = (
        await db.scalar(select(Usuario.login).where(Usuario.id == a.reconhecido_por))
        if a.reconhecido_por is not None
        else None
    )
    return AlertaSaida(
        id=a.id,
        tipo=a.tipo,
        texto=texto_painel(d),
        equipamento_id=a.equipamento_id,
        equipamento_nome=d.nome if a.equipamento_id is not None else None,
        classe=d.classe,
        afetados_total=d.afetados,
        aberto_em=a.aberto_em,
        fechado_em=a.fechado_em,
        breve=a.breve,
        reconhecido_por=login,
        reconhecido_em=a.reconhecido_em,
        silenciado=a.silenciado,
        envio=a.envio,
    )


@router.get("", response_model=PaginaAlertas)
async def listar(
    db: SessaoDB,
    _usuario: UsuarioAtual,
    filtro: Literal["abertos", "reconhecidos", "todos"] = "abertos",
    classe: Annotated[
        str | None,
        Query(
            max_length=32,
            description="Slug da classe; exclui alertas sem equipamento"
            " (fonte_falhou, equipamento removido).",
        ),
    ] = None,
    desde: AwareDatetime | None = None,
    ate: AwareDatetime | None = None,
    pagina: Annotated[int, Query(ge=1, le=100_000)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=100)] = 50,
) -> PaginaAlertas:
    consulta = select(Alerta)
    if filtro == "abertos":
        consulta = consulta.where(Alerta.fechado_em.is_(None))
    elif filtro == "reconhecidos":
        consulta = consulta.where(Alerta.reconhecido_em.is_not(None))
    if classe:
        consulta = (
            consulta.join(Equipamento, Alerta.equipamento_id == Equipamento.id)
            .join(Classe, Equipamento.classe_id == Classe.id)
            .where(Classe.slug == classe)
        )
    if desde is not None:
        consulta = consulta.where(Alerta.aberto_em >= desde)
    if ate is not None:
        consulta = consulta.where(Alerta.aberto_em <= ate)
    total = await db.scalar(consulta.with_only_columns(func.count(Alerta.id)).order_by(None)) or 0
    linhas = await db.execute(
        consulta.order_by(Alerta.aberto_em.desc(), Alerta.id.desc())
        .limit(por_pagina)
        .offset((pagina - 1) * por_pagina)
    )
    itens = [await saida_alerta(db, a) for a in linhas.scalars()]
    return PaginaAlertas(itens=itens, total=total, pagina=pagina, por_pagina=por_pagina)


async def _afetados(db: AsyncSession, a: Alerta) -> list[AfetadoSaida]:
    ids: list[str] = []
    for x in (*a.quedas[1:], *a.afetados):
        if x != a.equipamento_id and x not in ids:
            ids.append(x)
    ids = ids[:MAX_AFETADOS]
    if not ids:
        return []
    linhas = await db.execute(
        select(Equipamento.id, Equipamento.nome, Classe.slug, Equipamento.estado)
        .join(Classe, Equipamento.classe_id == Classe.id)
        .where(Equipamento.id.in_(ids))
    )
    por_id = {i: AfetadoSaida(id=i, nome=n, classe=c, estado=e) for i, n, c, e in linhas}
    return [por_id[i] for i in ids if i in por_id]  # removido do cadastro: some da lista


@router.get("/{id}", response_model=AlertaDetalhe)
async def obter(id: IdAlerta, db: SessaoDB, _usuario: UsuarioAtual) -> AlertaDetalhe:
    a = await db.get(Alerta, id)
    if a is None:
        raise nao_encontrado()
    base = await saida_alerta(db, a)
    return AlertaDetalhe(**base.model_dump(), afetados=await _afetados(db, a))


@router.post("/{id}/reconhecer", response_model=AlertaSaida)
async def reconhecer(id: IdAlerta, request: Request, db: SessaoDB, admin: Admin) -> AlertaSaida:
    a = await db.get(Alerta, id)
    if a is None:
        raise nao_encontrado()
    if a.reconhecido_em is None:
        agora = agora_utc()
        # só as colunas do reconhecimento; ``envio`` pertence ao agrupador e ao despachante
        r = await db.execute(
            update(Alerta)
            .where(Alerta.id == id, Alerta.reconhecido_em.is_(None))
            .values(reconhecido_por=admin.id, reconhecido_em=agora)
        )
        if r.rowcount:  # type: ignore[attr-defined]
            depois: dict[str, Any] = {"reconhecido_em": agora.isoformat()}
            auditar(db, request, admin, "alerta.reconhecer", str(id), depois=depois)
            await db.commit()
            barramento: Barramento = request.app.state.barramento
            barramento.publicar(
                Mensagem(
                    "alerta",
                    {"acao": "atualizado", "id": id, "abertos": await contar_abertos(db)},
                )
            )
        else:
            await db.rollback()
        await db.refresh(a)
    return await saida_alerta(db, a)
