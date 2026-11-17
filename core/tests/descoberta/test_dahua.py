"""Fonte Dahua/Intelbras (API HTTP CGI): parsers por fixture sintetizada e cliente Digest.

Variações cobertas (formas da documentação pública da API HTTP da Dahua):
- ``RemoteDevice`` com chaves ``table.RemoteDevice.uuid:System_CONFIG_NETCAMERA_INFO_<n>.<campo>``
  (NVRs 3.x/4.x; ``n`` é o canal a partir de 0, vagas sem câmera vêm com ``Enable=false``);
- ``RemoteDevice`` em forma de vetor ``table.RemoteDevice[<n>].<campo>`` (firmwares que
  imprimem a configuração como lista; sem ``Enable`` vale o endereço preenchido);
- estado dos canais por ``LogicDeviceManager.cgi?action=getCameraState`` (``states[i].channel``
  a partir de 0 e ``states[i].connectionState``: só ``Connected`` conta como online).
"""

import secrets
from ipaddress import IPv4Network
from typing import Any

import pytest
from pydantic import SecretStr

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import Coletor, ErroColeta
from sentinela.descoberta.fontes.dahua import (
    CAMINHO_ESTADO,
    CAMINHO_REMOTOS,
    CAMINHO_SISTEMA,
    FonteDahua,
    interpretar_estado,
    interpretar_remotos,
    interpretar_sistema,
)
from sentinela.descoberta.texto import LIMITE_PADRAO
from sentinela.rede.guarda import Guarda
from sentinela.seguranca.cofre import Cofre

from .simulador_gravador import SENHA, USUARIO, Resposta, SimuladorGravador, fixture

GUARDA = Guarda([IPv4Network("10.99.0.0/24")], permitir_loopback=True)
FONTE_ID = "6f1c0d2e-0000-4000-8000-00000000d001"


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


def _fonte(cofre: Cofre, porta: int, *, senha: str = SENHA) -> Fonte:
    return Fonte(
        id=FONTE_ID,
        tipo="dahua",
        nome="DVR recepção",
        host="127.0.0.1",
        porta=porta,
        tls=False,
        credencial_cifrada=cofre.cifrar({"usuario": USUARIO, "senha": senha}),
        impressao_tls=None,
        ativa=True,
        intervalo_s=600,
    )


def _rotas(remotos: str = "dahua_remotos_uuid.txt") -> dict[str, bytes | Resposta]:
    return {
        CAMINHO_SISTEMA: fixture("dahua_sistema.txt"),
        CAMINHO_REMOTOS: fixture(remotos),
        CAMINHO_ESTADO: fixture("dahua_estado_canais.txt"),
    }


def _coletor(fonte: Fonte, cofre: Cofre, limitador: Any = None) -> FonteDahua:
    return FonteDahua(fonte, cofre, GUARDA, limitador or LimitadorEspiao())


# ---- parsers --------------------------------------------------------------------------------


def test_system_info() -> None:
    info = interpretar_sistema(fixture("dahua_sistema.txt"))
    assert info.modelo == "DHI-NVR4108-TESTE"
    assert info.nome == "DHI-NVR4108-TESTE"
    assert info.fabricante == "Dahua"  # prefixo DHI- é da linha internacional Dahua
    assert info.mac is None


def test_system_info_crlf_e_sem_prefixo_conhecido() -> None:
    info = interpretar_sistema(b"deviceType=MHDX 1108\r\nserialNumber=X\r\n")
    assert info.modelo == "MHDX 1108"
    assert info.fabricante is None  # Intelbras e OEMs: não se adivinha o fabricante


def test_remote_device_variante_uuid() -> None:
    canais = interpretar_remotos(fixture("dahua_remotos_uuid.txt"))
    assert [(c.canal, c.nome, c.ip) for c in canais] == [
        (1, "Recepcao", "192.168.254.21"),
        (2, "Estacionamento", "192.168.254.22"),
        (4, "Sem endereco", None),  # vaga 3 (Enable=false) some
    ]
    assert canais[0].modelo == "IPC-HFW-TESTE"
    assert canais[0].fabricante == "Dahua"
    assert canais[0].mac == "02:00:00:cc:00:21"
    assert canais[0].protocolo == "Private"
    assert canais[1].fabricante == "Intelbras"
    assert canais[1].protocolo == "Onvif"


def test_remote_device_variante_indice() -> None:
    canais = interpretar_remotos(fixture("dahua_remotos_indice.txt"))
    assert [(c.canal, c.nome, c.ip) for c in canais] == [
        (1, "Corredor", "10.99.6.31"),
        (3, "Deposito", "10.99.6.33"),
    ]
    assert canais[1].fabricante is None  # "General" (genérico) não é fabricante


def test_senha_das_cameras_nunca_e_lida() -> None:
    for nome in ("dahua_remotos_uuid.txt", "dahua_remotos_indice.txt"):
        canais = interpretar_remotos(fixture(nome))
        texto = repr(canais)
        assert "senha-camera-ficticia" not in texto
        assert "usuario-camera" not in texto


def test_estado_dos_canais() -> None:
    assert interpretar_estado(fixture("dahua_estado_canais.txt")) == {
        1: True,
        2: False,
        4: False,  # Connecting não é online
    }


@pytest.mark.parametrize(
    "corpo",
    [b"Error\r\nBad Request!\r\n", b"", b"\xff\xfe\x00"],
)
def test_estado_sem_states_e_erro(corpo: bytes) -> None:
    with pytest.raises(ErroColeta):
        interpretar_estado(corpo)


def test_nome_de_canal_hostil_e_saneado() -> None:
    nome = "\x1b[31m<script>x</script>‮\x00" + "A" * 400
    corpo = (
        "table.RemoteDevice[0].Enable=true\n"
        f"table.RemoteDevice[0].Name={nome}\n"
        "table.RemoteDevice[0].Address=10.99.6.31\x07\n"
        "table.RemoteDevice[0].DeviceType=\x1b]0;titulo\x07IPC\n"
        "table.RemoteDevice[99999].Address=10.99.6.40\n"
        "table.RemoteDevice[-1].Address=10.99.6.41\n"
    ).encode()
    (canal,) = interpretar_remotos(corpo)
    assert canal.nome is not None
    assert len(canal.nome) <= LIMITE_PADRAO
    assert canal.nome.startswith("[31m<script>x</script>AAAA")
    assert not any(ord(c) < 32 or c == "‮" for c in canal.nome)
    assert canal.ip is None
    assert canal.modelo is not None and "\x1b" not in canal.modelo


# ---- fonte contra o simulador ---------------------------------------------------------------


async def test_coleta_lista_gravador_e_cameras(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas())
    limitador = LimitadorEspiao()
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta), cofre, limitador)
        assert isinstance(coletor, Coletor)
        achados = await coletor.coletar()
    gravador, *cameras = achados
    assert (gravador.origem, gravador.ip, gravador.nome) == (
        "gravador",
        "127.0.0.1",
        "DHI-NVR4108-TESTE",
    )
    assert gravador.sinais["modelo"] == "DHI-NVR4108-TESTE"
    assert [(c.origem, c.canal, c.ip, c.mac) for c in cameras] == [
        ("gravador_canal", 1, "192.168.254.21", "02:00:00:cc:00:21"),
        ("gravador_canal", 2, "192.168.254.22", None),
        ("gravador_canal", 4, None, None),
    ]
    assert all(c.pai_fonte_id == FONTE_ID for c in cameras)
    assert "senha-camera-ficticia" not in repr(achados)
    assert limitador.pedidos == [(1, "baixa"), (1, "baixa")]


async def test_gravador_sem_canais_devolve_so_o_gravador(cofre: Cofre) -> None:
    rotas = _rotas()
    rotas[CAMINHO_REMOTOS] = b""
    sim = SimuladorGravador(rotas)
    async with sim.rodando() as porta:
        achados = await _coletor(_fonte(cofre, porta), cofre).coletar()
    assert [a.origem for a in achados] == ["gravador"]


async def test_status_canais(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas())
    limitador = LimitadorEspiao()
    async with sim.rodando() as porta:
        estados = await _coletor(_fonte(cofre, porta), cofre, limitador).status_canais()
    assert estados == {1: True, 2: False, 4: False}
    assert limitador.pedidos == []


async def test_testar(cofre: Cofre) -> None:
    sim = SimuladorGravador(_rotas())
    async with sim.rodando() as porta:
        res = await _coletor(_fonte(cofre, porta), cofre).testar()
    assert res.ok is True
    assert res.identidade == "DHI-NVR4108-TESTE"


async def test_digest_senha_errada_erro_generico(cofre: Cofre) -> None:
    errada = "senha-errada-XYZ-987"
    sim = SimuladorGravador(_rotas())
    async with sim.rodando() as porta:
        coletor = _coletor(_fonte(cofre, porta, senha=errada), cofre)
        with pytest.raises(ErroColeta) as exc:
            await coletor.status_canais()
        res = await coletor.testar()
    for texto in (str(exc.value), res.erro or ""):
        assert "recusad" in texto
        assert errada not in texto and USUARIO not in texto
    assert res.ok is False


async def test_erro_http_do_gravador_e_generico(cofre: Cofre) -> None:
    rotas = _rotas()
    rotas[CAMINHO_ESTADO] = Resposta(500, b"Error\r\nsegredo interno do aparelho\r\n")
    sim = SimuladorGravador(rotas)
    async with sim.rodando() as porta:
        with pytest.raises(ErroColeta) as exc:
            await _coletor(_fonte(cofre, porta), cofre).status_canais()
    assert "segredo" not in str(exc.value)
