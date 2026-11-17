"""Importação de equipamentos por CSV (Task 9, Review Focus 2)."""

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.db.modelos import Auditoria, Equipamento
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.estados import Estado

IMPORTAR = "/api/v1/equipamentos/importar"
FIXTURE = Path(__file__).parent.parent / "fixtures" / "excel_br.csv"


async def _preparar(c: httpx.AsyncClient) -> None:
    r = await c.post("/api/v1/subredes", json={"cidr": "10.99.0.0/24"})
    assert r.status_code == 201


async def _importar(c: httpx.AsyncClient, dados: bytes, nome: str = "lista.csv") -> httpx.Response:
    return await c.post(IMPORTAR, files={"arquivo": (nome, dados, "text/csv")})


async def _total(app: FastAPI) -> int:
    sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
    async with sessoes() as db:
        return (await db.execute(select(func.count()).select_from(Equipamento))).scalar_one()


def test_fixture_e_cp1252_com_bom() -> None:
    dados = FIXTURE.read_bytes()
    assert dados.startswith(b"\xef\xbb\xbf")
    with pytest.raises(UnicodeDecodeError):
        dados.decode("utf-8-sig")
    texto = dados[3:].decode("cp1252")
    assert "Câmera" in texto and ";" in texto
    assert "10.99." in texto and all(
        not linha or "02:00:00" in linha or "02-00-00" in linha or ";;" in linha
        for linha in texto.splitlines()[1:]
    )


async def test_importa_excel_br(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await _preparar(cliente_admin)
    r = await _importar(cliente_admin, FIXTURE.read_bytes())
    assert r.status_code == 200, r.text
    corpo = r.json()
    assert corpo["importados"] == 5
    assert [e["linha"] for e in corpo["erros"]] == [6, 7, 8]
    assert corpo["total_erros"] == 3
    motivos = [e["motivo"] for e in corpo["erros"]]
    assert "repetido" in motivos[0]
    assert motivos[1] == "Endereço IPv4 inválido."
    assert motivos[2] == "Classe inexistente."
    for m in motivos:
        assert "10.99" not in m and "afeteira" not in m  # nada da entrada ecoado

    lista = (await cliente_admin.get("/api/v1/equipamentos?limit=100")).json()
    assert lista["total"] == 5
    por_ip = {i["ip"]: i for i in lista["itens"]}
    assert por_ip["10.99.0.10"]["nome"] == "Câmera portaria"
    assert por_ip["10.99.0.10"]["classe"] == "camera"
    assert por_ip["10.99.0.10"]["mac"] == "02:00:00:00:00:01"
    assert por_ip["10.99.0.1"]["classe"] == "roteador"
    assert (por_ip["10.99.0.11"]["checagem"], por_ip["10.99.0.11"]["porta"]) == ("tcp", 554)
    assert por_ip["10.99.0.20"]["nome"] == "Impressora recepção"

    agendador: Agendador = app.state.agendador
    for item in lista["itens"]:
        assert agendador.estado_de(item["id"]) is Estado.DESCONHECIDO

    sessoes: async_sessionmaker[AsyncSession] = app.state.sessoes
    async with sessoes() as db:
        aud = (await db.execute(select(Auditoria).order_by(Auditoria.id.desc()))).scalars().first()
    assert aud is not None and aud.acao == "equipamento.importar"
    assert aud.depois == {"importados": 5, "erros": 3}


async def test_reimportar_acusa_duplicados_do_banco(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await _preparar(cliente_admin)
    await _importar(cliente_admin, FIXTURE.read_bytes())
    r = (await _importar(cliente_admin, FIXTURE.read_bytes())).json()
    assert r["importados"] == 0
    assert len(r["erros"]) == 8
    assert await _total(app) == 5


async def test_virgula_utf8_e_padroes(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await _preparar(cliente_admin)
    csv = "Nome,IP,Classe\nCâmera,10.99.0.40,camera\nPC,10.99.0.41,Computadores\n"
    r = await _importar(cliente_admin, csv.encode("utf-8"))
    assert r.json() == {"importados": 2, "erros": [], "total_erros": 0}
    itens = (await cliente_admin.get("/api/v1/equipamentos")).json()["itens"]
    assert {(i["nome"], i["checagem"], i["porta"]) for i in itens} == {
        ("Câmera", "icmp", None),
        ("PC", "icmp", None),
    }


async def test_mac_repetido_no_arquivo_e_mac_invalido(cliente_admin: httpx.AsyncClient) -> None:
    await _preparar(cliente_admin)
    csv = (
        "nome;ip;mac;classe\n"
        "a;10.99.0.50;02:00:00:00:00:09;camera\n"
        "b;10.99.0.51;02-00-00-00-00-09;camera\n"
        "c;10.99.0.52;nao-e-mac;camera\n"
        "d;10.99.0.53;;camera;;\n"
        "e;10.99.0.54;;camera\n"
    )
    r = (await _importar(cliente_admin, csv.encode())).json()
    assert r["importados"] == 3
    assert [e["linha"] for e in r["erros"]] == [3, 4]
    assert r["erros"][1]["motivo"] == "MAC inválido."


async def test_linha_com_checagem_ou_porta_invalida(cliente_admin: httpx.AsyncClient) -> None:
    await _preparar(cliente_admin)
    csv = (
        "nome;ip;classe;checagem;porta\n"
        "a;10.99.0.60;camera;udp;\n"
        "b;10.99.0.61;camera;tcp;\n"
        "c;10.99.0.62;camera;tcp;abc\n"
        ";10.99.0.63;camera;;\n"
        "\n"
        "f;10.99.0.64;camera;TCP;80\n"
    )
    r = (await _importar(cliente_admin, csv.encode())).json()
    assert r["importados"] == 1
    assert [e["linha"] for e in r["erros"]] == [2, 3, 4, 5]
    assert r["erros"][1]["motivo"] == "Este protocolo exige uma porta."


@pytest.mark.parametrize("csv", ["nome;ip\na;10.99.0.1\n", "", "nome;nome;ip;classe\n", "\x00\x01"])
async def test_cabecalho_invalido_422(cliente_admin: httpx.AsyncClient, csv: str) -> None:
    await _preparar(cliente_admin)
    r = await _importar(cliente_admin, csv.encode())
    assert r.status_code == 422
    assert isinstance(r.json()["detail"], str)


async def test_arquivo_maior_que_1mb_413(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await _preparar(cliente_admin)
    linha = b"x" * 99 + b"\n"
    grande = b"nome;ip;classe\n" + linha * 10_500
    r = await _importar(cliente_admin, grande)
    assert r.status_code == 413
    assert await _total(app) == 0


async def test_corpo_declarado_grande_413_antes_de_ler(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await _preparar(cliente_admin)
    r = await _importar(cliente_admin, b"nome;ip;classe;" + b"x" * 1_300_000)
    assert r.status_code == 413
    assert r.json() == {"detail": "Arquivo maior que 1 MB."}


async def test_mais_de_5000_linhas_422(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await _preparar(cliente_admin)
    linhas = "".join(f"d{n};10.99.{n // 250}.{n % 250 + 1};camera\n" for n in range(5001))
    r = await _importar(cliente_admin, ("nome;ip;classe\n" + linhas).encode())
    assert r.status_code == 422
    assert await _total(app) == 0


async def test_erros_limitados_a_200(cliente_admin: httpx.AsyncClient) -> None:
    await _preparar(cliente_admin)
    linhas = "".join(f"d{n};8.8.8.{n % 250};camera\n" for n in range(300))
    r = await _importar(cliente_admin, ("nome;ip;classe\n" + linhas).encode())
    corpo = r.json()
    assert corpo["importados"] == 0
    assert len(corpo["erros"]) == 200
    assert corpo["total_erros"] == 300  # a tela mostra "300 linha(s) com erro (as primeiras 200)"


async def test_visualizador_nao_importa(cliente_visualizador: httpx.AsyncClient) -> None:
    r = await _importar(cliente_visualizador, FIXTURE.read_bytes())
    assert r.status_code == 403


async def test_sem_arquivo_422(cliente_admin: httpx.AsyncClient) -> None:
    r = await cliente_admin.post(IMPORTAR, data={"outro": "x"})
    assert r.status_code == 422
