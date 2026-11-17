"""Ajustes da descoberta (tabela ``config``): aprovação automática e limiar (admin; PATCH
com CSRF e auditado). O ritmo da varredura só é lido aqui: muda só no banco/código."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from sentinela.api.comum import auditar
from sentinela.api.deps import SessaoDB, exigir_admin
from sentinela.api.esquemas_descoberta import AjustesEdicao, AjustesSaida
from sentinela.db.modelos import Usuario
from sentinela.descoberta.ajustes import (
    APROVACAO_AUTOMATICA,
    LIMIAR_APROVACAO,
    AjustesDescoberta,
    gravar_ajuste,
    ler_ajustes,
)

router = APIRouter(prefix="/api/v1/config/descoberta", tags=["config"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
_CHAVES = {"aprovacao_automatica": APROVACAO_AUTOMATICA, "limiar_aprovacao": LIMIAR_APROVACAO}


def _saida(a: AjustesDescoberta) -> AjustesSaida:
    return AjustesSaida(
        aprovacao_automatica=a.aprovacao_automatica,
        limiar_aprovacao=a.limiar_aprovacao,
        intervalo_varredura_ips_s=a.intervalo_varredura_ips_s,
    )


@router.get("", response_model=AjustesSaida)
async def ver(db: SessaoDB, _admin: Admin) -> AjustesSaida:
    return _saida(await ler_ajustes(db))


@router.patch("", response_model=AjustesSaida)
async def editar(
    edicao: AjustesEdicao, request: Request, db: SessaoDB, admin: Admin
) -> AjustesSaida:
    atuais = await ler_ajustes(db)
    dados = edicao.model_dump(exclude_unset=True)
    if dados:
        antes = {campo: getattr(atuais, campo) for campo in dados}
        for campo, valor in dados.items():
            await gravar_ajuste(db, _CHAVES[campo], valor)
        auditar(db, request, admin, "config.descoberta", "descoberta", antes, dados)
        await db.commit()
    return _saida(await ler_ajustes(db))
