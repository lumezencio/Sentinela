"""Login em duas etapas, ativação do TOTP e códigos de recuperação."""

import asyncio
import logging
from datetime import timedelta
from typing import Any

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select, update

from sentinela.api import auth
from sentinela.db.modelos import Auditoria, CodigoRecuperacao, Sessao, Usuario
from sentinela.seguranca import etapa, recuperacao
from sentinela.seguranca.bloqueio import LimitadorIP
from sentinela.seguranca.etapa import COOKIE_ETAPA
from sentinela.seguranca.sessoes import hash_token
from sentinela.seguranca.totp import contador_de, decifrar_segredo, totp_ativo
from tests.apoio_totp import Tempo, codigo_em, dar_totp, sessoes_do, usuario_de
from tests.conftest import SENHA_TESTE, CriarUsuario

LOGIN = "/api/v1/auth/login"
ENTRAR = "/api/v1/auth/totp/entrar"
MSG_CODIGO = "Código inválido."


async def _login(
    c: httpx.AsyncClient, login: str = "ana", senha: str = SENHA_TESTE
) -> httpx.Response:
    return await c.post(LOGIN, json={"login": login, "senha": senha})


async def _entrar(c: httpx.AsyncClient, **corpo: str) -> httpx.Response:
    return await c.post(ENTRAR, json=corpo)


def _set_cookie(r: httpx.Response, nome: str) -> str:
    for valor in r.headers.get_list("set-cookie"):
        if valor.startswith(f"{nome}="):
            return valor
    raise AssertionError(f"cookie {nome} ausente")


@pytest.fixture
async def ana(app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario) -> str:
    """Usuária com TOTP ativo; devolve o segredo."""
    await criar_usuario("ana", SENHA_TESTE, "visualizador")
    return await dar_totp(app, "ana")


# --- legado e passo 1 -------------------------------------------------------


async def test_login_sem_totp_continua_204_e_zera_falhas(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("bia", SENHA_TESTE)
    for _ in range(3):
        assert (await _login(cliente, "bia", "errada-qualquer-1")).status_code == 401
    r = await _login(cliente, "bia")
    assert r.status_code == 204
    assert r.content == b""
    assert "sentinela_sessao=" in _set_cookie(r, "sentinela_sessao")
    assert COOKIE_ETAPA not in r.headers.get("set-cookie", "")
    assert (await usuario_de(app, "bia")).falhas == 0


async def test_login_com_totp_devolve_202_sem_sessao_e_nao_zera_falhas(
    app: FastAPI, cliente: httpx.AsyncClient, ana: str
) -> None:
    for _ in range(2):
        assert (await _login(cliente, "ana", "errada-qualquer-1")).status_code == 401
    r = await _login(cliente)
    assert r.status_code == 202
    assert r.json() == {"etapa": "totp"}
    assert "sentinela_sessao" not in r.headers.get("set-cookie", "")
    cookie = _set_cookie(r, COOKIE_ETAPA).lower()
    for parte in ("httponly", "secure", "samesite=strict", "path=/api/v1/auth", "max-age=300"):
        assert parte in cookie
    assert (await usuario_de(app, "ana")).falhas == 3  # 2 erros + a reserva deste login
    assert (await cliente.get("/api/v1/auth/eu")).status_code == 401


async def test_totp_pendente_nao_exige_segundo_fator(
    app: FastAPI, cliente: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("bia", SENHA_TESTE)
    async with sessoes_do(app)() as db:
        await db.execute(update(Usuario).values(totp_cifrado="pendente"))
        await db.commit()
    assert (await _login(cliente, "bia")).status_code == 204


# --- passo 2 ----------------------------------------------------------------


async def test_totp_certo_cria_sessao_zera_falhas_e_devolve_cota_do_ip(
    app: FastAPI, cliente: httpx.AsyncClient, ana: str, tempo: Tempo
) -> None:
    for _ in range(2):
        assert (await _login(cliente, "ana", "errada-qualquer-1")).status_code == 401
    assert (await _login(cliente)).status_code == 202
    antes = app.state.falhas_ip.restante("127.0.0.1")
    assert antes == 0
    r = await _entrar(cliente, codigo=codigo_em(ana, tempo()))
    assert r.status_code == 204
    cookie = _set_cookie(r, "sentinela_sessao").lower()
    assert "httponly" in cookie and "secure" in cookie and "samesite=strict" in cookie
    assert "sentinela_csrf=" in r.headers.get("set-cookie", "")
    u = await usuario_de(app, "ana")
    assert u.falhas == 0 and u.bloqueado_ate is None
    assert u.totp_ultimo_contador == contador_de(tempo())
    # as duas reservas do IP (2 erros de senha ficam; passo 1 e passo 2 voltam)
    assert len(app.state.falhas_ip._falhas["127.0.0.1"]) == 2  # noqa: SLF001
    assert (await cliente.get("/api/v1/auth/eu")).status_code == 200


async def test_cinco_chutes_de_totp_com_senha_certa_bloqueiam_o_login(
    app: FastAPI, cliente: httpx.AsyncClient, ana: str, tempo: Tempo
) -> None:
    assert (await _login(cliente)).status_code == 202
    erradas = 0
    while True:
        r = await _entrar(cliente, codigo="000000")
        if r.status_code == 429:
            break
        assert r.status_code == 401
        erradas += 1
        assert erradas < 10
    assert erradas == 4  # a reserva do passo 1 conta: a 5ª falha já bloqueia
    assert 1 <= int(r.headers["retry-after"]) <= 60
    # nem o código certo entra: login bloqueado e etapa já sem tentativas (5 reservadas)
    r = await _entrar(cliente, codigo=codigo_em(ana, tempo()))
    assert r.status_code == 401
    assert "sentinela_sessao" not in r.headers.get("set-cookie", "")
    assert (await _login(cliente)).status_code == 429
    u = await usuario_de(app, "ana")
    assert u.bloqueado_ate is not None


async def test_totp_errado_e_etapa_invalida_dao_a_mesma_mensagem(
    cliente: httpx.AsyncClient, ana: str
) -> None:
    assert (await _login(cliente)).status_code == 202
    errado = await _entrar(cliente, codigo="123456")
    cliente.cookies.delete(COOKIE_ETAPA, path="/api/v1/auth")
    sem_etapa = await _entrar(cliente, codigo="123456")
    cliente.cookies.set(COOKIE_ETAPA, "v1.1.9999999999.x.abc", path="/api/v1/auth")
    lixo = await _entrar(cliente, codigo="123456")
    for r in (errado, sem_etapa, lixo):
        assert r.status_code == 401
        assert r.json() == {"detail": MSG_CODIGO}


async def test_token_etapa_expirado_401(cliente: httpx.AsyncClient, ana: str, tempo: Tempo) -> None:
    assert (await _login(cliente)).status_code == 202
    tempo.avancar(301)
    r = await _entrar(cliente, codigo=codigo_em(ana, tempo()))
    assert r.status_code == 401
    assert r.json() == {"detail": MSG_CODIGO}


async def test_token_etapa_de_outro_usuario_nao_serve(
    app: FastAPI,
    cliente: httpx.AsyncClient,
    criar_usuario: CriarUsuario,
    ana: str,
    tempo: Tempo,
) -> None:
    await criar_usuario("caio", SENHA_TESTE)
    segredo_caio = await dar_totp(app, "caio")
    assert (await _login(cliente, "ana")).status_code == 202  # token da ana
    # o token carrega o usuário: o código do Caio não vale com a etapa da Ana
    r = await _entrar(cliente, codigo=codigo_em(segredo_caio, tempo()))
    assert r.status_code == 401
    # e um token com o id do Caio, mas assinado por outra chave, não é aceito
    from pydantic import SecretStr

    from sentinela.seguranca import etapa

    falso = etapa.emitir(SecretStr("outra"), (await usuario_de(app, "caio")).id, tempo())
    cliente.cookies.set(COOKIE_ETAPA, falso, path="/api/v1/auth")
    r = await _entrar(cliente, codigo=codigo_em(segredo_caio, tempo()))
    assert r.status_code == 401


async def test_etapa_uso_unico(cliente: httpx.AsyncClient, ana: str, tempo: Tempo) -> None:
    r = await _login(cliente)
    token = cliente.cookies[COOKIE_ETAPA]
    assert (await _entrar(cliente, codigo=codigo_em(ana, tempo()))).status_code == 204
    # reapresentar o mesmo token da etapa (com código novo e válido) não entra de novo
    tempo.avancar(30)
    cliente.cookies.clear()
    cliente.cookies.set(COOKIE_ETAPA, token, path="/api/v1/auth")
    r = await _entrar(cliente, codigo=codigo_em(ana, tempo()))
    assert r.status_code == 401
    assert r.json() == {"detail": MSG_CODIGO}


async def test_etapa_invalida_apos_5_erros(
    app: FastAPI, cliente: httpx.AsyncClient, ana: str, tempo: Tempo
) -> None:
    assert (await _login(cliente)).status_code == 202
    for _ in range(5):
        # mantém o login livre do bloqueio para chegar ao 5º erro na MESMA etapa
        async with sessoes_do(app)() as db:
            await db.execute(update(Usuario).values(falhas=0, bloqueado_ate=None))
            await db.commit()
        assert (await _entrar(cliente, codigo="000000")).status_code == 401
    async with sessoes_do(app)() as db:
        await db.execute(update(Usuario).values(falhas=0, bloqueado_ate=None))
        await db.commit()
    app.state.falhas_ip._falhas.clear()  # noqa: SLF001
    r = await _entrar(cliente, codigo=codigo_em(ana, tempo()))
    assert r.status_code == 401  # o código certo já não serve nessa etapa
    assert len(app.state.etapas_totp) == 0
    assert (await usuario_de(app, "ana")).falhas == 0  # etapa já invalidada: nem conta


async def test_codigo_repetido_na_mesma_janela_recusado(
    cliente: httpx.AsyncClient, ana: str, tempo: Tempo
) -> None:
    codigo = codigo_em(ana, tempo())
    assert (await _login(cliente)).status_code == 202
    assert (await _entrar(cliente, codigo=codigo)).status_code == 204
    cliente.cookies.clear()
    assert (await _login(cliente)).status_code == 202
    r = await _entrar(cliente, codigo=codigo)
    assert r.status_code == 401
    assert r.json() == {"detail": MSG_CODIGO}


async def test_codigo_da_janela_anterior_aceito_uma_vez(
    cliente: httpx.AsyncClient, ana: str, tempo: Tempo
) -> None:
    anterior = codigo_em(ana, tempo() - timedelta(seconds=30))
    assert (await _login(cliente)).status_code == 202
    assert (await _entrar(cliente, codigo=anterior)).status_code == 204
    cliente.cookies.clear()
    assert (await _login(cliente)).status_code == 202
    assert (await _entrar(cliente, codigo=anterior)).status_code == 401
    # uma janela mais velha que a tolerância nunca entra
    cliente.cookies.clear()
    assert (await _login(cliente)).status_code == 202
    velho = codigo_em(ana, tempo() - timedelta(seconds=90))
    assert (await _entrar(cliente, codigo=velho)).status_code == 401


async def test_recuperacao_entra_uma_vez_e_diminui_restantes(
    app: FastAPI, cliente: httpx.AsyncClient, ana: str, tempo: Tempo
) -> None:
    u = await usuario_de(app, "ana")
    async with sessoes_do(app)() as db:
        codigos = await recuperacao.emitir(db, u.id, tempo())
    assert (await _login(cliente)).status_code == 202
    r = await _entrar(cliente, recuperacao=codigos[0].lower().replace("-", " "))
    assert r.status_code == 204
    cliente.headers["X-CSRF"] = cliente.cookies["sentinela_csrf"]
    assert (await cliente.get("/api/v1/auth/eu")).json()["codigos_restantes"] == 9
    # o mesmo código não entra de novo
    cliente.cookies.clear()
    assert (await _login(cliente)).status_code == 202
    assert (await _entrar(cliente, recuperacao=codigos[0])).status_code == 401
    assert (await _entrar(cliente, recuperacao="AAAAA-BBBBB")).status_code == 401


async def test_corpo_com_codigo_e_recuperacao_juntos_422(
    cliente: httpx.AsyncClient, ana: str
) -> None:
    assert (await _login(cliente)).status_code == 202
    for corpo in (
        {"codigo": "123456", "recuperacao": "ABCDE-FGHJK"},
        {},
        {"codigo": None, "recuperacao": None},
        {"codigo": "123456", "extra": 1},
        {"codigo": 123456},
    ):
        r = await cliente.post(ENTRAR, json=corpo)
        assert r.status_code == 422
        assert "123456" not in r.text


async def test_entrar_exige_json(cliente: httpx.AsyncClient, ana: str) -> None:
    r = await cliente.post(ENTRAR, content="codigo=1", headers={"content-type": "text/plain"})
    assert r.status_code == 415


async def test_totp_zerado_entre_os_passos_da_401(
    app: FastAPI, cliente: httpx.AsyncClient, ana: str, tempo: Tempo
) -> None:
    assert (await _login(cliente)).status_code == 202
    async with sessoes_do(app)() as db:
        await db.execute(update(Usuario).values(totp_cifrado=None, totp_ultimo_contador=None))
        await db.commit()
    assert (await _entrar(cliente, codigo=codigo_em(ana, tempo()))).status_code == 401


async def test_falha_de_banco_na_recuperacao_da_401(
    app: FastAPI,
    cliente: httpx.AsyncClient,
    ana: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from sqlalchemy.exc import OperationalError

    async def _quebra(*_a: object, **_k: object) -> bool:
        raise OperationalError("x", None, Exception("locked"))

    monkeypatch.setattr("sentinela.api.totp.recuperacao.consumir", _quebra)
    assert (await _login(cliente)).status_code == 202
    r = await _entrar(cliente, recuperacao="ABCDE-FGHJK")
    assert r.status_code == 401
    assert r.json() == {"detail": MSG_CODIGO}


# --- Review Focus 1: corrida -----------------------------------------------


class Corrida:
    """Segura as duas requisições logo depois da reserva (``armar``): ambas leem o mesmo estado
    do usuário antes de qualquer aceite, que é a janela exata da corrida."""

    def __init__(self) -> None:
        self.armada = False
        self.barreira = asyncio.Barrier(2)

    def armar(self) -> None:
        self.armada = True


@pytest.fixture
def corrida(monkeypatch: pytest.MonkeyPatch) -> Corrida:
    c = Corrida()
    original = auth.reservar_falha

    async def _reservar(*args: Any, **kw: Any) -> Any:
        linha = await original(*args, **kw)
        if c.armada:
            await asyncio.wait_for(c.barreira.wait(), 5)
        return linha

    monkeypatch.setattr(auth, "reservar_falha", _reservar)
    return c


async def test_dois_envios_simultaneos_do_mesmo_codigo_so_um_entra(
    app: FastAPI, ana: str, tempo: Tempo, corrida: Corrida
) -> None:
    codigo = codigo_em(ana, tempo())
    transporte = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transporte, base_url="https://teste") as c1,
        httpx.AsyncClient(transport=transporte, base_url="https://teste") as c2,
    ):
        assert (await _login(c1)).status_code == 202
        assert (await _login(c2)).status_code == 202
        corrida.armar()
        r1, r2 = await asyncio.gather(_entrar(c1, codigo=codigo), _entrar(c2, codigo=codigo))
    assert sorted([r1.status_code, r2.status_code]) == [204, 401]
    perdedora = r1 if r1.status_code == 401 else r2
    assert perdedora.json() == {"detail": MSG_CODIGO}
    assert "sentinela_sessao" not in perdedora.headers.get("set-cookie", "")


async def test_recuperacao_simultanea_so_um_entra(
    app: FastAPI, ana: str, tempo: Tempo, corrida: Corrida
) -> None:
    u = await usuario_de(app, "ana")
    async with sessoes_do(app)() as db:
        codigos = await recuperacao.emitir(db, u.id, tempo())
    transporte = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transporte, base_url="https://teste") as c1,
        httpx.AsyncClient(transport=transporte, base_url="https://teste") as c2,
    ):
        assert (await _login(c1)).status_code == 202
        assert (await _login(c2)).status_code == 202
        corrida.armar()
        r1, r2 = await asyncio.gather(
            _entrar(c1, recuperacao=codigos[3]), _entrar(c2, recuperacao=codigos[3])
        )
    assert sorted([r1.status_code, r2.status_code]) == [204, 401]
    async with sessoes_do(app)() as db:
        assert await recuperacao.restantes(db, u.id) == 9


# --- ativação ---------------------------------------------------------------

INICIAR = "/api/v1/auth/totp/iniciar"
CONFIRMAR = "/api/v1/auth/totp/confirmar"
QR = "/api/v1/auth/totp/qr"


async def test_iniciar_exige_senha_certa(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    r = await cliente_visualizador.post(INICIAR, json={"senha": "errada-qualquer-1"})
    assert r.status_code == 401
    assert r.json() == {"detail": "Login ou senha inválidos."}
    assert (await usuario_de(app, "visual-teste")).falhas == 1  # conta no bloqueio
    r = await cliente_visualizador.post(INICIAR, json={"senha": SENHA_TESTE})
    assert r.status_code == 200
    corpo = r.json()
    assert set(corpo) == {"chave", "qr_url"}
    assert corpo["qr_url"] == QR
    grupos = corpo["chave"].split(" ")
    assert len(grupos) == 8 and all(len(g) == 4 for g in grupos)
    u = await usuario_de(app, "visual-teste")
    assert u.falhas == 1  # a certa devolve a própria reserva; a falha anterior fica
    assert u.totp_cifrado is not None and u.totp_ultimo_contador is None
    assert not totp_ativo(u)
    assert decifrar_segredo(app.state.cofre, u.totp_cifrado) == corpo["chave"].replace(" ", "")


async def test_iniciar_bloqueia_apos_5_senhas_erradas(
    cliente_visualizador: httpx.AsyncClient,
) -> None:
    for _ in range(5):
        assert (
            await cliente_visualizador.post(INICIAR, json={"senha": "errada-qualquer-1"})
        ).status_code == 401
    r = await cliente_visualizador.post(INICIAR, json={"senha": SENHA_TESTE})
    assert r.status_code == 429


async def test_iniciar_com_totp_ativo_409(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    await dar_totp(app, "visual-teste")
    r = await cliente_visualizador.post(INICIAR, json={"senha": SENHA_TESTE})
    assert r.status_code == 409


async def test_qr_exige_sessao_e_nao_e_cacheavel(
    app: FastAPI, cliente: httpx.AsyncClient, cliente_visualizador: httpx.AsyncClient
) -> None:
    # (cliente e cliente_visualizador são o mesmo; testa sem sessão numa instância nova)
    transporte = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as anonimo:
        assert (await anonimo.get(QR)).status_code == 401
    assert (await cliente_visualizador.get(QR)).status_code == 404  # nada pendente
    await cliente_visualizador.post(INICIAR, json={"senha": SENHA_TESTE})
    r = await cliente_visualizador.get(QR)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/svg+xml")
    assert "no-store" in r.headers["cache-control"]
    assert r.content.startswith(b"<svg")
    assert b"<script" not in r.content


async def test_confirmar_certo_ativa_e_devolve_10_codigos_uma_vez(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, tempo: Tempo
) -> None:
    c = cliente_visualizador
    segredo = (await c.post(INICIAR, json={"senha": SENHA_TESTE})).json()["chave"].replace(" ", "")
    r = await c.post(CONFIRMAR, json={"codigo": codigo_em(segredo, tempo())})
    assert r.status_code == 200
    codigos = r.json()["codigos"]
    assert len(codigos) == 10 and len(set(codigos)) == 10
    u = await usuario_de(app, "visual-teste")
    assert totp_ativo(u)
    assert u.totp_ultimo_contador == contador_de(tempo())
    # ativar de novo: 409 no iniciar; confirmar sem pendência: 409
    assert (await c.post(INICIAR, json={"senha": SENHA_TESTE})).status_code == 409
    r = await c.post(CONFIRMAR, json={"codigo": codigo_em(segredo, tempo())})
    assert r.status_code == 409
    assert (await c.get(QR)).status_code == 404


async def test_confirmar_errado_nao_ativa(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    c = cliente_visualizador
    await c.post(INICIAR, json={"senha": SENHA_TESTE})
    for corpo in ({"codigo": "000000"}, {"codigo": "abc"}, {"codigo": ""}):
        r = await c.post(CONFIRMAR, json=corpo)
        assert r.status_code in (401, 422)
    assert not totp_ativo(await usuario_de(app, "visual-teste"))
    async with sessoes_do(app)() as db:
        total = (await db.execute(select(CodigoRecuperacao))).scalars().all()
    assert total == []


async def test_confirmar_sem_iniciar_409(cliente_visualizador: httpx.AsyncClient) -> None:
    r = await cliente_visualizador.post(CONFIRMAR, json={"codigo": "123456"})
    assert r.status_code == 409


async def test_confirmar_simultaneo_ativa_uma_vez(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, tempo: Tempo
) -> None:
    c = cliente_visualizador
    segredo = (await c.post(INICIAR, json={"senha": SENHA_TESTE})).json()["chave"].replace(" ", "")
    codigo = codigo_em(segredo, tempo())
    r1, r2 = await asyncio.gather(
        c.post(CONFIRMAR, json={"codigo": codigo}), c.post(CONFIRMAR, json={"codigo": codigo})
    )
    assert sorted([r1.status_code, r2.status_code]) == [200, 409]
    async with sessoes_do(app)() as db:
        assert await recuperacao.restantes(db, (await usuario_de(app, "visual-teste")).id) == 10


async def test_codigos_nao_aparecem_de_novo_em_nenhuma_resposta(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, tempo: Tempo
) -> None:
    c = cliente_visualizador
    segredo = (await c.post(INICIAR, json={"senha": SENHA_TESTE})).json()["chave"].replace(" ", "")
    codigos = (await c.post(CONFIRMAR, json={"codigo": codigo_em(segredo, tempo())})).json()[
        "codigos"
    ]
    textos = [
        (await c.get("/api/v1/auth/eu")).text,
        (await c.post(INICIAR, json={"senha": SENHA_TESTE})).text,
        (await c.post(CONFIRMAR, json={"codigo": "000000"})).text,
        (await c.get(QR)).text,
    ]
    for texto in textos:
        for codigo in codigos:
            assert codigo not in texto
        assert segredo not in texto


async def test_eu_informa_totp_ativo_e_restantes(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient, tempo: Tempo
) -> None:
    c = cliente_visualizador
    eu = (await c.get("/api/v1/auth/eu")).json()
    assert eu == {
        "login": "visual-teste",
        "papel": "visualizador",
        "totp_ativo": False,
        "restrita": False,
        "codigos_restantes": None,
    }
    u = await usuario_de(app, "visual-teste")
    await dar_totp(app, "visual-teste")
    async with sessoes_do(app)() as db:
        await recuperacao.emitir(db, u.id, tempo())
    eu = (await c.get("/api/v1/auth/eu")).json()
    assert eu["totp_ativo"] is True and eu["codigos_restantes"] == 10


async def test_logs_da_etapa_sem_segredos(
    cliente: httpx.AsyncClient, ana: str, tempo: Tempo, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    assert (await _login(cliente)).status_code == 202
    token = cliente.cookies[COOKIE_ETAPA]
    codigo = codigo_em(ana, tempo())
    await _entrar(cliente, codigo=codigo)
    for texto in (ana, token, codigo):
        assert texto not in caplog.text


# --- endurecimento (revisão da Task 2) ----------------------------------------


async def test_iniciar_nao_e_cacheavel(cliente_visualizador: httpx.AsyncClient) -> None:
    r = await cliente_visualizador.post(INICIAR, json={"senha": SENHA_TESTE})
    assert r.status_code == 200
    assert "no-store" in r.headers["cache-control"]
    assert r.headers["pragma"] == "no-cache"


async def test_iniciar_certo_com_4_falhas_nao_deixa_o_usuario_trancado(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    async with sessoes_do(app)() as db:
        await db.execute(update(Usuario).values(falhas=4))
        await db.commit()
    # a reserva leva a 5 falhas (bloqueio de 1 min); a senha certa devolve a reserva E o bloqueio
    r = await cliente_visualizador.post(INICIAR, json={"senha": SENHA_TESTE})
    assert r.status_code == 200
    u = await usuario_de(app, "visual-teste")
    assert u.falhas == 4
    assert u.bloqueado_ate is None
    assert (await _login(cliente_visualizador, "visual-teste")).status_code == 204


async def test_devolver_reserva_mantem_bloqueio_acima_do_limiar(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    async with sessoes_do(app)() as db:
        await db.execute(update(Usuario).values(falhas=7))
        await db.commit()
    assert (
        await cliente_visualizador.post(INICIAR, json={"senha": SENHA_TESTE})
    ).status_code == 200
    # 7 falhas: a reserva (8) criou bloqueio; devolvida a 7 ainda é >= 5, o bloqueio fica
    assert (await usuario_de(app, "visual-teste")).falhas == 7


async def test_confirmar_e_atomico_se_a_emissao_falha_o_totp_nao_ativa(
    app: FastAPI,
    cliente_visualizador: httpx.AsyncClient,
    tempo: Tempo,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    c = cliente_visualizador
    segredo = (await c.post(INICIAR, json={"senha": SENHA_TESTE})).json()["chave"].replace(" ", "")

    async def _quebra(*_a: object, **_k: object) -> None:
        raise RuntimeError("falha na emissão")

    monkeypatch.setattr("sentinela.api.totp.recuperacao.gravar", _quebra)
    with pytest.raises(RuntimeError):
        await c.post(CONFIRMAR, json={"codigo": codigo_em(segredo, tempo())})
    u = await usuario_de(app, "visual-teste")
    assert not totp_ativo(u) and u.totp_ultimo_contador is None
    async with sessoes_do(app)() as db:
        assert (await db.execute(select(CodigoRecuperacao))).scalars().all() == []
        assert "totp.ativar" not in [
            a.acao for a in (await db.execute(select(Auditoria))).scalars()
        ]
    monkeypatch.undo()
    r = await c.post(CONFIRMAR, json={"codigo": codigo_em(segredo, tempo())})
    assert r.status_code == 200
    async with sessoes_do(app)() as db:
        acoes = [a.acao for a in (await db.execute(select(Auditoria))).scalars()]
    assert acoes.count("totp.ativar") == 1


async def test_confirmar_rotaciona_a_sessao(
    app: FastAPI, cliente_admin: httpx.AsyncClient, tempo: Tempo
) -> None:
    c = cliente_admin
    app.state.politica_totp = True
    antiga = c.cookies["sentinela_sessao"]
    segredo = (await c.post(INICIAR, json={"senha": SENHA_TESTE})).json()["chave"].replace(" ", "")
    r = await c.post(CONFIRMAR, json={"codigo": codigo_em(segredo, tempo())})
    assert r.status_code == 200
    nova = c.cookies["sentinela_sessao"]
    assert nova != antiga
    assert (await c.get("/api/v1/auth/eu")).status_code == 200
    async with sessoes_do(app)() as db:
        revogada = (
            await db.execute(select(Sessao.revogada).where(Sessao.jti == hash_token(antiga)))
        ).scalar_one()
    assert revogada is True
    # a sessão antiga já não serve
    transporte = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as outro:
        outro.cookies.set("sentinela_sessao", antiga)
        assert (await outro.get("/api/v1/auth/eu")).status_code == 401


async def test_limite_de_5_tentativas_por_etapa_e_atomico_sob_concorrencia(
    app: FastAPI, cliente: httpx.AsyncClient, ana: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    assert (await _login(cliente)).status_code == 202
    chamadas = 0
    original = auth._conferir_codigo

    async def _conta(*a: Any, **k: Any) -> bool:
        nonlocal chamadas
        chamadas += 1
        await asyncio.sleep(0.05)  # alarga a janela: todas as 12 já passaram pelo portão
        return await original(*a, **k)

    monkeypatch.setattr(auth, "_conferir_codigo", _conta)
    monkeypatch.setattr(auth, "duracao_bloqueio", lambda _f: 0)  # isola o limite da etapa
    app.state.falhas_ip = LimitadorIP(app.state.relogio, max_falhas=1000)
    respostas = await asyncio.gather(*(_entrar(cliente, codigo="000000") for _ in range(12)))
    assert [r.status_code for r in respostas] == [401] * 12
    assert chamadas == etapa.ERROS_MAXIMOS == 5


def test_recusa_varios_workers(monkeypatch: pytest.MonkeyPatch) -> None:
    from sentinela.main import criar_app

    monkeypatch.setenv("WEB_CONCURRENCY", "4")
    with pytest.raises(RuntimeError, match="único processo"):
        criar_app()
