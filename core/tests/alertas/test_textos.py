"""Textos do painel: formas fixas, nome hostil devolvido como texto puro."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sentinela.alertas.textos import (
    TEXTO_TESTE,
    DadosAlerta,
    texto_painel,
    texto_resumo,
    texto_telegram,
)

T0 = datetime(2026, 11, 18, 17, 0, tzinfo=UTC)


def _d(**kw: object) -> DadosAlerta:
    base: dict[str, object] = {
        "tipo": "queda",
        "nome": "Switch Bloco B",
        "ip": "10.99.0.2",
        "classe": "switch",
        "quedas": 1,
        "afetados": 0,
        "aberto_em": T0,
        "fechado_em": None,
        "breve": False,
        "fonte": None,
        "voltou": False,
    }
    return DadosAlerta(**(base | kw))  # type: ignore[arg-type]


def test_queda_com_afetados() -> None:
    assert texto_painel(_d(afetados=14)) == "Switch Bloco B caiu · 14 afetados"
    assert texto_painel(_d(afetados=1)) == "Switch Bloco B caiu · 1 afetado"


def test_queda_simples() -> None:
    assert texto_painel(_d()) == "Switch Bloco B caiu"


def test_grupo_de_quedas() -> None:
    assert texto_painel(_d(quedas=5, afetados=4)) == "5 equipamentos caíram"


def test_caiu_e_voltou() -> None:
    d = _d(nome="NVR Garagem", breve=True, fechado_em=T0 + timedelta(seconds=100))
    assert texto_painel(d) == "NVR Garagem caiu e voltou (1 min 40 s)"


def test_grupo_caiu_e_voltou() -> None:
    d = _d(quedas=3, breve=True, fechado_em=T0 + timedelta(seconds=40))
    assert texto_painel(d) == "3 equipamentos caíram e voltaram (40 s)"


def test_instavel() -> None:
    assert texto_painel(_d(tipo="instavel", nome="Câmera Portaria")) == "Câmera Portaria instável"


def test_volta_com_duracao_da_origem() -> None:
    d = _d(tipo="volta", fechado_em=T0 + timedelta(minutes=18))
    assert texto_painel(d) == "Switch Bloco B voltou (fora por 18 min)"


def test_volta_sem_origem_nao_inventa_duracao() -> None:
    assert texto_painel(_d(tipo="volta")) == "Switch Bloco B voltou"


def test_fonte_sem_coleta() -> None:
    d = _d(tipo="fonte_falhou", nome="MikroTik", fonte="MikroTik", quedas=0)
    assert texto_painel(d) == "Fonte MikroTik sem coleta"


def test_nome_hostil_sai_como_texto_sem_truncar() -> None:
    nome = "<b>" + "x" * 300
    assert texto_painel(_d(nome=nome, afetados=2)) == f"{nome} caiu · 2 afetados"
    assert texto_painel(_d(tipo="instavel", nome=nome)) == f"{nome} instável"


# ---- Telegram: horário no fuso, emoji por tipo, IP só com a chave ligada -------------------

SP = ZoneInfo("America/Sao_Paulo")
T_1432 = datetime(2026, 11, 18, 17, 32, tzinfo=UTC)  # 14:32 em São Paulo


def test_texto_queda_correlacionada() -> None:
    d = _d(aberto_em=T_1432, afetados=14)
    assert (
        texto_telegram(d, SP, False) == "🔴 Switch Bloco B caiu às 14:32 — 14 equipamentos afetados"
    )


def test_texto_queda_um_afetado_e_sem_afetados() -> None:
    assert texto_telegram(_d(aberto_em=T_1432, afetados=1), SP, False) == (
        "🔴 Switch Bloco B caiu às 14:32 — 1 equipamento afetado"
    )
    assert texto_telegram(_d(aberto_em=T_1432), SP, False) == "🔴 Switch Bloco B caiu às 14:32"


def test_texto_caiu_e_voltou() -> None:
    d = _d(nome="NVR Garagem", breve=True, fechado_em=T0 + timedelta(seconds=100))
    assert texto_telegram(d, SP, False) == "🟡 NVR Garagem caiu e voltou (1 min 40 s)"


def test_texto_grupo_caiu_e_voltou() -> None:
    d = _d(quedas=3, breve=True, fechado_em=T0 + timedelta(seconds=40))
    assert texto_telegram(d, SP, False) == "🟡 3 equipamentos caíram e voltaram (40 s)"


def test_texto_volta() -> None:
    d = _d(tipo="volta", aberto_em=T_1432, fechado_em=T_1432 + timedelta(minutes=18))
    assert texto_telegram(d, SP, False) == "🟢 Switch Bloco B voltou às 14:50 (fora por 18 min)"


def test_texto_volta_sem_origem_usa_o_instante_da_volta() -> None:
    d = _d(tipo="volta", aberto_em=T_1432 + timedelta(minutes=18))
    assert texto_telegram(d, SP, False) == "🟢 Switch Bloco B voltou às 14:50"


def test_texto_grupo() -> None:
    d = _d(aberto_em=T_1432, quedas=5, afetados=4)
    assert texto_telegram(d, SP, False) == "🔴 5 equipamentos caíram às 14:32"


def test_texto_instavel() -> None:
    d = _d(
        tipo="instavel", nome="Câmera Portaria", aberto_em=datetime(2026, 11, 18, 17, 5, tzinfo=UTC)
    )
    assert texto_telegram(d, SP, False) == "🟠 Câmera Portaria instável desde 14:05"


def test_texto_fonte() -> None:
    d = _d(
        tipo="fonte_falhou",
        nome="MikroTik",
        fonte="MikroTik",
        ip=None,
        quedas=0,
        aberto_em=datetime(2026, 11, 18, 17, 0, tzinfo=UTC),
    )
    assert texto_telegram(d, SP, False) == "⚠️ Fonte MikroTik sem coleta desde 14:00"


def test_texto_incluir_ip() -> None:
    d = _d(aberto_em=T_1432, afetados=14, ip="10.99.40.10")
    assert texto_telegram(d, SP, True) == (
        "🔴 Switch Bloco B (10.99.40.10) caiu às 14:32 — 14 equipamentos afetados"
    )
    breve = _d(
        nome="NVR Garagem", ip="10.99.40.10", breve=True, fechado_em=T0 + timedelta(seconds=100)
    )
    assert (
        texto_telegram(breve, SP, True) == "🟡 NVR Garagem (10.99.40.10) caiu e voltou (1 min 40 s)"
    )


def test_texto_sem_ip_por_padrao() -> None:
    d = _d(aberto_em=T_1432, ip="10.99.40.10")
    assert "10.99.40.10" not in texto_telegram(d, SP, False)


def test_texto_resumo_e_teste() -> None:
    assert texto_resumo(12) == "… e mais 12 alertas, veja no painel"
    assert texto_resumo(1) == "… e mais 1 alerta, veja no painel"
    assert TEXTO_TESTE == "✅ Teste do Sentinela: as mensagens estão chegando."


def test_queda_fechada_nao_breve_diz_que_voltou() -> None:
    d = _d(afetados=3, voltou=True, fechado_em=T0 + timedelta(seconds=600))
    assert texto_painel(d) == "Switch Bloco B caiu e voltou (fora por 10 min) · 3 afetados"
    assert (
        texto_telegram(d, SP, False)
        == "🔴 Switch Bloco B caiu às 14:00 e voltou às 14:10 (fora por 10 min)"
        " — 3 equipamentos afetados"
    )
    simples = _d(voltou=True, fechado_em=T0 + timedelta(seconds=600))
    assert texto_telegram(simples, SP, False) == (
        "🔴 Switch Bloco B caiu às 14:00 e voltou às 14:10 (fora por 10 min)"
    )


def test_queda_fechada_sem_volta_segue_caiu() -> None:
    d = _d(fechado_em=T0 + timedelta(seconds=600))  # pausa/remoção: ninguém voltou
    assert texto_painel(d) == "Switch Bloco B caiu"
    assert texto_telegram(d, SP, False) == "🔴 Switch Bloco B caiu às 14:00"
