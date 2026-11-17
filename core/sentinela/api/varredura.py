"""Varredura lenta (spec §5.2/§9.1 a): iniciar (admin + CSRF, limite de taxa), cancelar e
ver o progresso (todo usuário: a faixa do topo aparece para todos). Uma por vez, só em
sub-rede com ``permite_varredura``; o progresso também chega pelo WebSocket (``varredura``).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from sentinela.api.comum import auditar, erro, limitar_taxa
from sentinela.api.deps import SessaoDB, UsuarioAtual, exigir_admin
from sentinela.api.esquemas_descoberta import VarreduraEntrada, VarreduraSaida
from sentinela.db.modelos import Usuario
from sentinela.descoberta.varredura import (
    SubRedeInexistente,
    Varredura,
    VarreduraEmAndamento,
    VarreduraNaoPermitida,
)

router = APIRouter(prefix="/api/v1/varredura", tags=["varredura"])
Admin = Annotated[Usuario, Depends(exigir_admin)]


def _varredura(request: Request) -> Varredura:
    v: Varredura = request.app.state.varredura
    return v


def _saida(v: Varredura) -> VarreduraSaida:
    progresso = v.progresso()
    return VarreduraSaida(rodando=progresso is not None, progresso=progresso)


@router.get("", response_model=VarreduraSaida)
async def ver(request: Request, _usuario: UsuarioAtual) -> VarreduraSaida:
    return _saida(_varredura(request))


@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=VarreduraSaida)
async def iniciar(
    entrada: VarreduraEntrada, request: Request, db: SessaoDB, admin: Admin
) -> VarreduraSaida:
    limitar_taxa(request, admin)
    v = _varredura(request)
    try:
        progresso = await v.iniciar(entrada.sub_rede_id)
    except SubRedeInexistente as e:
        raise erro(status.HTTP_404_NOT_FOUND, str(e)) from None
    except (VarreduraNaoPermitida, VarreduraEmAndamento) as e:
        raise erro(status.HTTP_409_CONFLICT, str(e)) from None
    auditar(db, request, admin, "varredura.iniciar", progresso["cidr"], depois=progresso)
    await db.commit()
    return _saida(v)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def cancelar(request: Request, db: SessaoDB, admin: Admin) -> Response:
    v = _varredura(request)
    progresso = v.progresso()
    if progresso is not None:
        v.cancelar()
        auditar(db, request, admin, "varredura.cancelar", progresso.get("cidr"), antes=progresso)
        await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
