"""Fonte MikroTik contra o simulador da API RouterOS (TLS com certificado de teste)."""

import secrets
from ipaddress import IPv4Network
from pathlib import Path
from typing import Any

import pytest
from pydantic import SecretStr

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import Achado, Coletor, ErroColeta
from sentinela.descoberta.fontes.mikrotik import FonteMikrotik
from sentinela.descoberta.fontes.mikrotik_api import CertificadoMudou, CertificadoNaoConfiado
from sentinela.rede.guarda import Guarda
from sentinela.seguranca.cofre import Cofre

from .simulador_routeros import (
    GRUPO_FULL,
    TABELAS_V6,
    CertificadoTeste,
    SimuladorRouterOS,
    gerar_certificado,
)

GUARDA = Guarda([IPv4Network("10.99.0.0/24")], permitir_loopback=True)
SENHA = "senha-leitor-1"


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


@pytest.fixture
def certificado(tmp_path: Path) -> CertificadoTeste:
    return gerar_certificado(tmp_path)


def _fonte(
    cofre: Cofre,
    porta: int,
    *,
    tls: bool = True,
    impressao: str | None = None,
    usuario: str = "leitor",
    senha: str = SENHA,
) -> Fonte:
    return Fonte(
        id="f-mikrotik-1",
        tipo="mikrotik",
        nome="RB sede",
        host="127.0.0.1",
        porta=porta,
        tls=tls,
        credencial_cifrada=cofre.cifrar({"usuario": usuario, "senha": senha}),
        impressao_tls=impressao,
        ativa=True,
        intervalo_s=600,
    )


def _coletor(fonte: Fonte, cofre: Cofre, limitador: Any = None) -> FonteMikrotik:
    return FonteMikrotik(fonte, cofre, GUARDA, limitador or LimitadorEspiao())


def _por_origem(achados: list[Achado]) -> dict[str, list[Achado]]:
    saida: dict[str, list[Achado]] = {}
    for a in achados:
        saida.setdefault(a.origem, []).append(a)
    return saida


async def test_coleta_v7_le_arp_dhcp_vizinhos_wifi(
    cofre: Cofre, certificado: CertificadoTeste
) -> None:
    sim = SimuladorRouterOS(certificado=certificado)
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, impressao=certificado.impressao), cofre)
        assert isinstance(coletor, Coletor)
        achados = await coletor.coletar()
    por = _por_origem(achados)
    assert set(por) == {"arp", "dhcp", "vizinho", "wifi"}
    arp = por["arp"]
    assert [(a.ip, a.mac) for a in arp] == [
        ("10.99.0.10", "02:00:00:aa:00:10"),
        ("10.99.0.11", None),
    ]
    assert all(a.fonte_id == "f-mikrotik-1" for a in achados)
    (dhcp,) = por["dhcp"]
    assert (dhcp.ip, dhcp.mac, dhcp.nome) == ("10.99.0.20", "02:00:00:aa:00:20", "cam-portaria[0m")
    (viz,) = por["vizinho"]
    assert (viz.ip, viz.mac, viz.nome) == ("10.99.0.2", "02:00:00:aa:00:02", "sw-andar-1")
    assert viz.sinais["plataforma"] == "MikroTik"
    assert viz.sinais["placa"] == "CRS326"
    (wifi,) = por["wifi"]
    assert (wifi.ip, wifi.mac) == (None, "02:00:00:aa:00:30")
    assert wifi.sinais["sinal"] == "-61"
    comandos = sim.comandos()
    assert "/interface/wifi/registration-table/print" in comandos
    assert "/interface/wireless/registration-table/print" not in comandos
    # cada comando pede só as propriedades necessárias
    assert all(any(p.startswith("=.proplist=") for p in s) for s in sim.recebidos[1:])


async def test_coleta_v6_usa_wireless_registration_table(
    cofre: Cofre, certificado: CertificadoTeste
) -> None:
    sim = SimuladorRouterOS(
        versao="6.49.17 (long-term)", tabelas=dict(TABELAS_V6), certificado=certificado
    )
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, impressao=certificado.impressao), cofre)
        achados = await coletor.coletar()
    (wifi,) = _por_origem(achados)["wifi"]
    assert (wifi.ip, wifi.mac) == ("10.99.0.40", "02:00:00:aa:00:40")
    assert wifi.sinais["sinal"] == "-70dBm@6Mbps"
    comandos = sim.comandos()
    assert "/interface/wireless/registration-table/print" in comandos
    assert "/interface/wifi/registration-table/print" not in comandos


async def test_coleta_v7_sem_wifi_cai_para_capsman(
    cofre: Cofre, certificado: CertificadoTeste
) -> None:
    tabelas = {k: v for k, v in TABELAS_V6.items() if "registration" not in k}
    tabelas["/caps-man/registration-table/print"] = [
        {"mac-address": "02-00-00-AA-00-50", "interface": "cap1"}
    ]
    sim = SimuladorRouterOS(tabelas=tabelas, certificado=certificado)
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, impressao=certificado.impressao), cofre)
        achados = await coletor.coletar()
    (wifi,) = _por_origem(achados)["wifi"]
    assert wifi.mac == "02:00:00:aa:00:50"


async def test_testar_avisa_grupo_com_write(cofre: Cofre, certificado: CertificadoTeste) -> None:
    sim = SimuladorRouterOS(
        usuarios={"leitor": (SENHA, "operadores")},
        grupos={"operadores": GRUPO_FULL},
        certificado=certificado,
    )
    async with sim.rodando() as porta:
        res = await _coletor(_fonte(cofre, porta, impressao=certificado.impressao), cofre).testar()
    assert res.ok is True
    assert res.identidade == "rb-sede"
    assert res.versao == "7.16.2 (stable)"
    assert res.impressao_tls == certificado.impressao
    assert any("permissão de escrita" in a for a in res.avisos)


async def test_testar_usuario_read_sem_aviso(cofre: Cofre, certificado: CertificadoTeste) -> None:
    sim = SimuladorRouterOS(certificado=certificado)
    async with sim.rodando() as porta:
        res = await _coletor(_fonte(cofre, porta, impressao=certificado.impressao), cofre).testar()
    assert res.ok is True
    assert res.erro is None
    assert res.avisos == []
    assert ["/user/print", "?name=leitor", "=.proplist=name,group"] in sim.recebidos


async def test_testar_sem_tls_avisa_texto_claro(cofre: Cofre) -> None:
    sim = SimuladorRouterOS()
    async with sim.rodando() as porta:
        res = await _coletor(_fonte(cofre, porta, tls=False), cofre).testar()
    assert res.ok is True
    assert res.impressao_tls is None
    assert any("texto claro" in a for a in res.avisos)


async def test_certificado_nao_confiado_devolve_impressao(
    cofre: Cofre, certificado: CertificadoTeste
) -> None:
    sim = SimuladorRouterOS(certificado=certificado)
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, impressao=None), cofre)
        res = await coletor.testar()
        with pytest.raises(CertificadoNaoConfiado) as exc:
            await coletor.coletar()
    assert res.ok is False
    assert res.impressao_tls == certificado.impressao
    assert res.erro
    assert exc.value.impressao == certificado.impressao
    assert sim.recebidos == []  # o login nunca saiu antes da impressão ser conferida


async def test_certificado_mudou_bloqueia(cofre: Cofre, certificado: CertificadoTeste) -> None:
    sim = SimuladorRouterOS(certificado=certificado)
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, impressao="ab" * 32), cofre)
        with pytest.raises(CertificadoMudou) as exc:
            await coletor.coletar()
        res = await coletor.testar()
    assert isinstance(exc.value, ErroColeta)
    assert "mudou" in str(exc.value)
    assert res.ok is False
    assert res.impressao_tls == certificado.impressao
    assert sim.recebidos == []


async def test_senha_errada_erro_generico_sem_senha(
    cofre: Cofre, certificado: CertificadoTeste
) -> None:
    senha = "senha-errada-XYZ-987"
    sim = SimuladorRouterOS(certificado=certificado)
    async with sim.rodando() as porta:
        fonte = _fonte(cofre, porta, impressao=certificado.impressao, senha=senha)
        coletor = _coletor(fonte, cofre)
        with pytest.raises(ErroColeta) as exc:
            await coletor.coletar()
        res = await coletor.testar()
    for texto in (str(exc.value), repr(exc.value), res.erro or ""):
        assert senha not in texto
        assert "leitor" not in texto
        assert "invalid user name" not in texto
    assert res.ok is False
    assert res.erro


async def test_login_antigo_nao_suportado(cofre: Cofre) -> None:
    sim = SimuladorRouterOS(login_antigo=True)
    async with sim.rodando() as porta:
        res = await _coletor(_fonte(cofre, porta, tls=False), cofre).testar()
    assert res.ok is False
    assert res.erro == "RouterOS anterior a 6.43 não suportado"


async def test_destino_fora_da_guarda_e_recusado(cofre: Cofre) -> None:
    fonte = _fonte(cofre, 8729)
    fonte.host = "192.168.50.1"
    with pytest.raises(ErroColeta):
        await _coletor(fonte, cofre).coletar()


async def test_credencial_ilegivel_vira_erro_generico(cofre: Cofre) -> None:
    fonte = _fonte(cofre, 8729)
    fonte.credencial_cifrada = b"lixo"
    with pytest.raises(ErroColeta):
        await _coletor(fonte, cofre).coletar()


async def test_cada_comando_custa_ficha_baixa(cofre: Cofre, certificado: CertificadoTeste) -> None:
    sim = SimuladorRouterOS(certificado=certificado)
    espiao = LimitadorEspiao()
    async with sim.rodando() as porta:
        fonte = _fonte(cofre, porta, impressao=certificado.impressao)
        await _coletor(fonte, cofre, espiao).coletar()
    # 1 ficha pela conexão TCP + 1 por sentença enviada (login e cada comando)
    assert len(sim.recebidos) >= 6
    assert len(espiao.pedidos) == 1 + len(sim.recebidos)
    assert set(espiao.pedidos) == {(1, "baixa")}


async def test_resposta_hostil_com_colunas_demais_e_recusada(
    cofre: Cofre, certificado: CertificadoTeste
) -> None:
    hostil = {f"coluna-{i}": "z" * 10 for i in range(200)}
    hostil |= {"address": "10.99.0.66", "mac-address": "02:00:00:aa:00:66"}
    sim = SimuladorRouterOS(
        tabelas={"/ip/arp/print": [hostil]}, ignorar_proplist=True, certificado=certificado
    )
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, impressao=certificado.impressao), cofre)
        with pytest.raises(ErroColeta) as exc:
            await coletor.coletar()
    assert str(exc.value) == "resposta do RouterOS grande demais"
    assert "coluna" not in repr(exc.value)
