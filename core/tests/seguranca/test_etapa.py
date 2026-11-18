from datetime import UTC, datetime, timedelta

from pydantic import SecretStr

from sentinela.seguranca import etapa

CHAVE = SecretStr("chave-de-teste-nao-secreta")
AGORA = datetime(2026, 11, 18, 12, 0, 0, tzinfo=UTC)


def test_token_valido_devolve_usuario() -> None:
    token = etapa.emitir(CHAVE, 42, AGORA)
    assert etapa.ler(CHAVE, token, AGORA + timedelta(seconds=299)) == 42
    achado = etapa.ler_completo(CHAVE, token, AGORA)
    assert achado is not None
    assert achado[0] == 42
    assert achado[1] and achado[1] not in {etapa.emitir(CHAVE, 42, AGORA).split(".")[3]}


def test_expirado_adulterado_ou_truncado_da_none() -> None:
    token = etapa.emitir(CHAVE, 42, AGORA)
    assert etapa.ler(CHAVE, token, AGORA + etapa.VALIDADE_ETAPA) is None
    versao, uid, expira, jti, mac = token.split(".")
    assert etapa.ler(CHAVE, ".".join([versao, "43", expira, jti, mac]), AGORA) is None
    assert (
        etapa.ler(CHAVE, ".".join([versao, uid, str(int(expira) + 999), jti, mac]), AGORA) is None
    )
    assert etapa.ler(CHAVE, ".".join([versao, uid, expira, "outro", mac]), AGORA) is None
    assert etapa.ler(CHAVE, token[:-1], AGORA) is None
    assert etapa.ler(CHAVE, token.rsplit(".", 1)[0], AGORA) is None
    for lixo in ("", ".", "....", "v1.1.2.3.4", "x" * 500, "v2." + token[3:], "+1.2.3.4.5"):
        assert etapa.ler(CHAVE, lixo, AGORA) is None


def test_chave_de_sessao_diferente_nao_valida() -> None:
    token = etapa.emitir(CHAVE, 42, AGORA)
    assert etapa.ler(SecretStr("outra-chave"), token, AGORA) is None


def test_registro_uso_unico_expira_e_erros() -> None:
    reg = etapa.RegistroEtapas()
    reg.registrar("j1", 1, AGORA)
    assert reg.valida("j1", 1, AGORA)
    assert not reg.valida("j1", 2, AGORA)  # de outro usuário
    assert not reg.valida("desconhecido", 1, AGORA)
    assert reg.consumir("j1")
    assert not reg.consumir("j1")
    assert not reg.valida("j1", 1, AGORA)

    reg.registrar("j2", 1, AGORA)
    assert not reg.valida("j2", 1, AGORA + etapa.VALIDADE_ETAPA)
    assert len(reg) == 0

    reg.registrar("j3", 1, AGORA)
    for _ in range(etapa.ERROS_MAXIMOS - 1):
        reg.registrar_erro("j3")
        assert reg.valida("j3", 1, AGORA)
    reg.registrar_erro("j3")
    assert not reg.valida("j3", 1, AGORA)


def test_registro_limitado() -> None:
    reg = etapa.RegistroEtapas(max_etapas=3)
    for i in range(10):
        reg.registrar(f"j{i}", 1, AGORA)
    assert len(reg) == 3
