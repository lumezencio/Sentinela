"""Telões pelo admin: listar, aprovar um código, revogar e a chave "telão sem HTTPS".

Toda escrita exige admin e CSRF e é auditada. Código errado, vencido ou já usado: um único
404 genérico. Revogar publica ``parede_revogada`` para o ``/ws/parede`` da TV cair na hora; desligar
a chave HTTP publica ``paredes_http_desligado`` e os telões por HTTP caem também.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Request, Response, status
from pydantic import BaseModel, ConfigDict, StrictBool, StringConstraints
from sqlalchemy import select

from sentinela.api.comum import auditar, nao_encontrado
from sentinela.api.deps import SessaoDB, agora_utc, exigir_admin
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.modelos import Parede, Usuario
from sentinela.parede.emparelhamento import (
    CodigoInvalido,
    aprovar,
    gravar_paredes_http,
    paredes_http,
    revogar,
)

router = APIRouter(tags=["paredes"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
MSG_CODIGO = "Código inválido ou expirado."
MAX_LISTA = 100
PAREDES_HTTP_DESLIGADO = "paredes_http_desligado"  # mensagem do barramento


class Aprovacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo: Annotated[str, StringConstraints(max_length=16)]
    nome: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]


class ParedeSaida(BaseModel):
    id: int
    nome: str
    modo: str
    criado_em: datetime
    ultimo_acesso: datetime | None
    ultimo_ip: str | None
    ativa: bool


class ConfigParedes(BaseModel):
    model_config = ConfigDict(extra="forbid")

    permitir_http: StrictBool


def _saida(p: Parede) -> ParedeSaida:
    return ParedeSaida(
        id=p.id,
        nome=p.nome,
        modo=p.modo,
        criado_em=p.criado_em,
        ultimo_acesso=p.ultimo_acesso,
        ultimo_ip=p.ultimo_ip,
        ativa=p.revogada_em is None,
    )


@router.get("/api/v1/paredes", response_model=list[ParedeSaida])
async def listar(db: SessaoDB, _admin: Admin) -> list[ParedeSaida]:
    """As 100 mais recentes (ativas e revogadas)."""
    paredes = await db.execute(
        select(Parede).order_by(Parede.criado_em.desc(), Parede.id.desc()).limit(MAX_LISTA)
    )
    return [_saida(p) for p in paredes.scalars()]


@router.post(
    "/api/v1/paredes/aprovar", response_model=ParedeSaida, status_code=status.HTTP_201_CREATED
)
async def aprovar_codigo(
    entrada: Aprovacao, request: Request, db: SessaoDB, admin: Admin
) -> ParedeSaida:
    try:
        parede = await aprovar(db, entrada.codigo, entrada.nome, agora_utc())
    except CodigoInvalido:
        auditar(db, request, admin, "parede.aprovar_falhou", None)  # só o fato, sem código
        await db.commit()
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=MSG_CODIGO) from None
    auditar(
        db, request, admin, "parede.aprovar", str(parede.id), None,
        {"nome": parede.nome, "modo": parede.modo},
    )  # fmt: skip
    await db.commit()
    return _saida(parede)


@router.delete("/api/v1/paredes/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def revogar_parede(
    id: Annotated[int, Path(ge=1, le=2**31)], request: Request, db: SessaoDB, admin: Admin
) -> Response:
    if not await revogar(db, id, agora_utc()):
        raise nao_encontrado()
    auditar(db, request, admin, "parede.revogar", str(id))
    await db.commit()
    barramento: Barramento = request.app.state.barramento
    barramento.publicar(Mensagem("parede_revogada", {"id": id}))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/api/v1/config/paredes", response_model=ConfigParedes)
async def ver_config(db: SessaoDB, _admin: Admin) -> ConfigParedes:
    return ConfigParedes(permitir_http=await paredes_http(db))


@router.patch("/api/v1/config/paredes", response_model=ConfigParedes)
async def editar_config(
    entrada: ConfigParedes, request: Request, db: SessaoDB, admin: Admin
) -> ConfigParedes:
    antes = await paredes_http(db)
    await gravar_paredes_http(db, entrada.permitir_http)
    auditar(
        db, request, admin, "config.paredes", "paredes_http",
        {"permitir_http": antes}, {"permitir_http": entrada.permitir_http},
    )  # fmt: skip
    await db.commit()
    if antes and not entrada.permitir_http:  # telões por HTTP caem na hora
        barramento: Barramento = request.app.state.barramento
        barramento.publicar(Mensagem(PAREDES_HTTP_DESLIGADO, {}))
    return ConfigParedes(permitir_http=entrada.permitir_http)
