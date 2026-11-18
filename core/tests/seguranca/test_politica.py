import httpx
from fastapi import FastAPI
from sqlalchemy import select

from sentinela.db.modelos import Auditoria
from sentinela.seguranca import politica
from sentinela.seguranca.totp import cifrar_segredo
from tests.apoio_totp import codigo_em, dar_totp, sessoes_do
from tests.conftest import SENHA_TESTE

EQUIPAMENTOS = "/api/v1/equipamentos"


async def test_admin_sem_totp_com_politica_so_acessa_ativacao(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    from datetime import UTC, datetime

    import pyotp

    app.state.politica_totp = True
    r = await cliente_admin.get(EQUIPAMENTOS)
    assert r.status_code == 403
    assert r.json() == {"detail": "Ative o segundo fator para continuar."}
    eu = (await cliente_admin.get("/api/v1/auth/eu")).json()
    assert eu["restrita"] is True
    assert eu["totp_ativo"] is False
    assert eu["codigos_restantes"] is None

    r = await cliente_admin.post("/api/v1/auth/totp/iniciar", json={"senha": SENHA_TESTE})
    assert r.status_code == 200
    segredo = r.json()["chave"].replace(" ", "")
    assert (await cliente_admin.get(EQUIPAMENTOS)).status_code == 403
    codigo = codigo_em(segredo, datetime.now(UTC))
    assert pyotp.TOTP(segredo).verify(codigo)
    r = await cliente_admin.post("/api/v1/auth/totp/confirmar", json={"codigo": codigo})
    assert r.status_code == 200
    assert (await cliente_admin.get(EQUIPAMENTOS)).status_code == 200
    assert (await cliente_admin.get("/api/v1/auth/eu")).json()["restrita"] is False


async def test_restrita_permite_logout(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    app.state.politica_totp = True
    assert (await cliente_admin.post("/api/v1/auth/logout")).status_code == 204


async def test_visualizador_nao_e_restrito(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    app.state.politica_totp = True
    assert (await cliente_visualizador.get(EQUIPAMENTOS)).status_code == 200
    assert (await cliente_visualizador.get("/api/v1/auth/eu")).json()["restrita"] is False


async def test_admin_com_totp_nao_e_restrito(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await dar_totp(app, "admin-teste")
    app.state.politica_totp = True
    assert (await cliente_admin.get(EQUIPAMENTOS)).status_code == 200


async def test_politica_desligada_libera_na_hora(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    app.state.politica_totp = True
    assert (await cliente_admin.get(EQUIPAMENTOS)).status_code == 403
    app.state.politica_totp = False
    assert (await cliente_admin.get(EQUIPAMENTOS)).status_code == 200


async def test_so_admin_altera_a_politica(
    app: FastAPI,
    cliente_visualizador: httpx.AsyncClient,
) -> None:
    r = await cliente_visualizador.patch(
        "/api/v1/config/seguranca", json={"exigir_totp_admin": True}
    )
    assert r.status_code == 403
    assert (await cliente_visualizador.get("/api/v1/config/seguranca")).status_code == 403
    assert app.state.politica_totp is False


async def test_admin_altera_audita_e_persiste(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await dar_totp(app, "admin-teste")  # senão a própria política o deixaria restrito
    r = await cliente_admin.get("/api/v1/config/seguranca")
    assert r.status_code == 200
    assert r.json() == {"exigir_totp_admin": False}
    r = await cliente_admin.patch("/api/v1/config/seguranca", json={"exigir_totp_admin": True})
    assert r.status_code == 200
    assert r.json() == {"exigir_totp_admin": True}
    assert app.state.politica_totp is True
    async with sessoes_do(app)() as db:
        assert await politica.exigir_totp_admin(db) is True
        acoes = list((await db.execute(select(Auditoria.acao))).scalars())
    assert "config.seguranca" in acoes
    # entrada inválida: 422, política intacta
    for corpo in ({"exigir_totp_admin": "sim"}, {}, {"exigir_totp_admin": True, "x": 1}):
        r = await cliente_admin.patch("/api/v1/config/seguranca", json=corpo)
        assert r.status_code == 422
    assert app.state.politica_totp is True


async def test_politica_gravada_e_carregada_no_inicio(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    async with sessoes_do(app)() as db:
        await politica.definir_exigir_totp_admin(db, True)
        await db.commit()
    # um novo ciclo de vida lê o valor gravado
    async with app.router.lifespan_context(app):
        assert app.state.politica_totp is True


def test_restrita_so_admin_sem_totp_ativo() -> None:
    from sentinela.db.modelos import Usuario

    sem = Usuario(login="a", hash_senha="h", papel="admin")
    assert politica.restrita(sem, True)
    assert not politica.restrita(sem, False)
    pendente = Usuario(login="a", hash_senha="h", papel="admin", totp_cifrado="x")
    assert politica.restrita(pendente, True)
    ativo = Usuario(
        login="a", hash_senha="h", papel="admin", totp_cifrado="x", totp_ultimo_contador=5
    )
    assert not politica.restrita(ativo, True)
    visual = Usuario(login="v", hash_senha="h", papel="visualizador")
    assert not politica.restrita(visual, True)
    assert cifrar_segredo  # usado só para manter o import explícito dos helpers
