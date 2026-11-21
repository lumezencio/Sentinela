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
import logging
import os
import re
import secrets
import sys
import time
import unicodedata
from collections.abc import Callable, Iterator
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Literal, get_args

log = logging.getLogger("sentinela.atualizacao")

ARQUIVO = "atualizacao.json"
type Resultado = Literal["atualizado", "sem_novidade", "voltou", "falhou", "sem_conexao"]
RESULTADOS: tuple[str, ...] = get_args(Resultado.__value__)
AVISO_HORAS = 24
MAX_MENSAGEM = 200
# relógio um pouco adiantado na hora de gravar (Pi sem RTC): até 5 min de folga no aviso
_TOLERANCIA_FUTURO = timedelta(minutes=5)
ARQUIVO_TRAVA = ".atualizacao.lock"
SUFIXO_ILEGIVEL = ".ilegivel"  # atualizacao.json.<UTC>.ilegivel: uma cópia por corrupção
MAX_COPIAS_ILEGIVEL = 5
DIAS_SEM_VERIFICAR = 7  # sem verificação bem-sucedida há mais que isto, o painel avisa
_BEM_SUCEDIDOS = ("atualizado", "sem_novidade")
PRAZO_TRAVA_S = 10.0
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
    ultimo_sucesso: datetime | None = None  # última verificação atualizado/sem_novidade


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
        ultimo_sucesso=campo("ultimo_sucesso", _data(dados.get("ultimo_sucesso")), None),
    )
    if estado.ultimo_sucesso is None and estado.resultado in _BEM_SUCEDIDOS:
        # arquivo de antes do campo: o último resultado bem-sucedido é a própria verificação
        estado = replace(estado, ultimo_sucesso=estado.ultima_verificacao)
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
            "ultimo_sucesso": e.ultimo_sucesso.isoformat() if e.ultimo_sucesso else None,
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


@contextlib.contextmanager
def _travar(pasta: Path) -> Iterator[None]:
    """Trava exclusiva (``flock`` em arquivo ao lado) em volta de ler-modificar-gravar, para a
    CLI e a API não perderem a chave liga/desliga uma da outra. Prazo de 10 s; estourou, levanta
    ``TimeoutError`` (um ``OSError``): nada é gravado, nunca se grava sem a trava."""
    if sys.platform == "win32":
        yield  # Windows (só desenvolvimento): sem flock; o core roda em Linux
        return
    import fcntl

    descritor = os.open(pasta / ARQUIVO_TRAVA, os.O_RDWR | os.O_CREAT, 0o600)
    try:
        limite = time.monotonic() + PRAZO_TRAVA_S
        while True:
            try:
                fcntl.flock(descritor, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= limite:
                    raise TimeoutError("atualizacao.json ocupado") from None
                time.sleep(0.05)
        try:
            yield
        finally:
            fcntl.flock(descritor, fcntl.LOCK_UN)
    finally:
        os.close(descritor)


def _guardar_ilegivel(pasta: Path) -> None:
    """Antes de sobrescrever um arquivo ilegível, guarda uma cópia com data
    (``atualizacao.json.<UTC>.ilegivel``, as 5 mais recentes) e avisa no log (o stderr da CLI
    vai para o journal), para o sinal não se perder (o estado lido dele é "ligada")."""
    if not _carregar(pasta)[1]:
        return
    origem = pasta / ARQUIVO
    try:
        copia = origem.read_bytes()
    except OSError:
        return
    marca = f"{datetime.now(UTC):%Y%m%dT%H%M%SZ}-{secrets.token_hex(2)}"
    nome = f"{ARQUIVO}.{marca}{SUFIXO_ILEGIVEL}"
    temporario = pasta / f".{nome}.tmp"
    try:
        descritor = os.open(temporario, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descritor, "wb") as f:
            f.write(copia)
        os.replace(temporario, pasta / nome)
        log.warning("atualizacao.json ilegível: cópia guardada em %s", nome)
        for velha in copias_ilegiveis(pasta)[:-MAX_COPIAS_ILEGIVEL]:
            with contextlib.suppress(OSError):
                (pasta / velha).unlink()
    except OSError:
        with contextlib.suppress(OSError):
            temporario.unlink()
        log.warning("atualizacao.json ilegível e a cópia não pôde ser guardada")


def copias_ilegiveis(pasta: Path) -> list[str]:
    return sorted(p.name for p in pasta.glob(f"{ARQUIVO}.*{SUFIXO_ILEGIVEL}"))


def _alterar(
    pasta: Path, mudar: Callable[[EstadoAtualizacao], EstadoAtualizacao]
) -> EstadoAtualizacao:
    with _travar(pasta):
        _guardar_ilegivel(pasta)
        novo = mudar(ler(pasta))
        gravar(pasta, novo)
    return novo


def registrar(
    pasta: Path,
    resultado: Resultado,
    de: str | None,
    para: str | None,
    mensagem: str | None,
    agora: datetime,
) -> EstadoAtualizacao:
    """Guarda o resultado da última verificação; preserva ``ativo`` e ``agendado``."""
    return _alterar(
        pasta,
        lambda e: replace(
            e,
            ultima_verificacao=agora,
            ultimo_sucesso=agora if resultado in _BEM_SUCEDIDOS else e.ultimo_sucesso,
            resultado=resultado,
            de=versao_valida(de),
            para=versao_valida(para),
            mensagem=sanear_mensagem(mensagem),
        ),
    )


def definir_ativo(pasta: Path, ativo: bool) -> EstadoAtualizacao:
    return _alterar(pasta, lambda e: replace(e, ativo=ativo))


def marcar_agendado(pasta: Path) -> EstadoAtualizacao:
    return _alterar(pasta, lambda e: replace(e, agendado=True))


def aviso(e: EstadoAtualizacao, agora: datetime) -> str | None:
    """Aviso do painel: por 24 h depois de ``atualizado`` ou ``voltou``; ou, com a atualização
    automática ligada e agendada, o alerta de que a última verificação bem-sucedida é de mais de
    7 dias (``sem_conexao`` sozinho nunca alarma)."""
    recente = _aviso_recente(e, agora)
    if recente is not None:
        return recente
    if e.ativo and e.agendado and e.ultimo_sucesso is not None:
        if agora - e.ultimo_sucesso > timedelta(days=DIAS_SEM_VERIFICAR):
            return (
                f"O Sentinela não conseguiu verificar atualizações desde {e.ultimo_sucesso:%d/%m}"
            )
    return None


def _aviso_recente(e: EstadoAtualizacao, agora: datetime) -> str | None:
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
