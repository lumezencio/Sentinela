"""API de fontes de descoberta (Task 8 da Fase 3)."""

from typing import Any

import httpx
import pytest
from fastapi import FastAPI

from sentinela.db.modelos import Fonte
from sentinela.descoberta.fontes.base import CertificadoNaoConfiado, ErroColeta, ResultadoTeste
from sentinela.relogio import RelogioFalso
from sentinela.seguranca.cofre import Cofre
from tests.api.apoio_descoberta import (
    FONTES,
    IMPRESSAO,
    OUTRA_IMPRESSAO,
    Falsos,
    auditorias,
    corpo_mikrotik,
    criar_fonte,
    sessoes,
    subrede,
)

SENHA = "senha-do-roteador"


@pytest.fixture
async def falsos(app: FastAPI, cliente_admin: httpx.AsyncClient) -> Falsos:
    f = Falsos()
    f.instalar(app)
    await subrede(cliente_admin)
    return f


async def _fonte_db(app: FastAPI, id: str) -> Fonte:
    async with sessoes(app)() as db:
        fonte = await db.get(Fonte, id)
        assert fonte is not None
        return fonte


def _cofre(app: FastAPI) -> Cofre:
    c: Cofre = app.state.cofre
    return c


# ---- papel e CSRF -----------------------------------------------------------------------------

ID = "00000000-0000-4000-8000-000000000000"
ESCRITAS = [
    ("POST", FONTES),
    ("PATCH", f"{FONTES}/{ID}"),
    ("DELETE", f"{FONTES}/{ID}"),
    ("POST", f"{FONTES}/{ID}/testar"),
    ("POST", f"{FONTES}/{ID}/coletar"),
    ("POST", f"{FONTES}/{ID}/confiar"),
]


@pytest.mark.parametrize(("metodo", "url"), ESCRITAS)
async def test_escrita_403_para_visualizador(
    cliente_visualizador: httpx.AsyncClient, metodo: str, url: str
) -> None:
    r = await cliente_visualizador.request(metodo, url, json={})
    assert r.status_code == 403


@pytest.mark.parametrize(("metodo", "url"), ESCRITAS)
async def test_escrita_403_sem_csrf(
    cliente_admin: httpx.AsyncClient, metodo: str, url: str
) -> None:
    del cliente_admin.headers["X-CSRF"]
    r = await cliente_admin.request(metodo, url, json={})
    assert r.status_code == 403


async def test_listar_so_admin(cliente_visualizador: httpx.AsyncClient) -> None:
    assert (await cliente_visualizador.get(FONTES)).status_code == 403


# ---- CRUD -------------------------------------------------------------------------------------


async def test_criar_listar_sem_credencial(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await subrede(cliente_admin)
    criada = await criar_fonte(cliente_admin)
    assert criada["credencial_definida"] is True
    assert criada["porta"] == 8729 and criada["tls"] is True and criada["intervalo_s"] == 600
    assert "credencial" not in criada and "credencial_cifrada" not in criada
    assert (await cliente_admin.get(FONTES)).json() == [criada]
    fonte = await _fonte_db(app, criada["id"])
    assert _cofre(app).decifrar(fonte.credencial_cifrada) == {"usuario": "leitor", "senha": SENHA}


@pytest.mark.parametrize(
    ("tipo", "credencial", "tls", "porta"),
    [
        ("snmp", {"versao": "2c", "comunidade": "publica-x"}, False, 161),
        (
            "snmp",
            {
                "versao": "3",
                "usuario": "u",
                "auth": "SHA",
                "senha_auth": "12345678",
                "priv": "AES",
                "senha_priv": "87654321",
            },
            False,
            161,
        ),
        ("hikvision", {"usuario": "admin", "senha": "x"}, True, 443),
        ("dahua", {"usuario": "admin", "senha": "x"}, True, 443),
    ],
)
async def test_criar_por_tipo(
    cliente_admin: httpx.AsyncClient,
    tipo: str,
    credencial: dict[str, str],
    tls: bool,
    porta: int,
) -> None:
    await subrede(cliente_admin)
    corpo = {"tipo": tipo, "nome": "F", "host": "10.99.0.2", "credencial": credencial}
    r = await cliente_admin.post(FONTES, json=corpo)
    assert r.status_code == 201, r.text
    assert r.json()["tls"] is tls and r.json()["porta"] == porta


@pytest.mark.parametrize(
    "corpo",
    [
        corpo_mikrotik(credencial={"versao": "2c", "comunidade": "x"}),  # tipo errado
        corpo_mikrotik(credencial={"usuario": "a", "senha": "b", "extra": "c"}),
        corpo_mikrotik(credencial={"usuario": "a", "senha": "s" * 200}),
        corpo_mikrotik(credencial={"usuario": "a"}),
        corpo_mikrotik(tipo="snmp", credencial={"usuario": "a", "senha": "b"}),
        corpo_mikrotik(
            tipo="snmp",
            credencial={
                "versao": "3",
                "usuario": "u",
                "auth": "SHA",
                "senha_auth": "12345678",
                "priv": "AES",
            },
        ),
        corpo_mikrotik(tipo="simulada"),
        corpo_mikrotik(intervalo_s=60),
        corpo_mikrotik(campo_extra=1),
        corpo_mikrotik(nome=""),
    ],
)
async def test_criar_entrada_invalida_422(
    cliente_admin: httpx.AsyncClient, corpo: dict[str, Any]
) -> None:
    await subrede(cliente_admin)
    r = await cliente_admin.post(FONTES, json=corpo)
    assert r.status_code == 422


@pytest.mark.parametrize("host", ["8.8.8.8", "10.98.0.1", "10.99.0.255", "nome.local", "::1"])
async def test_criar_host_fora_das_subredes_422(
    cliente_admin: httpx.AsyncClient, host: str
) -> None:
    await subrede(cliente_admin)
    r = await cliente_admin.post(FONTES, json=corpo_mikrotik(host=host))
    assert r.status_code == 422
    assert host not in r.text  # mensagem genérica, sem eco


async def test_patch_sem_credencial_mantem_a_antiga(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await subrede(cliente_admin)
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.patch(f"{FONTES}/{criada['id']}", json={"nome": "Novo", "ativa": False})
    assert r.status_code == 200, r.text
    assert r.json()["nome"] == "Novo" and r.json()["ativa"] is False
    fonte = await _fonte_db(app, criada["id"])
    assert _cofre(app).decifrar(fonte.credencial_cifrada)["senha"] == SENHA


async def test_patch_troca_credencial(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await subrede(cliente_admin)
    criada = await criar_fonte(cliente_admin)
    nova = {"usuario": "outro", "senha": "nova-senha"}
    r = await cliente_admin.patch(f"{FONTES}/{criada['id']}", json={"credencial": nova})
    assert r.status_code == 200
    fonte = await _fonte_db(app, criada["id"])
    assert _cofre(app).decifrar(fonte.credencial_cifrada) == nova


async def test_patch_credencial_de_outro_tipo_422(cliente_admin: httpx.AsyncClient) -> None:
    await subrede(cliente_admin)
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.patch(
        f"{FONTES}/{criada['id']}", json={"credencial": {"versao": "2c", "comunidade": "x"}}
    )
    assert r.status_code == 422


@pytest.mark.parametrize(
    "edicao", [{"host": "8.8.8.8"}, {"tipo": "snmp"}, {"nome": None}, {"porta": 0}]
)
async def test_patch_invalido_422(cliente_admin: httpx.AsyncClient, edicao: dict[str, Any]) -> None:
    await subrede(cliente_admin)
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.patch(f"{FONTES}/{criada['id']}", json=edicao)
    assert r.status_code == 422


async def test_patch_host_esquece_impressao_confiada(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await subrede(cliente_admin)
    criada = await criar_fonte(cliente_admin)
    async with sessoes(app)() as db:
        fonte = await db.get(Fonte, criada["id"])
        assert fonte is not None
        fonte.impressao_tls = IMPRESSAO
        await db.commit()
    r = await cliente_admin.patch(f"{FONTES}/{criada['id']}", json={"host": "10.99.0.9"})
    assert r.status_code == 200
    assert r.json()["impressao_tls"] is None and r.json()["host"] == "10.99.0.9"


async def test_remover(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await subrede(cliente_admin)
    criada = await criar_fonte(cliente_admin)
    assert (await cliente_admin.delete(f"{FONTES}/{criada['id']}")).status_code == 204
    assert (await cliente_admin.get(FONTES)).json() == []
    assert (await cliente_admin.delete(f"{FONTES}/{criada['id']}")).status_code == 404


@pytest.mark.parametrize("metodo", ["PATCH", "DELETE"])
async def test_fonte_inexistente_404(cliente_admin: httpx.AsyncClient, metodo: str) -> None:
    r = await cliente_admin.request(metodo, f"{FONTES}/{ID}", json={"nome": "x"})
    assert r.status_code == 404


# ---- testar, confiar, coletar ----------------------------------------------------------------


async def test_testar_mostra_identidade_e_avisos(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    falsos.coletor.teste = ResultadoTeste(
        ok=True,
        identidade="RB-1",
        versao="7.15",
        avisos=["grupo com write"],
        impressao_tls=IMPRESSAO,
    )
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.post(f"{FONTES}/{criada['id']}/testar")
    assert r.status_code == 200, r.text
    assert r.json() == {
        "ok": True,
        "identidade": "RB-1",
        "versao": "7.15",
        "avisos": ["grupo com write"],
        "impressao_tls": IMPRESSAO,
        "erro": None,
    }
    assert [a.acao for a in await auditorias(app)][-1] == "fonte.testar"


async def test_testar_erro_generico_e_mascarado(
    cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    falsos.coletor.teste = ErroColeta(f"falhou com {SENHA}")
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.post(f"{FONTES}/{criada['id']}/testar")
    assert r.status_code == 200
    assert r.json()["ok"] is False and SENHA not in r.text


async def test_testar_excecao_inesperada_generica(
    cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    falsos.coletor.teste = RuntimeError(f"traceback com {SENHA}")
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.post(f"{FONTES}/{criada['id']}/testar")
    assert r.status_code == 200
    assert r.json()["ok"] is False and SENHA not in r.text and "traceback" not in r.text


async def test_confiar_impressao_mostrada(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    falsos.coletor.teste = CertificadoNaoConfiado(IMPRESSAO)
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.post(f"{FONTES}/{criada['id']}/testar")
    assert r.json()["impressao_tls"] == IMPRESSAO and r.json()["ok"] is False
    r = await cliente_admin.post(f"{FONTES}/{criada['id']}/confiar", json={"impressao": IMPRESSAO})
    assert r.status_code == 200, r.text
    assert r.json()["impressao_tls"] == IMPRESSAO
    assert (await _fonte_db(app, criada["id"])).impressao_tls == IMPRESSAO
    auditoria = (await auditorias(app))[-1]
    assert auditoria.acao == "fonte.confiar" and auditoria.depois == {"impressao_tls": IMPRESSAO}


async def test_confiar_impressao_diferente_da_mostrada_409(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    falsos.coletor.teste = CertificadoNaoConfiado(IMPRESSAO)
    criada = await criar_fonte(cliente_admin)
    url = f"{FONTES}/{criada['id']}/confiar"
    # nada mostrado ainda
    assert (await cliente_admin.post(url, json={"impressao": IMPRESSAO})).status_code == 409
    await cliente_admin.post(f"{FONTES}/{criada['id']}/testar")
    r = await cliente_admin.post(url, json={"impressao": OUTRA_IMPRESSAO})
    assert r.status_code == 409
    assert (await _fonte_db(app, criada["id"])).impressao_tls is None


@pytest.mark.parametrize(
    "impressao", ["AB" * 32, "ab" * 31, "ab" * 33, "zz" * 32, "é" * 64, "ab" * 31 + "a٠"]
)
async def test_confiar_impressao_malformada_422(
    cliente_admin: httpx.AsyncClient, falsos: Falsos, impressao: str
) -> None:
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.post(f"{FONTES}/{criada['id']}/confiar", json={"impressao": impressao})
    assert r.status_code == 422


async def test_confiar_vale_uma_vez(cliente_admin: httpx.AsyncClient, falsos: Falsos) -> None:
    falsos.coletor.teste = CertificadoNaoConfiado(IMPRESSAO)
    criada = await criar_fonte(cliente_admin)
    await cliente_admin.post(f"{FONTES}/{criada['id']}/testar")
    url = f"{FONTES}/{criada['id']}/confiar"
    assert (await cliente_admin.post(url, json={"impressao": IMPRESSAO})).status_code == 200
    # a edição do host apaga a confiança; a impressão mostrada antes não serve mais
    await cliente_admin.patch(f"{FONTES}/{criada['id']}", json={"host": "10.99.0.9"})
    assert (await cliente_admin.post(url, json={"impressao": IMPRESSAO})).status_code == 409


async def test_coletar_agora(
    app: FastAPI, cliente_admin: httpx.AsyncClient, falsos: Falsos
) -> None:
    criada = await criar_fonte(cliente_admin)
    r = await cliente_admin.post(f"{FONTES}/{criada['id']}/coletar")
    assert r.status_code == 200, r.text
    assert falsos.coletor.coletas == 1
    assert r.json()["ultima_coleta"] is not None and r.json()["ultimo_erro"] is None
    assert (await auditorias(app))[-1].acao == "fonte.coletar"


async def test_coletar_agora_429_dentro_de_30s(
    cliente_admin: httpx.AsyncClient, falsos: Falsos, relogio: RelogioFalso
) -> None:
    criada = await criar_fonte(cliente_admin)
    url = f"{FONTES}/{criada['id']}/coletar"
    assert (await cliente_admin.post(url)).status_code == 200
    r = await cliente_admin.post(url)
    assert r.status_code == 429
    await relogio.avancar(31)
    assert (await cliente_admin.post(url)).status_code == 200
    assert falsos.coletor.coletas == 2


async def test_coletar_inexistente_404(cliente_admin: httpx.AsyncClient, falsos: Falsos) -> None:
    assert (await cliente_admin.post(f"{FONTES}/{ID}/coletar")).status_code == 404
    assert (await cliente_admin.post(f"{FONTES}/{ID}/testar")).status_code == 404


async def test_limite_de_taxa_10_por_minuto_por_usuario(
    cliente_admin: httpx.AsyncClient, falsos: Falsos, relogio: RelogioFalso
) -> None:
    criada = await criar_fonte(cliente_admin)
    url = f"{FONTES}/{criada['id']}/testar"
    for _ in range(10):
        assert (await cliente_admin.post(url)).status_code == 200
    r = await cliente_admin.post(url)
    assert r.status_code == 429 and "Retry-After" in r.headers
    await relogio.avancar(61)
    assert (await cliente_admin.post(url)).status_code == 200


async def test_auditoria_sem_segredo(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await subrede(cliente_admin)
    criada = await criar_fonte(cliente_admin)
    await cliente_admin.patch(
        f"{FONTES}/{criada['id']}", json={"credencial": {"usuario": "u", "senha": "segredo-2"}}
    )
    await cliente_admin.delete(f"{FONTES}/{criada['id']}")
    linhas = await auditorias(app)
    assert [a.acao for a in linhas][-3:] == ["fonte.criar", "fonte.editar", "fonte.remover"]
    texto = repr([(a.antes, a.depois, a.alvo) for a in linhas])
    assert SENHA not in texto and "segredo-2" not in texto
    editar = linhas[-2]
    assert editar.depois is not None and editar.depois["credencial_alterada"] is True


async def test_credencial_nunca_sai(cliente_admin: httpx.AsyncClient, falsos: Falsos) -> None:
    criada = await criar_fonte(cliente_admin)
    url = f"{FONTES}/{criada['id']}"
    respostas = [
        await cliente_admin.get(FONTES),
        await cliente_admin.patch(url, json={"credencial": {"usuario": "u", "senha": SENHA}}),
        await cliente_admin.post(f"{url}/testar"),
        await cliente_admin.post(f"{url}/coletar"),
    ]
    for r in respostas:
        assert r.status_code == 200, r.text
        assert SENHA not in r.text and "leitor" not in r.text and "credencial_cifrada" not in r.text
