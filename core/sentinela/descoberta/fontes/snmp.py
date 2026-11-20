"""Fonte SNMP: lê ARP, FDB, LLDP e sistema de qualquer roteador/switch (v2c ou v3), só leitura.

Só OIDs numéricos; nenhuma MIB é carregada nem compilada. O transporte aponta sempre para o
``DestinoAutorizado`` validado pela Guarda (nunca para nome de host). Cada GET/GETBULK custa
1 ficha de prioridade baixa do limitador global. Comunidade e senhas v3 nunca saem do adaptador:
mensagens de erro são genéricas.
"""

from collections.abc import Awaitable, Callable
from typing import Any

from pysnmp.hlapi.v3arch.asyncio import (
    CommunityData,
    ContextData,
    EndOfMibView,
    NoSuchInstance,
    NoSuchObject,
    ObjectIdentity,
    ObjectType,
    SnmpEngine,
    UdpTransportTarget,
    UsmUserData,
    bulk_cmd,
    get_cmd,
    usmAesCfb128Protocol,
    usmAesCfb256Protocol,
    usmHMAC192SHA256AuthProtocol,
    usmHMACSHAAuthProtocol,
)

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import Achado, ErroColeta, ResultadoTeste
from sentinela.descoberta.texto import limpar
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, DestinoProibido, Guarda
from sentinela.rede.mac import normalizar_mac
from sentinela.seguranca.cofre import Cofre, ErroCofre

TIMEOUT_S = 2.0
TENTATIVAS = 1
MAX_REPETICOES = 25
MAX_LINHAS = 5000  # por tabela
PORTA_PADRAO = 161

MSG_CREDENCIAL = "credencial SNMP da fonte ilegível ou incompleta"
MSG_DESTINO = "endereço da fonte fora das sub-redes permitidas"
MSG_SEM_RESPOSTA = (
    "sem resposta do equipamento SNMP: confira endereço, porta, comunidade ou credenciais v3"
)
MSG_RECUSADO = "o equipamento SNMP recusou a leitura (permissão ou visão da comunidade/usuário)"
AVISO_V2C = (
    "SNMP v2c: a comunidade trafega em texto claro; prefira SNMP v3 com autenticação e criptografia"
)
AVISO_SEM_PRIV = "SNMP v3 sem criptografia (priv): o conteúdo trafega legível"

Oid = tuple[int, ...]

OID_SYSDESCR: Oid = (1, 3, 6, 1, 2, 1, 1, 1, 0)
OID_SYSUPTIME: Oid = (1, 3, 6, 1, 2, 1, 1, 3, 0)  # TimeTicks (1/100 s), 32 bits
OID_SYSNAME: Oid = (1, 3, 6, 1, 2, 1, 1, 5, 0)
OID_ARP_NOVA: Oid = (1, 3, 6, 1, 2, 1, 4, 35, 1, 4)  # ipNetToPhysicalPhysAddress
OID_ARP_ANTIGA: Oid = (1, 3, 6, 1, 2, 1, 4, 22, 1, 2)  # ipNetToMediaPhysAddress
OID_FDB_Q: Oid = (1, 3, 6, 1, 2, 1, 17, 7, 1, 2, 2, 1, 2)  # dot1qTpFdbPort
OID_FDB_D: Oid = (1, 3, 6, 1, 2, 1, 17, 4, 3, 1, 2)  # dot1dTpFdbPort
OID_LLDP: Oid = (1, 0, 8802, 1, 1, 2, 1, 4, 1, 1)  # lldpRemEntry
_LLDP_CHASSI_TIPO, _LLDP_CHASSI, _LLDP_NOME, _LLDP_DESC = 4, 5, 9, 10
_CHASSI_MAC = 4  # lldpRemChassisIdSubtype macAddress

_AUTH = {"SHA": usmHMACSHAAuthProtocol, "SHA256": usmHMAC192SHA256AuthProtocol}
_PRIV = {"AES": usmAesCfb128Protocol, "AES256": usmAesCfb256Protocol}

Linha = tuple[Oid, Any]


class _Recusa(Exception):
    """O agente respondeu com erro de PDU (visão/permissão ou tabela ausente)."""


def _oid(vb: Any) -> Oid:
    return tuple(int(x) for x in vb[0].get_oid())


def _bytes(valor: Any) -> bytes | None:
    try:
        return bytes(valor.asOctets())
    except AttributeError:
        return None


def _mac(valor: Any) -> str | None:
    bruto = _bytes(valor)
    if bruto is None or len(bruto) != 6 or not any(bruto) or bruto == b"\xff" * 6:
        return None
    try:
        return normalizar_mac(":".join(f"{b:02x}" for b in bruto))
    except ValueError:
        return None


def _ip(octetos: Oid) -> str | None:
    if len(octetos) != 4 or any(not 0 <= o <= 255 for o in octetos):
        return None
    return ".".join(str(o) for o in octetos)


def _inteiro(valor: Any) -> int | None:
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


class FonteSnmp:
    """``Coletor`` de um agente SNMP. Copia os campos do modelo na criação (sem lazy load)."""

    def __init__(self, fonte: Fonte, cofre: Cofre, guarda: Guarda, limitador: Limitador) -> None:
        self._fonte_id = fonte.id
        self._host = fonte.host
        self._porta = fonte.porta or PORTA_PADRAO
        self._credencial = fonte.credencial_cifrada
        self._cofre = cofre
        self._guarda = guarda
        self._limitador = limitador
        self.ultimo_uptime_s: float | None = None

    # --- preparo (credencial, destino, motor) -------------------------------------------

    def _autenticacao(self) -> tuple[CommunityData | UsmUserData, list[str]]:
        try:
            dados = self._cofre.decifrar(self._credencial)
        except ErroCofre:
            raise ErroColeta(MSG_CREDENCIAL) from None
        versao = dados.get("versao")
        if versao == "2c":
            comunidade = dados.get("comunidade")
            if not comunidade:
                raise ErroColeta(MSG_CREDENCIAL)
            return CommunityData(comunidade, mpModel=1), [AVISO_V2C]  # noqa: S508 - v2c é requisito; avisa
        if versao == "3":
            return self._usm_v3(dados)
        raise ErroColeta(MSG_CREDENCIAL)

    @staticmethod
    def _usm_v3(dados: dict[str, str]) -> tuple[UsmUserData, list[str]]:
        usuario = dados.get("usuario")
        auth, senha_auth = dados.get("auth"), dados.get("senha_auth")
        priv, senha_priv = dados.get("priv"), dados.get("senha_priv")
        if not usuario or auth not in _AUTH or not senha_auth:
            raise ErroColeta(MSG_CREDENCIAL)
        if priv and (priv not in _PRIV or not senha_priv):
            raise ErroColeta(MSG_CREDENCIAL)
        try:
            if priv:
                usm = UsmUserData(
                    usuario,
                    senha_auth,
                    senha_priv,
                    authProtocol=_AUTH[auth],
                    privProtocol=_PRIV[priv],
                )
                return usm, []
            usm = UsmUserData(usuario, senha_auth, authProtocol=_AUTH[auth])
        except Exception:  # noqa: BLE001 - a biblioteca pode citar a senha; nada disso sai
            raise ErroColeta(MSG_CREDENCIAL) from None
        return usm, [AVISO_SEM_PRIV]

    def _destino(self) -> DestinoAutorizado:
        try:
            return self._guarda.validar(self._host, self._porta, "udp")
        except DestinoProibido:
            raise ErroColeta(MSG_DESTINO) from None

    async def _ficha(self) -> None:
        await self._limitador.adquirir(1, prioridade="baixa")

    async def _com_sessao(
        self, trabalho: Callable[["_Sessao"], Awaitable[Any]]
    ) -> tuple[Any, list[str]]:
        auth, avisos = self._autenticacao()
        destino = self._destino()
        motor = SnmpEngine()
        try:
            alvo = await UdpTransportTarget.create(
                (str(destino.ip), destino.porta or PORTA_PADRAO),
                timeout=TIMEOUT_S,
                retries=TENTATIVAS,
            )
            return await trabalho(_Sessao(self, motor, auth, alvo)), avisos
        except ErroColeta:
            raise
        except _Recusa:
            raise ErroColeta(MSG_RECUSADO) from None
        except Exception:  # noqa: BLE001 - erro da biblioteca pode citar credenciais
            raise ErroColeta(MSG_SEM_RESPOSTA) from None
        finally:
            motor.close_dispatcher()

    # --- coleta -------------------------------------------------------------------------

    async def coletar(self) -> list[Achado]:
        self.ultimo_uptime_s = None
        resultado, _ = await self._com_sessao(self._ler_tabelas)
        return list(resultado)

    async def _ler_tabelas(self, s: "_Sessao") -> list[Achado]:
        achados = await self._arp(s)
        achados += await self._fdb(s)
        achados += await self._lldp(s)
        self.ultimo_uptime_s = await self._uptime(s)
        return achados

    @staticmethod
    async def _uptime(s: "_Sessao") -> float | None:
        """``sysUpTime`` na mesma sessão (um GET a mais, ao mesmo destino). Qualquer falha
        ou ausência vira ``None``: a coleta das tabelas já está completa e não é afetada."""
        try:
            ticks = _inteiro((await s.obter(OID_SYSUPTIME)).get(OID_SYSUPTIME))
        except Exception:  # noqa: BLE001 - leitura opcional; nada do aparelho é propagado
            return None
        return ticks / 100 if ticks is not None and ticks >= 0 else None

    async def _arp(self, s: "_Sessao") -> list[Achado]:
        saida: list[Achado] = []
        # ipNetToPhysical: índice = ifIndex.tipo(1=ipv4).tamanho(4).a.b.c.d
        for sufixo, valor in await s.tabela_opcional(OID_ARP_NOVA):
            if len(sufixo) == 7 and sufixo[1:3] == (1, 4):
                saida.append(self._arp_achado(_ip(sufixo[3:]), valor))
        if not saida:
            # ipNetToMedia: índice = ifIndex.a.b.c.d
            for sufixo, valor in await s.tabela_opcional(OID_ARP_ANTIGA):
                if len(sufixo) == 5:
                    saida.append(self._arp_achado(_ip(sufixo[1:]), valor))
        return [a for a in saida if a.ip and a.mac]

    def _arp_achado(self, ip: str | None, valor: Any) -> Achado:
        return Achado(ip, _mac(valor), "snmp_arp", self._fonte_id)

    async def _fdb(self, s: "_Sessao") -> list[Achado]:
        linhas = [
            (sufixo[1:], valor)  # dot1qTpFdbPort: fdbId.mac(6)
            for sufixo, valor in await s.tabela_opcional(OID_FDB_Q)
            if len(sufixo) == 7
        ]
        if not linhas:
            linhas = [  # dot1dTpFdbPort: mac(6)
                (sufixo, valor)
                for sufixo, valor in await s.tabela_opcional(OID_FDB_D)
                if len(sufixo) == 6
            ]
        saida: list[Achado] = []
        for mac_oid, valor in linhas:
            porta = _inteiro(valor)
            if porta is None or porta <= 0 or any(not 0 <= o <= 255 for o in mac_oid):
                continue  # porta 0 = o próprio equipamento
            mac = _mac(_Octetos(bytes(mac_oid)))
            if mac:
                saida.append(
                    Achado(
                        None,
                        mac,
                        "snmp_fdb",
                        self._fonte_id,
                        sinais={"porta_switch": str(porta)},
                    )
                )
        return saida

    async def _lldp(self, s: "_Sessao") -> list[Achado]:
        chassis = await s.tabela_opcional(OID_LLDP + (_LLDP_CHASSI,))
        if not chassis:
            return []
        tipos = dict(await s.tabela_opcional(OID_LLDP + (_LLDP_CHASSI_TIPO,)))
        nomes = dict(await s.tabela_opcional(OID_LLDP + (_LLDP_NOME,)))
        descricoes = dict(await s.tabela_opcional(OID_LLDP + (_LLDP_DESC,)))
        saida: list[Achado] = []
        for indice, valor in chassis:
            if _inteiro(tipos.get(indice)) != _CHASSI_MAC:
                continue
            mac = _mac(valor)
            if mac is None:
                continue
            sinais: dict[str, str] = {}
            descricao = limpar(descricoes.get(indice), 120)
            if descricao:
                sinais["plataforma"] = descricao
            if len(indice) == 3:  # timeMark.portaLocal.remIndex
                sinais["porta_local"] = str(indice[1])
            nome = limpar(nomes.get(indice), 64)
            saida.append(Achado(None, mac, "lldp", self._fonte_id, nome=nome, sinais=sinais))
        return saida

    # --- teste --------------------------------------------------------------------------

    async def testar(self) -> ResultadoTeste:
        try:
            (identidade, versao), avisos = await self._com_sessao(self._ler_sistema)
        except ErroColeta as e:
            return ResultadoTeste(False, erro=str(e))
        return ResultadoTeste(True, identidade, versao, avisos)

    @staticmethod
    async def _ler_sistema(s: "_Sessao") -> tuple[str | None, str | None]:
        valores = await s.obter(OID_SYSNAME, OID_SYSDESCR)
        return (
            limpar(valores.get(OID_SYSNAME), 64),
            limpar(valores.get(OID_SYSDESCR), 120),
        )


class _Octetos:
    """Adapta bytes ao formato de ``_mac`` (que lê ``asOctets``)."""

    def __init__(self, bruto: bytes) -> None:
        self._bruto = bruto

    def asOctets(self) -> bytes:  # noqa: N802 - mesmo nome da API do pysnmp
        return self._bruto


class _Sessao:
    """Pedidos SNMP de uma coleta; cada um custa 1 ficha de prioridade baixa."""

    def __init__(
        self,
        fonte: FonteSnmp,
        motor: SnmpEngine,
        auth: CommunityData | UsmUserData,
        alvo: UdpTransportTarget,
    ) -> None:
        self._fonte = fonte
        self._motor = motor
        self._auth = auth
        self._alvo = alvo

    @staticmethod
    def _verificar(indicacao: Any, status: Any) -> None:
        if indicacao:
            raise ErroColeta(MSG_SEM_RESPOSTA)
        if status:
            raise _Recusa

    async def obter(self, *oids: Oid) -> dict[Oid, Any]:
        await self._fonte._ficha()
        pedido = [ObjectType(ObjectIdentity(".".join(map(str, o)))) for o in oids]
        indicacao, status, _, vbs = await get_cmd(
            self._motor, self._auth, self._alvo, ContextData(), *pedido
        )
        self._verificar(indicacao, status)
        saida: dict[Oid, Any] = {}
        for vb in vbs:
            if not isinstance(vb[1], NoSuchObject | NoSuchInstance | EndOfMibView):
                saida[_oid(vb)] = vb[1]
        return saida

    async def tabela(self, base: Oid) -> list[Linha]:
        """Percorre a subárvore ``base`` com GETBULK; devolve (sufixo do índice, valor)."""
        linhas: list[Linha] = []
        atual = base
        while len(linhas) < MAX_LINHAS:
            await self._fonte._ficha()
            indicacao, status, _, vbs = await bulk_cmd(
                self._motor,
                self._auth,
                self._alvo,
                ContextData(),
                0,
                MAX_REPETICOES,
                ObjectType(ObjectIdentity(".".join(map(str, atual)))),
            )
            self._verificar(indicacao, status)
            terminou = not vbs
            for vb in vbs:
                oid, valor = _oid(vb), vb[1]
                fora = oid[: len(base)] != base or oid <= atual
                if fora or isinstance(valor, NoSuchObject | NoSuchInstance | EndOfMibView):
                    terminou = True
                    break
                linhas.append((oid[len(base) :], valor))
                atual = oid
                if len(linhas) >= MAX_LINHAS:
                    break
            if terminou:
                break
        return linhas

    async def tabela_opcional(self, base: Oid) -> list[Linha]:
        """Como ``tabela``, mas visão/permissão ausente vira lista vazia (tabela opcional)."""
        try:
            return await self.tabela(base)
        except _Recusa:
            return []
