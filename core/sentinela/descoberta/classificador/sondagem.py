"""Sondagem ativa: lista fixa de portas TCP e título HTTP. Só roda quando autorizada.

Quem decide *quando* chamar ``sondar`` é o orquestrador (sub-rede com varredura permitida,
clique "Sondar" do admin, ou aparelho já aprovado): classificar um achado pendente é passivo.

- **Portas**: só a lista fixa ``PORTAS``; TCP connect (abre e fecha, nenhum dado enviado), uma
  conexão por vez por IP, 1 s de limite, uma ficha de prioridade baixa por tentativa.
- **Título HTTP**: só se 80/443/8080 estiverem abertas; ``GET /`` com 2 s de limite total, no
  máximo 16 KB lidos, título limpo de controles e com até 120 caracteres.
- **Redirecionamentos**: só dentro do mesmo IP e porta, até ``MAX_SALTOS``; outro host nunca é
  contatado.
- **HTTPS não fixa certificado**: é uma sondagem de um aparelho ainda não confiado; a
  verificação é desligada, nada sensível é enviado (sem cookie, sem credencial) e
  ``trust_env=False`` ignora proxies do ambiente.
"""

import asyncio
import html
import re
import weakref
from typing import Literal

import httpx

from sentinela.descoberta.texto import LIMITE_PADRAO, limpar
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import DestinoAutorizado, DestinoProibido, Guarda

Esquema = Literal["http", "https"]

PORTAS: tuple[int, ...] = (22, 23, 80, 443, 554, 4370, 8000, 8080, 8291, 9100, 37777, 3389)
PORTAS_HTTP: tuple[int, ...] = (80, 8080)
PORTAS_HTTPS: tuple[int, ...] = (443,)
TIMEOUT_CONEXAO_S = 1.0
TIMEOUT_HTTP_S = 2.0
LIMITE_BYTES = 16 * 1024
LIMITE_TITULO = LIMITE_PADRAO  # 120 caracteres
MAX_SALTOS = 2

_TITULO = re.compile(rb"<title[^>]{0,200}>(.{0,1000}?)</title", re.IGNORECASE | re.DOTALL)
# uma conexão por vez por IP, mesmo com várias sondagens simultâneas do mesmo aparelho
_travas: "weakref.WeakValueDictionary[str, asyncio.Lock]" = weakref.WeakValueDictionary()


def _trava(ip: str) -> asyncio.Lock:
    trava = _travas.get(ip)
    if trava is None:
        trava = _travas[ip] = asyncio.Lock()
    return trava


async def _porta_aberta(destino: DestinoAutorizado) -> bool:
    try:
        _, escritor = await asyncio.wait_for(
            asyncio.open_connection(str(destino.ip), destino.porta), TIMEOUT_CONEXAO_S
        )
    except (TimeoutError, OSError):
        return False
    escritor.close()
    try:
        await escritor.wait_closed()
    except OSError:
        pass  # o fechamento é só limpeza; a porta já respondeu
    return True


def _extrair_titulo(corpo: bytes) -> str | None:
    achado = _TITULO.search(corpo)
    if achado is None:
        return None
    texto = html.unescape(achado.group(1).decode("utf-8", errors="replace"))
    return limpar(texto, LIMITE_TITULO)


async def _ler_limitado(resposta: httpx.Response) -> bytes:
    """Lê no máximo ``LIMITE_BYTES`` e abandona o resto do corpo."""
    pedacos: list[bytes] = []
    total = 0
    async for pedaco in resposta.aiter_bytes():
        pedacos.append(pedaco)
        total += len(pedaco)
        if total >= LIMITE_BYTES:
            break
    return b"".join(pedacos)[:LIMITE_BYTES]


def _mesmo_destino(url: httpx.URL, ip: str, porta: int, esquema: Esquema) -> bool:
    return url.scheme == esquema and url.host == ip and (url.port or 0) == porta


async def _buscar_titulo(
    ip: str, porta: int, esquema: Esquema, guarda: Guarda, limitador: Limitador
) -> str | None:
    """``GET /`` (com saltos só no mesmo IP/porta). Cada pedido custa uma ficha baixa."""
    url = f"{esquema}://{ip}:{porta}/"
    async with (
        asyncio.timeout(TIMEOUT_HTTP_S),
        httpx.AsyncClient(
            follow_redirects=False,
            trust_env=False,
            timeout=TIMEOUT_HTTP_S,
            headers={"Accept-Encoding": "identity", "User-Agent": "Sentinela"},
            # sondagem de aparelho ainda não confiado: sem fixar certificado, nada sensível sai
            verify=esquema != "https",  # noqa: S501
        ) as cliente,
    ):
        for _ in range(MAX_SALTOS + 1):
            guarda.validar(ip, porta, esquema)
            await limitador.adquirir(1, prioridade="baixa")
            async with cliente.stream("GET", url) as resposta:
                if resposta.is_redirect:
                    destino = httpx.URL(url).join(resposta.headers.get("location", ""))
                    if not _mesmo_destino(destino, ip, porta, esquema):
                        return None  # outro host/porta/protocolo: nunca contatado
                    url = str(destino)
                    continue
                return _extrair_titulo(await _ler_limitado(resposta))
    return None


async def _titulo(ip: str, abertas: set[int], guarda: Guarda, limitador: Limitador) -> str | None:
    candidatas: list[tuple[int, Esquema]] = [(p, "http") for p in PORTAS_HTTP]
    candidatas += [(p, "https") for p in PORTAS_HTTPS]
    for porta, esquema in candidatas:
        if porta not in abertas:
            continue
        try:
            titulo = await _buscar_titulo(ip, porta, esquema, guarda, limitador)
        except (TimeoutError, httpx.HTTPError, ValueError, DestinoProibido):
            continue  # título é só um sinal a mais: falha aqui não derruba a sondagem
        if titulo:
            return titulo
    return None


async def sondar(ip: str, guarda: Guarda, limitador: Limitador) -> tuple[set[int], str | None]:
    """Portas abertas (da lista fixa) e título da página, se houver. Nunca envia dados.

    ``DestinoProibido`` sobe sem gastar ficha se o IP não for permitido pela Guarda.
    """
    # valida antes de qualquer ficha ou conexão
    guarda.validar(ip, PORTAS[0], "tcp")
    abertas: set[int] = set()
    async with _trava(ip):
        for porta in PORTAS:
            destino = guarda.validar(ip, porta, "tcp")
            await limitador.adquirir(1, prioridade="baixa")
            if await _porta_aberta(destino):
                abertas.add(porta)
        titulo = await _titulo(ip, abertas, guarda, limitador) if abertas else None
    return abertas, titulo
