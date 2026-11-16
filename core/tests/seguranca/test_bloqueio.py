import pytest

from sentinela.relogio import RelogioFalso
from sentinela.seguranca.bloqueio import BloqueioFantasma, LimitadorIP, duracao_bloqueio


@pytest.mark.parametrize(
    ("falhas", "esperado"),
    [(0, 0), (4, 0), (5, 60), (6, 120), (7, 240), (9, 960), (10, 1800), (50, 1800), (10**6, 1800)],
)
def test_duracao_bloqueio_dobra_ate_30_min(falhas: int, esperado: int) -> None:
    assert duracao_bloqueio(falhas) == esperado


async def test_limitador_ip_janela_deslizante() -> None:
    relogio = RelogioFalso()
    lim = LimitadorIP(relogio, max_falhas=3, janela_s=10)
    for _ in range(2):
        lim.registrar_falha("10.99.0.5")
    assert lim.restante("10.99.0.5") == 0
    await relogio.avancar(4)
    lim.registrar_falha("10.99.0.5")
    assert lim.restante("10.99.0.5") == pytest.approx(6)
    assert lim.restante("10.99.0.6") == 0
    await relogio.avancar(6)
    assert lim.restante("10.99.0.5") == 0


def test_limitador_ip_memoria_limitada() -> None:
    lim = LimitadorIP(RelogioFalso(), max_falhas=20, janela_s=600, max_chaves=3)
    for i in range(10):
        lim.registrar_falha(f"10.99.0.{i}")
    assert len(lim) <= 3


async def test_bloqueio_fantasma_segue_a_mesma_escala() -> None:
    relogio = RelogioFalso()
    fantasma = BloqueioFantasma(relogio)
    for _ in range(4):
        fantasma.registrar_falha("x")
    assert fantasma.restante("x") == 0
    fantasma.registrar_falha("x")
    assert fantasma.restante("x") == pytest.approx(60)
    await relogio.avancar(60)
    assert fantasma.restante("x") == 0
    fantasma.registrar_falha("x")
    assert fantasma.restante("x") == pytest.approx(120)


def test_bloqueio_fantasma_memoria_limitada() -> None:
    fantasma = BloqueioFantasma(RelogioFalso(), max_chaves=3)
    for i in range(10):
        fantasma.registrar_falha(f"login{i}")
    assert len(fantasma) <= 3
