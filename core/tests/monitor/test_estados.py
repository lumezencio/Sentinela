from sentinela.monitor.estados import (
    Estado,
    MaquinaEstados,
    ResultadoChecagem,
    Transicao,
)

OK = ResultadoChecagem(ok=True, latencia_ms=10.0)
LENTO = ResultadoChecagem(ok=True, latencia_ms=250.0)
FALHA = ResultadoChecagem(ok=False, latencia_ms=None, erro="timeout")


def _em(estado: Estado) -> MaquinaEstados:
    return MaquinaEstados(estado)


def test_valores_do_enum() -> None:
    assert [e.value for e in Estado] == [
        "desconhecido",
        "online",
        "instavel",
        "suspeito",
        "offline",
        "pausado",
    ]


def test_estado_inicial_padrao() -> None:
    m = MaquinaEstados()
    assert m.estado is Estado.DESCONHECIDO
    assert m.precisa_confirmar is False


def test_desconhecido_ok_vai_para_online() -> None:
    m = _em(Estado.DESCONHECIDO)
    assert m.aplicar(OK) == Transicao(Estado.DESCONHECIDO, Estado.ONLINE)
    assert m.estado is Estado.ONLINE


def test_desconhecido_ok_lento_vai_para_instavel() -> None:
    m = _em(Estado.DESCONHECIDO)
    assert m.aplicar(LENTO) == Transicao(Estado.DESCONHECIDO, Estado.INSTAVEL)


def test_desconhecido_falha_vai_para_suspeito() -> None:
    m = _em(Estado.DESCONHECIDO)
    assert m.aplicar(FALHA) == Transicao(Estado.DESCONHECIDO, Estado.SUSPEITO)
    assert m.precisa_confirmar is True


def test_online_ok_nao_muda() -> None:
    m = _em(Estado.ONLINE)
    assert m.aplicar(OK) is None
    assert m.estado is Estado.ONLINE


def test_online_falha_vai_para_suspeito() -> None:
    m = _em(Estado.ONLINE)
    assert m.aplicar(FALHA) == Transicao(Estado.ONLINE, Estado.SUSPEITO)
    assert m.precisa_confirmar is True


def test_online_latencia_250_vai_para_instavel() -> None:
    m = _em(Estado.ONLINE)
    assert m.aplicar(LENTO) == Transicao(Estado.ONLINE, Estado.INSTAVEL)


def test_latencia_igual_ao_limite_nao_e_lenta() -> None:
    m = _em(Estado.ONLINE)
    assert m.aplicar(ResultadoChecagem(ok=True, latencia_ms=200.0)) is None


def test_limite_customizado() -> None:
    m = MaquinaEstados(Estado.ONLINE, latencia_instavel_ms=50.0)
    assert m.aplicar(ResultadoChecagem(ok=True, latencia_ms=60.0)) == Transicao(
        Estado.ONLINE, Estado.INSTAVEL
    )


def test_ok_sem_latencia_e_normal() -> None:
    m = _em(Estado.DESCONHECIDO)
    assert m.aplicar(ResultadoChecagem(ok=True, latencia_ms=None)) == Transicao(
        Estado.DESCONHECIDO, Estado.ONLINE
    )


def test_suspeito_ok_normal_volta_online() -> None:
    m = _em(Estado.ONLINE)
    m.aplicar(FALHA)
    assert m.aplicar(OK) == Transicao(Estado.SUSPEITO, Estado.ONLINE)
    assert m.precisa_confirmar is False


def test_suspeito_ok_lento_vai_para_instavel() -> None:
    m = _em(Estado.ONLINE)
    m.aplicar(FALHA)
    assert m.aplicar(LENTO) == Transicao(Estado.SUSPEITO, Estado.INSTAVEL)


def test_tres_falhas_seguidas_levam_a_offline() -> None:
    m = _em(Estado.ONLINE)
    assert m.aplicar(FALHA) == Transicao(Estado.ONLINE, Estado.SUSPEITO)
    assert m.aplicar(FALHA) is None
    assert m.estado is Estado.SUSPEITO
    assert m.aplicar(FALHA) == Transicao(Estado.SUSPEITO, Estado.OFFLINE)
    assert m.precisa_confirmar is False


def test_sucesso_zera_contagem_de_falhas() -> None:
    m = _em(Estado.ONLINE)
    m.aplicar(FALHA)
    m.aplicar(FALHA)
    m.aplicar(OK)  # volta a online, zera
    m.aplicar(FALHA)
    assert m.aplicar(FALHA) is None
    assert m.estado is Estado.SUSPEITO


def test_instavel_falha_vai_para_suspeito() -> None:
    m = _em(Estado.INSTAVEL)
    assert m.aplicar(FALHA) == Transicao(Estado.INSTAVEL, Estado.SUSPEITO)


def test_instavel_falha_depois_precisa_de_tres_falhas_no_total() -> None:
    m = _em(Estado.INSTAVEL)
    m.aplicar(FALHA)
    m.aplicar(FALHA)
    assert m.aplicar(FALHA) == Transicao(Estado.SUSPEITO, Estado.OFFLINE)


def test_instavel_tres_oks_normais_voltam_online() -> None:
    m = _em(Estado.INSTAVEL)
    assert m.aplicar(OK) is None
    assert m.aplicar(OK) is None
    assert m.aplicar(OK) == Transicao(Estado.INSTAVEL, Estado.ONLINE)


def test_instavel_ok_lento_zera_contagem() -> None:
    m = _em(Estado.INSTAVEL)
    m.aplicar(OK)
    m.aplicar(OK)
    assert m.aplicar(LENTO) is None
    assert m.aplicar(OK) is None
    assert m.aplicar(OK) is None
    assert m.aplicar(OK) == Transicao(Estado.INSTAVEL, Estado.ONLINE)


def test_offline_primeiro_ok_continua_offline() -> None:
    m = _em(Estado.OFFLINE)
    assert m.aplicar(OK) is None
    assert m.estado is Estado.OFFLINE


def test_offline_segundo_ok_volta_online() -> None:
    m = _em(Estado.OFFLINE)
    m.aplicar(OK)
    assert m.aplicar(OK) == Transicao(Estado.OFFLINE, Estado.ONLINE)


def test_offline_segundo_ok_lento_vai_para_instavel() -> None:
    m = _em(Estado.OFFLINE)
    m.aplicar(OK)
    assert m.aplicar(LENTO) == Transicao(Estado.OFFLINE, Estado.INSTAVEL)


def test_offline_ok_lento_conta_como_ok() -> None:
    m = _em(Estado.OFFLINE)
    assert m.aplicar(LENTO) is None
    assert m.aplicar(OK) == Transicao(Estado.OFFLINE, Estado.ONLINE)


def test_offline_falha_entre_oks_zera_contagem() -> None:
    m = _em(Estado.OFFLINE)
    m.aplicar(OK)
    assert m.aplicar(FALHA) is None
    assert m.aplicar(OK) is None
    assert m.estado is Estado.OFFLINE
    assert m.aplicar(OK) == Transicao(Estado.OFFLINE, Estado.ONLINE)


def test_offline_falha_continua_offline() -> None:
    m = _em(Estado.OFFLINE)
    assert m.aplicar(FALHA) is None
    assert m.estado is Estado.OFFLINE


def test_pausar_de_cada_estado() -> None:
    for e in Estado:
        if e is Estado.PAUSADO:
            continue
        m = _em(e)
        assert m.pausar() == Transicao(e, Estado.PAUSADO)
        assert m.estado is Estado.PAUSADO


def test_pausar_ja_pausado_retorna_none() -> None:
    m = _em(Estado.PAUSADO)
    assert m.pausar() is None


def test_aplicar_ignorado_enquanto_pausado() -> None:
    m = _em(Estado.PAUSADO)
    for r in (OK, LENTO, FALHA):
        assert m.aplicar(r) is None
        assert m.estado is Estado.PAUSADO


def test_retomar_vai_para_desconhecido() -> None:
    m = _em(Estado.PAUSADO)
    assert m.retomar() == Transicao(Estado.PAUSADO, Estado.DESCONHECIDO)
    assert m.estado is Estado.DESCONHECIDO


def test_retomar_sem_estar_pausado_retorna_none() -> None:
    m = _em(Estado.ONLINE)
    assert m.retomar() is None
    assert m.estado is Estado.ONLINE


def test_retomar_zera_contadores() -> None:
    m = _em(Estado.ONLINE)
    m.aplicar(FALHA)
    m.aplicar(FALHA)
    m.pausar()
    m.retomar()
    m.aplicar(OK)  # online
    m.aplicar(FALHA)
    assert m.aplicar(FALHA) is None  # só 2 falhas: segue suspeito
    assert m.estado is Estado.SUSPEITO


def test_precisa_confirmar_somente_em_suspeito() -> None:
    for e in Estado:
        assert _em(e).precisa_confirmar is (e is Estado.SUSPEITO)
