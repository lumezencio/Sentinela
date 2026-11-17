"""API de sub-redes, classes e equipamentos (Task 9)."""

from typing import Any

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from sentinela.config import Settings
from sentinela.db.modelos import Auditoria, Equipamento, Evento
from sentinela.monitor.agendador import Agendador
from sentinela.monitor.estados import Estado

SUBREDES = "/api/v1/subredes"
CLASSES = "/api/v1/classes"
EQUIP = "/api/v1/equipamentos"
ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000"
ID_LONGO = "x" * 80


def _agendador(app: FastAPI) -> Agendador:
    a: Agendador = app.state.agendador
    return a


def _sessoes(app: FastAPI) -> async_sessionmaker[AsyncSession]:
    s: async_sessionmaker[AsyncSession] = app.state.sessoes
    return s


async def _subrede(c: httpx.AsyncClient, cidr: str = "10.99.0.0/24") -> dict[str, Any]:
    r = await c.post(SUBREDES, json={"cidr": cidr})
    assert r.status_code == 201, r.text
    dados: dict[str, Any] = r.json()
    return dados


async def _equip(c: httpx.AsyncClient, **campos: Any) -> httpx.Response:
    corpo = {"nome": "Câmera portaria", "ip": "10.99.0.10", "classe": "camera"} | campos
    return await c.post(EQUIP, json=corpo)


async def _auditorias(app: FastAPI) -> list[Auditoria]:
    async with _sessoes(app)() as db:
        return list((await db.execute(select(Auditoria).order_by(Auditoria.id))).scalars())


# ---- lifespan (R4) --------------------------------------------------------------------------


async def test_lifespan_monta_monitor_sem_iniciar(app: FastAPI, cliente: httpx.AsyncClient) -> None:
    for nome in ("guarda", "barramento", "limitador", "agendador"):
        assert getattr(app.state, nome) is not None
    assert app.state.limitador.taxa == 20
    assert _agendador(app).tempo_max_deteccao_s() == 0.0


async def test_lifespan_carrega_equipamentos_existentes(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await _subrede(cliente_admin)
    r = await _equip(cliente_admin)
    eid = r.json()["id"]
    pausado = (await _equip(cliente_admin, ip="10.99.0.11", nome="b")).json()["id"]
    await cliente_admin.post(f"{EQUIP}/{pausado}/pausar")
    antigo = _agendador(app)
    # um segundo lifespan sobre o mesmo banco reconstrói o monitor a partir das linhas
    async with app.router.lifespan_context(app):
        assert _agendador(app) is not antigo
        assert _agendador(app).estado_de(eid) is Estado.DESCONHECIDO
        assert _agendador(app).estado_de(pausado) is Estado.PAUSADO
        assert app.state.guarda.validar("10.99.0.7", None, "icmp")


async def test_lifespan_registra_camera_de_gravador_sem_checar(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    from datetime import UTC, datetime

    from sentinela.db.modelos import Classe

    await _subrede(cliente_admin)
    nvr = (await _equip(cliente_admin, nome="Gravador", ip="10.99.0.20")).json()["id"]
    agora = datetime(2026, 1, 1, tzinfo=UTC)
    async with _sessoes(app)() as db:
        camera = await db.scalar(select(Classe.id).where(Classe.slug == "camera"))
        assert camera is not None
        # IP interno do gravador, fora das sub-redes declaradas: nenhum socket vai até ele
        cam = Equipamento(
            nome="Canal 1",
            ip="192.168.254.11",
            classe_id=camera,
            checagem="gravador",
            estado="online",
            estado_desde=agora,
            criado_em=agora,
            pai_id=nvr,
            canal=1,
        )
        db.add(cam)
        await db.commit()
        cam_id = cam.id
    async with app.router.lifespan_context(app):
        agendador = _agendador(app)
        assert agendador.estado_de(cam_id) is Estado.ONLINE  # registrado, não recusado
        assert agendador.estado_de(nvr) is Estado.DESCONHECIDO
        assert cam_id not in agendador._vigente  # nunca agendado
        assert nvr in agendador._vigente


async def test_lifespan_repassa_latencia_instavel_ao_agendador(settings: Settings) -> None:
    from sentinela.main import criar_app
    from tests.conftest import criar_esquema

    app = criar_app(
        settings.model_copy(update={"latencia_instavel_ms": 50.0}), iniciar_monitor=False
    )
    await criar_esquema(settings.banco_url)
    async with app.router.lifespan_context(app):
        # o comportamento (100 ms vira instável com limite 50) está em test_agendador
        assert _agendador(app)._latencia_instavel_ms == 50.0


# ---- sub-redes ------------------------------------------------------------------------------


async def test_subredes_crud(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    criada = await _subrede(cliente_admin, "10.99.0.0/24")
    assert criada["cidr"] == "10.99.0.0/24"
    assert (await cliente_admin.get(SUBREDES)).json() == [criada]
    assert app.state.guarda.validar("10.99.0.7", None, "icmp")
    r = await cliente_admin.delete(f"{SUBREDES}/{criada['id']}")
    assert r.status_code == 204
    assert (await cliente_admin.get(SUBREDES)).json() == []
    acoes = [a.acao for a in await _auditorias(app)]
    assert acoes == ["subrede.criar", "subrede.remover"]


@pytest.mark.parametrize("cidr", ["8.8.8.0/24", "10.0.0.0/8", "10.99.0.1/24", "lixo"])
async def test_subrede_invalida_422(cliente_admin: httpx.AsyncClient, cidr: str) -> None:
    r = await cliente_admin.post(SUBREDES, json={"cidr": cidr})
    assert r.status_code == 422
    assert isinstance(r.json()["detail"], str)
    assert cidr not in r.text


async def test_subrede_publica_motivo_especifico(cliente_admin: httpx.AsyncClient) -> None:
    r = await cliente_admin.post(SUBREDES, json={"cidr": "8.8.8.0/24"})
    assert r.json() == {"detail": "A sub-rede deve ser privada (RFC 1918)."}


async def test_subrede_duplicada_409(cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    assert (await cliente_admin.post(SUBREDES, json={"cidr": "10.99.0.0/24"})).status_code == 409


async def test_subrede_inexistente_404(cliente_admin: httpx.AsyncClient) -> None:
    assert (await cliente_admin.delete(f"{SUBREDES}/999")).status_code == 404


async def test_subredes_so_admin(cliente_visualizador: httpx.AsyncClient) -> None:
    assert (await cliente_visualizador.get(SUBREDES)).status_code == 403
    r = await cliente_visualizador.post(SUBREDES, json={"cidr": "10.99.0.0/24"})
    assert r.status_code == 403


async def test_remover_subrede_pausa_equipamentos_dela(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    a = await _subrede(cliente_admin, "10.99.0.0/24")
    await _subrede(cliente_admin, "10.99.1.0/24")
    fora = (await _equip(cliente_admin, ip="10.99.0.10")).json()["id"]
    dentro = (await _equip(cliente_admin, ip="10.99.1.10", nome="outro")).json()["id"]

    assert (await cliente_admin.delete(f"{SUBREDES}/{a['id']}")).status_code == 204

    assert _agendador(app).estado_de(fora) is Estado.PAUSADO
    assert _agendador(app).estado_de(dentro) is Estado.DESCONHECIDO
    corpo = (await cliente_admin.get(f"{EQUIP}/{fora}")).json()
    assert corpo["pausado"] is True and corpo["estado"] == "pausado"
    assert (await cliente_admin.get(f"{EQUIP}/{dentro}")).json()["pausado"] is False
    eventos = (await cliente_admin.get(f"{EQUIP}/{fora}/eventos")).json()
    assert eventos[0]["para"] == "pausado"
    assert eventos[0]["causa"] == "fora_das_subredes"
    # não é apagado e não pode ser retomado enquanto estiver fora
    r = await cliente_admin.post(f"{EQUIP}/{fora}/retomar")
    assert r.status_code == 422
    assert r.json() == {"detail": "Destino fora das sub-redes declaradas."}


async def test_readicionar_subrede_permite_retomar(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    s = await _subrede(cliente_admin, "10.99.0.0/24")
    eid = (await _equip(cliente_admin)).json()["id"]
    await cliente_admin.delete(f"{SUBREDES}/{s['id']}")
    await _subrede(cliente_admin, "10.99.0.0/24")
    assert (await cliente_admin.post(f"{EQUIP}/{eid}/retomar")).status_code == 200
    assert _agendador(app).estado_de(eid) is Estado.DESCONHECIDO


async def test_recusado_na_carga_entra_no_agendador_ao_adicionar_subrede(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    s = await _subrede(cliente_admin, "10.99.0.0/24")
    eid = (await _equip(cliente_admin)).json()["id"]
    await cliente_admin.delete(f"{SUBREDES}/{s['id']}")
    async with app.router.lifespan_context(app):
        assert _agendador(app).estado_de(eid) is None  # fora de toda sub-rede: recusado
        await _subrede(cliente_admin, "10.99.0.0/24")
        # pausado só por estar fora: volta sozinho quando a sub-rede volta
        assert _agendador(app).estado_de(eid) is Estado.DESCONHECIDO
        r = await cliente_admin.get(f"{EQUIP}/{eid}")
        assert r.json()["pausado"] is False and r.json()["estado"] == "desconhecido"


async def test_readicionar_subrede_retoma_so_os_pausados_por_ela(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    s = await _subrede(cliente_admin, "10.99.0.0/24")
    auto = (await _equip(cliente_admin)).json()["id"]
    manual = (await _equip(cliente_admin, ip="10.99.0.11", nome="manual")).json()["id"]
    assert (await cliente_admin.post(f"{EQUIP}/{manual}/pausar")).status_code == 200
    await cliente_admin.delete(f"{SUBREDES}/{s['id']}")
    assert _agendador(app).estado_de(auto) is Estado.PAUSADO

    await _subrede(cliente_admin, "10.99.0.0/24")

    assert _agendador(app).estado_de(auto) is Estado.DESCONHECIDO
    corpo = (await cliente_admin.get(f"{EQUIP}/{auto}")).json()
    assert (corpo["pausado"], corpo["estado"]) == (False, "desconhecido")
    eventos = (await cliente_admin.get(f"{EQUIP}/{auto}/eventos")).json()
    assert (eventos[0]["de"], eventos[0]["para"]) == ("pausado", "desconhecido")
    assert eventos[0]["causa"] == "dentro_das_subredes"
    # pausado à mão continua pausado
    assert _agendador(app).estado_de(manual) is Estado.PAUSADO
    assert (await cliente_admin.get(f"{EQUIP}/{manual}")).json()["pausado"] is True


async def test_recusado_na_carga_fica_pausado_fora_das_subredes(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    """Fora das sub-redes na carga (ex.: linha editada à mão): pausado, nunca "aguardando"."""
    await _subrede(cliente_admin, "10.99.0.0/24")
    eid = (await _equip(cliente_admin)).json()["id"]
    async with _sessoes(app)() as db:
        eq = await db.get(Equipamento, eid)
        assert eq is not None
        eq.ip = "10.99.5.10"  # fora da sub-rede declarada, sem passar pela API
        await db.commit()
    async with app.router.lifespan_context(app):
        assert _agendador(app).estado_de(eid) is None
        corpo = (await cliente_admin.get(f"{EQUIP}/{eid}")).json()
        assert (corpo["pausado"], corpo["estado"]) == (True, "pausado")
        eventos = (await cliente_admin.get(f"{EQUIP}/{eid}/eventos")).json()
        assert eventos[0]["causa"] == "fora_das_subredes"


async def test_criar_recusado_pelo_agendador_fica_pausado(
    app: FastAPI, cliente_admin: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Corrida: a rota validou, mas a Guarda mudou antes de o agendador registrar."""
    await _subrede(cliente_admin, "10.99.0.0/24")
    agendador = _agendador(app)
    original = agendador.adicionar_lote

    def adicionar_com_guarda_vazia(alvos: Any) -> None:
        app.state.guarda.atualizar([])
        original(alvos)

    monkeypatch.setattr(agendador, "adicionar_lote", adicionar_com_guarda_vazia)
    r = await _equip(cliente_admin)
    assert r.status_code == 201
    assert (r.json()["pausado"], r.json()["estado"]) == (True, "pausado")
    async with _sessoes(app)() as db:
        ev = (await db.execute(select(Evento))).scalars().one()
        assert (ev.para, ev.causa) == ("pausado", "fora_das_subredes")


# ---- classes --------------------------------------------------------------------------------


async def test_classes_lista_para_visualizador(cliente_visualizador: httpx.AsyncClient) -> None:
    r = await cliente_visualizador.get(CLASSES)
    assert r.status_code == 200
    slugs = [c["slug"] for c in r.json()]
    assert slugs[0] == "sentinela" and "camera" in slugs
    camera = next(c for c in r.json() if c["slug"] == "camera")
    assert camera["intervalo_s"] == 15 and camera["critica"] is True


async def test_patch_classe_atualiza_intervalos_no_agendador(
    app: FastAPI, cliente_admin: httpx.AsyncClient
) -> None:
    await _subrede(cliente_admin)
    eid = (await _equip(cliente_admin, classe="impressora")).json()["id"]
    assert _agendador(app).intervalo_efetivo(eid) == 60.0
    r = await cliente_admin.patch(
        f"{CLASSES}/impressora", json={"intervalo_s": 300, "cor": "#AABBCC", "nome": "Printers"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["intervalo_s"] == 300 and r.json()["cor"] == "#AABBCC"
    assert _agendador(app).intervalo_efetivo(eid) == 300.0
    aud = (await _auditorias(app))[-1]
    assert aud.acao == "classe.editar" and aud.alvo == "impressora"
    assert aud.antes is not None and aud.antes["intervalo_s"] == 60
    assert aud.depois is not None and aud.depois["intervalo_s"] == 300


@pytest.mark.parametrize(
    "corpo",
    [{"intervalo_s": 4}, {"intervalo_s": 3601}, {"cor": "vermelho"}, {"nome": ""}, {"x": 1}],
)
async def test_patch_classe_invalido_422(
    cliente_admin: httpx.AsyncClient, corpo: dict[str, Any]
) -> None:
    assert (await cliente_admin.patch(f"{CLASSES}/camera", json=corpo)).status_code == 422


async def test_patch_classe_inexistente_404_e_visualizador_403(
    cliente_admin: httpx.AsyncClient,
) -> None:
    r = await cliente_admin.patch(f"{CLASSES}/nao-existe", json={"intervalo_s": 30})
    assert r.status_code == 404


async def test_patch_classe_visualizador_403(cliente_visualizador: httpx.AsyncClient) -> None:
    r = await cliente_visualizador.patch(f"{CLASSES}/camera", json={"intervalo_s": 30})
    assert r.status_code == 403


# ---- equipamentos ---------------------------------------------------------------------------


async def test_crud_feliz(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    r = await _equip(cliente_admin, mac="02-00-00-AA-BB-01")
    assert r.status_code == 201, r.text
    eq = r.json()
    eid = eq["id"]
    assert len(eid) == 36
    assert eq["mac"] == "02:00:00:aa:bb:01"
    assert eq["classe"] == "camera" and eq["checagem"] == "icmp" and eq["porta"] is None
    assert eq["estado"] == "desconhecido" and eq["pausado"] is False
    assert _agendador(app).estado_de(eid) is Estado.DESCONHECIDO
    assert _agendador(app).intervalo_efetivo(eid) == 15.0

    assert (await cliente_admin.get(f"{EQUIP}/{eid}")).json() == eq

    r = await cliente_admin.patch(
        f"{EQUIP}/{eid}", json={"nome": "Câmera garagem", "classe": "computador", "mac": None}
    )
    assert r.status_code == 200, r.text
    assert r.json()["nome"] == "Câmera garagem" and r.json()["mac"] is None
    assert _agendador(app).intervalo_efetivo(eid) == 60.0

    assert (await cliente_admin.post(f"{EQUIP}/{eid}/pausar")).json()["pausado"] is True
    assert _agendador(app).estado_de(eid) is Estado.PAUSADO
    corpo = (await cliente_admin.post(f"{EQUIP}/{eid}/retomar")).json()
    assert corpo["pausado"] is False and corpo["estado"] == "desconhecido"

    eventos = (await cliente_admin.get(f"{EQUIP}/{eid}/eventos?limit=10")).json()
    assert [e["para"] for e in eventos] == ["desconhecido", "pausado"]

    assert (await cliente_admin.delete(f"{EQUIP}/{eid}")).status_code == 204
    assert (await cliente_admin.get(f"{EQUIP}/{eid}")).status_code == 404
    assert _agendador(app).estado_de(eid) is None

    auds = await _auditorias(app)
    acoes = [a.acao for a in auds]
    assert acoes == [
        "subrede.criar",
        "equipamento.criar",
        "equipamento.editar",
        "equipamento.pausar",
        "equipamento.retomar",
        "equipamento.remover",
    ]
    for a in auds:
        assert a.usuario_id is not None and a.em.tzinfo is not None and a.ip
    editar = auds[2]
    assert editar.alvo == eid
    assert editar.antes is not None and editar.antes["nome"] == "Câmera portaria"
    assert editar.depois is not None and editar.depois["nome"] == "Câmera garagem"


@pytest.mark.parametrize(
    ("acao", "metodo", "sufixo", "corpo"),
    [
        ("get", "GET", "", None),
        ("patch", "PATCH", "", {"nome": "x"}),
        ("delete", "DELETE", "", None),
        ("pausar", "POST", "/pausar", None),
        ("retomar", "POST", "/retomar", None),
        ("eventos", "GET", "/eventos", None),
    ],
)
@pytest.mark.parametrize("eid", [ID_INEXISTENTE, ID_LONGO])
async def test_id_inexistente_404(
    cliente_admin: httpx.AsyncClient, acao: str, metodo: str, sufixo: str, corpo: Any, eid: str
) -> None:
    await _subrede(cliente_admin)
    assert (await _equip(cliente_admin)).status_code == 201  # existe outro equipamento
    r = await cliente_admin.request(metodo, f"{EQUIP}/{eid}{sufixo}", json=corpo)
    assert r.status_code == 404, acao


@pytest.mark.parametrize(
    ("ip", "motivo"),
    [
        ("8.8.8.8", "Destino fora das sub-redes declaradas."),
        ("10.99.0.255", "Endereço de rede ou broadcast de sub-rede não é permitido."),
        ("224.0.0.1", "Multicast não é permitido."),
        ("10.99.5.5", "Destino fora das sub-redes declaradas."),
        ("10.99.0.300", "Endereço IPv4 inválido."),
    ],
)
async def test_ip_recusado_422_com_motivo(
    cliente_admin: httpx.AsyncClient, ip: str, motivo: str
) -> None:
    await _subrede(cliente_admin)
    r = await _equip(cliente_admin, ip=ip)
    assert r.status_code == 422
    assert r.json() == {"detail": motivo}


async def test_tcp_sem_porta_422(cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    r = await _equip(cliente_admin, checagem="tcp")
    assert r.status_code == 422
    assert r.json() == {"detail": "Este protocolo exige uma porta."}


async def test_tcp_com_porta_aparece_na_listagem(cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    r = await _equip(cliente_admin, checagem="tcp", porta=80)
    assert r.status_code == 201, r.text
    lista = (await cliente_admin.get(EQUIP)).json()
    assert lista["total"] == 1
    assert lista["itens"][0]["checagem"] == "tcp"
    assert lista["itens"][0]["porta"] == 80


async def test_patch_valida_destino_com_guarda(cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    eid = (await _equip(cliente_admin)).json()["id"]
    r = await cliente_admin.patch(f"{EQUIP}/{eid}", json={"checagem": "http"})
    assert r.json() == {"detail": "Este protocolo exige uma porta."}
    r = await cliente_admin.patch(f"{EQUIP}/{eid}", json={"checagem": "http", "porta": 8080})
    assert r.status_code == 200
    r = await cliente_admin.patch(f"{EQUIP}/{eid}", json={"ip": "10.99.0.0"})
    assert r.status_code == 422


async def test_ip_e_mac_duplicados_409(cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    assert (await _equip(cliente_admin, mac="02:00:00:00:00:01")).status_code == 201
    assert (await _equip(cliente_admin, nome="b")).status_code == 409
    r = await _equip(cliente_admin, ip="10.99.0.11", mac="02-00-00-00-00-01")
    assert r.status_code == 409


@pytest.mark.parametrize("mac", ["02:00:00:00:00", "zz:00:00:00:00:01", "0200.0000.0001"])
async def test_mac_invalido_422(cliente_admin: httpx.AsyncClient, mac: str) -> None:
    await _subrede(cliente_admin)
    assert (await _equip(cliente_admin, mac=mac)).status_code == 422


@pytest.mark.parametrize(
    "campos",
    [{"nome": ""}, {"nome": "x" * 81}, {"classe": "inexistente"}, {"checagem": "udp"}],
)
async def test_campos_invalidos_422(cliente_admin: httpx.AsyncClient, campos: Any) -> None:
    await _subrede(cliente_admin)
    assert (await _equip(cliente_admin, **campos)).status_code == 422


async def test_listagem_filtros_e_paginacao(cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    for n in range(5):
        classe = "camera" if n % 2 == 0 else "impressora"
        r = await _equip(cliente_admin, nome=f"disp {n}", ip=f"10.99.0.{20 + n}", classe=classe)
        assert r.status_code == 201
    tudo = (await cliente_admin.get(EQUIP)).json()
    assert tudo["total"] == 5
    pagina = (await cliente_admin.get(f"{EQUIP}?limit=2&offset=1")).json()
    assert pagina["total"] == 5 and len(pagina["itens"]) == 2
    cameras = (await cliente_admin.get(f"{EQUIP}?classe=camera")).json()
    assert cameras["total"] == 3
    busca = (await cliente_admin.get(f"{EQUIP}?q=10.99.0.22")).json()
    assert [i["nome"] for i in busca["itens"]] == ["disp 2"]
    assert (await cliente_admin.get(f"{EQUIP}?q=%25")).json()["total"] == 0
    assert (await cliente_admin.get(f"{EQUIP}?estado=desconhecido")).json()["total"] == 5
    assert (await cliente_admin.get(f"{EQUIP}?estado=online")).json()["total"] == 0


@pytest.mark.parametrize("consulta", ["limit=500", "limit=0", "offset=-1", "estado=voando"])
async def test_listagem_parametros_invalidos_422(
    cliente_admin: httpx.AsyncClient, consulta: str
) -> None:
    assert (await cliente_admin.get(f"{EQUIP}?{consulta}")).status_code == 422


async def test_visualizador_le_mas_nao_escreve(
    app: FastAPI, cliente_visualizador: httpx.AsyncClient
) -> None:
    assert (await cliente_visualizador.get(EQUIP)).status_code == 200
    assert (await _equip(cliente_visualizador)).status_code == 403
    async with _sessoes(app)() as db:
        assert (await db.execute(select(Equipamento))).first() is None


async def test_sem_login_401(cliente: httpx.AsyncClient) -> None:
    assert (await cliente.get(EQUIP)).status_code == 401
    assert (await cliente.get(CLASSES)).status_code == 401


async def test_escrita_sem_csrf_403(cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    del cliente_admin.headers["X-CSRF"]
    assert (await _equip(cliente_admin)).status_code == 403


async def test_eventos_limit_validado(cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    eid = (await _equip(cliente_admin)).json()["id"]
    assert (await cliente_admin.get(f"{EQUIP}/{eid}/eventos?limit=101")).status_code == 422


async def test_remover_apaga_eventos(app: FastAPI, cliente_admin: httpx.AsyncClient) -> None:
    await _subrede(cliente_admin)
    eid = (await _equip(cliente_admin)).json()["id"]
    await cliente_admin.post(f"{EQUIP}/{eid}/pausar")
    await cliente_admin.delete(f"{EQUIP}/{eid}")
    async with _sessoes(app)() as db:
        assert (await db.execute(select(Evento))).first() is None
