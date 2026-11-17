import io
import json
import logging
from collections.abc import Iterator

import httpx
import pytest

from sentinela.registro import FormatoJson, configurar_logs
from tests.conftest import CriarUsuario


class Memoria(logging.Handler):
    def __init__(self) -> None:
        super().__init__()
        self.linhas: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.linhas.append(self.format(record))


@pytest.fixture
def handler_json() -> Iterator[Memoria]:
    """O handler instalado pelo criar_app escreve no stdout; aqui um igual, em memória."""
    configurar_logs()  # idempotente: o criar_app dos testes já instalou
    h = Memoria()
    h.setFormatter(FormatoJson())
    logging.getLogger().addHandler(h)
    yield h
    logging.getLogger().removeHandler(h)


def test_configurar_logs_idempotente_e_niveis() -> None:
    primeiro = configurar_logs()
    assert configurar_logs() is primeiro
    marcados = [h for h in logging.getLogger().handlers if getattr(h, "_sentinela", False)]
    assert marcados == [primeiro]
    assert logging.getLogger("sentinela").getEffectiveLevel() == logging.INFO
    assert logging.getLogger().level <= logging.WARNING
    assert isinstance(primeiro.formatter, FormatoJson)


def test_formato_json_com_campos_extras_e_excecao() -> None:
    saida = io.StringIO()
    h = logging.StreamHandler(saida)
    h.setFormatter(FormatoJson())
    lg = logging.getLogger("sentinela.teste_formato")
    lg.addHandler(h)
    try:
        lg.warning("olá %s", "mundo", extra={"resultado": "ok"})
        try:
            raise ValueError("x")
        except ValueError:
            lg.exception("falhou")
    finally:
        lg.removeHandler(h)
    primeira, segunda = (json.loads(linha) for linha in saida.getvalue().splitlines())
    assert primeira["level"] == "WARNING"
    assert primeira["logger"] == "sentinela.teste_formato"
    assert primeira["message"] == "olá mundo"
    assert primeira["resultado"] == "ok"
    assert primeira["timestamp"].endswith("+00:00")
    assert "ValueError" in segunda["exception"]


async def test_login_gera_linha_json_com_rotulo_e_resultado(
    handler_json: Memoria, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", "senha-de-teste-longa-1")
    r = await cliente.post(
        "/api/v1/auth/login", json={"login": "ana", "senha": "senha-errada-de-teste"}
    )
    assert r.status_code == 401
    registros = [json.loads(linha) for linha in handler_json.linhas]
    logins = [d for d in registros if d.get("evento") == "login"]
    assert logins, registros
    assert logins[-1]["rotulo"] == "login='ana'"
    assert logins[-1]["resultado"] == "falha"
    assert logins[-1]["level"] == "INFO"
    assert "senha-errada-de-teste" not in json.dumps(registros)
