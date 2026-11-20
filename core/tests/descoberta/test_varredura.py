"""Varredura lenta: só sub-rede permitida, 2 IPs/s, prioridade baixa, uma por vez."""

import asyncio
from collections.abc import AsyncIterator
from ipaddress import IPv4Address
from pathlib import Path

import pytest
from sqlalchemy import select

from sentinela.db.modelos import SubRede
from sentinela.descoberta import varredura
from sentinela.descoberta.ajustes import INTERVALO_VARREDURA, gravar_ajuste
from sentinela.descoberta.fontes.base import Achado
from sentinela.descoberta.varredura import (
    SubRedeInexistente,
    Varredura,
    VarreduraEmAndamento,
    VarreduraNaoPermitida,
)
from sentinela.rede.guarda import DestinoAutorizado
from tests.descoberta.apoio import SUB_COMUM, SUB_VARREDURA, Cena, montar_cena

PEQUENA = "10.99.2.0/29"  # .0 rede, .1–.6 hosts, .7 broadcast


class PingEspiao:
    def __init__(self, cena: Cena, vivos: set[str] | None = None) -> None:
        self.cena = cena
        self.vivos = vivos or set()
        self.chamadas: list[tuple[str, float]] = []

    async def __call__(self, destino: DestinoAutorizado) -> bool:
        assert isinstance(destino, DestinoAutorizado) and destino.protocolo == "icmp"
        self.chamadas.append((str(destino.ip), self.cena.relogio.agora()))
        return str(destino.ip) in self.vivos


class Entregas:
    def __init__(self) -> None:
        self.lotes: list[list[Achado]] = []

    async def __call__(self, achados: list[Achado]) -> None:
        self.lotes.append(achados)

    @property
    def ips(self) -> list[str | None]:
        return [a.ip for lote in self.lotes for a in lote]


@pytest.fixture
async def cena(tmp_path: Path) -> AsyncIterator[Cena]:
    async with montar_cena(tmp_path) as c:
        yield c


async def _sub_rede(cena: Cena, cidr: str, permite: bool = True) -> int:
    async with cena.sessoes() as db:
        existente = await db.scalar(select(SubRede).where(SubRede.cidr == cidr))
        if existente is not None:
            return existente.id
        sub = SubRede(cidr=cidr, permite_varredura=permite)
        db.add(sub)
        await db.commit()
        return sub.id


def _varredura(cena: Cena, ping: PingEspiao, entregas: Entregas | None = None) -> Varredura:
    return Varredura(
        cena.sessoes,
        cena.guarda,
        cena.limitador,
        cena.barramento,
        cena.relogio,
        ping=ping,
        entregar=entregas or Entregas(),
    )


async def _ate_terminar(cena: Cena, v: Varredura, passo: float = 0.5) -> None:
    for _ in range(2000):
        if v.progresso() is None:
            return
        await cena.relogio.avancar(passo)
    raise AssertionError("a varredura não terminou")


async def test_so_sub_rede_permitida(cena: Cena) -> None:
    v = _varredura(cena, PingEspiao(cena))
    comum = await _sub_rede(cena, SUB_COMUM)
    with pytest.raises(VarreduraNaoPermitida):
        await v.iniciar(comum)
    with pytest.raises(SubRedeInexistente):
        await v.iniciar(9999)
    assert v.progresso() is None


async def test_pula_rede_e_broadcast(cena: Cena) -> None:
    ping = PingEspiao(cena, vivos={"10.99.2.3", "10.99.2.5"})
    entregas = Entregas()
    v = _varredura(cena, ping, entregas)
    sub = await _sub_rede(cena, PEQUENA)
    progresso = await v.iniciar(sub)
    assert progresso == {
        "cidr": PEQUENA,
        "feitos": 0,
        "total": 8,
        "achados": 0,
        "origem": "manual",
        "sub_rede_id": sub,
    }
    await _ate_terminar(cena, v)
    assert [ip for ip, _ in ping.chamadas] == [f"10.99.2.{n}" for n in range(1, 7)]
    assert sorted(ip for ip in entregas.ips if ip) == ["10.99.2.3", "10.99.2.5"]
    assert all(a.origem == "varredura" and a.mac is None for lote in entregas.lotes for a in lote)
    fim = cena.barramento.do_tipo("varredura")[-1]
    assert fim["feitos"] == 8 and fim["achados"] == 2 and fim["estado"] == "concluida"


async def test_ritmo_2_ips_por_segundo(cena: Cena) -> None:
    ping = PingEspiao(cena)
    v = _varredura(cena, ping)
    sub = await _sub_rede(cena, SUB_VARREDURA)
    await v.iniciar(sub)
    await cena.relogio.avancar(0)
    await cena.relogio.avancar(5)
    momentos = [t for _, t in ping.chamadas]
    assert 9 <= len(momentos) <= 11
    assert all(b - a >= 0.5 - 1e-9 for a, b in zip(momentos, momentos[1:], strict=False))
    v.cancelar()
    await v.encerrar()


async def test_ritmo_vem_do_ajuste(cena: Cena) -> None:
    async with cena.sessoes() as db:
        await gravar_ajuste(db, INTERVALO_VARREDURA, 1.0)
        await db.commit()
    ping = PingEspiao(cena)
    v = _varredura(cena, ping)
    await v.iniciar(await _sub_rede(cena, SUB_VARREDURA))
    await cena.relogio.avancar(0)
    await cena.relogio.avancar(5)
    assert 5 <= len(ping.chamadas) <= 6
    v.cancelar()
    await v.encerrar()


async def test_cancelar(cena: Cena) -> None:
    ping = PingEspiao(cena)
    v = _varredura(cena, ping)
    await v.iniciar(await _sub_rede(cena, SUB_VARREDURA))
    await cena.relogio.avancar(2)
    assert v.progresso() is not None
    v.cancelar()
    await v.encerrar()
    feitos = len(ping.chamadas)
    assert v.progresso() is None
    await cena.relogio.avancar(10)
    assert len(ping.chamadas) == feitos
    assert cena.barramento.do_tipo("varredura")[-1]["estado"] == "cancelada"
    # depois de cancelar, outra pode começar
    await v.iniciar(await _sub_rede(cena, PEQUENA))
    await _ate_terminar(cena, v)


async def test_uma_por_vez(cena: Cena) -> None:
    v = _varredura(cena, PingEspiao(cena))
    sub = await _sub_rede(cena, SUB_VARREDURA)
    await v.iniciar(sub)
    with pytest.raises(VarreduraEmAndamento):
        await v.iniciar(await _sub_rede(cena, PEQUENA))
    v.cancelar()
    await v.encerrar()


async def test_ficha_baixa(cena: Cena) -> None:
    ping = PingEspiao(cena)
    v = _varredura(cena, ping)
    await v.iniciar(await _sub_rede(cena, PEQUENA))
    await _ate_terminar(cena, v)
    assert cena.limitador.pedidos == [(1, "baixa")] * len(ping.chamadas)


async def test_falha_do_ping_nao_derruba_a_varredura(cena: Cena) -> None:
    async def ping(destino: DestinoAutorizado) -> bool:
        if destino.ip == IPv4Address("10.99.2.2"):
            raise OSError("rede")
        return destino.ip == IPv4Address("10.99.2.4")

    entregas = Entregas()
    v = Varredura(
        cena.sessoes,
        cena.guarda,
        cena.limitador,
        cena.barramento,
        cena.relogio,
        ping=ping,
        entregar=entregas,
    )
    await v.iniciar(await _sub_rede(cena, PEQUENA))
    await _ate_terminar(cena, v)
    assert entregas.ips == ["10.99.2.4"]


async def test_sub_rede_fora_da_guarda_nao_envia_nada(cena: Cena) -> None:
    ping = PingEspiao(cena)
    v = _varredura(cena, ping)
    # permitida no banco, mas a Guarda viva não a conhece (removida no meio): nada sai
    await v.iniciar(await _sub_rede(cena, "10.99.3.0/29"))
    await _ate_terminar(cena, v)
    assert ping.chamadas == []
    assert asyncio.all_tasks() == {asyncio.current_task()}


async def test_atraso_nao_vira_rajada(cena: Cena) -> None:
    """Ping lento e entrega lenta só deixam a varredura mais lenta, nunca acima do ritmo."""
    envios: list[float] = []

    async def ping_lento(destino: DestinoAutorizado) -> bool:
        envios.append(cena.relogio.agora())
        if destino.ip == IPv4Address("10.99.2.1"):
            await cena.relogio.dormir(3.0)  # primeiro IP demora 6 intervalos
        return destino.ip == IPv4Address("10.99.2.2")

    async def entrega_lenta(_achados: list[Achado]) -> None:
        await cena.relogio.dormir(2.0)

    v = Varredura(
        cena.sessoes,
        cena.guarda,
        cena.limitador,
        cena.barramento,
        cena.relogio,
        ping=ping_lento,
        entregar=entrega_lenta,
    )
    await v.iniciar(await _sub_rede(cena, PEQUENA))
    await _ate_terminar(cena, v, passo=0.25)
    assert len(envios) == 6
    assert all(b - a >= 0.5 - 1e-9 for a, b in zip(envios, envios[1:], strict=False))
    # em qualquer janela de 1 s, no máximo 2 envios (2 IPs/s)
    assert all(sum(t <= e < t + 1.0 for e in envios) <= 2 for t in envios)


async def test_permissao_revogada_no_banco_para_a_varredura(cena: Cena) -> None:
    """Sem ``permite_varredura`` no meio da varredura: no máximo mais alguns IPs e para."""
    ping = PingEspiao(cena)
    v = _varredura(cena, ping)
    sub = await _sub_rede(cena, SUB_VARREDURA)
    await v.iniciar(sub)
    await cena.relogio.avancar(0)
    await cena.relogio.avancar(2)
    assert v.progresso() is not None
    async with cena.sessoes() as db:
        s = await db.get(SubRede, sub)
        assert s is not None
        s.permite_varredura = False
        await db.commit()
    antes = len(ping.chamadas)
    for _ in range(200):  # a releitura roda em paralelo, com E/S real do banco
        if v.progresso() is None:
            break
        await cena.relogio.avancar(0.5)
        await asyncio.sleep(0.01)
    assert v.progresso() is None
    assert len(ping.chamadas) - antes <= varredura.VERIFICAR_A_CADA_IPS + 2
    assert cena.barramento.do_tipo("varredura")[-1]["estado"] == "cancelada"


async def test_revogar_cancela_so_a_varredura_da_sub_rede(cena: Cena) -> None:
    ping = PingEspiao(cena)
    v = _varredura(cena, ping)
    sub = await _sub_rede(cena, SUB_VARREDURA)
    outra = await _sub_rede(cena, PEQUENA)
    await v.iniciar(sub)
    await cena.relogio.avancar(1)
    assert await v.revogar(outra) is False  # outra sub-rede: segue rodando
    assert v.progresso() is not None
    assert await v.revogar(sub) is True
    assert v.progresso() is None
    feitos = len(ping.chamadas)
    await cena.relogio.avancar(10)
    assert len(ping.chamadas) == feitos
    assert cena.barramento.do_tipo("varredura")[-1]["estado"] == "cancelada"


async def test_progresso_tem_origem_e_sub_rede(cena: Cena) -> None:
    v = _varredura(cena, PingEspiao(cena))
    sub = await _sub_rede(cena, PEQUENA)
    await v.iniciar(sub, "agendada")
    progresso = v.progresso()
    assert progresso is not None
    assert progresso["origem"] == "agendada" and progresso["sub_rede_id"] == sub
    await _ate_terminar(cena, v)
    fim = cena.barramento.do_tipo("varredura")[-1]
    assert fim["origem"] == "agendada" and fim["sub_rede_id"] == sub


def _com_gancho(cena: Cena, fins: list[tuple[int, str]]) -> Varredura:
    async def ao_terminar(sub_rede_id: int, estado: str) -> None:
        fins.append((sub_rede_id, estado))

    return Varredura(
        cena.sessoes,
        cena.guarda,
        cena.limitador,
        cena.barramento,
        cena.relogio,
        ping=PingEspiao(cena),
        ao_terminar=ao_terminar,
    )


async def test_ao_terminar_uma_vez_com_o_estado(
    cena: Cena, monkeypatch: pytest.MonkeyPatch
) -> None:
    fins: list[tuple[int, str]] = []
    v = _com_gancho(cena, fins)
    pequena = await _sub_rede(cena, PEQUENA)
    await v.iniciar(pequena)
    assert fins == []  # só no fim
    await _ate_terminar(cena, v)
    assert fins == [(pequena, "concluida")]
    # cancelada por revogar
    grande = await _sub_rede(cena, SUB_VARREDURA)
    await v.iniciar(grande)
    await cena.relogio.avancar(2)
    assert await v.revogar(grande) is True
    assert fins == [(pequena, "concluida"), (grande, "cancelada")]

    # falhou: o limitador estoura no meio
    async def estoura(*_a: object, **_k: object) -> None:
        raise RuntimeError("limitador")

    monkeypatch.setattr(cena.limitador, "adquirir", estoura)
    await v.iniciar(pequena)
    await _ate_terminar(cena, v)
    assert fins == [(pequena, "concluida"), (grande, "cancelada"), (pequena, "falhou")]
    assert cena.barramento.do_tipo("varredura")[-1]["estado"] == "falhou"


async def test_ao_terminar_com_erro_nao_quebra_a_varredura(
    cena: Cena, caplog: pytest.LogCaptureFixture
) -> None:
    async def quebra(_sub: int, _estado: str) -> None:
        raise RuntimeError("detalhe-interno")

    v = Varredura(
        cena.sessoes,
        cena.guarda,
        cena.limitador,
        cena.barramento,
        cena.relogio,
        ping=PingEspiao(cena),
        ao_terminar=quebra,
    )
    await v.iniciar(await _sub_rede(cena, PEQUENA))
    await _ate_terminar(cena, v)
    assert cena.barramento.do_tipo("varredura")[-1]["estado"] == "concluida"
    assert "RuntimeError" in caplog.text and "detalhe-interno" not in caplog.text
    await v.iniciar(await _sub_rede(cena, PEQUENA))  # a próxima ainda começa
    await _ate_terminar(cena, v)
