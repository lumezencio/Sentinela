"""Fonte Dahua/Intelbras (API HTTP CGI) de gravadores NVR/DVR: o gravador e as câmeras.

Lê ``magicBox.cgi?action=getSystemInfo``, ``configManager.cgi?action=getConfig&name=RemoteDevice``
e, para o estado das câmeras, ``LogicDeviceManager.cgi?action=getCameraState`` (Digest; ver
``gravador_http``). As câmeras nunca são contatadas: o IP interno é só informação.

Comportamentos de firmware assumidos (documentação pública da API HTTP; sem captura real):

- respostas em texto ``chave=valor`` por linha (``\\n`` ou ``\\r\\n``);
- ``RemoteDevice`` em duas formas:
  ``table.RemoteDevice.uuid:System_CONFIG_NETCAMERA_INFO_<n>.<campo>`` (também sem o
  ``uuid:``) e ``table.RemoteDevice[<n>].<campo>``; ``n`` é o canal a partir de 0. Vaga
  com ``Enable=false`` é ignorada; sem ``Enable``, vale ter endereço IPv4 preenchido;
- estado: ``states[<i>].channel`` (a partir de 0) e ``states[<i>].connectionState``; só
  ``Connected`` é online (``Connecting``/``Disconnected``/outros contam como falha).
  ``RemoteDevice.Enable`` é configuração, não estado, e não é usado para decidir online.

Só os campos de uma lista fechada são guardados: ``UserName``/``Password`` das câmeras, que
alguns firmwares devolvem, nunca são lidos.
"""

import re

from sentinela.descoberta.fontes.gravador_http import (
    MAX_CANAL,
    MSG_RESPOSTA,
    CanalGravador,
    ClienteGravador,
    ErroGravador,
    FonteGravadorHttp,
    InfoGravador,
    RecursoAusente,
    interpretador,
    ip_ou_none,
    mac_ou_none,
)
from sentinela.descoberta.texto import limpar

CAMINHO_SISTEMA = "/cgi-bin/magicBox.cgi?action=getSystemInfo"
CAMINHO_REMOTOS = "/cgi-bin/configManager.cgi?action=getConfig&name=RemoteDevice"
CAMINHO_ESTADO = "/cgi-bin/LogicDeviceManager.cgi?action=getCameraState&uniqueChannels[0]=-1"

_REMOTO_UUID = re.compile(
    r"table\.RemoteDevice\.(?:uuid:)?System_CONFIG_NETCAMERA_INFO_(\d{1,6})\.([A-Za-z]{1,32})"
)
_REMOTO_INDICE = re.compile(r"table\.RemoteDevice\[(\d{1,6})\]\.([A-Za-z]{1,32})")
_ESTADO = re.compile(r"states\[(\d{1,6})\]\.(channel|connectionState)")
_CAMPOS_REMOTO = frozenset(
    {"Address", "Enable", "Name", "DeviceType", "Vendor", "ProtocolType", "Mac"}
)
_FORNECEDOR_GENERICO = frozenset({"general", "private", "onvif", "custom", "other"})


def _linhas(corpo: bytes) -> list[tuple[str, str]]:
    pares: list[tuple[str, str]] = []
    for linha in corpo.decode("utf-8", errors="replace").split("\n"):
        chave, igual, valor = linha.rstrip("\r").partition("=")
        if igual:
            pares.append((chave.strip(), valor))
    return pares


def _canal_de_indice(indice: str) -> int | None:
    n = int(indice) + 1  # o gravador numera a partir de 0
    return n if n <= MAX_CANAL else None


@interpretador
def interpretar_sistema(corpo: bytes) -> InfoGravador:
    dados = dict(_linhas(corpo))
    bruto = dados.get("deviceType", "").strip()
    modelo = limpar(bruto, 64)
    if modelo is None:
        raise ErroGravador(MSG_RESPOSTA)
    # "DHI-" é o prefixo da linha internacional Dahua; Intelbras/OEMs não são adivinhados
    fabricante = "Dahua" if bruto.upper().startswith("DHI-") else None
    return InfoGravador(nome=modelo, modelo=modelo, fabricante=fabricante)


@interpretador
def interpretar_remotos(corpo: bytes) -> list[CanalGravador]:
    vagas: dict[int, dict[str, str]] = {}
    for chave, valor in _linhas(corpo):
        casou = _REMOTO_UUID.fullmatch(chave) or _REMOTO_INDICE.fullmatch(chave)
        if casou is None or casou.group(2) not in _CAMPOS_REMOTO:
            continue
        canal = _canal_de_indice(casou.group(1))
        if canal is None:
            continue
        vagas.setdefault(canal, {}).setdefault(casou.group(2), valor)
    canais: list[CanalGravador] = []
    for canal in sorted(vagas):
        campos = vagas[canal]
        ip = ip_ou_none(campos.get("Address", "").strip())
        ligado = campos.get("Enable", "").strip().lower()
        if ligado == "false" or (ligado != "true" and ip is None):
            continue  # vaga vazia/desligada
        fornecedor = limpar(campos.get("Vendor"), 64)
        if fornecedor is not None and fornecedor.lower() in _FORNECEDOR_GENERICO:
            fornecedor = None
        canais.append(
            CanalGravador(
                canal=canal,
                nome=limpar(campos.get("Name")),
                ip=ip,
                mac=mac_ou_none(campos.get("Mac", "").strip()),
                modelo=limpar(campos.get("DeviceType"), 64),
                fabricante=fornecedor,
                protocolo=limpar(campos.get("ProtocolType"), 32),
            )
        )
    return canais


@interpretador
def interpretar_estado(corpo: bytes) -> dict[int, bool]:
    itens: dict[str, dict[str, str]] = {}
    for chave, valor in _linhas(corpo):
        casou = _ESTADO.fullmatch(chave)
        if casou is not None:
            itens.setdefault(casou.group(1), {}).setdefault(casou.group(2), valor.strip())
    if not itens:
        raise ErroGravador(MSG_RESPOSTA)  # "Error ...", página de login ou corpo vazio
    estados: dict[int, bool] = {}
    for campos in itens.values():
        numero = campos.get("channel", "")
        if not (numero.isascii() and numero.isdigit() and len(numero) <= 6):
            continue
        canal = _canal_de_indice(numero)
        if canal is not None and canal not in estados:
            estados[canal] = campos.get("connectionState") == "Connected"
    return estados


class FonteDahua(FonteGravadorHttp):
    """``Coletor`` de um gravador Dahua/Intelbras, com ``status_canais`` para o ``LeitorCanais``."""

    async def _identificar(self, cliente: ClienteGravador) -> InfoGravador:
        return interpretar_sistema(await self._obter_baixa(cliente, CAMINHO_SISTEMA))

    async def _listar_canais(self, cliente: ClienteGravador) -> list[CanalGravador]:
        try:
            corpo = await self._obter_baixa(cliente, CAMINHO_REMOTOS)
        except RecursoAusente:
            return []
        return interpretar_remotos(corpo)

    async def _ler_status(self, cliente: ClienteGravador) -> dict[int, bool]:
        return interpretar_estado(await cliente.obter(CAMINHO_ESTADO))
