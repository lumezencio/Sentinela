"""Mescla dos achados em descobertas: identidade por MAC > IP, canais por gravador+canal."""

from collections.abc import AsyncIterator
from datetime import timedelta
from pathlib import Path

import pytest
from sqlalchemy import select

from sentinela.db.modelos import Auditoria, Descoberta, Equipamento
from sentinela.descoberta.fontes.base import Achado
from sentinela.descoberta.mescla import chave_de, mesclar
from tests.descoberta.apoio import AGORA, Cena, criar_equipamento, criar_fonte, montar_cena

F_MK = "00000000-0000-4000-8000-0000000000a1"
F_SNMP = "00000000-0000-4000-8000-0000000000a2"
F_NVR1 = "00000000-0000-4000-8000-0000000000b1"
F_NVR2 = "00000000-0000-4000-8000-0000000000b2"
M1 = "02:00:00:00:00:01"
M2 = "02:00:00:00:00:02"
M3 = "02:00:00:00:00:03"


class SondadorEspiao:
    def __init__(self, portas: set[int] | None = None, titulo: str | None = None) -> None:
        self.chamadas: list[str] = []
        self.portas = portas if portas is not None else {80, 554}
        self.titulo = titulo

    async def __call__(self, ip: str) -> tuple[set[int], str | None]:
        self.chamadas.append(ip)
        return set(self.portas), self.titulo


@pytest.fixture
async def cena(tmp_path: Path) -> AsyncIterator[Cena]:
    async with montar_cena(tmp_path) as c:
        yield c


async def _descobertas(cena: Cena) -> list[Descoberta]:
    async with cena.sessoes() as db:
        return list((await db.execute(select(Descoberta).order_by(Descoberta.chave))).scalars())


def test_chave_de() -> None:
    assert chave_de(Achado("10.99.1.5", M1, "arp", F_MK)) == M1
    assert chave_de(Achado("10.99.1.5", None, "lldp", F_SNMP)) == "ip:10.99.1.5"
    canal = Achado("192.168.254.2", M1, "gravador_canal", F_NVR1, pai_fonte_id=F_NVR1, canal=3)
    assert chave_de(canal) == f"nvr:{F_NVR1}:3"


async def test_mesmo_mac_duas_fontes_uma_descoberta(cena: Cena) -> None:
    achados = [
        Achado("10.99.1.20", M1, "arp", F_MK, nome="pc-recepcao"),
        Achado(None, M1, "snmp_fdb", F_SNMP, sinais={"porta_switch": "ge-0/1"}),
        Achado("10.99.1.20", None, "lldp", F_SNMP),  # mesmo IP, sem MAC: junta pelo IP
        Achado("10.99.1.20", M1, "dhcp", F_MK, nome="pc-recepcao"),
    ]
    async with cena.sessoes() as db:
        r = await mesclar(db, achados, cena.guarda, AGORA)
        await db.commit()
    [d] = await _descobertas(cena)
    assert r.novas == [d.id] and r.atualizadas == []
    assert d.chave == M1 and d.ip == "10.99.1.20" and d.mac == M1
    assert d.nome_sugerido == "pc-recepcao"
    origens = {(o["fonte_id"], o["origem"]) for o in d.origens}
    assert origens == {(F_MK, "arp"), (F_SNMP, "snmp_fdb"), (F_SNMP, "lldp"), (F_MK, "dhcp")}
    assert d.sinais["fonte"]["porta_switch"] == "ge-0/1"
    assert d.status == "pendente" and d.fora_das_subredes is False

    # segunda coleta igual: a mesma descoberta, sem nova nem alteração relevante
    async with cena.sessoes() as db:
        r2 = await mesclar(db, achados, cena.guarda, AGORA + timedelta(minutes=10))
        await db.commit()
    assert r2.novas == [] and r2.atualizadas == []
    [d2] = await _descobertas(cena)
    assert d2.ultima_vez == AGORA + timedelta(minutes=10) and d2.primeira_vez == AGORA


async def test_mac_conhecido_muda_ip_atualiza_equipamento_e_audita(cena: Cena) -> None:
    async with cena.sessoes() as db:
        eq = await criar_equipamento(db, "PC", "10.99.1.20", mac=M1)
        await db.commit()
    async with cena.sessoes() as db:
        r = await mesclar(db, [Achado("10.99.1.21", M1, "arp", F_MK)], cena.guarda, AGORA)
        await db.commit()
    assert r.equipamentos_atualizados == [eq.id] and r.novas == []
    async with cena.sessoes() as db:
        atual = await db.get(Equipamento, eq.id)
        assert atual is not None and atual.ip == "10.99.1.21" and atual.visto_em == AGORA
        [aud] = (await db.execute(select(Auditoria))).scalars()
    assert aud.usuario_id is None and aud.acao == "equipamento.ip_automatico"
    assert aud.antes == {"ip": "10.99.1.20"} and aud.depois == {"ip": "10.99.1.21"}
    assert await _descobertas(cena) == []


async def test_ip_novo_ocupado_gera_conflito_sem_alterar(cena: Cena) -> None:
    async with cena.sessoes() as db:
        a = await criar_equipamento(db, "A", "10.99.1.20", mac=M1)
        b = await criar_equipamento(db, "B", "10.99.1.21", mac=M2)
        await db.commit()
    async with cena.sessoes() as db:
        r = await mesclar(db, [Achado("10.99.1.21", M1, "arp", F_MK)], cena.guarda, AGORA)
        await db.commit()
    [d] = await _descobertas(cena)
    assert r.conflitos == [d.id] and r.equipamentos_atualizados == []
    assert d.status == "pendente" and d.conflito_com == b.id and d.ip == "10.99.1.21"
    async with cena.sessoes() as db:
        atual = await db.get(Equipamento, a.id)
        assert atual is not None and atual.ip == "10.99.1.20"
        assert (await db.execute(select(Auditoria))).first() is None

    # B sai do IP: na coleta seguinte o IP de A é atualizado e o conflito some da fila
    async with cena.sessoes() as db:
        b_atual = await db.get(Equipamento, b.id)
        assert b_atual is not None
        b_atual.ip = "10.99.1.99"
        await db.commit()
    async with cena.sessoes() as db:
        r = await mesclar(db, [Achado("10.99.1.21", M1, "arp", F_MK)], cena.guarda, AGORA)
        await db.commit()
    assert r.equipamentos_atualizados == [a.id] and r.removidas == [d.id]
    [d] = await _descobertas(cena)
    assert d.status == "aprovada" and d.equipamento_id == a.id and d.conflito_com is None


async def test_equipamento_so_ip_ganha_mac(cena: Cena) -> None:
    async with cena.sessoes() as db:
        so_ip = await criar_equipamento(db, "Impressora", "10.99.1.30")
        outro = await criar_equipamento(db, "Outro", "10.99.1.31")
        await criar_equipamento(db, "Dono do M3", "10.99.1.32", mac=M3)
        await db.commit()
    achados = [
        Achado("10.99.1.30", M2, "arp", F_MK, fabricante="Acme"),
        Achado("10.99.1.31", M3, "arp", F_MK),  # M3 já é de outro equipamento
    ]
    async with cena.sessoes() as db:
        await mesclar(db, achados, cena.guarda, AGORA)
        await db.commit()
    async with cena.sessoes() as db:
        eq = await db.get(Equipamento, so_ip.id)
        assert eq is not None and eq.mac == M2 and eq.fabricante == "Acme"
        eq2 = await db.get(Equipamento, outro.id)
        assert eq2 is not None and eq2.mac is None
        auds = list((await db.execute(select(Auditoria))).scalars())
    assert [(a.acao, a.alvo, a.depois) for a in auds] == [
        ("equipamento.mac_automatico", so_ip.id, {"mac": M2})
    ]


async def test_ignorada_continua_ignorada(cena: Cena) -> None:
    async with cena.sessoes() as db:
        await mesclar(db, [Achado("10.99.1.40", M1, "arp", F_MK)], cena.guarda, AGORA)
        d = await db.scalar(select(Descoberta))
        assert d is not None
        d.status = "ignorada"
        await db.commit()
    depois = AGORA + timedelta(hours=1)
    async with cena.sessoes() as db:
        r = await mesclar(
            db, [Achado("10.99.1.41", M1, "dhcp", F_MK, nome="x")], cena.guarda, depois
        )
        await db.commit()
    assert r.novas == [] and r.atualizadas == []
    [d] = await _descobertas(cena)
    assert d.status == "ignorada" and d.ultima_vez == depois
    assert d.ip == "10.99.1.40"  # nada além de ultima_vez muda


async def test_canal_nao_mescla_por_ip(cena: Cena) -> None:
    async with cena.sessoes() as db:
        db.add_all(
            [
                criar_fonte("hikvision", "10.99.1.50", id=F_NVR1),
                criar_fonte("dahua", "10.99.1.51", id=F_NVR2),
            ]
        )
        # um equipamento comum com o mesmo IP interno não é confundido com a câmera
        await criar_equipamento(db, "Algo", "10.99.1.60", mac=M3)
        await db.commit()
    achados = [
        Achado("192.168.254.2", None, "gravador_canal", F_NVR1, pai_fonte_id=F_NVR1, canal=1),
        Achado("192.168.254.2", None, "gravador_canal", F_NVR2, pai_fonte_id=F_NVR2, canal=1),
        Achado("10.99.1.60", M3, "gravador_canal", F_NVR2, pai_fonte_id=F_NVR2, canal=2),
    ]
    async with cena.sessoes() as db:
        r = await mesclar(db, achados, cena.guarda, AGORA)
        await db.commit()
    ds = await _descobertas(cena)
    assert {d.chave for d in ds} == {f"nvr:{F_NVR1}:1", f"nvr:{F_NVR2}:1", f"nvr:{F_NVR2}:2"}
    assert len(r.novas) == 3
    assert all(d.fora_das_subredes is False and d.classe_sugerida == "camera" for d in ds)
    assert {d.canal for d in ds} == {1, 2}


async def test_canal_liga_gravador_pelo_ip_da_fonte(cena: Cena) -> None:
    async with cena.sessoes() as db:
        nvr = await criar_equipamento(db, "NVR", "10.99.1.50", classe="gravador")
        db.add(criar_fonte("hikvision", "10.99.1.50", id=F_NVR1))
        await db.commit()
    canal = Achado("192.168.254.2", None, "gravador_canal", F_NVR1, pai_fonte_id=F_NVR1, canal=4)
    async with cena.sessoes() as db:
        await mesclar(db, [canal], cena.guarda, AGORA)
        await db.commit()
    [d] = await _descobertas(cena)
    assert d.pai_equipamento_id == nvr.id
    # câmera já aprovada (filha do gravador, mesmo canal): só atualiza visto_em
    async with cena.sessoes() as db:
        cam = await criar_equipamento(
            db, "Cam", "192.168.254.2", classe="camera", checagem="gravador", pai=nvr.id, canal=4
        )
        await db.commit()
    async with cena.sessoes() as db:
        r = await mesclar(db, [canal], cena.guarda, AGORA + timedelta(minutes=5))
        await db.commit()
        atual = await db.get(Equipamento, cam.id)
        assert atual is not None and atual.visto_em == AGORA + timedelta(minutes=5)
    assert r.novas == [] and r.atualizadas == []


async def test_fora_das_subredes_marcado(cena: Cena) -> None:
    async with cena.sessoes() as db:
        await mesclar(db, [Achado("172.16.5.5", M1, "arp", F_MK)], cena.guarda, AGORA)
        await db.commit()
    [d] = await _descobertas(cena)
    assert d.fora_das_subredes is True and d.status == "pendente"


async def test_pendente_classificada_sem_sondar(cena: Cena) -> None:
    espiao = SondadorEspiao()
    achados = [
        Achado("10.99.1.70", M1, "dhcp", F_MK, nome="cam-portaria", fabricante="Hikvision"),
        Achado("172.16.5.5", M2, "arp", F_MK),  # fora das sub-redes: também não sonda
    ]
    async with cena.sessoes() as db:
        await mesclar(db, achados, cena.guarda, AGORA, sondador=espiao)
        await db.commit()
    assert espiao.chamadas == []
    d = next(d for d in await _descobertas(cena) if d.mac == M1)
    assert d.classe_sugerida == "camera" and 0 < d.confianca <= 1
    assert d.sondada_em is None and "portas" not in d.sinais
    motivos = d.sinais["motivos"]
    assert motivos and all({"regra", "descricao", "pontos"} <= m.keys() for m in motivos)


async def test_sub_rede_com_varredura_sonda_uma_vez_por_24h(cena: Cena) -> None:
    espiao = SondadorEspiao(portas={554}, titulo="Login")
    achado = [Achado("10.99.2.20", M1, "arp", F_MK, nome="cam-patio")]
    for horas in (0, 1, 23):
        async with cena.sessoes() as db:
            await mesclar(db, achado, cena.guarda, AGORA + timedelta(hours=horas), sondador=espiao)
            await db.commit()
    assert espiao.chamadas == ["10.99.2.20"]
    [d] = await _descobertas(cena)
    assert d.sinais["portas"] == [554] and d.sinais["titulo"] == "Login"
    assert d.sondada_em == AGORA and d.classe_sugerida == "camera"
    async with cena.sessoes() as db:
        await mesclar(db, achado, cena.guarda, AGORA + timedelta(hours=25), sondador=espiao)
        await db.commit()
    assert espiao.chamadas == ["10.99.2.20", "10.99.2.20"]


async def test_varredura_junta_na_descoberta_do_mac(cena: Cena) -> None:
    async with cena.sessoes() as db:
        await mesclar(db, [Achado("10.99.1.80", M1, "arp", F_MK)], cena.guarda, AGORA)
        await db.commit()
    async with cena.sessoes() as db:
        await mesclar(
            db, [Achado("10.99.1.80", None, "varredura", "varredura")], cena.guarda, AGORA
        )
        await db.commit()
    [d] = await _descobertas(cena)
    assert d.chave == M1
    assert {o["origem"] for o in d.origens} == {"arp", "varredura"}


async def test_descoberta_so_ip_ganha_chave_do_mac(cena: Cena) -> None:
    async with cena.sessoes() as db:
        await mesclar(db, [Achado("10.99.1.81", None, "lldp", F_SNMP)], cena.guarda, AGORA)
        await db.commit()
    async with cena.sessoes() as db:
        await mesclar(db, [Achado("10.99.1.81", M2, "arp", F_MK)], cena.guarda, AGORA)
        await db.commit()
    [d] = await _descobertas(cena)
    assert d.chave == M2 and d.mac == M2


async def test_sem_sondador_devolve_quem_sondar_fora_da_transacao(cena: Cena) -> None:
    achados = [
        Achado("10.99.2.20", M1, "arp", F_MK),  # sub-rede com varredura
        Achado("10.99.1.20", M2, "arp", F_MK),  # sem varredura: nunca
    ]
    async with cena.sessoes() as db:
        r = await mesclar(db, achados, cena.guarda, AGORA)
        await db.commit()
    d = next(d for d in await _descobertas(cena) if d.mac == M1)
    assert r.a_sondar == [d.id] and d.sondada_em is None
