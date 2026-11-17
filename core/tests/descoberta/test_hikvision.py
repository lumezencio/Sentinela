"""Fonte Hikvision (ISAPI): parsers por fixture sintetizada e cliente contra o simulador Digest.

Variações de firmware cobertas (formas da documentação pública do ISAPI):
- ``InputProxy/channels`` com esquema ``ver20`` (``proxyProtocol`` e ``model``/``firmwareVersion``
  dentro de ``sourceInputPortDescriptor``, firmwares 4.x+);
- o mesmo com esquema ``ver10`` (``adminProtocol``, sem modelo; canal endereçado por
  ``hostName`` em vez de ``ipAddress``, firmwares antigos).
"""

import secrets
from ipaddress import IPv4Network
from pathlib import Path
from typing import Any

import pytest
from pydantic import SecretStr

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import (
    CertificadoMudou,
    CertificadoNaoConfiado,
    Coletor,
    ErroColeta,
)
from sentinela.descoberta.fontes.hikvision import (
    CAMINHO_CANAIS,
    CAMINHO_DISPOSITIVO,
    CAMINHO_STATUS,
    FonteHikvision,
    interpretar_canais,
    interpretar_dispositivo,
    interpretar_status,
)
from sentinela.descoberta.texto import LIMITE_PADRAO
from sentinela.rede.guarda import Guarda
from sentinela.seguranca.cofre import Cofre

from .simulador_gravador import SENHA, USUARIO, Resposta, SimuladorGravador, fixture
from .simulador_routeros import CertificadoTeste, gerar_certificado

GUARDA = Guarda([IPv4Network("10.99.0.0/24")], permitir_loopback=True)
FONTE_ID = "6f1c0d2e-0000-4000-8000-00000000a001"


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
    return gerar_certificado(tmp_path, "sim-nvr")


def _fonte(
    cofre: Cofre,
    porta: int,
    *,
    host: str = "127.0.0.1",
    tls: bool = False,
    impressao: str | None = None,
    senha: str = SENHA,
) -> Fonte:
    return Fonte(
        id=FONTE_ID,
        tipo="hikvision",
        nome="NVR portaria",
        host=host,
        porta=porta,
        tls=tls,
        credencial_cifrada=cofre.cifrar({"usuario": USUARIO, "senha": senha}),
        impressao_tls=impressao,
        ativa=True,
        intervalo_s=600,
    )


def _rotas(canais: str = "hikvision_canais_v20.xml") -> dict[str, bytes | Resposta]:
    return {
        CAMINHO_DISPOSITIVO: fixture("hikvision_deviceinfo.xml"),
        CAMINHO_CANAIS: fixture(canais),
        CAMINHO_STATUS: fixture("hikvision_status.xml"),
    }


def _coletor(fonte: Fonte, cofre: Cofre, limitador: Any = None) -> FonteHikvision:
    return FonteHikvision(fonte, cofre, GUARDA, limitador or LimitadorEspiao())


# ---- parsers --------------------------------------------------------------------------------


def test_device_info() -> None:
    info = interpretar_dispositivo(fixture("hikvision_deviceinfo.xml"))
    assert info.nome == "NVR Portaria"
    assert info.modelo == "DS-7608NI-TESTE"
    assert info.firmware == "V4.99.000"
    assert info.mac == "02:00:00:bb:00:01"
    assert info.tipo == "NVR"
    assert info.fabricante == "Hikvision"


def test_canais_firmware_ver20() -> None:
    canais = interpretar_canais(fixture("hikvision_canais_v20.xml"))
    assert [(c.canal, c.nome, c.ip) for c in canais] == [
        (1, "Entrada", "192.168.254.11"),
        (2, "Garagem", "192.168.254.12"),
    ]
    assert canais[0].modelo == "DS-2CD-TESTE"
    assert canais[0].protocolo == "HIKVISION"
    assert canais[0].fabricante == "Hikvision"
    assert canais[1].modelo is None
    assert canais[1].protocolo == "ONVIF"
    assert canais[1].fabricante is None  # ONVIF: fabricante da câmera não é conhecido


def test_canais_firmware_ver10_e_canal_sem_ip() -> None:
    canais = interpretar_canais(fixture("hikvision_canais_v10.xml"))
    assert [(c.canal, c.nome, c.ip) for c in canais] == [
        (1, "Camera 01", "10.99.5.21"),
        (3, "Camera 03", None),  # endereçado por nome: nunca resolvido nem contatado
    ]
    assert canais[0].protocolo == "HIKVISION"


def test_status_dos_canais() -> None:
    assert interpretar_status(fixture("hikvision_status.xml")) == {1: True, 2: False}


def test_xml_com_entidade_externa_e_recusado() -> None:
    with pytest.raises(ErroColeta) as exc:
        interpretar_dispositivo(fixture("hikvision_xxe.xml"))
    assert "etc" not in str(exc.value)


@pytest.mark.parametrize("corpo", [b"", b"<nao fecha", b"\x00\x01", b"<a>" * 10])
def test_xml_invalido_erro_generico(corpo: bytes) -> None:
    with pytest.raises(ErroColeta):
        interpretar_canais(corpo)


def test_nome_de_canal_hostil_e_saneado() -> None:
    (canal,) = interpretar_canais(fixture("hikvision_canais_hostil.xml"))  # ids ruins somem
    assert canal.canal == 1
    assert canal.nome is not None
    assert len(canal.nome) <= LIMITE_PADRAO
    assert canal.nome.startswith("<img src=x onerror=alert(1)>gpj.exe quebra de linha XXX")
    assert not any(c in canal.nome for c in "‮​\t\r\n")
    assert canal.ip is None  # "192.168.254.11​" não é IP válido
    assert canal.modelo == "modelo"
    assert canal.protocolo == "HIKVISION"


# ---- fonte contra o simulador ---------------------------------------------------------------


async def test_coleta_lista_gravador_e_cameras(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas())
    limitador = LimitadorEspiao()
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta), cofre, limitador)
        assert isinstance(coletor, Coletor)
        achados = await coletor.coletar()
    gravador, *cameras = achados
    assert gravador.origem == "gravador"
    assert (gravador.ip, gravador.mac, gravador.nome) == (
        "127.0.0.1",
        "02:00:00:bb:00:01",
        "NVR Portaria",
    )
    assert gravador.fabricante == "Hikvision"
    assert gravador.sinais["modelo"] == "DS-7608NI-TESTE"
    assert gravador.sinais["firmware"] == "V4.99.000"
    assert gravador.fonte_id == FONTE_ID
    assert [(c.origem, c.canal, c.nome, c.ip) for c in cameras] == [
        ("gravador_canal", 1, "Entrada", "192.168.254.11"),
        ("gravador_canal", 2, "Garagem", "192.168.254.12"),
    ]
    assert all(c.pai_fonte_id == FONTE_ID and c.fonte_id == FONTE_ID for c in cameras)
    assert cameras[0].fabricante == "Hikvision"
    assert cameras[0].sinais["modelo"] == "DS-2CD-TESTE"
    assert cameras[1].sinais["protocolo"] == "ONVIF"
    assert "usuario-camera" not in repr(achados)  # usuário das câmeras nunca vira sinal
    # cada requisição custa 1 ficha de prioridade baixa; nada além do gravador foi contatado
    assert limitador.pedidos == [(1, "baixa"), (1, "baixa")]
    assert [a for a, autenticado in sim.recebidos if autenticado] == [
        CAMINHO_DISPOSITIVO,
        CAMINHO_CANAIS,
    ]


@pytest.mark.parametrize(
    "canais",
    [fixture("hikvision_canais_vazio.xml"), Resposta(404, b"Error")],
    ids=["lista-vazia", "sem-inputproxy"],
)
async def test_gravador_sem_canais_devolve_so_o_gravador(
    cofre: Cofre, canais: bytes | Resposta
) -> None:
    rotas = _rotas()
    rotas[CAMINHO_CANAIS] = canais
    sim = SimuladorGravador(rotas)
    async with sim.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta), cofre).coletar()
    assert [a.origem for a in achados] == ["gravador"]


async def test_canal_sem_ip(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas("hikvision_canais_v10.xml"))
    async with sim.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta), cofre).coletar()
    sem_ip = [a for a in achados if a.canal == 3]
    assert [(a.ip, a.mac, a.nome) for a in sem_ip] == [(None, None, "Camera 03")]
    assert "exemplo.invalid" not in repr(achados)  # o nome de host não é guardado


async def test_status_canais_nao_gasta_ficha_propria(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas())
    limitador = LimitadorEspiao()
    async with sim.rodando() as porta:
        estados = await _coletor(_fonte(cofre, porta), cofre, limitador).status_canais()
    assert estados == {1: True, 2: False}
    assert limitador.pedidos == []  # quem chama (LeitorCanais) paga a ficha normal
    assert sim.alvos() == [CAMINHO_STATUS, CAMINHO_STATUS]  # desafio Digest + pedido


async def test_testar_devolve_identidade_versao_e_aviso_sem_tls(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas())
    async with sim.rodando() as porta:
        res = await _coletor(_fonte(cofre, porta), cofre).testar()
    assert res.ok is True
    assert (res.identidade, res.versao) == ("NVR Portaria", "V4.99.000")
    assert res.impressao_tls is None
    assert res.avisos and "TLS" in res.avisos[0]


async def test_digest_senha_errada_erro_generico(cofre: Cofre) -> None:
    errada = "senha-errada-XYZ-987"
    sim = SimuladorGravador(_rotas())
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, senha=errada), cofre)
        with pytest.raises(ErroColeta) as exc:
            await coletor.coletar()
        res = await coletor.testar()
    for texto in (str(exc.value), res.erro or ""):
        assert "recusad" in texto
        assert errada not in texto
        assert USUARIO not in texto
    assert res.ok is False
    contexto = exc.value.__context__
    assert exc.value.__cause__ is None
    assert contexto is None or exc.value.__suppress_context__  # nada do httpx vaza encadeado


async def test_digest_com_reconexao_apos_desafio(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas(), fechar_apos_desafio=True)
    async with sim.rodando() as porta:
        estados = await _coletor(_fonte(cofre, porta), cofre).status_canais()
    assert estados == {1: True, 2: False}


async def test_https_impressao_nao_confiada(cofre: Cofre, certificado: CertificadoTeste) -> None:
    sim = SimuladorGravador(_rotas(), certificado=certificado)
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, tls=True), cofre)
        res = await coletor.testar()
        with pytest.raises(CertificadoNaoConfiado) as exc:
            await coletor.coletar()
    assert res.ok is False
    assert res.impressao_tls == certificado.impressao
    assert res.erro and "confiado" in res.erro
    assert exc.value.impressao == certificado.impressao
    assert sim.recebidos == []  # nenhum byte HTTP (nem o desafio Digest) antes da impressão


async def test_https_certificado_mudou_bloqueia(
    cofre: Cofre, certificado: CertificadoTeste
) -> None:
    sim = SimuladorGravador(_rotas(), certificado=certificado)
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, tls=True, impressao="ab" * 32), cofre)
        with pytest.raises(CertificadoMudou) as exc:
            await coletor.status_canais()
        res = await coletor.testar()
    assert "mudou" in str(exc.value)
    assert res.ok is False and res.impressao_tls == certificado.impressao
    assert sim.recebidos == []


async def test_https_impressao_confiada_coleta(cofre: Cofre, certificado: CertificadoTeste) -> None:
    sim = SimuladorGravador(_rotas(), certificado=certificado)
    async with sim.rodando() as porta:
        fonte = _fonte(cofre, porta, tls=True, impressao=certificado.impressao.upper())
        coletor = _coletor(fonte, cofre)
        achados = await coletor.coletar()
        res = await coletor.testar()
    assert len(achados) == 3
    assert res.ok is True and res.avisos == []
    assert res.impressao_tls == certificado.impressao


async def test_redirecionamento_nao_e_seguido(cofre: Cofre) -> None:
    rotas = _rotas()
    rotas[CAMINHO_DISPOSITIVO] = Resposta(302, b"", {"Location": "/outro"})
    sim = SimuladorGravador(rotas)
    async with sim.rodando() as porta:
        with pytest.raises(ErroColeta):
            await _coletor(_fonte(cofre, porta), cofre).coletar()
    assert "/outro" not in sim.alvos()


async def test_resposta_grande_demais_e_recusada(cofre: Cofre) -> None:
    rotas = _rotas()
    rotas[CAMINHO_CANAIS] = b"<a>" + b"x" * (3 * 1024 * 1024) + b"</a>"
    sim = SimuladorGravador(rotas)
    async with sim.rodando() as porta:
        with pytest.raises(ErroColeta) as exc:
            await _coletor(_fonte(cofre, porta), cofre).coletar()
    assert "grande" in str(exc.value)


async def test_desafio_digest_gigante_e_recusado(cofre: Cofre) -> None:
    """O corpo do 401 intermediário (lido pelo httpx) também respeita o teto de 2 MB."""
    sim = SimuladorGravador(_rotas())
    original = sim._responder

    def responder(metodo: str, alvo: str, cabecalhos: dict[str, str]) -> Resposta:
        resp = original(metodo, alvo, cabecalhos)
        if resp.status == 401:
            resp.corpo = b"x" * (3 * 1024 * 1024)
        return resp

    sim._responder = responder  # type: ignore[method-assign]
    async with sim.rodando() as porta:
        with pytest.raises(ErroColeta) as exc:
            await _coletor(_fonte(cofre, porta), cofre).status_canais()
    assert "grande" in str(exc.value)


async def test_destino_fora_das_sub_redes(cofre: Cofre) -> None:
    coletor = _coletor(_fonte(cofre, 80, host="192.168.254.1"), cofre)
    with pytest.raises(ErroColeta) as exc:
        await coletor.coletar()
    assert "sub-redes" in str(exc.value)


async def test_host_por_nome_e_recusado(cofre: Cofre) -> None:
    coletor = _coletor(_fonte(cofre, 80, host="nvr.exemplo.invalid"), cofre)
    with pytest.raises(ErroColeta):
        await coletor.status_canais()


async def test_sem_resposta_erro_generico(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas())
    async with sim.rodando() as porta:
        pass  # porta livre agora: conexão recusada
    with pytest.raises(ErroColeta) as exc:
        await _coletor(_fonte(cofre, porta), cofre).coletar()
    assert "conectar" in str(exc.value)


# ---- entrada hostil: nenhuma exceção controlada pelo aparelho escapa ------------------------

_HOSTIS = [
    fixture("hikvision_codificacao_desconhecida.xml"),
    b"<?xml version='1.0' encoding='utf-16'?><DeviceInfo/>",
    b"<?xml version='1.0' encoding='x-segredo-do-aparelho'?><a/>",
    b'<?xml version="1.0"?><!DOCTYPE a><DeviceInfo/>',
]


def _sem_vazamento(erro: ErroColeta) -> None:
    assert str(erro) == "resposta inesperada do gravador"
    assert erro.__cause__ is None
    assert erro.__context__ is None or erro.__suppress_context__


@pytest.mark.parametrize("corpo", _HOSTIS)
@pytest.mark.parametrize(
    "interpretar", [interpretar_dispositivo, interpretar_canais, interpretar_status]
)
def test_xml_hostil_vira_erro_generico(corpo: bytes, interpretar: Any) -> None:
    with pytest.raises(ErroColeta) as exc:
        interpretar(corpo)
    _sem_vazamento(exc.value)
    assert "segredo" not in str(exc.value) and "inventada" not in str(exc.value)


async def test_codificacao_desconhecida_em_coletar_testar_e_status(cofre: Cofre) -> None:
    hostil = fixture("hikvision_codificacao_desconhecida.xml")
    sim = SimuladorGravador(
        {CAMINHO_DISPOSITIVO: hostil, CAMINHO_CANAIS: hostil, CAMINHO_STATUS: hostil}
    )
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta), cofre)
        with pytest.raises(ErroColeta) as exc_coleta:
            await coletor.coletar()
        with pytest.raises(ErroColeta) as exc_status:
            await coletor.status_canais()
        res = await coletor.testar()
    _sem_vazamento(exc_coleta.value)
    _sem_vazamento(exc_status.value)
    assert res.ok is False and res.erro == "resposta inesperada do gravador"
