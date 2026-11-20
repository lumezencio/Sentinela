"""Estado da atualização automática: ``atualizacao.json`` na pasta de dados.

Quem grava é o ``update.sh`` (pela CLI ``atualizacao-registrar``, no host, por ``compose exec``)
e a chave liga/desliga da API. O core NUNCA atualiza nada: não tem socket do Docker nem executa
processo. O arquivo é lido de forma tolerante, campo a campo (ausente, ilegível ou de tipo
errado = valor padrão; o padrão é "ligada", então um arquivo corrompido não desliga a
atualização para sempre; ``ilegivel`` deixa a API avisar). A gravação é atômica (temporário
0600 + ``os.replace``). As mensagens são curtas, sem caracteres de controle e sem segredos.
"""

import contextlib
import json
import os
import re
import secrets
import unicodedata
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Literal, get_args

ARQUIVO = "atualizacao.json"
type Resultado = Literal["atualizado", "sem_novidade", "voltou", "falhou"]
RESULTADOS: tuple[str, ...] = get_args(Resultado.__value__)
AVISO_HORAS = 24
MAX_MENSAGEM = 200
# relógio um pouco adiantado na hora de gravar (Pi sem RTC): até 5 min de folga no aviso
_TOLERANCIA_FUTURO = timedelta(minutes=5)
_VERSAO = re.compile(r"\d+\.\d+\.\d+", re.ASCII)


@dataclass(frozen=True)
class EstadoAtualizacao:
    ativo: bool = True
    agendado: bool = False
    ultima_verificacao: datetime | None = None
    resultado: Resultado | None = None
    de: str | None = None
    para: str | None = None
    mensagem: str | None = None


def versao_valida(texto: object) -> str | None:
    return texto if isinstance(texto, str) and _VERSAO.fullmatch(texto) else None


def sanear_mensagem(texto: object) -> str | None:
    """Sem caracteres de controle (nem quebras de linha), aparada e com no máximo 200."""
    if not isinstance(texto, str):
        return None
    limpa = "".join(c for c in texto if unicodedata.category(c) not in {"Cc", "Cf", "Cs", "Co"})
    limpa = limpa.strip()[:MAX_MENSAGEM].strip()
    return limpa or None


def _data(texto: object) -> datetime | None:
    if not isinstance(texto, str):
        return None
    try:
        valor = datetime.fromisoformat(texto)
    except ValueError:
        return None
    return valor if valor.tzinfo is not None else None


def _carregar(pasta: Path) -> tuple[EstadoAtualizacao, bool]:
    """``(estado, ilegivel)``: ``ilegivel`` é verdadeiro se o arquivo existe mas algo nele
    não pôde ser aproveitado."""
    try:
        bruto = (pasta / ARQUIVO).read_text(encoding="utf-8")
    except FileNotFoundError:
        return EstadoAtualizacao(), False
    except (OSError, UnicodeDecodeError):
        return EstadoAtualizacao(), True
    try:
        dados: Any = json.loads(bruto)
    except ValueError:
        return EstadoAtualizacao(), True
    if not isinstance(dados, dict):
        return EstadoAtualizacao(), True
    padrao = EstadoAtualizacao()
    ok = True

    def campo[T](nome: str, convertido: T | None, padrao_: T | None) -> T | None:
        nonlocal ok
        if dados.get(nome) is not None and convertido is None:
            ok = False
        return convertido if convertido is not None else padrao_

    ativo = dados.get("ativo", padrao.ativo)
    agendado = dados.get("agendado", padrao.agendado)
    if not isinstance(ativo, bool):
        ativo, ok = padrao.ativo, False
    if not isinstance(agendado, bool):
        agendado, ok = padrao.agendado, False
    resultado = dados.get("resultado")
    resultado_ok = resultado if resultado in RESULTADOS else None
    estado = EstadoAtualizacao(
        ativo=ativo,
        agendado=agendado,
        ultima_verificacao=campo(
            "ultima_verificacao", _data(dados.get("ultima_verificacao")), None
        ),
        resultado=campo("resultado", resultado_ok, None),
        de=campo("de", versao_valida(dados.get("de")), None),
        para=campo("para", versao_valida(dados.get("para")), None),
        mensagem=campo("mensagem", sanear_mensagem(dados.get("mensagem")), None),
    )
    if isinstance(dados.get("mensagem"), str) and dados["mensagem"] != estado.mensagem:
        ok = False  # havia caracteres de controle ou excesso
    return estado, not ok


def ler(pasta: Path) -> EstadoAtualizacao:
    return _carregar(pasta)[0]


def ilegivel(pasta: Path) -> bool:
    """O arquivo existe, mas está ilegível ou tem campo inválido (a API avisa o administrador)."""
    return _carregar(pasta)[1]


def gravar(pasta: Path, e: EstadoAtualizacao) -> None:
    """Temporário 0600 na mesma pasta + ``os.replace``: o arquivo nunca fica pela metade."""
    conteudo = json.dumps(
        {
            "ativo": e.ativo,
            "agendado": e.agendado,
            "ultima_verificacao": e.ultima_verificacao.isoformat()
            if e.ultima_verificacao
            else None,
            "resultado": e.resultado,
            "de": e.de,
            "para": e.para,
            "mensagem": e.mensagem,
        },
        ensure_ascii=False,
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


def registrar(
    pasta: Path,
    resultado: Resultado,
    de: str | None,
    para: str | None,
    mensagem: str | None,
    agora: datetime,
) -> EstadoAtualizacao:
    """Guarda o resultado da última verificação; preserva ``ativo`` e ``agendado``."""
    novo = replace(
        ler(pasta),
        ultima_verificacao=agora,
        resultado=resultado,
        de=versao_valida(de),
        para=versao_valida(para),
        mensagem=sanear_mensagem(mensagem),
    )
    gravar(pasta, novo)
    return novo


def definir_ativo(pasta: Path, ativo: bool) -> EstadoAtualizacao:
    novo = replace(ler(pasta), ativo=ativo)
    gravar(pasta, novo)
    return novo


def marcar_agendado(pasta: Path) -> EstadoAtualizacao:
    novo = replace(ler(pasta), agendado=True)
    gravar(pasta, novo)
    return novo


def aviso(e: EstadoAtualizacao, agora: datetime) -> str | None:
    """Aviso do painel por 24 h depois de ``atualizado`` ou ``voltou``; senão ``None``."""
    if e.ultima_verificacao is None or e.resultado not in {"atualizado", "voltou"}:
        return None
    idade = agora - e.ultima_verificacao
    if not -_TOLERANCIA_FUTURO <= idade <= timedelta(hours=AVISO_HORAS):
        return None
    if e.resultado == "atualizado":
        return f"Atualizado para {e.para}" if e.para else None
    if e.para and e.de:
        return f"A atualização para {e.para} falhou; o Sentinela voltou para {e.de}"
    return None
