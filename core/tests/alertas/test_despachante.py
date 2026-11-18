"""Despachante: fila persistente em ``alerta.envio`` → Telegram (cliente falso).

Tokens e chats fictícios; equipamentos só em 10.99.x.
"""

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, cast
from zoneinfo import ZoneInfo

import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.alertas.ajustes import (
    AjustesTelegram,
    cifrar_token,
    gravar_telegram,
    ler_status,
)
from sentinela.alertas.despachante import (
    CONFIRMAR_QUEDA_S,
    DESISTIR,
    ESPERA_INICIAL_S,
    ESPERA_MAX_S,
    POR_CHAT_MIN,
    Despachante,
)
from sentinela.alertas.telegram import ClienteTelegram, ErroTelegram
from sentinela.config import Settings
from sentinela.db.base import Base
from sentinela.db.modelos import Alerta, Classe, Equipamento
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.main import criar_app
from sentinela.rede.guarda import Guarda
from sentinela.relogio import RelogioFalso
from sentinela.seguranca.cofre import Cofre
from tests.alertas.servidor_telegram import resolver_fixo
from tests.conftest import criar_esquema

T0 = datetime(2026, 11, 18, 17, 0, tzinfo=UTC)  # 14:00 em São Paulo
SP = ZoneInfo("America/Sao_Paulo")
TOKEN = "123456789:AAFicticioFicticioFicticio-0123456789"  # noqa: S105 - fictício
CHAT_A = "-1001"
CHAT_B = "-1002"
CHAVE = "11" * 32


class ClienteFalso:
    def __init__(self) -> None:
        self.enviados: list[tuple[str, str]] = []
        self.editados: list[tuple[str, int, str]] = []
        self.tentativas = 0
        self.erro: ErroTelegram | None = None
        self.erro_edicao: ErroTelegram | None = None
        self.falhar_chats: set[str] = set()  # vazio: ``erro`` vale para todos
        self._id = 0

    async def enviar(self, token: str, chat: str, texto: str) -> int | None:
        assert token == TOKEN
        self.tentativas += 1
        if self.erro is not None and (not self.falhar_chats or chat in self.falhar_chats):
            raise self.erro
        self.enviados.append((chat, texto))
        self._id += 1
        return self._id

    async def editar(self, token: str, chat: str, message_id: int, texto: str) -> None:
        assert token == TOKEN
        self.tentativas += 1
        if self.erro_edicao is not None:
            raise self.erro_edicao
        self.editados.append((chat, message_id, texto))


@dataclass
class Parede:
    agora: datetime = T0

    def __call__(self) -> datetime:
        return self.agora


@dataclass
class Ctx:
    sessoes: async_sessionmaker[AsyncSession]
    cofre: Cofre
    cliente: ClienteFalso
    relogio: RelogioFalso
    parede: Parede
    despachante: Despachante
    classe_id: int = 0
    ips: list[int] = field(default_factory=lambda: list(range(10, 250)))

    def em(self, seg: float) -> None:
        self.parede.agora = T0 + timedelta(seconds=seg)


@pytest.fixture
async def ctx(tmp_path: Path) -> AsyncIterator[Ctx]:
    motor = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'd.db'}")
    async with motor.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessoes = fabrica_sessao(motor)
    async with sessoes() as s:
        await semear_classes(s)
        classe_id = (await s.execute(select(Classe.id).where(Classe.slug == "switch"))).scalar_one()
    cofre = Cofre(cast(Any, _Segredo(CHAVE)))
    cliente = ClienteFalso()
    relogio = RelogioFalso()
    parede = Parede()
    despachante = Despachante(sessoes, cast(Any, cliente), cofre, relogio, parede, SP)
    yield Ctx(sessoes, cofre, cliente, relogio, parede, despachante, classe_id)
    await motor.dispose()


class _Segredo:
    def __init__(self, valor: str) -> None:
        self._v = valor

    def get_secret_value(self) -> str:
        return self._v


async def _configurar(c: Ctx, chats: list[str] | None = None, incluir_ip: bool = False) -> None:
    async with c.sessoes() as s:
        await gravar_telegram(
            s,
            AjustesTelegram(
                cifrar_token(c.cofre, TOKEN),
                chats if chats is not None else [CHAT_A],
                incluir_ip,
            ),
        )
        await s.commit()


async def _eq(c: Ctx, nome: str) -> str:
    async with c.sessoes() as s:
        eq = Equipamento(
            nome=nome,
            ip=f"10.99.40.{c.ips.pop(0)}",
            classe_id=c.classe_id,
            estado="offline",
            estado_desde=T0,
            criado_em=T0,
        )
        s.add(eq)
        await s.commit()
        return eq.id


async def _alerta(c: Ctx, tipo: str = "queda", seg: float = 0, **kw: Any) -> int:
    nome = kw.pop("nome", "Switch Bloco B")
    eq = await _eq(c, nome)
    async with c.sessoes() as s:
        a = Alerta(
            tipo=tipo,
            equipamento_id=eq,
            quedas=[eq] if tipo == "queda" else [],
            afetados=[],
            aberto_em=T0 + timedelta(seconds=seg),
            **kw,
        )
        s.add(a)
        await s.commit()
        return a.id


async def _ler(c: Ctx, id: int) -> Alerta:
    async with c.sessoes() as s:
        a = await s.get(Alerta, id)
        assert a is not None
        return a


async def _alterar(c: Ctx, id: int, **campos: Any) -> None:
    async with c.sessoes() as s:
        a = await s.get(Alerta, id)
        assert a is not None
        for k, v in campos.items():
            setattr(a, k, v)
        await s.commit()


async def _status(c: Ctx) -> dict[str, Any]:
    async with c.sessoes() as s:
        return await ler_status(s)


def test_constantes_da_spec() -> None:
    assert CONFIRMAR_QUEDA_S == 60
    assert ESPERA_INICIAL_S == 30
    assert ESPERA_MAX_S == 1800
    assert DESISTIR == timedelta(hours=24)
    assert POR_CHAT_MIN == 20


# ---- configuração -------------------------------------------------------------------------


async def test_sem_configuracao_nada_sai(ctx: Ctx) -> None:
    resolver = resolver_fixo("149.154.167.220")
    real = ClienteTelegram(Guarda([]), resolver=resolver)
    despachante = Despachante(ctx.sessoes, real, ctx.cofre, ctx.relogio, ctx.parede, SP)
    a = await _alerta(ctx, "volta")
    ctx.em(120)
    await despachante.ciclo()
    await ctx.despachante.ciclo()
    # só chats, sem token; e só token, sem chats
    async with ctx.sessoes() as s:
        await gravar_telegram(s, AjustesTelegram(None, [CHAT_A], False))
        await s.commit()
    await despachante.ciclo()
    await _configurar(ctx, chats=[])
    await despachante.ciclo()
    await ctx.despachante.ciclo()
    assert resolver.chamadas == []
    assert ctx.cliente.tentativas == 0
    assert (await _ler(ctx, a)).envio == "pendente"


async def test_token_ilegivel_nada_sai_e_registra_status(ctx: Ctx) -> None:
    await _alerta(ctx, "volta")
    async with ctx.sessoes() as s:
        await gravar_telegram(s, AjustesTelegram("bm9wZQ==", [CHAT_A], False))
        await s.commit()
    await ctx.despachante.ciclo()
    assert ctx.cliente.tentativas == 0
    assert await _status(ctx) == {"ultimo_envio": None, "ultimo_erro": "Token ilegível."}


# ---- quando sai ---------------------------------------------------------------------------


async def test_queda_espera_60s(ctx: Ctx) -> None:
    await _configurar(ctx)
    a = await _alerta(ctx, "queda")
    ctx.em(59)
    await ctx.despachante.ciclo()
    assert ctx.cliente.enviados == []
    ctx.em(60)
    await ctx.despachante.ciclo()
    assert ctx.cliente.enviados == [(CHAT_A, "🔴 Switch Bloco B caiu às 14:00")]
    lido = await _ler(ctx, a)
    assert lido.envio == "enviado"
    assert lido.enviado_para == [CHAT_A]
    assert lido.telegram_msgs == {CHAT_A: 1}
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == 1  # uma mensagem por alerta


async def test_volta_e_fonte_saem_sem_espera(ctx: Ctx) -> None:
    await _configurar(ctx)
    volta = await _alerta(ctx, "volta", nome="NVR Garagem")
    instavel = await _alerta(ctx, "instavel", nome="Câmera Portaria")
    await ctx.despachante.ciclo()
    textos = [t for _, t in ctx.cliente.enviados]
    assert textos == ["🟢 NVR Garagem voltou às 14:00", "🟠 Câmera Portaria instável desde 14:00"]
    assert (await _ler(ctx, volta)).envio == "enviado"
    assert (await _ler(ctx, instavel)).envio == "enviado"


async def test_fonte_falhou_sai_sem_espera(ctx: Ctx) -> None:
    await _configurar(ctx)
    async with ctx.sessoes() as s:
        s.add(Alerta(tipo="fonte_falhou", quedas=[], afetados=[], aberto_em=T0))
        await s.commit()
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == 1


async def test_caiu_e_voltou_antes_do_envio_sai_na_hora(ctx: Ctx) -> None:
    await _configurar(ctx)
    await _alerta(
        ctx, "queda", nome="NVR Garagem", breve=True, fechado_em=T0 + timedelta(seconds=100)
    )
    ctx.em(100)  # já fechou: não espera os 60 s de confirmação de novo
    await ctx.despachante.ciclo()
    assert ctx.cliente.enviados == [(CHAT_A, "🟡 NVR Garagem caiu e voltou (1 min 40 s)")]


async def test_silenciado_nunca_sai(ctx: Ctx) -> None:
    await _configurar(ctx)
    a = await _alerta(ctx, "volta", silenciado=True, envio="nao_aplica")
    b = await _alerta(ctx, "volta", silenciado=True)  # mesmo se ficou pendente
    ctx.em(3600)
    await ctx.despachante.ciclo()
    assert ctx.cliente.tentativas == 0
    assert (await _ler(ctx, a)).envio == "nao_aplica"
    assert (await _ler(ctx, b)).envio == "pendente"


async def test_incluir_ip(ctx: Ctx) -> None:
    await _configurar(ctx, incluir_ip=True)
    await _alerta(ctx, "volta", nome="NVR Garagem")
    await ctx.despachante.ciclo()
    [(_, texto)] = ctx.cliente.enviados
    assert texto.startswith("🟢 NVR Garagem (10.99.40.") and "voltou às 14:00" in texto


# ---- vários chats e retentativas ------------------------------------------------------------


async def test_varios_chats_reenvia_so_os_que_faltam(ctx: Ctx) -> None:
    await _configurar(ctx, chats=[CHAT_A, CHAT_B])
    a = await _alerta(ctx, "volta")
    ctx.cliente.erro = ErroTelegram("Telegram indisponível no momento.", temporario=True)
    ctx.cliente.falhar_chats = {CHAT_B}
    await ctx.despachante.ciclo()
    lido = await _ler(ctx, a)
    assert lido.envio == "pendente"
    assert lido.enviado_para == [CHAT_A]
    assert lido.telegram_msgs == {CHAT_A: 1}
    assert lido.envio_tentativas == 1
    ctx.cliente.erro = None
    ctx.em(ESPERA_INICIAL_S)
    await ctx.despachante.ciclo()
    assert [chat for chat, _ in ctx.cliente.enviados] == [CHAT_A, CHAT_B]
    lido = await _ler(ctx, a)
    assert lido.envio == "enviado"
    assert sorted(lido.enviado_para) == [CHAT_A, CHAT_B]
    assert lido.telegram_msgs == {CHAT_A: 1, CHAT_B: 2}


async def test_retentativa_30s_dobra_ate_30min(ctx: Ctx) -> None:
    await _configurar(ctx)
    a = await _alerta(ctx, "volta")
    ctx.cliente.erro = ErroTelegram("O Telegram não respondeu a tempo.", temporario=True)
    esperas: list[float] = []
    seg = 0.0
    for _ in range(9):
        await ctx.despachante.ciclo()
        lido = await _ler(ctx, a)
        assert lido.envio_proxima is not None
        espera = (lido.envio_proxima - ctx.parede.agora).total_seconds()
        esperas.append(espera)
        # antes do prazo, nada é tentado
        tentativas = ctx.cliente.tentativas
        ctx.em(seg + espera - 1)
        await ctx.despachante.ciclo()
        assert ctx.cliente.tentativas == tentativas
        seg += espera
        ctx.em(seg)
    assert esperas == [30, 60, 120, 240, 480, 960, 1800, 1800, 1800]


async def test_respeita_retry_after_maior(ctx: Ctx) -> None:
    await _configurar(ctx)
    a = await _alerta(ctx, "volta")
    ctx.cliente.erro = ErroTelegram("Limite.", temporario=True, espera_s=95)
    await ctx.despachante.ciclo()
    lido = await _ler(ctx, a)
    assert lido.envio_proxima == T0 + timedelta(seconds=95)
    ctx.cliente.erro = ErroTelegram("Limite.", temporario=True, espera_s=5)  # menor: ignora
    await ctx.relogio.avancar(95)  # o chat também ficou bloqueado pelos 95 s pedidos
    ctx.em(95)
    await ctx.despachante.ciclo()
    assert (await _ler(ctx, a)).envio_proxima == T0 + timedelta(seconds=95 + 60)


async def test_desiste_em_24h_falhou(ctx: Ctx) -> None:
    await _configurar(ctx)
    a = await _alerta(ctx, "volta")
    ctx.cliente.erro = ErroTelegram("Telegram indisponível no momento.", temporario=True)
    await ctx.despachante.ciclo()
    ctx.em(DESISTIR.total_seconds() - 1)
    await ctx.despachante.ciclo()
    assert (await _ler(ctx, a)).envio == "pendente"
    tentativas = ctx.cliente.tentativas
    ctx.em(DESISTIR.total_seconds())
    await ctx.despachante.ciclo()
    assert (await _ler(ctx, a)).envio == "falhou"
    assert ctx.cliente.tentativas == tentativas
    ctx.em(DESISTIR.total_seconds() * 2)
    await ctx.despachante.ciclo()
    assert ctx.cliente.tentativas == tentativas


# ---- limite por chat e resumo -------------------------------------------------------------


async def test_limite_20_por_minuto_por_chat(ctx: Ctx) -> None:
    await _configurar(ctx, chats=[CHAT_A, CHAT_B])
    for _ in range(20):
        await _alerta(ctx, "volta")
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == 40  # 20 em cada chat, nenhum resumo
    novos = [await _alerta(ctx, "volta", seg=10) for _ in range(5)]
    await ctx.relogio.avancar(30)
    ctx.em(30)
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == 40  # janela de 1 min ainda cheia
    assert [(await _ler(ctx, n)).envio for n in novos] == ["pendente"] * 5
    await ctx.relogio.avancar(30)
    ctx.em(60)
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == 50
    assert [(await _ler(ctx, n)).envio for n in novos] == ["enviado"] * 5


async def test_fila_acumulada_vira_resumo(ctx: Ctx) -> None:
    await _configurar(ctx)
    ids = [await _alerta(ctx, "volta", seg=i) for i in range(25)]
    ctx.em(60)
    await ctx.despachante.ciclo()
    textos = [t for _, t in ctx.cliente.enviados]
    assert len(textos) == POR_CHAT_MIN
    assert all(t.startswith("🟢 ") for t in textos[:19])
    assert textos[19] == "… e mais 6 alertas, veja no painel"
    lidos = [await _ler(ctx, i) for i in ids]
    assert all(a.envio == "enviado" for a in lidos)
    assert all(a.enviado_para == [CHAT_A] for a in lidos[19:])
    assert all(a.telegram_msgs == {} for a in lidos[19:])  # nada a editar no resumo
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == POR_CHAT_MIN


async def test_resumo_respeita_o_chat_mais_apertado(ctx: Ctx) -> None:
    await _configurar(ctx, chats=[CHAT_A])
    for _ in range(15):
        await _alerta(ctx, "volta")
    await ctx.despachante.ciclo()  # CHAT_A gastou 15 no minuto
    await _configurar(ctx, chats=[CHAT_A, CHAT_B])
    for _ in range(8):
        await _alerta(ctx, "volta")
    await ctx.despachante.ciclo()  # sobram 5 em CHAT_A: 4 individuais + resumo de 4
    por_chat = [t for chat, t in ctx.cliente.enviados[15:] if chat == CHAT_A]
    assert len(por_chat) == 5
    assert por_chat[-1] == "… e mais 4 alertas, veja no painel"


# ---- status --------------------------------------------------------------------------------


async def test_registra_status_generico(ctx: Ctx) -> None:
    await _configurar(ctx)
    await _alerta(ctx, "volta")
    ctx.cliente.erro = ErroTelegram("Token do bot recusado pelo Telegram.", temporario=False)
    await ctx.despachante.ciclo()
    st = await _status(ctx)
    assert st == {"ultimo_envio": None, "ultimo_erro": "Token do bot recusado pelo Telegram."}
    ctx.cliente.erro = None
    ctx.em(ESPERA_INICIAL_S)
    await ctx.despachante.ciclo()
    st = await _status(ctx)
    assert st == {"ultimo_envio": T0 + timedelta(seconds=ESPERA_INICIAL_S), "ultimo_erro": None}


# ---- caiu e voltou depois do envio: edição -------------------------------------------------


async def _queda_enviada_e_voltou(ctx: Ctx, chats: list[str]) -> int:
    await _configurar(ctx, chats=chats)
    a = await _alerta(ctx, "queda", nome="NVR Garagem")
    ctx.em(CONFIRMAR_QUEDA_S)
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == len(chats)
    # o agrupador (contrato do modelo): breve, fechado e de volta a pendente com as mensagens
    await _alterar(ctx, a, breve=True, fechado_em=T0 + timedelta(seconds=100), envio="pendente")
    ctx.em(100)
    return a


async def test_breve_depois_do_envio_edita_mensagem(ctx: Ctx) -> None:
    a = await _queda_enviada_e_voltou(ctx, [CHAT_A, CHAT_B])
    await ctx.despachante.ciclo()
    texto = "🟡 NVR Garagem caiu e voltou (1 min 40 s)"
    assert sorted(ctx.cliente.editados) == [(CHAT_A, 1, texto), (CHAT_B, 2, texto)]
    assert len(ctx.cliente.enviados) == 2  # nenhum sendMessage novo
    lido = await _ler(ctx, a)
    assert lido.envio == "enviado"
    assert lido.telegram_msgs == {CHAT_A: 1, CHAT_B: 2}
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.editados) == 2


async def test_edicao_falhou_nao_reenvia(ctx: Ctx) -> None:
    a = await _queda_enviada_e_voltou(ctx, [CHAT_A])
    ctx.cliente.erro_edicao = ErroTelegram("Telegram indisponível no momento.", temporario=True)
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == 1
    st = await _status(ctx)
    assert st["ultimo_erro"] == "Telegram indisponível no momento."
    lido = await _ler(ctx, a)
    assert lido.envio == "pendente" and lido.envio_tentativas == 1
    # nova tentativa (só edição) depois da espera
    ctx.cliente.erro_edicao = None
    ctx.em(100 + ESPERA_INICIAL_S)
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == 1
    assert [e[0] for e in ctx.cliente.editados] == [CHAT_A]
    assert (await _ler(ctx, a)).envio == "enviado"


async def test_edicao_recusada_de_vez_vira_falhou(ctx: Ctx) -> None:
    a = await _queda_enviada_e_voltou(ctx, [CHAT_A])
    ctx.cliente.erro_edicao = ErroTelegram("Chat recusado.", temporario=False)
    await ctx.despachante.ciclo()
    assert len(ctx.cliente.enviados) == 1
    assert (await _ler(ctx, a)).envio == "falhou"


async def test_voltou_durante_o_envio_fica_para_edicao(
    ctx: Ctx, monkeypatch: pytest.MonkeyPatch
) -> None:
    """O agrupador fecha como caiu-e-voltou enquanto o ``sendMessage`` está no ar: o alerta
    continua pendente com as mensagens guardadas e o próximo ciclo edita."""
    await _configurar(ctx)
    a = await _alerta(ctx, "queda", nome="NVR Garagem")
    ctx.em(CONFIRMAR_QUEDA_S)
    original = ctx.cliente.enviar

    async def enviar_e_agrupador_fecha(token: str, chat: str, texto: str) -> int | None:
        mid = await original(token, chat, texto)
        await _alterar(ctx, a, breve=True, fechado_em=T0 + timedelta(seconds=61))
        return mid

    monkeypatch.setattr(ctx.cliente, "enviar", enviar_e_agrupador_fecha)
    await ctx.despachante.ciclo()
    lido = await _ler(ctx, a)
    assert lido.envio == "pendente"
    assert lido.telegram_msgs == {CHAT_A: 1}
    await ctx.despachante.ciclo()
    assert ctx.cliente.editados == [(CHAT_A, 1, "🟡 NVR Garagem caiu e voltou (1 min 1 s)")]
    assert (await _ler(ctx, a)).envio == "enviado"


async def test_alerta_mudado_pelo_agrupador_nao_e_sobrescrito(
    ctx: Ctx, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _configurar(ctx)
    a = await _alerta(ctx, "queda")
    ctx.em(CONFIRMAR_QUEDA_S)
    original = ctx.cliente.enviar
    outro = await _eq(ctx, "Outro")

    async def enviar_e_agrupador_soma(token: str, chat: str, texto: str) -> int | None:
        mid = await original(token, chat, texto)
        lido = await _ler(ctx, a)
        await _alterar(ctx, a, afetados=[outro], quedas=[*lido.quedas, outro])
        return mid

    monkeypatch.setattr(ctx.cliente, "enviar", enviar_e_agrupador_soma)
    await ctx.despachante.ciclo()
    lido = await _ler(ctx, a)
    assert lido.envio == "enviado"
    assert lido.afetados == [outro] and lido.quedas[-1] == outro


async def test_falha_inesperada_no_ciclo_nao_para_o_laco(
    ctx: Ctx, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    chamadas: list[float] = []

    async def ciclo() -> None:
        chamadas.append(ctx.relogio.agora())
        raise RuntimeError(f"falhou com /bot{TOKEN}/sendMessage")

    monkeypatch.setattr(ctx.despachante, "ciclo", ciclo)
    tarefa = asyncio.create_task(ctx.despachante.executar())
    await ctx.relogio.avancar(10)
    tarefa.cancel()
    await asyncio.gather(tarefa, return_exceptions=True)
    assert chamadas == [0.0, 5.0, 10.0]
    assert "RuntimeError" in caplog.text
    assert TOKEN.split(":", 1)[1] not in caplog.text


# ---- montagem --------------------------------------------------------------------------------


async def test_demo_nao_inicia_despachante(settings: Settings) -> None:
    demo = settings.model_copy(update={"demo": True})
    app: FastAPI = criar_app(demo, relogio=RelogioFalso())
    await criar_esquema(demo.banco_url)
    async with app.router.lifespan_context(app):
        nomes = [t.get_name() for t in app.state.tarefas_monitor]
        assert "sentinela-alertas" in nomes
        assert "sentinela-telegram" not in nomes
        assert app.state.despachante is None
        assert app.state.agrupador._enviar is False  # alertas nascem nao_aplica


async def test_fora_do_demo_inicia_despachante(settings: Settings) -> None:
    app: FastAPI = criar_app(settings, relogio=RelogioFalso())
    await criar_esquema(settings.banco_url)
    async with app.router.lifespan_context(app):
        nomes = [t.get_name() for t in app.state.tarefas_monitor]
        assert "sentinela-telegram" in nomes
        assert isinstance(app.state.despachante, Despachante)
        assert isinstance(app.state.cliente_telegram, ClienteTelegram)
        assert app.state.agrupador._enviar is True


async def test_edicao_so_nos_chats_ainda_configurados(ctx: Ctx) -> None:
    a = await _queda_enviada_e_voltou(ctx, [CHAT_A, CHAT_B])
    await _configurar(ctx, chats=[CHAT_B])
    await ctx.despachante.ciclo()
    assert [e[0] for e in ctx.cliente.editados] == [CHAT_B]
    assert len(ctx.cliente.enviados) == 2
    assert (await _ler(ctx, a)).envio == "enviado"


# ---- correções da revisão --------------------------------------------------------------------


async def test_retry_after_bloqueia_o_chat(ctx: Ctx) -> None:
    await _configurar(ctx, chats=[CHAT_A, CHAT_B])
    ids = [await _alerta(ctx, "volta", seg=i) for i in range(3)]
    ctx.cliente.erro = ErroTelegram("Limite.", temporario=True, espera_s=40)
    ctx.cliente.falhar_chats = {CHAT_A}
    ctx.em(5)
    await ctx.despachante.ciclo()
    assert ctx.cliente.tentativas == 4  # 1 em A (429), 3 em B; A bloqueado no resto do ciclo
    assert [c for c, _ in ctx.cliente.enviados] == [CHAT_B] * 3
    ctx.cliente.erro = None
    await ctx.relogio.avancar(10)
    ctx.em(15)
    await ctx.despachante.ciclo()
    assert ctx.cliente.tentativas == 4  # ainda bloqueado em ciclos seguintes
    await ctx.relogio.avancar(30)
    ctx.em(45)
    await ctx.despachante.ciclo()
    assert [c for c, _ in ctx.cliente.enviados[3:]] == [CHAT_A] * 3
    assert [(await _ler(ctx, i)).envio for i in ids] == ["enviado"] * 3


async def test_token_recusado_para_o_ciclo(ctx: Ctx) -> None:
    await _configurar(ctx, chats=[CHAT_A, CHAT_B])
    for i in range(3):
        await _alerta(ctx, "volta", seg=i)
    ctx.cliente.erro = ErroTelegram("Token do bot recusado pelo Telegram.", temporario=False)
    ctx.em(5)
    await ctx.despachante.ciclo()
    assert ctx.cliente.tentativas == 1
    assert (await _status(ctx))["ultimo_erro"] == "Token do bot recusado pelo Telegram."


async def test_envio_parcial_e_caiu_e_voltou_manda_texto_breve_aos_que_faltam(ctx: Ctx) -> None:
    await _configurar(ctx, chats=[CHAT_A, CHAT_B])
    a = await _alerta(ctx, "queda", nome="NVR Garagem")
    ctx.cliente.erro = ErroTelegram("Telegram indisponível no momento.", temporario=True)
    ctx.cliente.falhar_chats = {CHAT_B}
    ctx.em(CONFIRMAR_QUEDA_S)
    await ctx.despachante.ciclo()
    assert (await _ler(ctx, a)).telegram_msgs == {CHAT_A: 1}
    ctx.cliente.erro = None
    await _alterar(ctx, a, breve=True, fechado_em=T0 + timedelta(seconds=100))
    ctx.em(100)
    await ctx.despachante.ciclo()
    texto = "🟡 NVR Garagem caiu e voltou (1 min 40 s)"
    assert ctx.cliente.editados == [(CHAT_A, 1, texto)]
    assert ctx.cliente.enviados[-1] == (CHAT_B, texto)  # primeira mensagem de B
    lido = await _ler(ctx, a)
    assert lido.envio == "enviado"
    assert lido.telegram_msgs == {CHAT_A: 1, CHAT_B: 2}
    assert sorted(lido.enviado_para) == [CHAT_A, CHAT_B]


async def test_sucesso_e_erro_no_mesmo_ciclo_registram_os_dois(ctx: Ctx) -> None:
    await _configurar(ctx, chats=[CHAT_A, CHAT_B])
    await _alerta(ctx, "volta")
    ctx.cliente.erro = ErroTelegram("Telegram indisponível no momento.", temporario=True)
    ctx.cliente.falhar_chats = {CHAT_B}
    ctx.em(5)
    await ctx.despachante.ciclo()
    assert await _status(ctx) == {
        "ultimo_envio": T0 + timedelta(seconds=5),
        "ultimo_erro": "Telegram indisponível no momento.",
    }


async def test_resumo_so_aos_chats_que_faltam(ctx: Ctx) -> None:
    await _configurar(ctx, chats=[CHAT_A, CHAT_B])
    for i in range(19):
        await _alerta(ctx, "volta", seg=i)
    ja_em_a = [await _alerta(ctx, "volta", seg=100 + i, enviado_para=[CHAT_A]) for i in range(6)]
    ctx.em(200)
    await ctx.despachante.ciclo()
    em_a = [t for c, t in ctx.cliente.enviados if c == CHAT_A]
    em_b = [t for c, t in ctx.cliente.enviados if c == CHAT_B]
    assert len(em_a) == 19 and not any(t.startswith("…") for t in em_a)
    assert len(em_b) == 20 and em_b[-1] == "… e mais 6 alertas, veja no painel"
    for i in ja_em_a:
        lido = await _ler(ctx, i)
        assert lido.envio == "enviado" and sorted(lido.enviado_para) == [CHAT_A, CHAT_B]


async def test_ca_adicional_invalida_vira_status(ctx: Ctx, tmp_path: Path) -> None:
    ruim = tmp_path / "ca-ruim.pem"
    ruim.write_text("lixo", encoding="utf-8")
    resolver = resolver_fixo("149.154.167.220")
    real = ClienteTelegram(Guarda([]), ca_adicional=str(ruim), resolver=resolver)
    despachante = Despachante(ctx.sessoes, real, ctx.cofre, ctx.relogio, ctx.parede, SP)
    await _configurar(ctx)
    for _ in range(2):
        await _alerta(ctx, "volta")
    await despachante.ciclo()
    assert resolver.chamadas == []
    assert (await _status(ctx))["ultimo_erro"] == "CA adicional inválida."


async def test_ca_adicional_invalida_nao_impede_o_core_de_subir(
    settings: Settings, tmp_path: Path
) -> None:
    ruim = tmp_path / "ca-ruim.pem"
    ruim.write_text("lixo", encoding="utf-8")
    com_ca = settings.model_copy(update={"ca_adicional": str(ruim)})
    app: FastAPI = criar_app(com_ca, relogio=RelogioFalso())
    await criar_esquema(com_ca.banco_url)
    async with app.router.lifespan_context(app):
        nomes = [t.get_name() for t in app.state.tarefas_monitor]
        assert "sentinela-telegram" in nomes and "sentinela-agendador" in nomes
        await asyncio.sleep(0)
        assert not any(t.done() for t in app.state.tarefas_monitor)


async def test_token_recusado_na_edicao_nao_vira_falhou(ctx: Ctx) -> None:
    a = await _queda_enviada_e_voltou(ctx, [CHAT_A])
    ctx.cliente.erro_edicao = ErroTelegram("Token do bot recusado pelo Telegram.", temporario=False)
    await ctx.despachante.ciclo()
    lido = await _ler(ctx, a)
    assert lido.envio == "pendente" and lido.envio_tentativas == 1


async def _fechar_como_voltou(ctx: Ctx, a: int, seg: float, **extra: Any) -> None:
    lido = await _ler(ctx, a)
    await _alterar(
        ctx,
        a,
        voltaram=list(lido.quedas),
        fechado_em=T0 + timedelta(seconds=seg),
        **extra,
    )


async def test_queda_fechada_nao_breve_ainda_pendente_sai_com_caiu_e_voltou(ctx: Ctx) -> None:
    await _configurar(ctx)
    a = await _alerta(ctx, "queda", nome="NVR Garagem")
    await _fechar_como_voltou(ctx, a, 600)
    ctx.em(600)
    await ctx.despachante.ciclo()
    assert ctx.cliente.enviados == [
        (CHAT_A, "🔴 NVR Garagem caiu às 14:00 e voltou às 14:10 (fora por 10 min)")
    ]


async def test_queda_fechada_nao_breve_com_mensagens_edita(ctx: Ctx) -> None:
    """Agrupador fecha (>= 2 min) durante o envio: o alerta fica pendente com as mensagens e o
    próximo ciclo edita, sem sendMessage novo."""
    await _configurar(ctx)
    a = await _alerta(ctx, "queda", nome="NVR Garagem")
    ctx.em(CONFIRMAR_QUEDA_S)
    original = ctx.cliente.enviar

    async def enviar_e_agrupador_fecha(token: str, chat: str, texto: str) -> int | None:
        mid = await original(token, chat, texto)
        await _fechar_como_voltou(ctx, a, 600)
        return mid

    ctx.cliente.enviar = enviar_e_agrupador_fecha  # type: ignore[method-assign]
    await ctx.despachante.ciclo()
    lido = await _ler(ctx, a)
    assert lido.envio == "pendente" and lido.telegram_msgs == {CHAT_A: 1}
    ctx.em(601)
    await ctx.despachante.ciclo()
    assert ctx.cliente.editados == [
        (CHAT_A, 1, "🔴 NVR Garagem caiu às 14:00 e voltou às 14:10 (fora por 10 min)")
    ]
    assert (await _ler(ctx, a)).envio == "enviado"
    assert len(ctx.cliente.enviados) == 1


async def test_edicao_erro_em_um_chat_nao_marca_enviado(ctx: Ctx) -> None:
    a = await _queda_enviada_e_voltou(ctx, [CHAT_A, CHAT_B])
    ctx.cliente.erro_edicao = ErroTelegram("Telegram indisponível no momento.", temporario=True)
    await ctx.despachante.ciclo()
    lido = await _ler(ctx, a)
    assert lido.envio == "pendente" and lido.envio_tentativas == 1
