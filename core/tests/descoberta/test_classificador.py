"""Classificador por pontos: tabela de casos, confiança, limiar e carga das regras."""

from pathlib import Path

import pytest

from sentinela.db.sementes import CLASSES_PADRAO
from sentinela.descoberta.classificador.regras import (
    ErroRegras,
    Fatos,
    carregar_regras,
    classificar,
)


def _f(**kw: object) -> Fatos:
    base: dict[str, object] = {
        "fabricante": None,
        "origens": set(),
        "portas_abertas": set(),
        "titulo_http": None,
        "nome": None,
        "sinais_fonte": {},
    }
    base.update(kw)
    return Fatos(**base)  # type: ignore[arg-type]


CASOS: list[tuple[str, Fatos, str]] = [
    ("hikvision+554", _f(fabricante="Hangzhou Hikvision Digital", portas_abertas={554}), "camera"),
    ("hikvision+canal", _f(fabricante="Hikvision", origens={"gravador_canal"}), "camera"),
    ("dahua+37777", _f(fabricante="Zhejiang Dahua", portas_abertas={37777}), "gravador"),
    ("intelbras+554", _f(fabricante="Intelbras S/A", portas_abertas={554}), "camera"),
    ("idface", _f(titulo_http="iDFace"), "controle_acesso"),
    ("porta 4370", _f(portas_abertas={4370}), "controle_acesso"),
    ("control id", _f(fabricante="Control iD Ind. e Com. Ltda"), "controle_acesso"),
    ("zkteco", _f(fabricante="ZKTeco Co., Ltd.", portas_abertas={4370}), "controle_acesso"),
    ("jetdirect", _f(portas_abertas={9100}), "impressora"),
    ("epson", _f(fabricante="Seiko Epson Corporation", portas_abertas={9100}), "impressora"),
    ("titulo laserjet", _f(titulo_http="HP LaserJet Pro M404"), "impressora"),
    ("winbox", _f(portas_abertas={8291}), "roteador"),
    (
        "vizinho mikrotik",
        _f(origens={"vizinho"}, sinais_fonte={"plataforma": "MikroTik"}),
        "roteador",
    ),
    ("lldp switch", _f(origens={"lldp"}, sinais_fonte={"plataforma": "24-port Switch"}), "switch"),
    ("lldp access point", _f(sinais_fonte={"plataforma": "Wireless Access Point"}), "wifi"),
    ("gravador direto", _f(origens={"gravador"}), "gravador"),
    ("titulo nvr", _f(titulo_http="Web Client NVR"), "gravador"),
    ("rdp", _f(portas_abertas={3389}), "computador"),
    (
        "nome impressora",
        _f(nome="Impressora Recepcao", fabricante="Brother Industries"),
        "impressora",
    ),
    ("wifi sozinho", _f(origens={"wifi"}), "desconhecido"),
    ("nada", _f(), "desconhecido"),
]


@pytest.mark.parametrize(("rotulo", "fatos", "classe"), CASOS, ids=[c[0] for c in CASOS])
def test_tabela_de_casos(rotulo: str, fatos: Fatos, classe: str) -> None:
    assert classificar(fatos).classe == classe


def test_tabela_tem_pelo_menos_15_casos() -> None:
    assert len(CASOS) >= 15


def test_nada_vira_desconhecido_com_confianca_zero() -> None:
    r = classificar(_f())
    assert (r.classe, r.confianca, r.sinais) == ("desconhecido", 0.0, [])


def test_wifi_sozinho_fica_abaixo_do_limiar() -> None:
    r = classificar(_f(origens={"wifi"}))
    assert r.classe == "desconhecido"
    assert r.confianca == 0.0
    assert sum(max(s.pontos.values()) for s in r.sinais) == 15  # só 15 pontos: explica o porquê
    assert r.sinais  # os sinais continuam visíveis


def test_confianca_e_razao_dos_pontos() -> None:
    # Hikvision (camera 30, gravador 20) + 554 (camera 40, gravador 25)
    r = classificar(_f(fabricante="Hikvision", portas_abertas={554}))
    assert r.classe == "camera"
    positivos = sum(p for s in r.sinais for p in s.pontos.values() if p > 0)
    camera = sum(s.pontos.get("camera", 0) for s in r.sinais)
    assert camera == 70
    assert r.confianca == pytest.approx(camera / positivos)
    assert 0.0 < r.confianca < 1.0


def test_limiar_50_absoluto() -> None:
    # 40 pontos para a vencedora, mesmo sendo 100% do total: abaixo de 50 → desconhecido
    abaixo = classificar(_f(fabricante="Seiko Epson Corporation"))
    assert abaixo.classe == "desconhecido"
    assert abaixo.confianca == 0.0
    # 60 pontos: passa porque o limiar é absoluto
    assert classificar(_f(portas_abertas={9100})).classe == "impressora"


def test_resultado_independe_da_ordem() -> None:
    a = classificar(_f(portas_abertas={554, 4370}))
    b = classificar(_f(portas_abertas={4370, 554}))
    assert a == b


def test_sinais_tem_descricao_em_portugues_simples() -> None:
    r = classificar(
        _f(fabricante="Hangzhou Hikvision", portas_abertas={554}, titulo_http="iDFace", nome="x")
    )
    descricoes = {s.descricao for s in r.sinais}
    assert "Fabricante Hangzhou Hikvision" in descricoes
    assert "Porta 554 (vídeo RTSP) aberta" in descricoes
    assert "Título da página: iDFace" in descricoes
    for s in r.sinais:
        assert s.regra
        assert s.descricao and "{" not in s.descricao
        assert s.pontos


def test_descricao_de_valor_da_rede_e_limitada() -> None:
    r = classificar(_f(titulo_http="iDFace " + "x" * 500))
    assert r.sinais
    assert all(len(s.descricao) <= 160 for s in r.sinais)


def test_regras_padrao_so_apontam_para_classes_semeadas() -> None:
    slugs = {c["slug"] for c in CLASSES_PADRAO}
    regras = carregar_regras()
    assert len(regras) >= 20
    assert all(set(r.pontos) <= slugs for r in regras)
    ids = [r.id for r in regras]
    assert len(ids) == len(set(ids))


def _toml(tmp_path: Path, corpo: str) -> Path:
    caminho = tmp_path / "r.toml"
    caminho.write_text(corpo, encoding="utf-8")
    return caminho


def test_regras_toml_invalido_falha_no_carregamento(tmp_path: Path) -> None:
    ruins = {
        "classe-fantasma": "pontos = { geladeira = 10 }\nquando = { porta_aberta = 80 }",
        "sem-quando": "pontos = { camera = 10 }",
        "condicao-desconhecida": 'pontos = { camera = 10 }\nquando = { cor_do_cabo = "azul" }',
        "pontos-zero": "pontos = { camera = 0 }\nquando = { porta_aberta = 80 }",
        "porta-ruim": "pontos = { camera = 10 }\nquando = { porta_aberta = 70000 }",
        "regex-ruim": 'pontos = { camera = 10 }\nquando = { nome_regex = "(" }',
        "origem-ruim": 'pontos = { camera = 10 }\nquando = { origem = "marte" }',
        "sinal-ruim": 'pontos = { camera = 10 }\nquando = { sinal_contem = { chave = "a" } }',
    }
    for rotulo, corpo in ruins.items():
        caminho = _toml(tmp_path, f'[[regra]]\nid = "{rotulo}"\ndescricao = "Teste"\n{corpo}\n')
        with pytest.raises(ErroRegras, match=rotulo):
            carregar_regras(caminho)


def test_toml_malformado_e_id_repetido(tmp_path: Path) -> None:
    with pytest.raises(ErroRegras):
        carregar_regras(_toml(tmp_path, "[[regra]\nid="))
    dupla = (
        '[[regra]]\nid = "a"\ndescricao = "x"\npontos = { camera = 10 }\n'
        "quando = { porta_aberta = 80 }\n"
    )
    with pytest.raises(ErroRegras, match="repetid"):
        carregar_regras(_toml(tmp_path, dupla + dupla))


def test_regex_e_compilado_com_limite(tmp_path: Path) -> None:
    longo = "a" * 201
    corpo = (
        '[[regra]]\nid = "longa"\ndescricao = "x"\npontos = { camera = 10 }\n'
        f'quando = {{ http_titulo_regex = "{longo}" }}\n'
    )
    with pytest.raises(ErroRegras, match="longa"):
        carregar_regras(_toml(tmp_path, corpo))
    ok = corpo.replace(longo, "a" * 200)
    assert len(carregar_regras(_toml(tmp_path, ok))) == 1


def test_regex_so_ve_texto_ja_limitado(tmp_path: Path) -> None:
    corpo = (
        '[[regra]]\nid = "fim"\ndescricao = "x"\npontos = { camera = 60 }\n'
        'quando = { http_titulo_regex = "zzz$" }\n'
    )
    regras = carregar_regras(_toml(tmp_path, corpo))
    # "zzz" só aparece depois do caractere 120: a regra não pode ver
    assert classificar(_f(titulo_http="a" * 130 + "zzz"), regras).classe == "desconhecido"
    assert classificar(_f(titulo_http="a" * 100 + "zzz"), regras).classe == "camera"


def test_condicoes_se_combinam_com_e(tmp_path: Path) -> None:
    corpo = (
        '[[regra]]\nid = "e"\ndescricao = "x"\npontos = { camera = 60 }\n'
        'quando = { porta_aberta = 80, fabricante_contem = ["acme"] }\n'
    )
    regras = carregar_regras(_toml(tmp_path, corpo))
    assert classificar(_f(portas_abertas={80}), regras).classe == "desconhecido"
    assert classificar(_f(fabricante="ACME Ltda"), regras).classe == "desconhecido"
    assert classificar(_f(fabricante="ACME Ltda", portas_abertas={80}), regras).classe == "camera"
