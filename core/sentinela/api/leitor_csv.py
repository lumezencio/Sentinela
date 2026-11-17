"""Leitura de CSV de equipamentos (sem I/O): codificação, delimitador, cabeçalho e linhas.

Planilhas do Excel em português costumam vir em Windows-1252 com ``;``; às vezes com os bytes
de BOM UTF-8 na frente mesmo sendo cp1252. Os motivos de erro nunca repetem a entrada.
"""

import codecs
import csv
import io

COLUNAS = frozenset({"nome", "ip", "mac", "classe", "checagem", "porta"})
OBRIGATORIAS = ("nome", "ip", "classe")
MAX_LINHAS = 5000
_AMOSTRA_SNIFFER = 8 * 1024


class ArquivoInvalido(ValueError):
    def __init__(self, motivo: str) -> None:
        super().__init__(motivo)
        self.motivo = motivo


def decodificar(dados: bytes) -> str:
    """UTF-8 (com ou sem BOM); se falhar, Windows-1252 sem os bytes de BOM."""
    try:
        return dados.decode("utf-8-sig")
    except UnicodeDecodeError:
        pass
    try:
        return dados.removeprefix(codecs.BOM_UTF8).decode("cp1252")
    except UnicodeDecodeError:
        raise ArquivoInvalido("Codificação não reconhecida: use UTF-8 ou Windows-1252.") from None


def _cabecalho(linha: str, delimitador: str) -> list[str]:
    return [c.strip().casefold() for c in next(csv.reader([linha], delimiter=delimitador), [])]


def _tem_obrigatorias(linha: str, delimitador: str) -> bool:
    return set(OBRIGATORIAS) <= set(_cabecalho(linha, delimitador))


def detectar_delimitador(texto: str) -> str:
    """``csv.Sniffer`` entre ``,`` e ``;``; confere com o cabeçalho e cai para o outro."""
    primeira = texto.splitlines()[0] if texto else ""
    try:
        delimitador = csv.Sniffer().sniff(texto[:_AMOSTRA_SNIFFER], delimiters=",;").delimiter
    except csv.Error:
        delimitador = ";" if primeira.count(";") > primeira.count(",") else ","
    if not _tem_obrigatorias(primeira, delimitador):
        outro = "," if delimitador == ";" else ";"
        if _tem_obrigatorias(primeira, outro):
            return outro
    return delimitador


def ler_linhas(texto: str) -> list[tuple[int, dict[str, str]]]:
    """Linhas não vazias como (número da linha no arquivo, campos conhecidos)."""
    texto = texto.removeprefix("﻿")
    if not texto.strip():
        raise ArquivoInvalido("Arquivo vazio.")
    leitor = csv.reader(io.StringIO(texto, newline=""), delimiter=detectar_delimitador(texto))
    try:
        cabecalho = [c.strip().casefold() for c in next(leitor)]
        faltando = [c for c in OBRIGATORIAS if c not in cabecalho]
        if faltando:
            raise ArquivoInvalido(
                "Cabeçalho deve ter as colunas nome, ip e classe (mac, checagem e porta opcionais)."
            )
        conhecidas = [c for c in cabecalho if c in COLUNAS]
        if len(conhecidas) != len(set(conhecidas)):
            raise ArquivoInvalido("Cabeçalho com coluna repetida.")
        linhas: list[tuple[int, dict[str, str]]] = []
        for campos in leitor:
            if not any(c.strip() for c in campos):
                continue
            if len(linhas) >= MAX_LINHAS:
                raise ArquivoInvalido(f"O arquivo passa de {MAX_LINHAS} linhas.")
            registro = {
                nome: (campos[i].strip() if i < len(campos) else "")
                for i, nome in enumerate(cabecalho)
                if nome in COLUNAS
            }
            linhas.append((leitor.line_num, registro))
    except csv.Error:
        raise ArquivoInvalido("CSV malformado.") from None
    return linhas
