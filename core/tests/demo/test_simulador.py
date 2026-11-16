import ast
import subprocess
import sys
import textwrap
from collections import Counter
from ipaddress import IPv4Address, IPv4Network
from pathlib import Path

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

import sentinela.demo.simulador as simulador
from sentinela.config import Settings
from sentinela.db.modelos import Equipamento, SubRede, Usuario
from sentinela.demo.simulador import ChecagemSimulada, gerar_rede
from sentinela.main import criar_app
from sentinela.rede.guarda import DestinoAutorizado, Guarda
from sentinela.relogio import RelogioFalso
from sentinela.seguranca.senhas import gerar_hash
from tests.conftest import SENHA_TESTE, criar_esquema

REDE_DEMO = IPv4Network("10.99.0.0/16")
SUB_REDES = [IPv4Network(f"10.99.{n}.0/24") for n in (10, 20, 30, 40, 50, 60)]


def test_gerar_rede_e_deterministica() -> None:
    assert gerar_rede(seed=7) == gerar_rede(seed=7)
    assert gerar_rede(seed=7) != gerar_rede(seed=8)


def test_gerar_rede_distribuicao_exata() -> None:
    rede = gerar_rede()
    assert len(rede) == 300
    c = Counter(e.classe for e in rede)
    assert c["camera"] == 120
    assert c["gravador"] == 8
    assert c["wifi"] == 30
    assert c["controle_acesso"] == 12
    assert c["switch"] == 10
    assert c["roteador"] == 2
    assert sum(c[s] for s in ("servidor", "computador", "impressora", "iot")) == 118
    assert all(c[s] > 0 for s in ("servidor", "computador", "impressora", "iot"))


def test_gerar_rede_ips_macs_e_nomes() -> None:
    rede = gerar_rede()
    assert len({e.ip for e in rede}) == 300
    por_subrede: dict[IPv4Network, set[str]] = {s: set() for s in SUB_REDES}
    for e in rede:
        ip = IPv4Address(e.ip)
        assert ip in REDE_DEMO
        sub = next(s for s in SUB_REDES if ip in s)
        assert ip not in (sub.network_address, sub.broadcast_address)
        por_subrede[sub].add(e.classe)
    assert por_subrede[SUB_REDES[0]] == {"camera"}
    assert por_subrede[SUB_REDES[1]] == {"wifi"}
    assert por_subrede[SUB_REDES[2]] == {"controle_acesso"}
    assert por_subrede[SUB_REDES[3]] == {"switch", "roteador"}
    assert por_subrede[SUB_REDES[4]] == {"gravador"}
    macs = [e.mac for e in rede]
    assert len(set(macs)) == 300
    assert all(m.startswith("02:00:00:") and len(m) == 17 for m in macs)
    assert len({e.nome for e in rede}) == 300
    assert any(e.nome.startswith("Câmera ") for e in rede)


def test_gerar_rede_checagens_validas_na_guarda() -> None:
    guarda = Guarda(SUB_REDES)
    for e in gerar_rede():
        guarda.validar(e.ip, e.porta, e.checagem)  # type: ignore[arg-type]


def _destino(ip: str) -> DestinoAutorizado:
    return Guarda(SUB_REDES).validar(ip, None, "icmp")


async def test_ok_com_latencia_e_taxa_de_97_por_cento() -> None:
    relogio = RelogioFalso()
    rede = gerar_rede()
    sim = ChecagemSimulada(seed=1, relogio=relogio, rede=rede)
    destinos = [_destino(e.ip) for e in rede]
    total = oks = 0
    for _ in range(40):
        for d in destinos:
            r = await sim.executar(d)
            total += 1
            if r.ok:
                oks += 1
                assert r.latencia_ms is not None
                assert 1 <= r.latencia_ms <= 30
            else:
                assert r.latencia_ms is None
        await relogio.avancar(15)
    assert 0.94 < oks / total < 0.995


async def test_queda_individual_dura_de_1_a_5_minutos() -> None:
    relogio = RelogioFalso()
    sim = ChecagemSimulada(seed=3, relogio=relogio, rede=gerar_rede())
    d = _destino("10.99.60.10")
    inicio: float | None = None
    duracoes: list[float] = []
    for _ in range(200000):
        ok = (await sim.executar(d)).ok
        if not ok and inicio is None:
            inicio = relogio.agora()
        elif ok and inicio is not None:
            duracoes.append(relogio.agora() - inicio)
            inicio = None
            if len(duracoes) >= 3:
                break
        await relogio.avancar(1)
    assert len(duracoes) >= 3
    # quedas de switch também duram 1-5 min; podem emendar, então só o teto de uma é exato
    assert all(60 <= x <= 330 for x in duracoes[:1])
    assert all(x >= 59 for x in duracoes)


async def test_queda_de_switch_derruba_8_a_15_da_mesma_subrede() -> None:
    relogio = RelogioFalso()
    rede = gerar_rede()
    sim = ChecagemSimulada(seed=5, relogio=relogio, rede=rede)
    destinos = {e.ip: _destino(e.ip) for e in rede}
    await relogio.avancar(700)  # passa do primeiro ciclo de ~10 min
    caidos = [ip for ip, d in destinos.items() if not (await sim.executar(d)).ok]
    por_sub = Counter(ip.rsplit(".", 1)[0] for ip in caidos)
    n = por_sub.most_common(1)[0][1]
    assert 8 <= n <= 15


async def test_estado_em_memoria_limitado_ao_numero_de_equipamentos() -> None:
    relogio = RelogioFalso()
    rede = gerar_rede()
    sim = ChecagemSimulada(seed=9, relogio=relogio, rede=rede)
    destinos = [_destino(e.ip) for e in rede]
    maximo = 0
    for _ in range(200):
        for d in destinos:
            await sim.executar(d)
        maximo = max(maximo, sim.quedas_em_curso())
        await relogio.avancar(30)
    assert 0 < maximo <= len(rede)


async def test_executar_exige_destino_autorizado() -> None:
    sim = ChecagemSimulada(seed=1, relogio=RelogioFalso())
    with pytest.raises(TypeError):
        await sim.executar("10.99.10.10")  # type: ignore[arg-type]


def test_custo_e_um() -> None:
    assert ChecagemSimulada(seed=1).custo == 1


def test_modulo_nao_importa_rede() -> None:
    arvore = ast.parse(Path(simulador.__file__).read_text(encoding="utf-8"))
    raiz: set[str] = set()
    for no in ast.walk(arvore):
        if isinstance(no, ast.Import):
            raiz |= {a.name.split(".")[0] for a in no.names}
        elif isinstance(no, ast.ImportFrom) and no.module:
            raiz.add(no.module.split(".")[0])
    assert not raiz & {"socket", "icmplib", "httpx", "ssl", "urllib", "http", "requests"}


def test_nunca_abre_socket_em_subprocesso() -> None:
    codigo = textwrap.dedent(
        """
        import asyncio, socket
        from ipaddress import IPv4Network
        import sentinela.demo.simulador as sim
        from sentinela.rede.guarda import Guarda

        def proibido(*a, **k):
            raise AssertionError("socket aberto")

        loop = asyncio.new_event_loop()  # o laço do Windows usa socketpair ao nascer
        socket.socket = proibido

        async def main():
            guarda = Guarda([IPv4Network("10.99.10.0/24")])
            c = sim.ChecagemSimulada(seed=1)
            for i in range(10, 20):
                r = await c.executar(guarda.validar(f"10.99.10.{i}", None, "icmp"))
                assert r.ok or r.erro
        loop.run_until_complete(main())
        print("ok")
        """
    )
    r = subprocess.run(  # noqa: S603
        [sys.executable, "-c", codigo],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert r.returncode == 0, r.stderr
    assert r.stdout.strip() == "ok"


@pytest.fixture
def settings_demo(settings: Settings) -> Settings:
    return settings.model_copy(update={"demo": True})


async def test_app_demo_semeia_300_equipamentos(settings_demo: Settings) -> None:
    app = criar_app(settings_demo, relogio=RelogioFalso(), iniciar_monitor=False)
    await criar_esquema(settings_demo.banco_url)
    async with app.router.lifespan_context(app):
        sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
        async with sessoes() as db:
            assert await db.scalar(select(func.count()).select_from(Equipamento)) == 300
            cidrs = set((await db.execute(select(SubRede.cidr))).scalars())
        assert cidrs == {str(s) for s in SUB_REDES}
        app.state.guarda.validar("10.99.10.10", None, "icmp")


async def test_semeadura_idempotente(settings_demo: Settings) -> None:
    await criar_esquema(settings_demo.banco_url)
    for _ in range(2):
        app = criar_app(settings_demo, relogio=RelogioFalso(), iniciar_monitor=False)
        async with app.router.lifespan_context(app):
            sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
            async with sessoes() as db:
                assert await db.scalar(select(func.count()).select_from(Equipamento)) == 300
                assert await db.scalar(select(func.count()).select_from(SubRede)) == 6


async def test_api_equipamentos_total_300(settings_demo: Settings) -> None:
    app = criar_app(settings_demo, relogio=RelogioFalso(), iniciar_monitor=False)
    await criar_esquema(settings_demo.banco_url)
    async with app.router.lifespan_context(app):
        async with app.state.sessoes() as db:
            db.add(Usuario(login="demo-adm", hash_senha=gerar_hash(SENHA_TESTE), papel="admin"))
            await db.commit()
        transporte = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as c:
            r = await c.post("/api/v1/auth/login", json={"login": "demo-adm", "senha": SENHA_TESTE})
            assert r.status_code == 204
            r = await c.get("/api/v1/equipamentos", params={"limit": 5})
            assert r.status_code == 200
            assert r.json()["total"] == 300


async def test_demo_desligado_nao_semeia(settings: Settings) -> None:
    app = criar_app(settings, relogio=RelogioFalso(), iniciar_monitor=False)
    await criar_esquema(settings.banco_url)
    async with app.router.lifespan_context(app):
        async with app.state.sessoes() as db:
            assert await db.scalar(select(func.count()).select_from(Equipamento)) == 0
