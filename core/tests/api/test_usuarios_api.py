import httpx
from fastapi import FastAPI
from sqlalchemy import select

from sentinela.db.modelos import Auditoria, CodigoRecuperacao, Sessao
from sentinela.seguranca import recuperacao
from tests.apoio_totp import AGORA_FIXO, dar_totp, sessoes_do, usuario_de
from tests.conftest import SENHA_TESTE, CriarUsuario


async def test_listar_usuarios_so_admin(
    app: FastAPI, cliente_admin: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    await criar_usuario("vera", SENHA_TESTE)
    await dar_totp(app, "vera")
    r = await cliente_admin.get("/api/v1/usuarios")
    assert r.status_code == 200
    linhas = r.json()
    assert [set(x) for x in linhas] == [{"id", "login", "papel", "totp_ativo"}] * 2
    por_login = {x["login"]: x for x in linhas}
    assert por_login["vera"]["totp_ativo"] is True
    assert por_login["admin-teste"]["totp_ativo"] is False
    assert "hash" not in r.text


async def test_visualizador_nao_lista_nem_zera_403(
    cliente_visualizador: httpx.AsyncClient,
) -> None:
    assert (await cliente_visualizador.get("/api/v1/usuarios")).status_code == 403
    assert (await cliente_visualizador.post("/api/v1/usuarios/1/totp/zerar")).status_code == 403


async def test_sem_sessao_401(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get("/api/v1/usuarios")).status_code == 401


async def test_zerar_totp_de_outro_usuario_audita_e_revoga_sessoes(
    app: FastAPI, cliente_admin: httpx.AsyncClient, criar_usuario: CriarUsuario
) -> None:
    alvo = await criar_usuario("vera", SENHA_TESTE)
    await dar_totp(app, "vera")
    async with sessoes_do(app)() as db:
        await recuperacao.emitir(db, alvo.id, AGORA_FIXO)
    transporte = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transporte, base_url="https://teste") as outro:
        # sessão da alvo (via DB: o login dela agora pede o código)
        from sentinela.seguranca.sessoes import criar_sessao

        async with sessoes_do(app)() as db:
            token = await criar_sessao(db, alvo.id, AGORA_FIXO.replace(year=2999))
        outro.cookies.set("sentinela_sessao", token)
        assert (await outro.get("/api/v1/auth/eu")).status_code == 200

        r = await cliente_admin.post(f"/api/v1/usuarios/{alvo.id}/totp/zerar")
        assert r.status_code == 204
        assert (await outro.get("/api/v1/auth/eu")).status_code == 401  # sessão revogada

    u = await usuario_de(app, "vera")
    assert u.totp_cifrado is None and u.totp_ultimo_contador is None
    async with sessoes_do(app)() as db:
        assert (await db.execute(select(CodigoRecuperacao))).scalars().all() == []
        sessoes = (await db.execute(select(Sessao).where(Sessao.usuario_id == alvo.id))).scalars()
        assert all(s.revogada for s in sessoes)
        auditorias = (await db.execute(select(Auditoria))).scalars().all()
    achadas = [a for a in auditorias if a.acao == "totp.zerar"]
    assert len(achadas) == 1
    assert achadas[0].alvo == f"usuario:{alvo.id}"
    assert achadas[0].usuario_id == (await usuario_de(app, "admin-teste")).id


async def test_zerar_id_inexistente_404_generico(cliente_admin: httpx.AsyncClient) -> None:
    r = await cliente_admin.post("/api/v1/usuarios/9999/totp/zerar")
    assert r.status_code == 404
    assert r.json() == {"detail": "Não encontrado."}


async def test_zerar_exige_csrf(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    del cliente_admin.headers["X-CSRF"]
    assert (await cliente_admin.post("/api/v1/usuarios/1/totp/zerar")).status_code == 403
