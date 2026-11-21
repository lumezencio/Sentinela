import secrets
from pathlib import Path

import pytest
from pydantic import ValidationError

from sentinela.config import Settings, pasta_dados

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


def test_fuso_padrao_sao_paulo() -> None:
    assert Settings(chave_sessao="x", chave_credenciais=CHAVE).fuso == "America/Sao_Paulo"


def test_fuso_invalido_recusado() -> None:
    with pytest.raises(ValidationError, match="Fuso inválido"):
        Settings(chave_sessao="x", chave_credenciais=CHAVE, fuso="Marte/Olympus")


def test_ca_adicional_inexistente_recusado(tmp_path: Path) -> None:
    assert Settings(chave_sessao="x", chave_credenciais=CHAVE).ca_adicional == ""
    with pytest.raises(ValidationError, match="ca_adicional"):
        Settings(chave_sessao="x", chave_credenciais=CHAVE, ca_adicional=str(tmp_path / "n.pem"))
    pem = tmp_path / "ca.pem"
    pem.write_text("x")
    assert Settings(chave_sessao="x", chave_credenciais=CHAVE, ca_adicional=str(pem))


def test_rede_sugerida_valida() -> None:
    s = Settings(
        chave_sessao="x",
        chave_credenciais=CHAVE,
        rede_sugerida="192.168.15.0/24",
        gateway_sugerido="192.168.15.1",
    )
    assert (s.rede_sugerida, s.gateway_sugerido) == ("192.168.15.0/24", "192.168.15.1")
    assert Settings(chave_sessao="x", chave_credenciais=CHAVE).rede_sugerida == ""


@pytest.mark.parametrize("rede", ["8.8.8.0/24", "10.0.0.0/8", "lixo", "192.168.15.1/24"])
def test_rede_sugerida_invalida_vira_vazia_sem_impedir_a_subida(rede: str) -> None:
    s = Settings(
        chave_sessao="x",
        chave_credenciais=CHAVE,
        rede_sugerida=rede,
        gateway_sugerido="192.168.15.1",
    )
    assert (s.rede_sugerida, s.gateway_sugerido) == ("", "")


@pytest.mark.parametrize(
    "gateway", ["192.168.16.1", "192.168.15.0", "192.168.15.255", "lixo", "::1"]
)
def test_gateway_sugerido_invalido_vira_vazio(gateway: str) -> None:
    s = Settings(
        chave_sessao="x",
        chave_credenciais=CHAVE,
        rede_sugerida="192.168.15.0/24",
        gateway_sugerido=gateway,
    )
    assert (s.rede_sugerida, s.gateway_sugerido) == ("192.168.15.0/24", "")


def test_pasta_dados_e_a_do_banco(tmp_path: Path) -> None:
    s = Settings(
        chave_sessao="x", chave_credenciais=CHAVE, banco_url=f"sqlite+aiosqlite:///{tmp_path}/a.db"
    )
    assert pasta_dados(s) == tmp_path
    assert pasta_dados(Settings(chave_sessao="x", chave_credenciais=CHAVE)) == Path("/dados")
    memoria = Settings(chave_sessao="x", chave_credenciais=CHAVE, banco_url="sqlite+aiosqlite://")
    with pytest.raises(ValueError, match="memória"):
        pasta_dados(memoria)
