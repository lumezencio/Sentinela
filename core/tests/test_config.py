import secrets

import pytest
from pydantic import ValidationError

from sentinela.config import Settings

CHAVE = secrets.token_hex(32)


def test_padroes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SENTINELA_CHAVE_SESSAO", "x")
    monkeypatch.setenv("SENTINELA_CHAVE_CREDENCIAIS", CHAVE)
    s = Settings()
    assert s.teto_pps == 20
    assert s.latencia_instavel_ms == 200.0
    assert s.demo is False
    assert s.chave_sessao.get_secret_value() == "x"
    assert "x" not in repr(s)


@pytest.mark.parametrize("teto", [0, 101])
def test_teto_pps_fora_da_faixa(teto: int) -> None:
    with pytest.raises(ValidationError):
        Settings(chave_sessao="x", chave_credenciais=CHAVE, teto_pps=teto)


def test_variavel_desconhecida_rejeitada() -> None:
    with pytest.raises(ValidationError):
        Settings(chave_sessao="x", chave_credenciais=CHAVE, inexistente=1)  # type: ignore[call-arg]


def test_chave_credenciais_obrigatoria(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SENTINELA_CHAVE_CREDENCIAIS", raising=False)
    with pytest.raises(ValidationError):
        Settings(chave_sessao="x")  # type: ignore[call-arg]
