import asyncio

from sentinela.barramento import Barramento, Mensagem


async def test_barramento_entrega_a_todos() -> None:
    bar = Barramento()
    async with bar.assinar() as a, bar.assinar() as b:
        bar.publicar(Mensagem("estado", {"id": 1}))
        bar.publicar(Mensagem("estado", {"id": 2}))
        ma = [m.dados["id"] async for m in _pegar(a, 2)]
        mb = [m.dados["id"] async for m in _pegar(b, 2)]
    assert ma == [1, 2] and mb == [1, 2]


async def test_assinante_removido_ao_sair() -> None:
    bar = Barramento()
    async with bar.assinar():
        assert bar.total_assinantes == 1
    assert bar.total_assinantes == 0
    bar.publicar(Mensagem("x", {}))  # sem assinantes: não falha


async def test_assinante_lento_nao_trava_publicador() -> None:
    bar = Barramento(tamanho_fila=1000)
    async with bar.assinar() as fluxo:
        for i in range(1005):
            bar.publicar(Mensagem("n", {"i": i}))  # nunca bloqueia
        primeiro = await asyncio.wait_for(anext(fluxo), 1)
    assert primeiro.dados["i"] == 5  # as 5 mais antigas foram descartadas


async def _pegar(fluxo, n: int):  # type: ignore[no-untyped-def]
    for _ in range(n):
        yield await asyncio.wait_for(anext(fluxo), 1)
