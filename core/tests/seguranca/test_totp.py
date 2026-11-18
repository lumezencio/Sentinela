import secrets
from datetime import UTC, datetime, timedelta

import pyotp
import pytest
from pydantic import SecretStr

from sentinela.db.modelos import Usuario
from sentinela.seguranca import totp
from sentinela.seguranca.cofre import CHAVES_SECRETAS, Cofre

SEGREDO_RFC = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
BASE = datetime(2026, 11, 18, 12, 0, 0, tzinfo=UTC)


def _cofre() -> Cofre:
    return Cofre(SecretStr(secrets.token_hex(32)))


def _codigo(segredo: str, contador: int) -> str:
    return pyotp.TOTP(segredo).at(contador * 30)


@pytest.mark.parametrize(
    ("t", "esperado"), [(59, "287082"), (1111111109, "081804"), (1234567890, "005924")]
)
def test_vetores_rfc6238_sha1(t: int, esperado: str) -> None:
    instante = datetime.fromtimestamp(t, UTC)
    assert totp.conferir(SEGREDO_RFC, esperado, instante, None) == totp.contador_de(instante)


def test_janela_mais_menos_um_aceita_e_dois_recusa() -> None:
    c = totp.contador_de(BASE)
    for d in (-1, 0, 1):
        assert totp.conferir(SEGREDO_RFC, _codigo(SEGREDO_RFC, c + d), BASE, None) == c + d
    for d in (-2, 2):
        assert totp.conferir(SEGREDO_RFC, _codigo(SEGREDO_RFC, c + d), BASE, None) is None


def test_contador_repetido_ou_anterior_recusado() -> None:
    c = totp.contador_de(BASE)
    assert totp.conferir(SEGREDO_RFC, _codigo(SEGREDO_RFC, c), BASE, c) is None
    assert totp.conferir(SEGREDO_RFC, _codigo(SEGREDO_RFC, c - 1), BASE, c) is None
    assert totp.conferir(SEGREDO_RFC, _codigo(SEGREDO_RFC, c + 1), BASE, c) == c + 1


@pytest.mark.parametrize("sufixo", [" ", "a", "٣", "\n"])
def test_codigo_com_espaco_letra_ou_5_digitos_recusado(sufixo: str) -> None:
    c = totp.contador_de(BASE)
    certo = _codigo(SEGREDO_RFC, c)
    assert totp.conferir(SEGREDO_RFC, certo, BASE, None) == c
    assert totp.conferir(SEGREDO_RFC, certo + sufixo, BASE, None) is None
    assert totp.conferir(SEGREDO_RFC, sufixo + certo, BASE, None) is None
    assert totp.conferir(SEGREDO_RFC, certo[:5], BASE, None) is None
    assert totp.conferir(SEGREDO_RFC, "", BASE, None) is None
    # dígitos arábico-índicos (str.isdigit é verdadeiro): só ASCII vale
    arabe = certo.translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))
    assert totp.conferir(SEGREDO_RFC, arabe, BASE, None) is None


def test_segredo_cifrado_nao_aparece_em_claro_e_chave_errada_da_none() -> None:
    cofre = _cofre()
    segredo = totp.novo_segredo()
    assert len(segredo) == 32
    blob = totp.cifrar_segredo(cofre, segredo)
    assert segredo not in blob
    assert len(blob) <= 512
    assert totp.decifrar_segredo(cofre, blob) == segredo
    assert totp.decifrar_segredo(_cofre(), blob) is None
    assert totp.decifrar_segredo(cofre, None) is None
    assert totp.decifrar_segredo(cofre, "lixo!!") is None
    assert "segredo_totp" in CHAVES_SECRETAS


def test_estados_pendente_e_ativo() -> None:
    u = Usuario(login="x", hash_senha="h")
    assert not totp.totp_ativo(u)
    assert not totp.totp_pendente(u)
    u.totp_cifrado = "b"
    assert totp.totp_pendente(u)
    assert not totp.totp_ativo(u)
    u.totp_ultimo_contador = 7
    assert totp.totp_ativo(u)
    assert not totp.totp_pendente(u)


def test_uri_otpauth_tem_emissor_login_e_parametros_fixos() -> None:
    u = totp.uri(SEGREDO_RFC, "ana maria@x")
    assert u.startswith("otpauth://totp/Sentinela:ana%20maria%40x?")
    assert f"secret={SEGREDO_RFC}" in u
    assert "issuer=Sentinela" in u
    assert "algorithm=SHA1" in u
    assert "digits=6" in u
    assert "period=30" in u


def test_qr_svg_e_svg_sem_script_nem_style() -> None:
    svg = totp.qr_svg(totp.uri(SEGREDO_RFC, "ana")).decode()
    assert "<svg" in svg
    assert "viewBox" in svg
    assert "<script" not in svg.lower()
    assert "style=" not in svg.lower()
    assert "<?xml" not in svg


def test_contador_de_usa_passo_de_30s() -> None:
    assert totp.contador_de(BASE + timedelta(seconds=30)) == totp.contador_de(BASE) + 1
