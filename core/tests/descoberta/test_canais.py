"""LeitorCanais: estado das câmeras atrás do gravador, lido do gravador (nunca da câmera)."""

import asyncio
import random
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.barramento import Barramento, Mensagem
from sentinela.db.base import Base
from sentinela.db.modelos import Classe, Equipamento, Fonte
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.descoberta.canais import (
    CAUSA_CERTIFICADO_MUDOU,
    CAUSA_CERTIFICADO_NAO_CONFIADO,
    CAUSA_GRAVADOR_MUDO,
    LeitorCanais,
)
from sentinela.descoberta.fontes.base import CertificadoMudou, CertificadoNaoConfiado, ErroColeta
from sentinela.monitor.agendador import Agendador, Alvo
from sentinela.monitor.estados import Estado, ResultadoChecagem, Transicao
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import Guarda
from sentinela.relogio import RelogioFalso

AGORA = datetime(2026, 11, 17, tzinfo=UTC)
F1 = "6f1c0d2e-0000-4000-8000-0000000000f1"
F2 = "6f1c0d2e-0000-4000-8000-0000000000f2"
CAMERAS_F1 = {"cam1": 1, "cam2": 2, "cam3": 3}


class BarramentoGravado(Barramento):
    def __init__(self) -> None:
        super().__init__()
        self.mensagens: list[Mensagem] = []

    def publicar(self, msg: Mensagem) -> None:
        self.mensagens.append(msg)
        super().publicar(msg)

    def estados(self, id: str) -> list[tuple[str, str | None]]:
        return [
            (m.dados["estado"], m.dados.get("causa"))
            for m in self.mensagens
            if m.tipo == "estado" and m.dados["id"] == id
        ]


@dataclass
class GravadorFalso:
    amostras: list[tuple[str, ResultadoChecagem]] = field(default_factory=list)

    async def registrar_transicao(
        self, id: str, t: Transicao, em: datetime, causa: str | None = None
    ) -> None:
        return None

    def acumular_amostra(self, id: str, r: ResultadoChecagem, em: datetime) -> None:
        self.amostras.append((id, r))

    async def descarregar(self) -> None:
        return None


class LimitadorEspiao(Limitador):
    def __init__(self, relogio: RelogioFalso) -> None:
        super().__init__(100.0, relogio)
        self.pedidos: list[tuple[int, str | None]] = []

    async def adquirir(  # type: ignore[override]
        self, custo: int = 1, prioritario: bool = False, *, prioridade: str | None = None
    ) -> None:
        self.pedidos.append((custo, prioridade))


class FonteFalsa:
    """Leitura de canais programável: cada chamada consome o próximo item (o último repete)."""

    def __init__(self, *respostas: dict[int, bool] | Exception | asyncio.Event) -> None:
        self.respostas = list(respostas)
        self.chamadas: list[float] = []
        self.relogio: RelogioFalso | None = None

    async def status_canais(self) -> dict[int, bool]:
        self.chamadas.append(self.relogio.agora() if self.relogio else 0.0)
        r = self.respostas.pop(0) if len(self.respostas) > 1 else self.respostas[0]
        if isinstance(r, asyncio.Event):
            await r.wait()
            return {}
        if isinstance(r, Exception):
            raise r
        return r


@dataclass
class Cena:
    sessoes: async_sessionmaker[AsyncSession]
    relogio: RelogioFalso
    barramento: BarramentoGravado
    gravador: GravadorFalso
    limitador: LimitadorEspiao
    agendador: Agendador
    fontes: dict[str, FonteFalsa]

    def leitor(self, timeout_s: float = 15.0) -> LeitorCanais:
        return LeitorCanais(
            self.sessoes,
            self.agendador,
            self.fontes,
            self.limitador,
            self.relogio,
            timeout_s=timeout_s,
        )

    def estado(self, id: str) -> Estado | None:
        return self.agendador.estado_de(id)


async def _equipamento(
    db: AsyncSession,
    id: str,
    classe: str,
    ip: str,
    *,
    pai: str | None = None,
    canal: int | None = None,
    pausado: bool = False,
) -> None:
    classe_id = await db.scalar(select(Classe.id).where(Classe.slug == classe))
    assert classe_id is not None
    db.add(
        Equipamento(
            id=id,
            nome=id,
            ip=ip,
            classe_id=classe_id,
            checagem="gravador" if pai else "icmp",
            estado="online",
            estado_desde=AGORA,
            criado_em=AGORA,
            pai_id=pai,
            canal=canal,
            pausado=pausado,
        )
    )
    await db.flush()


def _fonte(id: str, tipo: str, equipamento: str | None, *, ativa: bool = True) -> Fonte:
    return Fonte(
        id=id,
        tipo=tipo,
        nome=id,
        host="10.99.0.50",
        porta=80,
        tls=False,
        credencial_cifrada=b"x",
        ativa=ativa,
        intervalo_s=600,
        equipamento_id=equipamento,
    )


@pytest.fixture
async def cena(tmp_path: Path) -> AsyncIterator[Cena]:
    motor = criar_motor(f"sqlite+aiosqlite:///{tmp_path / 'canais.db'}")
    async with motor.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessoes = fabrica_sessao(motor)
    async with sessoes() as db:
        await semear_classes(db)
        await _equipamento(db, "nvr1", "gravador", "10.99.0.50")
        await _equipamento(db, "nvr2", "gravador", "10.99.0.51")
        for cam, canal in CAMERAS_F1.items():
            await _equipamento(db, cam, "camera", f"192.168.254.{canal}", pai="nvr1", canal=canal)
        await _equipamento(db, "cam4", "camera", "192.168.254.1", pai="nvr2", canal=1)
        db.add_all([_fonte(F1, "hikvision", "nvr1"), _fonte(F2, "dahua", "nvr2")])
        await db.commit()
    relogio = RelogioFalso()
    barramento = BarramentoGravado()
    gravador = GravadorFalso()
    limitador = LimitadorEspiao(relogio)
    agendador = Agendador(
        guarda=Guarda([]),
        limitador=limitador,
        relogio=relogio,
        barramento=barramento,
        gravador=gravador,
        rng=random.Random(1),  # noqa: S311 - jitter determinístico no teste
        agora_parede=lambda: AGORA,
    )
    for cam in [*CAMERAS_F1, "cam4"]:
        agendador.adicionar(Alvo(cam, "192.168.254.1", None, "gravador", 15, True, Estado.ONLINE))
    fontes = {F1: FonteFalsa({1: True, 2: False}), F2: FonteFalsa({1: True})}
    try:
        yield Cena(sessoes, relogio, barramento, gravador, limitador, agendador, fontes)
        await agendador.aguardar_gravacoes()
    finally:
        await motor.dispose()


async def _dormindo(relogio: RelogioFalso) -> None:
    """Espera (tempo real) o laço terminar o ciclo e dormir no relógio falso."""
    for _ in range(500):
        if relogio.proximo_prazo() is not None:
            return
        await asyncio.sleep(0.01)
    raise AssertionError("o leitor não voltou a dormir")


async def test_leitor_tres_falhas_de_canal_offline(cena: Cena) -> None:
    leitor = cena.leitor()
    for _ in range(3):
        await leitor.ciclo()
    assert cena.estado("cam1") is Estado.ONLINE
    assert cena.barramento.estados("cam2") == [("suspeito", None), ("offline", None)]
    assert cena.estado("cam2") is Estado.OFFLINE
    # canal ausente da resposta conta como falha daquele filho
    assert cena.estado("cam3") is Estado.OFFLINE
    assert cena.estado("cam4") is Estado.ONLINE
    amostras = [r for id, r in cena.gravador.amostras if id == "cam3"]
    assert len(amostras) == 3 and not any(r.ok for r in amostras)


async def test_leitor_gravador_mudo_leva_filhos_a_desconhecido(cena: Cena) -> None:
    cena.fontes[F1] = FonteFalsa(ErroColeta("o gravador não respondeu a tempo"))
    cena.fontes[F2] = FonteFalsa({1: False})
    await cena.leitor().ciclo()
    for cam in CAMERAS_F1:
        assert cena.estado(cam) is Estado.DESCONHECIDO
        assert cena.barramento.estados(cam) == [("desconhecido", CAUSA_GRAVADOR_MUDO)]
    assert CAUSA_GRAVADOR_MUDO == "gravador sem resposta"
    # o outro gravador segue normalmente
    assert cena.estado("cam4") is Estado.SUSPEITO
    assert all(id == "cam4" for id, _ in cena.gravador.amostras)


async def test_leitor_timeout_do_gravador_leva_filhos_a_desconhecido(cena: Cena) -> None:
    cena.fontes[F1] = FonteFalsa(asyncio.Event())  # nunca responde
    await cena.leitor(timeout_s=0.05).ciclo()
    assert {cena.estado(c) for c in CAMERAS_F1} == {Estado.DESCONHECIDO}
    assert cena.estado("cam4") is Estado.ONLINE


async def test_leitor_erro_inesperado_tambem_vira_desconhecido(cena: Cena) -> None:
    cena.fontes[F1] = FonteFalsa(RuntimeError("bug"))
    await cena.leitor().ciclo()
    assert cena.estado("cam1") is Estado.DESCONHECIDO


async def test_leitor_nao_roda_sem_filhos_aprovados(cena: Cena) -> None:
    async with cena.sessoes() as db:
        # nvr1: filhos pausados; nvr2: o único filho deixa de ser câmera de gravador
        await db.execute(
            update(Equipamento).where(Equipamento.pai_id == "nvr1").values(pausado=True)
        )
        await db.execute(
            update(Equipamento).where(Equipamento.id == "cam4").values(checagem="icmp")
        )
        await db.commit()
    await cena.leitor().ciclo()
    assert cena.fontes[F1].chamadas == []
    assert cena.fontes[F2].chamadas == []
    assert cena.limitador.pedidos == []


async def test_leitor_ignora_fonte_inativa_ou_sem_coletor(cena: Cena) -> None:
    async with cena.sessoes() as db:
        await db.execute(update(Fonte).where(Fonte.id == F1).values(ativa=False))
        await db.commit()
    del cena.fontes[F2]
    await cena.leitor().ciclo()
    assert cena.fontes[F1].chamadas == []
    assert cena.limitador.pedidos == []
    assert cena.estado("cam4") is Estado.ONLINE  # sem coletor: nada é decidido


async def test_leitor_usa_ficha_normal(cena: Cena) -> None:
    leitor = cena.leitor()
    await leitor.ciclo()
    assert cena.limitador.pedidos == [(1, "normal"), (1, "normal")]  # 1 por gravador
    await leitor.ciclo()
    assert len(cena.limitador.pedidos) == 4


async def test_leitor_pega_camera_nova_sem_reiniciar(cena: Cena) -> None:
    leitor = cena.leitor()
    cena.fontes[F2] = FonteFalsa({1: True, 2: False})
    await leitor.ciclo()
    async with cena.sessoes() as db:
        await _equipamento(db, "cam5", "camera", "192.168.254.2", pai="nvr2", canal=2)
        await db.commit()
    cena.agendador.adicionar(
        Alvo("cam5", "192.168.254.2", None, "gravador", 15, True, Estado.ONLINE)
    )
    await leitor.ciclo()
    assert cena.estado("cam5") is Estado.SUSPEITO


async def test_leitor_ritmo_do_intervalo_da_classe_camera(cena: Cena) -> None:
    async with cena.sessoes() as db:
        await db.execute(update(Classe).where(Classe.slug == "camera").values(intervalo_s=5))
        await db.commit()
    fonte = cena.fontes[F1]
    fonte.relogio = cena.relogio
    tarefa = asyncio.create_task(cena.leitor().executar())
    try:
        await _dormindo(cena.relogio)
        for _ in range(2):
            await cena.relogio.avancar(15)
            await _dormindo(cena.relogio)
        assert fonte.chamadas == [0.0, 15.0, 30.0]  # 5 s na classe: mínimo de 15 s
        async with cena.sessoes() as db:
            await db.execute(update(Classe).where(Classe.slug == "camera").values(intervalo_s=40))
            await db.commit()
        await cena.relogio.avancar(15)  # t=45: o ciclo lê o intervalo novo
        await _dormindo(cena.relogio)
        await cena.relogio.avancar(39)
        await _dormindo(cena.relogio)
        assert fonte.chamadas == [0.0, 15.0, 30.0, 45.0]
        await cena.relogio.avancar(1)
        await _dormindo(cena.relogio)
        assert fonte.chamadas == [0.0, 15.0, 30.0, 45.0, 85.0]
    finally:
        tarefa.cancel()
        with pytest.raises(asyncio.CancelledError):
            await tarefa


# ---- proteção por ciclo e certificado (R7) ---------------------------------------------------


async def test_leitor_sobrevive_a_excecao_inesperada_no_ciclo(
    cena: Cena, caplog: pytest.LogCaptureFixture
) -> None:
    leitor = cena.leitor()
    original = leitor.ciclo
    falhas = [RuntimeError("detalhe interno")]

    async def ciclo_instavel() -> float:
        if falhas:
            raise falhas.pop()
        return await original()

    leitor.ciclo = ciclo_instavel  # type: ignore[method-assign]
    tarefa = asyncio.create_task(leitor.executar())
    try:
        await _dormindo(cena.relogio)
        await cena.relogio.avancar(15)
        await _dormindo(cena.relogio)
        assert not tarefa.done()  # o laço continuou depois da exceção
        assert len(cena.fontes[F1].chamadas) == 1
        assert "detalhe interno" not in caplog.text
        assert "ciclo da leitura de canais falhou" in caplog.text
    finally:
        tarefa.cancel()
        with pytest.raises(asyncio.CancelledError):
            await tarefa


async def test_leitor_excecao_de_um_gravador_nao_deixa_o_outro_orfao(cena: Cena) -> None:
    original = cena.agendador.aplicar_externo

    def aplicar(id: str, r: ResultadoChecagem) -> None:
        if id == "cam1":
            raise RuntimeError("bug")
        original(id, r)

    cena.agendador.aplicar_externo = aplicar  # type: ignore[method-assign]
    await cena.leitor().ciclo()  # não levanta
    # o outro gravador terminou a leitura no mesmo ciclo
    assert [id for id, _ in cena.gravador.amostras].count("cam4") == 1
    assert asyncio.all_tasks() == {asyncio.current_task()}


@pytest.mark.parametrize(
    ("erro", "causa"),
    [
        (CertificadoMudou("ab" * 32), CAUSA_CERTIFICADO_MUDOU),
        (CertificadoNaoConfiado("cd" * 32), CAUSA_CERTIFICADO_NAO_CONFIADO),
    ],
)
async def test_leitor_certificado_suspende_leitura_e_registra_erro(
    cena: Cena, erro: ErroColeta, causa: str
) -> None:
    assert causa != CAUSA_GRAVADOR_MUDO
    cena.fontes[F1] = FonteFalsa(erro, {1: True, 2: True, 3: True})
    leitor = cena.leitor()
    await leitor.ciclo()
    for cam in CAMERAS_F1:
        assert cena.barramento.estados(cam) == [("desconhecido", causa)]
    async with cena.sessoes() as db:
        fonte = await db.get(Fonte, F1)
        assert fonte is not None and fonte.ultimo_erro == str(erro)
    # suspenso: não lê mais o gravador até o admin confiar de novo
    await leitor.ciclo()
    assert len(cena.fontes[F1].chamadas) == 1
    assert leitor.suspensa(F1)
    assert cena.estado("cam1") is Estado.DESCONHECIDO
    leitor.retomar(F1)
    await leitor.ciclo()
    assert len(cena.fontes[F1].chamadas) == 2
    assert cena.estado("cam1") is Estado.ONLINE
