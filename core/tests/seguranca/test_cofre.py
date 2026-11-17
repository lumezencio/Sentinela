import secrets

import pytest
from pydantic import SecretStr

from sentinela.seguranca.cofre import Cofre, ErroCofre


def _chave() -> SecretStr:
    return SecretStr(secrets.token_hex(32))


def test_cofre_ida_e_volta() -> None:
    cofre = Cofre(_chave())
    dados = {"usuario": "leitor", "senha": "s3gredo-de-teste"}
    blob = cofre.cifrar(dados)
    assert isinstance(blob, bytes)
    assert b"s3gredo-de-teste" not in blob
    assert cofre.decifrar(blob) == dados


def test_cofre_chave_errada_levanta_erro_generico() -> None:
    chave_a, chave_b = _chave(), _chave()
    blob = Cofre(chave_a).cifrar({"senha": "s3gredo-de-teste"})
    with pytest.raises(ErroCofre) as exc:
        Cofre(chave_b).decifrar(blob)
    msg = str(exc.value)
    assert blob.decode() not in msg
    assert chave_a.get_secret_value() not in msg
    assert chave_b.get_secret_value() not in msg
    assert "s3gredo-de-teste" not in msg


def test_cofre_blob_corrompido_levanta_erro_generico() -> None:
    with pytest.raises(ErroCofre):
        Cofre(_chave()).decifrar(b"lixo")


@pytest.mark.parametrize("chave", ["", "curta", "zz" * 32, "ab" * 31])
def test_cofre_rejeita_chave_invalida(chave: str) -> None:
    with pytest.raises(ErroCofre):
        Cofre(SecretStr(chave))


def test_mascarar_remove_segredos() -> None:
    texto = "falha ao entrar com senha=abc123 e comunidade public-x"
    saida = Cofre.mascarar(texto, ["abc123", "public-x", ""])
    assert "abc123" not in saida
    assert "public-x" not in saida
    assert saida.count("***") == 2


def test_segredos_so_das_chaves_secretas() -> None:
    cofre = Cofre(SecretStr("ab" * 32))
    v3 = {
        "versao": "3",
        "usuario": "admin",
        "auth": "SHA256",
        "senha_auth": "s-auth-123",
        "priv": "AES",
        "senha_priv": "s-priv-456",
    }
    assert sorted(cofre.segredos(cofre.cifrar(v3))) == ["s-auth-123", "s-priv-456"]
    v2c = {"versao": "2c", "comunidade": "publica-x"}
    assert cofre.segredos(cofre.cifrar(v2c)) == ["publica-x"]
    assert cofre.segredos(cofre.cifrar({"usuario": "admin", "senha": "x1"})) == ["x1"]
    assert cofre.segredos(b"lixo") == []
    assert cofre.segredos(b"") == []
