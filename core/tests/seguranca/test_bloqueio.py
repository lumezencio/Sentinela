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


async def test_limitador_ip_reserva_e_libera() -> None:
    relogio = RelogioFalso()
    lim = LimitadorIP(relogio, max_falhas=2, janela_s=10)
    assert lim.reservar("10.99.0.5") == 0  # reservou (conta como tentativa)
    assert lim.reservar("10.99.0.5") == 0
    assert lim.reservar("10.99.0.5") == pytest.approx(10)  # sem cota: não reserva
    lim.liberar("10.99.0.5")  # a tentativa deu certo: devolve a cota
    assert lim.restante("10.99.0.5") == 0
    lim.liberar("10.99.0.9")  # IP sem registro: não falha


async def test_bloqueio_fantasma_reserva() -> None:
    fantasma = BloqueioFantasma(RelogioFalso())
    esperas = [fantasma.reservar("x") for _ in range(7)]
    assert esperas[:5] == [0, 0, 0, 0, 0]
    assert esperas[5] == pytest.approx(60)
    assert esperas[6] == pytest.approx(60)  # bloqueado não acumula falha


def test_fantasma_limpar_zera_a_chave_e_limitador_reinicia() -> None:
    b = BloqueioFantasma(RelogioFalso())
    for _ in range(5):
        b.reservar("k")
    assert b.restante("k") > 0
    b.limpar("k")
    assert b.restante("k") == 0 and len(b) == 0
    b.limpar("nunca-vista")  # sem efeito
    lim = LimitadorIP(RelogioFalso())
    lim.registrar_falha("10.99.0.5")
    assert lim.contagem("10.99.0.5") == 1
    lim.reiniciar()
    assert len(lim) == 0
