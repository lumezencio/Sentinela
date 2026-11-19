"""Arquivos de backup: criar, verificar, restaurar e rotacionar.

Um backup é um ``tar.gz`` com exatamente ``manifesto.json`` e ``sentinela.db``. O banco é copiado
com a API de backup do SQLite (consistente com o app no ar) para um temporário em
``destino/.tmp-*``; o arquivo final só aparece por ``os.replace`` depois de verificado, e a
rotação só roda depois disso. **O ``.env`` nunca entra**: sem a chave de credenciais, as senhas
das fontes e o token do Telegram não abrem.

Todas as mensagens de ``ErroBackup`` são fixas (nunca caminho, conteúdo ou exceção da pilha).
"""

import hashlib
import io
import json
import logging
import os
import re
import shutil
import sqlite3
import tarfile
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, cast

from alembic.config import Config
from alembic.script import ScriptDirectory

log = logging.getLogger(__name__)

TipoBackup = Literal["diario", "semanal", "manual", "atualizacao", "pre-restore"]
RETER: dict[TipoBackup, int] = {
    "diario": 7,
    "semanal": 4,
    "manual": 5,
    "atualizacao": 5,
    "pre-restore": 3,
}

FORMATO = 1
NOME_MANIFESTO = "manifesto.json"
NOME_BANCO = "sentinela.db"
MAX_BANCO = 2 * 1024**3
MAX_MANIFESTO = 64 * 1024
_PADRAO = re.compile(
    r"^sentinela-(\d{8}T\d{6}Z)-(diario|semanal|manual|atualizacao|pre-restore)\.tar\.gz$"
)
MSG_GENERICA = "Não foi possível fazer o backup."
MSG_SEM_ESPACO = "Sem espaço em disco para o backup."
MSG_INVALIDO = "Backup inválido ou corrompido."
MSG_MAIS_NOVO = "Backup de uma versão mais nova do Sentinela."
ESQUEMA_DESCONHECIDO = "desconhecido"


class ErroBackup(Exception):
    """Mensagem sempre genérica e fixa."""


@dataclass(frozen=True)
class Manifesto:
    formato: int
    sentinela: str
    esquema: str
    criado_em: datetime
    sha256: str
    tamanho_db: int


@dataclass(frozen=True)
class InfoBackup:
    nome: str
    tipo: TipoBackup
    criado_em: datetime
    tamanho: int


# ---- utilidades ---------------------------------------------------------------------------


def _carimbo(agora: datetime) -> str:
    return agora.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def _nome(agora: datetime, tipo: TipoBackup) -> str:
    return f"sentinela-{_carimbo(agora)}-{tipo}.tar.gz"


def info_de(caminho: Path) -> InfoBackup | None:
    """``InfoBackup`` de um arquivo regular (não link) com nome no padrão; senão ``None``."""
    achado = _PADRAO.match(caminho.name)
    if achado is None:
        return None
    try:
        if caminho.is_symlink() or not caminho.is_file():
            return None
        tamanho = caminho.stat().st_size
    except OSError:
        return None
    criado = datetime.strptime(achado.group(1), "%Y%m%dT%H%M%SZ").replace(tzinfo=UTC)
    return InfoBackup(caminho.name, cast(TipoBackup, achado.group(2)), criado, tamanho)


def listar(destino: Path) -> list[InfoBackup]:
    """Backups do diretório, do mais novo ao mais antigo; ignora links e nomes fora do padrão."""
    try:
        itens = [info_de(p) for p in destino.iterdir()]
    except OSError:
        return []
    achados = [i for i in itens if i is not None]
    return sorted(achados, key=lambda i: (i.criado_em, i.nome), reverse=True)


def rotacionar(destino: Path) -> list[Path]:
    """Apaga, por tipo, os mais antigos além de ``RETER[tipo]``; devolve o que apagou."""
    apagados: list[Path] = []
    por_tipo: dict[str, list[InfoBackup]] = {}
    for i in listar(destino):  # já do mais novo ao mais antigo
        por_tipo.setdefault(i.tipo, []).append(i)
    for tipo, itens in por_tipo.items():
        for velho in itens[RETER[cast(TipoBackup, tipo)] :]:
            alvo = destino / velho.nome
            try:
                alvo.unlink()
            except OSError:
                log.warning("backup: não foi possível apagar uma cópia antiga")
                continue
            apagados.append(alvo)
    return apagados


def _esquema_do_banco(banco: Path) -> str:
    con = sqlite3.connect(banco)
    try:
        try:
            linhas = con.execute("SELECT version_num FROM alembic_version").fetchall()
        except sqlite3.DatabaseError:
            return ESQUEMA_DESCONHECIDO
        return str(linhas[0][0]) if len(linhas) == 1 else ESQUEMA_DESCONHECIDO
    finally:
        con.close()


def _integro(banco: Path) -> bool:
    try:
        con = sqlite3.connect(banco)
        try:
            return con.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
        finally:
            con.close()
    except sqlite3.Error:
        return False


def _sha256(caminho: Path) -> str:
    h = hashlib.sha256()
    with caminho.open("rb") as f:
        while bloco := f.read(1024 * 1024):
            h.update(bloco)
    return h.hexdigest()


def _preparar_destino(destino: Path) -> None:
    destino.mkdir(mode=0o700, parents=True, exist_ok=True)
    destino.chmod(0o700)


def revisoes_do_codigo() -> frozenset[str]:
    """Todas as revisões Alembic conhecidas pelo código instalado (``alembic.ini`` da imagem)."""
    ini = Path(__file__).resolve().parents[2] / "alembic.ini"
    script = ScriptDirectory.from_config(Config(str(ini)))
    return frozenset(r.revision for r in script.walk_revisions())


# ---- criar --------------------------------------------------------------------------------


def criar_backup(
    banco: Path, destino: Path, tipo: TipoBackup, agora: datetime, versao: str
) -> Path:
    """Backup consistente do banco (com o app no ar). Nada parcial fica para trás e a rotação
    só roda depois do arquivo novo estar no lugar."""
    try:
        _preparar_destino(destino)
        if shutil.disk_usage(destino).free < 2 * banco.stat().st_size:
            raise ErroBackup(MSG_SEM_ESPACO)
        tmp = Path(tempfile.mkdtemp(prefix=".tmp-", dir=destino))
        try:
            final = _montar(banco, destino, tmp, tipo, agora, versao)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        rotacionar(destino)
        return final
    except ErroBackup:
        raise
    except Exception:
        log.exception("backup: falha inesperada")
        raise ErroBackup(MSG_GENERICA) from None


def _montar(
    banco: Path, destino: Path, tmp: Path, tipo: TipoBackup, agora: datetime, versao: str
) -> Path:
    copia = tmp / NOME_BANCO
    origem = sqlite3.connect(banco)
    try:
        alvo = sqlite3.connect(copia)
        try:
            origem.backup(alvo, pages=256, sleep=0.01)
        finally:
            alvo.close()
    finally:
        origem.close()
    if not _integro(copia):
        raise ErroBackup(MSG_GENERICA)
    manifesto = {
        "formato": FORMATO,
        "sentinela": versao,
        "esquema": _esquema_do_banco(copia),
        "criado_em": agora.astimezone(UTC).isoformat(),
        "sha256": _sha256(copia),
        "tamanho_db": copia.stat().st_size,
    }
    dados = json.dumps(manifesto, sort_keys=True).encode()
    pacote = tmp / "pacote.tar.gz"
    fd = os.open(pacote, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    mtime = int(agora.timestamp())
    with os.fdopen(fd, "wb") as saida, tarfile.open(fileobj=saida, mode="w:gz") as tar:
        info = tarfile.TarInfo(NOME_MANIFESTO)
        info.mode, info.mtime, info.size = 0o600, mtime, len(dados)
        tar.addfile(info, io.BytesIO(dados))
        info = tarfile.TarInfo(NOME_BANCO)
        info.mode, info.mtime, info.size = 0o600, mtime, copia.stat().st_size
        with copia.open("rb") as f:
            tar.addfile(info, f)
    pacote.chmod(0o600)
    final = destino / _nome(agora, tipo)
    os.replace(pacote, final)
    return final


# ---- ler e verificar ----------------------------------------------------------------------


def _manifesto_de(dados: bytes) -> Manifesto:
    try:
        bruto = json.loads(dados)
        criado = datetime.fromisoformat(bruto["criado_em"])
        manifesto = Manifesto(
            formato=bruto["formato"],
            sentinela=bruto["sentinela"],
            esquema=bruto["esquema"],
            criado_em=criado,
            sha256=bruto["sha256"],
            tamanho_db=bruto["tamanho_db"],
        )
    except (ValueError, KeyError, TypeError):
        raise ErroBackup(MSG_INVALIDO) from None
    if (
        manifesto.formato != FORMATO
        or not isinstance(manifesto.sentinela, str)
        or not isinstance(manifesto.esquema, str)
        or not isinstance(manifesto.sha256, str)
        or not re.fullmatch(r"[0-9a-f]{64}", manifesto.sha256)
        or type(manifesto.tamanho_db) is not int
        or not 0 < manifesto.tamanho_db <= MAX_BANCO
        or criado.tzinfo is None
    ):
        raise ErroBackup(MSG_INVALIDO)
    return manifesto


def _abrir(arquivo: Path) -> tarfile.TarFile:
    try:
        if arquivo.is_symlink() or not arquivo.is_file():
            raise ErroBackup(MSG_INVALIDO)
        return tarfile.open(arquivo, "r:gz")
    except (tarfile.TarError, OSError, EOFError):
        raise ErroBackup(MSG_INVALIDO) from None


def _membros(tar: tarfile.TarFile) -> dict[str, tarfile.TarInfo]:
    """Cabeçalhos do tar: exatamente os dois membros esperados, regulares, nomes exatos."""
    achados: dict[str, tarfile.TarInfo] = {}
    for m in tar:  # iteração por cabeçalho: um terceiro membro já recusa
        if (
            m.name not in (NOME_MANIFESTO, NOME_BANCO)
            or m.name in achados
            or not m.isreg()
            or len(achados) >= 2
        ):
            raise ErroBackup(MSG_INVALIDO)
        achados[m.name] = m
    if set(achados) != {NOME_MANIFESTO, NOME_BANCO}:
        raise ErroBackup(MSG_INVALIDO)
    if achados[NOME_MANIFESTO].size > MAX_MANIFESTO or not (
        0 < achados[NOME_BANCO].size <= MAX_BANCO
    ):
        raise ErroBackup(MSG_INVALIDO)
    return achados


def _dados_do_manifesto(tar: tarfile.TarFile, membros: dict[str, tarfile.TarInfo]) -> bytes:
    fluxo = tar.extractfile(membros[NOME_MANIFESTO])
    if fluxo is None:
        raise ErroBackup(MSG_INVALIDO)
    return fluxo.read(MAX_MANIFESTO + 1)


def ler_manifesto(arquivo: Path) -> Manifesto:
    try:
        with _abrir(arquivo) as tar:
            membros = _membros(tar)
            return _manifesto_de(_dados_do_manifesto(tar, membros))
    except (tarfile.TarError, OSError, EOFError):
        raise ErroBackup(MSG_INVALIDO) from None


def _extrair_verificando(
    arquivo: Path, revisoes_conhecidas: frozenset[str], saida: Path
) -> Manifesto:
    """Valida o tar e grava o banco (por fluxo, 0600) em ``saida``, conferido; se qualquer
    verificação falhar, ``saida`` é apagado e nada fica."""
    try:
        with _abrir(arquivo) as tar:
            # os cabeçalhos são conferidos ANTES de ler qualquer conteúdo
            membros = _membros(tar)
            manifesto = _manifesto_de(_dados_do_manifesto(tar, membros))
            if membros[NOME_BANCO].size != manifesto.tamanho_db:
                raise ErroBackup(MSG_INVALIDO)
            fluxo = tar.extractfile(membros[NOME_BANCO])
            if fluxo is None:
                raise ErroBackup(MSG_INVALIDO)
            h = hashlib.sha256()
            total = 0
            fd = os.open(saida, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "wb") as f:
                while bloco := fluxo.read(1024 * 1024):
                    total += len(bloco)
                    if total > manifesto.tamanho_db:
                        raise ErroBackup(MSG_INVALIDO)
                    h.update(bloco)
                    f.write(bloco)
        if total != manifesto.tamanho_db or h.hexdigest() != manifesto.sha256:
            raise ErroBackup(MSG_INVALIDO)
        if not _integro(saida):
            raise ErroBackup(MSG_INVALIDO)
        if manifesto.esquema != _esquema_do_banco(saida):
            raise ErroBackup(MSG_INVALIDO)
        if manifesto.esquema not in revisoes_conhecidas:
            raise ErroBackup(MSG_MAIS_NOVO)
    except ErroBackup:
        saida.unlink(missing_ok=True)
        raise
    except (tarfile.TarError, OSError, EOFError, sqlite3.Error):
        saida.unlink(missing_ok=True)
        raise ErroBackup(MSG_INVALIDO) from None
    return manifesto


def verificar_backup(
    arquivo: Path, revisoes_conhecidas: frozenset[str], dir_temporario: Path | None = None
) -> Manifesto:
    """Formato, membros, tamanho, sha256, ``integrity_check`` e esquema conhecido (um backup de
    esquema mais novo que o código é recusado). O banco extraído vai para um temporário que é
    sempre apagado (``dir_temporario``, por padrão a pasta do arquivo)."""
    base = dir_temporario or arquivo.parent
    try:
        tmp = Path(tempfile.mkdtemp(prefix=".tmp-verif-", dir=base))
    except OSError:
        raise ErroBackup(MSG_INVALIDO) from None
    try:
        return _extrair_verificando(arquivo, revisoes_conhecidas, tmp / NOME_BANCO)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ---- restaurar ----------------------------------------------------------------------------


def restaurar_backup(arquivo: Path, banco: Path, agora: datetime, versao: str) -> Path | None:
    """Restaura ``arquivo`` sobre ``banco`` (o core deve estar parado).

    Verifica, extrai por fluxo para ``<banco>.novo``, guarda o banco atual como backup
    ``pre-restore`` em ``<pasta do banco>/backups`` (se o banco atual estiver corrompido ou sem
    espaço, ele é só movido para o lado, sem apagar nada), apaga ``-wal``/``-shm`` do antigo
    (nunca reaplicados) e troca por ``os.replace``. Devolve o ``pre-restore`` (ou ``None`` se não
    havia banco).
    """
    novo = banco.with_name(banco.name + ".novo")
    _extrair_verificando(arquivo, revisoes_do_codigo(), novo)
    try:
        guardado: Path | None = None
        if banco.exists():
            try:
                guardado = criar_backup(
                    banco, banco.parent / "backups", "pre-restore", agora, versao
                )
            except ErroBackup:
                guardado = banco.with_name(f"{banco.name}.antes-restore-{_carimbo(agora)}")
                os.replace(banco, guardado)
        for sufixo in ("-wal", "-shm"):
            banco.with_name(banco.name + sufixo).unlink(missing_ok=True)
        os.replace(novo, banco)
        banco.chmod(0o600)
        return guardado
    except BaseException:
        novo.unlink(missing_ok=True)
        raise
