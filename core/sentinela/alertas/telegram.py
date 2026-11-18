"""Cliente do Telegram: a única saída do Sentinela para a internet.

Único módulo de ``alertas/`` que importa ``httpx``/``httpcore``/``socket``/``ssl`` (teste
estático garante).

- **Destino**: URL fixa (``URL_TELEGRAM``). O nome é resolvido só na hora de enviar (sem Telegram
  configurado, nem DNS sai) e o primeiro IP aceito por ``Guarda.validar_externo("telegram")``
  vira o destino; o backend de rede recusa conectar em qualquer outro IP ou porta.
- **TLS**: verificação normal de cadeia e nome (CAs públicas do ``certifi`` + ``ca_adicional``
  se definido), SNI e ``Host`` = ``api.telegram.org`` mesmo conectando pelo IP.
- **Limites**: sem seguir redirecionamento, ``Accept-Encoding: identity``, corpo ≤ 64 KB, prazo
  total de ``timeout_s`` por pedido.
- **Segredo**: o token vai no caminho da URL (exigência da API do Telegram), então nenhuma
  exceção da pilha HTTP escapa: tudo vira ``ErroTelegram`` com texto fixo, levantado fora do
  ``except`` (sem ``__cause__`` nem ``__context__``), e o log leva só o código HTTP. O cliente
  do httpx não é usado (o transporte é chamado direto): o log "HTTP Request: POST <url>" dele
  nunca é emitido.
"""

import asyncio
import json
import logging
import re
import socket
import ssl
from collections.abc import AsyncIterable, AsyncIterator, Awaitable, Callable, Iterable
from typing import Any, cast

import certifi
import httpcore
import httpx

from sentinela.rede.guarda import DestinoExterno, DestinoProibido, Guarda

log = logging.getLogger(__name__)

URL_TELEGRAM = "https://api.telegram.org"
HOST_TELEGRAM = httpx.URL(URL_TELEGRAM).host
LIMITE_BYTES = 64 * 1024

Resolver = Callable[[str], Awaitable[list[str]]]

# mesmos formatos que a API de configuração aceita: nada no token muda o caminho da URL
_TOKEN = re.compile(r"\d{5,12}:[A-Za-z0-9_-]{30,50}")
_CHAT = re.compile(r"-?\d{1,20}|@[A-Za-z0-9_]{5,32}")
_NAO_MODIFICADA = "message is not modified"

MSG_TOKEN_INVALIDO = "Token do bot inválido."  # noqa: S105 - texto de erro, não segredo
MSG_CHAT_INVALIDO = "Chat inválido."
MSG_RESOLVER = "Não foi possível resolver o endereço do Telegram."
MSG_ENDERECO = "Endereço do Telegram recusado."
MSG_CERTIFICADO = "Certificado do Telegram recusado."
MSG_CONEXAO = "Não foi possível conectar ao Telegram."
MSG_TEMPO = "O Telegram não respondeu a tempo."
MSG_TOKEN = "Token do bot recusado pelo Telegram."  # noqa: S105 - texto de erro
MSG_CHAT = "Chat recusado pelo Telegram (bot sem acesso ou chat inexistente)."
MSG_LIMITE = "Limite de envio do Telegram atingido."
MSG_INDISPONIVEL = "Telegram indisponível no momento."
MSG_RESPOSTA = "Resposta inesperada do Telegram."
MSG_CA = "CA adicional inválida."
# erros que valem para qualquer chat: o despachante para o ciclo em vez de insistir
ERROS_GLOBAIS = frozenset({MSG_TOKEN_INVALIDO, MSG_TOKEN, MSG_CA})


class ErroTelegram(Exception):
    """Falha no envio; ``str()`` é sempre um dos textos fixos (seguro para guardar e mostrar).

    ``temporario``: vale tentar de novo sem mudar a configuração; ``espera_s``: o Telegram pediu
    para esperar (``retry_after`` do 429).
    """

    def __init__(self, mensagem: str, temporario: bool, espera_s: float | None = None) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.temporario = temporario
        self.espera_s = espera_s


async def resolver_padrao(host: str) -> list[str]:
    """IPv4 do nome (``getaddrinfo`` do sistema), na ordem devolvida."""
    infos = await asyncio.get_running_loop().getaddrinfo(
        host, 443, family=socket.AF_INET, type=socket.SOCK_STREAM
    )
    return [str(info[4][0]) for info in infos]


def _contexto_tls(ca_adicional: str) -> ssl.SSLContext:
    contexto = ssl.create_default_context(cafile=certifi.where())
    contexto.minimum_version = ssl.TLSVersion.TLSv1_2
    if ca_adicional:
        contexto.load_verify_locations(ca_adicional)
    return contexto


class _Backend(httpcore.AsyncNetworkBackend):
    """Só conecta no IP/porta do ``DestinoExterno`` validado."""

    def __init__(self, destino: DestinoExterno) -> None:
        self._destino = destino
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
            raise ErroTelegram(MSG_ENDERECO, temporario=True)  # defesa: nada fora do destino
        return await self._base.connect_tcp(host, port, timeout, local_address, socket_options)

    async def connect_unix_socket(
        self,
        path: str,
        timeout: float | None = None,  # noqa: ASYNC109
        socket_options: Iterable[Any] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        raise ErroTelegram(MSG_ENDERECO, temporario=True)

    async def sleep(self, seconds: float) -> None:
        await self._base.sleep(seconds)


class _Corpo(httpx.AsyncByteStream):
    """Corpo da resposta do httpcore como fluxo assíncrono do httpx."""

    def __init__(self, fluxo: AsyncIterable[bytes]) -> None:
        self._fluxo = fluxo

    async def __aiter__(self) -> AsyncIterator[bytes]:
        async for parte in self._fluxo:
            yield parte

    async def aclose(self) -> None:
        fechar = getattr(self._fluxo, "aclose", None)
        if fechar is not None:
            await fechar()


class _Transporte(httpx.AsyncBaseTransport):
    """httpcore com o backend travado no destino; um pedido, uma conexão."""

    def __init__(self, destino: DestinoExterno, contexto: ssl.SSLContext) -> None:
        self._pool = httpcore.AsyncConnectionPool(
            ssl_context=contexto,
            max_connections=1,
            http1=True,
            http2=False,
            retries=0,
            network_backend=_Backend(destino),
        )

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
            stream=_Corpo(cast(AsyncIterable[bytes], resposta.stream)),
            extensions=resposta.extensions,
        )

    async def aclose(self) -> None:
        await self._pool.aclose()


def _erro_tls(exc: BaseException) -> bool:
    """Alguma exceção da cadeia é de verificação TLS (certificado ou nome)?"""
    vistos: set[int] = set()
    atual: BaseException | None = exc
    while atual is not None and id(atual) not in vistos:
        vistos.add(id(atual))
        if isinstance(atual, ssl.SSLError):
            return True
        atual = atual.__cause__ or atual.__context__
    return False


def _numero(valor: Any) -> float | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, int | float) and 0 < valor <= 86400:
        return float(valor)
    if isinstance(valor, str) and valor.isascii() and valor.isdigit():
        return _numero(int(valor))
    return None


class ClienteTelegram:
    def __init__(
        self,
        guarda: Guarda,
        ca_adicional: str = "",
        resolver: Resolver | None = None,
        transporte: httpx.AsyncBaseTransport | None = None,
        timeout_s: float = 10.0,
    ) -> None:
        self._guarda = guarda
        try:
            self._contexto: ssl.SSLContext | None = _contexto_tls(ca_adicional)
        except (OSError, ValueError):  # ssl.SSLError é OSError: CA ilegível não derruba o core
            log.error("telegram: CA adicional inválida; envio desativado")
            self._contexto = None
        self._resolver = resolver or resolver_padrao
        self._transporte = transporte  # testes; ``None``: um transporte travado por pedido
        self._timeout = timeout_s

    async def enviar(self, token: str, chat: str, texto: str) -> int | None:
        """``sendMessage``; devolve o ``message_id`` (``None`` se a resposta não o trouxer)."""
        dados = await self._chamar(token, "sendMessage", {"chat_id": chat, "text": texto})
        resultado = dados.get("result")
        if isinstance(resultado, dict):
            mid = resultado.get("message_id")
            if isinstance(mid, int) and not isinstance(mid, bool):
                return mid
        return None

    async def editar(self, token: str, chat: str, message_id: int, texto: str) -> None:
        """``editMessageText``; mensagem já com esse texto conta como sucesso."""
        corpo = {"chat_id": chat, "message_id": message_id, "text": texto}
        await self._chamar(token, "editMessageText", corpo)

    async def _destino(self) -> DestinoExterno:
        falhou = False
        try:
            ips = await self._resolver(HOST_TELEGRAM)
        except Exception:  # noqa: BLE001 - gaierror, OSError...: texto fixo
            falhou = True
        if falhou:  # fora do ``except``: sem ``__context__`` com o texto original
            raise ErroTelegram(MSG_RESOLVER, temporario=True)
        for ip in ips:
            try:
                return self._guarda.validar_externo("telegram", ip)
            except DestinoProibido:
                continue
        raise ErroTelegram(MSG_ENDERECO, temporario=True)

    async def _chamar(self, token: str, metodo: str, corpo: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(token, str) or not _TOKEN.fullmatch(token):
            raise ErroTelegram(MSG_TOKEN_INVALIDO, temporario=False)
        chat = corpo.get("chat_id")
        if not isinstance(chat, str) or not _CHAT.fullmatch(chat):
            raise ErroTelegram(MSG_CHAT_INVALIDO, temporario=False)
        if self._contexto is None:
            raise ErroTelegram(MSG_CA, temporario=False)
        erro: ErroTelegram | None = None
        try:
            # um prazo só para a resolução do nome e o pedido
            async with asyncio.timeout(self._timeout):
                destino = await self._destino()
                status, cabecalhos, bruto = await self._pedido(destino, token, metodo, corpo)
        except ErroTelegram as e:
            erro = ErroTelegram(e.mensagem, e.temporario, e.espera_s)
        except (TimeoutError, httpx.TimeoutException, httpcore.TimeoutException):
            log.warning("telegram: sem resposta a tempo")
            erro = ErroTelegram(MSG_TEMPO, temporario=True)
        except Exception as e:  # noqa: BLE001 - nada da pilha HTTP (com a URL e o token) escapa
            if _erro_tls(e):
                log.warning("telegram: certificado recusado")
                erro = ErroTelegram(MSG_CERTIFICADO, temporario=True)
            else:
                log.warning("telegram: falha de conexão")
                erro = ErroTelegram(MSG_CONEXAO, temporario=True)
        if erro is not None:  # levantado fora do ``except``: sem ``__context__``
            raise erro
        return self._interpretar(status, cabecalhos, bruto)

    async def _pedido(
        self, destino: DestinoExterno, token: str, metodo: str, corpo: dict[str, Any]
    ) -> tuple[int, httpx.Headers, bytes]:
        if destino.host != HOST_TELEGRAM:  # defesa: o destino nomeado é o da URL fixa
            raise ErroTelegram(MSG_ENDERECO, temporario=True)
        url = httpx.URL(URL_TELEGRAM).copy_with(
            host=str(destino.ip), port=None, path=f"/bot{token}/{metodo}"
        )
        pedido = httpx.Request(
            "POST",
            url,
            headers={
                "Host": HOST_TELEGRAM,
                "User-Agent": "Sentinela",
                "Accept-Encoding": "identity",
                "Content-Type": "application/json",
            },
            content=json.dumps(corpo, ensure_ascii=False).encode(),
            extensions={
                "sni_hostname": HOST_TELEGRAM,
                "timeout": httpx.Timeout(self._timeout).as_dict(),
            },
        )
        proprio = self._transporte is None
        if self._contexto is None:  # conferido em ``_chamar``; aqui só para o tipo
            raise ErroTelegram(MSG_CA, temporario=False)
        transporte = self._transporte or _Transporte(destino, self._contexto)
        try:
            resposta = await transporte.handle_async_request(pedido)
            try:
                bruto = bytearray()
                async for parte in resposta.aiter_raw():
                    bruto += parte
                    if len(bruto) > LIMITE_BYTES:
                        raise ErroTelegram(MSG_RESPOSTA, temporario=True)
                return resposta.status_code, resposta.headers, bytes(bruto)
            finally:
                await resposta.aclose()
        finally:
            if proprio:
                await transporte.aclose()

    @staticmethod
    def _interpretar(status: int, cabecalhos: httpx.Headers, bruto: bytes) -> dict[str, Any]:
        try:
            dados = json.loads(bruto) if bruto else {}
        except (ValueError, UnicodeDecodeError):
            dados = {}
        if not isinstance(dados, dict):
            dados = {}
        if status == 200 and dados.get("ok") is True:
            return dados
        descricao = dados.get("description")
        if status == 400 and isinstance(descricao, str) and _NAO_MODIFICADA in descricao:
            return dados  # edição com o mesmo texto (nova tentativa): já está como deveria
        log.warning("telegram respondeu HTTP %d", status)
        if status == 429:
            parametros = dados.get("parameters")
            espera = (
                _numero(parametros.get("retry_after")) if isinstance(parametros, dict) else None
            )
            if espera is None:
                espera = _numero(cabecalhos.get("retry-after"))
            raise ErroTelegram(MSG_LIMITE, temporario=True, espera_s=espera)
        if status in (401, 404):
            raise ErroTelegram(MSG_TOKEN, temporario=False)
        if status in (400, 403):
            raise ErroTelegram(MSG_CHAT, temporario=False)
        if status >= 500:
            raise ErroTelegram(MSG_INDISPONIVEL, temporario=True)
        raise ErroTelegram(MSG_RESPOSTA, temporario=False)  # inclusive 3xx: nunca seguido
