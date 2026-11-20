"""Fonte SNMP contra um agente real do pysnmp em 127.0.0.1 (troca de pacotes UDP de verdade)."""

import secrets
from ipaddress import IPv4Network
from typing import Any

import pytest
from pydantic import SecretStr

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import Achado, Coletor, ErroColeta
from sentinela.descoberta.fontes.snmp import FonteSnmp
from sentinela.rede.guarda import Guarda
from sentinela.seguranca.cofre import Cofre

from .agente_snmp import COMUNIDADE, SENHA_AUTH, SENHA_PRIV, USUARIO_V3, AgenteSnmp

GUARDA = Guarda([IPv4Network("10.99.0.0/24")], permitir_loopback=True)
MARCA = "SEGREDO-MARCA-9137"


class LimitadorEspiao:
    def __init__(self) -> None:
        self.pedidos: list[tuple[int, str | None]] = []

    async def adquirir(
        self, custo: int = 1, prioritario: bool = False, *, prioridade: str | None = None
    ) -> None:
        self.pedidos.append((custo, prioridade))


@pytest.fixture
def cofre() -> Cofre:
    return Cofre(SecretStr(secrets.token_hex(32)))


def _fonte(cofre: Cofre, porta: int, credencial: dict[str, str] | None = None) -> Fonte:
    return Fonte(
        id="f-snmp-1",
        tipo="snmp",
        nome="Switch sede",
        host="127.0.0.1",
        porta=porta,
        tls=False,
        credencial_cifrada=cofre.cifrar(credencial or {"versao": "2c", "comunidade": COMUNIDADE}),
        ativa=True,
        intervalo_s=600,
    )


def _coletor(
    fonte: Fonte, cofre: Cofre, limitador: Any = None, guarda: Guarda = GUARDA
) -> FonteSnmp:
    return FonteSnmp(fonte, cofre, guarda, limitador or LimitadorEspiao())


def _por_origem(achados: list[Achado]) -> dict[str, list[Achado]]:
    saida: dict[str, list[Achado]] = {}
    for a in achados:
        saida.setdefault(a.origem, []).append(a)
    return saida


ARP = {"10.99.0.10": "02:00:00:AA:00:10", "10.99.0.11": "02:00:00:aa:00:11"}
ARP_ESPERADO = [
    ("10.99.0.10", "02:00:00:aa:00:10"),
    ("10.99.0.11", "02:00:00:aa:00:11"),
]


async def test_v2c_le_ip_net_to_physical(cofre: Cofre) -> None:
    agente = AgenteSnmp(arp_nova=ARP)
    async with agente.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta), cofre)
        assert isinstance(coletor, Coletor)
        achados = await coletor.coletar()
    arp = _por_origem(achados)["snmp_arp"]
    assert [(a.ip, a.mac) for a in arp] == ARP_ESPERADO
    assert all(a.fonte_id == "f-snmp-1" for a in achados)


async def test_queda_para_ip_net_to_media(cofre: Cofre) -> None:
    agente = AgenteSnmp(arp_antiga=ARP)
    async with agente.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta), cofre).coletar()
    arp = _por_origem(achados)["snmp_arp"]
    assert [(a.ip, a.mac) for a in arp] == ARP_ESPERADO


async def test_fdb_vira_achado_sem_ip_com_porta_nos_sinais(cofre: Cofre) -> None:
    agente = AgenteSnmp(fdb={"02:00:00:aa:00:10": 3, "02:00:00:aa:00:11": 7})
    async with agente.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta), cofre).coletar()
    fdb = _por_origem(achados)["snmp_fdb"]
    assert [(a.ip, a.mac, a.sinais) for a in fdb] == [
        (None, "02:00:00:aa:00:10", {"porta_switch": "3"}),
        (None, "02:00:00:aa:00:11", {"porta_switch": "7"}),
    ]


async def test_fdb_dot1d_quando_q_bridge_vazia(cofre: Cofre) -> None:
    agente = AgenteSnmp(fdb_antiga={"02:00:00:aa:00:12": 5})
    async with agente.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta), cofre).coletar()
    (a,) = _por_origem(achados)["snmp_fdb"]
    assert (a.ip, a.mac, a.sinais) == (None, "02:00:00:aa:00:12", {"porta_switch": "5"})


async def test_lldp_vira_sinal_nome_e_plataforma(cofre: Cofre) -> None:
    agente = AgenteSnmp(lldp=[("02:00:00:aa:00:20", "sw-andar2", "Switch\x07 Gerenciavel v1")])
    async with agente.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta), cofre).coletar()
    (a,) = _por_origem(achados)["lldp"]
    assert a.ip is None
    assert a.mac == "02:00:00:aa:00:20"
    assert a.nome == "sw-andar2"
    assert a.sinais["plataforma"] == "Switch Gerenciavel v1"


async def test_v3_auth_priv(cofre: Cofre) -> None:
    cred = {
        "versao": "3",
        "usuario": USUARIO_V3,
        "auth": "SHA",
        "senha_auth": SENHA_AUTH,
        "priv": "AES",
        "senha_priv": SENHA_PRIV,
    }
    agente = AgenteSnmp(arp_nova=ARP)
    async with agente.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta, cred), cofre).coletar()
    assert len(_por_origem(achados)["snmp_arp"]) == 2


async def test_comunidade_errada_timeout_erro_generico(
    cofre: Cofre, monkeypatch: pytest.MonkeyPatch
) -> None:
    from sentinela.descoberta.fontes import snmp

    monkeypatch.setattr(snmp, "TIMEOUT_S", 0.3)  # o agente não responde a comunidade errada
    agente = AgenteSnmp(arp_nova=ARP)
    cred = {"versao": "2c", "comunidade": MARCA}
    async with agente.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, cred), cofre)
        with pytest.raises(ErroColeta) as e:
            await coletor.coletar()
        r = await coletor.testar()
    assert MARCA not in str(e.value)
    assert not r.ok
    assert r.erro is not None
    assert MARCA not in r.erro


async def test_v3_senha_errada_nao_vaza_segredo(cofre: Cofre) -> None:
    cred = {
        "versao": "3",
        "usuario": USUARIO_V3,
        "auth": "SHA",
        "senha_auth": MARCA + "-auth",
        "priv": "AES",
        "senha_priv": MARCA + "-priv",
    }
    agente = AgenteSnmp()
    async with agente.rodando() as porta:
        r = await _coletor(_fonte(cofre, porta, cred), cofre).testar()
    assert not r.ok
    assert r.erro is not None
    assert MARCA not in r.erro
    assert MARCA not in repr(r)


async def test_credencial_ilegivel_erro_generico(cofre: Cofre) -> None:
    fonte = _fonte(cofre, 161)
    fonte.credencial_cifrada = b"lixo"
    with pytest.raises(ErroColeta):
        await _coletor(fonte, cofre).coletar()
    with pytest.raises(ErroColeta):
        await _coletor(_fonte(cofre, 161, {"versao": "2c"}), cofre).coletar()
    with pytest.raises(ErroColeta):
        await _coletor(_fonte(cofre, 161, {"versao": "9", "comunidade": "x"}), cofre).coletar()


async def test_destino_fora_da_guarda_e_recusado(cofre: Cofre) -> None:
    guarda = Guarda([IPv4Network("10.99.0.0/24")])  # sem loopback
    with pytest.raises(ErroColeta):
        await _coletor(_fonte(cofre, 161), cofre, guarda=guarda).coletar()


async def test_testar_mostra_sysname_e_sysdescr_limpos(cofre: Cofre) -> None:
    agente = AgenteSnmp(sysname="rb-\x1b[31msede\x00", sysdescr="RouterOS\r\nRB750Gr3")
    async with agente.rodando() as porta:
        r = await _coletor(_fonte(cofre, porta), cofre).testar()
    assert r.ok
    assert r.identidade == "rb-[31msede"
    assert r.versao == "RouterOS RB750Gr3"
    assert r.erro is None


async def test_getbulk_custa_ficha_baixa_por_pedido(cofre: Cofre) -> None:
    espiao = LimitadorEspiao()
    agente = AgenteSnmp(linhas_extras=60)
    async with agente.rodando() as porta:
        await _coletor(_fonte(cofre, porta), cofre, espiao).coletar()
    assert agente.pedidos == len(espiao.pedidos)
    assert agente.pedidos > 6  # a tabela longa exige várias páginas
    assert set(espiao.pedidos) == {(1, "baixa")}


async def test_tabela_limitada_pelo_maximo_de_linhas(
    cofre: Cofre, monkeypatch: pytest.MonkeyPatch
) -> None:
    from sentinela.descoberta.fontes import snmp

    monkeypatch.setattr(snmp, "MAX_LINHAS", 30)
    agente = AgenteSnmp(linhas_extras=80)
    async with agente.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta), cofre).coletar()
    assert len(_por_origem(achados)["snmp_arp"]) == 30


async def test_snmp_le_sysuptime_na_mesma_sessao(cofre: Cofre) -> None:
    agente = AgenteSnmp(arp_nova=ARP, uptime_ticks=123456)
    async with agente.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta), cofre)
        assert coletor.ultimo_uptime_s is None
        achados = await coletor.coletar()
    assert coletor.ultimo_uptime_s == pytest.approx(1234.56)
    assert [(a.ip, a.mac) for a in _por_origem(achados)["snmp_arp"]] == ARP_ESPERADO


async def test_snmp_sem_sysuptime_coleta_igual(cofre: Cofre) -> None:
    agente = AgenteSnmp(arp_nova=ARP)
    async with agente.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta), cofre)
        achados = await coletor.coletar()
    assert coletor.ultimo_uptime_s is None
    assert [(a.ip, a.mac) for a in _por_origem(achados)["snmp_arp"]] == ARP_ESPERADO
