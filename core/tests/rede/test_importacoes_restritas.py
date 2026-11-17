"""Bibliotecas que abrem socket só podem aparecer no seu módulo adaptador (análise estática).

Toda saída de rede passa por um ``DestinoAutorizado`` da Guarda; restringir onde estas
bibliotecas são importadas mantém pequeno o conjunto de arquivos a auditar. Arquivos da lista
que ainda não existem (adaptadores de tarefas futuras) simplesmente ficam permitidos.
"""

import ast
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[2] / "sentinela"

CHECAGENS = "monitor/checagens/"  # prefixo: qualquer módulo de checagem
MIKROTIK = "descoberta/fontes/mikrotik_api.py"
SONDAGEM = "descoberta/classificador/sondagem.py"

# biblioteca -> arquivos (relativos a ``sentinela/``) ou prefixos terminados em "/"
PERMITIDOS: dict[str, tuple[str, ...]] = {
    "pysnmp": ("descoberta/fontes/snmp.py",),
    "httpx": ("monitor/checagens/http.py", "descoberta/fontes/gravador_http.py", SONDAGEM),
    "icmplib": ("monitor/checagens/icmp.py", "descoberta/varredura.py"),
    "socket": (CHECAGENS, MIKROTIK, SONDAGEM),
}
# chamadas do asyncio que abrem socket diretamente
CHAMADAS_SOCKET = frozenset(
    {
        "open_connection",
        "create_connection",
        "create_datagram_endpoint",
        "sock_connect",
        "start_server",
    }
)


def _raiz_modulo(nome: str) -> str:
    return nome.split(".", 1)[0]


def usos(codigo: str) -> set[str]:
    """Bibliotecas restritas usadas no código (``socket`` cobre as chamadas do asyncio)."""
    achados: set[str] = set()
    for no in ast.walk(ast.parse(codigo)):
        if isinstance(no, ast.Import):
            achados.update(_raiz_modulo(a.name) for a in no.names)
        elif isinstance(no, ast.ImportFrom) and no.module and no.level == 0:
            achados.add(_raiz_modulo(no.module))
            if no.module == "asyncio" and any(a.name in CHAMADAS_SOCKET for a in no.names):
                achados.add("socket")
        elif isinstance(no, ast.Attribute) and no.attr in CHAMADAS_SOCKET:
            achados.add("socket")
        elif isinstance(no, ast.Call) and no.args:
            # __import__("httpx") / importlib.import_module("httpx")
            func = no.func
            nome = func.id if isinstance(func, ast.Name) else getattr(func, "attr", "")
            alvo = no.args[0]
            if nome in {"__import__", "import_module"} and isinstance(alvo, ast.Constant):
                if isinstance(alvo.value, str):
                    achados.add(_raiz_modulo(alvo.value))
    return achados & PERMITIDOS.keys()


def _permitido(relativo: str, biblioteca: str) -> bool:
    return any(
        relativo.startswith(p) if p.endswith("/") else relativo == p for p in PERMITIDOS[biblioteca]
    )


def test_importacoes_restritas() -> None:
    arquivos = sorted(RAIZ.rglob("*.py"))
    assert arquivos
    violacoes: list[str] = []
    encontrados: set[str] = set()
    for arq in arquivos:
        relativo = arq.relative_to(RAIZ).as_posix()
        for biblioteca in usos(arq.read_text(encoding="utf-8")):
            encontrados.add(biblioteca)
            if not _permitido(relativo, biblioteca):
                violacoes.append(f"{biblioteca} em sentinela/{relativo}")
    assert violacoes == []
    # o detector funciona sobre o código real: as checagens existentes são achadas
    assert {"httpx", "icmplib", "socket"} <= encontrados


@pytest.mark.parametrize(
    ("codigo", "esperado"),
    [
        ("import httpx", {"httpx"}),
        ("from pysnmp.hlapi.v3arch.asyncio import get_cmd", {"pysnmp"}),
        ("import socket", {"socket"}),
        ("from socket import socket", {"socket"}),
        ("import icmplib as i", {"icmplib"}),
        ("import asyncio\nasyncio.open_connection('x', 1)", {"socket"}),
        ("from asyncio import open_connection", {"socket"}),
        ("loop.create_datagram_endpoint(f)", {"socket"}),
        ("__import__('httpx')", {"httpx"}),
        ("import importlib\nimportlib.import_module('pysnmp.hlapi')", {"pysnmp"}),
        ("import asyncio\nimport json", set()),
        ("x = 'httpx'", set()),
    ],
)
def test_detector_de_usos(codigo: str, esperado: set[str]) -> None:
    assert usos(codigo) == esperado


def test_permitidos_por_prefixo_e_arquivo() -> None:
    assert _permitido("monitor/checagens/tcp.py", "socket")
    assert _permitido(SONDAGEM, "socket")
    assert not _permitido("monitor/agendador.py", "socket")
    assert not _permitido("descoberta/fontes/snmp.py", "httpx")
    assert _permitido("descoberta/varredura.py", "icmplib")
    assert not _permitido("descoberta/fontes/mikrotik_api.py", "icmplib")
