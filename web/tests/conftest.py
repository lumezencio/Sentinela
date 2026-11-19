"""Fixtures do smoke de front (R6).

Sem ``SENTINELA_URL_SMOKE``: sobe um uvicorn real em HTTPS (certificado autoassinado
descartável) em 127.0.0.1 com banco SQLite temporário, modo demonstração e um admin; o
``web/src`` é servido como estático NA MESMA ORIGEM só aqui, nunca no código de produção.

Fase 3: o modo demonstração já semeia as três fontes simuladas (MikroTik, switch SNMP e
gravador de 16 canais, todas em 10.99.x) e o orquestrador as coleta ao subir, então a fila de
Novos chega com ~40 descobertas sem nenhum pacote na rede. ``alvo_fila_grande`` sobe um
segundo core (sem demonstração) com 2.000 descobertas pendentes semeadas no banco.

Com ``SENTINELA_URL_SMOKE``: usa a URL dada (compose) e as credenciais de
``SENTINELA_SMOKE_LOGIN``/``SENTINELA_SMOKE_SENHA``; derrubar/levantar o core vira
``docker compose stop/start core`` SÓ se a URL for local (localhost/127.0.0.1) e
``SENTINELA_SMOKE_COMPOSE_LOCAL=1``; fora disso o cenário de queda é pulado (nunca mexe
em containers de outra máquina ou de outro projeto).
"""

import asyncio
import datetime as dt
import ipaddress
import itertools
import json
import os
import re
import secrets
import socket
import subprocess
import threading
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import urlsplit

import pytest

_EQUIPAMENTO_DO_ALERTA = itertools.count()
RAIZ = Path(__file__).resolve().parents[2]
WEB_SRC = RAIZ / "web" / "src"
# mesma política que o proxy de produção vai enviar: violação vira erro no console
CSP_PRODUCAO = (
    "default-src 'self'; connect-src 'self' wss:; img-src 'self' data:; "
    "style-src 'self'; script-src 'self'; frame-ancestors 'none'"
)


class Core(Protocol):
    def derrubar(self) -> None: ...
    def levantar(self) -> None: ...


@dataclass
class Alvo:
    url: str
    login: str
    senha: str
    core: Core
    # usuário com papel "visualizador" (opcional contra o compose)
    login_leitor: str = ""
    senha_leitor: str = ""
    # banco do core local do smoke ("" contra o compose: lá não se mexe no banco)
    banco_url: str = ""


def _porta_livre() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        porta: int = s.getsockname()[1]
        return porta


def _certificado(pasta: Path) -> tuple[Path, Path]:
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.x509.oid import NameOID

    chave = ec.generate_private_key(ec.SECP256R1())
    nome = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "127.0.0.1")])
    agora = dt.datetime.now(dt.UTC)
    cert = (
        x509.CertificateBuilder()
        .subject_name(nome)
        .issuer_name(nome)
        .public_key(chave.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(agora - dt.timedelta(minutes=5))
        .not_valid_after(agora + dt.timedelta(days=1))
        .add_extension(
            x509.SubjectAlternativeName([x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]),
            critical=False,
        )
        .sign(chave, hashes.SHA256())
    )
    arq_chave, arq_cert = pasta / "smoke.key", pasta / "smoke.crt"
    arq_chave.write_bytes(
        chave.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    arq_cert.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    return arq_chave, arq_cert


async def _preparar_banco(
    banco_url: str,
    login: str,
    senha: str,
    leitor: tuple[str, str] | None = None,
    descobertas: int = 0,
) -> None:
    from sentinela.db.base import Base
    from sentinela.db.modelos import Descoberta, Usuario
    from sentinela.db.sessao import criar_motor, fabrica_sessao
    from sentinela.seguranca.senhas import gerar_hash

    motor = criar_motor(banco_url)
    try:
        async with motor.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with fabrica_sessao(motor)() as db:
            db.add(Usuario(login=login, hash_senha=gerar_hash(senha), papel="admin"))
            if leitor:
                db.add(
                    Usuario(login=leitor[0], hash_senha=gerar_hash(leitor[1]), papel="visualizador")
                )
            agora = dt.datetime.now(dt.UTC)
            for n in range(descobertas):  # fila grande sintética: 10.99.x, MAC 02:00:00:…
                db.add(
                    Descoberta(
                        chave=f"02:00:00:fc:{n // 256:02x}:{n % 256:02x}",
                        ip=f"10.99.{100 + n // 250}.{n % 250 + 1}",
                        mac=f"02:00:00:fc:{n // 256:02x}:{n % 256:02x}",
                        nome_sugerido=f"aparelho-{n:04d}",
                        classe_sugerida="iot",
                        confianca=0.6,
                        sinais={"motivos": [{"descricao": "Nome DHCP", "pontos": {"iot": 60}}]},
                        origens=[{"origem": "dhcp", "fonte_id": None}],
                        status="pendente",
                        fora_das_subredes=True,
                        primeira_vez=agora - dt.timedelta(seconds=n),
                        ultima_vez=agora,
                    )
                )
            await db.commit()
    finally:
        await motor.dispose()


async def _equipamentos_online(db: Any, quantos: int) -> list[Any]:
    """Os ``quantos`` primeiros equipamentos online (por nome), esperando a demo terminar a
    primeira rodada de checagens: uma transição para online depois do alerta semeado o
    fecharia (o agrupador entende como "voltou")."""
    from sqlalchemy import select

    from sentinela.db.modelos import Equipamento

    limite = time.monotonic() + 60
    while True:
        eqs = list(
            (
                await db.execute(
                    select(Equipamento)
                    .where(Equipamento.estado == "online", Equipamento.pausado.is_(False))
                    .order_by(Equipamento.nome)
                    .limit(quantos)
                )
            ).scalars()
        )
        if len(eqs) >= quantos:
            return eqs
        if time.monotonic() > limite:
            raise RuntimeError("a demo não deixou equipamentos online a tempo")
        await asyncio.sleep(0.5)
        db.expire_all()


async def semear_alertas(
    banco_url: str, nome_longo: str = "", nome_extremo: str = ""
) -> dict[str, dict[str, Any]]:
    """Insere seis alertas fictícios sobre equipamentos reais do demo (já semeado).

    ``aberto`` (3 afetados, enviado), ``instavel`` (reconhecido), ``silenciado``, ``fechado``
    (caiu e voltou), ``pendente`` e ``falhou``. Devolve
    ``{chave: {"id", "equipamento_id", "texto"}}`` com o texto que o painel mostra.
    Capturas de tela: ``nome_longo`` renomeia o equipamento do alerta ``aberto`` e
    ``nome_extremo`` (300 caracteres) o do ``falhou``, o pior caso de texto.
    """
    from sqlalchemy import select, update

    from sentinela.db.modelos import Alerta, Equipamento, Usuario
    from sentinela.db.sessao import criar_motor, fabrica_sessao

    motor = criar_motor(banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            eqs = await _equipamentos_online(db, 12)
            admin = await db.scalar(select(Usuario.id).where(Usuario.papel == "admin"))
            if nome_longo:
                await db.execute(
                    update(Equipamento).where(Equipamento.id == eqs[0].id).values(nome=nome_longo)
                )
                eqs[0].nome = nome_longo
            if nome_extremo:
                await db.execute(
                    update(Equipamento).where(Equipamento.id == eqs[8].id).values(nome=nome_extremo)
                )
                eqs[8].nome = nome_extremo
            agora = dt.datetime.now(dt.UTC)

            def min_atras(n: int) -> dt.datetime:
                return agora - dt.timedelta(minutes=n)

            plano: list[tuple[str, Alerta, str]] = [
                (
                    "aberto",
                    Alerta(
                        tipo="queda",
                        equipamento_id=eqs[0].id,
                        quedas=[eqs[0].id],
                        afetados=[e.id for e in eqs[1:4]],
                        aberto_em=min_atras(12),
                        envio="enviado",
                    ),
                    f"{eqs[0].nome} caiu · 3 afetados",
                ),
                (
                    "instavel",
                    Alerta(
                        tipo="instavel",
                        equipamento_id=eqs[4].id,
                        aberto_em=min_atras(20),
                        reconhecido_por=admin,
                        reconhecido_em=min_atras(5),
                        envio="enviado",
                    ),
                    f"{eqs[4].nome} instável",
                ),
                (
                    "silenciado",
                    Alerta(
                        tipo="queda",
                        equipamento_id=eqs[5].id,
                        quedas=[eqs[5].id],
                        aberto_em=min_atras(30),
                        silenciado=True,
                        envio="nao_aplica",
                    ),
                    f"{eqs[5].nome} caiu",
                ),
                (
                    "fechado",
                    Alerta(
                        tipo="queda",
                        equipamento_id=eqs[6].id,
                        quedas=[eqs[6].id],
                        voltaram=[eqs[6].id],
                        aberto_em=min_atras(52),
                        fechado_em=min_atras(50),
                        breve=True,
                        envio="enviado",
                    ),
                    f"{eqs[6].nome} caiu e voltou (2 min)",
                ),
                (
                    "pendente",
                    Alerta(
                        tipo="queda",
                        equipamento_id=eqs[7].id,
                        quedas=[eqs[7].id],
                        aberto_em=min_atras(2),
                        envio="pendente",
                    ),
                    f"{eqs[7].nome} caiu",
                ),
                (
                    "falhou",
                    Alerta(
                        tipo="queda",
                        equipamento_id=eqs[8].id,
                        quedas=[eqs[8].id],
                        aberto_em=min_atras(3),
                        envio="falhou",
                    ),
                    f"{eqs[8].nome} caiu",
                ),
            ]
            for _, alerta, _ in plano:
                db.add(alerta)
            await db.flush()  # ids antes do commit (depois dele os atributos expiram)
            saida = {
                chave: {"id": a.id, "equipamento_id": a.equipamento_id, "texto": texto}
                for chave, a, texto in plano
            }
            await db.commit()
            return saida
    finally:
        await motor.dispose()


async def inserir_alerta(
    banco_url: str, indice: int, renomear: str = "", **campos: Any
) -> dict[str, Any]:
    """Um alerta de queda aberto sobre o ``indice``-ésimo equipamento livre do demo (a partir
    do 13º, longe dos de ``semear_alertas``); ``campos`` sobrescreve as colunas. ``renomear``
    troca o nome do equipamento (texto hostil); o nome original volta em ``nome_original``."""
    from sentinela.db.modelos import Alerta
    from sentinela.db.sessao import criar_motor, fabrica_sessao

    motor = criar_motor(banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            eq = (await _equipamentos_online(db, 60))[12 + indice]
            padrao: dict[str, Any] = {
                "tipo": "queda",
                "equipamento_id": eq.id,
                "quedas": [eq.id],
                "aberto_em": dt.datetime.now(dt.UTC) - dt.timedelta(minutes=1),
                "envio": "pendente",
            }
            nome_original = eq.nome
            if renomear:
                eq.nome = renomear
            alerta = Alerta(**{**padrao, **campos})
            db.add(alerta)
            await db.flush()
            saida = {
                "id": alerta.id,
                "equipamento_id": eq.id,
                "texto": f"{eq.nome} caiu",
                "nome_original": nome_original,
            }
            await db.commit()
            return saida
    finally:
        await motor.dispose()


NOME_60 = "Switch de distribuição do bloco administrativo, sala de rede"  # 60 caracteres


async def semear_cartoes(banco_url: str) -> dict[str, Any]:
    """Alertas para as capturas dos cartões: uma queda de grupo (principal de 60 caracteres e
    14 afetados, um deles de nome comprido), uma instabilidade e uma queda simples. Devolve
    ``{chave: id}``. Só no banco do core local (nunca no compose)."""
    from sqlalchemy import update

    from sentinela.db.modelos import Alerta, Equipamento
    from sentinela.db.sessao import criar_motor, fabrica_sessao

    motor = criar_motor(banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            eqs = await _equipamentos_online(db, 60)
            principal, afetados = eqs[40], eqs[41:55]
            await db.execute(
                update(Equipamento).where(Equipamento.id == principal.id).values(nome=NOME_60)
            )
            await db.execute(
                update(Equipamento)
                .where(Equipamento.id == afetados[3].id)
                .values(nome="Câmera do corredor central do prédio anexo, canal 14, lado leste")
            )
            agora = dt.datetime.now(dt.UTC)
            grupo = Alerta(
                tipo="queda",
                equipamento_id=principal.id,
                quedas=[principal.id],
                afetados=[e.id for e in afetados],
                aberto_em=agora - dt.timedelta(minutes=4),
                envio="enviado",
            )
            instavel = Alerta(
                tipo="instavel",
                equipamento_id=eqs[55].id,
                aberto_em=agora - dt.timedelta(minutes=9),
                envio="enviado",
            )
            simples = Alerta(
                tipo="queda",
                equipamento_id=eqs[56].id,
                quedas=[eqs[56].id],
                aberto_em=agora - dt.timedelta(minutes=1),
                envio="pendente",
            )
            db.add_all([grupo, instavel, simples])
            await db.flush()
            saida = {"grupo": grupo.id, "instavel": instavel.id, "simples": simples.id}
            await db.commit()
            return saida
    finally:
        await motor.dispose()


class PonteWs:
    """Rota do WebSocket da página: repassa tudo ao servidor e deixa o teste injetar mensagens
    (o servidor não é tocado). Instale antes de ``page.goto``."""

    def __init__(self, page: Any, caminho: str = r".*/ws$") -> None:
        self.rotas: list[Any] = []

        def ao_ws(ws: Any) -> None:
            servidor = ws.connect_to_server()
            ws.on_message(lambda m: servidor.send(m))
            servidor.on_message(lambda m: ws.send(m))
            self.rotas.append(ws)

        page.route_web_socket(re.compile(caminho), ao_ws)

    def injetar(self, mensagem: dict[str, Any]) -> None:
        assert self.rotas, "o navegador ainda não abriu o WebSocket"
        self.rotas[-1].send(json.dumps(mensagem))


async def apagar_alertas(
    banco_url: str, ids: list[int], nomes: dict[str, str] | None = None
) -> None:
    from sqlalchemy import delete, update

    from sentinela.db.modelos import Alerta, Equipamento
    from sentinela.db.sessao import criar_motor, fabrica_sessao

    motor = criar_motor(banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            await db.execute(delete(Alerta).where(Alerta.id.in_(ids)))
            for eid, nome in (nomes or {}).items():  # devolve o nome trocado por ``renomear``
                await db.execute(update(Equipamento).where(Equipamento.id == eid).values(nome=nome))
            await db.commit()
    finally:
        await motor.dispose()


def _em_thread(funcao: Any) -> None:
    """O Playwright síncrono mantém um laço asyncio na thread principal."""
    falhas: list[BaseException] = []

    def rodar() -> None:
        try:
            funcao()
        except BaseException as e:  # repassa para a thread do teste
            falhas.append(e)

    t = threading.Thread(target=rodar)
    t.start()
    t.join()
    if falhas:
        raise falhas[0]


class ServidorLocal:
    """uvicorn numa thread; ``derrubar``/``levantar`` simulam reiniciar o processo do core."""

    def __init__(
        self, banco_url: str, porta: int, chave: Path, cert: Path, demo: bool = True
    ) -> None:
        self._banco_url = banco_url
        self._demo = demo
        self.porta = porta
        self._chave = chave
        self._cert = cert
        self._servidor: Any = None
        self._thread: threading.Thread | None = None

    def _app(self) -> Any:
        from fastapi.staticfiles import StaticFiles
        from starlette.middleware.base import BaseHTTPMiddleware

        from sentinela.config import Settings
        from sentinela.main import criar_app

        settings = Settings(
            ambiente="desenvolvimento",
            banco_url=self._banco_url,
            chave_sessao="chave-do-smoke-nao-secreta",  # noqa: S106 - só teste
            chave_credenciais=secrets.token_hex(32),
            demo=self._demo,
        )
        app = criar_app(settings)

        async def com_csp(request: Any, chamar: Any) -> Any:
            resposta = await chamar(request)
            resposta.headers["Content-Security-Policy"] = CSP_PRODUCAO
            return resposta

        app.add_middleware(BaseHTTPMiddleware, dispatch=com_csp)
        # SÓ NA FIXTURE: em produção o estático vem do container web (nginx)
        app.mount("/", StaticFiles(directory=WEB_SRC, html=True), name="web")
        return app

    def levantar(self) -> None:
        import uvicorn

        config = uvicorn.Config(
            self._app(),
            host="127.0.0.1",
            port=self.porta,
            ssl_keyfile=str(self._chave),
            ssl_certfile=str(self._cert),
            log_level="warning",
            timeout_graceful_shutdown=3,
        )
        self._servidor = uvicorn.Server(config)
        self._thread = threading.Thread(target=self._servidor.run, daemon=True)
        self._thread.start()
        limite = time.monotonic() + 30
        while not self._servidor.started:
            if not self._thread.is_alive() or time.monotonic() > limite:
                raise RuntimeError("uvicorn do smoke não subiu")
            time.sleep(0.05)

    def derrubar(self) -> None:
        if self._servidor is None or self._thread is None:
            return
        self._servidor.should_exit = True
        self._thread.join(timeout=20)
        if self._thread.is_alive():
            raise RuntimeError("uvicorn do smoke não parou")
        self._servidor = None


class CoreIntocavel:
    """Alvo remoto ou sem autorização explícita: o cenário de queda do core é pulado."""

    MOTIVO = (
        "queda do core no compose exige URL local (localhost/127.0.0.1) e "
        "SENTINELA_SMOKE_COMPOSE_LOCAL=1; cenário pulado"
    )

    def derrubar(self) -> None:
        pytest.skip(self.MOTIVO)

    def levantar(self) -> None:  # pragma: no cover - derrubar já pulou
        pytest.skip(self.MOTIVO)


def _compose_local_autorizado(url: str) -> bool:
    host = urlsplit(url).hostname or ""
    return host in ("localhost", "127.0.0.1") and (
        os.environ.get("SENTINELA_SMOKE_COMPOSE_LOCAL") == "1"
    )


class CoreCompose:
    def _compose(self, acao: str) -> None:
        subprocess.run(  # noqa: S603 - comando fixo
            ["docker", "compose", acao, "core"],  # noqa: S607
            cwd=RAIZ,
            check=True,
            timeout=120,
        )

    def derrubar(self) -> None:
        self._compose("stop")

    def levantar(self) -> None:
        self._compose("start")


@pytest.fixture(scope="session")
def alvo(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Alvo]:
    url = os.environ.get("SENTINELA_URL_SMOKE")
    if url:
        yield Alvo(
            url=url.rstrip("/"),
            login=os.environ["SENTINELA_SMOKE_LOGIN"],
            senha=os.environ["SENTINELA_SMOKE_SENHA"],
            core=CoreCompose() if _compose_local_autorizado(url) else CoreIntocavel(),
            login_leitor=os.environ.get("SENTINELA_SMOKE_LEITOR_LOGIN", ""),
            senha_leitor=os.environ.get("SENTINELA_SMOKE_LEITOR_SENHA", ""),
        )
        return
    pasta = tmp_path_factory.mktemp("smoke")
    banco_url = f"sqlite+aiosqlite:///{(pasta / 'smoke.db').as_posix()}"
    login, senha = "admin", secrets.token_urlsafe(18)
    leitor = ("leitor", secrets.token_urlsafe(18))
    _em_thread(lambda: asyncio.run(_preparar_banco(banco_url, login, senha, leitor)))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco_url, _porta_livre(), chave, cert)
    servidor.levantar()
    try:
        yield Alvo(
            f"https://127.0.0.1:{servidor.porta}",
            login,
            senha,
            servidor,
            leitor[0],
            leitor[1],
            banco_url,
        )
    finally:
        servidor.derrubar()


@pytest.fixture(scope="session")
def alvo_fila_grande(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Alvo]:
    """Core sem demonstração com 2.000 descobertas pendentes (paginação da aba Novos)."""
    if os.environ.get("SENTINELA_URL_SMOKE"):
        pytest.skip("fila de 2.000 só com o core local do smoke (não mexe no compose)")
    pasta = tmp_path_factory.mktemp("fila")
    banco_url = f"sqlite+aiosqlite:///{(pasta / 'fila.db').as_posix()}"
    login, senha = "admin", secrets.token_urlsafe(18)
    _em_thread(lambda: asyncio.run(_preparar_banco(banco_url, login, senha, descobertas=2000)))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco_url, _porta_livre(), chave, cert, demo=False)
    servidor.levantar()
    try:
        yield Alvo(f"https://127.0.0.1:{servidor.porta}", login, senha, servidor)
    finally:
        servidor.derrubar()


@pytest.fixture(scope="session")
def alertas_semeados(alvo: Alvo) -> dict[str, dict[str, Any]]:
    """Alertas fictícios no banco do core local (o demo ainda não os semeia). Contra o
    compose não se mexe no banco: os testes que dependem deles são pulados."""
    if not alvo.banco_url:
        pytest.skip("alertas semeados só com o core local do smoke")
    saida: dict[str, dict[str, Any]] = {}
    _em_thread(lambda: saida.update(asyncio.run(semear_alertas(alvo.banco_url))))
    return saida


@pytest.fixture
def novo_alerta(alvo: Alvo, alertas_semeados: dict[str, dict[str, Any]]) -> Iterator[Any]:
    """Fábrica de alertas descartáveis (os testes que mudam o alerta não mexem nos semeados)."""
    criados: list[int] = []
    renomeados: dict[str, str] = {}

    def criar(**campos: Any) -> dict[str, Any]:
        saida: dict[str, Any] = {}
        n = next(_EQUIPAMENTO_DO_ALERTA)  # um equipamento diferente a cada alerta
        _em_thread(lambda: saida.update(asyncio.run(inserir_alerta(alvo.banco_url, n, **campos))))
        criados.append(saida["id"])
        if campos.get("renomear"):
            renomeados[saida["equipamento_id"]] = saida["nome_original"]
        return saida

    yield criar
    if criados:
        _em_thread(lambda: asyncio.run(apagar_alertas(alvo.banco_url, criados, renomeados)))


async def criar_usuario(banco_url: str, login: str, senha: str, papel: str = "admin") -> None:
    """Usuário descartável no banco do core local (sem segundo fator)."""
    from sentinela.db.modelos import Usuario
    from sentinela.db.sessao import criar_motor, fabrica_sessao
    from sentinela.seguranca.senhas import gerar_hash

    motor = criar_motor(banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            db.add(Usuario(login=login, hash_senha=gerar_hash(senha), papel=papel))
            await db.commit()
    finally:
        await motor.dispose()


@dataclass
class ContaTotp:
    login: str
    senha: str
    segredo: str
    codigos: list[str]
    contador_usado: int
    api: Any  # APIRequestContext já autenticado (sessão rotacionada pela ativação)

    def codigo_seguinte(self) -> str:
        """Código da janela seguinte à usada na ativação (dentro da tolerância de ±1)."""
        import pyotp

        return pyotp.TOTP(self.segredo).at(time.time() + 30)

    def patch(self, caminho: str, corpo: dict[str, Any]) -> Any:
        csrf = next(
            c["value"] for c in self.api.storage_state()["cookies"] if c["name"] == "sentinela_csrf"
        )
        return self.api.patch(f"/api/v1{caminho}", data=corpo, headers={"X-CSRF": csrf})


@pytest.fixture
def novo_usuario(alvo: Alvo) -> Any:
    """Fábrica de usuários descartáveis (login e senha aleatórios); só no core local."""
    if not alvo.banco_url:
        pytest.skip("usuários descartáveis só com o core local do smoke")

    def criar(papel: str = "admin") -> tuple[str, str]:
        login, senha = f"u{secrets.token_hex(6)}", secrets.token_urlsafe(18)
        _em_thread(lambda: asyncio.run(criar_usuario(alvo.banco_url, login, senha, papel)))
        return login, senha

    return criar


@pytest.fixture
def conta_com_totp(alvo: Alvo, novo_usuario: Any, playwright: Any) -> Any:
    """Fábrica de administradores com o segundo fator já ativo (ativado pela API, como o
    navegador faria). Cada conta é nova: o servidor recusa reaproveitar um código."""
    import pyotp

    abertos: list[Any] = []

    def criar() -> ContaTotp:
        login, senha = novo_usuario("admin")
        api = playwright.request.new_context(base_url=alvo.url, ignore_https_errors=True)
        abertos.append(api)
        r = api.post("/api/v1/auth/login", data={"login": login, "senha": senha})
        assert r.status == 204, r.status

        def csrf() -> str:
            return next(
                c["value"] for c in api.storage_state()["cookies"] if c["name"] == "sentinela_csrf"
            )

        r = api.post("/api/v1/auth/totp/iniciar", data={"senha": senha}, headers={"X-CSRF": csrf()})
        assert r.status == 200, r.status
        segredo = r.json()["chave"].replace(" ", "")
        totp = pyotp.TOTP(segredo)
        codigo = totp.now()
        r = api.post(
            "/api/v1/auth/totp/confirmar", data={"codigo": codigo}, headers={"X-CSRF": csrf()}
        )
        assert r.status == 200, r.status
        codigos = r.json()["codigos"]
        assert len(codigos) == 10
        return ContaTotp(login, senha, segredo, codigos, int(time.time()) // 30, api)

    yield criar
    for api in abertos:
        api.dispose()


@pytest.fixture(scope="session")
def base_url(alvo: Alvo) -> str:
    """URL do alvo. Substitui o fallback de ``base_url`` do pytest-playwright 0.10, que é um
    método de instância com escopo de sessão (o pytest 9 avisa com PytestRemovedIn10Warning)."""
    return alvo.url


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args: dict[str, Any], alvo: Alvo) -> dict[str, Any]:
    return {**browser_context_args, "ignore_https_errors": True, "base_url": alvo.url}
