from datetime import UTC, datetime, timedelta
from typing import Any

from sentinela.diagnostico.classificacao import Contexto, classificar
from sentinela.diagnostico.incidentes import Incidente, Queda, agrupar

T0 = datetime(2026, 11, 18, 19, 0, tzinfo=UTC)
MEMBROS = frozenset(f"m{i}" for i in range(10))


def _s(n: float) -> datetime:
    return T0 + timedelta(seconds=n)


def _q(eid: str, ini: float, fim: float | None, causa: str | None = None) -> Queda:
    return Queda(eid, _s(ini), None if fim is None else _s(fim), causa)


def _inc(*quedas: Queda) -> Incidente:
    (inc,) = agrupar(list(quedas))
    return inc


def _ctx(**kw: Any) -> Contexto:
    base: dict[str, Any] = {
        "gateways": {"g": MEMBROS},
        "reinicios": {},
        "leituras": {},
        "inicios": {},
        "nomes": {"g": "Roteador", "p": "Gravador"},
    }
    return Contexto(**(base | kw))


def _roteador(duracao: float = 90, voltam: int = 10, quedas_membros: int = 10) -> Incidente:
    membros = [
        _q(f"m{i}", 2 + i, duracao + 5 + i if i < voltam else duracao + 600)
        for i in range(quedas_membros)
    ]
    return _inc(_q("g", 0, duracao), *membros)


def test_gateway_e_80_por_cento_voltam_em_90s_roteador_reiniciou_provavel() -> None:
    c = classificar(_roteador(), _ctx())
    assert (c.tipo, c.certeza) == ("roteador_reiniciou", "provavel")
    # 8 de 10 voltando junto basta; 7 não
    assert classificar(_roteador(voltam=8), _ctx()).tipo == "roteador_reiniciou"
    assert classificar(_roteador(voltam=7), _ctx()).tipo == "gateway_sem_reinicio"
    assert classificar(_roteador(quedas_membros=7), _ctx()).tipo == "gateway_sem_reinicio"


def test_mesmo_padrao_com_reinicio_no_uptime_vira_confirmado() -> None:
    ctx = _ctx(reinicios={"g": [_s(80)]}, leituras={"g": [_s(-600), _s(400)]})
    c = classificar(_roteador(), ctx)
    assert (c.tipo, c.certeza) == ("roteador_reiniciou", "confirmado")
    # o reinício confirma mesmo com padrão fora de 30-180 s e sem os de trás
    c2 = classificar(_inc(_q("g", 0, 20)), _ctx(reinicios={"g": [_s(15)]}))
    assert (c2.tipo, c2.certeza) == ("roteador_reiniciou", "confirmado")
    # reinício a mais de 120 s do incidente não é deste incidente
    c3 = classificar(_inc(_q("g", 0, 20)), _ctx(reinicios={"g": [_s(5000)]}))
    assert c3.certeza == "provavel"


def test_gateway_com_leituras_sem_reinicio_queda_sem_reinicio() -> None:
    ctx = _ctx(leituras={"g": [_s(-300), _s(300)]})
    c = classificar(_roteador(), ctx)
    assert (c.tipo, c.certeza) == ("gateway_sem_reinicio", "confirmado")


def test_gateway_fora_de_30_180s_sem_leitura_nao_e_reinicio() -> None:
    assert classificar(_roteador(duracao=20), _ctx()).tipo == "gateway_sem_reinicio"
    assert classificar(_roteador(duracao=181), _ctx()).tipo == "gateway_sem_reinicio"
    assert classificar(_roteador(duracao=30), _ctx()).tipo == "roteador_reiniciou"
    assert classificar(_roteador(duracao=180), _ctx()).tipo == "roteador_reiniciou"
    assert classificar(_roteador(duracao=20), _ctx()).certeza == "provavel"


def test_leitura_ausente_durante_o_incidente_nao_confirma() -> None:
    # só leitura antes (o roteador não respondeu depois), ou só depois: não confirma nada
    so_antes = classificar(_inc(_q("g", 0, 20)), _ctx(leituras={"g": [_s(-300)]}))
    so_depois = classificar(_inc(_q("g", 0, 20)), _ctx(leituras={"g": [_s(300)]}))
    # leitura no meio do incidente não vale como "antes" nem como "depois"
    no_meio = classificar(_inc(_q("g", 0, 20)), _ctx(leituras={"g": [_s(10)]}))
    for c in (so_antes, so_depois, no_meio):
        assert (c.tipo, c.certeza) == ("gateway_sem_reinicio", "provavel")


def test_filhos_inalcancaveis_pai_derrubou() -> None:
    inc = _inc(_q("p", 0, 100), _q("c1", 3, 100, "pai:p"), _q("c2", 4, 100, "pai:p"))
    c = classificar(inc, _ctx(gateways={}))
    assert (c.tipo, c.certeza) == ("pai_derrubou_filhos", "provavel")
    # pai fora do incidente: não vale
    inc2 = _inc(_q("c1", 3, 100, "pai:p"), _q("x", 4, 100))
    assert classificar(inc2, _ctx(gateways={})).tipo == "quedas_simultaneas"


def test_quatro_quedas_em_1h_instabilidade_e_tres_isolada() -> None:
    inc = _inc(_q("a", 1800, 1860))
    inicios4 = [_s(0), _s(600), _s(1200), _s(1800)]
    assert classificar(inc, _ctx(gateways={}, inicios={"a": inicios4})).tipo == "instabilidade"
    assert classificar(inc, _ctx(gateways={}, inicios={"a": inicios4[1:]})).tipo == "queda_isolada"
    antigos = [_s(-4000), _s(-3900), _s(-3800), _s(1800)]
    assert classificar(inc, _ctx(gateways={}, inicios={"a": antigos})).tipo == "queda_isolada"


def test_porque_nunca_vazio_e_provavel_sem_uptime() -> None:
    casos = [
        (_roteador(), _ctx()),
        (_roteador(), _ctx(reinicios={"g": [_s(80)]})),
        (_roteador(duracao=10), _ctx()),
        (_inc(_q("a", 0, 5)), _ctx(gateways={})),
        (_inc(_q("a", 0, 5), _q("b", 1, 9)), _ctx(gateways={})),
        (_inc(_q("p", 0, 100), _q("c", 3, 100, "pai:p")), _ctx(gateways={})),
        (_inc(_q("g", 0, None)), _ctx()),
    ]
    for inc, ctx in casos:
        c = classificar(inc, ctx)
        assert c.porque and all(t.strip() for t in c.porque)
        if not ctx.reinicios and not ctx.leituras:
            assert c.certeza == "provavel"
    assert classificar(_roteador(), _ctx()).porque[-1].startswith("Sem leitura do tempo ligado")
