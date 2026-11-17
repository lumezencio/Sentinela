"""Fonte MikroTik: lê ARP, DHCP, vizinhos e registro Wi-Fi pela API RouterOS (somente leitura).

TLS (8729) por padrão; 8728 só quando o admin desmarca TLS, com aviso. Cada passo na rede
(conexão TCP, login e cada comando) custa 1 ficha de prioridade baixa do limitador global.
"""

import re
from collections.abc import AsyncIterator, Callable, Mapping
from contextlib import asynccontextmanager
from ipaddress import IPv4Address

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import (
    Achado,
    CertificadoMudou,
    CertificadoNaoConfiado,
    ErroColeta,
    Origem,
    ResultadoTeste,
)
from sentinela.descoberta.fontes.mikrotik_api import ClienteRouterOS, ErroComandoRouterOS
from sentinela.descoberta.texto import limpar
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, DestinoProibido, Guarda
from sentinela.rede.mac import normalizar_mac
from sentinela.seguranca.cofre import Cofre, ErroCofre

TIMEOUT_S = 5.0

MSG_CREDENCIAL = "credencial da fonte ilegível ou incompleta"
MSG_DESTINO = "endereço da fonte fora das sub-redes permitidas"
AVISO_TEXTO_CLARO = (
    "conexão sem TLS: usuário e senha trafegam em texto claro; prefira a api-ssl (8729)"
)
AVISO_ESCRITA = (
    "o usuário tem permissão de escrita no MikroTik (write/policy/full); "
    "use um grupo somente leitura"
)
AVISO_SEM_PERMISSOES = "não foi possível conferir as permissões do usuário no MikroTik"

_POLITICAS_PERIGOSAS = frozenset({"write", "policy", "full"})

CMD_IDENTIDADE = ["/system/identity/print", "=.proplist=name"]
CMD_RECURSOS = ["/system/resource/print", "=.proplist=version,board-name"]
CMD_ARP = ["/ip/arp/print", "=.proplist=address,mac-address,interface"]
CMD_DHCP = ["/ip/dhcp-server/lease/print", "=.proplist=address,mac-address,host-name"]
CMD_VIZINHOS = [
    "/ip/neighbor/print",
    "=.proplist=address,address4,mac-address,identity,platform,board,version,interface",
]
_PROPLIST_WIFI = "=.proplist=mac-address,interface,last-ip,signal-strength,signal"
WIFI_V7 = "/interface/wifi/registration-table/print"
CAPSMAN = "/caps-man/registration-table/print"
WIRELESS_V6 = "/interface/wireless/registration-table/print"
# tenta em ordem; o primeiro que o aparelho aceitar vale (pacote ausente → !trap)
_WIFI_POR_VERSAO = {6: (WIRELESS_V6, CAPSMAN), 7: (WIFI_V7, CAPSMAN, WIRELESS_V6)}

_VERSAO = re.compile(r"^\s*(\d+)\.(\d+)")


def _ip(valor: str | None) -> str | None:
    if not valor or len(valor) > 15:
        return None
    try:
        return str(IPv4Address(valor))
    except ValueError:
        return None


def _mac(valor: str | None) -> str | None:
    if not valor or len(valor) > 17:
        return None
    try:
        return normalizar_mac(valor)
    except ValueError:
        return None


def _sinais(linha: Mapping[str, str], mapa: Mapping[str, str]) -> dict[str, str]:
    """``{sinal: propriedade}`` → valores limpos presentes na linha."""
    saida: dict[str, str] = {}
    for sinal, propriedade in mapa.items():
        valor = limpar(linha.get(propriedade), 64)
        if valor is not None:
            saida[sinal] = valor
    return saida


class FonteMikrotik:
    """``Coletor`` de um MikroTik. Copia os campos do modelo na criação (sem lazy load)."""

    def __init__(self, fonte: Fonte, cofre: Cofre, guarda: Guarda, limitador: Limitador) -> None:
        self._fonte_id = fonte.id
        self._host = fonte.host
        self._porta = fonte.porta
        self._tls = fonte.tls
        self._credencial = fonte.credencial_cifrada
        self._impressao = fonte.impressao_tls
        self._cofre = cofre
        self._guarda = guarda
        self._limitador = limitador

    async def _ficha(self) -> None:
        await self._limitador.adquirir(1, prioridade="baixa")

    async def _cmd(self, cliente: ClienteRouterOS, palavras: list[str]) -> list[dict[str, str]]:
        await self._ficha()
        return await cliente.comando(palavras)

    def _credenciais(self) -> tuple[str, str]:
        try:
            dados = self._cofre.decifrar(self._credencial)
        except ErroCofre:
            raise ErroColeta(MSG_CREDENCIAL) from None
        usuario, senha = dados.get("usuario"), dados.get("senha")
        if not usuario or senha is None:
            raise ErroColeta(MSG_CREDENCIAL)
        return usuario, senha

    def _destino(self) -> DestinoAutorizado:
        try:
            return self._guarda.validar(self._host, self._porta, "tcp")
        except DestinoProibido:
            raise ErroColeta(MSG_DESTINO) from None

    @asynccontextmanager
    async def _sessao(self) -> AsyncIterator[tuple[ClienteRouterOS, str]]:
        usuario, senha = self._credenciais()
        cliente = ClienteRouterOS(self._destino(), self._tls, self._impressao, TIMEOUT_S)
        try:
            await self._ficha()
            await cliente.conectar()  # com TLS, confere a impressão antes de qualquer login
            await self._ficha()
            await cliente.login(usuario, senha)
            yield cliente, usuario
        finally:
            await cliente.fechar()

    async def _versao(self, cliente: ClienteRouterOS) -> str | None:
        linhas = await self._cmd(cliente, CMD_RECURSOS)
        return limpar(linhas[0].get("version"), 64) if linhas else None

    async def coletar(self) -> list[Achado]:
        async with self._sessao() as (cliente, _):
            versao = await self._versao(cliente)
            achados = self._achados(await self._cmd(cliente, CMD_ARP), "arp", self._de_arp)
            achados += self._achados(await self._cmd(cliente, CMD_DHCP), "dhcp", self._de_dhcp)
            vizinhos = await self._cmd(cliente, CMD_VIZINHOS)
            achados += self._achados(vizinhos, "vizinho", self._de_vizinho)
            achados += self._achados(await self._wifi(cliente, versao), "wifi", self._de_wifi)
        return achados

    async def _wifi(self, cliente: ClienteRouterOS, versao: str | None) -> list[dict[str, str]]:
        casamento = _VERSAO.match(versao or "")
        maior = int(casamento.group(1)) if casamento else 7
        for comando in _WIFI_POR_VERSAO[6 if maior <= 6 else 7]:
            try:
                return await self._cmd(cliente, [comando, _PROPLIST_WIFI])
            except ErroComandoRouterOS:
                continue  # pacote/menu ausente nesta versão
        return []

    def _achados(
        self,
        linhas: list[dict[str, str]],
        origem: Origem,
        extrair: Callable[[dict[str, str]], tuple[str | None, str | None, dict[str, str]]],
    ) -> list[Achado]:
        saida: list[Achado] = []
        for linha in linhas:
            nome, ip, sinais = extrair(linha)
            mac = _mac(linha.get("mac-address"))
            if ip is None and mac is None:
                continue
            saida.append(Achado(ip, mac, origem, self._fonte_id, nome=nome, sinais=sinais))
        return saida

    @staticmethod
    def _de_arp(linha: dict[str, str]) -> tuple[str | None, str | None, dict[str, str]]:
        return None, _ip(linha.get("address")), _sinais(linha, {"interface": "interface"})

    @staticmethod
    def _de_dhcp(linha: dict[str, str]) -> tuple[str | None, str | None, dict[str, str]]:
        return limpar(linha.get("host-name")), _ip(linha.get("address")), {}

    @staticmethod
    def _de_vizinho(linha: dict[str, str]) -> tuple[str | None, str | None, dict[str, str]]:
        ip = _ip(linha.get("address4")) or _ip(linha.get("address"))
        mapa = {
            "plataforma": "platform",
            "placa": "board",
            "versao": "version",
            "interface": "interface",
        }
        return limpar(linha.get("identity")), ip, _sinais(linha, mapa)

    @staticmethod
    def _de_wifi(linha: dict[str, str]) -> tuple[str | None, str | None, dict[str, str]]:
        sinais = _sinais(linha, {"interface": "interface", "sinal": "signal-strength"})
        sinais.update(_sinais(linha, {"sinal": "signal"}))
        return None, _ip(linha.get("last-ip")), sinais

    async def testar(self) -> ResultadoTeste:
        avisos: list[str] = [] if self._tls else [AVISO_TEXTO_CLARO]
        impressao: str | None = None
        try:
            async with self._sessao() as (cliente, usuario):
                impressao = cliente.impressao
                linhas = await self._cmd(cliente, CMD_IDENTIDADE)
                identidade = limpar(linhas[0].get("name")) if linhas else None
                versao = await self._versao(cliente)
                avisos += await self._conferir_permissoes(cliente, usuario)
        except (CertificadoNaoConfiado, CertificadoMudou) as e:
            return ResultadoTeste(False, avisos=avisos, impressao_tls=e.impressao, erro=str(e))
        except ErroColeta as e:
            return ResultadoTeste(False, avisos=avisos, impressao_tls=impressao, erro=str(e))
        return ResultadoTeste(True, identidade, versao, avisos, impressao, None)

    async def _conferir_permissoes(self, cliente: ClienteRouterOS, usuario: str) -> list[str]:
        """Grupo do próprio usuário → políticas; ``write``/``policy``/``full`` sem ``!`` avisa."""
        try:
            usuarios = await self._cmd(
                cliente, ["/user/print", f"?name={usuario}", "=.proplist=name,group"]
            )
            grupo = usuarios[0].get("group") if usuarios else None
            if not grupo:
                return [AVISO_SEM_PERMISSOES]
            if grupo == "full":
                return [AVISO_ESCRITA]
            grupos = await self._cmd(
                cliente, ["/user/group/print", f"?name={grupo}", "=.proplist=name,policy"]
            )
        except ErroComandoRouterOS:
            return [AVISO_SEM_PERMISSOES]
        if not grupos:
            return [AVISO_SEM_PERMISSOES]
        politicas = {p.strip() for p in grupos[0].get("policy", "").split(",")}
        return [AVISO_ESCRITA] if politicas & _POLITICAS_PERIGOSAS else []
