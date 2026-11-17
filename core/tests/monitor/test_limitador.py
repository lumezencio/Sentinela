import asyncio
from collections.abc import Awaitable

import pytest

from sentinela.monitor.limitador import Limitador, Prioridade
from sentinela.relogio import RelogioFalso


async def correr[T](relogio: RelogioFalso, coro: Awaitable[T]) -> T:
    """Roda a corrotina avançando o relógio falso até o próximo prazo, sem dormir de verdade."""
    tarefa = asyncio.ensure_future(coro)
    while not tarefa.done():
        await asyncio.sleep(0)
        prazo = relogio.proximo_prazo()
        if prazo is not None and not tarefa.done():
            await relogio.avancar_ate(prazo)
    return await tarefa


async def test_respeita_taxa() -> None:
    relogio = RelogioFalso()
    lim = Limitador(20, relogio)

    async def tudo() -> None:
        await asyncio.gather(*(lim.adquirir() for _ in range(200)))

    await correr(relogio, tudo())
    assert relogio.agora() >= 9.0 - 1e-6
    assert relogio.agora() < 9.5


async def test_custo_http_3() -> None:
    relogio = RelogioFalso()
    lim = Limitador(10, relogio)
    await lim.adquirir(10)  # esvazia o balde

    async def http() -> None:
        await lim.adquirir(3)

    await correr(relogio, http())
    assert relogio.agora() == pytest.approx(0.3)


async def test_custo_maior_que_capacidade_levanta() -> None:
    lim = Limitador(5, RelogioFalso())
    with pytest.raises(ValueError):
        await lim.adquirir(6)


async def test_prioritario_fura_fila() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)  # esvazia (capacidade mínima 3)
    ordem: list[str] = []

    async def pegar(nome: str, prioritario: bool) -> None:
        await lim.adquirir(prioritario=prioritario)
        ordem.append(nome)

    async def cenario() -> None:
        t1 = asyncio.create_task(pegar("normal1", False))
        await asyncio.sleep(0)
        t2 = asyncio.create_task(pegar("normal2", False))
        await asyncio.sleep(0)
        t3 = asyncio.create_task(pegar("prio", True))
        await asyncio.gather(t1, t2, t3)

    await correr(relogio, cenario())
    assert ordem == ["prio", "normal1", "normal2"]


async def test_definir_taxa_em_execucao() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)  # esvazia; próximo token em 1 s

    async def cenario() -> None:
        t = asyncio.create_task(lim.adquirir())
        await asyncio.sleep(0)
        lim.definir_taxa(10)  # acelera: deve liberar em ~0,1 s e não em 1 s
        await t

    await correr(relogio, cenario())
    assert relogio.agora() == pytest.approx(0.1)


async def test_taxa_exposta_para_leitura() -> None:
    lim = Limitador(20, RelogioFalso())
    assert lim.taxa == 20
    lim.definir_taxa(35)
    assert lim.taxa == 35


async def test_taxa_invalida() -> None:
    with pytest.raises(ValueError):
        Limitador(0, RelogioFalso())


async def test_baixar_taxa_nao_trava_fila() -> None:
    relogio = RelogioFalso()
    lim = Limitador(10, relogio)
    await lim.adquirir(10)
    feitos: list[str] = []

    async def pegar(nome: str, custo: int) -> None:
        await lim.adquirir(custo)
        feitos.append(nome)

    async def cenario() -> None:
        t1 = asyncio.create_task(pegar("http", 3))
        await asyncio.sleep(0)
        lim.definir_taxa(1)  # capacidade continua >= 3
        t2 = asyncio.create_task(pegar("icmp", 1))
        await asyncio.gather(t1, t2)

    await correr(relogio, cenario())
    assert feitos == ["http", "icmp"]


async def test_cabeca_acima_da_capacidade_falha_sem_travar() -> None:
    relogio = RelogioFalso()
    lim = Limitador(5, relogio, capacidade=5)
    await lim.adquirir(5)
    t_forte = asyncio.create_task(lim.adquirir(3))
    await asyncio.sleep(0)
    lim._fila[0].custo = 99  # noqa: SLF001
    t_ok = asyncio.create_task(lim.adquirir(1))
    lim.definir_taxa(1)
    await correr(relogio, asyncio.wait([t_forte, t_ok]))
    with pytest.raises(ValueError):
        t_forte.result()
    assert t_ok.exception() is None


async def test_cancelar_cabeca_serve_proximo_sem_vazar_token() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)

    async def cenario() -> None:
        cabeca = asyncio.create_task(lim.adquirir())
        await asyncio.sleep(0)
        proximo = asyncio.create_task(lim.adquirir())
        await asyncio.sleep(0)
        cabeca.cancel()
        await proximo

    await correr(relogio, cenario())
    assert relogio.agora() == pytest.approx(1.0)  # o proximo pagou um token inteiro, sem sobra


# ---- prioridade baixa (descoberta, §9.6) -----------------------------------


async def test_baixa_espera_normal_e_alta() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)  # esvazia (capacidade mínima 3)
    ordem: list[str] = []

    async def pegar(nome: str, prioridade: Prioridade) -> None:
        await lim.adquirir(prioridade=prioridade)
        ordem.append(nome)

    async def cenario() -> None:
        tarefas = []
        for nome, p in [
            ("baixa1", "baixa"),
            ("normal1", "normal"),
            ("baixa2", "baixa"),
            ("alta", "alta"),
            ("normal2", "normal"),
        ]:
            tarefas.append(asyncio.create_task(pegar(nome, p)))  # type: ignore[arg-type]
            await asyncio.sleep(0)
        await asyncio.gather(*tarefas)

    await correr(relogio, cenario())
    assert ordem == ["alta", "normal1", "normal2", "baixa1", "baixa2"]


async def test_baixa_na_cabeca_cede_a_normal_que_chega() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)
    ordem: list[str] = []

    async def pegar(nome: str, prioridade: Prioridade) -> None:
        await lim.adquirir(prioridade=prioridade)
        ordem.append(nome)

    baixa = asyncio.create_task(pegar("baixa", "baixa"))
    await relogio.avancar_ate(0.5)  # a baixa já espera ficha na cabeça da fila
    assert ordem == []
    normal = asyncio.create_task(pegar("normal", "normal"))
    await correr(relogio, asyncio.gather(baixa, normal))
    assert ordem == ["normal", "baixa"]


async def test_baixa_nao_passa_do_teto() -> None:
    relogio = RelogioFalso()
    lim = Limitador(20, relogio)
    servidos: list[float] = []

    async def pegar(prioridade: Prioridade) -> None:
        await lim.adquirir(prioridade=prioridade)
        servidos.append(relogio.agora())

    async def cenario() -> None:
        tarefas = [asyncio.create_task(pegar("baixa")) for _ in range(400)]
        tarefas += [asyncio.create_task(pegar("normal")) for _ in range(100)]
        tarefas += [asyncio.create_task(pegar("alta")) for _ in range(50)]
        await asyncio.gather(*tarefas)

    tarefa = asyncio.ensure_future(cenario())
    while not tarefa.done() and relogio.agora() < 10.0:
        await asyncio.sleep(0)
        prazo = relogio.proximo_prazo()
        if prazo is not None and not tarefa.done():
            await relogio.avancar_ate(min(prazo, 10.0))
    tarefa.cancel()
    with pytest.raises(asyncio.CancelledError):
        await tarefa
    em_10s = [t for t in servidos if t <= 10.0]
    assert len(em_10s) <= 20 * 10 + lim.capacidade
    assert len(em_10s) >= 20 * 10  # o orçamento é usado


async def test_prioritario_true_continua_alta() -> None:
    relogio = RelogioFalso()
    lim = Limitador(1, relogio)
    await lim.adquirir(3)
    ordem: list[str] = []

    async def pegar(nome: str, **kw: object) -> None:
        await lim.adquirir(**kw)  # type: ignore[arg-type]
        ordem.append(nome)

    async def cenario() -> None:
        t1 = asyncio.create_task(pegar("normal", prioridade="normal"))
        await asyncio.sleep(0)
        t2 = asyncio.create_task(pegar("alta", prioridade="alta"))
        await asyncio.sleep(0)
        t3 = asyncio.create_task(pegar("legado", prioritario=True))
        await asyncio.gather(t1, t2, t3)

    await correr(relogio, cenario())
    assert ordem == ["alta", "legado", "normal"]


async def test_prioridade_e_prioritario_juntos_levanta() -> None:
    lim = Limitador(5, RelogioFalso())
    with pytest.raises(ValueError):
        await lim.adquirir(prioritario=True, prioridade="baixa")


async def test_prioridade_invalida_levanta() -> None:
    lim = Limitador(5, RelogioFalso())
    with pytest.raises(ValueError):
        await lim.adquirir(prioridade="urgente")  # type: ignore[arg-type]
