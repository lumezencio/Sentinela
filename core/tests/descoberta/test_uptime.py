"""Tempo ligado: leitura do MikroTik, detecção de reinício e volta do contador TimeTicks."""

from datetime import UTC, datetime, timedelta

from sentinela.descoberta.uptime import (
    TETO_TIMETICKS_S,
    TOLERANCIA_S,
    Leitura,
    ler_uptime_mikrotik,
    reinicios,
)

T0 = datetime(2026, 11, 1, 12, 0, tzinfo=UTC)


def test_ler_uptime_mikrotik() -> None:
    assert ler_uptime_mikrotik("1w2d3h4m5s") == 788645
    assert ler_uptime_mikrotik("45s") == 45
    assert ler_uptime_mikrotik("3d12h") == 3 * 86400 + 12 * 3600
    assert ler_uptime_mikrotik("") is None
    assert ler_uptime_mikrotik("abc") is None
    assert ler_uptime_mikrotik("12x") is None


def test_leituras_continuas_sem_reinicio() -> None:
    leituras = [Leitura(T0 + timedelta(minutes=10 * i), 5000.0 + 600 * i) for i in range(6)]
    assert reinicios(leituras) == []


def test_reinicio_detectado_quando_o_boot_avanca() -> None:
    leituras = [
        Leitura(T0, 90_000.0),
        Leitura(T0 + timedelta(minutes=10), 90_600.0),
        Leitura(T0 + timedelta(minutes=20), 300.0),  # voltou a zero há 5 min
        Leitura(T0 + timedelta(minutes=30), 900.0),
    ]
    achados = reinicios(leituras)
    assert achados == [T0 + timedelta(minutes=15)]


def test_desvio_de_relogio_pequeno_nao_e_reinicio() -> None:
    leituras = [
        Leitura(T0, 1000.0),
        Leitura(T0 + timedelta(minutes=10), 1000.0 + 600 + TOLERANCIA_S - 10),
        Leitura(T0 + timedelta(minutes=20), 1000.0 + 1200 + 100),
    ]
    assert reinicios(leituras) == []


def test_salto_do_relogio_para_frente_nao_e_reinicio() -> None:
    # NTP acertou o relógio do servidor em +2 h; o uptime do roteador seguiu normal
    leituras = [
        Leitura(T0, 1000.0),
        Leitura(T0 + timedelta(minutes=10, hours=2), 1600.0),
        Leitura(T0 + timedelta(minutes=20, hours=2), 2200.0),
    ]
    assert reinicios(leituras) == []


def test_salto_do_relogio_para_tras_nao_e_reinicio() -> None:
    # o relógio do servidor recuou 1 h entre as leituras: o roteador contou 1 h a mais do que
    # o relógio decorrido; uptime cresceu, logo não é reinício
    leituras = [
        Leitura(T0, 1000.0),
        Leitura(T0 + timedelta(minutes=5), 1000.0 + 3600 + 300),
        Leitura(T0 + timedelta(minutes=15), 1000.0 + 3600 + 900),
    ]
    assert reinicios(leituras) == []


def test_dois_reinicios_entre_leituras_contam_como_um() -> None:
    leituras = [
        Leitura(T0, 50_000.0),
        Leitura(T0 + timedelta(minutes=30), 200.0),  # reiniciou duas vezes; só o último aparece
    ]
    assert len(reinicios(leituras)) == 1


def test_leituras_no_mesmo_instante() -> None:
    leituras = [Leitura(T0, 500.0), Leitura(T0, 500.0)]
    assert reinicios(leituras) == []


def test_lista_curta_e_reinicio_em_ordem_de_insercao() -> None:
    assert reinicios([]) == []
    assert reinicios([Leitura(T0, 10.0)]) == []
    leituras = [Leitura(T0, 5000.0), Leitura(T0 + timedelta(minutes=10), 100.0)]
    assert reinicios(leituras) == [T0 + timedelta(minutes=10) - timedelta(seconds=100)]


def test_recuo_do_relogio_nao_reordena_as_leituras() -> None:
    # a 2ª leitura foi inserida depois mas tem lido_em anterior (relógio recuou 1 h); o uptime
    # só cresce: ordenar por lido_em a transformaria num reinício falso
    leituras = [
        Leitura(T0, 1000.0),
        Leitura(T0 - timedelta(hours=1), 1600.0),
        Leitura(T0 - timedelta(minutes=50), 2200.0),
    ]
    assert reinicios(leituras) == []


def test_volta_do_timeticks_nao_e_reinicio() -> None:
    antes = TETO_TIMETICKS_S - 300  # a 5 min de dar a volta
    leituras = [
        Leitura(T0, antes),
        Leitura(T0 + timedelta(minutes=10), 300.0),  # 600 s depois: 300 s acima da volta
        Leitura(T0 + timedelta(minutes=20), 900.0),
    ]
    assert reinicios(leituras) == []


def test_reinicio_logo_apos_a_volta_continua_sendo_reinicio() -> None:
    antes = TETO_TIMETICKS_S - 300
    leituras = [
        Leitura(T0, antes),
        Leitura(T0 + timedelta(minutes=10), 300.0),
        Leitura(T0 + timedelta(minutes=20), 20.0),  # reiniciou de verdade
    ]
    assert len(reinicios(leituras)) == 1
