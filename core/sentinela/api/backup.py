"""Backup (admin): estado e cópias em ``GET``, cópia manual em ``POST``.

O arquivo nunca sai pela API (nem o caminho do ``.env``, que nunca entra no backup). Erros ao
copiar: sempre o texto fixo, sem detalhe.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from sentinela.api.comum import auditar, limitar_taxa
from sentinela.api.deps import SessaoDB, exigir_admin
from sentinela.backup.arquivo import ErroBackup
from sentinela.backup.servico import ServicoBackup
from sentinela.db.modelos import Usuario

router = APIRouter(prefix="/api/v1/backup", tags=["backup"])
Admin = Annotated[Usuario, Depends(exigir_admin)]
MSG_FALHA = "Não foi possível fazer o backup."
DIRETORIO = "/dados/backups"
AVISO = (
    "O backup não inclui o arquivo .env. Guarde-o em outro lugar seguro: sem a chave "
    "SENTINELA_CHAVE_CREDENCIAIS, as senhas das fontes e o token do Telegram não abrem."
)


class CopiaSaida(BaseModel):
    nome: str
    tipo: str
    criado_em: datetime
    tamanho: int


class BackupSaida(BaseModel):
    ultimo_em: datetime | None
    ultimo_tamanho: int | None
    ultimo_erro: str | None
    copias: list[CopiaSaida]
    diretorio: str
    aviso: str


def _servico(request: Request) -> ServicoBackup:
    servico: ServicoBackup = request.app.state.backup
    return servico


@router.get("", response_model=BackupSaida)
async def ver(request: Request, db: SessaoDB, _admin: Admin) -> BackupSaida:
    estado = await _servico(request).status(db)
    return BackupSaida(
        ultimo_em=estado["ultimo_em"],
        ultimo_tamanho=estado["ultimo_tamanho"],
        ultimo_erro=estado["ultimo_erro"],
        copias=[CopiaSaida(**c) for c in estado["copias"]],
        diretorio=DIRETORIO,
        aviso=AVISO,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CopiaSaida)
async def criar(request: Request, db: SessaoDB, admin: Admin) -> CopiaSaida:
    limitar_taxa(request, admin)
    try:
        info = await _servico(request).criar("manual")
    except ErroBackup:
        # a tentativa que falhou também fica no registro (texto fixo, sem detalhe)
        auditar(db, request, admin, "backup.falhou", None, None, {"tipo": "manual"})
        await db.commit()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=MSG_FALHA) from None
    auditar(db, request, admin, "backup.criar", info.nome, None, {"tipo": info.tipo})
    await db.commit()
    return CopiaSaida(
        nome=info.nome, tipo=info.tipo, criado_em=info.criado_em, tamanho=info.tamanho
    )
