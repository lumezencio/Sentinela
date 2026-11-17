"""Logs em JSON (uma linha por registro) no stdout, para o ``docker logs`` (10m×3).

``configurar_logs`` é idempotente e só ACRESCENTA um handler na raiz (não troca os existentes,
então o ``caplog`` do pytest continua funcionando). Nível: ``sentinela`` em INFO (tentativas de
login, retenção), o resto em WARNING. Os loggers do uvicorn passam a sair pelo mesmo handler.

Regra de sempre: nada de senha, token ou credencial na mensagem nem nos campos extras.
"""

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any, TextIO

# atributos do LogRecord (e o ``color_message`` do uvicorn, com códigos ANSI) não viram campo
_PADRAO = frozenset(logging.makeLogRecord({}).__dict__) | {
    "message",
    "asctime",
    "taskName",
    "color_message",
}
_UVICORN = ("uvicorn", "uvicorn.error", "uvicorn.access")


class FormatoJson(logging.Formatter):
    """``timestamp``, ``level``, ``logger``, ``message`` e os campos de ``extra=`` presentes."""

    def format(self, record: logging.LogRecord) -> str:
        dados: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for chave, valor in record.__dict__.items():
            if chave not in _PADRAO and not chave.startswith("_"):
                dados[chave] = valor
        if record.exc_info:
            dados["exception"] = self.formatException(record.exc_info)
        return json.dumps(dados, ensure_ascii=False, default=str)


class _SaidaPadrao(logging.StreamHandler[TextIO]):
    """Escreve no ``sys.stdout`` da hora da emissão (o pytest troca o stdout a cada teste)."""

    _sentinela = True

    def __init__(self) -> None:
        super().__init__(sys.stdout)

    @property
    def stream(self) -> TextIO:
        return sys.stdout

    @stream.setter
    def stream(self, _valor: TextIO) -> None:
        pass


def configurar_logs(handler: logging.Handler | None = None) -> logging.Handler:
    """Instala (uma vez) o handler JSON na raiz; devolve o handler em uso."""
    raiz = logging.getLogger()
    for existente in raiz.handlers:
        if getattr(existente, "_sentinela", False):
            return existente
    novo = handler or _SaidaPadrao()
    novo.setFormatter(FormatoJson())
    novo._sentinela = True  # type: ignore[attr-defined]
    raiz.addHandler(novo)
    if raiz.level == logging.NOTSET or raiz.level > logging.WARNING:
        raiz.setLevel(logging.WARNING)
    logging.getLogger("sentinela").setLevel(logging.INFO)
    for nome in _UVICORN:
        lg = logging.getLogger(nome)
        # troca o handler em texto do uvicorn pelo JSON da raiz; logger que o uvicorn
        # desligou (``--no-access-log``: sem handler e sem propagar) continua desligado
        if lg.handlers:
            lg.handlers.clear()
            lg.propagate = True
    return novo
