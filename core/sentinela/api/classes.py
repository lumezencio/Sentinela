"""Classes de equipamento: leitura para todos, edição para o administrador."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from sentinela.api.comum import auditar, nao_encontrado
from sentinela.api.deps import SessaoDB, UsuarioAtual, exigir_admin
from sentinela.db.modelos import Classe, Equipamento, Usuario
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.montagem import alvo_de

router = APIRouter(prefix="/api/v1/classes", tags=["classes"])
Admin = Annotated[Usuario, Depends(exigir_admin)]


class ClasseSaida(BaseModel):
    slug: str
    nome: str
    cor: str
    icone: str
    intervalo_s: int
    critica: bool
    ordem: int


class ClasseEdicao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str | None = Field(default=None, min_length=1, max_length=64)
    cor: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icone: str | None = Field(default=None, min_length=1, max_length=32, pattern=r"^[a-z0-9-]+$")
    intervalo_s: int | None = Field(default=None, ge=5, le=3600)


def _saida(c: Classe) -> ClasseSaida:
    return ClasseSaida(
        slug=c.slug,
        nome=c.nome,
        cor=c.cor,
        icone=c.icone,
        intervalo_s=c.intervalo_s,
        critica=c.critica,
        ordem=c.ordem,
    )


def _retrato(c: Classe) -> dict[str, Any]:
    return {"nome": c.nome, "cor": c.cor, "icone": c.icone, "intervalo_s": c.intervalo_s}


@router.get("", response_model=list[ClasseSaida])
async def listar(db: SessaoDB, _usuario: UsuarioAtual) -> list[ClasseSaida]:
    linhas = (await db.execute(select(Classe).order_by(Classe.ordem, Classe.id))).scalars()
    return [_saida(c) for c in linhas]


@router.patch("/{slug}", response_model=ClasseSaida)
async def editar(
    edicao: ClasseEdicao,
    request: Request,
    db: SessaoDB,
    admin: Admin,
    slug: Annotated[str, Path(max_length=32)],
) -> ClasseSaida:
    classe = await db.scalar(select(Classe).where(Classe.slug == slug))
    if classe is None:
        raise nao_encontrado()
    antes = _retrato(classe)
    for campo, valor in edicao.model_dump(exclude_unset=True).items():
        if valor is not None:  # null explícito não apaga campo obrigatório
            setattr(classe, campo, valor)
    auditar(db, request, admin, "classe.editar", classe.slug, antes, _retrato(classe))
    await db.commit()

    agendador: Agendador = request.app.state.agendador
    equipamentos = (
        await db.execute(select(Equipamento).where(Equipamento.classe_id == classe.id))
    ).scalars()
    # um único recalcular para a classe inteira (R17)
    agendador.atualizar_lote(
        [alvo_de(eq, classe) for eq in equipamentos if agendador.estado_de(eq.id) is not None]
    )
    return _saida(classe)
