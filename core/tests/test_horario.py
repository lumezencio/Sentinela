from datetime import UTC, datetime
from zoneinfo import ZoneInfo

import pytest

from sentinela.config import Settings
from sentinela.horario import amanha_8h, formatar_duracao, hora_local, zona


@pytest.mark.parametrize(
    ("segundos", "esperado"),
    [(40, "40 s"), (100, "1 min 40 s"), (1080, "18 min"), (7500, "2 h 5 min"), (7200, "2 h")],
)
def test_formatar_duracao(segundos: float, esperado: str) -> None:
    assert formatar_duracao(segundos) == esperado


def test_hora_local() -> None:
    sp = ZoneInfo("America/Sao_Paulo")
    assert hora_local(datetime(2026, 11, 18, 17, 32, tzinfo=UTC), sp) == "14:32"


def test_amanha_8h_em_nova_york_no_horario_de_verao() -> None:
    ny = ZoneInfo("America/New_York")
    # 2026-11-01 01:30 local (ainda EDT, UTC-4); amanhã 08:00 já é EST (UTC-5) = 13:00 UTC
    agora = datetime(2026, 11, 1, 1, 30, tzinfo=ny)
    assert amanha_8h(agora, ny) == datetime(2026, 11, 2, 13, 0, tzinfo=UTC)


def test_zona_usa_o_fuso_das_settings() -> None:
    s = Settings(chave_sessao="x", chave_credenciais="0" * 64, fuso="America/New_York")
    assert zona(s) == ZoneInfo("America/New_York")
