"""Fonte Hikvision (ISAPI) de gravadores NVR/DVR: o gravador e as câmeras dos canais IP.

Lê ``/ISAPI/System/deviceInfo``, ``/ISAPI/ContentMgmt/InputProxy/channels`` e, para o estado
das câmeras, ``/ISAPI/ContentMgmt/InputProxy/channels/status`` (Digest; ver
``gravador_http``). As câmeras nunca são contatadas: o IP interno é só informação.

XML lido com ``defusedxml`` (DTD, entidades e referências externas recusadas) e sem depender do
namespace (``ver10``/``ver20``/``isapi.org`` variam por firmware). Usuário e senha das câmeras
que alguns firmwares devolvem no canal nunca são lidos.
"""

from xml.etree.ElementTree import Element  # só o tipo; o parse é do defusedxml  # nosec B405

from defusedxml.ElementTree import fromstring

from sentinela.descoberta.fontes.gravador_http import (
    MAX_CANAL,
    MSG_RESPOSTA,
    CanalGravador,
    ClienteGravador,
    ErroGravador,
    FonteGravadorHttp,
    InfoGravador,
    RecursoAusente,
    canal_ou_none,
    interpretador,
    ip_ou_none,
    mac_ou_none,
)
from sentinela.descoberta.texto import limpar

CAMINHO_DISPOSITIVO = "/ISAPI/System/deviceInfo"
CAMINHO_CANAIS = "/ISAPI/ContentMgmt/InputProxy/channels"
CAMINHO_STATUS = "/ISAPI/ContentMgmt/InputProxy/channels/status"
FABRICANTE = "Hikvision"


def _xml(corpo: bytes, raiz: str) -> Element:
    try:
        elemento = fromstring(corpo, forbid_dtd=True)
    except Exception:  # noqa: BLE001 - DTD, XML inválido, codificação desconhecida...
        raise ErroGravador(MSG_RESPOSTA) from None
    if _nome(elemento) != raiz:
        raise ErroGravador(MSG_RESPOSTA)
    return elemento


def _nome(elemento: Element) -> str:
    """Nome local da tag, sem ``{namespace}``."""
    tag = elemento.tag if isinstance(elemento.tag, str) else ""
    return tag.rsplit("}", 1)[-1]


def _filho(elemento: Element | None, nome: str) -> Element | None:
    if elemento is None:
        return None
    for filho in elemento:
        if _nome(filho) == nome:
            return filho
    return None


def _cru(elemento: Element | None, nome: str) -> str | None:
    filho = _filho(elemento, nome)
    if filho is None or filho.text is None:
        return None
    return filho.text.strip()


def _texto(elemento: Element | None, nome: str, limite: int = 120) -> str | None:
    return limpar(_cru(elemento, nome), limite)


@interpretador
def interpretar_dispositivo(corpo: bytes) -> InfoGravador:
    raiz = _xml(corpo, "DeviceInfo")
    return InfoGravador(
        nome=_texto(raiz, "deviceName"),
        modelo=_texto(raiz, "model", 64),
        firmware=_texto(raiz, "firmwareVersion", 64),
        tipo=_texto(raiz, "deviceType", 32),
        mac=mac_ou_none(_cru(raiz, "macAddress")),
        fabricante=_texto(raiz, "manufacturer", 64) or FABRICANTE,
    )


@interpretador
def interpretar_canais(corpo: bytes) -> list[CanalGravador]:
    """Canais IP (``InputProxyChannel``). Sem ``id`` válido (1..MAX_CANAL) o canal é ignorado."""
    raiz = _xml(corpo, "InputProxyChannelList")
    canais: dict[int, CanalGravador] = {}
    for item in raiz:
        if _nome(item) != "InputProxyChannel" or len(canais) >= MAX_CANAL:
            continue
        canal = canal_ou_none(_cru(item, "id"))
        if canal is None or canal in canais:
            continue
        origem = _filho(item, "sourceInputPortDescriptor")
        # ver20: proxyProtocol; ver10 (firmwares antigos): adminProtocol
        protocolo = _texto(origem, "proxyProtocol", 32) or _texto(origem, "adminProtocol", 32)
        canais[canal] = CanalGravador(
            canal=canal,
            nome=_texto(item, "name"),
            ip=ip_ou_none(_cru(origem, "ipAddress")),  # hostName nunca é resolvido
            modelo=_texto(origem, "model", 64),
            fabricante=FABRICANTE if (protocolo or "").upper() == "HIKVISION" else None,
            protocolo=protocolo,
        )
    return list(canais.values())


@interpretador
def interpretar_status(corpo: bytes) -> dict[int, bool]:
    raiz = _xml(corpo, "InputProxyChannelStatusList")
    estados: dict[int, bool] = {}
    for item in raiz:
        if _nome(item) != "InputProxyChannelStatus":
            continue
        canal = canal_ou_none(_cru(item, "id"))
        if canal is not None and canal not in estados:
            estados[canal] = (_cru(item, "online") or "").lower() == "true"
    return estados


class FonteHikvision(FonteGravadorHttp):
    """``Coletor`` de um gravador Hikvision, com ``status_canais`` para o ``LeitorCanais``."""

    async def _identificar(self, cliente: ClienteGravador) -> InfoGravador:
        return interpretar_dispositivo(await self._obter_baixa(cliente, CAMINHO_DISPOSITIVO))

    async def _listar_canais(self, cliente: ClienteGravador) -> list[CanalGravador]:
        try:
            corpo = await self._obter_baixa(cliente, CAMINHO_CANAIS)
        except RecursoAusente:
            return []  # DVR só analógico: sem canais IP
        return interpretar_canais(corpo)

    async def _ler_status(self, cliente: ClienteGravador) -> dict[int, bool]:
        return interpretar_status(await cliente.obter(CAMINHO_STATUS))
