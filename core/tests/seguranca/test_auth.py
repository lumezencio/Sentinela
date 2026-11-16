import asyncio
import hashlib
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import pytest
from argon2 import PasswordHasher
from fastapi import Depends, FastAPI
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.api.deps import exigir_admin, verificar_csrf
from sentinela.db.modelos import Sessao, Usuario
from sentinela.relogio import RelogioFalso
from sentinela.seguranca import senhas
from sentinela.seguranca.senhas import gerar_hash, verificar
from sentinela.seguranca.sessoes import hash_token
from tests.seguranca.conftest import CriarUsuario

SENHA = "senha-de-teste-longa-1"
MSG_INVALIDO = "Login ou senha inválidos."
MSG_MUITAS = "Muitas tentativas. Aguarde e tente novamente."
LOGIN_URL = "/api/v1/auth/login"


def _cookie_header(resposta: httpx.Response, nome: str) -> str:
    for valor in resposta.headers.get_list("set-cookie"):
        if valor.startswith(f"{nome}="):
            return valor
    raise AssertionError(f"cookie {nome} ausente")


async def _login(cliente: httpx.AsyncClient, login: str, senha: str) -> httpx.Response:
    return await cliente.post(LOGIN_URL, json={"login": login, "senha": senha})


def _sessoes(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    s: async_sessionmaker[AsyncSession] = app.state.sessoes
    return s


# --- senhas -----------------------------------------------------------------


def test_hash_argon2id() -> None:
    h = gerar_hash(SENHA)
    assert h.startswith("$argon2id$")
    assert verificar(h, SENHA)
    assert not verificar(h, SENHA + "x")
    assert not verificar("lixo-que-nao-e-hash", SENHA)


def test_senha_curta_rejeitada() -> None:
    with pytest.raises(ValueError, match="12"):
        gerar_hash("curta12345")


# --- login ------------------------------------------------------------------


async def test_login_ok_define_cookies_seguros(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA, "admin")
    r = await _login(cliente, "ana", SENHA)
    assert r.status_code == 204

    sessao = _cookie_header(r, "sentinela_sessao").lower()
    assert "httponly" in sessao
    assert "secure" in sessao
    assert "samesite=strict" in sessao
    assert "max-age=43200" in sessao

    csrf = _cookie_header(r, "sentinela_csrf").lower()
    assert "httponly" not in csrf
    assert "secure" in csrf
    assert "samesite=strict" in csrf

    eu = await cliente.get("/api/v1/auth/eu")
    assert eu.status_code == 200
    assert eu.json() == {"login": "ana", "papel": "admin"}


async def test_sessao_guarda_so_o_hash_do_token(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    await _login(cliente, "ana", SENHA)
    token = cliente.cookies["sentinela_sessao"]
    async with _sessoes(app)() as db:
        jtis = list((await db.execute(select(Sessao.jti))).scalars())
    assert jtis == [hash_token(token)]
    assert token not in jtis


async def test_mensagem_identica_inexistente_e_senha_errada(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    errada = await _login(cliente, "ana", "senha-errada-qualquer")
    inexistente = await _login(cliente, "ninguem", "senha-errada-qualquer")
    assert errada.status_code == inexistente.status_code == 401
    assert errada.json() == inexistente.json() == {"detail": MSG_INVALIDO}
    assert "set-cookie" not in errada.headers


async def test_login_exige_json(cliente: httpx.AsyncClient, criar_usuario: CriarUsuario) -> None:
    await criar_usuario("ana", SENHA)
    r = await cliente.post(LOGIN_URL, data={"login": "ana", "senha": SENHA})
    assert r.status_code == 415
    r2 = await cliente.post(
        LOGIN_URL,
        content=f'{{"login": "ana", "senha": "{SENHA}"}}',
        headers={"content-type": "text/plain"},
    )
    assert r2.status_code == 415


async def test_login_valida_tamanhos(cliente: httpx.AsyncClient) -> None:
    r = await _login(cliente, "a" * 65, SENHA)
    assert r.status_code == 422
    r2 = await _login(cliente, "ana", "x" * 1025)
    assert r2.status_code == 422


# --- bloqueio ---------------------------------------------------------------


async def test_sexta_tentativa_bloqueada_mesmo_com_senha_certa(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    for _ in range(5):
        r = await _login(cliente, "ana", "senha-errada-qualquer")
        assert r.status_code == 401
    r = await _login(cliente, "ana", SENHA)
    assert r.status_code == 429
    assert r.json() == {"detail": MSG_MUITAS}
    assert 1 <= int(r.headers["retry-after"]) <= 60
    assert "set-cookie" not in r.headers

    # vencido o bloqueio, a senha certa entra e zera as falhas
    async with _sessoes(app)() as db:
        await db.execute(
            update(Usuario).values(bloqueado_ate=datetime.now(UTC) - timedelta(seconds=1))
        )
        await db.commit()
    r = await _login(cliente, "ana", SENHA)
    assert r.status_code == 204
    async with _sessoes(app)() as db:
        u = (await db.execute(select(Usuario))).scalar_one()
    assert u.falhas == 0
    assert u.bloqueado_ate is None


async def test_inexistente_bloqueia_igual_ao_existente(cliente: httpx.AsyncClient) -> None:
    for _ in range(5):
        assert (await _login(cliente, "fantasma", "senha-errada-qualquer")).status_code == 401
    r = await _login(cliente, "fantasma", "senha-errada-qualquer")
    assert r.status_code == 429
    assert r.json() == {"detail": MSG_MUITAS}
    assert 1 <= int(r.headers["retry-after"]) <= 60


async def test_limite_por_ip(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario, relogio: RelogioFalso
) -> None:
    await criar_usuario("ana", SENHA)
    for i in range(20):
        r = await _login(cliente, f"desconhecido{i}", "senha-errada-qualquer")
        assert r.status_code == 401
    r = await _login(cliente, "ana", SENHA)
    assert r.status_code == 429
    assert r.json() == {"detail": MSG_MUITAS}
    assert int(r.headers["retry-after"]) == 600

    await relogio.avancar(600)
    assert (await _login(cliente, "ana", SENHA)).status_code == 204


# --- sessão, logout, CSRF e papéis ------------------------------------------


async def test_sem_sessao_401(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get("/api/v1/auth/eu")).status_code == 401
    cliente.cookies.set("sentinela_sessao", "token-forjado", domain="teste")
    assert (await cliente.get("/api/v1/auth/eu")).status_code == 401


async def test_sessao_expirada_401(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    await _login(cliente, "ana", SENHA)
    async with _sessoes(app)() as db:
        await db.execute(update(Sessao).values(expira_em=datetime.now(UTC) - timedelta(seconds=1)))
        await db.commit()
    assert (await cliente.get("/api/v1/auth/eu")).status_code == 401


async def test_logout_revoga(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    await _login(cliente, "ana", SENHA)
    token = cliente.cookies["sentinela_sessao"]
    csrf = cliente.cookies["sentinela_csrf"]

    r = await cliente.post("/api/v1/auth/logout", headers={"X-CSRF": csrf})
    assert r.status_code == 204
    async with _sessoes(app)() as db:
        assert (await db.execute(select(Sessao.revogada))).scalar_one() is True

    # mesmo reapresentando o token antigo, a sessão não vale mais
    cliente.cookies.set("sentinela_sessao", token, domain="teste")
    assert (await cliente.get("/api/v1/auth/eu")).status_code == 401


async def test_escrita_sem_csrf_403(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    await _login(cliente, "ana", SENHA)
    assert (await cliente.post("/api/v1/auth/logout")).status_code == 403
    errado = await cliente.post("/api/v1/auth/logout", headers={"X-CSRF": "outro-valor"})
    assert errado.status_code == 403
    assert (await cliente.get("/api/v1/auth/eu")).status_code == 200


async def test_csrf_so_em_escrita(app: FastAPI, cliente: httpx.AsyncClient) -> None:
    @app.get("/teste/leitura", dependencies=[Depends(verificar_csrf)])
    async def leitura() -> dict[str, bool]:
        return {"ok": True}

    @app.delete("/teste/escrita", dependencies=[Depends(verificar_csrf)])
    async def escrita() -> dict[str, bool]:
        return {"ok": True}

    assert (await cliente.get("/teste/leitura")).status_code == 200
    assert (await cliente.delete("/teste/escrita")).status_code == 403


async def test_visualizador_em_rota_admin_403(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    @app.get("/teste/admin", dependencies=[Depends(exigir_admin)])
    async def so_admin() -> dict[str, bool]:
        return {"ok": True}

    assert (await cliente.get("/teste/admin")).status_code == 401
    await criar_usuario("vera", SENHA, "visualizador")
    await criar_usuario("ana", SENHA, "admin")

    await _login(cliente, "vera", SENHA)
    assert (await cliente.get("/teste/admin")).status_code == 403

    cliente.cookies.clear()
    await _login(cliente, "ana", SENHA)
    assert (await cliente.get("/teste/admin")).status_code == 200


# --- logs -------------------------------------------------------------------


@pytest.fixture
def log_debug(caplog: pytest.LogCaptureFixture) -> pytest.LogCaptureFixture:
    """DEBUG em tudo, ligado ANTES do motor ser criado (o SQLAlchemy fixa o nível ali)."""
    caplog.set_level(logging.DEBUG)
    # O SQLAlchemy nasce em WARN; em INFO ele loga SQL com parâmetros (escondidos pelo
    # hide_parameters). DEBUG dele também loga linhas de resultado: só para depuração local.
    caplog.set_level(logging.INFO, logger="sqlalchemy.engine")
    return caplog


async def test_senha_e_tokens_nunca_no_log(
    log_debug: pytest.LogCaptureFixture, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    caplog = log_debug
    await criar_usuario("ana", SENHA)
    await _login(cliente, "ana", "senha-errada-qualquer")
    await _login(cliente, "fantasma", "outra-senha-errada")
    await _login(cliente, "ana", SENHA)
    token = cliente.cookies["sentinela_sessao"]
    csrf = cliente.cookies["sentinela_csrf"]
    await cliente.post("/api/v1/auth/logout", headers={"X-CSRF": csrf})

    texto = caplog.text
    assert "ana" in texto  # tentativas são registradas com o login...
    for segredo in (SENHA, "senha-errada-qualquer", "outra-senha-errada", token, csrf):
        assert segredo not in texto  # ...mas nunca com senha ou token
    assert hash_token(token) not in texto
    assert "$argon2" not in texto


# --- fix round 1: concorrência, executor, logs, 422, CSRF global -----------


async def test_rajada_concorrente_bloqueia_apos_cinco(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    respostas = await asyncio.gather(
        *(_login(cliente, "ana", "senha-errada-qualquer") for _ in range(10))
    )
    codigos = sorted(r.status_code for r in respostas)
    assert codigos.count(401) <= 5
    assert codigos.count(401) + codigos.count(429) == 10

    # senha certa numa nova rajada, já com a conta bloqueada
    mistas = await asyncio.gather(
        _login(cliente, "ana", "senha-errada-qualquer"),
        _login(cliente, "ana", SENHA),
        _login(cliente, "ana", "senha-errada-qualquer"),
    )
    assert [r.status_code for r in mistas] == [429, 429, 429]


async def test_rajada_concorrente_inexistente_bloqueia_apos_cinco(
    cliente: httpx.AsyncClient,
) -> None:
    respostas = await asyncio.gather(
        *(_login(cliente, "fantasma", "senha-errada-qualquer") for _ in range(10))
    )
    codigos = [r.status_code for r in respostas]
    assert codigos.count(401) == 5
    assert codigos.count(429) == 5


async def test_rajada_concorrente_respeita_limite_por_ip(cliente: httpx.AsyncClient) -> None:
    respostas = await asyncio.gather(
        *(_login(cliente, f"desconhecido{i}", "senha-errada-qualquer") for i in range(30))
    )
    codigos = [r.status_code for r in respostas]
    assert codigos.count(401) == 20
    assert codigos.count(429) == 10


async def test_sucesso_nao_consome_cota_do_ip(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    for i in range(19):
        assert (await _login(cliente, f"desconhecido{i}", "senha-errada")).status_code == 401
    for _ in range(3):
        cliente.cookies.clear()
        assert (await _login(cliente, "ana", SENHA)).status_code == 204
    assert (await _login(cliente, "outro", "senha-errada")).status_code == 401
    assert (await _login(cliente, "ana", SENHA)).status_code == 429


class _HasherPreso:
    """Delegador que trava em ``verify`` até ser liberado (prende a thread do argon2)."""

    def __init__(self, real: PasswordHasher) -> None:
        self.real = real
        self.comecou = threading.Event()
        self.liberar = threading.Event()

    def verify(self, h: str, senha: str) -> bool:
        self.comecou.set()
        self.liberar.wait(10)
        return self.real.verify(h, senha)

    def __getattr__(self, nome: str) -> Any:
        return getattr(self.real, nome)


async def test_argon2_nao_ocupa_o_executor_padrao(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario, monkeypatch: pytest.MonkeyPatch
) -> None:
    await criar_usuario("ana", SENHA)
    preso = _HasherPreso(senhas._hasher)
    monkeypatch.setattr(senhas, "_hasher", preso)
    asyncio.get_running_loop().set_default_executor(ThreadPoolExecutor(max_workers=1))

    tarefas = [
        asyncio.create_task(_login(cliente, "ana", "senha-errada-qualquer")) for _ in range(4)
    ]
    try:
        for _ in range(500):
            if preso.comecou.is_set():
                break
            await asyncio.sleep(0.01)
        assert preso.comecou.is_set()
        # o executor padrão continua livre para quem não tem nada a ver com login
        assert await asyncio.wait_for(asyncio.to_thread(int, "7"), timeout=2) == 7
    finally:
        preso.liberar.set()
        await asyncio.gather(*tarefas)


async def test_sexta_falha_bloqueia_120s(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    for _ in range(5):
        await _login(cliente, "ana", "senha-errada-qualquer")
    async with _sessoes(app)() as db:
        await db.execute(
            update(Usuario).values(bloqueado_ate=datetime.now(UTC) - timedelta(seconds=1))
        )
        await db.commit()
    assert (await _login(cliente, "ana", "senha-errada-qualquer")).status_code == 401
    r = await _login(cliente, "ana", SENHA)
    assert r.status_code == 429
    assert 115 <= int(r.headers["retry-after"]) <= 120


async def test_segundo_login_revoga_sessao_apresentada(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    await _login(cliente, "ana", SENHA)
    primeiro = cliente.cookies["sentinela_sessao"]
    await _login(cliente, "ana", SENHA)
    segundo = cliente.cookies["sentinela_sessao"]
    assert primeiro != segundo
    async with _sessoes(app)() as db:
        estado = {jti: rev for jti, rev in await db.execute(select(Sessao.jti, Sessao.revogada))}
    assert estado == {hash_token(primeiro): True, hash_token(segundo): False}


async def test_cookies_com_path_raiz(
    cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    r = await _login(cliente, "ana", SENHA)
    for nome in ("sentinela_sessao", "sentinela_csrf"):
        assert "path=/" in _cookie_header(r, nome).lower().replace("; ", ";").split(";")


async def test_login_desconhecido_logado_so_como_hash(
    log_debug: pytest.LogCaptureFixture, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("ana", SENHA)
    digitado = "minha-senha-no-campo-login"
    await _login(cliente, digitado, "qualquer-coisa")
    await _login(cliente, "ana", "senha-errada-qualquer")
    texto = log_debug.text
    assert digitado not in texto
    assert hashlib.sha256(digitado.encode()).hexdigest()[:12] in texto
    assert "login='ana'" in texto


async def test_422_nao_ecoa_entrada(cliente: httpx.AsyncClient) -> None:
    secreta = "segredo-" + "x" * 1100
    r = await _login(cliente, "ana", secreta)
    assert r.status_code == 422
    assert "segredo-" not in r.text
    for erro in r.json()["detail"]:
        assert set(erro) <= {"loc", "msg", "type"}
    r2 = await cliente.post(LOGIN_URL, json={"login": "ana", "senha": SENHA, "extra": "vaza"})
    assert r2.status_code == 422
    assert "vaza" not in r2.text
    assert SENHA not in r2.text


async def test_csrf_global_em_toda_escrita_da_api(app: FastAPI, cliente: httpx.AsyncClient) -> None:
    # o esquema OpenAPI (ligado fora de produção) é a lista pública de rotas
    caminhos: dict[str, dict[str, object]] = app.openapi()["paths"]
    verificadas = 0
    for caminho, operacoes in caminhos.items():
        if not caminho.startswith("/api/v1") or caminho == LOGIN_URL:
            continue
        concreto = re.sub(r"\{[^}]+\}", "1", caminho)
        for metodo in {m.upper() for m in operacoes} - {"GET", "HEAD", "OPTIONS"}:
            r = await cliente.request(metodo, concreto)
            assert r.status_code == 403, (metodo, caminho, r.status_code)
            verificadas += 1
    assert verificadas >= 1  # ao menos o logout


async def test_csrf_global_vale_para_rotas_novas(app: FastAPI, cliente: httpx.AsyncClient) -> None:
    @app.put("/api/v1/teste/escrita")
    async def escrita() -> dict[str, bool]:
        return {"ok": True}

    assert (await cliente.put("/api/v1/teste/escrita")).status_code == 403
