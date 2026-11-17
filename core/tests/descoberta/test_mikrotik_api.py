"""Protocolo da API RouterOS: tamanhos, sentenças e respostas (!re, !done, !trap, !fatal)."""

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from ipaddress import IPv4Network

import pytest

from sentinela.descoberta.fontes.mikrotik_api import (
    LIMITE_COMANDO,
    LIMITE_SENTENCA,
    MAX_ATRIBUTOS,
    MAX_VALOR,
    ClienteRouterOS,
    ErroRouterOS,
    codificar_sentenca,
    codificar_tamanho,
    ler_sentenca,
    ler_tamanho,
)
from sentinela.rede.guarda import Guarda

GUARDA = Guarda([IPv4Network("10.99.0.0/24")], permitir_loopback=True)

Tratador = Callable[[asyncio.StreamReader, asyncio.StreamWriter], Awaitable[None]]


def _leitor(dados: bytes) -> asyncio.StreamReader:
    leitor = asyncio.StreamReader()
    leitor.feed_data(dados)
    leitor.feed_eof()
    return leitor


@pytest.mark.parametrize(
    ("n", "esperado"),
    [
        (0, b"\x00"),
        (0x7F, b"\x7f"),
        (0x80, b"\x80\x80"),
        (0x3FFF, b"\xbf\xff"),
        (0x4000, b"\xc0\x40\x00"),
        (0x1FFFFF, b"\xdf\xff\xff"),
        (0x200000, b"\xe0\x20\x00\x00"),
        (0xFFFFFFF, b"\xef\xff\xff\xff"),
        (0x10000000, b"\xf0\x10\x00\x00\x00"),
    ],
)
async def test_codifica_tamanhos(n: int, esperado: bytes) -> None:
    assert codificar_tamanho(n) == esperado
    assert await ler_tamanho(_leitor(esperado)) == n


async def test_tamanho_com_byte_de_controle_e_recusado() -> None:
    with pytest.raises(ErroRouterOS):
        await ler_tamanho(_leitor(b"\xf8"))


async def test_sentenca_ida_e_volta() -> None:
    palavras = ["/ip/arp/print", "=.proplist=address", "x" * 200, "ção"]
    assert await ler_sentenca(_leitor(codificar_sentenca(palavras))) == palavras


@asynccontextmanager
async def _servidor(tratador: Tratador) -> AsyncIterator[int]:
    srv = await asyncio.start_server(tratador, "127.0.0.1", 0)
    try:
        yield srv.sockets[0].getsockname()[1]
    finally:
        srv.close()
        await srv.wait_closed()


def _roteiro(*respostas: bytes, recebidas: list[list[str]] | None = None) -> Tratador:
    """Para cada sentença recebida, devolve a próxima resposta do roteiro."""

    async def tratador(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        try:
            for resposta in respostas:
                sentenca = await ler_sentenca(r)
                if recebidas is not None:
                    recebidas.append(sentenca)
                w.write(resposta)
                await w.drain()
            await r.read()  # espera o cliente fechar
        except (ErroRouterOS, ConnectionError):
            pass
        finally:
            w.close()

    return tratador


async def _cliente(porta: int, timeout_s: float = 5) -> ClienteRouterOS:
    destino = GUARDA.validar("127.0.0.1", porta, "tcp")
    cliente = ClienteRouterOS(destino, usar_tls=False, impressao_confiada=None, timeout_s=timeout_s)
    await cliente.conectar()
    return cliente


async def test_le_resposta_com_re_e_done() -> None:
    recebidas: list[list[str]] = []
    resposta = (
        codificar_sentenca(["!re", "=address=10.99.0.10", "=mac-address=02:00:00:00:00:10"])
        + codificar_sentenca(["!re", "=address=10.99.0.11", "=comentario=a=b"])
        + codificar_sentenca(["!empty"])
        + codificar_sentenca(["!done"])
    )
    async with _servidor(_roteiro(resposta, recebidas=recebidas)) as porta:
        cliente = await _cliente(porta)
        try:
            linhas = await cliente.comando(["/ip/arp/print", "=.proplist=address,mac-address"])
        finally:
            await cliente.fechar()
    assert recebidas == [["/ip/arp/print", "=.proplist=address,mac-address"]]
    assert linhas == [
        {"address": "10.99.0.10", "mac-address": "02:00:00:00:00:10"},
        {"address": "10.99.0.11", "comentario": "a=b"},
    ]


async def test_trap_vira_erro_generico() -> None:
    resposta = codificar_sentenca(
        ["!trap", "=message=no such command prefix SEGREDO-DO-APARELHO"]
    ) + codificar_sentenca(["!done"])
    ok = codificar_sentenca(["!re", "=name=rb"]) + codificar_sentenca(["!done"])
    async with _servidor(_roteiro(resposta, ok)) as porta:
        cliente = await _cliente(porta)
        try:
            with pytest.raises(ErroRouterOS) as exc:
                await cliente.comando(["/nada/print"])
            # depois de um !trap a conexão continua utilizável
            assert await cliente.comando(["/system/identity/print"]) == [{"name": "rb"}]
        finally:
            await cliente.fechar()
    assert "SEGREDO" not in str(exc.value)
    assert "no such command" not in str(exc.value)


async def test_fatal_fecha_conexao() -> None:
    resposta = codificar_sentenca(["!fatal", "session terminated on request"])
    async with _servidor(_roteiro(resposta)) as porta:
        cliente = await _cliente(porta)
        with pytest.raises(ErroRouterOS) as exc:
            await cliente.comando(["/system/identity/print"])
        assert "session terminated" not in str(exc.value)
        assert cliente.conectado is False
        with pytest.raises(ErroRouterOS):
            await cliente.comando(["/system/identity/print"])
        await cliente.fechar()  # idempotente


async def test_resposta_gigante_e_recusada() -> None:
    # cabeçalho de palavra anunciando mais que o limite: recusada antes de ler o corpo
    gigante = codificar_tamanho(LIMITE_SENTENCA + 1)
    async with _servidor(_roteiro(codificar_tamanho(3) + b"!re" + gigante)) as porta:
        cliente = await _cliente(porta)
        with pytest.raises(ErroRouterOS):
            await cliente.comando(["/ip/arp/print"])
        assert cliente.conectado is False
        await cliente.fechar()


async def test_sentenca_somando_mais_que_o_limite_e_recusada() -> None:
    palavra = "=x=" + "a" * (LIMITE_SENTENCA // 4)
    resposta = codificar_sentenca(["!re", palavra, palavra, palavra, palavra, palavra])
    with pytest.raises(ErroRouterOS):
        await ler_sentenca(_leitor(resposta))


async def test_excesso_de_sentencas_e_recusado() -> None:
    linha = codificar_sentenca(["!re", "=a=1"])
    async with _servidor(_roteiro(linha * 6 + codificar_sentenca(["!done"]))) as porta:
        cliente = await _cliente(porta)
        cliente.max_sentencas = 5
        with pytest.raises(ErroRouterOS):
            await cliente.comando(["/ip/arp/print"])
        await cliente.fechar()


async def test_comando_somando_mais_que_o_teto_e_recusado() -> None:
    # cada sentença fica abaixo de 1 MB, mas juntas passam do teto do comando
    linha = codificar_sentenca(["!re", "=a=" + "x" * (LIMITE_SENTENCA - 64)])
    quantas = LIMITE_COMANDO // LIMITE_SENTENCA + 2
    resposta = linha * quantas + codificar_sentenca(["!done"])
    async with _servidor(_roteiro(resposta)) as porta:
        cliente = await _cliente(porta)
        with pytest.raises(ErroRouterOS) as exc:
            await cliente.comando(["/ip/arp/print"])
        assert cliente.conectado is False
        await cliente.fechar()
    assert str(exc.value) == "resposta do RouterOS grande demais"


async def test_teto_do_comando_vale_por_comando() -> None:
    linha = codificar_sentenca(["!re", "=a=" + "x" * 1000])
    resposta = linha * 3 + codificar_sentenca(["!done"])
    async with _servidor(_roteiro(resposta, resposta)) as porta:
        cliente = await _cliente(porta)
        cliente.limite_comando = 4000
        try:
            assert len(await cliente.comando(["/ip/arp/print"])) == 3
            assert len(await cliente.comando(["/ip/arp/print"])) == 3
        finally:
            await cliente.fechar()


async def test_atributos_demais_na_sentenca_sao_recusados() -> None:
    muitos = [f"=k{i}=v" for i in range(MAX_ATRIBUTOS + 1)]
    resposta = codificar_sentenca(["!re", *muitos]) + codificar_sentenca(["!done"])
    async with _servidor(_roteiro(resposta)) as porta:
        cliente = await _cliente(porta)
        try:
            with pytest.raises(ErroRouterOS):
                await cliente.comando(["/ip/arp/print"])
            assert cliente.conectado is False
        finally:
            await cliente.fechar()


async def test_palavras_demais_na_sentenca_sao_recusadas() -> None:
    muitas = [f".x{i}" for i in range(MAX_ATRIBUTOS + 10)]
    with pytest.raises(ErroRouterOS):
        await ler_sentenca(_leitor(codificar_sentenca(["!re", *muitas])))


async def test_atributos_no_limite_e_valor_longo_truncado() -> None:
    atributos = [f"=k{i}=v" for i in range(MAX_ATRIBUTOS - 1)] + ["=longo=" + "y" * 5000]
    resposta = codificar_sentenca(["!re", *atributos, ".tag=1"]) + codificar_sentenca(["!done"])
    async with _servidor(_roteiro(resposta)) as porta:
        cliente = await _cliente(porta)
        try:
            (linha,) = await cliente.comando(["/ip/arp/print"])
        finally:
            await cliente.fechar()
    assert len(linha) == MAX_ATRIBUTOS
    assert linha["longo"] == "y" * MAX_VALOR


async def test_tempo_esgotado_vira_erro_generico() -> None:
    async def mudo(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        await r.read()
        w.close()

    async with _servidor(mudo) as porta:
        cliente = await _cliente(porta, timeout_s=0.2)
        with pytest.raises(ErroRouterOS):
            await cliente.comando(["/system/identity/print"])
        assert cliente.conectado is False
        await cliente.fechar()


def test_cliente_exige_destino_tcp() -> None:
    destino = GUARDA.validar("127.0.0.1", 8729, "https")
    with pytest.raises(ValueError):
        ClienteRouterOS(destino, usar_tls=True, impressao_confiada=None)
