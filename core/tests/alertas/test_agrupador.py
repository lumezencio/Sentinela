"""Agrupador: correlação pelo pai, janela de 30 s, caiu-e-voltou, instável, fonte e silêncios."""

import asyncio
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, cast

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

import sentinela.alertas.agrupador as agrupador_mod
from sentinela.alertas.agrupador import Agrupador
from sentinela.alertas.silencios import Silencios
from sentinela.barramento import Barramento, Mensagem
from sentinela.db.base import Base
from sentinela.db.modelos import Alerta, Classe, Equipamento, Fonte, Silencio
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.relogio import RelogioFalso

T0 = datetime(2026, 11, 18, 12, 0, tzinfo=UTC)


class BarramentoGravado(Barramento):
    def __init__(self) -> None:
        super().__init__()
        self.publicadas: list[Mensagem] = []

    def publicar(self, msg: Mensagem) -> None:
        self.publicadas.append(msg)
        super().publicar(msg)


@dataclass
class Parede:
    agora: datetime = T0

    def __call__(self) -> datetime:
        return self.agora


@dataclass
class Ctx:
    sessoes: async_sessionmaker[AsyncSession]
    barramento: BarramentoGravado
    relogio: RelogioFalso
    parede: Parede
    agrupador: Agrupador
    classes: dict[str, int] = field(default_factory=dict)

    def novo_agrupador(self) -> Agrupador:
        return _agrupador(self.sessoes, self.barramento, self.relogio, self.parede)

    def alertas_publicados(self) -> list[dict[str, Any]]:
        return [m.dados for m in self.barramento.publicadas if m.tipo == "alerta"]


def _agrupador(
    sessoes: async_sessionmaker[AsyncSession],
    barramento: Barramento,
    relogio: RelogioFalso,
    parede: Parede,
) -> Agrupador:
    # só ``cobertura`` é usada: o agendador não participa
    silencios = Silencios(sessoes, cast(Any, None), barramento, relogio, parede)
    return Agrupador(sessoes, barramento, silencios, relogio, parede)


@pytest.fixture
async def ctx(tmp_path: Path) -> AsyncIterator[Ctx]:
    motor = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'a.db'}")
    async with motor.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessoes = fabrica_sessao(motor)
    async with sessoes() as s:
        await semear_classes(s)
        classes = {c.slug: c.id for c in (await s.execute(select(Classe))).scalars()}
    barramento = BarramentoGravado()
    relogio = RelogioFalso()
    parede = Parede()
    c = Ctx(sessoes, barramento, relogio, parede, _agrupador(sessoes, barramento, relogio, parede))
    c.classes = classes
    yield c
    await motor.dispose()


_ips = iter(range(1, 250))


async def _eq(
    c: Ctx,
    id: str,
    classe: str = "switch",
    pai: str | None = None,
    pausado: bool = False,
    estado: str = "online",
    desde: datetime = T0,
) -> str:
    async with c.sessoes() as s:
        s.add(
            Equipamento(
                id=id,
                nome=f"Equip {id}",
                ip=f"10.99.0.{next(_ips)}",
                classe_id=c.classes[classe],
                pai_id=pai,
                pausado=pausado,
                estado=estado,
                estado_desde=desde,
                criado_em=T0,
            )
        )
        await s.commit()
    return id


def _msg(id: str, estado: str, seg: float, causa: str | None = None) -> Mensagem:
    dados: dict[str, Any] = {
        "id": id,
        "estado": estado,
        "desde": (T0 + timedelta(seconds=seg)).isoformat(),
    }
    if causa is not None:
        dados["causa"] = causa
    return Mensagem("estado", dados)


async def _enviar(c: Ctx, id: str, estado: str, seg: float, causa: str | None = None) -> None:
    c.parede.agora = T0 + timedelta(seconds=seg)
    await c.agrupador.processar(_msg(id, estado, seg, causa))


async def _alertas(c: Ctx) -> list[Alerta]:
    async with c.sessoes() as s:
        return list((await s.execute(select(Alerta).order_by(Alerta.id))).scalars())


async def _ate(c: Ctx, condicao: Callable[[list[Alerta]], bool]) -> None:
    """Espera o laço (que grava em outra thread do aiosqlite) chegar à condição."""
    for _ in range(200):
        if condicao(await _alertas(c)):
            return
        await asyncio.sleep(0.01)
    raise AssertionError("condição não atingida")


async def _alterar(c: Ctx, id: int, **campos: Any) -> None:
    async with c.sessoes() as s:
        a = await s.get(Alerta, id)
        assert a is not None
        for k, v in campos.items():
            setattr(a, k, v)
        await s.commit()


async def _silencio(c: Ctx, tipo: str = "silencio", eq: str | None = None) -> None:
    async with c.sessoes() as s:
        s.add(
            Silencio(
                tipo=tipo,
                alvo_tipo="equipamento",
                equipamento_id=eq,
                inicio=T0 - timedelta(hours=1),
                fim=T0 + timedelta(hours=4),
                pausados=[],
            )
        )
        await s.commit()


# ---- quedas ---------------------------------------------------------------------------------


async def test_queda_abre_alerta_na_hora(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    await _enviar(ctx, x, "offline", 0)
    [a] = await _alertas(ctx)
    assert a.tipo == "queda" and a.equipamento_id == x
    assert a.envio == "pendente" and not a.silenciado and a.fechado_em is None
    assert a.quedas == [x] and a.afetados == [] and a.aberto_em == T0
    assert ctx.alertas_publicados() == [{"acao": "aberto", "id": a.id, "abertos": 1}]


async def test_quedas_sem_pai_em_30s_viram_um_alerta(ctx: Ctx) -> None:
    ids = [await _eq(ctx, f"q{n}") for n in range(5)]
    for n, eid in enumerate(ids):
        await _enviar(ctx, eid, "offline", n * 5)  # 0, 5, 10, 15, 20 s
    [a] = await _alertas(ctx)
    assert a.equipamento_id == ids[0]
    assert a.quedas == ids and a.afetados == ids[1:]
    acoes = [m["acao"] for m in ctx.alertas_publicados()]
    assert acoes == ["aberto"] + ["atualizado"] * 4


async def test_queda_31s_depois_abre_outro(ctx: Ctx) -> None:
    x, y = await _eq(ctx, "x"), await _eq(ctx, "y")
    await _enviar(ctx, x, "offline", 0)
    await _enviar(ctx, y, "offline", 31)
    a, b = await _alertas(ctx)
    assert a.quedas == [x] and b.quedas == [y]
    assert ctx.alertas_publicados()[-1]["abertos"] == 2


async def test_inalcancavel_anexa_ao_alerta_do_pai(ctx: Ctx) -> None:
    sw = await _eq(ctx, "sw")
    filhos = [await _eq(ctx, f"f{n:02d}", "camera", pai=sw) for n in range(14)]
    await _enviar(ctx, sw, "offline", 0)
    for f in filhos:
        await _enviar(ctx, f, "inalcancavel", 1, causa=f"pai:{sw}")
    [a] = await _alertas(ctx)
    assert a.equipamento_id == sw and a.quedas == [sw]
    assert sorted(a.afetados) == sorted(filhos) and len(a.afetados) == 14


async def test_filho_offline_antes_do_pai_e_absorvido(ctx: Ctx) -> None:
    pai = await _eq(ctx, "pai")
    c = await _eq(ctx, "c", "camera", pai=pai)
    await _enviar(ctx, c, "offline", 0)  # alerta próprio, ainda não enviado
    await _enviar(ctx, pai, "offline", 40)  # fora da janela de 30 s: outro alerta
    proprio, do_pai = await _alertas(ctx)
    await _enviar(ctx, c, "inalcancavel", 40, causa=f"pai:{pai}")
    [restante] = await _alertas(ctx)
    assert restante.id == do_pai.id and restante.afetados == [c]
    assert {"acao": "removido", "id": proprio.id, "abertos": 1} in ctx.alertas_publicados()


async def test_filho_absorvido_era_principal_do_grupo(ctx: Ctx) -> None:
    pai = await _eq(ctx, "pai")
    c = await _eq(ctx, "c", "camera", pai=pai)
    d = await _eq(ctx, "d")
    await _enviar(ctx, c, "offline", 0)
    await _enviar(ctx, d, "offline", 5)  # grupo [c, d]
    await _enviar(ctx, pai, "offline", 40)
    await _enviar(ctx, c, "inalcancavel", 40, causa=f"pai:{pai}")
    grupo, do_pai = await _alertas(ctx)
    assert grupo.equipamento_id == d and grupo.quedas == [d] and grupo.afetados == []
    assert do_pai.equipamento_id == pai and do_pai.afetados == [c]


async def test_filho_absorvido_quando_o_pai_entrou_no_mesmo_grupo(ctx: Ctx) -> None:
    pai = await _eq(ctx, "pai")
    c = await _eq(ctx, "c", "camera", pai=pai)
    await _enviar(ctx, c, "offline", 0)
    await _enviar(ctx, pai, "offline", 10)  # mesma janela: grupo [c, pai]
    await _enviar(ctx, c, "inalcancavel", 10, causa=f"pai:{pai}")
    [a] = await _alertas(ctx)
    assert a.equipamento_id == pai and a.quedas == [pai] and a.afetados == [c]


async def test_filho_ja_enviado_nao_e_retirado(ctx: Ctx) -> None:
    pai = await _eq(ctx, "pai")
    c = await _eq(ctx, "c", "camera", pai=pai)
    await _enviar(ctx, c, "offline", 0)
    [proprio] = await _alertas(ctx)
    await _alterar(ctx, proprio.id, envio="enviado")
    await _enviar(ctx, pai, "offline", 40)
    await _enviar(ctx, c, "inalcancavel", 40, causa=f"pai:{pai}")
    proprio, do_pai = await _alertas(ctx)
    assert proprio.quedas == [c] and proprio.fechado_em is None
    assert do_pai.afetados == [c]


async def test_inalcancavel_sem_alerta_do_pai_abre_com_pai_como_principal(ctx: Ctx) -> None:
    """Review Focus 4: gravador responde ao ping, mas a leitura de canais falha."""
    nvr = await _eq(ctx, "nvr", "gravador")
    cams = [await _eq(ctx, f"cam{n}", "camera", pai=nvr) for n in range(3)]
    for cam in cams:
        await _enviar(ctx, cam, "inalcancavel", 0, causa=f"pai:{nvr}")
    [a] = await _alertas(ctx)
    assert a.tipo == "queda" and a.equipamento_id == nvr
    assert a.quedas == [] and a.afetados == cams and a.envio == "pendente"
    # o gravador continua online: fecha quando todas as câmeras voltam
    await _enviar(ctx, cams[0], "desconhecido", 200)
    await _enviar(ctx, cams[0], "online", 205)
    await _enviar(ctx, cams[1], "online", 205)
    [a] = await _alertas(ctx)
    assert a.fechado_em is None and a.voltaram == cams[:2]
    await _enviar(ctx, cams[2], "online", 210)
    [a] = await _alertas(ctx)
    assert a.fechado_em == T0 + timedelta(seconds=210)


# ---- voltas ---------------------------------------------------------------------------------


async def test_caiu_e_voltou_antes_do_envio_fecha_breve(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    await _enviar(ctx, x, "offline", 0)
    await _enviar(ctx, x, "online", 100)
    [a] = await _alertas(ctx)
    assert a.breve and a.fechado_em == T0 + timedelta(seconds=100)
    assert a.envio == "pendente" and a.voltaram == [x]
    assert ctx.alertas_publicados()[-1] == {"acao": "fechado", "id": a.id, "abertos": 0}


async def test_volta_depois_de_enviado_cria_alerta_volta(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    await _enviar(ctx, x, "offline", 0)
    [queda] = await _alertas(ctx)
    await _alterar(ctx, queda.id, envio="enviado", telegram_msgs={"-1001": 7})
    await _enviar(ctx, x, "online", 300)
    queda, volta = await _alertas(ctx)
    assert queda.fechado_em == T0 + timedelta(seconds=300) and not queda.breve
    assert queda.envio == "enviado"
    assert volta.tipo == "volta" and volta.alerta_origem_id == queda.id
    assert volta.equipamento_id == x and volta.envio == "pendente"
    assert volta.fechado_em == T0 + timedelta(seconds=300)


async def test_breve_depois_do_envio_volta_a_pendente_para_edicao(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    await _enviar(ctx, x, "offline", 0)
    [queda] = await _alertas(ctx)
    await _alterar(ctx, queda.id, envio="enviado", telegram_msgs={"-1001": 7})
    await _enviar(ctx, x, "online", 90)
    [queda] = await _alertas(ctx)  # nenhum alerta ``volta``
    assert queda.breve and queda.fechado_em == T0 + timedelta(seconds=90)
    assert queda.envio == "pendente" and queda.telegram_msgs == {"-1001": 7}


async def test_grupo_fecha_quando_todos_voltam(ctx: Ctx) -> None:
    a_id, b_id = await _eq(ctx, "a"), await _eq(ctx, "b")
    filho = await _eq(ctx, "filho", "camera", pai=a_id)
    await _enviar(ctx, a_id, "offline", 0)
    await _enviar(ctx, b_id, "offline", 5)
    await _enviar(ctx, filho, "inalcancavel", 6, causa=f"pai:{a_id}")
    await _enviar(ctx, a_id, "online", 200)
    [g] = await _alertas(ctx)
    assert g.voltaram == [a_id] and g.fechado_em is None
    await _enviar(ctx, b_id, "instavel", 250)  # voltou, mesmo que lento
    [g] = await _alertas(ctx)
    # o filho ainda inalcançável não segura o fechamento
    assert g.voltaram == [a_id, b_id] and g.fechado_em == T0 + timedelta(seconds=250)


async def test_queda_de_novo_antes_do_grupo_fechar_reabre_a_espera(ctx: Ctx) -> None:
    a_id, b_id = await _eq(ctx, "a"), await _eq(ctx, "b")
    await _enviar(ctx, a_id, "offline", 0)
    await _enviar(ctx, b_id, "offline", 5)
    await _enviar(ctx, a_id, "online", 50)
    await _enviar(ctx, a_id, "offline", 60)
    [g] = await _alertas(ctx)
    assert g.voltaram == [] and g.quedas == [a_id, b_id]


# ---- instável -------------------------------------------------------------------------------


async def test_instavel_so_classe_critica_e_5_min(ctx: Ctx) -> None:
    pc = await _eq(ctx, "pc", "computador")
    cam = await _eq(ctx, "cam", "camera")
    await _enviar(ctx, pc, "instavel", 0)
    await _enviar(ctx, cam, "instavel", 0)
    ctx.parede.agora = T0 + timedelta(seconds=299)
    await ctx.agrupador.tick()
    assert await _alertas(ctx) == []
    ctx.parede.agora = T0 + timedelta(seconds=300)
    await ctx.agrupador.tick()
    ctx.parede.agora = T0 + timedelta(seconds=900)
    await ctx.agrupador.tick()  # não duplica
    [a] = await _alertas(ctx)
    assert a.tipo == "instavel" and a.equipamento_id == cam and a.aberto_em == T0
    assert a.envio == "pendente"


async def test_instavel_fecha_nao_enviado_vira_nao_aplica(ctx: Ctx) -> None:
    cam = await _eq(ctx, "cam", "camera")
    await _enviar(ctx, cam, "instavel", 0)
    await _enviar(ctx, cam, "suspeito", 100)  # oscilação não zera a contagem
    await _enviar(ctx, cam, "instavel", 110)
    ctx.parede.agora = T0 + timedelta(seconds=310)
    await ctx.agrupador.tick()
    await _enviar(ctx, cam, "online", 400)
    [a] = await _alertas(ctx)
    assert a.fechado_em == T0 + timedelta(seconds=400) and a.envio == "nao_aplica"
    ctx.parede.agora = T0 + timedelta(seconds=2000)
    await ctx.agrupador.tick()
    assert len(await _alertas(ctx)) == 1


# ---- fonte ----------------------------------------------------------------------------------


async def test_fonte_falhou_na_terceira_coleta(ctx: Ctx) -> None:
    async with ctx.sessoes() as s:
        s.add(Fonte(id="f1", tipo="snmp", nome="Switch", host="10.99.0.250", porta=161,
                    credencial_cifrada=b"x"))  # fmt: skip
        await s.commit()

    async def coleta(ok: bool) -> None:
        await ctx.agrupador.processar(
            Mensagem("fonte", {"acao": "coletada", "id": "f1", "ok": ok, "ultima_coleta": None})
        )

    await coleta(False)
    await coleta(False)
    await coleta(True)  # zera a sequência
    await coleta(False)
    await coleta(False)
    assert await _alertas(ctx) == []
    await coleta(False)
    await coleta(False)  # não duplica
    [a] = await _alertas(ctx)
    assert a.tipo == "fonte_falhou" and a.fonte_id == "f1" and a.fechado_em is None
    ctx.parede.agora = T0 + timedelta(minutes=30)
    await coleta(True)
    [a] = await _alertas(ctx)
    assert a.fechado_em == T0 + timedelta(minutes=30)


# ---- silêncios ------------------------------------------------------------------------------


async def test_silencio_ativo_registra_sem_enviar(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    await _silencio(ctx, eq=x)
    await _enviar(ctx, x, "offline", 0)
    [a] = await _alertas(ctx)
    assert a.silenciado and a.envio == "nao_aplica"
    await _enviar(ctx, x, "online", 600)
    alertas = await _alertas(ctx)
    assert len(alertas) == 1 and alertas[0].fechado_em is not None  # sem ``volta``


async def test_sem_envio_alertas_nascem_nao_aplica(ctx: Ctx) -> None:
    """Demonstração (``enviar=False``): nada vai ao Telegram, então nenhum alerta nasce
    ``pendente`` (o painel não mostra "Telegram pendente"); o agrupamento segue igual."""
    ctx.agrupador = Agrupador(
        ctx.sessoes,
        ctx.barramento,
        Silencios(ctx.sessoes, cast(Any, None), ctx.barramento, ctx.relogio, ctx.parede),
        ctx.relogio,
        ctx.parede,
        enviar=False,
    )
    x = await _eq(ctx, "x")
    y = await _eq(ctx, "y")
    await _enviar(ctx, x, "offline", 0)
    await _enviar(ctx, y, "offline", 5)
    [a] = await _alertas(ctx)
    assert a.envio == "nao_aplica" and not a.silenciado and a.quedas == [x, y]


async def test_filho_de_pai_em_manutencao_silenciado(ctx: Ctx) -> None:
    """Review Focus 1: o pai pausado em manutenção cobre a cadeia de descendentes."""
    pai = await _eq(ctx, "pai", pausado=True, estado="pausado")
    filho = await _eq(ctx, "filho", pai=pai)
    neto = await _eq(ctx, "neto", "camera", pai=filho)
    await _silencio(ctx, "manutencao", eq=pai)
    await _enviar(ctx, filho, "offline", 0)
    await _enviar(ctx, neto, "offline", 40)
    alertas = await _alertas(ctx)
    assert len(alertas) == 2
    assert all(a.silenciado and a.envio == "nao_aplica" for a in alertas)


async def test_filho_de_pai_em_manutencao_de_classe_silenciado(ctx: Ctx) -> None:
    """Manutenção/silêncio de CLASSE cobre também os descendentes do equipamento da classe."""
    pai = await _eq(ctx, "pai", "switch", pausado=True, estado="pausado")
    filho = await _eq(ctx, "filho", "camera", pai=pai)
    neto = await _eq(ctx, "neto", "camera", pai=filho)
    async with ctx.sessoes() as s:
        s.add(
            Silencio(
                tipo="manutencao",
                alvo_tipo="classe",
                classe_id=ctx.classes["switch"],
                inicio=T0 - timedelta(hours=1),
                fim=T0 + timedelta(hours=4),
                pausados=[],
            )
        )
        await s.commit()
    await _enviar(ctx, filho, "offline", 0)
    await _enviar(ctx, neto, "offline", 40)
    alertas = await _alertas(ctx)
    assert len(alertas) == 2
    assert all(a.silenciado and a.envio == "nao_aplica" for a in alertas)


async def test_nao_agrupa_silenciado_com_nao_silenciado(ctx: Ctx) -> None:
    x, y, z = await _eq(ctx, "x"), await _eq(ctx, "y"), await _eq(ctx, "z")
    await _silencio(ctx, eq=x)
    await _silencio(ctx, eq=z)
    await _enviar(ctx, x, "offline", 0)
    await _enviar(ctx, y, "offline", 5)
    await _enviar(ctx, z, "offline", 10)
    a, b = await _alertas(ctx)
    assert a.quedas == [x, z] and a.silenciado
    assert b.quedas == [y] and not b.silenciado


# ---- outros ---------------------------------------------------------------------------------


async def test_suspeito_e_pausado_nao_geram_alerta(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    for n, estado in enumerate(("suspeito", "pausado", "pausado", "desconhecido", "online")):
        await _enviar(ctx, x, estado, n)
    assert await _alertas(ctx) == []
    assert ctx.alertas_publicados() == []


async def test_reinicio_recarrega_abertos(ctx: Ctx) -> None:
    x = await _eq(ctx, "x", estado="offline")  # o banco também o tem caído
    cam = await _eq(ctx, "cam", "camera", estado="instavel", desde=T0)
    await _enviar(ctx, x, "offline", 0)
    # reinício: outro agrupador sobre o mesmo banco, com o laço completo
    ctx.agrupador = ctx.novo_agrupador()
    tarefa = asyncio.create_task(ctx.agrupador.executar())
    try:
        await asyncio.wait_for(ctx.agrupador.pronto.wait(), 2)
        for _ in range(200):  # o primeiro tick passa pelo banco antes de dormir
            if ctx.relogio.proximo_prazo() is not None:
                break
            await asyncio.sleep(0.01)
        ctx.parede.agora = T0 + timedelta(seconds=300)
        ctx.barramento.publicar(_msg(x, "online", 300))
        await _ate(ctx, lambda al: al[0].fechado_em is not None)
        [queda] = await _alertas(ctx)
        assert queda.fechado_em == T0 + timedelta(seconds=300)
        await ctx.relogio.avancar(5)  # próximo tick
        await _ate(ctx, lambda al: len(al) == 2)
        _, instavel = await _alertas(ctx)
        # a câmera já estava instável no banco desde T0: abre sem nova mensagem
        assert instavel.tipo == "instavel" and instavel.equipamento_id == cam
    finally:
        tarefa.cancel()
        await asyncio.gather(tarefa, return_exceptions=True)


# ---- correção 1: reconciliação ao subir -------------------------------------------------------


async def _mudar_eq(c: Ctx, eid: str, **campos: Any) -> None:
    async with c.sessoes() as s:
        eq = await s.get(Equipamento, eid)
        assert eq is not None
        for k, v in campos.items():
            setattr(eq, k, v)
        await s.commit()


async def _reiniciar(c: Ctx) -> None:
    c.agrupador = c.novo_agrupador()
    await c.agrupador.carregar()


async def test_voltou_enquanto_o_agrupador_estava_parado(ctx: Ctx) -> None:
    x, a_id, b_id = await _eq(ctx, "x"), await _eq(ctx, "a"), await _eq(ctx, "b")
    cam = await _eq(ctx, "cam", "camera")
    await _enviar(ctx, x, "offline", 0)
    await _enviar(ctx, a_id, "offline", 100)
    await _enviar(ctx, b_id, "offline", 105)  # grupo [a, b]
    await _enviar(ctx, cam, "instavel", 0)
    ctx.parede.agora = T0 + timedelta(seconds=300)
    await ctx.agrupador.tick()
    queda_x, grupo, instavel = await _alertas(ctx)
    await _alterar(ctx, queda_x.id, envio="enviado", telegram_msgs={"-1001": 7})
    await _alterar(ctx, instavel.id, envio="enviado", telegram_msgs={"-1001": 8})
    # parado: as voltas chegaram ao banco, mas o agrupador não as viu
    volta_em = T0 + timedelta(seconds=400)
    await _mudar_eq(ctx, x, estado="online", estado_desde=volta_em)
    await _mudar_eq(ctx, a_id, estado="online", estado_desde=volta_em)
    await _mudar_eq(ctx, b_id, estado="offline", estado_desde=T0 + timedelta(seconds=105))
    await _mudar_eq(ctx, cam, estado="online", estado_desde=volta_em)
    ctx.parede.agora = T0 + timedelta(seconds=900)
    await _reiniciar(ctx)
    queda_x, grupo, instavel, volta_1, volta_2 = await _alertas(ctx)
    assert queda_x.fechado_em == volta_em and not queda_x.breve
    assert grupo.fechado_em is None and grupo.voltaram == [a_id]
    assert instavel.fechado_em == volta_em
    voltas = {volta_1.alerta_origem_id, volta_2.alerta_origem_id}
    assert voltas == {queda_x.id, instavel.id} and {volta_1.tipo, volta_2.tipo} == {"volta"}


# ---- correção 2: disputa com o despachante pelo ``envio`` --------------------------------------


def _despachante_no_meio(monkeypatch: pytest.MonkeyPatch, c: Ctx, alerta_id: int) -> None:
    """Na primeira leitura dos abertos, o despachante reivindica o alerta (outra conexão)."""
    original = agrupador_mod._abertos
    disparou = False

    async def com_disputa(db: AsyncSession) -> list[Alerta]:
        nonlocal disparou
        lidos = await original(db)
        if not disparou:
            disparou = True
            async with c.sessoes() as outra:
                await outra.execute(
                    update(Alerta)
                    .where(Alerta.id == alerta_id, Alerta.envio == "pendente")
                    .values(envio="enviado")
                )
                await outra.commit()
        return lidos

    monkeypatch.setattr(agrupador_mod, "_abertos", com_disputa)


async def test_disputa_nao_remove_alerta_ja_enviado(
    ctx: Ctx, monkeypatch: pytest.MonkeyPatch
) -> None:
    pai = await _eq(ctx, "pai")
    c = await _eq(ctx, "c", "camera", pai=pai)
    await _enviar(ctx, c, "offline", 0)
    await _enviar(ctx, pai, "offline", 40)
    proprio, do_pai = await _alertas(ctx)
    _despachante_no_meio(monkeypatch, ctx, proprio.id)
    await _enviar(ctx, c, "inalcancavel", 40, causa=f"pai:{pai}")
    proprio, do_pai = await _alertas(ctx)  # não foi apagado
    assert proprio.envio == "enviado" and proprio.quedas == [c]
    assert do_pai.afetados == [c]


async def test_disputa_nao_agrupa_em_alerta_ja_enviado(
    ctx: Ctx, monkeypatch: pytest.MonkeyPatch
) -> None:
    x, y = await _eq(ctx, "x"), await _eq(ctx, "y")
    await _enviar(ctx, x, "offline", 0)
    [a] = await _alertas(ctx)
    _despachante_no_meio(monkeypatch, ctx, a.id)
    await _enviar(ctx, y, "offline", 5)
    a, b = await _alertas(ctx)
    assert a.quedas == [x] and a.envio == "enviado"
    assert b.quedas == [y]


async def test_disputa_no_fechamento_cria_volta(ctx: Ctx, monkeypatch: pytest.MonkeyPatch) -> None:
    x = await _eq(ctx, "x")
    await _enviar(ctx, x, "offline", 0)
    [a] = await _alertas(ctx)
    _despachante_no_meio(monkeypatch, ctx, a.id)
    await _enviar(ctx, x, "online", 300)
    queda, volta = await _alertas(ctx)
    assert queda.fechado_em is not None and queda.envio == "enviado"
    assert volta.tipo == "volta" and volta.alerta_origem_id == queda.id


# ---- correção 3: volta do instável enviado -----------------------------------------------------


async def _instavel_enviado(c: Ctx, cam: str) -> None:
    await _enviar(c, cam, "instavel", 0)
    c.parede.agora = T0 + timedelta(seconds=300)
    await c.agrupador.tick()
    [a] = await _alertas(c)
    await _alterar(c, a.id, envio="enviado")


async def test_instavel_enviado_que_volta_cria_volta(ctx: Ctx) -> None:
    cam = await _eq(ctx, "cam", "camera")
    await _instavel_enviado(ctx, cam)
    await _enviar(ctx, cam, "online", 400)
    instavel, volta = await _alertas(ctx)
    assert instavel.fechado_em == T0 + timedelta(seconds=400) and instavel.envio == "enviado"
    assert volta.tipo == "volta" and volta.alerta_origem_id == instavel.id
    assert volta.envio == "pendente" and volta.equipamento_id == cam


async def test_instavel_enviado_que_cai_nao_cria_volta(ctx: Ctx) -> None:
    cam = await _eq(ctx, "cam", "camera")
    await _instavel_enviado(ctx, cam)
    await _enviar(ctx, cam, "offline", 400)
    instavel, queda = await _alertas(ctx)
    assert instavel.fechado_em is not None and queda.tipo == "queda"


# ---- correções 4 a 6 --------------------------------------------------------------------------


async def test_inalcancavel_ja_afetado_que_cai_nao_duplica(ctx: Ctx) -> None:
    x, y = await _eq(ctx, "x"), await _eq(ctx, "y")
    await _enviar(ctx, x, "offline", 0)
    await _enviar(ctx, y, "inalcancavel", 1, causa=f"pai:{x}")
    await _enviar(ctx, y, "offline", 5)  # sem pai caído: queda própria no mesmo grupo
    [a] = await _alertas(ctx)
    assert a.quedas == [x, y] and a.afetados == [y]


async def test_queda_pausada_conta_como_resolvida(ctx: Ctx) -> None:
    a_id, b_id = await _eq(ctx, "a"), await _eq(ctx, "b")
    await _enviar(ctx, a_id, "offline", 0)
    await _enviar(ctx, b_id, "offline", 5)
    [g] = await _alertas(ctx)
    await _alterar(ctx, g.id, envio="enviado")
    await _enviar(ctx, a_id, "online", 200)
    await _mudar_eq(ctx, b_id, pausado=True, estado="pausado")
    await _enviar(ctx, b_id, "pausado", 210)
    g, volta = await _alertas(ctx)
    assert g.fechado_em == T0 + timedelta(seconds=210) and g.voltaram == [a_id]
    assert volta.tipo == "volta"


async def test_queda_so_pausada_fecha_sem_aviso(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    await _enviar(ctx, x, "offline", 0)
    await _mudar_eq(ctx, x, pausado=True, estado="pausado")
    await _enviar(ctx, x, "pausado", 30)
    [a] = await _alertas(ctx)
    assert a.fechado_em is not None and not a.breve and a.envio == "nao_aplica"


async def _fonte(c: Ctx, equipamento_id: str | None = None) -> None:
    async with c.sessoes() as s:
        s.add(
            Fonte(
                id="f1",
                tipo="snmp",
                nome="Switch",
                host="10.99.0.250",
                porta=161,
                credencial_cifrada=b"x",
                equipamento_id=equipamento_id,
            )
        )
        await s.commit()


async def _falhar_fonte(c: Ctx, vezes: int = 3) -> None:
    for _ in range(vezes):
        await c.agrupador.processar(
            Mensagem("fonte", {"acao": "coletada", "id": "f1", "ok": False})
        )


async def test_equipamento_ou_fonte_removidos_fecham_no_tick(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    await _fonte(ctx)
    await _enviar(ctx, x, "offline", 0)
    await _falhar_fonte(ctx)
    async with ctx.sessoes() as s:
        await s.execute(delete(Equipamento).where(Equipamento.id == x))
        await s.execute(delete(Fonte).where(Fonte.id == "f1"))
        await s.commit()
    ctx.parede.agora = T0 + timedelta(seconds=60)
    await ctx.agrupador.tick()
    queda, fonte = await _alertas(ctx)
    assert queda.fechado_em == ctx.parede.agora and queda.envio == "nao_aplica"
    assert fonte.fechado_em == ctx.parede.agora


async def test_fonte_falhou_silenciada_pelo_equipamento(ctx: Ctx) -> None:
    sw = await _eq(ctx, "sw")
    await _silencio(ctx, eq=sw)
    await _fonte(ctx, sw)
    await _falhar_fonte(ctx)
    [a] = await _alertas(ctx)
    assert a.tipo == "fonte_falhou" and a.silenciado and a.envio == "nao_aplica"


async def test_inalcancavel_sem_pai_na_causa_vira_queda(ctx: Ctx) -> None:
    x = await _eq(ctx, "x")
    await _enviar(ctx, x, "inalcancavel", 0)
    [a] = await _alertas(ctx)
    assert a.tipo == "queda" and a.quedas == [x] and a.equipamento_id == x
