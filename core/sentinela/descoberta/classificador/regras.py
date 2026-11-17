"""Classificador por pontos, puro e auditável.

Cada regra de ``regras.toml`` diz: condições (todas precisam valer) → pontos por classe. O
resultado guarda os ``Sinal`` que somaram pontos, para a tela mostrar *por que* o Sentinela
acha que o aparelho é, por exemplo, uma câmera.

- Vence a classe com mais pontos, desde que tenha **pelo menos 50 pontos absolutos**; senão
  ``desconhecido`` com confiança 0 (os sinais continuam visíveis).
- Confiança = pontos da vencedora ÷ soma dos pontos positivos de todas as classes.
- Expressões regulares: padrão de até 200 caracteres, compilado ao carregar, e aplicado só a
  textos já limitados a 120 caracteres (custo previsível, sem ReDoS por entrada de rede).
"""

import re
import tomllib
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, get_args

from sentinela.db.sementes import CLASSES_PADRAO
from sentinela.descoberta.fontes.base import Achado, Origem
from sentinela.descoberta.texto import limpar

CAMINHO_PADRAO = Path(__file__).with_name("regras.toml")
LIMIAR_PONTOS = 50
CLASSE_DESCONHECIDA = "desconhecido"
LIMITE_REGEX = 200
LIMITE_TEXTO = 120
LIMITE_DESCRICAO = 160

_CLASSES = frozenset(str(c["slug"]) for c in CLASSES_PADRAO)
_ORIGENS = frozenset(get_args(Origem))
_CONDICOES = frozenset(
    {
        "fabricante_contem",
        "porta_aberta",
        "http_titulo_regex",
        "origem",
        "nome_regex",
        "sinal_contem",
    }
)
_CAMPOS_REGRA = frozenset({"id", "descricao", "quando", "pontos"})
_MAX_PONTOS = 100


class ErroRegras(ValueError):
    """Arquivo de regras inválido; a mensagem diz qual regra."""


@dataclass(frozen=True)
class Sinal:
    regra: str
    descricao: str
    pontos: dict[str, int]


@dataclass(frozen=True)
class Classificacao:
    classe: str
    confianca: float
    sinais: list[Sinal] = field(default_factory=list)


@dataclass(frozen=True)
class Fatos:
    fabricante: str | None = None
    origens: set[str] = field(default_factory=set)
    portas_abertas: set[int] = field(default_factory=set)
    titulo_http: str | None = None
    nome: str | None = None
    sinais_fonte: dict[str, str] = field(default_factory=dict)


# cada condição vira uma função: Fatos -> valor que casou (str) ou None
_Condicao = Callable[[Fatos], str | None]


@dataclass(frozen=True)
class Regra:
    id: str
    descricao: str
    pontos: dict[str, int]
    condicoes: tuple[_Condicao, ...]


def _erro(regra: str, motivo: str) -> ErroRegras:
    return ErroRegras(f"regra {regra!r}: {motivo}")


def _lista_de_textos(rid: str, nome: str, valor: Any) -> list[str]:
    itens = [valor] if isinstance(valor, str) else valor
    if (
        not isinstance(itens, list)
        or not itens
        or not all(isinstance(i, str) and i.strip() for i in itens)
    ):
        raise _erro(rid, f"{nome} deve ser texto ou lista de textos não vazios")
    return [i.strip() for i in itens]


def _compilar(rid: str, nome: str, padrao: Any) -> re.Pattern[str]:
    if not isinstance(padrao, str) or not padrao:
        raise _erro(rid, f"{nome} deve ser um texto")
    if len(padrao) > LIMITE_REGEX:
        raise _erro(rid, f"{nome} passa de {LIMITE_REGEX} caracteres")
    try:
        return re.compile(padrao)
    except re.error as e:
        raise _erro(rid, f"{nome} inválido ({e.msg})") from None


def _fabricante_contem(rid: str, valor: Any) -> _Condicao:
    termos = [t.casefold() for t in _lista_de_textos(rid, "fabricante_contem", valor)]

    def checar(f: Fatos) -> str | None:
        if not f.fabricante:
            return None
        texto = f.fabricante[:LIMITE_TEXTO].casefold()
        return f.fabricante if any(t in texto for t in termos) else None

    return checar


def _porta_aberta(rid: str, valor: Any) -> _Condicao:
    itens = [valor] if isinstance(valor, int) and not isinstance(valor, bool) else valor
    if (
        not isinstance(itens, list)
        or not itens
        or not all(
            isinstance(p, int) and not isinstance(p, bool) and 1 <= p <= 65535 for p in itens
        )
    ):
        raise _erro(rid, "porta_aberta deve ser uma porta (1-65535) ou lista de portas")
    portas = frozenset(itens)

    def checar(f: Fatos) -> str | None:
        achadas = sorted(portas & f.portas_abertas)
        return str(achadas[0]) if achadas else None

    return checar


def _regex_em(rid: str, nome: str, padrao: Any, campo: Callable[[Fatos], str | None]) -> _Condicao:
    rx = _compilar(rid, nome, padrao)

    def checar(f: Fatos) -> str | None:
        texto = campo(f)
        if not texto:
            return None
        texto = texto[:LIMITE_TEXTO]
        return texto if rx.search(texto) else None

    return checar


def _origem(rid: str, valor: Any) -> _Condicao:
    origens = _lista_de_textos(rid, "origem", valor)
    desconhecidas = [o for o in origens if o not in _ORIGENS]
    if desconhecidas:
        raise _erro(rid, f"origem desconhecida: {desconhecidas[0]!r}")
    conjunto = frozenset(origens)

    def checar(f: Fatos) -> str | None:
        achadas = sorted(conjunto & f.origens)
        return achadas[0] if achadas else None

    return checar


def _sinal_contem(rid: str, valor: Any) -> _Condicao:
    if not isinstance(valor, dict) or set(valor) != {"chave", "valores"}:
        raise _erro(rid, "sinal_contem precisa de { chave = ..., valores = [...] }")
    chave = valor["chave"]
    if not isinstance(chave, str) or not chave:
        raise _erro(rid, "sinal_contem.chave deve ser um texto")
    termos = [t.casefold() for t in _lista_de_textos(rid, "sinal_contem.valores", valor["valores"])]

    def checar(f: Fatos) -> str | None:
        atual = f.sinais_fonte.get(chave)
        if not atual:
            return None
        texto = atual[:LIMITE_TEXTO].casefold()
        return atual if any(t in texto for t in termos) else None

    return checar


def _condicao(rid: str, nome: str, valor: Any) -> _Condicao:
    if nome == "fabricante_contem":
        return _fabricante_contem(rid, valor)
    if nome == "porta_aberta":
        return _porta_aberta(rid, valor)
    if nome == "http_titulo_regex":
        return _regex_em(rid, nome, valor, lambda f: f.titulo_http)
    if nome == "nome_regex":
        return _regex_em(rid, nome, valor, lambda f: f.nome)
    if nome == "origem":
        return _origem(rid, valor)
    return _sinal_contem(rid, valor)


def _regra(bruta: Any, indice: int) -> Regra:
    if not isinstance(bruta, dict):
        raise ErroRegras(f"regra #{indice}: deve ser uma tabela")
    rid = bruta.get("id")
    if not isinstance(rid, str) or not rid.strip():
        raise ErroRegras(f"regra #{indice}: falta o campo id")
    extras = set(bruta) - _CAMPOS_REGRA
    if extras:
        raise _erro(rid, f"campo desconhecido: {sorted(extras)[0]}")
    descricao = bruta.get("descricao")
    if not isinstance(descricao, str) or not descricao.strip():
        raise _erro(rid, "falta a descricao")
    pontos = bruta.get("pontos")
    if not isinstance(pontos, dict) or not pontos:
        raise _erro(rid, "falta pontos")
    for classe, p in pontos.items():
        if classe not in _CLASSES:
            raise _erro(rid, f"classe desconhecida: {classe!r}")
        if isinstance(p, bool) or not isinstance(p, int) or not 1 <= p <= _MAX_PONTOS:
            raise _erro(rid, f"pontos de {classe} devem ir de 1 a {_MAX_PONTOS}")
    quando = bruta.get("quando")
    if not isinstance(quando, dict) or not quando:
        raise _erro(rid, "falta quando")
    desconhecidas = set(quando) - _CONDICOES
    if desconhecidas:
        raise _erro(rid, f"condição desconhecida: {sorted(desconhecidas)[0]}")
    condicoes = tuple(_condicao(rid, nome, valor) for nome, valor in quando.items())
    return Regra(rid, descricao.strip(), dict(pontos), condicoes)


def carregar_regras(caminho: Path | None = None) -> list[Regra]:
    """Lê e valida o TOML (padrão: o embutido). Qualquer erro levanta ``ErroRegras``."""
    caminho = caminho or CAMINHO_PADRAO
    try:
        dados = tomllib.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError, UnicodeDecodeError) as e:
        raise ErroRegras(f"não foi possível ler as regras: {type(e).__name__}") from None
    brutas = dados.get("regra")
    if not isinstance(brutas, list) or not brutas:
        raise ErroRegras("o arquivo precisa ter uma ou mais tabelas [[regra]]")
    regras = [_regra(b, i) for i, b in enumerate(brutas, start=1)]
    vistos: set[str] = set()
    for r in regras:
        if r.id in vistos:
            raise _erro(r.id, "id repetido")
        vistos.add(r.id)
    return regras


_cache: list[Regra] | None = None


def _regras_padrao() -> list[Regra]:
    global _cache  # noqa: PLW0603
    if _cache is None:
        _cache = carregar_regras()
    return _cache


def _descrever(regra: Regra, valores: list[str], fatos: Fatos) -> str:
    texto = regra.descricao
    trocas = {
        "{fabricante}": fatos.fabricante,
        "{titulo}": fatos.titulo_http,
        "{nome}": fatos.nome,
        "{valor}": valores[0] if valores else None,
    }
    for marca, real in trocas.items():
        if marca in texto:
            texto = texto.replace(marca, limpar(real, LIMITE_TEXTO) or "")
    return texto[:LIMITE_DESCRICAO]


def classificar(fatos: Fatos, regras: Iterable[Regra] | None = None) -> Classificacao:
    """Soma os pontos das regras que casam e escolhe a classe (função pura)."""
    sinais: list[Sinal] = []
    totais: dict[str, int] = {}
    for regra in regras if regras is not None else _regras_padrao():
        valores: list[str] = []
        for cond in regra.condicoes:
            achado = cond(fatos)
            if achado is None:
                break
            valores.append(achado)
        else:
            sinais.append(Sinal(regra.id, _descrever(regra, valores, fatos), dict(regra.pontos)))
            for classe, p in regra.pontos.items():
                totais[classe] = totais.get(classe, 0) + p
    if not totais:
        return Classificacao(CLASSE_DESCONHECIDA, 0.0, sinais)
    # desempate por nome: o resultado não depende da ordem das regras
    vencedora = min(totais, key=lambda c: (-totais[c], c))
    if totais[vencedora] < LIMIAR_PONTOS:
        return Classificacao(CLASSE_DESCONHECIDA, 0.0, sinais)
    return Classificacao(vencedora, totais[vencedora] / sum(totais.values()), sinais)


def fatos_de(
    achado: Achado,
    *,
    fabricante: str | None = None,
    portas_abertas: Iterable[int] = (),
    titulo_http: str | None = None,
) -> Fatos:
    """Monta os ``Fatos`` de um achado (e, se houver, do resultado da sondagem)."""
    return Fatos(
        fabricante=fabricante or achado.fabricante,
        origens={achado.origem},
        portas_abertas=set(portas_abertas),
        titulo_http=titulo_http,
        nome=achado.nome,
        sinais_fonte=dict(achado.sinais),
    )
