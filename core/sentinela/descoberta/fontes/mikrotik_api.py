"""Cliente asyncio próprio do protocolo API do RouterOS (v6 ≥ 6.43 e v7), somente leitura.

Protocolo: cada palavra leva um prefixo de tamanho (1 a 5 bytes); uma sentença termina com
uma palavra vazia. Respostas: ``!re`` (uma linha), ``!done`` (fim), ``!trap`` (erro do
comando), ``!empty`` (v7.18+, sem linhas) e ``!fatal`` (o aparelho encerra a sessão).

Único módulo da descoberta MikroTik que abre socket (teste estático garante). Recebe um
``DestinoAutorizado`` da Guarda. Com TLS, a cadeia não é verificada (o RouterOS usa
certificado autoassinado): o certificado é **fixado** pela impressão SHA-256 do DER, conferida
antes de qualquer login. Mensagens de erro são genéricas: nunca carregam usuário, senha nem
texto devolvido pelo aparelho.
"""

import asyncio
import contextlib
import hashlib
import hmac
import ssl

from sentinela.descoberta.fontes.base import ErroColeta
from sentinela.rede.guarda import DestinoAutorizado

LIMITE_SENTENCA = 1024 * 1024  # bytes por sentença (soma das palavras e cabeçalhos)
LIMITE_COMANDO = 8 * 1024 * 1024  # bytes somados de todas as sentenças de um comando
MAX_SENTENCAS = 20_000  # sentenças por comando
MAX_ATRIBUTOS = 64  # atributos =k=v por sentença; mais que isso a resposta é recusada
MAX_PALAVRAS = MAX_ATRIBUTOS + 4  # teto bruto do leitor: atributos + tipo, .tag e folga
MAX_VALOR = 1024  # caracteres guardados por valor de atributo (o excesso é truncado)
TIMEOUT_COMANDO_S = 60.0  # teto total de um comando, além do timeout por leitura

MSG_FALHA = "falha na comunicação com o RouterOS"
MSG_CONEXAO = "não foi possível conectar ao RouterOS"
MSG_FECHADA = "conexão com o RouterOS encerrada"
MSG_TEMPO = "o RouterOS não respondeu a tempo"
MSG_GRANDE = "resposta do RouterOS grande demais"
MSG_INESPERADA = "resposta inesperada do RouterOS"
MSG_FATAL = "o RouterOS encerrou a sessão"
MSG_RECUSADO = "o RouterOS recusou o comando"
MSG_LOGIN = "usuário ou senha recusados pelo RouterOS"
MSG_ANTIGO = "RouterOS anterior a 6.43 não suportado"
MSG_SEM_CERT = "o RouterOS não apresentou certificado TLS"
MSG_NAO_CONFIADO = "certificado do aparelho ainda não confiado"
MSG_MUDOU = "certificado do aparelho mudou"


class ErroRouterOS(ErroColeta):
    """Falha genérica na API RouterOS (mensagem fixa, segura para mostrar e guardar)."""

    def __init__(self, mensagem: str = MSG_FALHA) -> None:
        super().__init__(mensagem)


class ErroComandoRouterOS(ErroRouterOS):
    """``!trap``: o comando foi recusado, mas a sessão continua utilizável."""

    def __init__(self) -> None:
        super().__init__(MSG_RECUSADO)


class CertificadoNaoConfiado(ErroRouterOS):
    """Nenhuma impressão confiada ainda; ``impressao`` é a apresentada pelo aparelho."""

    def __init__(self, impressao: str) -> None:
        super().__init__(MSG_NAO_CONFIADO)
        self.impressao = impressao


class CertificadoMudou(ErroRouterOS):
    """A impressão apresentada difere da confiada; exige nova confirmação do admin."""

    def __init__(self, impressao: str) -> None:
        super().__init__(MSG_MUDOU)
        self.impressao = impressao


def codificar_tamanho(n: int) -> bytes:
    if n < 0:
        raise ValueError("tamanho negativo")
    if n < 0x80:
        return n.to_bytes(1, "big")
    if n < 0x4000:
        return (n | 0x8000).to_bytes(2, "big")
    if n < 0x200000:
        return (n | 0xC00000).to_bytes(3, "big")
    if n < 0x10000000:
        return (n | 0xE0000000).to_bytes(4, "big")
    if n <= 0xFFFFFFFF:
        return b"\xf0" + n.to_bytes(4, "big")
    raise ValueError("palavra grande demais")


async def _ler(leitor: asyncio.StreamReader, n: int) -> bytes:
    try:
        return await leitor.readexactly(n)
    except asyncio.IncompleteReadError:
        raise ErroRouterOS(MSG_FECHADA) from None


async def ler_tamanho(leitor: asyncio.StreamReader) -> int:
    primeiro = (await _ler(leitor, 1))[0]
    if primeiro < 0x80:
        return primeiro
    if primeiro < 0xC0:
        return int.from_bytes(bytes([primeiro & 0x3F]) + await _ler(leitor, 1), "big")
    if primeiro < 0xE0:
        return int.from_bytes(bytes([primeiro & 0x1F]) + await _ler(leitor, 2), "big")
    if primeiro < 0xF0:
        return int.from_bytes(bytes([primeiro & 0x0F]) + await _ler(leitor, 3), "big")
    if primeiro == 0xF0:
        return int.from_bytes(await _ler(leitor, 4), "big")
    raise ErroRouterOS(MSG_INESPERADA)  # 0xF8+ são bytes de controle reservados


def codificar_sentenca(palavras: list[str]) -> bytes:
    saida = bytearray()
    for palavra in palavras:
        dados = palavra.encode("utf-8")
        saida += codificar_tamanho(len(dados)) + dados
    return bytes(saida + b"\x00")


async def ler_sentenca(leitor: asyncio.StreamReader, limite: int = LIMITE_SENTENCA) -> list[str]:
    """Lê palavras até a vazia. Recusa (sem ler o corpo) o que passar de ``limite`` bytes."""
    palavras, _ = await ler_sentenca_medida(leitor, limite)
    return palavras


async def ler_sentenca_medida(
    leitor: asyncio.StreamReader, limite: int = LIMITE_SENTENCA
) -> tuple[list[str], int]:
    """Como ``ler_sentenca``, devolvendo também os bytes consumidos (para o teto do comando).

    Recusa sentenças com mais de ``MAX_PALAVRAS`` palavras."""
    palavras: list[str] = []
    total = 0
    while True:
        n = await ler_tamanho(leitor)
        total += 1
        if n == 0:
            return palavras, total
        total += n
        if total > limite or len(palavras) >= MAX_PALAVRAS:
            raise ErroRouterOS(MSG_GRANDE)
        palavras.append((await _ler(leitor, n)).decode("utf-8", errors="replace"))


def _atributos(palavras: list[str]) -> dict[str, str]:
    """``=chave=valor`` → ``{chave: valor}`` (o valor pode conter ``=``); o resto é ignorado."""
    saida: dict[str, str] = {}
    if sum(p.startswith("=") for p in palavras) > MAX_ATRIBUTOS:
        raise ErroRouterOS(MSG_GRANDE)
    for palavra in palavras:
        if palavra.startswith("="):
            chave, _, valor = palavra[1:].partition("=")
            if chave:
                saida[chave[:MAX_VALOR]] = valor[:MAX_VALOR]
    return saida


def _contexto_tls() -> ssl.SSLContext:
    contexto = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    contexto.minimum_version = ssl.TLSVersion.TLSv1_2
    # RouterOS usa certificado autoassinado: em vez de cadeia/nome, a confiança vem da
    # impressão SHA-256 fixada pelo admin, conferida em ``conectar`` antes do login.
    contexto.check_hostname = False
    contexto.verify_mode = ssl.CERT_NONE
    return contexto


class ClienteRouterOS:
    """Uma sessão da API. Um comando por vez (trava interna); sem tags."""

    def __init__(
        self,
        destino: DestinoAutorizado,
        usar_tls: bool,
        impressao_confiada: str | None,
        timeout_s: float = 5,
    ) -> None:
        if destino.protocolo != "tcp" or destino.porta is None:
            raise ValueError("a API RouterOS exige destino tcp com porta")
        self._destino = destino
        self._usar_tls = usar_tls
        self._confiada = impressao_confiada.lower() if impressao_confiada else None
        self._timeout = timeout_s
        self.max_sentencas = MAX_SENTENCAS
        self.limite_comando = LIMITE_COMANDO
        self.timeout_comando_s = TIMEOUT_COMANDO_S
        self.impressao: str | None = None  # SHA-256 hex do certificado apresentado
        self._leitor: asyncio.StreamReader | None = None
        self._escritor: asyncio.StreamWriter | None = None
        self._trava = asyncio.Lock()

    @property
    def conectado(self) -> bool:
        return self._escritor is not None

    async def conectar(self) -> None:
        if self.conectado:
            return
        contexto = _contexto_tls() if self._usar_tls else None
        try:
            async with asyncio.timeout(self._timeout):
                leitor, escritor = await asyncio.open_connection(
                    str(self._destino.ip), self._destino.porta, ssl=contexto
                )
        except (OSError, TimeoutError):
            raise ErroRouterOS(MSG_CONEXAO) from None
        self._leitor, self._escritor = leitor, escritor
        if self._usar_tls:
            await self._conferir_certificado(escritor)

    async def _conferir_certificado(self, escritor: asyncio.StreamWriter) -> None:
        objeto = escritor.get_extra_info("ssl_object")
        der = objeto.getpeercert(binary_form=True) if objeto is not None else None
        if not der:
            await self.fechar()
            raise ErroRouterOS(MSG_SEM_CERT)
        impressao = hashlib.sha256(der).hexdigest()
        self.impressao = impressao
        if self._confiada is None:
            await self.fechar()
            raise CertificadoNaoConfiado(impressao)
        if not hmac.compare_digest(impressao, self._confiada):
            await self.fechar()
            raise CertificadoMudou(impressao)

    async def login(self, usuario: str, senha: str) -> None:
        """Login moderno (RouterOS ≥ 6.43): nome e senha numa só sentença."""
        try:
            _, fim = await self._executar(["/login", f"=name={usuario}", f"=password={senha}"])
        except ErroComandoRouterOS:
            await self.fechar()
            raise ErroRouterOS(MSG_LOGIN) from None
        if "ret" in fim:  # desafio MD5 do login antigo
            await self.fechar()
            raise ErroRouterOS(MSG_ANTIGO)

    async def comando(self, palavras: list[str]) -> list[dict[str, str]]:
        linhas, _ = await self._executar(palavras)
        return linhas

    async def _executar(self, palavras: list[str]) -> tuple[list[dict[str, str]], dict[str, str]]:
        async with self._trava:
            leitor, escritor = self._leitor, self._escritor
            if leitor is None or escritor is None:
                raise ErroRouterOS(MSG_FECHADA)
            try:
                async with asyncio.timeout(self.timeout_comando_s):
                    return await self._trocar(leitor, escritor, palavras)
            except ErroComandoRouterOS:
                raise
            except ErroRouterOS:
                await self.fechar()
                raise
            except TimeoutError:
                await self.fechar()
                raise ErroRouterOS(MSG_TEMPO) from None
            except (OSError, UnicodeError):
                await self.fechar()
                raise ErroRouterOS(MSG_FALHA) from None

    async def _trocar(
        self, leitor: asyncio.StreamReader, escritor: asyncio.StreamWriter, palavras: list[str]
    ) -> tuple[list[dict[str, str]], dict[str, str]]:
        async with asyncio.timeout(self._timeout):
            escritor.write(codificar_sentenca(palavras))
            await escritor.drain()
        linhas: list[dict[str, str]] = []
        recusado = False
        restante = self.limite_comando
        for _ in range(self.max_sentencas):
            async with asyncio.timeout(self._timeout):
                sentenca, lidos = await ler_sentenca_medida(leitor, min(LIMITE_SENTENCA, restante))
            restante -= lidos
            tipo = sentenca[0] if sentenca else ""
            if tipo == "!re":
                if not recusado:
                    linhas.append(_atributos(sentenca[1:]))
            elif tipo == "!done":
                if recusado:
                    raise ErroComandoRouterOS()
                return linhas, _atributos(sentenca[1:])
            elif tipo == "!trap":
                recusado = True
            elif tipo == "!fatal":
                raise ErroRouterOS(MSG_FATAL)
            elif tipo != "!empty":
                raise ErroRouterOS(MSG_INESPERADA)
        raise ErroRouterOS(MSG_GRANDE)

    async def fechar(self) -> None:
        escritor, self._leitor, self._escritor = self._escritor, None, None
        if escritor is None:
            return
        escritor.close()
        with contextlib.suppress(OSError, TimeoutError, ssl.SSLError):
            async with asyncio.timeout(self._timeout):
                await escritor.wait_closed()
