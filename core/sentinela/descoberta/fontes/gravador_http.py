"""Cliente HTTP dos gravadores (NVR/DVR) e base comum das fontes Hikvision e Dahua.

Único módulo da descoberta que importa ``httpx``/``httpcore`` (teste estático garante).

- **Destino**: a URL é montada só com o IP do ``DestinoAutorizado`` (nunca nome de host) e o
  backend de rede recusa conectar em qualquer outro endereço/porta.
- **Autenticação**: HTTP Digest (``httpx.DigestAuth``); nunca Basic, então a senha não trafega.
- **TLS**: sem verificação de cadeia/nome (gravadores usam certificado autoassinado); a confiança
  vem da impressão SHA-256 do certificado, **fixada** pelo admin (spec §9.4) e conferida logo
  depois do aperto de mão TLS, antes de qualquer byte HTTP (nem o desafio Digest sai). Sem
  impressão confiada → ``CertificadoNaoConfiado``; diferente → ``CertificadoMudou``.
- **Limites**: sem seguir redirecionamento; ``Accept-Encoding: identity`` (sem descompressão);
  corpo lido em fluxo e abortado acima de 2 MB (inclusive o corpo do 401 intermediário que o
  httpx lê); prazo total de 5 s por pedido (desafio + resposta).
- **Erros**: mensagens genéricas e fixas; nunca usuário, senha nem texto do aparelho.
"""

import asyncio
import functools
import hashlib
import hmac
import ssl
from collections.abc import AsyncIterable, AsyncIterator, Callable, Iterable
from dataclasses import dataclass
from ipaddress import IPv4Address
from types import TracebackType
from typing import Any, Self, cast

import httpcore
import httpx

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import (
    Achado,
    CertificadoMudou,
    CertificadoNaoConfiado,
    ErroColeta,
    ResultadoTeste,
)
from sentinela.descoberta.texto import limpar
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, DestinoProibido, Guarda
from sentinela.rede.mac import normalizar_mac
from sentinela.seguranca.cofre import Cofre, ErroCofre

TIMEOUT_S = 5.0
LIMITE_BYTES = 2 * 1024 * 1024
MAX_CANAL = 1024  # números de canal aceitos: 1..MAX_CANAL (o resto é descartado)

MSG_CREDENCIAL = "credencial do gravador ilegível ou incompleta"
MSG_DESTINO = "endereço da fonte fora das sub-redes permitidas"
MSG_CONEXAO = "não foi possível conectar ao gravador"
MSG_TEMPO = "o gravador não respondeu a tempo"
MSG_LOGIN = "usuário ou senha recusados pelo gravador"
MSG_RESPOSTA = "resposta inesperada do gravador"
MSG_GRANDE = "resposta do gravador grande demais"
MSG_SEM_CERT = "o gravador não apresentou certificado TLS"
AVISO_SEM_TLS = (
    "conexão sem TLS: o conteúdo trafega legível e o Digest pode ser atacado offline; "
    "prefira HTTPS no gravador"
)


class ErroGravador(ErroColeta):
    """Falha genérica no diálogo HTTP com o gravador (mensagem fixa, segura para guardar)."""


class RecursoAusente(ErroGravador):
    """HTTP 404: o gravador não oferece este recurso (ex.: DVR sem canais IP)."""

    def __init__(self) -> None:
        super().__init__(MSG_RESPOSTA)


@dataclass(frozen=True)
class InfoGravador:
    nome: str | None = None
    modelo: str | None = None
    firmware: str | None = None
    tipo: str | None = None
    mac: str | None = None
    fabricante: str | None = None


@dataclass(frozen=True)
class CanalGravador:
    canal: int
    nome: str | None = None
    ip: str | None = None
    mac: str | None = None
    modelo: str | None = None
    fabricante: str | None = None
    protocolo: str | None = None


# ---- utilidades de interpretação (compartilhadas por hikvision.py e dahua.py) --------------


def interpretador[R](funcao: Callable[[bytes], R]) -> Callable[[bytes], R]:
    """Blinda um parser de resposta do gravador: qualquer exceção que não seja ``ErroColeta``
    (codificação desconhecida, bug com entrada hostil...) vira ``ErroGravador`` genérico, sem
    encadear a exceção original (que pode carregar texto escolhido pelo aparelho)."""

    @functools.wraps(funcao)
    def protegido(corpo: bytes) -> R:
        try:
            return funcao(corpo)
        except ErroColeta:
            raise
        except Exception:  # noqa: BLE001 - nada controlado pelo aparelho escapa
            raise ErroGravador(MSG_RESPOSTA) from None

    return protegido


def ip_ou_none(valor: str | None) -> str | None:
    """IPv4 em notação decimal estrita, ou ``None`` (nome de host nunca é resolvido)."""
    if not valor or len(valor) > 15:
        return None
    try:
        ip = IPv4Address(valor)
    except ValueError:
        return None
    return None if ip.is_unspecified else str(ip)


def mac_ou_none(valor: str | None) -> str | None:
    if not valor or len(valor) > 17:
        return None
    try:
        return normalizar_mac(valor)
    except ValueError:
        return None


def canal_ou_none(valor: str | None) -> int | None:
    if not valor or not valor.isascii() or not valor.isdigit() or len(valor) > 6:
        return None
    n = int(valor)
    return n if 1 <= n <= MAX_CANAL else None


# ---- transporte: httpcore com backend que confere destino e certificado ---------------------


def _contexto_tls() -> ssl.SSLContext:
    contexto = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    contexto.minimum_version = ssl.TLSVersion.TLSv1_2
    # Certificado autoassinado no gravador: em vez de cadeia/nome, a confiança vem da impressão
    # SHA-256 fixada pelo admin, conferida no aperto de mão (``_Conferente``).
    contexto.check_hostname = False
    contexto.verify_mode = ssl.CERT_NONE
    return contexto


class _Conferente:
    """Confere a impressão do certificado de cada conexão TLS nova (antes de qualquer byte HTTP)."""

    def __init__(self, confiada: str | None) -> None:
        self._confiada = confiada.lower() if confiada else None
        self.impressao: str | None = None

    def conferir(self, fluxo: httpcore.AsyncNetworkStream) -> None:
        objeto = fluxo.get_extra_info("ssl_object")
        der = objeto.getpeercert(binary_form=True) if objeto is not None else None
        if not der:
            raise ErroGravador(MSG_SEM_CERT)
        impressao = hashlib.sha256(der).hexdigest()
        self.impressao = impressao
        if self._confiada is None:
            raise CertificadoNaoConfiado(impressao)
        if not hmac.compare_digest(impressao, self._confiada):
            raise CertificadoMudou(impressao)


class _Fluxo(httpcore.AsyncNetworkStream):
    def __init__(self, interno: httpcore.AsyncNetworkStream, conferente: _Conferente) -> None:
        self._interno = interno
        self._conferente = conferente

    async def read(self, max_bytes: int, timeout: float | None = None) -> bytes:  # noqa: ASYNC109
        return await self._interno.read(max_bytes, timeout)

    async def write(self, buffer: bytes, timeout: float | None = None) -> None:  # noqa: ASYNC109
        await self._interno.write(buffer, timeout)

    async def aclose(self) -> None:
        await self._interno.aclose()

    async def start_tls(
        self,
        ssl_context: ssl.SSLContext,
        server_hostname: str | None = None,
        timeout: float | None = None,  # noqa: ASYNC109
    ) -> httpcore.AsyncNetworkStream:
        tls = await self._interno.start_tls(ssl_context, server_hostname, timeout)
        try:
            self._conferente.conferir(tls)
        except BaseException:
            await tls.aclose()
            raise
        return tls

    def get_extra_info(self, info: str) -> Any:
        return self._interno.get_extra_info(info)


class _Backend(httpcore.AsyncNetworkBackend):
    """Só conecta no IP/porta do ``DestinoAutorizado``; envolve o fluxo para conferir o TLS."""

    def __init__(self, destino: DestinoAutorizado, conferente: _Conferente) -> None:
        self._destino = destino
        self._conferente = conferente
        self._base = httpcore.AnyIOBackend()

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,  # noqa: ASYNC109
        local_address: str | None = None,
        socket_options: Iterable[Any] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        if host != str(self._destino.ip) or port != self._destino.porta:
            raise ErroGravador(MSG_CONEXAO)  # defesa: nada fora do destino validado
        fluxo = await self._base.connect_tcp(host, port, timeout, local_address, socket_options)
        return _Fluxo(fluxo, self._conferente)

    async def connect_unix_socket(
        self,
        path: str,
        timeout: float | None = None,  # noqa: ASYNC109
        socket_options: Iterable[Any] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        raise ErroGravador(MSG_CONEXAO)

    async def sleep(self, seconds: float) -> None:
        await self._base.sleep(seconds)


class _Corpo(httpx.AsyncByteStream):
    """Corpo em fluxo com teto de bytes: vale para toda resposta, inclusive o 401 do Digest."""

    def __init__(self, fluxo: Iterable[bytes] | AsyncIterable[bytes], limite: int) -> None:
        self._fluxo = fluxo
        self._limite = limite

    async def __aiter__(self) -> AsyncIterator[bytes]:
        total = 0
        async for parte in cast(AsyncIterable[bytes], self._fluxo):
            total += len(parte)
            if total > self._limite:
                raise ErroGravador(MSG_GRANDE)
            yield parte

    async def aclose(self) -> None:
        fechar = getattr(self._fluxo, "aclose", None)
        if fechar is not None:
            await fechar()


class _Transporte(httpx.AsyncBaseTransport):
    def __init__(self, pool: httpcore.AsyncConnectionPool, limite: int) -> None:
        self._pool = pool
        self._limite = limite

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        pedido = httpcore.Request(
            method=request.method,
            url=httpcore.URL(
                scheme=request.url.raw_scheme,
                host=request.url.raw_host,
                port=request.url.port,
                target=request.url.raw_path,
            ),
            headers=request.headers.raw,
            content=cast(AsyncIterable[bytes], request.stream),
            extensions=request.extensions,
        )
        resposta = await self._pool.handle_async_request(pedido)
        return httpx.Response(
            status_code=resposta.status,
            headers=resposta.headers,
            stream=_Corpo(resposta.stream, self._limite),
            extensions=resposta.extensions,
        )

    async def aclose(self) -> None:
        await self._pool.aclose()


class ClienteGravador:
    """Sessão HTTP(S) com um gravador. Use com ``async with``; ``obter`` devolve o corpo."""

    def __init__(
        self,
        destino: DestinoAutorizado,
        usuario: str,
        senha: str,
        impressao_confiada: str | None,
        timeout_s: float = TIMEOUT_S,
        limite_bytes: int = LIMITE_BYTES,
    ) -> None:
        if destino.protocolo not in ("http", "https") or destino.porta is None:
            raise ValueError("o gravador exige destino http/https com porta")
        self._destino = destino
        self._https = destino.protocolo == "https"
        self._timeout = timeout_s
        self._limite = limite_bytes
        self._conferente = _Conferente(impressao_confiada)
        pool = httpcore.AsyncConnectionPool(
            ssl_context=_contexto_tls() if self._https else None,
            max_connections=1,
            http1=True,
            http2=False,
            retries=0,
            network_backend=_Backend(destino, self._conferente),
        )
        self._cliente = httpx.AsyncClient(
            transport=_Transporte(pool, limite_bytes),
            auth=httpx.DigestAuth(usuario, senha),
            follow_redirects=False,
            trust_env=False,
            timeout=timeout_s,
            headers={"Accept-Encoding": "identity", "User-Agent": "Sentinela"},
        )

    @property
    def impressao(self) -> str | None:
        """SHA-256 (hex) do certificado apresentado na última conexão TLS, se houve."""
        return self._conferente.impressao

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        tipo: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self.fechar()

    async def fechar(self) -> None:
        try:
            await self._cliente.aclose()
        except Exception:  # noqa: BLE001, S110 - fechar não pode mascarar o erro original  # nosec B110
            pass

    async def obter(self, caminho: str) -> bytes:
        """``GET`` de um caminho fixo (começa com ``/``). Só 200 devolve corpo."""
        if not caminho.startswith("/") or caminho.startswith("//"):
            raise ValueError("caminho inválido")
        esquema = "https" if self._https else "http"
        url = f"{esquema}://{self._destino.ip}:{self._destino.porta}{caminho}"
        try:
            async with asyncio.timeout(self._timeout):
                async with self._cliente.stream("GET", url) as resposta:
                    return await self._ler(resposta)
        except ErroColeta:
            raise  # inclui CertificadoNaoConfiado/CertificadoMudou e teto de bytes
        except (TimeoutError, httpx.TimeoutException, httpcore.TimeoutException):
            raise ErroGravador(MSG_TEMPO) from None
        except (httpx.ConnectError, httpcore.ConnectError, ConnectionError):
            raise ErroGravador(MSG_CONEXAO) from None
        except Exception:  # noqa: BLE001 - rede, protocolo ou Digest malformado: genérico
            raise ErroGravador(MSG_RESPOSTA) from None

    async def _ler(self, resposta: httpx.Response) -> bytes:
        status = resposta.status_code
        if status == 401:
            raise ErroGravador(MSG_LOGIN)
        if status == 404:
            raise RecursoAusente()
        if status != 200:  # inclusive 3xx: redirecionamento nunca é seguido
            raise ErroGravador(MSG_RESPOSTA)
        if resposta.headers.get("content-encoding", "identity").strip().lower() != "identity":
            raise ErroGravador(MSG_RESPOSTA)
        declarado = resposta.headers.get("content-length", "")
        if declarado.isdigit() and int(declarado) > self._limite:
            raise ErroGravador(MSG_GRANDE)
        corpo = bytearray()
        async for parte in resposta.aiter_raw():
            corpo += parte  # _Corpo já aborta acima do teto
        return bytes(corpo)


# ---- base das fontes ------------------------------------------------------------------------


def _sinais(pares: dict[str, str | None]) -> dict[str, str]:
    return {k: t for k, v in pares.items() if (t := limpar(v, 64)) is not None}


class FonteGravadorHttp:
    """Base das fontes de gravador (``Coletor`` + ``status_canais``).

    Copia os campos do modelo na criação (sem lazy load). Inventário e teste custam 1 ficha de
    prioridade **baixa** por requisição; ``status_canais`` não gasta ficha própria: quem chama
    (``LeitorCanais``) paga 1 ficha **normal** por gravador por ciclo (spec §9.6).
    """

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

    # -- a implementar por fabricante --

    async def _identificar(self, cliente: ClienteGravador) -> InfoGravador:
        raise NotImplementedError

    async def _listar_canais(self, cliente: ClienteGravador) -> list[CanalGravador]:
        raise NotImplementedError

    async def _ler_status(self, cliente: ClienteGravador) -> dict[int, bool]:
        raise NotImplementedError

    # -- comum --

    def _credenciais(self) -> tuple[str, str]:
        try:
            dados = self._cofre.decifrar(self._credencial)
        except ErroCofre:
            raise ErroColeta(MSG_CREDENCIAL) from None
        usuario, senha = dados.get("usuario"), dados.get("senha")
        if not usuario or not senha:
            raise ErroColeta(MSG_CREDENCIAL)
        return usuario, senha

    def _destino(self) -> DestinoAutorizado:
        try:
            return self._guarda.validar(self._host, self._porta, "https" if self._tls else "http")
        except DestinoProibido:
            raise ErroColeta(MSG_DESTINO) from None

    def _cliente(self, destino: DestinoAutorizado | None = None) -> ClienteGravador:
        destino = destino or self._destino()
        usuario, senha = self._credenciais()
        return ClienteGravador(destino, usuario, senha, self._impressao, TIMEOUT_S)

    async def _obter_baixa(self, cliente: ClienteGravador, caminho: str) -> bytes:
        await self._limitador.adquirir(1, prioridade="baixa")
        return await cliente.obter(caminho)

    async def coletar(self) -> list[Achado]:
        destino = self._destino()
        async with self._cliente(destino) as cliente:
            info = await self._identificar(cliente)
            canais = await self._listar_canais(cliente)
        gravador = self._achado_gravador(str(destino.ip), info)
        return [gravador, *(self._achado_canal(c) for c in canais)]

    async def status_canais(self) -> dict[int, bool]:
        """Canal → online, numa única leitura leve (sem ficha própria; ver a classe)."""
        async with self._cliente() as cliente:
            return await self._ler_status(cliente)

    async def testar(self) -> ResultadoTeste:
        avisos = [] if self._tls else [AVISO_SEM_TLS]
        impressao: str | None = None
        try:
            async with self._cliente() as cliente:
                try:
                    info = await self._identificar(cliente)
                finally:
                    impressao = cliente.impressao
        except (CertificadoNaoConfiado, CertificadoMudou) as e:
            return ResultadoTeste(False, avisos=avisos, impressao_tls=e.impressao, erro=str(e))
        except ErroColeta as e:
            return ResultadoTeste(False, avisos=avisos, impressao_tls=impressao, erro=str(e))
        return ResultadoTeste(True, info.nome, info.firmware, avisos, impressao, None)

    def _achado_gravador(self, ip: str, info: InfoGravador) -> Achado:
        sinais = _sinais({"modelo": info.modelo, "firmware": info.firmware, "tipo": info.tipo})
        return Achado(
            ip=ip,
            mac=info.mac,
            origem="gravador",
            fonte_id=self._fonte_id,
            nome=info.nome,
            fabricante=info.fabricante,
            sinais=sinais,
        )

    def _achado_canal(self, canal: CanalGravador) -> Achado:
        sinais = _sinais({"modelo": canal.modelo, "protocolo": canal.protocolo})
        return Achado(
            ip=canal.ip,
            mac=canal.mac,
            origem="gravador_canal",
            fonte_id=self._fonte_id,
            nome=canal.nome,
            fabricante=canal.fabricante,
            pai_fonte_id=self._fonte_id,
            canal=canal.canal,
            sinais=sinais,
        )
