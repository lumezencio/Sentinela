from datetime import UTC, datetime, timedelta

from sentinela.diagnostico.incidentes import JANELA_S, Queda, agrupar, quedas_de

T0 = datetime(2026, 11, 18, 19, 0, tzinfo=UTC)


def _s(n: float) -> datetime:
    return T0 + timedelta(seconds=n)


def _q(eid: str, ini: float, fim: float | None) -> Queda:
    return Queda(eid, _s(ini), None if fim is None else _s(fim), None)


def test_queda_ate_30s_do_inicio_e_o_mesmo_incidente_e_31s_e_outro() -> None:
    incidentes = agrupar([_q("a", 0, 100), _q("b", JANELA_S, 100), _q("c", JANELA_S + 1, 100)])
    assert [len(i.quedas) for i in incidentes] == [2, 1]
    # a janela conta do INÍCIO do incidente, não da última queda: nada de encadeamento
    encadeado = agrupar([_q("a", 0, 100), _q("b", 25, 100), _q("c", 50, 100)])
    assert [len(i.quedas) for i in encadeado] == [2, 1]
    assert encadeado[0].inicio == _s(0) and encadeado[0].fim == _s(100)


def test_queda_aberta_tem_fim_nulo() -> None:
    (inc,) = agrupar([_q("a", 0, 60), _q("b", 5, None)])
    assert inc.fim is None
    assert inc.duracao_s(_s(300)) == 300


def test_inalcancavel_conta_como_queda() -> None:
    eventos = [
        ("a", "online", "inalcancavel", _s(0), "pai:p"),
        ("a", "inalcancavel", "desconhecido", _s(50), None),
    ]
    (q,) = quedas_de(eventos)
    assert (q.inicio, q.fim, q.causa) == (_s(0), _s(50), "pai:p")


def test_offline_e_depois_inalcancavel_e_uma_queda_so() -> None:
    eventos = [
        ("a", "suspeito", "offline", _s(0), None),
        ("a", "offline", "inalcancavel", _s(10), "pai:p"),
        ("a", "inalcancavel", "online", _s(90), None),
    ]
    (q,) = quedas_de(eventos)
    assert (q.inicio, q.fim, q.causa) == (_s(0), _s(90), "pai:p")


def test_pausa_encerra_a_queda() -> None:
    eventos = [
        ("a", "suspeito", "offline", _s(0), None),
        ("a", "offline", "pausado", _s(40), "manual"),
        ("a", "pausado", "offline", _s(100), None),  # vindo de pausado: nova queda
    ]
    quedas = quedas_de(eventos)
    assert [(q.inicio, q.fim) for q in quedas] == [(_s(0), _s(40)), (_s(100), None)]


def test_transicao_para_queda_vinda_de_fora_da_janela_e_ignorada() -> None:
    eventos = [
        ("a", "offline", "inalcancavel", _s(0), "pai:p"),
        ("a", "inalcancavel", "online", _s(9), None),
    ]
    assert quedas_de(eventos) == []
