"""Textos do painel: formas fixas, nome hostil devolvido como texto puro."""

from datetime import UTC, datetime, timedelta

from sentinela.alertas.textos import DadosAlerta, texto_painel

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
