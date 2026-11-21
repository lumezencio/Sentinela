"""Capturas de tela do painel nas 8 larguras do dono (360, 390, 768, 1024, 1280, 1366, 1440 e
1920 px), altura 900 px, nos temas claro e escuro. Não é coletado pelo smoke (nome fora de
``test_*``); ``capturas_dependencia.py`` reaproveita ``LARGURAS``, ``ALTURA``,
``pasta_saida`` e ``interceptar_ws`` daqui.

Contra um Sentinela já no ar (login e senha só por variável de ambiente, nunca impressos)::

    SENTINELA_SMOKE_LOGIN=admin SENTINELA_SMOKE_SENHA=... uv run --with pytest-playwright \\
        python ../web/tests/capturar_telas.py --url https://localhost:8443 --saida capturas \\
        --destinos alertas,alertas-silencio,alertas-dialogo,configuracoes

Sem Sentinela no ar (sobe o demo do smoke, em HTTPS local, com banco temporário e alertas
fictícios; precisa de ``--with cryptography``), de ``core/``::

    uv run --with pytest-playwright --with cryptography python ../web/tests/capturar_telas.py \\
        --local --saida capturas

Destinos: ``alertas`` (sem silêncio ativo), ``alertas-silencio`` (com um silêncio e uma
manutenção ativos), ``alertas-dialogo`` (diálogo de silêncio aberto, com erro de validação) e
``configuracoes`` (cartões do Telegram e do fuso). Task R (repaginação "Nebulosa com Aurora"):
``lista``, ``novos``, ``diagnostico``, ``login`` (sem sessão) e ``configuracoes-topo`` (o
começo de Configurações); ``--movimento-reduzido`` captura com ``prefers-reduced-motion:
reduce`` (sufixo ``-reduzido``). Toda captura passa por uma auditoria automática (elemento fora
da janela, reticências, texto cortado) gravada em ``auditoria.json``. ``teia-vazias`` e
``organograma-vazias`` tiram do que o navegador recebe os equipamentos de impressora e iot
(classes sem equipamento não podem aparecer). ``cartao-1/3/grupo`` abrem a Lista com cartões
de alerta (nome de 60 caracteres). Cada um sai em
``<destino>-<tema>-<largura>.png`` (a janela de 900 px) e ``...-pagina.png`` (a página inteira).
"""

import argparse
import json
import os
import re
import secrets
import sys
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, Page, WebSocketRoute, expect, sync_playwright

LARGURAS = (360, 390, 768, 1024, 1280, 1366, 1440, 1920)
ALTURA = 900
TEMAS = ("claro", "escuro")
DESTINOS = (
    "alertas",
    "alertas-silencio",
    "alertas-dialogo",
    "configuracoes",
    "teia",
    "teia-perto",
    "organograma",
    "cartao-1",
    "cartao-3",
    "cartao-grupo",
    "teia-vazias",
    "organograma-vazias",
    "teia-quatro",
    "teia-uma",
    "lista",
    "novos",
    "diagnostico",
    "login",
    "configuracoes-topo",
)

# mesma régua do smoke (MEDIR_T10): nada fora da janela, sem reticências, sem texto cortado
AUDITAR = """() => {
    const vw = document.documentElement.clientWidth;
    const problemas = [];
    for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const fora = '.so-leitor, .campo, svg, canvas, .teia-palco, .teia-rotulos, '
            + 'dialog:not([open])';
        if (el.closest(fora)) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const rola = el.closest('.painel-lista, .ca-cartoes, .teia-lista-classes, .teia-equips');
        if (!rola && (r.left < -0.5 || r.right > vw + 0.5)) {
            problemas.push([el.tagName, String(el.className), 'fora',
                Math.round(r.left), Math.round(r.right)]);
        }
        if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
            problemas.push([el.tagName, String(el.className), 'reticencias']);
        }
        if (el.children.length === 0 && el.textContent.trim()
            && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible') {
            problemas.push([el.tagName, String(el.className), 'cortado',
                el.scrollWidth, el.clientWidth]);
        }
    }
    return {vw, rolagem: document.documentElement.scrollWidth, problemas: problemas.slice(0, 20)};
}"""
# destinos em que as classes abaixo ficam sem equipamento (só no que o navegador recebe)
CLASSES_ESVAZIADAS = ("impressora", "iot")
# cenários da Teia: só estas classes ficam com equipamento (4 = rede típica do dono)
CENARIOS_TEIA = {
    "teia-demo": None,  # os 10 grupos com equipamento do demo
    "teia-quatro": ("roteador", "gravador", "camera", "computador"),
    "teia-uma": ("camera",),
}
# estilo da Teia por sufixo do destino (ex.: teia-quatro-e); sem sufixo, a Constelação
ESTILOS_TEIA = {"b": "Órbitas", "c": "Galáxia", "d": "Átomo", "e": "Árvore 3D"}


def _destino_teia(destino: str) -> tuple[str, str] | None:
    """(cenário, estilo) de ``teia-<cenário>[-<estilo>]``; None se não for desse tipo."""
    base, _, sufixo = destino.rpartition("-")
    if sufixo in ESTILOS_TEIA and base in CENARIOS_TEIA:
        return base, sufixo
    return (destino, "") if destino in CENARIOS_TEIA else None


NOME_LONGO = "Switch de distribuição do bloco administrativo B, sala de telecom do 2º andar"
NOME_EXTREMO = (
    "Gravador de vídeo do corredor central do prédio anexo, rack 3, prateleira inferior; "
    "ligado ao nobreak da sala de telecom e ao switch de distribuição do segundo andar do "
    "bloco administrativo B, com canais para o estacionamento, a recepção, o almoxarifado, "
    "o refeitório e as duas escadas de emergência do prédio"
)[:300]

POST_JSON = """async ([caminho, corpo]) => {
    const csrf = document.cookie.split('; ').find((c) => c.startsWith('sentinela_csrf='));
    const r = await fetch('/api/v1' + caminho, {
        method: 'POST',
        headers: {'Content-Type': 'application/json',
                  'X-CSRF': decodeURIComponent(csrf.split('=')[1])},
        body: JSON.stringify(corpo),
    });
    return {status: r.status, corpo: r.status === 204 ? null : await r.json()};
}"""


def pasta_saida() -> Path:
    pasta = Path(os.environ.get("SENTINELA_CAPTURAS") or tempfile.mkdtemp(prefix="sentinela-capt-"))
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


def interceptar_ws(page: Page, reescrever: Callable[[str], str]) -> None:
    """Reescreve o que o navegador recebe do WebSocket (o servidor não é tocado)."""

    def ao_ws(ws: WebSocketRoute) -> None:
        servidor = ws.connect_to_server()
        ws.on_message(lambda m: servidor.send(m))
        servidor.on_message(lambda m: ws.send(reescrever(m) if isinstance(m, str) else m))

    page.route_web_socket(re.compile(r".*/ws.*"), ao_ws)


def _entrar(browser: Browser, url: str, login: str, senha: str) -> dict[str, Any]:
    contexto = browser.new_context(ignore_https_errors=True, base_url=url)
    try:
        page = contexto.new_page()
        page.goto("/login.html")
        page.get_by_label("Login").fill(login)
        page.get_by_label("Senha").fill(senha)
        page.get_by_role("button", name="Entrar").click()
        page.wait_for_url("**/index.html")
        return contexto.storage_state()
    finally:
        contexto.close()


def esvaziar_classes(manter: tuple[str, ...] | None = None) -> Callable[[str], str]:
    """Reescritor do WebSocket: tira do snapshot os equipamentos de ``CLASSES_ESVAZIADAS`` e
    descarta os estados deles (o demo continua publicando). Um por página (guarda os ids)."""
    removidos: set[str] = set()

    def reescrever(texto: str) -> str:
        try:
            msg: dict[str, Any] = json.loads(texto)
        except ValueError:
            return texto
        if msg.get("tipo") == "snapshot":
            todos = msg.get("equipamentos", [])
            removidos.update(
                e["id"]
                for e in todos
                if (
                    e.get("classe") not in manter
                    if manter
                    else e.get("classe") in CLASSES_ESVAZIADAS
                )
            )
            msg["equipamentos"] = [e for e in todos if e["id"] not in removidos]
            return json.dumps(msg)
        if msg.get("id") in removidos:
            return json.dumps({"tipo": "ping"})
        return texto

    return reescrever


def _abrir_teia(page: Page, perto: bool) -> None:
    """Teia na vista geral (esferas pequenas: sem IP) ou de perto (Câmeras e o 1º equipamento
    focados: IP dentro das esferas)."""
    page.goto("/index.html#teia")
    palco = page.locator("#conteudo-teia [data-equipamentos]")
    expect(palco).to_have_attribute("data-equipamentos", re.compile(r"^[1-9]"), timeout=30_000)
    page.wait_for_timeout(3500)  # bloom/nível se decidem nos primeiros 3 s
    if perto:
        classes = page.locator("#teia-classes")
        classes.get_by_role("button", name=re.compile(r"^Câmeras")).click()
        page.wait_for_timeout(1800)
        classes.locator(".teia-equip").first.click()
        page.wait_for_timeout(2500)


LISTAR_ALERTAS = "async () => (await (await fetch('/api/v1/alertas?por_pagina=100')).json()).itens"


def _abrir_cartoes(page: Page, destino: str, ids: dict[str, int], ponte: Any) -> None:
    """Abre a Lista e injeta no WebSocket as mensagens ``aberto`` de alertas do banco local:
    ``cartao-1`` (uma queda), ``cartao-3`` (cinco: 3 à vista + "e mais 2") e ``cartao-grupo``
    (queda de 14 afetados, com a lista aberta)."""
    page.goto("/index.html")
    expect(page.locator("#lista tbody tr.linha").first).to_be_visible(timeout=20_000)
    por_id = {a["id"]: a for a in page.evaluate(LISTAR_ALERTAS)}
    escolha = {
        "cartao-1": ["aberto"],
        "cartao-3": ["pendente", "falhou", "instavel_novo", "aberto", "grupo"],
        "cartao-grupo": ["grupo"],
    }[destino]
    chaves = {**ids, "instavel_novo": ids["instavel"]}
    for i, chave in enumerate(escolha):
        alerta = por_id[chaves[chave]]
        ponte.injetar(
            {
                "tipo": "alerta",
                "acao": "aberto",
                "id": alerta["id"],
                "alerta": alerta,
                "abertos": 9 + i,
            }
        )
        page.wait_for_timeout(80)
    esperados = 1 if destino != "cartao-3" else 3
    expect(page.locator("#cartoes-alerta article.ca")).to_have_count(esperados, timeout=10_000)
    if destino == "cartao-grupo":
        page.locator("#cartoes-alerta .ca-ver").first.click()
        expect(page.locator("#cartoes-alerta .ca-afetados li")).to_have_count(14, timeout=10_000)
    page.wait_for_timeout(600)  # fim da animação de entrada e das buscas de MAC/afetados


def _abrir(page: Page, destino: str) -> None:
    if destino == "login":
        page.goto("/login.html")
        expect(page.get_by_role("button", name="Entrar")).to_be_visible()
        page.wait_for_timeout(900)
        return
    if destino == "lista":
        page.goto("/index.html")  # sem "#lista": o navegador rolaria até a tabela (id="lista")
        expect(page.locator("#lista tbody tr.linha").first).to_be_visible(timeout=20_000)
        page.wait_for_timeout(900)
        return
    if destino == "novos":
        page.goto("/index.html#novos")
        expect(page.locator("#conteudo-novos .nv-cartao").first).to_be_visible(timeout=20_000)
        page.wait_for_timeout(900)
        return
    if destino == "diagnostico":
        page.goto("/index.html#diagnostico")
        expect(page.locator("#conteudo-diagnostico")).to_be_visible(timeout=20_000)
        page.wait_for_timeout(2500)  # resumo do período chega pela API
        return
    if destino == "configuracoes-topo":
        page.goto("/index.html#configuracoes")
        expect(page.locator("#cfg-telegram")).to_be_visible(timeout=20_000)
        page.wait_for_timeout(1200)
        return
    cenario = _destino_teia(destino)
    if destino.endswith("-vazias") or (cenario and CENARIOS_TEIA[cenario[0]]):
        manter = CENARIOS_TEIA[cenario[0]] if cenario else None  # None: só impressora e iot
        interceptar_ws(page, esvaziar_classes(manter))
    if destino in ("teia", "teia-perto", "teia-vazias") or cenario:
        _abrir_teia(page, destino == "teia-perto")
        if cenario and cenario[1]:
            page.get_by_role("button", name=ESTILOS_TEIA[cenario[1]], exact=True).click()
            page.wait_for_timeout(2500)  # transição de estilo e nova vista geral
        return
    if destino in ("organograma", "organograma-vazias"):
        page.goto("/index.html#organograma")
        expect(page.locator("#conteudo-organograma .org-item").first).to_be_visible(timeout=20_000)
        page.wait_for_timeout(900)
        return
    aba = "configuracoes" if destino == "configuracoes" else "alertas"
    page.goto(f"/index.html#{aba}")
    if aba == "alertas":
        expect(page.locator("#lista-alertas li.al-linha").first).to_be_visible(timeout=20_000)
    else:
        expect(page.locator("#cfg-telegram")).to_be_visible(timeout=20_000)
        expect(page.locator("#cfg-fuso")).not_to_be_empty()
    page.wait_for_timeout(900)  # fim das animações de entrada


def _preparar_dialogo(page: Page) -> None:
    page.get_by_role("button", name="Silenciar ou manutenção").click()
    dialogo = page.locator("dialog[open]")
    expect(dialogo).to_be_visible()
    dialogo.get_by_role("button", name="Manutenção", exact=True).click()
    dialogo.get_by_label("Buscar equipamento").fill("AP Bloco")
    dialogo.get_by_label("Por quanto tempo").select_option("personalizado")
    dialogo.get_by_role("button", name="Iniciar manutenção").click()  # erros de validação à vista
    expect(dialogo.locator("#sil-alvo-erro")).to_be_visible()
    page.wait_for_timeout(500)


AUDITORIA: dict[str, Any] = {}


def _auditar(page: Page, nome: str) -> None:
    r = page.evaluate(AUDITAR)
    AUDITORIA[nome] = r
    if r["problemas"] or r["rolagem"] > r["vw"]:
        print(f"auditoria {nome}: {r}")


def _capturar_tela(
    page: Page,
    destino: str,
    saida: Path,
    tema: str,
    largura: int,
    ids: dict[str, int],
    sufixo: str = "",
) -> None:
    base = saida / f"{destino}-{tema}-{largura}{sufixo}"
    if destino.startswith("cartao-"):
        from conftest import PonteWs

        _abrir_cartoes(page, destino, ids, PonteWs(page))
        _auditar(page, base.name)
        page.screenshot(path=f"{base}.png")
        return
    _abrir(page, destino)
    _auditar(page, base.name)
    if destino == "configuracoes":
        page.locator("#cfg-telegram").scroll_into_view_if_needed()
        page.wait_for_timeout(200)
    if destino == "alertas-dialogo":
        _preparar_dialogo(page)
        page.screenshot(path=f"{base}.png")
        page.keyboard.press("Escape")
        return
    page.screenshot(path=f"{base}.png")
    if destino.startswith("teia") or destino in ("login", "lista", "configuracoes-topo") or sufixo:
        return  # a Teia ocupa a janela; nas outras a janela de 900 px é o que importa
    # página inteira: o cabeçalho fixo sairia no meio da imagem
    page.evaluate("document.querySelector('.topo').style.position = 'static'")
    page.screenshot(path=f"{base}-pagina.png", full_page=True)


def _criar_silencios(page: Page) -> list[int]:
    """Um silêncio e uma manutenção ativos (equipamentos do demo); devolve os ids."""
    page.goto("/index.html#lista")
    equipamentos = page.evaluate(
        "async () => (await (await fetch('/api/v1/equipamentos?limit=20')).json()).itens"
    )
    alvo = [e["id"] for e in equipamentos if e["estado"] != "pausado"]
    ids: list[int] = []
    pedidos = (
        {
            "tipo": "silencio",
            "alvo_tipo": "equipamento",
            "alvo": alvo[2],
            "atalho": "4h",
            "motivo": "troca do nobreak do rack 2",
        },
        {
            "tipo": "manutencao",
            "alvo_tipo": "equipamento",
            "alvo": alvo[3],
            "atalho": "amanha_8h",
            "motivo": "atualização de firmware do switch de distribuição do bloco B",
        },
    )
    for corpo in pedidos:
        r = page.evaluate(POST_JSON, ["/silencios", corpo])
        assert r["status"] == 201, r
        ids.append(r["corpo"]["id"])
    return ids


def _encerrar_silencios(page: Page, ids: list[int]) -> None:
    for id_ in ids:
        page.evaluate(POST_JSON, [f"/silencios/{id_}/encerrar", None])


# GPU real (ANGLE/D3D11): sem ela o SwiftShader do headless fica lento e a Teia se agrupa
ARGS_GPU = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"]


def capturar(
    url: str,
    login: str,
    senha: str,
    destinos: list[str],
    saida: Path,
    gpu: bool = False,
    semeados: dict[str, int] | None = None,
    temas: tuple[str, ...] = TEMAS,
    larguras: tuple[int, ...] = LARGURAS,
    reduzido: bool = False,
) -> None:
    with sync_playwright() as p:
        # barras de rolagem clássicas (as do Windows, 15-17 px), como no navegador do dono
        navegador = p.chromium.launch(
            args=ARGS_GPU if gpu else [], ignore_default_args=["--hide-scrollbars"]
        )
        try:
            estado = _entrar(navegador, url, login, senha)
            for destino in destinos:
                for tema in temas:
                    for largura in larguras:
                        contexto = navegador.new_context(
                            viewport={"width": largura, "height": ALTURA},
                            ignore_https_errors=True,
                            base_url=url,
                            storage_state=None if destino == "login" else estado,
                            color_scheme="light" if tema == "claro" else "dark",
                            reduced_motion="reduce" if reduzido else "no-preference",
                        )
                        ids: list[int] = []
                        try:
                            page = contexto.new_page()
                            if destino == "alertas-silencio":
                                ids = _criar_silencios(page)
                            _capturar_tela(
                                page,
                                destino,
                                saida,
                                tema,
                                largura,
                                semeados or {},
                                "-reduzido" if reduzido else "",
                            )
                        finally:
                            if ids:
                                _encerrar_silencios(page, ids)
                            contexto.close()
        finally:
            navegador.close()
            arq = saida / "auditoria.json"
            anterior = json.loads(arq.read_text(encoding="utf-8")) if arq.exists() else {}
            arq.write_text(
                json.dumps(anterior | AUDITORIA, ensure_ascii=False, indent=1), encoding="utf-8"
            )


def _subir_local(pasta: Path) -> tuple[str, str, str, Any]:
    """Demo do smoke (HTTPS local, banco temporário) com alertas fictícios; devolve
    (url, login, senha, servidor). ``servidor.ids`` guarda os ids dos alertas semeados
    (``aberto``, ``falhou``, ``pendente`` e os dos cartões: ``grupo``, ``instavel``,
    ``simples``)."""
    import asyncio

    from conftest import (
        ServidorLocal,
        _certificado,
        _porta_livre,
        _preparar_banco,
        semear_alertas,
        semear_cartoes,
    )
    from sentinela.demo import simulador

    # capturas repetíveis: sem quedas simuladas, os alertas semeados não se fecham sozinhos
    simulador._P_QUEDA = 0.0
    simulador._INTERVALO_SWITCH_S = 1e9
    banco = f"sqlite+aiosqlite:///{(pasta / 'capturas.db').as_posix()}"
    login, senha = "admin", secrets.token_urlsafe(18)
    asyncio.run(_preparar_banco(banco, login, senha))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco, _porta_livre(), chave, cert)
    servidor.levantar()
    semeados = asyncio.run(semear_alertas(banco, NOME_LONGO, NOME_EXTREMO))
    servidor.ids = {k: v["id"] for k, v in semeados.items()} | asyncio.run(semear_cartoes(banco))
    return f"https://127.0.0.1:{servidor.porta}", login, senha, servidor


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--url", help="endereço do Sentinela (padrão: SENTINELA_URL_SMOKE)")
    ap.add_argument("--local", action="store_true", help="sobe o demo do smoke e captura nele")
    ap.add_argument("--saida", type=Path, default=None, help="pasta das imagens")
    ap.add_argument("--destinos", default=",".join(DESTINOS), help=f"entre {', '.join(DESTINOS)}")
    ap.add_argument("--temas", default=",".join(TEMAS), help="claro, escuro ou os dois")
    ap.add_argument("--larguras", default="", help="ex.: 360,1366 (padrão: as 8 do dono)")
    ap.add_argument("--gpu", action="store_true", help="Chromium com GPU real (Teia sem agrupar)")
    ap.add_argument(
        "--movimento-reduzido", action="store_true", help="prefers-reduced-motion: reduce"
    )
    args = ap.parse_args()
    destinos = [d.strip() for d in args.destinos.split(",") if d.strip()]
    desconhecidos = [d for d in destinos if d not in DESTINOS and not _destino_teia(d)]
    if desconhecidos:
        sys.exit(f"destino desconhecido: {', '.join(desconhecidos)}")
    temas = tuple(t.strip() for t in args.temas.split(",") if t.strip() in TEMAS)
    larguras = tuple(int(x) for x in args.larguras.split(",") if x.strip()) or LARGURAS
    saida = args.saida or pasta_saida()
    saida.mkdir(parents=True, exist_ok=True)
    if args.local:
        with tempfile.TemporaryDirectory(prefix="sentinela-capt-") as tmp:
            url, login, senha, servidor = _subir_local(Path(tmp))
            try:
                capturar(
                    url,
                    login,
                    senha,
                    destinos,
                    saida,
                    args.gpu,
                    servidor.ids,
                    temas,
                    larguras,
                    args.movimento_reduzido,
                )
            finally:
                servidor.derrubar()
    else:
        url = args.url or os.environ.get("SENTINELA_URL_SMOKE", "")
        login = os.environ.get("SENTINELA_SMOKE_LOGIN", "")
        senha = os.environ.get("SENTINELA_SMOKE_SENHA", "")
        if not (url and login and senha):
            sys.exit("informe --url (ou SENTINELA_URL_SMOKE) e SENTINELA_SMOKE_LOGIN/SENHA")
        if any(d.startswith("cartao-") for d in destinos):
            sys.exit("os destinos cartao-* precisam do banco local: use --local")
        capturar(
            url,
            login,
            senha,
            destinos,
            saida,
            args.gpu,
            None,
            temas,
            larguras,
            args.movimento_reduzido,
        )
    print(f"capturas em {saida}")


if __name__ == "__main__":
    main()
