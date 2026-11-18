from sentinela.monitor.estados import (
    CAUSA_PAI,
    Estado,
    MaquinaEstados,
    ResultadoChecagem,
    Transicao,
    causa_pai,
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
        "inalcancavel",
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


# ---- desconhecido forçado (sem leitura do gravador, §9.7) --------------------

CAUSA_GRAVADOR = "sem leitura do gravador"


def test_forcar_desconhecido_de_online_gera_transicao_com_causa() -> None:
    m = _em(Estado.ONLINE)
    t = m.forcar_desconhecido(CAUSA_GRAVADOR)
    assert t == Transicao(Estado.ONLINE, Estado.DESCONHECIDO, causa=CAUSA_GRAVADOR)
    assert t is not None and t.causa == CAUSA_GRAVADOR
    assert m.estado is Estado.DESCONHECIDO


def test_forcar_desconhecido_de_cada_estado_ativo() -> None:
    for e in (Estado.ONLINE, Estado.INSTAVEL, Estado.SUSPEITO, Estado.OFFLINE):
        m = _em(e)
        t = m.forcar_desconhecido(CAUSA_GRAVADOR)
        assert t is not None and (t.de, t.para) == (e, Estado.DESCONHECIDO)


def test_forcar_desconhecido_ja_desconhecido_retorna_none() -> None:
    m = _em(Estado.DESCONHECIDO)
    assert m.forcar_desconhecido(CAUSA_GRAVADOR) is None
    assert m.estado is Estado.DESCONHECIDO


def test_forcar_desconhecido_nao_tira_da_pausa() -> None:
    m = _em(Estado.PAUSADO)
    assert m.forcar_desconhecido(CAUSA_GRAVADOR) is None
    assert m.estado is Estado.PAUSADO


def test_depois_de_forcado_ok_vai_online_pela_histerese_normal() -> None:
    m = _em(Estado.OFFLINE)
    m.aplicar(OK)  # 1 de 2 oks para sair de offline: contador não pode sobreviver
    m.forcar_desconhecido(CAUSA_GRAVADOR)
    assert m.aplicar(OK) == Transicao(Estado.DESCONHECIDO, Estado.ONLINE)


def test_forcar_desconhecido_zera_contadores_de_falha() -> None:
    m = _em(Estado.ONLINE)
    m.aplicar(FALHA)
    m.aplicar(FALHA)  # suspeito com 2 falhas
    m.forcar_desconhecido(CAUSA_GRAVADOR)
    assert m.aplicar(FALHA) == Transicao(Estado.DESCONHECIDO, Estado.SUSPEITO)
    assert m.aplicar(FALHA) is None  # recomeça a contagem: 2 de 3
    assert m.estado is Estado.SUSPEITO


# ---- inalcançável (correlação pelo pai, Fase 4 §5.1) ---------------------------------------


def test_causa_pai() -> None:
    assert CAUSA_PAI == "pai:"
    assert causa_pai("sw1") == "pai:sw1"


def test_marcar_inalcancavel_de_offline_com_causa() -> None:
    m = _em(Estado.OFFLINE)
    t = m.marcar_inalcancavel(causa_pai("sw1"))
    assert t == Transicao(Estado.OFFLINE, Estado.INALCANCAVEL, causa="pai:sw1")
    assert m.estado is Estado.INALCANCAVEL


def test_marcar_inalcancavel_de_cada_estado_ativo() -> None:
    for e in (Estado.DESCONHECIDO, Estado.ONLINE, Estado.INSTAVEL, Estado.SUSPEITO):
        t = _em(e).marcar_inalcancavel("pai:x")
        assert t is not None and (t.de, t.para) == (e, Estado.INALCANCAVEL)


def test_marcar_inalcancavel_ja_inalcancavel_retorna_none() -> None:
    assert _em(Estado.INALCANCAVEL).marcar_inalcancavel("pai:x") is None


def test_inalcancavel_falha_nao_transita() -> None:
    m = _em(Estado.INALCANCAVEL)
    for _ in range(5):
        assert m.aplicar(FALHA) is None
    assert m.estado is Estado.INALCANCAVEL
    assert not m.precisa_confirmar


def test_inalcancavel_dois_oks_vai_online() -> None:
    m = _em(Estado.INALCANCAVEL)
    assert m.aplicar(OK) is None
    assert m.aplicar(OK) == Transicao(Estado.INALCANCAVEL, Estado.ONLINE)


def test_inalcancavel_dois_oks_lentos_vai_instavel() -> None:
    m = _em(Estado.INALCANCAVEL)
    m.aplicar(LENTO)
    assert m.aplicar(LENTO) == Transicao(Estado.INALCANCAVEL, Estado.INSTAVEL)


def test_marcar_inalcancavel_zera_contadores() -> None:
    m = _em(Estado.OFFLINE)
    m.aplicar(OK)  # 1 de 2 oks: não pode sobreviver à marcação
    m.marcar_inalcancavel("pai:x")
    assert m.aplicar(OK) is None
    assert m.aplicar(OK) == Transicao(Estado.INALCANCAVEL, Estado.ONLINE)


def test_liberar_inalcancavel_vai_desconhecido() -> None:
    m = _em(Estado.INALCANCAVEL)
    m.aplicar(OK)
    assert m.liberar_inalcancavel() == Transicao(Estado.INALCANCAVEL, Estado.DESCONHECIDO)
    assert m.estado is Estado.DESCONHECIDO
    # contadores zerados: uma falha leva a suspeito pela histerese normal
    assert m.aplicar(FALHA) == Transicao(Estado.DESCONHECIDO, Estado.SUSPEITO)


def test_liberar_so_age_em_inalcancavel() -> None:
    for e in Estado:
        if e is not Estado.INALCANCAVEL:
            m = _em(e)
            assert m.liberar_inalcancavel() is None
            assert m.estado is e


def test_pausado_ignora_marcar_e_liberar() -> None:
    m = _em(Estado.PAUSADO)
    assert m.marcar_inalcancavel("pai:x") is None
    assert m.liberar_inalcancavel() is None
    assert m.estado is Estado.PAUSADO


def test_pausar_e_forcar_desconhecido_saem_de_inalcancavel() -> None:
    assert _em(Estado.INALCANCAVEL).pausar() == Transicao(Estado.INALCANCAVEL, Estado.PAUSADO)
    t = _em(Estado.INALCANCAVEL).forcar_desconhecido("x")
    assert t is not None and t.para is Estado.DESCONHECIDO
