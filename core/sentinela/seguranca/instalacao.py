"""Código de instalação do primeiro acesso.

Gerado pela CLI (``codigo-instalacao``) e mostrado só no terminal de quem instalou. O arquivo
``instalacao.json`` (na pasta de dados, modo 0600) guarda apenas o hash argon2id e o instante de
criação: o código nunca é gravado, logado nem devolvido pela API. Vale até existir o primeiro
usuário e por no máximo 24 h; a conferência usa o verificador do argon2 (tempo constante) e, sem
arquivo utilizável, gasta o mesmo tempo com um hash fictício.
"""

import contextlib
import json
import os
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Literal

from sentinela.parede.emparelhamento import ALFABETO
from sentinela.seguranca.senhas import (
    gerar_hash_segredo_async,
    verificar_async,
    verificar_ficticio_async,
)

ARQUIVO = "instalacao.json"
TAMANHO = 8
VALIDADE = timedelta(hours=24)
_METADE = TAMANHO // 2
# relógio adiantado na hora de gerar (Pi sem RTC): até 5 min de folga; além disso, expirado
TOLERANCIA_FUTURO = timedelta(minutes=5)

type Estado = Literal["ativo", "expirado", "ausente"]

__all__ = [
    "ALFABETO",
    "ARQUIVO",
    "TAMANHO",
    "VALIDADE",
    "Estado",
    "conferir",
    "estado",
    "gerar_codigo",
    "gravar",
    "invalidar",
    "marca",
    "normalizar",
]


def gerar_codigo() -> str:
    """8 caracteres do alfabeto do telão, exibidos como ``XXXX-XXXX``."""
    letras = "".join(secrets.choice(ALFABETO) for _ in range(TAMANHO))
    return f"{letras[:_METADE]}-{letras[_METADE:]}"


def normalizar(texto: str) -> str | None:
    """Maiúsculas, sem hífen nem espaço; ``None`` se não forem 8 caracteres do alfabeto."""
    limpo = texto.strip().upper().replace("-", "").replace(" ", "")
    if len(limpo) != TAMANHO or any(c not in ALFABETO for c in limpo):
        return None
    return limpo


async def gravar(pasta: Path, codigo: str, agora: datetime) -> None:
    """Grava o hash do código (substitui o anterior): temporário 0600 + ``os.replace``."""
    normal = normalizar(codigo)
    if normal is None:
        raise ValueError("código de instalação fora do formato")
    conteudo = json.dumps(
        {"hash": await gerar_hash_segredo_async(normal), "criado_em": agora.isoformat()}
    )
    destino = pasta / ARQUIVO
    temporario = pasta / f".{ARQUIVO}.{secrets.token_hex(4)}.tmp"
    try:
        descritor = os.open(temporario, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descritor, "w", encoding="utf-8") as f:
            f.write(conteudo)
        os.replace(temporario, destino)
    except BaseException:
        with contextlib.suppress(OSError):
            temporario.unlink()
        raise


def _ler(pasta: Path) -> tuple[str, datetime] | None:
    """``(hash, criado_em)`` ou ``None`` se ausente, ilegível ou malformado."""
    try:
        dados = json.loads((pasta / ARQUIVO).read_text(encoding="utf-8"))
        hash_ = dados["hash"]
        criado = datetime.fromisoformat(dados["criado_em"])
    except (OSError, ValueError, KeyError, TypeError):
        return None
    if not isinstance(hash_, str) or criado.tzinfo is None:
        return None
    return hash_, criado


def _vale(criado: datetime, agora: datetime) -> bool:
    """Ativo: criado há no máximo 24 h; ``criado_em`` no futuro (relógio que andou para trás)
    além da tolerância conta como expirado, senão o código viveria mais de 24 h reais."""
    idade = agora - criado
    return -TOLERANCIA_FUTURO <= idade <= VALIDADE


def estado(pasta: Path, agora: datetime) -> Estado:
    lido = _ler(pasta)
    if lido is None:
        return "ausente"
    return "ativo" if _vale(lido[1], agora) else "expirado"


def marca(pasta: Path) -> str | None:
    """Identidade da geração atual do código (o ``criado_em`` gravado), ``None`` se ausente.
    A CLI roda noutro processo: o core compara esta marca para saber que há código novo."""
    lido = _ler(pasta)
    return None if lido is None else lido[1].isoformat()


async def conferir(pasta: Path, texto: str, agora: datetime) -> bool:
    """True só com código ativo e igual ao gravado; qualquer outro caso gasta o mesmo tempo."""
    normal = normalizar(texto)
    lido = _ler(pasta)
    if normal is None or lido is None or not _vale(lido[1], agora):
        await verificar_ficticio_async(texto[:64])
        return False
    return await verificar_async(lido[0], normal)


def invalidar(pasta: Path) -> None:
    """Apaga o arquivo; idempotente."""
    (pasta / ARQUIVO).unlink(missing_ok=True)
