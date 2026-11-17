import pytest
from pydantic import ValidationError

from sentinela.config import Settings


def test_padroes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SENTINELA_CHAVE_SESSAO", "x")
    s = Settings()
    assert s.teto_pps == 20
    assert s.latencia_instavel_ms == 200.0
    assert s.demo is False
    assert s.chave_sessao.get_secret_value() == "x"
    assert "x" not in repr(s)


@pytest.mark.parametrize("teto", [0, 101])
def test_teto_pps_fora_da_faixa(teto: int) -> None:
    with pytest.raises(ValidationError):
        Settings(chave_sessao="x", teto_pps=teto)


def test_variavel_desconhecida_rejeitada() -> None:
    with pytest.raises(ValidationError):
        Settings(chave_sessao="x", inexistente=1)  # type: ignore[call-arg]
