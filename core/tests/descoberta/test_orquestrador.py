"""Orquestrador: coleta por fonte, falhas isoladas, aprovação, barramento e §9.3."""

import secrets
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from pydantic import SecretStr
from sqlalchemy import func, select

from sentinela.db.modelos import Auditoria, Descoberta, Equipamento, Fonte
from sentinela.descoberta.ajustes import (
    APROVACAO_AUTOMATICA,
    LIMIAR_APROVACAO,
    gravar_ajuste,
)
from sentinela.descoberta.canais import CAUSA_CERTIFICADO_MUDOU, LeitorCanais
from sentinela.descoberta.fontes.base import (
    Achado,
    CertificadoMudou,
    ErroColeta,
    ResultadoTeste,
)
from sentinela.descoberta.orquestrador import (
    MSG_COLETA_INESPERADA,
    MSG_TESTE_INESPERADO,
    AprovacaoRecusada,
    ColetaRecente,
    Orquestrador,
    SondagemRecusada,
    checagem_sugerida,
)
from sentinela.monitor.agendador import Alvo
from sentinela.monitor.estados import Estado
from sentinela.monitor.limitador import Limitador
from sentinela.rede.guarda import Guarda
from sentinela.seguranca.cofre import Cofre
from tests.descoberta.apoio import AGORA, Cena, criar_equipamento, criar_fonte, montar_cena

SENHA = "senha-marcadora-9f3"
M1 = "02:00:00:00:01:01"
M2 = "02:00:00:00:01:02"


class ColetorFalso:
    def __init__(
        self,
        achados: list[Achado] | None = None,
        erro: BaseException | None = None,
        teste: ResultadoTeste | BaseException | None = None,
        canais: dict[int, bool] | None = None,
    ) -> None:
        self.achados = achados or []
        self.erro = erro
        self.teste = teste or ResultadoTeste(ok=True, identidade="NVR-01")
        self.canais = canais
        self.coletas = 0

    async def coletar(self) -> list[Achado]:
        self.coletas += 1
        if self.erro is not None:
            raise self.erro
        return list(self.achados)

    async def testar(self) -> ResultadoTeste:
        if isinstance(self.teste, BaseException):
            raise self.teste
        return self.teste


class ColetorGravadorFalso(ColetorFalso):
    async def status_canais(self) -> dict[int, bool]:
        if self.erro is not None:
            raise self.erro
        return dict(self.canais or {})


@pytest.fixture
def cofre() -> Cofre:
    return Cofre(SecretStr(secrets.token_hex(32)))


@pytest.fixture
async def cena(tmp_path: Path) -> AsyncIterator[Cena]:
    async with montar_cena(tmp_path) as c:
        yield c


def _orquestrador(
    cena: Cena, cofre: Cofre, coletores: dict[str, ColetorFalso], **extra: Any
) -> Orquestrador:
    def fabrica(fonte: Fonte, _c: Cofre, _g: Guarda, _l: Limitador) -> ColetorFalso:
        return coletores[fonte.id]

    return Orquestrador(
        cena.sessoes,
        cena.guarda,
        cena.limitador,
        cena.barramento,
        cena.agendador,
        cofre,
        cena.relogio,
        fabrica,
        agora_parede=lambda: AGORA,
        **extra,
    )


async def _fonte(cena: Cena, cofre: Cofre, tipo: str = "mikrotik", **campos: Any) -> str:
    campos.setdefault("credencial", cofre.cifrar({"usuario": "leitor", "senha": SENHA}))
    async with cena.sessoes() as db:
        f = criar_fonte(tipo, **campos)
        db.add(f)
        await db.commit()
        return f.id


async def _descobertas(cena: Cena) -> list[Descoberta]:
    async with cena.sessoes() as db:
        return list((await db.execute(select(Descoberta).order_by(Descoberta.ip))).scalars())


# ---- coleta ---------------------------------------------------------------------------------


async def test_falha_de_uma_fonte_nao_para_as_outras(cena: Cena, cofre: Cofre) -> None:
    f1 = await _fonte(cena, cofre, host="10.99.1.1")
    f2 = await _fonte(cena, cofre, host="10.99.1.2")
    f3 = await _fonte(cena, cofre, host="10.99.1.3")
    coletores = {
        f1: ColetorFalso(erro=RuntimeError(f"traceback com {SENHA} e texto do aparelho")),
        f2: ColetorFalso(erro=ErroColeta(f"recusado para leitor/{SENHA}")),
        f3: ColetorFalso([Achado("10.99.1.20", M1, "arp", "x")]),
    }
    orq = _orquestrador(cena, cofre, coletores)
    await orq.ciclo()
    async with cena.sessoes() as db:
        fontes = {f.id: f for f in (await db.execute(select(Fonte))).scalars()}
    assert fontes[f1].ultimo_erro == MSG_COLETA_INESPERADA
    erro2 = fontes[f2].ultimo_erro
    assert erro2 is not None and SENHA not in erro2 and "***" in erro2
    assert fontes[f3].ultimo_erro is None and fontes[f3].ultima_coleta == AGORA
    assert fontes[f1].ultima_coleta is None
    assert [d.mac for d in await _descobertas(cena)] == [M1]


async def test_duas_fontes_com_o_mesmo_mac_em_paralelo(cena: Cena, cofre: Cofre) -> None:
    f1 = await _fonte(cena, cofre, host="10.99.1.1")
    f2 = await _fonte(cena, cofre, "snmp", host="10.99.1.2")
    coletores = {
        f1: ColetorFalso([Achado("10.99.1.20", M1, "arp", "a")]),
        f2: ColetorFalso([Achado("10.99.1.20", M1, "snmp_arp", "b")]),
    }
    orq = _orquestrador(cena, cofre, coletores)
    await orq.ciclo()  # as duas coletas terminam juntas
    [d] = await _descobertas(cena)
    assert {o["origem"] for o in d.origens} == {"arp", "snmp_arp"}
    async with cena.sessoes() as db:
        assert all(f.ultimo_erro is None for f in (await db.execute(select(Fonte))).scalars())


async def test_coleta_segue_o_intervalo_da_fonte(cena: Cena, cofre: Cofre) -> None:
    f1 = await _fonte(cena, cofre)
    coletores = {f1: ColetorFalso()}
    orq = _orquestrador(cena, cofre, coletores)
    await orq.ciclo()
    await cena.relogio.avancar(599)
    await orq.ciclo()
    assert coletores[f1].coletas == 1
    await cena.relogio.avancar(1)
    await orq.ciclo()
    assert coletores[f1].coletas == 2


async def test_coletar_agora_limite_30s(cena: Cena, cofre: Cofre) -> None:
    f1 = await _fonte(cena, cofre)
    coletores = {f1: ColetorFalso()}
    orq = _orquestrador(cena, cofre, coletores)
    await orq.coletar_agora(f1)
    await cena.relogio.avancar(29)
    with pytest.raises(ColetaRecente):
        await orq.coletar_agora(f1)
    await cena.relogio.avancar(1)
    await orq.coletar_agora(f1)
    assert coletores[f1].coletas == 2


async def test_publica_mensagens_no_barramento(cena: Cena, cofre: Cofre) -> None:
    f1 = await _fonte(cena, cofre)
    coletores = {f1: ColetorFalso([Achado("10.99.1.20", M1, "dhcp", "x", nome="cam-1")])}
    orq = _orquestrador(cena, cofre, coletores)
    await orq.coletar_agora(f1)
    [d] = await _descobertas(cena)
    assert cena.barramento.do_tipo("descoberta") == [
        {
            "acao": "nova",
            "id": d.id,
            "classe_sugerida": d.classe_sugerida,
            "confianca": d.confianca,
        }
    ]
    assert cena.barramento.do_tipo("pendentes") == [{"total": 1}]
    async with cena.sessoes() as db:
        await orq.aprovar(db, d.id, "camera", None, None)
    removida = cena.barramento.do_tipo("descoberta")[-1]
    assert removida["acao"] == "removida" and removida["id"] == d.id
    assert cena.barramento.do_tipo("pendentes")[-1] == {"total": 0}


async def test_mudanca_de_ip_reagenda_o_equipamento(cena: Cena, cofre: Cofre) -> None:
    async with cena.sessoes() as db:
        eq = await criar_equipamento(db, "PC", "10.99.1.20", mac=M1)
        await db.commit()
    cena.agendador.adicionar(Alvo(eq.id, "10.99.1.20", None, "icmp", 60, False, Estado.ONLINE))
    f1 = await _fonte(cena, cofre)
    orq = _orquestrador(cena, cofre, {f1: ColetorFalso([Achado("10.99.1.21", M1, "arp", "x")])})
    await orq.coletar_agora(f1)
    reg = cena.agendador._registros[eq.id]
    assert reg.destino is not None and str(reg.destino.ip) == "10.99.1.21"
    assert cena.barramento.do_tipo("equipamento") == [
        {"acao": "atualizado", "id": eq.id, "ip": "10.99.1.21"}
    ]


async def test_testar_excecao_inesperada_vira_erro_generico(cena: Cena, cofre: Cofre) -> None:
    f1 = await _fonte(cena, cofre)
    f2 = await _fonte(cena, cofre, host="10.99.1.9")
    coletores = {
        f1: ColetorFalso(teste=KeyError(f"campo {SENHA}")),
        f2: ColetorFalso(teste=ErroColeta(f"senha {SENHA} recusada")),
    }
    orq = _orquestrador(cena, cofre, coletores)
    r1 = await orq.testar(f1)
    assert r1.ok is False and r1.erro == MSG_TESTE_INESPERADO
    r2 = await orq.testar(f2)
    assert r2.ok is False and r2.erro is not None and SENHA not in r2.erro


# ---- certificado do gravador (R7) -------------------------------------------------------------


async def test_certificado_mudou_na_coleta_suspende_leitura_de_canais(
    cena: Cena, cofre: Cofre
) -> None:
    async with cena.sessoes() as db:
        nvr = await criar_equipamento(db, "NVR", "10.99.1.50", classe="gravador")
        cam = await criar_equipamento(
            db, "Cam", "192.168.254.2", classe="camera", checagem="gravador", pai=nvr.id, canal=1
        )
        await db.commit()
    cena.agendador.adicionar(Alvo(cam.id, cam.ip, None, "gravador", 15, True, Estado.ONLINE))
    f1 = await _fonte(cena, cofre, "hikvision", host="10.99.1.50", equipamento=nvr.id, porta=443)
    coletor = ColetorGravadorFalso(erro=CertificadoMudou("ab" * 32), canais={1: True})
    orq = _orquestrador(cena, cofre, {f1: coletor})
    leitor = LeitorCanais(
        cena.sessoes, cena.agendador, orq.gravadores, cena.limitador, cena.relogio
    )
    orq.leitor_canais = leitor
    await orq.ciclo()
    await leitor.ciclo()  # o próprio leitor também esbarra no certificado
    assert leitor.suspensa(f1)
    assert cena.agendador.estado_de(cam.id) is Estado.DESCONHECIDO
    estados = [m for m in cena.barramento.do_tipo("estado") if m["id"] == cam.id]
    assert estados[-1]["causa"] == CAUSA_CERTIFICADO_MUDOU
    async with cena.sessoes() as db:
        fonte = await db.get(Fonte, f1)
        assert fonte is not None and fonte.ultimo_erro == "certificado do aparelho mudou"
        # o admin confia na impressão nova: a fonte muda e a leitura volta
        fonte.impressao_tls = "ab" * 32
        await db.commit()
    coletor.erro = None
    await cena.relogio.avancar(600)
    await orq.ciclo()
    assert not leitor.suspensa(f1)
    await leitor.ciclo()
    assert cena.agendador.estado_de(cam.id) is Estado.ONLINE


# ---- aprovação ------------------------------------------------------------------------------


async def _coletar_um(cena: Cena, cofre: Cofre, *achados: Achado, tipo: str = "mikrotik") -> str:
    f = await _fonte(cena, cofre, tipo, host=f"10.99.1.{len(await _descobertas(cena)) + 100}")
    orq = _orquestrador(cena, cofre, {f: ColetorFalso(list(achados))})
    await orq.coletar_agora(f)
    return f


async def test_aprovar_cria_equipamento_agendado_sem_reiniciar(cena: Cena, cofre: Cofre) -> None:
    orq = _orquestrador(cena, cofre, {})
    await _coletar_um(cena, cofre, Achado("10.99.1.20", M1, "dhcp", "x", nome="cam-portao"))
    [d] = await _descobertas(cena)
    async with cena.sessoes() as db:
        eq = await orq.aprovar(db, d.id, None, None, None)
    assert cena.agendador.estado_de(eq.id) is Estado.DESCONHECIDO
    async with cena.sessoes() as db:
        salvo = await db.get(Equipamento, eq.id)
        assert salvo is not None
        assert (salvo.nome, salvo.ip, salvo.mac, salvo.classe_origem) == (
            "cam-portao",
            "10.99.1.20",
            M1,
            "auto",
        )
        desc = await db.get(Descoberta, d.id)
        assert desc is not None and desc.status == "aprovada" and desc.equipamento_id == eq.id
        [aud] = (await db.execute(select(Auditoria))).scalars()
    assert aud.acao == "descoberta.aprovar_automatica" and aud.alvo == eq.id


async def test_aprovar_com_troca_de_classe_e_usuario(cena: Cena, cofre: Cofre) -> None:
    from sentinela.db.modelos import Usuario

    orq = _orquestrador(cena, cofre, {})
    await _coletar_um(cena, cofre, Achado("10.99.1.20", M1, "dhcp", "x", nome="cam-portao"))
    [d] = await _descobertas(cena)
    async with cena.sessoes() as db:
        admin = Usuario(login="adm", hash_senha="x", papel="admin")
        db.add(admin)
        await db.commit()
        eq = await orq.aprovar(db, d.id, "iot", "Sensor", admin, ip="10.99.9.9")
        assert eq.classe_origem == "manual" and eq.nome == "Sensor"
        [aud] = (await db.execute(select(Auditoria))).scalars()
    assert (aud.usuario_id, aud.acao, aud.ip) == (admin.id, "descoberta.aprovar", "10.99.9.9")
    async with cena.sessoes() as db:
        with pytest.raises(AprovacaoRecusada):  # não está mais pendente
            await orq.aprovar(db, d.id, None, None, None)


async def test_aprovar_fora_das_subredes_recusa(cena: Cena, cofre: Cofre) -> None:
    orq = _orquestrador(cena, cofre, {})
    await _coletar_um(cena, cofre, Achado("172.16.5.5", M1, "arp", "x"))
    [d] = await _descobertas(cena)
    assert d.fora_das_subredes
    async with cena.sessoes() as db:
        with pytest.raises(AprovacaoRecusada, match="fora das sub-redes"):
            await orq.aprovar(db, d.id, "computador", None, None)
        assert await db.scalar(select(func.count()).select_from(Equipamento)) == 0
    [d] = await _descobertas(cena)
    assert d.status == "pendente"


async def test_aprovar_canal_aprova_gravador_junto(cena: Cena, cofre: Cofre) -> None:
    fonte_id = await _fonte(cena, cofre, "hikvision", host="10.99.1.50", porta=443)
    gravador = Achado("10.99.1.50", M2, "gravador", fonte_id, nome="NVR Térreo")
    canal = Achado(
        "192.168.254.3",
        None,
        "gravador_canal",
        fonte_id,
        nome="Câmera Pátio",
        pai_fonte_id=fonte_id,
        canal=3,
    )
    orq = _orquestrador(cena, cofre, {fonte_id: ColetorFalso([gravador, canal])})
    await orq.coletar_agora(fonte_id)
    ds = {d.chave: d for d in await _descobertas(cena)}
    cam_d = ds[f"nvr:{fonte_id}:3"]
    assert cam_d.pai_equipamento_id is None  # o gravador ainda não foi aprovado
    async with cena.sessoes() as db:
        cam = await orq.aprovar(db, cam_d.id, None, None, None)
    async with cena.sessoes() as db:
        nvr_d = await db.get(Descoberta, ds[M2].id)
        assert nvr_d is not None and nvr_d.status == "aprovada"
        nvr = await db.get(Equipamento, nvr_d.equipamento_id)
        assert nvr is not None and nvr.ip == "10.99.1.50" and nvr.checagem == "icmp"
        cam_eq = await db.get(Equipamento, cam.id)
        assert cam_eq is not None
        assert (cam_eq.checagem, cam_eq.pai_id, cam_eq.canal) == ("gravador", nvr.id, 3)
        fonte = await db.get(Fonte, fonte_id)
        assert fonte is not None and fonte.equipamento_id == nvr.id
        auds = (await db.execute(select(Auditoria.alvo))).scalars().all()
    assert set(auds) == {nvr.id, cam.id}
    assert cena.agendador.estado_de(cam.id) is Estado.DESCONHECIDO  # passivo, registrado
    assert cena.agendador.estado_de(nvr.id) is Estado.DESCONHECIDO
    assert cam.id not in cena.agendador._vigente  # nunca checado diretamente


async def test_aprovar_canal_sem_descoberta_do_gravador_cria_pela_fonte(
    cena: Cena, cofre: Cofre
) -> None:
    fonte_id = await _fonte(cena, cofre, "dahua", host="10.99.1.51", porta=80)
    canal = Achado(
        "192.168.254.3", None, "gravador_canal", fonte_id, pai_fonte_id=fonte_id, canal=1
    )
    orq = _orquestrador(cena, cofre, {fonte_id: ColetorFalso([canal])})
    await orq.coletar_agora(fonte_id)
    [d] = await _descobertas(cena)
    async with cena.sessoes() as db:
        cam = await orq.aprovar(db, d.id, None, None, None)
        fonte = await db.get(Fonte, fonte_id)
        assert fonte is not None and fonte.equipamento_id == cam.pai_id
        nvr = await db.get(Equipamento, cam.pai_id)
        assert nvr is not None and nvr.ip == "10.99.1.51" and nvr.nome == fonte.nome


def _ap(ip: str, mac: str) -> Achado:
    return Achado(ip, mac, "vizinho", "x", nome="AP", sinais={"plataforma": "wireless"})


async def test_aprovacao_automatica_acima_do_limiar(cena: Cena, cofre: Cofre) -> None:
    async with cena.sessoes() as db:
        await gravar_ajuste(db, APROVACAO_AUTOMATICA, True)
        await gravar_ajuste(db, LIMIAR_APROVACAO, 0.8)
        await db.commit()
    await _coletar_um(
        cena,
        cofre,
        _ap("10.99.1.20", M1),  # Wi-Fi, confiança 1.0
        Achado("10.99.1.21", M2, "dhcp", "x"),  # sem sinais: desconhecido
        _ap("172.16.0.9", "02:00:00:00:01:03"),  # fora das sub-redes
    )
    ds = {d.ip: d for d in await _descobertas(cena)}
    assert ds["10.99.1.20"].status == "aprovada"
    assert ds["10.99.1.21"].status == "pendente"
    assert ds["172.16.0.9"].status == "pendente"
    async with cena.sessoes() as db:
        eq = await db.scalar(select(Equipamento))
        assert eq is not None and eq.ip == "10.99.1.20" and eq.classe_origem == "auto"
    assert cena.agendador.estado_de(eq.id) is Estado.DESCONHECIDO


async def test_aprovacao_automatica_desligada_por_padrao(cena: Cena, cofre: Cofre) -> None:
    await _coletar_um(cena, cofre, _ap("10.99.1.20", M1))
    [d] = await _descobertas(cena)
    assert d.status == "pendente" and d.confianca >= 0.8


def _desc(**campos: Any) -> Descoberta:
    base: dict[str, Any] = {"chave": "x", "ip": "10.99.1.5", "sinais": {}, "origens": []}
    return Descoberta(**(base | campos))


def test_checagem_sugerida() -> None:
    canal = _desc(chave="nvr:f:1", canal=1, sinais={"portas": [554]})
    assert checagem_sugerida(canal) == ("gravador", None)
    assert checagem_sugerida(_desc(sinais={"portas": [554]})) == ("tcp", 554)
    assert checagem_sugerida(_desc(sinais={"portas": [9100, 80]})) == ("tcp", 80)
    respondeu_icmp = _desc(
        sinais={"portas": [554]}, origens=[{"fonte_id": "varredura", "origem": "varredura"}]
    )
    assert checagem_sugerida(respondeu_icmp) == ("icmp", None)
    assert checagem_sugerida(_desc()) == ("icmp", None)


# ---- teste de fonte de gravador (§9.3) ------------------------------------------------------


async def test_teste_ok_de_gravador_liga_equipamento_pelo_ip_ou_cria_descoberta_do_gravador(
    cena: Cena, cofre: Cofre
) -> None:
    async with cena.sessoes() as db:
        nvr = await criar_equipamento(db, "NVR", "10.99.1.50", classe="gravador")
        await db.commit()
    com_eq = await _fonte(cena, cofre, "hikvision", host="10.99.1.50", porta=443)
    sem_eq = await _fonte(cena, cofre, "dahua", host="10.99.1.51", porta=443)
    falhou = await _fonte(cena, cofre, "dahua", host="10.99.1.52", porta=443)
    coletores = {
        com_eq: ColetorFalso(),
        sem_eq: ColetorFalso(teste=ResultadoTeste(ok=True, identidade="XVR Garagem")),
        falhou: ColetorFalso(teste=ResultadoTeste(ok=False, erro="sem resposta")),
    }
    orq = _orquestrador(cena, cofre, coletores)
    assert (await orq.testar(com_eq)).ok
    await orq.apos_teste(sem_eq, ResultadoTeste(ok=True, identidade="XVR Garagem"))
    await orq.testar(falhou)
    async with cena.sessoes() as db:
        fontes = {f.id: f for f in (await db.execute(select(Fonte))).scalars()}
    assert fontes[com_eq].equipamento_id == nvr.id
    assert fontes[sem_eq].equipamento_id is None
    [d] = await _descobertas(cena)
    assert (d.ip, d.classe_sugerida, d.nome_sugerido, d.status) == (
        "10.99.1.51",
        "gravador",
        "XVR Garagem",
        "pendente",
    )
    # repetir o teste não duplica a descoberta
    await orq.testar(sem_eq)
    assert len(await _descobertas(cena)) == 1


# ---- sondagem pelo admin --------------------------------------------------------------------


async def test_sondar_descoberta_grava_portas_e_reclassifica(cena: Cena, cofre: Cofre) -> None:
    chamadas: list[str] = []

    async def sondar(ip: str, _g: Guarda, _l: Limitador) -> tuple[set[int], str | None]:
        chamadas.append(ip)
        return {9100}, None

    orq = _orquestrador(cena, cofre, {}, sondar=sondar)
    await _coletar_um(
        cena,
        cofre,
        Achado("10.99.1.20", M1, "dhcp", "x"),
        Achado("192.168.254.9", None, "gravador_canal", "f", pai_fonte_id="f", canal=1),
        Achado("172.16.0.9", M2, "dhcp", "x"),
    )
    ds = {d.ip: d for d in await _descobertas(cena)}
    assert chamadas == []  # coleta em sub-rede sem varredura: nada sondado
    d = await orq.sondar_descoberta(ds["10.99.1.20"].id)
    assert chamadas == ["10.99.1.20"]
    assert d.classe_sugerida == "impressora" and d.sinais["portas"] == [9100]
    with pytest.raises(SondagemRecusada):  # câmera de gravador: nunca recebe pacote
        await orq.sondar_descoberta(ds["192.168.254.9"].id)
    with pytest.raises(SondagemRecusada):
        await orq.sondar_descoberta(ds["172.16.0.9"].id)
    assert chamadas == ["10.99.1.20"]
    assert cena.barramento.do_tipo("descoberta")[-1]["acao"] == "atualizada"
