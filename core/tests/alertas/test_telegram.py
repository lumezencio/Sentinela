"""Cliente do Telegram contra um Telegram falso em TLS (127.0.0.1, CA de teste).

O destino continua ``api.telegram.org:443``; só a conexão TCP da porta 443 em 127.0.0.1 é
desviada para a porta do servidor de teste (monkeypatch no backend do httpcore).
"""

import logging
from collections.abc import AsyncIterator, Iterable
from pathlib import Path
from typing import Any

import httpcore
import httpx
import pytest

from sentinela.alertas.telegram import URL_TELEGRAM, ClienteTelegram, ErroTelegram
from sentinela.rede.guarda import Guarda
from tests.alertas.servidor_telegram import (
    CertificadosTeste,
    Resposta,
    ServidorTelegram,
    gerar_certificados,
    resolver_fixo,
)

# token e chat fictícios (formato válido)
TOKEN = "123456789:AAFicticioFicticioFicticio-0123456789"  # noqa: S105 - fictício
CHAT = "-1001234567890"


@pytest.fixture
def certificados(tmp_path: Path) -> CertificadosTeste:
    return gerar_certificados(tmp_path)


@pytest.fixture
async def servidor(
    certificados: CertificadosTeste, monkeypatch: pytest.MonkeyPatch
) -> AsyncIterator[ServidorTelegram]:
    srv = ServidorTelegram(certificados)
    async with srv.rodando() as porta:
        original = httpcore.AnyIOBackend.connect_tcp

        async def desviar(
            self: httpcore.AnyIOBackend,
            host: str,
            port: int,
            timeout: float | None = None,  # noqa: ASYNC109
            local_address: str | None = None,
            socket_options: Iterable[Any] | None = None,
        ) -> httpcore.AsyncNetworkStream:
            if host == "127.0.0.1" and port == 443:
                port = porta
            return await original(self, host, port, timeout, local_address, socket_options)

        monkeypatch.setattr(httpcore.AnyIOBackend, "connect_tcp", desviar)
        yield srv


def _cliente(ca: str = "", **kw: Any) -> ClienteTelegram:
    kw.setdefault("resolver", resolver_fixo("127.0.0.1"))
    return ClienteTelegram(Guarda([], permitir_loopback=True), ca_adicional=ca, **kw)


def test_url_fixa() -> None:
    assert URL_TELEGRAM == "https://api.telegram.org"


async def test_envia_com_sni_e_host_api_telegram(
    servidor: ServidorTelegram, certificados: CertificadosTeste
) -> None:
    msg = await _cliente(str(certificados.ca_pem)).enviar(TOKEN, CHAT, "🔴 Teste")
    assert msg == 101
    [p] = servidor.pedidos
    assert p.sni == "api.telegram.org"
    assert p.host == "api.telegram.org"
    assert (p.metodo, p.caminho) == ("POST", f"/bot{TOKEN}/sendMessage")
    assert p.json == {"chat_id": CHAT, "text": "🔴 Teste"}


async def test_editar_mensagem(servidor: ServidorTelegram, certificados: CertificadosTeste) -> None:
    await _cliente(str(certificados.ca_pem)).editar(TOKEN, CHAT, 7, "🟡 X caiu e voltou (40 s)")
    [p] = servidor.pedidos
    assert p.caminho == f"/bot{TOKEN}/editMessageText"
    assert p.json == {"chat_id": CHAT, "message_id": 7, "text": "🟡 X caiu e voltou (40 s)"}


async def test_edicao_igual_nao_e_erro(
    servidor: ServidorTelegram, certificados: CertificadosTeste
) -> None:
    descricao = "Bad Request: message is not modified: specified new message content is the same"
    servidor.respostas.append(Resposta(400, {"ok": False, "description": descricao}))
    await _cliente(str(certificados.ca_pem)).editar(TOKEN, CHAT, 7, "igual")


async def test_certificado_de_outra_ca_recusado(servidor: ServidorTelegram) -> None:
    with pytest.raises(ErroTelegram) as e:
        await _cliente().enviar(TOKEN, CHAT, "x")
    assert str(e.value) == "Certificado do Telegram recusado."
    assert e.value.temporario
    assert servidor.pedidos == []


async def test_ca_adicional_aceita(
    servidor: ServidorTelegram, certificados: CertificadosTeste
) -> None:
    await _cliente(str(certificados.ca_pem)).enviar(TOKEN, CHAT, "x")
    assert len(servidor.pedidos) == 1


async def test_certificado_de_outro_nome_recusado(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "outro").mkdir()
    outro = gerar_certificados(tmp_path / "outro", host="exemplo.invalid")
    srv = ServidorTelegram(outro)
    async with srv.rodando() as porta:
        original = httpcore.AnyIOBackend.connect_tcp

        async def desviar(self: httpcore.AnyIOBackend, host: str, port: int, *a: Any) -> Any:
            return await original(self, host, porta, *a)

        monkeypatch.setattr(httpcore.AnyIOBackend, "connect_tcp", desviar)
        with pytest.raises(ErroTelegram, match="Certificado do Telegram recusado."):
            await _cliente(str(outro.ca_pem)).enviar(TOKEN, CHAT, "x")
    assert srv.pedidos == []


async def test_resolver_so_com_ip_proibido_nao_conecta(servidor: ServidorTelegram) -> None:
    cliente = ClienteTelegram(
        Guarda([]), resolver=resolver_fixo("127.0.0.1", "224.0.0.1", "169.254.1.1", "0.0.0.5")
    )
    with pytest.raises(ErroTelegram) as e:
        await cliente.enviar(TOKEN, CHAT, "x")
    assert str(e.value) == "Endereço do Telegram recusado."
    assert servidor.conexoes == 0


async def test_usa_o_primeiro_ip_aceito(
    servidor: ServidorTelegram, certificados: CertificadosTeste
) -> None:
    resolver = resolver_fixo("224.0.0.1", "127.0.0.1")
    await _cliente(str(certificados.ca_pem), resolver=resolver).enviar(TOKEN, CHAT, "x")
    assert resolver.chamadas == ["api.telegram.org"]
    assert len(servidor.pedidos) == 1


async def test_falha_na_resolucao_e_generica() -> None:
    async def falhar(_host: str) -> list[str]:
        raise OSError(f"falhou ao resolver para /bot{TOKEN}/sendMessage")

    with pytest.raises(ErroTelegram) as e:
        await _cliente(resolver=falhar).enviar(TOKEN, CHAT, "x")
    assert str(e.value) == "Não foi possível resolver o endereço do Telegram."
    assert TOKEN not in repr(e.value)


async def test_429_temporario_com_retry_after(
    servidor: ServidorTelegram, certificados: CertificadosTeste
) -> None:
    servidor.respostas.append(
        Resposta(429, {"ok": False, "error_code": 429, "parameters": {"retry_after": 42}})
    )
    with pytest.raises(ErroTelegram) as e:
        await _cliente(str(certificados.ca_pem)).enviar(TOKEN, CHAT, "x")
    assert e.value.temporario
    assert e.value.espera_s == 42


async def test_429_com_cabecalho_retry_after(
    servidor: ServidorTelegram, certificados: CertificadosTeste
) -> None:
    servidor.respostas.append(Resposta(429, {"ok": False}, {"Retry-After": "17"}))
    with pytest.raises(ErroTelegram) as e:
        await _cliente(str(certificados.ca_pem)).enviar(TOKEN, CHAT, "x")
    assert e.value.temporario and e.value.espera_s == 17


async def test_401_definitivo(servidor: ServidorTelegram, certificados: CertificadosTeste) -> None:
    servidor.respostas.append(Resposta(401, {"ok": False, "description": "Unauthorized"}))
    with pytest.raises(ErroTelegram) as e:
        await _cliente(str(certificados.ca_pem)).enviar(TOKEN, CHAT, "x")
    assert not e.value.temporario
    assert e.value.espera_s is None
    assert str(e.value) == "Token do bot recusado pelo Telegram."


async def test_5xx_temporario(servidor: ServidorTelegram, certificados: CertificadosTeste) -> None:
    servidor.respostas.append(Resposta(502, {"ok": False}))
    with pytest.raises(ErroTelegram) as e:
        await _cliente(str(certificados.ca_pem)).enviar(TOKEN, CHAT, "x")
    assert e.value.temporario


async def test_sem_redirecionamento(
    servidor: ServidorTelegram, certificados: CertificadosTeste
) -> None:
    servidor.respostas.append(Resposta(302, {}, {"Location": "https://exemplo.invalid/x"}))
    with pytest.raises(ErroTelegram, match="Resposta inesperada do Telegram."):
        await _cliente(str(certificados.ca_pem)).enviar(TOKEN, CHAT, "x")
    assert len(servidor.pedidos) == 1
    assert servidor.conexoes == 1


async def test_token_ou_chat_malformado_recusado_sem_rede() -> None:
    resolver = resolver_fixo("127.0.0.1")
    cliente = _cliente(resolver=resolver)
    with pytest.raises(ErroTelegram, match="Token do bot inválido."):
        await cliente.enviar("123:abc/../getMe?x=", CHAT, "x")
    with pytest.raises(ErroTelegram, match="Chat inválido."):
        await cliente.enviar(TOKEN, "1; DROP", "x")
    assert resolver.chamadas == []


class _TransporteQueVaza(httpx.AsyncBaseTransport):
    """Falha como o httpx falharia, com a URL completa (e o token) no texto da exceção."""

    def __init__(self, erro: type[Exception]) -> None:
        self.erro = erro
        self.urls: list[str] = []

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        self.urls.append(str(request.url))
        if issubclass(self.erro, httpx.RequestError):
            raise self.erro(f"falha em {request.url}", request=request)
        raise self.erro(f"falha em {request.url}")


@pytest.mark.parametrize(
    "erro", [httpx.ConnectError, httpx.ReadTimeout, httpx.RemoteProtocolError, RuntimeError]
)
async def test_erro_nunca_contem_token(
    erro: type[Exception], caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    transporte = _TransporteQueVaza(erro)
    with pytest.raises(ErroTelegram) as e:
        await _cliente(transporte=transporte).enviar(TOKEN, CHAT, "x")
    assert transporte.urls == [f"https://127.0.0.1/bot{TOKEN}/sendMessage"]  # o vazamento existia
    segredo = TOKEN.split(":", 1)[1]
    for texto in (str(e.value), repr(e.value), caplog.text):
        assert segredo not in texto
    assert e.value.__cause__ is None and e.value.__suppress_context__


async def test_status_http_vai_ao_log_sem_token(
    servidor: ServidorTelegram, certificados: CertificadosTeste, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    servidor.respostas.append(Resposta(403, {"ok": False, "description": f"bot {TOKEN} blocked"}))
    with pytest.raises(ErroTelegram):
        await _cliente(str(certificados.ca_pem)).enviar(TOKEN, CHAT, "x")
    assert "403" in caplog.text
    assert TOKEN.split(":", 1)[1] not in caplog.text
