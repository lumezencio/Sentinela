"""Textos do Diagnóstico (rótulos, sugestões e avisos), todos em português e fixos."""

from sentinela.diagnostico.classificacao import Classificacao, Tipo

ROTULOS: dict[Tipo, str] = {
    "roteador_reiniciou": "Roteador reiniciou",
    "gateway_sem_reinicio": "Queda do gateway sem reinício",
    "pai_derrubou_filhos": "Equipamento pai derrubou os filhos",
    "queda_isolada": "Queda isolada",
    "instabilidade": "Instabilidade",
    "quedas_simultaneas": "Quedas simultâneas",
}


def rotulo(c: Classificacao) -> str:
    return f"{ROTULOS[c.tipo]} ({'provável' if c.certeza == 'provavel' else 'confirmado'})"


SUGESTOES: dict[Tipo, tuple[str, ...]] = {
    "roteador_reiniciou": (
        "Trocar a fonte do roteador.",
        "Ligar o roteador num nobreak.",
        "Atualizar o firmware.",
        "Tirar o roteador do calor.",
    ),
    "gateway_sem_reinicio": (
        "Conferir o cabo e a porta que ligam o roteador à internet.",
        "Ver com o provedor se houve queda na linha no mesmo horário.",
        "Conferir a fonte e a tomada do roteador.",
    ),
    "pai_derrubou_filhos": (
        "Conferir a fonte e a alimentação do equipamento pai.",
        "Conferir o cabo e a porta do switch do equipamento pai.",
        "Atualizar o firmware do equipamento pai.",
    ),
    "queda_isolada": (
        "Conferir o cabo e a porta do switch do aparelho.",
        "Conferir a fonte e a alimentação do aparelho.",
    ),
    "instabilidade": (
        "Trocar o cabo e testar outra porta do switch.",
        "Conferir a fonte e a alimentação do aparelho.",
        "Atualizar o firmware do aparelho.",
    ),
    "quedas_simultaneas": (
        'Cadastrar o "Depende de" dos aparelhos que ligam no mesmo equipamento.',
        "Conferir o switch, o cabo e a energia comuns a esses aparelhos.",
        "Atualizar o firmware do switch ou do roteador.",
    ),
}

AVISO_ENERGIA = (
    "Queda de energia não é medida pelo Sentinela. Para confirmar, cruze estes horários com"
    " um nobreak que registra eventos ou com uma tomada que mede energia."
)

SEM_GATEWAY = (
    "Sem o gateway cadastrado, o Diagnóstico não consegue dizer se o roteador reiniciou."
    " Informe o gateway de cada sub-rede em Configurações → Sub-redes e cadastre o roteador"
    " como equipamento."
)
