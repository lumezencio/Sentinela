import asyncio
import random
import time
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, timedelta
from ipaddress import IPv4Network

import pytest

from sentinela.barramento import Barramento, Mensagem
from sentinela.monitor.agendador import Agendador, Alvo
from sentinela.monitor.estados import Estado, ResultadoChecagem, Transicao
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, Guarda
from sentinela.relogio import RelogioFalso

REDE = IPv4Network("10.99.0.0/17")
FORA = "10.99.200.10"  # dentro do exemplo 10.99/16, fora da sub-rede declarada
OK = ResultadoChecagem(ok=True, latencia_ms=1.0)
FALHA = ResultadoChecagem(ok=False, latencia_ms=None, erro="sem resposta")
INICIO_PAREDE = datetime(2026, 1, 1, tzinfo=UTC)


class BarramentoGravado(Barramento):
    def __init__(self, relogio: RelogioFalso) -> None:
        super().__init__()
        self._relogio = relogio
        self.mensagens: list[tuple[float, Mensagem]] = []

    def publicar(self, msg: Mensagem) -> None:
        self.mensagens.append((self._relogio.agora(), msg))
        super().publicar(msg)

    def do_tipo(self, tipo: str) -> list[tuple[float, Mensagem]]:
        return [(t, m) for t, m in self.mensagens if m.tipo == tipo]


class LimitadorEspiao(Limitador):
    def __init__(self, taxa: float, relogio: RelogioFalso) -> None:
        super().__init__(taxa, relogio)
        self.pedidos: list[tuple[int, bool]] = []

    async def adquirir(self, custo: int = 1, prioritario: bool = False) -> None:
        self.pedidos.append((custo, prioritario))
        await super().adquirir(custo, prioritario)


@dataclass
class ChecagemFalsa:
    """Checagem programável: devolve o roteiro do IP (o último se repete) e anota os horários."""

    relogio: RelogioFalso
    custo: int = 1
    roteiros: dict[str, list[ResultadoChecagem]] = field(default_factory=dict)
    execucoes: list[tuple[float, str]] = field(default_factory=list)
    trava: asyncio.Event | None = None

    async def executar(
        self,
        destino: DestinoAutorizado,
        timeout: float = 2.0,  # noqa: ASYNC109
    ) -> ResultadoChecagem:
        ip = str(destino.ip)
        self.execucoes.append((self.relogio.agora(), ip))
        if self.trava is not None:
            await self.trava.wait()
        roteiro = self.roteiros.get(ip, [OK])
        return roteiro.pop(0) if len(roteiro) > 1 else roteiro[0]

    def vezes(self, ip: str) -> list[float]:
        return [t for t, i in self.execucoes if i == ip]


@dataclass
class GravadorFalso:
    transicoes: list[tuple[str, Transicao, datetime]] = field(default_factory=list)
    amostras: list[tuple[str, ResultadoChecagem, datetime]] = field(default_factory=list)
    causas: list[str | None] = field(default_factory=list)
    descargas: int = 0

    async def registrar_transicao(
        self, id: str, t: Transicao, em: datetime, causa: str | None = None
    ) -> None:
        self.transicoes.append((id, t, em))
        self.causas.append(causa)

    def acumular_amostra(self, id: str, r: ResultadoChecagem, em: datetime) -> None:
        self.amostras.append((id, r, em))

    async def descarregar(self) -> None:
        self.descargas += 1


@dataclass
class Cena:
    guarda: Guarda
    relogio: RelogioFalso
    barramento: BarramentoGravado
    limitador: LimitadorEspiao
    checagem: ChecagemFalsa
    gravador: GravadorFalso
    agendador: Agendador


def _cena(
    taxa: float = 20.0,
    agora_parede: Callable[[], datetime] | None = None,
    semente: int = 7,
    latencia_instavel_ms: float = 200.0,
) -> Cena:
    guarda = Guarda([REDE])
    relogio = RelogioFalso()
    barramento = BarramentoGravado(relogio)
    limitador = LimitadorEspiao(taxa, relogio)
    checagem = ChecagemFalsa(relogio)
    gravador = GravadorFalso()
    agendador = Agendador(
        guarda=guarda,
        limitador=limitador,
        relogio=relogio,
        barramento=barramento,
        gravador=gravador,
        checagens=lambda _tipo: checagem,
        rng=random.Random(semente),  # noqa: S311 - jitter determinístico no teste
        agora_parede=agora_parede or (lambda: INICIO_PAREDE),
        latencia_instavel_ms=latencia_instavel_ms,
    )
    return Cena(guarda, relogio, barramento, limitador, checagem, gravador, agendador)


def _alvo(
    n: int,
    critico: bool = True,
    estado: Estado = Estado.ONLINE,
    intervalo: float | None = None,
) -> Alvo:
    return Alvo(
        id=f"eq{n}",
        ip=f"10.99.{n // 250}.{n % 250 + 1}",
        porta=None,
        checagem="icmp",
        intervalo_s=intervalo if intervalo is not None else (15.0 if critico else 60.0),
        critico=critico,
        estado=estado,
    )


@pytest.fixture
async def rodando() -> AsyncIterator[Callable[[Cena], None]]:
    tarefas: list[asyncio.Task[None]] = []

    def iniciar(cena: Cena) -> None:
        tarefas.append(asyncio.create_task(cena.agendador.executar()))

    yield iniciar
    for t in tarefas:
        t.cancel()
    for t in tarefas:
        with pytest.raises(asyncio.CancelledError):
            await t


async def test_critico_checado_a_cada_15s_com_jitter(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(600)
    vezes = cena.checagem.vezes(alvo.ip)
    assert 33 <= len(vezes) <= 50
    passos = [b - a for a, b in zip(vezes, vezes[1:], strict=False)]
    assert all(12.0 - 1e-6 <= p <= 18.0 + 1e-6 for p in passos)
    assert len({round(p, 3) for p in passos}) > 5  # há jitter de verdade


async def test_falha_dispara_reconfirmacao_em_5s(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA, OK]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(40)
    vezes = cena.checagem.vezes(alvo.ip)
    assert vezes[1] - vezes[0] == pytest.approx(5.0)
    assert vezes[2] - vezes[1] >= 12.0 - 1e-6  # confirmou: volta ao ritmo normal
    assert [p for _, p in cena.limitador.pedidos[:3]] == [False, True, False]
    estados = [m.dados["estado"] for _, m in cena.barramento.do_tipo("estado")]
    assert estados == ["suspeito", "online"]


async def test_tres_falhas_publica_offline_uma_vez(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(300)
    offline = [
        (t, m) for t, m in cena.barramento.do_tipo("estado") if m.dados["estado"] == "offline"
    ]
    assert len(offline) == 1
    vezes = cena.checagem.vezes(alvo.ip)
    assert offline[0][0] == pytest.approx(vezes[2])
    assert vezes[2] - vezes[0] == pytest.approx(10.0)
    assert vezes[3] - vezes[2] >= 12.0 - 1e-6  # offline não fica re-checando a cada 5 s
    _, msg = offline[0]
    assert msg.dados["id"] == alvo.id
    assert datetime.fromisoformat(msg.dados["desde"]).tzinfo is not None
    assert [t.para for _, t, _ in cena.gravador.transicoes] == [Estado.SUSPEITO, Estado.OFFLINE]


async def test_teto_respeitado_com_2000_alvos(rodando: Callable[[Cena], None]) -> None:
    cena = _cena(taxa=20)
    for n in range(2000):
        cena.agendador.adicionar(_alvo(n, critico=n % 2 == 0))
    rodando(cena)
    await cena.relogio.avancar_ate(300)
    total = len(cena.checagem.execucoes)
    assert total <= 20 * 300 + cena.limitador.capacidade
    assert total >= 4000  # o orçamento é usado, não desperdiçado
    for inicio in range(0, 300, 10):  # em regime: nenhuma janela de 10 s acima do teto
        janela = [t for t, _ in cena.checagem.execucoes if inicio <= t < inicio + 10]
        assert len(janela) <= 20 * 10 + cena.limitador.capacidade
    assert cena.agendador.tempo_max_deteccao_s() > 15


async def test_estica_nao_criticos_primeiro() -> None:
    cena = _cena(taxa=20)
    for n in range(150):  # 150/15 = 10/s
        cena.agendador.adicionar(_alvo(n, critico=True))
    for n in range(150, 1350):  # 1200/60 = 20/s -> demanda 30/s > 20
        cena.agendador.adicionar(_alvo(n, critico=False))
    ag = cena.agendador
    assert ag.intervalo_efetivo("eq0") == pytest.approx(15.0)
    assert ag.intervalo_efetivo("eq200") == pytest.approx(120.0)  # fator 2 só nos não críticos
    assert ag.tempo_max_deteccao_s() == pytest.approx(15 * 1.2 + 10)


async def test_estica_criticos_quando_nao_basta() -> None:
    cena = _cena(taxa=20)
    for n in range(600):  # 600/15 = 40/s só de críticos
        cena.agendador.adicionar(_alvo(n, critico=True))
    for n in range(600, 700):
        cena.agendador.adicionar(_alvo(n, critico=False))
    ag = cena.agendador
    critico = ag.intervalo_efetivo("eq0")
    nao_critico = ag.intervalo_efetivo("eq650")
    assert critico is not None and nao_critico is not None
    assert critico > 15.0
    assert nao_critico / 60.0 >= critico / 15.0  # não críticos esticam pelo menos tanto
    demanda = 600 / critico + 100 / nao_critico
    assert demanda <= 20 + 1e-6
    assert ag.tempo_max_deteccao_s() == pytest.approx(critico * 1.2 + 10)


async def test_recalcula_quando_taxa_muda_e_ao_remover() -> None:
    cena = _cena(taxa=20)
    for n in range(150):
        cena.agendador.adicionar(_alvo(n, critico=True))
    for n in range(150, 1350):
        cena.agendador.adicionar(_alvo(n, critico=False))
    cena.limitador.definir_taxa(40)
    cena.agendador.recalcular()
    assert cena.agendador.intervalo_efetivo("eq200") == pytest.approx(60.0)
    cena.limitador.definir_taxa(20)
    cena.agendador.recalcular()
    for n in range(150, 1350):
        if n != 200:
            cena.agendador.remover(f"eq{n}")
    assert cena.agendador.intervalo_efetivo("eq200") == pytest.approx(60.0)
    assert cena.agendador.intervalo_efetivo("eq300") is None


async def test_sem_alvos_criticos_usa_todos_na_deteccao() -> None:
    cena = _cena()
    assert cena.agendador.tempo_max_deteccao_s() == 0.0
    cena.agendador.adicionar(_alvo(1, critico=False))
    assert cena.agendador.tempo_max_deteccao_s() == pytest.approx(60 * 1.2 + 10)


async def test_salto_de_relogio_de_parede_nao_afeta(rodando: Callable[[Cena], None]) -> None:
    def contar(saltar: bool) -> Cena:
        relogio_ref: list[RelogioFalso] = []

        def parede() -> datetime:
            salto = timedelta(hours=1) if saltar and relogio_ref[0].agora() >= 300 else timedelta()
            return INICIO_PAREDE + timedelta(seconds=relogio_ref[0].agora()) + salto

        cena = _cena(agora_parede=parede, semente=3)
        relogio_ref.append(cena.relogio)
        for n in range(5):
            cena.checagem.roteiros[_alvo(n).ip] = [OK, FALHA, OK, OK, FALHA, FALHA, FALHA, OK]
            cena.agendador.adicionar(_alvo(n, critico=n < 3))
        return cena

    normal, saltada = contar(False), contar(True)
    rodando(normal)
    rodando(saltada)
    await normal.relogio.avancar_ate(600)
    await saltada.relogio.avancar_ate(600)
    assert [t for t, _ in saltada.checagem.execucoes] == [t for t, _ in normal.checagem.execucoes]
    horarios = [em for _, _, em in saltada.gravador.amostras]
    assert max(horarios) - min(horarios) > timedelta(hours=1)  # o salto só aparece na gravação


async def test_pausado_nao_e_checado(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    pausado = _alvo(1, estado=Estado.PAUSADO)
    ativo = _alvo(2)
    cena.agendador.adicionar(pausado)
    cena.agendador.adicionar(ativo)
    rodando(cena)
    await cena.relogio.avancar_ate(120)
    assert cena.checagem.vezes(pausado.ip) == []
    cena.agendador.pausar(ativo.id)
    feitas = len(cena.checagem.vezes(ativo.ip))
    await cena.relogio.avancar_ate(240)
    assert len(cena.checagem.vezes(ativo.ip)) == feitas
    assert cena.agendador.estado_de(ativo.id) is Estado.PAUSADO
    cena.agendador.retomar(pausado.id)
    await cena.relogio.avancar_ate(300)
    assert cena.checagem.vezes(pausado.ip) != []
    estados = [(m.dados["id"], m.dados["estado"]) for _, m in cena.barramento.do_tipo("estado")]
    assert (ativo.id, "pausado") in estados
    assert (pausado.id, "desconhecido") in estados


async def test_suspeito_persistido_comeca_online(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1, estado=Estado.SUSPEITO)
    cena.agendador.adicionar(alvo)
    assert cena.agendador.estado_de(alvo.id) is Estado.ONLINE
    offline = _alvo(2, estado=Estado.OFFLINE)
    cena.agendador.adicionar(offline)
    assert cena.agendador.estado_de(offline.id) is Estado.OFFLINE


async def test_lote_latencias_a_cada_5s(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    a, b = _alvo(1), _alvo(2, critico=False)
    cena.checagem.roteiros[b.ip] = [FALHA]
    cena.agendador.adicionar(a)
    cena.agendador.adicionar(b)
    rodando(cena)
    await cena.relogio.avancar_ate(120)
    lotes = cena.barramento.do_tipo("latencias")
    assert lotes
    for t, m in lotes:
        assert t % 5 == pytest.approx(0) and t > 0
        assert m.dados["lote"]  # nunca publica lote vazio
        janela = {ip for te, ip in cena.checagem.execucoes if t - 5 < te <= t}
        ids = {i for i, _ in m.dados["lote"]}
        assert ids == {x.id for x in (a, b) if x.ip in janela}
        for i, ms in m.dados["lote"]:
            assert ms == (1.0 if i == a.id else None)
    assert len(lotes) < 120 / 5  # só nas janelas com checagem


async def test_guarda_recusa_alvo_e_nao_agenda(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    fora = Alvo(
        id="fora",
        ip=FORA,
        porta=None,
        checagem="icmp",
        intervalo_s=15,
        critico=True,
        estado=Estado.ONLINE,
    )
    cena.agendador.adicionar(fora)
    rodando(cena)
    await cena.relogio.avancar_ate(60)
    assert cena.checagem.execucoes == []
    recusas = cena.barramento.do_tipo("alvo_recusado")
    assert len(recusas) == 1
    assert recusas[0][1].dados["id"] == "fora"
    assert recusas[0][1].dados["motivo"]
    assert cena.agendador.estado_de("fora") is None


async def test_atualizar_para_destino_proibido_remove(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(30)
    feitas = len(cena.checagem.execucoes)
    alvo.ip = "10.99.127.255"  # broadcast da sub-rede
    cena.agendador.atualizar(alvo)
    await cena.relogio.avancar_ate(120)
    assert len(cena.checagem.execucoes) == feitas
    assert cena.barramento.do_tipo("alvo_recusado")


async def test_atualizar_muda_intervalo(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1, critico=False)
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(120)
    alvo.intervalo_s = 15
    alvo.critico = True
    cena.agendador.atualizar(alvo)
    inicio = len(cena.checagem.execucoes)
    await cena.relogio.avancar_ate(420)
    assert len(cena.checagem.execucoes) - inicio >= 15


async def test_amostras_gravadas_com_horario_de_parede(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(60)
    assert len(cena.gravador.amostras) == len(cena.checagem.execucoes) > 0
    assert all(em.tzinfo is not None for _, _, em in cena.gravador.amostras)


async def test_cancelar_encerra_checagens_em_voo_e_descarrega() -> None:
    cena = _cena()
    cena.checagem.trava = asyncio.Event()  # checagens nunca terminam
    for n in range(80):
        cena.agendador.adicionar(_alvo(n))
    tarefa = asyncio.create_task(cena.agendador.executar())
    await cena.relogio.avancar_ate(30)
    assert 0 < len(cena.checagem.execucoes) <= 50  # no máximo 50 em voo
    tarefa.cancel()
    with pytest.raises(asyncio.CancelledError):
        await tarefa
    assert cena.gravador.descargas == 1
    pendentes = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    assert pendentes == []


async def test_falha_do_gravador_nao_para_o_agendador(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()

    async def explode(id: str, t: Transicao, em: datetime, causa: str | None = None) -> None:
        raise RuntimeError("banco fora")

    cena.gravador.registrar_transicao = explode  # type: ignore[method-assign]
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(120)
    assert len(cena.checagem.vezes(alvo.ip)) >= 5
    assert any(m.dados["estado"] == "offline" for _, m in cena.barramento.do_tipo("estado"))


async def test_reinicia_depois_de_cancelado() -> None:
    cena = _cena()
    cena.checagem.trava = asyncio.Event()
    for n in range(80):
        cena.agendador.adicionar(_alvo(n))
    tarefa = asyncio.create_task(cena.agendador.executar())
    await cena.relogio.avancar_ate(30)
    tarefa.cancel()
    with pytest.raises(asyncio.CancelledError):
        await tarefa
    cena.checagem.trava = None
    cena.checagem.execucoes.clear()
    tarefa = asyncio.create_task(cena.agendador.executar())
    await cena.relogio.avancar_ate(60)
    assert {ip for _, ip in cena.checagem.execucoes} == {_alvo(n).ip for n in range(80)}
    tarefa.cancel()
    with pytest.raises(asyncio.CancelledError):
        await tarefa


# ---- Fix round 1 ---------------------------------------------------------------------------


@dataclass
class GravadorLento(GravadorFalso):
    """A primeira gravação de transição fica presa até ``liberar``; anota a ordem das chamadas."""

    liberar: asyncio.Event = field(default_factory=asyncio.Event)
    chamadas: list[str] = field(default_factory=list)

    async def registrar_transicao(
        self, id: str, t: Transicao, em: datetime, causa: str | None = None
    ) -> None:
        if not self.transicoes and not self.chamadas:
            self.chamadas.append("primeira")
            await self.liberar.wait()
        self.transicoes.append((id, t, em))
        self.chamadas.append(f"transicao:{t.para.value}")

    async def descarregar(self) -> None:
        self.chamadas.append("descarregar")
        await super().descarregar()


def _cena_lenta() -> tuple[Cena, GravadorLento]:
    cena = _cena()
    lento = GravadorLento()
    cena.agendador._gravador = lento  # noqa: SLF001 - injeta o gravador lento
    return cena, lento


async def _ate_primeira_execucao(cena: Cena, ip: str) -> float:
    await cena.relogio.avancar(0)  # assenta o laço (tarefas recém-criadas)
    while not cena.checagem.vezes(ip):
        prazo = cena.relogio.proximo_prazo()
        assert prazo is not None
        await cena.relogio.avancar_ate(prazo)
    return cena.checagem.vezes(ip)[0]


async def test_transicoes_gravadas_em_ordem_com_pausa_no_meio(
    rodando: Callable[[Cena], None],
) -> None:
    cena, lento = _cena_lenta()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    t0 = await _ate_primeira_execucao(cena, alvo.ip)
    await cena.relogio.avancar_ate(t0 + 1)  # suspeito: gravação presa
    cena.agendador.pausar(alvo.id)
    cena.agendador.retomar(alvo.id)
    cena.agendador.pausar(alvo.id)
    await cena.relogio.avancar_ate(t0 + 2)
    lento.liberar.set()
    await cena.relogio.avancar_ate(t0 + 3)
    assert [t.para for _, t, _ in lento.transicoes] == [
        Estado.SUSPEITO,
        Estado.PAUSADO,
        Estado.DESCONHECIDO,
        Estado.PAUSADO,
    ]
    publicadas = [m.dados["estado"] for _, m in cena.barramento.do_tipo("estado")]
    assert publicadas == [t.para.value for _, t, _ in lento.transicoes]


async def test_cancelar_durante_gravacao_de_transicao_persiste() -> None:
    cena, lento = _cena_lenta()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA]
    cena.agendador.adicionar(alvo)
    tarefa = asyncio.create_task(cena.agendador.executar())
    t0 = await _ate_primeira_execucao(cena, alvo.ip)
    await cena.relogio.avancar_ate(t0 + 1)
    assert lento.chamadas == ["primeira"]
    tarefa.cancel()
    for _ in range(5):
        await asyncio.sleep(0)
    tarefa.cancel()  # segundo cancelamento não pode pular a drenagem
    lento.liberar.set()
    with pytest.raises(asyncio.CancelledError):
        await tarefa
    # R18: ``executar`` só termina depois da drenagem, mesmo com cancelamentos repetidos
    assert lento.chamadas == ["primeira", "transicao:suspeito", "descarregar"]


async def test_cancelamentos_repetidos_aguardam_a_drenagem() -> None:
    cena, lento = _cena_lenta()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA]
    cena.agendador.adicionar(alvo)
    tarefa = asyncio.create_task(cena.agendador.executar())
    t0 = await _ate_primeira_execucao(cena, alvo.ip)
    await cena.relogio.avancar_ate(t0 + 1)
    for _ in range(4):  # cancela de novo a cada volta enquanto a gravação está presa
        tarefa.cancel()
        for _ in range(3):
            await asyncio.sleep(0)
    assert not tarefa.done()
    lento.liberar.set()
    with pytest.raises(asyncio.CancelledError):
        await tarefa
    assert lento.chamadas == ["primeira", "transicao:suspeito", "descarregar"]


async def test_adicionado_com_laco_rodando_checa_em_ate_5s(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    rodando(cena)
    await cena.relogio.avancar_ate(10)
    novos = [_alvo(n, critico=False) for n in range(20)]
    for a in novos:
        cena.agendador.adicionar(a)
    await cena.relogio.avancar_ate(15 + 1e-9)
    assert {ip for _, ip in cena.checagem.execucoes} == {a.ip for a in novos}


async def test_carregado_antes_de_iniciar_espalha_no_intervalo(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    for n in range(20):
        cena.agendador.adicionar(_alvo(n, critico=False))
    rodando(cena)
    await cena.relogio.avancar_ate(60)
    primeiras = {ip: t for t, ip in reversed(cena.checagem.execucoes)}
    assert len(primeiras) == 20
    assert max(primeiras.values()) > 5.0


async def test_atualizar_suspeito_mantem_reconfirmacao(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1, critico=False)
    cena.checagem.roteiros[alvo.ip] = [FALHA, OK]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    t0 = await _ate_primeira_execucao(cena, alvo.ip)
    await cena.relogio.avancar_ate(t0 + 1)
    cena.agendador.atualizar(alvo)
    await cena.relogio.avancar_ate(t0 + 7)
    vezes = cena.checagem.vezes(alvo.ip)
    assert vezes[1] == pytest.approx(t0 + 1 + 5)
    assert cena.limitador.pedidos[1] == (1, True)


async def _em_voo(cena: Cena, alvo: Alvo) -> float:
    cena.checagem.trava = asyncio.Event()
    cena.agendador.adicionar(alvo)
    return await _ate_primeira_execucao(cena, alvo.ip)


async def _soltar(cena: Cena, ate: float) -> None:
    assert cena.checagem.trava is not None
    cena.checagem.trava.set()
    await cena.relogio.avancar_ate(ate)


async def test_pausar_com_checagem_em_voo(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA]
    rodando(cena)
    t0 = await _em_voo(cena, alvo)
    cena.agendador.pausar(alvo.id)
    await _soltar(cena, t0 + 120)
    assert cena.checagem.vezes(alvo.ip) == [t0]
    assert cena.gravador.amostras == []
    assert [t.para for _, t, _ in cena.gravador.transicoes] == [Estado.PAUSADO]


async def test_remover_com_checagem_em_voo(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    rodando(cena)
    t0 = await _em_voo(cena, alvo)
    cena.agendador.remover(alvo.id)
    await _soltar(cena, t0 + 120)
    assert cena.checagem.vezes(alvo.ip) == [t0]
    assert cena.gravador.amostras == []


async def test_atualizar_com_checagem_em_voo(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    rodando(cena)
    t0 = await _em_voo(cena, alvo)
    novo = replace(alvo, ip="10.99.9.9")
    cena.agendador.atualizar(novo)
    await _soltar(cena, t0 + 60)
    assert cena.checagem.vezes(alvo.ip) == [t0]  # resultado antigo descartado, sem reagendar
    assert all(i == alvo.id for i, _, _ in cena.gravador.amostras)
    assert len(cena.gravador.amostras) == len(cena.checagem.vezes(novo.ip)) > 0


async def test_retomar_com_checagem_em_voo(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA]
    rodando(cena)
    t0 = await _em_voo(cena, alvo)
    cena.agendador.pausar(alvo.id)
    cena.agendador.retomar(alvo.id)
    await _soltar(cena, t0 + 1)
    # a falha antiga não conta: nada de suspeito vindo dela
    assert [t.para for _, t, _ in cena.gravador.transicoes] == [
        Estado.PAUSADO,
        Estado.DESCONHECIDO,
    ]
    await cena.relogio.avancar_ate(t0 + 40)
    assert len(cena.checagem.vezes(alvo.ip)) >= 2  # reagendado pelo fim da checagem


# ---- Task 9: causa da pausa e espera das gravações -----------------------------------------


async def test_pausar_e_retomar_com_causa_e_aguardar_gravacoes() -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.agendador.adicionar(alvo)
    cena.agendador.pausar(alvo.id, causa="fora_das_subredes")
    await cena.agendador.aguardar_gravacoes()
    assert [t.para for _, t, _ in cena.gravador.transicoes] == [Estado.PAUSADO]
    assert cena.gravador.causas == ["fora_das_subredes"]
    cena.agendador.retomar(alvo.id, causa="manual")
    await cena.agendador.aguardar_gravacoes()
    assert cena.gravador.causas == ["fora_das_subredes", "manual"]
    assert cena.agendador.estado_de(alvo.id) is Estado.DESCONHECIDO


async def test_aguardar_gravacoes_sem_nada_pendente_retorna() -> None:
    cena = _cena()
    await asyncio.wait_for(cena.agendador.aguardar_gravacoes(), timeout=1.0)
    assert cena.gravador.transicoes == []
    assert cena.agendador._escritor is None  # nada foi enfileirado: nenhum escritor criado


# ---- Task 10: lotes (R17) e retomada rápida (R13) ------------------------------------------


class AgendadorContado(Agendador):
    recalculos = 0

    def recalcular(self) -> None:
        self.recalculos += 1
        super().recalcular()


def _cena_contada() -> tuple[Cena, AgendadorContado]:
    cena = _cena()
    contado = AgendadorContado(
        guarda=Guarda([REDE]),
        limitador=cena.limitador,
        relogio=cena.relogio,
        barramento=cena.barramento,
        gravador=cena.gravador,
        checagens=lambda _tipo: cena.checagem,
        rng=random.Random(7),  # noqa: S311 - jitter determinístico no teste
        agora_parede=lambda: INICIO_PAREDE,
    )
    cena.agendador = contado
    return cena, contado


async def test_adicionar_lote_recalcula_uma_vez() -> None:
    cena, contado = _cena_contada()
    contado.adicionar_lote([_alvo(n) for n in range(30)])
    assert contado.recalculos == 1
    assert all(contado.estado_de(f"eq{n}") is Estado.ONLINE for n in range(30))


async def test_adicionar_lote_de_5000_rapido_e_com_um_recalcular() -> None:
    _, contado = _cena_contada()
    alvos = [_alvo(n, critico=n % 5 == 0) for n in range(5000)]
    inicio = time.perf_counter()
    contado.adicionar_lote(alvos)
    assert time.perf_counter() - inicio < 2.0  # folga para máquina lenta; guarda o O(n²)
    assert contado.recalculos == 1
    assert contado.estado_de("eq4999") is Estado.ONLINE


async def test_adicionar_lote_recusa_e_atualiza_como_adicionar() -> None:
    cena = _cena()
    cena.agendador.adicionar(_alvo(1, intervalo=30.0))
    fora = replace(_alvo(2), ip=FORA)
    cena.agendador.adicionar_lote([_alvo(1, intervalo=45.0), fora, _alvo(3)])
    assert cena.agendador.intervalo_efetivo("eq1") == 45.0
    assert cena.agendador.estado_de("eq2") is None
    assert cena.agendador.estado_de("eq3") is Estado.ONLINE
    assert [m.dados["id"] for _, m in cena.barramento.do_tipo("alvo_recusado")] == ["eq2"]


async def test_adicionar_lote_com_laco_rodando_checa_em_ate_5s(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    rodando(cena)
    await cena.relogio.avancar_ate(10)
    novos = [_alvo(n, critico=False) for n in range(20)]
    cena.agendador.adicionar_lote(novos)
    await cena.relogio.avancar_ate(15 + 1e-9)
    assert {ip for _, ip in cena.checagem.execucoes} == {a.ip for a in novos}


async def test_atualizar_lote_recalcula_uma_vez() -> None:
    cena, contado = _cena_contada()
    contado.adicionar_lote([_alvo(n, critico=False) for n in range(10)])
    contado.recalculos = 0
    contado.atualizar_lote([_alvo(n, critico=False, intervalo=120.0) for n in range(10)])
    assert contado.recalculos == 1
    assert all(contado.intervalo_efetivo(f"eq{n}") == 120.0 for n in range(10))


async def test_retomar_com_laco_rodando_checa_em_ate_5s(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvos = [_alvo(n, critico=False) for n in range(20)]
    cena.agendador.adicionar_lote(alvos)
    for a in alvos:
        cena.agendador.pausar(a.id)
    rodando(cena)
    await cena.relogio.avancar_ate(100)
    assert cena.checagem.execucoes == []
    for a in alvos:
        cena.agendador.retomar(a.id)
    await cena.relogio.avancar_ate(105 + 1e-9)
    assert {ip for _, ip in cena.checagem.execucoes} == {a.ip for a in alvos}


async def test_pausar_lote_recalcula_uma_vez_e_publica_cada_pausa() -> None:
    cena, contado = _cena_contada()
    contado.adicionar_lote([_alvo(n) for n in range(10)])
    contado.recalculos = 0
    ids = [f"eq{n}" for n in range(5)]
    contado.pausar_lote([*ids, "inexistente"], causa="fora_das_subredes")
    await contado.aguardar_gravacoes()
    assert contado.recalculos == 1
    estados = [contado.estado_de(f"eq{n}") for n in range(10)]
    assert estados == [Estado.PAUSADO] * 5 + [Estado.ONLINE] * 5
    assert cena.gravador.causas == ["fora_das_subredes"] * 5
    assert [m.dados["id"] for _, m in cena.barramento.do_tipo("estado")] == ids


# ---- Revisão final: latência configurável, recusa vira pausa, revalidação por sonda --------


async def test_latencia_instavel_configuravel(rodando: Callable[[Cena], None]) -> None:
    cena = _cena(latencia_instavel_ms=50.0)
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [ResultadoChecagem(ok=True, latencia_ms=100.0)]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(30)
    assert cena.agendador.estado_de(alvo.id) is Estado.INSTAVEL


async def test_latencia_abaixo_do_limite_padrao_fica_online(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [ResultadoChecagem(ok=True, latencia_ms=100.0)]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(30)
    assert cena.agendador.estado_de(alvo.id) is Estado.ONLINE


async def test_recusado_ao_adicionar_vira_pausado_fora_das_subredes() -> None:
    cena = _cena()
    cena.agendador.adicionar(replace(_alvo(1), ip=FORA, estado=Estado.DESCONHECIDO))
    await cena.agendador.aguardar_gravacoes()
    assert [(i, t.de, t.para) for i, t, _ in cena.gravador.transicoes] == [
        ("eq1", Estado.DESCONHECIDO, Estado.PAUSADO)
    ]
    assert cena.gravador.causas == ["fora_das_subredes"]
    estados = [m.dados for _, m in cena.barramento.do_tipo("estado")]
    assert [(d["id"], d["estado"]) for d in estados] == [("eq1", "pausado")]
    assert cena.agendador.estado_de("eq1") is None


async def test_recusado_ja_pausado_nao_gera_transicao() -> None:
    cena = _cena()
    cena.agendador.adicionar(replace(_alvo(1), ip=FORA, estado=Estado.PAUSADO))
    await cena.agendador.aguardar_gravacoes()
    assert cena.gravador.transicoes == []
    assert cena.barramento.do_tipo("estado") == []
    assert len(cena.barramento.do_tipo("alvo_recusado")) == 1


async def test_atualizar_para_destino_proibido_pausa_com_causa() -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.agendador.adicionar(alvo)
    cena.agendador.atualizar(replace(alvo, ip=FORA))
    await cena.agendador.aguardar_gravacoes()
    assert [(t.de, t.para) for _, t, _ in cena.gravador.transicoes] == [
        (Estado.ONLINE, Estado.PAUSADO)
    ]
    assert cena.gravador.causas == ["fora_das_subredes"]
    assert cena.agendador.estado_de("eq1") is None


async def test_sonda_revalida_na_guarda_viva_e_pausa_sem_sondar(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(30)
    feitas = len(cena.checagem.execucoes)
    assert feitas >= 1
    # a sub-rede sai da Guarda viva sem passar pela API (corrida): a próxima sonda é barrada
    cena.guarda.atualizar([IPv4Network("10.99.128.0/17")])
    await cena.relogio.avancar_ate(120)
    await cena.agendador.aguardar_gravacoes()
    assert len(cena.checagem.execucoes) == feitas
    assert [t.para for _, t, _ in cena.gravador.transicoes][-1] is Estado.PAUSADO
    assert cena.gravador.causas[-1] == "fora_das_subredes"
    assert cena.agendador.estado_de(alvo.id) is None


async def test_sonda_usa_destino_revalidado(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    alvo = _alvo(1)
    validados: list[str] = []
    original = cena.guarda.validar

    def espiao(ip: object, porta: int | None, protocolo: str) -> DestinoAutorizado:
        validados.append(str(ip))
        return original(ip, porta, protocolo)  # type: ignore[arg-type]

    cena.guarda.validar = espiao  # type: ignore[method-assign]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(40)
    # uma validação no cadastro + uma antes de cada sonda
    assert len(validados) == 1 + len(cena.checagem.execucoes)


# ---- Fase 3: alvos passivos do gravador (§9.3, §9.7) ----------------------------------------

CAUSA_GRAVADOR = "sem leitura do gravador"


def _camera(n: int, estado: Estado = Estado.ONLINE, ip: str | None = None) -> Alvo:
    # câmera atrás do gravador: o IP pode até ser de uma rede interna não declarada
    return Alvo(
        id=f"cam{n}",
        ip=ip or f"10.99.50.{n + 1}",
        porta=None,
        checagem="gravador",
        intervalo_s=15.0,
        critico=False,
        estado=estado,
    )


def _cena_sem_checagem_gravador() -> tuple[Cena, list[str]]:
    cena = _cena()
    pedidas: list[str] = []

    def checagens(tipo: str) -> ChecagemFalsa:
        pedidas.append(tipo)
        return cena.checagem

    cena.agendador._checagens = checagens  # type: ignore[assignment]
    return cena, pedidas


async def test_alvo_gravador_nao_e_agendado(rodando: Callable[[Cena], None]) -> None:
    cena, pedidas = _cena_sem_checagem_gravador()
    cena.agendador.adicionar(_camera(1))
    cena.agendador.adicionar(_camera(2, ip="192.168.254.10"))  # fora das sub-redes: sem guarda
    rodando(cena)
    await cena.relogio.avancar_ate(60)
    assert cena.checagem.execucoes == []
    assert cena.limitador.pedidos == []
    assert pedidas == []  # nem chega a pedir uma checagem ativa
    assert cena.agendador.estado_de("cam1") is Estado.ONLINE
    assert cena.agendador.estado_de("cam2") is Estado.ONLINE
    assert cena.barramento.do_tipo("alvo_recusado") == []
    assert cena.barramento.do_tipo("estado") == []


async def test_alvo_gravador_nao_entra_no_orcamento() -> None:
    cena = _cena(taxa=1)
    for n in range(100):
        cena.agendador.adicionar(_camera(n))
    assert cena.agendador.intervalo_efetivo("cam1") == pytest.approx(15.0)
    assert cena.agendador.tempo_max_deteccao_s() == 0.0


async def test_aplicar_externo_tres_falhas_vai_offline() -> None:
    cena = _cena()
    cena.agendador.adicionar(_camera(1))
    for _ in range(3):
        cena.agendador.aplicar_externo("cam1", FALHA)
    await cena.agendador.aguardar_gravacoes()
    assert cena.agendador.estado_de("cam1") is Estado.OFFLINE
    estados = [m.dados["estado"] for _, m in cena.barramento.do_tipo("estado")]
    assert estados == ["suspeito", "offline"]
    assert [t.para for _, t, _ in cena.gravador.transicoes] == [Estado.SUSPEITO, Estado.OFFLINE]
    assert len(cena.gravador.amostras) == 3  # amostra gravada como numa checagem própria
    assert cena.checagem.execucoes == []


async def test_aplicar_externo_ok_publica_latencia_no_lote(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    cena.agendador.adicionar(_camera(1, estado=Estado.DESCONHECIDO))
    rodando(cena)
    cena.agendador.aplicar_externo("cam1", OK)
    await cena.relogio.avancar_ate(6)
    assert cena.agendador.estado_de("cam1") is Estado.ONLINE
    lotes = [m.dados["lote"] for _, m in cena.barramento.do_tipo("latencias")]
    assert ["cam1", 1.0] in lotes[0]


async def test_aplicar_externo_ignora_pausado_desconhecido_e_ativo() -> None:
    cena = _cena()
    cena.agendador.adicionar(_camera(1, estado=Estado.PAUSADO))
    cena.agendador.adicionar(_alvo(2))
    cena.agendador.aplicar_externo("cam1", FALHA)
    cena.agendador.aplicar_externo("nao-existe", FALHA)
    cena.agendador.aplicar_externo("eq2", FALHA)  # checado pelo próprio agendador
    assert cena.gravador.amostras == []
    assert cena.agendador.estado_de("cam1") is Estado.PAUSADO
    assert cena.agendador.estado_de("eq2") is Estado.ONLINE


async def test_forcar_desconhecido_publica_estado_com_causa() -> None:
    cena = _cena()
    cena.agendador.adicionar_lote([_camera(1), _camera(2, estado=Estado.DESCONHECIDO)])
    cena.agendador.forcar_desconhecido(["cam1", "cam2", "nao-existe"], CAUSA_GRAVADOR)
    await cena.agendador.aguardar_gravacoes()
    msgs = [m.dados for _, m in cena.barramento.do_tipo("estado")]
    assert len(msgs) == 1  # cam2 já estava desconhecido
    assert msgs[0]["id"] == "cam1"
    assert msgs[0]["estado"] == "desconhecido"
    assert msgs[0]["causa"] == CAUSA_GRAVADOR
    assert cena.gravador.causas == [CAUSA_GRAVADOR]
    assert cena.agendador.estado_de("cam1") is Estado.DESCONHECIDO
    cena.agendador.aplicar_externo("cam1", OK)  # leitura volta: histerese normal
    assert cena.agendador.estado_de("cam1") is Estado.ONLINE


async def test_mensagem_de_estado_sem_causa_nao_ganha_campo(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.checagem.roteiros[alvo.ip] = [FALHA]
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(20)
    msgs = [m.dados for _, m in cena.barramento.do_tipo("estado")]
    assert msgs and all(set(d) == {"id", "estado", "desde"} for d in msgs)


async def test_atualizar_ativo_para_gravador_para_de_checar(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    alvo = _alvo(1)
    cena.agendador.adicionar(alvo)
    rodando(cena)
    await cena.relogio.avancar_ate(30)
    feitas = len(cena.checagem.execucoes)
    assert feitas >= 1
    cena.agendador.atualizar(replace(alvo, checagem="gravador"))
    await cena.relogio.avancar_ate(120)
    assert len(cena.checagem.execucoes) == feitas
    cena.agendador.atualizar(replace(alvo, checagem="icmp"))  # volta a ser ativo
    await cena.relogio.avancar_ate(200)
    assert len(cena.checagem.execucoes) > feitas


async def test_retomar_gravador_nao_agenda(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    cena.agendador.adicionar(_camera(1, estado=Estado.PAUSADO))
    rodando(cena)
    cena.agendador.retomar("cam1")
    await cena.relogio.avancar_ate(60)
    assert cena.checagem.execucoes == []
    assert cena.agendador.estado_de("cam1") is Estado.DESCONHECIDO


# ---- Fase 4: inalcançável e correlação pelo pai (§5.1) ---------------------------------------


def _filho(
    n: int, pai: str, estado: Estado = Estado.ONLINE, intervalo: float | None = None
) -> Alvo:
    return replace(_alvo(n, estado=estado, intervalo=intervalo), pai_id=pai)


def _camera_de(n: int, pai: str, estado: Estado = Estado.ONLINE) -> Alvo:
    return replace(_camera(n, estado=estado), pai_id=pai)


def _msgs(cena: Cena, id: str) -> list[tuple[float, str, str | None]]:
    return [
        (t, m.dados["estado"], m.dados.get("causa"))
        for t, m in cena.barramento.do_tipo("estado")
        if m.dados["id"] == id
    ]


def _indice(cena: Cena, id: str, estado: str) -> int:
    for i, (_, m) in enumerate(cena.barramento.do_tipo("estado")):
        if m.dados["id"] == id and m.dados["estado"] == estado:
            return i
    raise AssertionError(f"{id} nunca publicou {estado}")


def test_alvo_pai_id_padrao_none() -> None:
    assert _alvo(1).pai_id is None


async def test_filho_cai_com_pai_offline_vira_inalcancavel(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    pai = _alvo(1, estado=Estado.OFFLINE)
    filho = _filho(2, "eq1")
    cena.checagem.roteiros[pai.ip] = [FALHA]
    cena.checagem.roteiros[filho.ip] = [FALHA]
    cena.agendador.adicionar_lote([pai, filho])
    assert cena.agendador.pai_caido("eq2") == "eq1"
    rodando(cena)
    await cena.relogio.avancar_ate(120)
    await cena.agendador.aguardar_gravacoes()
    estados = [(e, c) for _, e, c in _msgs(cena, "eq2")]
    assert estados == [("suspeito", None), ("inalcancavel", "pai:eq1")]  # nunca "offline"
    assert cena.agendador.estado_de("eq2") is Estado.INALCANCAVEL
    assert [t.para for id, t, _ in cena.gravador.transicoes if id == "eq2"] == [
        Estado.SUSPEITO,
        Estado.INALCANCAVEL,
    ]
    assert "pai:eq1" in cena.gravador.causas
    # inalcançável não reconfirma a cada 5 s
    vezes = cena.checagem.vezes(filho.ip)
    assert all(b - a >= 12.0 - 1e-6 for a, b in zip(vezes[2:], vezes[3:], strict=False))


async def test_pai_caido_so_para_offline_ou_inalcancavel() -> None:
    cena = _cena()
    cena.agendador.adicionar_lote(
        [
            _camera(1, estado=Estado.SUSPEITO),
            _camera_de(2, "cam1"),
            _camera(3, estado=Estado.INALCANCAVEL),
            _camera_de(4, "cam3"),
            _camera_de(5, "nao-existe"),
            _camera(6),
        ]
    )
    assert cena.agendador.pai_caido("cam2") is None
    assert cena.agendador.pai_caido("cam4") == "cam3"
    assert cena.agendador.pai_caido("cam5") is None
    assert cena.agendador.pai_caido("cam6") is None
    assert cena.agendador.pai_caido("nao-existe") is None


async def test_cadeia_switch_ap_camera(rodando: Callable[[Cena], None]) -> None:
    cena = _cena()
    switch = _alvo(1, estado=Estado.OFFLINE)
    ap = _filho(2, "eq1")
    camera = _filho(3, "eq2")
    for a in (switch, ap, camera):
        cena.checagem.roteiros[a.ip] = [FALHA]
    cena.agendador.adicionar_lote([switch, ap])
    rodando(cena)
    await cena.relogio.avancar_ate(60)
    cena.agendador.adicionar(camera)  # cai depois do AP
    await cena.relogio.avancar_ate(120)
    assert [(e, c) for _, e, c in _msgs(cena, "eq2")] == [
        ("suspeito", None),
        ("inalcancavel", "pai:eq1"),
    ]
    assert [(e, c) for _, e, c in _msgs(cena, "eq3")] == [
        ("suspeito", None),
        ("inalcancavel", "pai:eq2"),  # causa = pai direto
    ]


async def test_pai_cai_ate_60s_depois_reclassifica_filho() -> None:
    cena = _cena()
    cena.agendador.adicionar_lote([_camera(1), _camera_de(2, "cam1")])
    for _ in range(3):
        cena.agendador.aplicar_externo("cam2", FALHA)
    assert cena.agendador.estado_de("cam2") is Estado.OFFLINE
    await cena.relogio.avancar_ate(50)
    for _ in range(3):
        cena.agendador.aplicar_externo("cam1", FALHA)
    await cena.agendador.aguardar_gravacoes()
    assert [(e, c) for _, e, c in _msgs(cena, "cam2")] == [
        ("suspeito", None),
        ("offline", None),
        ("inalcancavel", "pai:cam1"),
    ]
    assert _indice(cena, "cam1", "offline") < _indice(cena, "cam2", "inalcancavel")
    assert cena.agendador.estado_de("cam2") is Estado.INALCANCAVEL
    ultima = [t for id, t, _ in cena.gravador.transicoes if id == "cam2"][-1]
    assert ultima == Transicao(Estado.OFFLINE, Estado.INALCANCAVEL, causa="pai:cam1")
    assert cena.gravador.causas[-1] == "pai:cam1"


async def test_pai_cai_61s_depois_filho_fica_offline() -> None:
    cena = _cena()
    cena.agendador.adicionar_lote([_camera(1), _camera_de(2, "cam1")])
    for _ in range(3):
        cena.agendador.aplicar_externo("cam2", FALHA)
    await cena.relogio.avancar_ate(61)
    for _ in range(3):
        cena.agendador.aplicar_externo("cam1", FALHA)
    assert cena.agendador.estado_de("cam1") is Estado.OFFLINE
    assert cena.agendador.estado_de("cam2") is Estado.OFFLINE
    assert [e for _, e, _ in _msgs(cena, "cam2")] == ["suspeito", "offline"]


async def test_reclassifica_so_filhos_offline() -> None:
    cena = _cena()
    cena.agendador.adicionar_lote(
        [_camera(1), _camera_de(2, "cam1"), _camera_de(3, "cam1", estado=Estado.PAUSADO)]
    )
    cena.agendador.aplicar_externo("cam2", FALHA)  # suspeito: segue pela própria histerese
    for _ in range(3):
        cena.agendador.aplicar_externo("cam1", FALHA)
    assert cena.agendador.estado_de("cam2") is Estado.SUSPEITO
    assert cena.agendador.estado_de("cam3") is Estado.PAUSADO
    cena.agendador.aplicar_externo("cam2", FALHA)
    cena.agendador.aplicar_externo("cam2", FALHA)
    assert cena.agendador.estado_de("cam2") is Estado.INALCANCAVEL


async def test_pai_volta_filhos_desconhecido_e_checados_em_5s(
    rodando: Callable[[Cena], None],
) -> None:
    cena = _cena()
    pai = _alvo(1, estado=Estado.OFFLINE)
    filho = _filho(2, "eq1", estado=Estado.INALCANCAVEL, intervalo=600.0)
    cena.checagem.roteiros[pai.ip] = [OK]
    cena.checagem.roteiros[filho.ip] = [OK]
    cena.agendador.adicionar_lote([pai, filho])
    rodando(cena)
    await cena.relogio.avancar_ate(120)
    volta = [t for t, e, _ in _msgs(cena, "eq1") if e == "online"]
    assert len(volta) == 1
    msgs = _msgs(cena, "eq2")
    assert [(e, c) for _, e, c in msgs] == [("desconhecido", None), ("online", None)]
    assert msgs[0][0] == pytest.approx(volta[0])
    assert _indice(cena, "eq1", "online") < _indice(cena, "eq2", "desconhecido")
    checagem = [t for t in cena.checagem.vezes(filho.ip) if t >= volta[0]]
    assert checagem and checagem[0] - volta[0] <= 5.0 + 1e-6
    assert msgs[1][0] == pytest.approx(checagem[0])  # "online" só depois da checagem
    pedidos = cena.limitador.pedidos
    assert all(not prioritario for _, prioritario in pedidos)  # prioridade normal


async def _filho_preso(rodando: Callable[[Cena], None]) -> Cena:
    """Pai (passivo) offline com filhos inalcançáveis (um checado); laço rodando."""
    cena = _cena()
    filho = _filho(2, "cam1", estado=Estado.INALCANCAVEL, intervalo=600.0)
    cena.checagem.roteiros[filho.ip] = [OK]
    cena.agendador.adicionar_lote(
        [_camera(1, estado=Estado.OFFLINE), filho, _camera_de(3, "cam1", Estado.INALCANCAVEL)]
    )
    rodando(cena)
    await cena.relogio.avancar_ate(30)
    assert cena.agendador.estado_de("eq2") is Estado.INALCANCAVEL
    return cena


async def _confere_liberado(cena: Cena, inicio: float) -> None:
    assert [e for _, e, _ in _msgs(cena, "eq2")][:1] == ["desconhecido"]
    await cena.relogio.avancar_ate(inicio + 6)
    vezes = [t for t in cena.checagem.vezes(_alvo(2).ip) if t >= inicio]
    assert vezes and vezes[0] - inicio <= 5.0 + 1e-6
    assert cena.agendador.estado_de("eq2") is Estado.ONLINE


async def test_remover_pai_libera_filhos(rodando: Callable[[Cena], None]) -> None:
    cena = await _filho_preso(rodando)
    cena.agendador.remover("cam1")
    assert cena.agendador.estado_de("cam3") is Estado.DESCONHECIDO
    await _confere_liberado(cena, 30)


async def test_trocar_pai_id_libera_filho(rodando: Callable[[Cena], None]) -> None:
    cena = await _filho_preso(rodando)
    cena.agendador.atualizar(_filho(2, "outro", estado=Estado.INALCANCAVEL, intervalo=600.0))
    cena.agendador.atualizar(replace(_camera(3), pai_id=None))
    assert cena.agendador.estado_de("cam3") is Estado.DESCONHECIDO
    await _confere_liberado(cena, 30)


async def test_atualizar_sem_trocar_pai_nao_libera(rodando: Callable[[Cena], None]) -> None:
    cena = await _filho_preso(rodando)
    cena.agendador.atualizar(_camera_de(3, "cam1"))
    assert cena.agendador.estado_de("cam3") is Estado.INALCANCAVEL


async def test_pausar_pai_libera_filhos(rodando: Callable[[Cena], None]) -> None:
    cena = await _filho_preso(rodando)
    cena.agendador.pausar("cam1")
    assert cena.agendador.estado_de("cam3") is Estado.DESCONHECIDO
    await _confere_liberado(cena, 30)


async def test_liberacao_desce_a_cadeia() -> None:
    cena = _cena()
    cena.agendador.adicionar_lote(
        [
            _camera(1, estado=Estado.OFFLINE),
            _camera_de(2, "cam1", Estado.INALCANCAVEL),
            _camera_de(3, "cam2", Estado.INALCANCAVEL),
        ]
    )
    cena.agendador.aplicar_externo("cam1", OK)
    cena.agendador.aplicar_externo("cam1", OK)
    assert cena.agendador.estado_de("cam1") is Estado.ONLINE
    assert cena.agendador.estado_de("cam2") is Estado.DESCONHECIDO
    assert cena.agendador.estado_de("cam3") is Estado.DESCONHECIDO


async def test_ciclo_de_pais_nao_trava() -> None:
    """Dado editado à mão com ciclo: a correlação termina (sem recursão infinita)."""
    cena = _cena()
    cena.agendador.adicionar_lote(
        [
            _camera_de(1, "cam2", Estado.INALCANCAVEL),
            _camera_de(2, "cam1", Estado.INALCANCAVEL),
        ]
    )
    cena.agendador.aplicar_externo("cam1", OK)
    cena.agendador.aplicar_externo("cam1", OK)
    assert cena.agendador.estado_de("cam1") is Estado.ONLINE
    assert cena.agendador.estado_de("cam2") is Estado.DESCONHECIDO
    for _ in range(3):
        cena.agendador.aplicar_externo("cam1", FALHA)
    assert cena.agendador.estado_de("cam1") is Estado.OFFLINE


async def test_forcar_e_liberar_inalcancavel() -> None:
    cena = _cena()
    cena.agendador.adicionar_lote(
        [_camera(1), _camera(2, estado=Estado.PAUSADO), _camera(3, estado=Estado.OFFLINE)]
    )
    cena.agendador.forcar_inalcancavel(["cam1", "cam2", "cam3", "nao-existe"], "nvr")
    await cena.agendador.aguardar_gravacoes()
    assert [(e, c) for _, e, c in _msgs(cena, "cam1")] == [("inalcancavel", "pai:nvr")]
    assert cena.agendador.estado_de("cam2") is Estado.PAUSADO
    assert cena.agendador.estado_de("cam3") is Estado.INALCANCAVEL
    cena.agendador.forcar_inalcancavel(["cam1"], "nvr")  # já inalcançável: nada novo
    assert len(_msgs(cena, "cam1")) == 1
    cena.agendador.liberar_inalcancavel(["cam1", "cam2", "nao-existe"])
    assert [e for _, e, _ in _msgs(cena, "cam1")] == ["inalcancavel", "desconhecido"]
    assert cena.agendador.estado_de("cam2") is Estado.PAUSADO
    assert cena.agendador.estado_de("cam3") is Estado.INALCANCAVEL


def test_estado_inicial_inalcancavel_vira_desconhecido() -> None:
    from sentinela.db.modelos import Equipamento
    from sentinela.monitor.montagem import estado_inicial

    eq = Equipamento(estado="inalcancavel", pausado=False)
    assert estado_inicial(eq) is Estado.DESCONHECIDO
    eq.pausado = True
    assert estado_inicial(eq) is Estado.PAUSADO
    assert estado_inicial(Equipamento(estado="offline", pausado=False)) is Estado.OFFLINE


def test_alvo_de_passa_pai_id() -> None:
    from sentinela.db.modelos import Classe, Equipamento
    from sentinela.monitor.montagem import alvo_de

    eq = Equipamento(
        id="c1",
        ip="10.99.0.9",
        porta=None,
        checagem="gravador",
        estado="online",
        pausado=False,
        pai_id="nvr1",
    )
    classe = Classe(intervalo_s=60, critica=False)
    assert alvo_de(eq, classe).pai_id == "nvr1"
