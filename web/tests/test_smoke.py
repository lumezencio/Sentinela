"""Smoke do front da Fase 1: login, lista ao vivo, filtro, reconexão e celular.

Rodar (de ``core/``)::

    uv run --with pytest-playwright --with cryptography playwright install chromium  # 1ª vez
    uv run --with pytest-playwright --with cryptography pytest ../web/tests -q

Contra o compose (Task 13): defina ``SENTINELA_URL_SMOKE``, ``SENTINELA_SMOKE_LOGIN`` e
``SENTINELA_SMOKE_SENHA``; a queda do core vira ``docker compose stop/start core`` só com
URL local e ``SENTINELA_SMOKE_COMPOSE_LOCAL=1`` (senão o cenário é pulado).
"""

import gzip
import hashlib
import json
import re
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from playwright.sync_api import Browser, ConsoleMessage, Page, Response, Route, expect

from conftest import GATEWAY_DO_ASSISTENTE, REDE_DO_ASSISTENTE, Alvo, Instalacao

TETO_PRIMEIRA_TELA = 150 * 1024  # gzip, §12
TOTAL_DEMO = 300 + 7  # rede sintética + os 7 aparelhos da rede do Diagnóstico (10.99.0.0/24)
CAMERAS_DEMO = 120 + 3  # mais as 3 câmeras da rede do Diagnóstico
POR_PAGINA = 50
TIPOS_PRIMEIRA_TELA = ("document", "script", "stylesheet", "image", "fetch", "font")


def entrar(
    page: Page, alvo: Alvo, login: str = "", senha: str = "", total: int = TOTAL_DEMO
) -> None:
    page.goto("/login.html")
    page.get_by_label("Login").fill(login or alvo.login)
    page.get_by_label("Senha").fill(senha or alvo.senha)
    page.get_by_role("button", name="Entrar").click()
    page.wait_for_url("**/index.html")
    expect(page.locator("#contador-total")).to_have_text(str(total), timeout=15_000)


def linhas(page: Page) -> Any:
    return page.locator("#lista tbody tr.linha")


def test_sem_sessao_vai_para_o_login(page: Page) -> None:
    page.goto("/index.html")
    page.wait_for_url("**/login.html", timeout=10_000)
    expect(page.get_by_role("button", name="Entrar")).to_be_visible()


def test_senha_errada_mostra_erro_generico(page: Page, alvo: Alvo) -> None:
    page.goto("/login.html")
    page.get_by_label("Login").fill(alvo.login)
    page.get_by_label("Senha").fill("senha-errada-de-proposito")
    page.get_by_role("button", name="Entrar").click()
    expect(page.locator("#erro-login")).to_have_text("Login ou senha inválidos.")


def test_login_mostra_total_e_contadores(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    # a demonstração muda estados o tempo todo: lê os 5 contadores de uma vez e repete até fechar
    leitura = (
        "() => ['online', 'instavel', 'offline', 'pausado', 'aguardando']"
        ".reduce((s, n) => s + Number(document.getElementById('contador-' + n).textContent), 0)"
    )
    soma = 0
    for _ in range(40):
        soma = page.evaluate(leitura)
        if soma == TOTAL_DEMO:
            break
        page.wait_for_timeout(100)
    assert soma == TOTAL_DEMO
    expect(linhas(page)).to_have_count(POR_PAGINA)
    # abas habilitadas; a Lista é a primeira tela
    expect(page.get_by_role("tab", name="Lista")).to_have_attribute("aria-selected", "true")
    expect(page.get_by_role("tab", name="Teia")).to_be_enabled()
    expect(page.get_by_role("tab", name="Organograma")).to_be_enabled()
    # estado nunca só por cor: cada linha tem rótulo de texto
    expect(linhas(page).first.locator(".estado-rotulo")).not_to_be_empty()


def test_filtro_por_classe_pagina_as_cameras(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    page.get_by_role("combobox", name="Classe").select_option(label="Câmeras")
    expect(page.locator("#total-filtrado")).to_have_text(str(CAMERAS_DEMO))
    expect(linhas(page)).to_have_count(POR_PAGINA)
    expect(page.locator("#pagina-info")).to_have_text("Página 1 de 3")
    page.get_by_role("button", name="Próxima página").click()
    page.get_by_role("button", name="Próxima página").click()
    expect(page.locator("#pagina-info")).to_have_text("Página 3 de 3")
    expect(linhas(page)).to_have_count(CAMERAS_DEMO - 2 * POR_PAGINA)
    expect(linhas(page).locator(".col-classe").first).to_have_text("Câmeras")


def test_queda_do_core_mostra_reconectando_e_volta(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    banner = page.locator("#banner-conexao")
    expect(banner).to_be_hidden()
    alvo.core.derrubar()
    try:
        expect(banner).to_be_visible(timeout=15_000)
        expect(banner).to_contain_text("Reconectando…")
        expect(banner).to_have_attribute("aria-live", "polite")
    finally:
        alvo.core.levantar()
    expect(banner).to_be_hidden(timeout=40_000)
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO))
    expect(linhas(page)).to_have_count(POR_PAGINA)


def test_celular_360_vira_cartoes_sem_rolagem_horizontal(browser: Browser, alvo: Alvo) -> None:
    contexto = browser.new_context(
        viewport={"width": 360, "height": 740}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        entrar(page, alvo)
        expect(page.locator("#lista thead")).to_be_hidden()
        assert linhas(page).first.evaluate("e => getComputedStyle(e).display") != "table-row"
        largura = page.evaluate(
            "() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]"
        )
        assert largura[0] <= largura[1], largura
        # o tipo de checagem também aparece no cartão
        expect(linhas(page).first.locator(".col-checagem")).to_be_visible()
    finally:
        contexto.close()


def test_primeira_tela_leve_e_sem_erros_no_console(page: Page, alvo: Alvo) -> None:
    erros: list[str] = []
    respostas: list[Response] = []
    page.on("console", lambda m: _anotar_erro(erros, m))
    page.on("pageerror", lambda e: erros.append(str(e)))
    entrar(page, alvo)  # o login também precisa passar sem violação de CSP
    # sem cache: o nginx manda "no-cache" e a revalidação viraria 304 sem corpo para medir
    page.context.new_cdp_session(page).send("Network.setCacheDisabled", {"cacheDisabled": True})
    page.on("response", lambda r: respostas.append(r))
    page.reload()
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)
    expect(linhas(page)).to_have_count(POR_PAGINA)
    total = 0
    for r in respostas:
        if r.request.resource_type in TIPOS_PRIMEIRA_TELA:
            total += len(gzip.compress(r.body()))
    print(f"\nprimeira tela: {len(respostas)} respostas, {total} bytes gzip")
    assert total <= TETO_PRIMEIRA_TELA, total
    assert erros == [], erros


def _anotar_erro(erros: list[str], m: ConsoleMessage) -> None:
    # Alpine reporta erro de expressão como warning: os dois reprovam
    if m.type in ("error", "warning"):
        erros.append(f"{m.type}: {m.text}")


def test_movimento_reduzido_desliga_animacoes(browser: Browser, alvo: Alvo) -> None:
    contexto = browser.new_context(
        reduced_motion="reduce", ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        entrar(page, alvo)
        duracao = page.locator(".nuvem-1").evaluate("e => getComputedStyle(e).animationDuration")
        assert duracao in ("1e-05s", "0.00001s", "0s"), duracao
    finally:
        contexto.close()


def test_um_unico_main_com_as_tres_abas(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    principal = page.get_by_role("main")
    for aba, painel in (
        ("Lista", "#conteudo-lista"),
        ("Organograma", "#conteudo-organograma"),
        ("Lista", "#conteudo-lista"),
    ):
        page.get_by_role("tab", name=aba).click()
        expect(principal).to_have_count(1)
        expect(principal).to_be_visible()
        expect(principal.locator(painel)).to_be_visible()
        expect(page.get_by_role("tabpanel")).to_have_count(1)  # só a aba ativa fica exposta


def test_link_direto_esconde_a_lista_antes_do_alpine(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    # sem o Alpine, só o tema.js (síncrono no <head>) e o CSS decidem o que aparece
    page.route("**/vendor/alpine-csp.min.js", lambda r: r.abort())
    page.goto("/index.html#organograma")
    page.reload()  # mesma página só com outro hash: recarrega de verdade, agora sem o Alpine
    expect(page.locator(".aviso-sem-alpine")).to_be_hidden()  # nada de aviso antes de 3 s
    assert page.evaluate("document.documentElement.dataset.aba") == "organograma"
    expect(page.locator("#conteudo-lista")).to_be_hidden()
    # sem o Alpine a página não fica em branco: o aviso de falha aparece (só CSS, com atraso)
    expect(page.locator(".aviso-sem-alpine")).to_be_visible(timeout=10_000)
    expect(page.locator(".aviso-sem-alpine")).to_contain_text("Não foi possível carregar")
    page.goto("/index.html#lista")
    page.reload()
    assert page.evaluate("document.documentElement.dataset.aba") == "lista"
    expect(page.locator("#conteudo-lista")).to_be_visible()


SOMA_CLS = """() => new Promise((ok) => {
    let soma = 0;
    new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) soma += e.value;
    }).observe({type: 'layout-shift', buffered: true});
    setTimeout(() => ok(soma), 300);
})"""


def test_link_direto_com_alpine_nao_mostra_aviso_de_falha(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    page.goto("/index.html#organograma")
    page.reload()
    expect(page.locator("#conteudo-organograma .org-cartao").first).to_be_visible(timeout=15_000)
    page.wait_for_timeout(3500)  # passou o atraso do aviso
    expect(page.locator(".aviso-sem-alpine")).to_be_hidden()
    # o global "fence" (Fenced Frame, depreciado) que o Alpine CSP enumeraria não existe mais
    assert page.evaluate("() => !('fence' in window)")


@pytest.mark.parametrize("largura", [1350, 1024])
def test_lista_sem_salto_de_layout_ao_chegar_as_linhas(
    browser: Browser, alvo: Alvo, largura: int
) -> None:
    # 1350x940 é a janela do preset desktop do Lighthouse: as 50 linhas chegam sem empurrar
    contexto = browser.new_context(
        viewport={"width": largura, "height": 940}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        entrar(page, alvo)
        page.reload()
        expect(linhas(page)).to_have_count(POR_PAGINA, timeout=15_000)
        page.wait_for_timeout(1000)
        cls = page.evaluate(SOMA_CLS)
        # sem a reserva de altura/colunas fixas mede ~0,075 aqui; com ela ~0,014 (teto do
        # Lighthouse "bom": 0,1)
        assert cls < 0.05, cls
    finally:
        contexto.close()


IPS_CORTADOS = (
    "() => [...document.querySelectorAll('#lista .col-ip')]"
    ".filter((c) => c.scrollWidth > c.clientWidth).map((c) => c.textContent)"
)


@pytest.mark.parametrize("largura", [800, 1024, 1350])
def test_lista_nunca_corta_o_ip(browser: Browser, alvo: Alvo, largura: int) -> None:
    contexto = browser.new_context(
        viewport={"width": largura, "height": 900}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        entrar(page, alvo)
        expect(linhas(page)).to_have_count(POR_PAGINA)
        assert page.evaluate(IPS_CORTADOS) == []
        # o nome (que pode quebrar/cortar) traz o valor completo no title
        primeira = linhas(page).first.locator(".col-nome")
        expect(primeira).to_have_attribute("title", primeira.inner_text())
    finally:
        contexto.close()


# ---- revisão final ---------------------------------------------------------------------------


def test_lista_mostra_tipo_de_checagem(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    expect(page.get_by_role("columnheader", name="Checagem")).to_be_visible()
    formato = re.compile(r"^(ICMP|TCP \d{1,5}|HTTP \d{1,5})$")
    for texto in linhas(page).locator(".col-checagem").all_inner_texts():
        assert formato.match(texto), texto
    classe = page.get_by_role("combobox", name="Classe")
    for rotulo, esperado in (("Gravadores", "TCP 554"), ("Controle de acesso", "HTTP 80")):
        classe.select_option(label=rotulo)
        expect(linhas(page).first.locator(".col-checagem")).to_have_text(esperado)
        assert set(linhas(page).locator(".col-checagem").all_inner_texts()) == {esperado}
    classe.select_option(label="Câmeras")
    expect(linhas(page).first.locator(".col-checagem")).to_have_text("ICMP")


def test_core_fora_ao_abrir_tenta_de_novo_e_carrega(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    falhas = {"restantes": 2}

    def eu(route: Route) -> None:
        if falhas["restantes"] > 0:
            falhas["restantes"] -= 1
            route.fulfill(status=502, body="")
        else:
            route.continue_()

    page.route("**/api/v1/auth/eu", eu)
    page.reload()
    banner = page.locator("#banner-conexao")
    expect(banner).to_contain_text("Reconectando…", timeout=5_000)
    # 1 s + 2 s de recuo e a página carrega sozinha, sem recarregar
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)
    expect(banner).to_be_hidden()
    assert falhas["restantes"] == 0


def test_sair_com_falha_fica_na_pagina_e_avisa(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    page.route("**/api/v1/auth/logout", lambda r: r.fulfill(status=500, body=""))
    page.get_by_role("button", name="Sair").click()
    expect(page.get_by_text("Não foi possível sair. Tente de novo.")).to_be_visible()
    assert page.url.endswith("/index.html")
    page.unroute("**/api/v1/auth/logout")
    page.get_by_role("button", name="Sair").click()
    page.wait_for_url("**/login.html", timeout=10_000)


def test_painel_de_sub_redes_lista_adiciona_e_remove(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    page.get_by_role("button", name="Sub-redes").click()
    dialogo = page.get_by_role("dialog", name="Sub-redes monitoradas")
    expect(dialogo).to_be_visible()
    itens = page.locator("#lista-subredes li code")
    expect(itens.first).to_have_text(re.compile(r"^10\.99\.\d+\.0/24$"))
    antes = itens.count()
    # sub-rede vazia (nenhum equipamento da demonstração nela): entra e sai sem efeito
    nova = "10.99.250.0/24"
    page.get_by_label("Nova sub-rede (CIDR)").fill(nova)
    dialogo.get_by_role("button", name="Adicionar").click()
    expect(dialogo.get_by_text(f"Sub-rede {nova} adicionada.")).to_be_visible()
    expect(itens).to_have_count(antes + 1)
    page.get_by_label("Nova sub-rede (CIDR)").fill("8.8.8.0/24")
    dialogo.get_by_role("button", name="Adicionar").click()
    expect(dialogo.get_by_role("alert")).to_have_text("A sub-rede deve ser privada (RFC 1918).")
    page.once("dialog", lambda d: d.accept())
    dialogo.get_by_role("button", name=f"Remover {nova}").click()
    expect(dialogo.get_by_text(f"Sub-rede {nova} removida.")).to_be_visible()
    expect(itens).to_have_count(antes)
    dialogo.get_by_role("button", name="Fechar").click()
    expect(dialogo).to_be_hidden()
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO))


def test_csv_mostra_total_de_erros(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    page.get_by_role("button", name="Importar CSV").click()
    # 60 linhas inválidas (IP público): nada é importado, a demonstração não muda
    corpo = "nome;ip;classe\n" + "".join(f"x{n};8.8.8.{n + 1};camera\n" for n in range(60))
    page.get_by_label("Arquivo").set_input_files(
        files=[{"name": "erros.csv", "mimeType": "text/csv", "buffer": corpo.encode()}]
    )
    page.get_by_role("dialog", name="Importar CSV").get_by_role("button", name="Importar").click()
    expect(
        page.get_by_text("0 importado(s), 60 linha(s) com erro (mostrando as primeiras 50).")
    ).to_be_visible()
    expect(page.locator(".erros-csv li")).to_have_count(50)


VENDOR = Path(__file__).resolve().parents[1] / "src" / "vendor"


def test_bundle_teia_confere_sha256() -> None:
    # o bundle commitado é o mesmo que o .sha256 declara (o Dockerfile confere igual)
    bundle = (VENDOR / "teia-3d.bundle.js").read_bytes()
    esperado, nome = (VENDOR / "teia-3d.bundle.js.sha256").read_text(encoding="ascii").split()
    assert nome == "teia-3d.bundle.js"
    assert hashlib.sha256(bundle).hexdigest() == esperado
    assert not list(VENDOR.glob("*.map"))


# ---- Fase 2: Teia ----------------------------------------------------------------------------

BUNDLE_TEIA = "teia-3d.bundle.js"
NOMES_ESTILOS = ("Constelação", "Órbitas", "Galáxia", "Átomo", "Árvore 3D")
CRIAR_VIA_API = """async (dados) => {
    const csrf = document.cookie.split('; ').find((c) => c.startsWith('sentinela_csrf='));
    const r = await fetch('/api/v1/equipamentos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF': decodeURIComponent(csrf.split('=')[1]),
        },
        body: JSON.stringify(dados),
    });
    return {status: r.status, corpo: await r.json()};
}"""
APAGAR_VIA_API = """async (id) => {
    const csrf = document.cookie.split('; ').find((c) => c.startsWith('sentinela_csrf='));
    const r = await fetch('/api/v1/equipamentos/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: {'X-CSRF': decodeURIComponent(csrf.split('=')[1])},
    });
    return r.status;
}"""


# Nota de desempenho do driver GL emulado (SwiftShader, headless sem GPU) quando a lib lê o
# pixel sob o ponteiro (seleção por GPU); com GPU real (ANGLE/D3D11) não aparece. Não é erro
# do app nem violação de CSP: é a ÚNICA mensagem tolerada.
NOTA_DRIVER_GL = re.compile(
    r"^\[\.WebGL-[^\]]+\]GL Driver Message \(OpenGL, Performance, .*ReadPixels"
)


def vigiar_console(page: Page) -> list[str]:
    erros: list[str] = []

    def anotar(m: ConsoleMessage) -> None:
        if m.type == "warning" and NOTA_DRIVER_GL.match(m.text):
            return
        _anotar_erro(erros, m)

    page.on("console", anotar)
    page.on("pageerror", lambda e: erros.append(str(e)))
    return erros


def canvases_da_teia(page: Page) -> int:
    total: int = page.evaluate("document.querySelectorAll('#conteudo-teia canvas').length")
    return total


def abrir_teia(page: Page) -> Any:
    page.get_by_role("tab", name="Teia").click()
    expect(page.get_by_role("tab", name="Teia")).to_have_attribute("aria-selected", "true")
    assert page.url.endswith("#teia"), page.url
    palco = page.locator("#conteudo-teia [data-equipamentos]")
    # R6: equipamentos conhecidos pela cena, independente do nível (headless pode agrupar)
    expect(palco).to_have_attribute("data-equipamentos", str(TOTAL_DEMO), timeout=20_000)
    expect(page.locator("#conteudo-teia canvas")).to_have_count(1)
    return palco


def test_primeira_tela_nao_carrega_bundle_da_teia(page: Page, alvo: Alvo) -> None:
    pedidos: list[str] = []
    page.on("request", lambda r: pedidos.append(r.url))
    entrar(page, alvo)
    expect(page.get_by_role("tab", name="Lista")).to_have_attribute("aria-selected", "true")
    expect(page.locator("#conteudo-teia")).to_be_hidden()
    page.wait_for_timeout(1000)
    assert not [u for u in pedidos if BUNDLE_TEIA in u], pedidos


def test_teia_abre_e_troca_os_5_estilos_sem_erro(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    abrir_teia(page)
    barra = page.get_by_role("group", name="Estilo da Teia")
    for nome in (*NOMES_ESTILOS[1:], NOMES_ESTILOS[0]):
        botao = barra.get_by_role("button", name=nome)
        botao.click()
        expect(botao).to_have_attribute("aria-pressed", "true")
        expect(barra.locator('[aria-pressed="true"]')).to_have_count(1)
        page.wait_for_timeout(400)
    # a escolha fica salva (localStorage com try/catch) e a aba vem do hash
    barra.get_by_role("button", name="Galáxia").click()
    page.reload()
    expect(page.get_by_role("tab", name="Teia")).to_have_attribute("aria-selected", "true")
    expect(
        page.get_by_role("group", name="Estilo da Teia").get_by_role("button", name="Galáxia")
    ).to_have_attribute("aria-pressed", "true")
    expect(page.locator("#conteudo-teia canvas")).to_have_count(1, timeout=20_000)
    page.wait_for_timeout(500)
    assert erros == [], erros


def test_teia_rotulo_de_classe_longo_quebra_linha_e_fica_no_palco(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    abrir_teia(page)
    page.wait_for_timeout(2500)
    longo = "Equipamentos de monitoramento do prédio anexo, bloco B"[:60]
    # um rótulo VISÍVEL (não escondido pela cena nem sob um painel de vidro): o primeiro da
    # lista pode estar oculto sob o painel de classes e não provaria nada
    marcado = page.evaluate(
        """(t) => {
        const vidros = [...document.querySelectorAll('#conteudo-teia .vidro')]
            .filter((v) => !v.hidden && v.offsetParent !== null)
            .map((v) => v.getBoundingClientRect());
        const livre = (r) => !vidros.some((v) => r.left < v.right && r.right > v.left
            && r.top < v.bottom && r.bottom > v.top);
        const alvo = [...document.querySelectorAll(
            '#conteudo-teia .teia-rotulo:not(.servidor):not([hidden]) > span')]
            .find((s) => livre(s.getBoundingClientRect())
                && getComputedStyle(s.parentElement).opacity !== '0');
        if (!alvo) return false;
        alvo.textContent = t;
        alvo.dataset.teste = '1';
        return true;
    }""",
        longo,
    )
    assert marcado, "nenhum rótulo de classe visível fora dos painéis"
    page.wait_for_timeout(600)
    medidas = page.evaluate(
        """() => {
        const palco = document.querySelector('#conteudo-teia .teia-rotulos')
            .getBoundingClientRect();
        return [...document.querySelectorAll('#conteudo-teia .teia-rotulo:not([hidden]) > span')]
            .map((s) => {
                const r = s.getBoundingClientRect();
                return {
                    medido: s.dataset.teste === '1',
                    ellipsis: getComputedStyle(s).textOverflow === 'ellipsis',
                    cortado: s.scrollWidth > s.clientWidth + 1,
                    dentro: r.left >= palco.left - 1 && r.right <= palco.right + 1
                        && r.top >= palco.top - 1 && r.bottom <= palco.bottom + 1,
                };
            });
    }"""
    )
    assert any(m["medido"] for m in medidas), "o rótulo medido sumiu da cena"
    assert not any(m["ellipsis"] or m["cortado"] for m in medidas), medidas
    assert all(m["dentro"] for m in medidas), medidas


def test_teia_movimento_reduzido_sem_particulas_nem_rotacao(browser: Browser, alvo: Alvo) -> None:
    contexto = browser.new_context(
        reduced_motion="reduce", ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        erros = vigiar_console(page)
        entrar(page, alvo)
        palco = abrir_teia(page)
        expect(palco).to_have_attribute("data-movimento", "reduzido")
        expect(palco).to_have_attribute("data-nivel", re.compile(r"^(completo|reduzido|agrupado)$"))
        nivel = palco.get_attribute("data-nivel")
        nos = int(palco.get_attribute("data-nos") or "0")
        # coerência nível x nós: agrupado só com super-nós por classe (poucos), completo até 1.000
        assert (nivel == "agrupado") == (nos < TOTAL_DEMO), (nivel, nos)
        # comportamento, não só o rótulo: sem rotação automática, sem partículas e câmera parada
        expect(palco).to_have_attribute("data-girando", "nao")
        expect(palco).to_have_attribute("data-particulas", "nao")
        expect(palco).to_have_attribute("data-camera", re.compile(r"^-?\d+,-?\d+,-?\d+$"))
        page.wait_for_timeout(500)
        antes = palco.get_attribute("data-camera")
        page.wait_for_timeout(1500)  # leitura a cada 250 ms enquanto a cena desenha
        assert palco.get_attribute("data-camera") == antes
        expect(palco).to_have_attribute("data-movimento", "reduzido")
        expect(palco).to_have_attribute("data-girando", "nao")
        assert canvases_da_teia(page) == 1
        assert erros == [], erros
    finally:
        contexto.close()


def test_teia_clicar_equipamento_mostra_historico(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    abrir_teia(page)
    classes = page.locator("#teia-classes")
    cameras = classes.get_by_role("button", name=re.compile(r"^Câmeras"))
    cameras.focus()
    page.keyboard.press("Enter")
    expect(classes.get_by_role("heading", name="Câmeras")).to_be_visible()
    equipamentos = classes.locator("ul.teia-equips").get_by_role("button")
    expect(equipamentos).to_have_count(POR_PAGINA)
    primeiro = equipamentos.first
    nome = primeiro.locator(".teia-equip-nome").inner_text()
    primeiro.click()
    painel = page.locator("#painel-equipamento")
    expect(painel).to_be_visible()
    # Task 11b: de perto, o IP aparece dentro das esferas (canvas -> sprite; contagem no palco)
    palco = page.locator("#conteudo-teia [data-equipamentos]")
    if palco.get_attribute("data-nivel") != "agrupado":
        com_ip = re.compile(r"^[1-9]\d*$")
        expect(palco).to_have_attribute("data-rotulos-ip", com_ip, timeout=10_000)
    expect(painel.get_by_role("heading", level=2)).to_have_text(nome)
    expect(painel.get_by_role("heading", name="Últimas quedas")).to_be_visible()
    historico = painel.locator(".teia-historico li:visible, .teia-historico-vazio:visible")
    expect(historico.first).to_be_visible(timeout=10_000)
    expect(painel.get_by_text("Não foi possível carregar o histórico.")).to_be_hidden()
    # admin vê os atalhos de pausar/retomar
    expect(painel.get_by_role("button", name=re.compile("^(Pausar|Retomar)$"))).to_be_visible()
    # Esc fecha o painel do equipamento; o 2º Esc tira o foco da classe (verTudo)
    page.keyboard.press("Escape")
    expect(painel).to_be_hidden()
    expect(classes.get_by_role("heading", name="Câmeras")).to_be_visible()
    page.keyboard.press("Escape")
    expect(classes.get_by_role("button", name=re.compile(r"^Câmeras"))).to_be_visible()
    assert erros == [], erros


def test_teia_historico_com_falha_mostra_aviso(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    page.route("**/api/v1/equipamentos/*/eventos*", lambda r: r.fulfill(status=500, body=""))
    abrir_teia(page)
    page.locator("#teia-classes").get_by_role("button", name=re.compile(r"^Gravadores")).click()
    page.locator("#teia-classes ul.teia-equips").get_by_role("button").first.click()
    painel = page.locator("#painel-equipamento")
    expect(painel.get_by_text("Não foi possível carregar o histórico.")).to_be_visible()


def test_trocar_abas_varias_vezes_um_renderer(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    abrir_teia(page)
    for n in range(10):
        page.get_by_role("tab", name="Lista" if n % 2 == 0 else "Teia").click()
    # o laço termina na Teia: o estado final é a Lista
    page.get_by_role("tab", name="Lista").click()
    expect(page.get_by_role("tab", name="Lista")).to_have_attribute("aria-selected", "true")
    expect(page.locator("#conteudo-lista")).to_be_visible()
    page.get_by_role("tab", name="Teia").click()
    expect(page.locator("#conteudo-teia")).to_be_visible()
    page.wait_for_timeout(500)
    assert canvases_da_teia(page) == 1
    # voltar/avançar do navegador também troca a aba (rota no hash)
    page.go_back()
    expect(page.get_by_role("tab", name="Lista")).to_have_attribute("aria-selected", "true")
    page.go_forward()
    expect(page.get_by_role("tab", name="Teia")).to_have_attribute("aria-selected", "true")
    assert canvases_da_teia(page) == 1
    assert erros == [], erros


def test_snapshot_novo_nao_duplica_esferas(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    palco = abrir_teia(page)
    dados = {"nome": "Sensor Smoke Teia", "ip": "10.99.60.231", "classe": "iot"}
    criado = page.evaluate(CRIAR_VIA_API, dados)
    assert criado["status"] == 201, criado
    try:
        expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO + 1), timeout=30_000)
        expect(palco).to_have_attribute("data-equipamentos", str(TOTAL_DEMO + 1))
        # o headless pode cair para o nível agrupado (FPS baixo) a qualquer momento, inclusive
        # entre ler o nível e conferir os nós: espera o grafo assentar OU o agrupamento e só
        # então confere (a checagem de duplicata continua exata no nível completo)
        total = str(TOTAL_DEMO + 1)
        # leitura atômica (um só instante) de nível e contagens: devolve quando assentou
        foto = page.wait_for_function(
            """([el, n]) => {
                const d = el.dataset;
                const pronto = d.nivel === "agrupado" || (d.nos === n && d.nosGrafo === n);
                return pronto && {nivel: d.nivel, nos: d.nos, grafo: d.nosGrafo};
            }""",
            arg=[palco.element_handle(), total],
            timeout=15_000,
        ).json_value()
        if foto["nivel"] != "agrupado":
            assert foto["nos"] == total, foto
            # nenhum nó duplicado entregue ao grafo (não só no mapa interno da cena)
            assert foto["grafo"] == total, foto
        assert canvases_da_teia(page) == 1

        # trocas de aba não acumulam geometrias/texturas na GPU (um renderer, objetos reusados).
        # A demo segue mudando estados: um nó que entra num estado ainda não desenhado aloca uma
        # geometria nova, então "nunca cresce" numa janela seria medir a demo, não as trocas.
        # Mede o que escala com as trocas: 10 trocas de aquecimento, linha de base, mais 10; o
        # crescimento entre as duas medições fica em no máximo 2 (vazamento por troca daria ≥ 5).
        def trocar_10_vezes() -> tuple[str | None, int, int]:
            for n in range(10):
                page.get_by_role("tab", name="Lista" if n % 2 == 0 else "Teia").click()
            expect(page.get_by_role("tab", name="Teia")).to_have_attribute("aria-selected", "true")
            page.wait_for_timeout(600)
            assert canvases_da_teia(page) == 1
            return (
                palco.get_attribute("data-nivel"),
                int(palco.get_attribute("data-geometrias") or "0"),
                int(palco.get_attribute("data-texturas") or "0"),
            )

        nivel, geo, tex = trocar_10_vezes()
        assert geo > 0, geo
        nivel_depois, geo_depois, tex_depois = trocar_10_vezes()
        if nivel_depois == nivel:  # trocar de nível recria os objetos
            assert geo_depois - geo <= 2, (geo, geo_depois)
            assert tex_depois - tex <= 2, (tex, tex_depois)
    finally:
        assert page.evaluate(APAGAR_VIA_API, criado["corpo"]["id"]) == 204


def test_sem_webgl_abre_organograma(
    browser_type: Any, browser_type_launch_args: dict[str, Any], alvo: Alvo
) -> None:
    args = [*browser_type_launch_args.get("args", []), "--disable-webgl", "--disable-3d-apis"]
    navegador = browser_type.launch(**{**browser_type_launch_args, "args": args})
    try:
        contexto = navegador.new_context(ignore_https_errors=True, base_url=alvo.url)
        page = contexto.new_page()
        pedidos: list[str] = []
        page.on("request", lambda r: pedidos.append(r.url))
        entrar(page, alvo)
        assert not page.evaluate(
            "() => { const c = document.createElement('canvas');"
            " return !!(c.getContext('webgl2') || c.getContext('webgl')); }"
        )
        page.get_by_role("tab", name="Teia").click()
        organograma = page.get_by_role("tab", name="Organograma")
        expect(organograma).to_have_attribute("aria-selected", "true")
        assert page.url.endswith("#organograma"), page.url
        aviso = page.get_by_text("Seu navegador não tem 3D; mostrando o Organograma.")
        expect(aviso).to_be_visible()
        expect(page.locator("#conteudo-teia")).to_be_hidden()
        assert not [u for u in pedidos if BUNDLE_TEIA in u], pedidos
    finally:
        navegador.close()


def test_visualizador_nao_ve_pausar_no_painel(page: Page, alvo: Alvo) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador (SENTINELA_SMOKE_LEITOR_LOGIN/SENHA)")
    entrar(page, alvo, alvo.login_leitor, alvo.senha_leitor)
    abrir_teia(page)
    page.locator("#teia-classes").get_by_role("button", name=re.compile(r"^Gravadores")).click()
    page.locator("#teia-classes ul.teia-equips").get_by_role("button").first.click()
    painel = page.locator("#painel-equipamento")
    expect(painel.get_by_role("heading", name="Últimas quedas")).to_be_visible()
    expect(painel.get_by_role("button", name=re.compile("^(Pausar|Retomar)$"))).to_be_hidden()


def test_historico_atrasado_de_outro_equipamento_nao_sobrescreve(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    retidas: list[Route] = []

    def eventos(route: Route) -> None:
        if not retidas:
            retidas.append(route)  # 1º equipamento (A): resposta segurada
        else:
            route.continue_()

    page.route("**/api/v1/equipamentos/*/eventos*", eventos)
    abrir_teia(page)
    page.locator("#teia-classes").get_by_role("button", name=re.compile(r"^Gravadores")).click()
    botoes = page.locator("#teia-classes ul.teia-equips").get_by_role("button")
    botoes.nth(0).click()
    for _ in range(50):  # o pedido de A chega e fica segurado
        if retidas:
            break
        page.wait_for_timeout(100)
    assert len(retidas) == 1
    nome_b = botoes.nth(1).locator(".teia-equip-nome").inner_text()
    botoes.nth(1).click()
    painel = page.locator("#painel-equipamento")
    expect(painel.get_by_role("heading", level=2)).to_have_text(nome_b)
    visivel = painel.locator(".teia-historico li:visible, .teia-historico-vazio:visible")
    expect(visivel.first).to_be_visible(timeout=10_000)
    antes = painel.locator(".teia-historico").inner_text()
    # agora a resposta de A chega, atrasada, com uma queda inconfundível
    assert len(retidas) == 1
    retidas[0].fulfill(
        status=200,
        content_type="application/json",
        body='[{"id": 999999, "de": "online", "para": "offline",'
        ' "em": "2001-01-01T00:00:00+00:00", "duracao_s": null, "causa": null}]',
    )
    page.wait_for_timeout(500)
    expect(painel.get_by_role("heading", level=2)).to_have_text(nome_b)
    assert "2001" not in painel.locator(".teia-historico").inner_text()
    assert painel.locator(".teia-historico").inner_text() == antes


PAUSA_VIA_API = """async ([id, acao]) => {
    const csrf = document.cookie.split('; ').find((c) => c.startsWith('sentinela_csrf='));
    const r = await fetch('/api/v1/equipamentos/' + encodeURIComponent(id) + '/' + acao, {
        method: 'POST',
        headers: {'X-CSRF': decodeURIComponent(csrf.split('=')[1])},
    });
    return r.status;
}"""
GRAVADOR_NAO_PAUSADO = """async () => {
    const r = await fetch('/api/v1/equipamentos?classe=gravador&limit=100');
    const d = await r.json();
    const e = d.itens.find((x) => x.estado !== 'pausado');
    return e ? {id: e.id, nome: e.nome} : null;
}"""


def test_admin_pausa_e_retoma_pelo_painel_da_teia(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    gravador = page.evaluate(GRAVADOR_NAO_PAUSADO)
    assert gravador, "a demonstração não tem gravador fora de pausa"
    nome = gravador["nome"]
    abrir_teia(page)
    page.locator("#teia-classes").get_by_role("button", name=re.compile(r"^Gravadores")).click()
    exato = re.compile(f"^{re.escape(nome)}$")
    botoes = page.locator("#teia-classes ul.teia-equips").get_by_role("button")
    botoes.filter(has=page.locator(".teia-equip-nome", has_text=exato)).click()
    painel = page.locator("#painel-equipamento")
    expect(painel.get_by_role("heading", level=2)).to_have_text(nome)
    retomado = False
    try:
        painel.get_by_role("button", name="Pausar").click()
        expect(painel.get_by_role("button", name="Retomar")).to_be_visible(timeout=10_000)
        expect(painel.locator(".teia-ficha")).to_contain_text("Pausado")
        # a Lista mostra o mesmo estado (store comum, sem esperar o WebSocket)
        page.get_by_role("tab", name="Lista").click()
        page.get_by_role("combobox", name="Classe").select_option(label="Gravadores")
        linha = linhas(page).filter(has=page.locator(".col-nome", has_text=exato))
        expect(linha.locator(".estado-rotulo")).to_have_text("Pausado")
        # de volta à Teia: o painel continua aberto; Retomar devolve o estado normal
        page.get_by_role("tab", name="Teia").click()
        painel.get_by_role("button", name="Retomar").click()
        expect(painel.get_by_role("button", name="Pausar")).to_be_visible(timeout=10_000)
        retomado = True
        expect(painel.locator(".teia-ficha")).not_to_contain_text("Pausado")
        page.get_by_role("tab", name="Lista").click()
        expect(linha.locator(".estado-rotulo")).not_to_have_text("Pausado")
        assert erros == [], erros
    finally:
        if not retomado:  # nunca deixa a demonstração (compose) com um gravador pausado
            page.evaluate(PAUSA_VIA_API, [gravador["id"], "retomar"])


def test_abrir_no_organograma_nao_mexe_na_teia_oculta(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    palco = abrir_teia(page)
    expect(palco).to_have_attribute("data-girando", "sim")
    page.get_by_role("tab", name="Organograma").click()
    secao = page.locator("#conteudo-organograma")
    item = secao.locator('.org-cartao[data-slug="gravador"] .org-item').first
    expect(item).to_be_visible(timeout=15_000)
    nome = item.locator(".org-nome").inner_text()
    item.click()
    dialogo = page.get_by_role("dialog", name=nome)
    expect(dialogo).to_be_visible()
    # ficha completa (histórico carregado): qualquer efeito do abrir na cena já teria acontecido
    visivel = dialogo.locator(".teia-historico li:visible, .teia-historico-vazio:visible")
    expect(visivel.first).to_be_visible(timeout=10_000)
    expect(palco).to_have_attribute("data-girando", "sim")
    page.keyboard.press("Escape")
    expect(dialogo).to_be_hidden()
    page.get_by_role("tab", name="Teia").click()
    expect(page.locator("#conteudo-teia")).to_be_visible()
    # rotação automática ligada e câmera na vista geral do estilo A: mesma direção de sempre
    # (elevação y / raio = 260 / 520), a distância é a que faz tudo caber na área livre
    expect(palco).to_have_attribute("data-girando", "sim")
    expect(page.locator("#painel-equipamento")).to_be_hidden()
    page.wait_for_timeout(600)
    x, y, z = (int(v) for v in (palco.get_attribute("data-camera") or "0,0,0").split(","))
    raio = (x * x + z * z) ** 0.5
    assert abs(y / raio - 0.5) <= 0.02, (x, y, z)
    assert 300 <= raio <= 2200, (x, y, z)
    assert erros == [], erros


def test_fechar_equipamento_fora_da_teia_devolve_a_vista_geral(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    palco = abrir_teia(page)
    # A aberto na Teia: câmera vai até ele e a rotação para
    page.locator("#teia-classes").get_by_role("button", name=re.compile(r"^Gravadores")).click()
    page.locator("#teia-classes ul.teia-equips").get_by_role("button").first.click()
    expect(page.locator("#painel-equipamento")).to_be_visible()
    expect(palco).to_have_attribute("data-girando", "nao")
    # B aberto e fechado no Organograma, com a Teia oculta
    page.get_by_role("tab", name="Organograma").click()
    item = page.locator('#conteudo-organograma .org-cartao[data-slug="camera"] .org-item').first
    expect(item).to_be_visible(timeout=15_000)
    nome = item.locator(".org-nome").inner_text()
    item.click()
    dialogo = page.get_by_role("dialog", name=nome)
    expect(dialogo).to_be_visible()
    page.keyboard.press("Escape")
    expect(dialogo).to_be_hidden()
    # de volta à Teia: vista geral girando, sem painel nem classe focada
    page.get_by_role("tab", name="Teia").click()
    expect(page.locator("#conteudo-teia")).to_be_visible()
    expect(palco).to_have_attribute("data-girando", "sim")
    expect(page.locator("#painel-equipamento")).to_be_hidden()
    expect(page.locator("#teia-classes").get_by_role("heading", name="Classes")).to_be_visible()
    assert erros == [], erros


def test_teia_falha_na_montagem_limpa_e_oferece_organograma(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    # bundle falso: deixa um canvas e um atributo no palco e falha no meio da montagem
    falso = (
        "export function montarTeia(c) {"
        " c.appendChild(document.createElement('canvas'));"
        " c.dataset.nos = '1'; throw new Error('falha de propósito'); }"
    )
    page.route(
        f"**/vendor/{BUNDLE_TEIA}",
        lambda r: r.fulfill(status=200, content_type="text/javascript", body=falso),
    )
    page.get_by_role("tab", name="Teia").click()
    aviso = page.locator("#conteudo-teia .teia-aviso-erro")
    expect(aviso).to_be_visible(timeout=10_000)
    expect(aviso).to_contain_text("Não foi possível abrir a Teia.")
    assert canvases_da_teia(page) == 0  # a montagem parcial saiu do palco
    assert page.locator("#conteudo-teia .teia-palco").get_attribute("data-nos") is None
    aviso.get_by_role("button", name="Tentar de novo").click()
    expect(aviso).to_be_visible()
    assert canvases_da_teia(page) == 0  # e não acumula a cada tentativa
    aviso.get_by_role("link", name="Ver o Organograma").click()
    expect(page.get_by_role("tab", name="Organograma")).to_have_attribute("aria-selected", "true")


# ---- Fase 2: Organograma --------------------------------------------------------------------

PESOS_ESTADO = {
    "offline": 0,
    "instavel": 1,
    "suspeito": 2,
    "aguardando": 3,
    "pausado": 4,
    "online": 5,
}
SEM_ROLAGEM_HORIZONTAL = "() => document.documentElement.scrollWidth"


def abrir_organograma(page: Page) -> Any:
    page.get_by_role("tab", name="Organograma").click()
    expect(page.get_by_role("tab", name="Organograma")).to_have_attribute("aria-selected", "true")
    assert page.url.endswith("#organograma"), page.url
    secao = page.locator("#conteudo-organograma")
    expect(secao.locator(".org-cartao").first).to_be_visible(timeout=15_000)
    return secao


# duas câmeras (checagem a cada 15 s), fora dos equipamentos usados pelos alertas semeados
CAMERAS_DERRUBADAS = ["10.99.10.120", "10.99.10.121"]


def esperar_estados_variados(page: Page, queda_forcada: Any) -> None:
    """Há equipamento offline: no core local o teste derruba duas câmeras (a demonstração do
    smoke não cai sozinha); contra o compose espera a própria demonstração derrubar algum."""
    forcada = queda_forcada(CAMERAS_DERRUBADAS)
    for _ in range(120):
        if int(page.locator("#contador-offline").inner_text()) >= (2 if forcada else 1):
            return
        page.wait_for_timeout(500)
    pytest.fail("nenhum equipamento ficou offline em 60 s")


def pesos_por_cartao(secao: Any) -> list[list[int]]:
    resultado: list[list[int]] = secao.locator(".org-cartao").evaluate_all(
        "cs => cs.map(c => [...c.querySelectorAll('.org-item')].map(i => Number(i.dataset.peso)))"
    )
    return resultado


def test_organograma_mostra_o_ip_inteiro_em_cada_no(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_organograma(page)
    itens = secao.locator(".org-item")
    expect(itens.first).to_be_visible()
    ips = secao.locator(".org-item .org-ip")
    assert ips.count() == itens.count() > 0
    # IP da API como texto, inteiro (sem corte nem reticências), dentro do próprio nó
    dados = page.evaluate(
        """() => [...document.querySelectorAll('#conteudo-organograma .org-item')].map((b) => {
            const ip = b.querySelector('.org-ip');
            const r = ip.getBoundingClientRect(), c = b.getBoundingClientRect();
            return {texto: ip.textContent, cabe: ip.scrollWidth <= ip.clientWidth + 1,
                    dentro: r.left >= c.left && r.right <= c.right + 0.5
                        && r.bottom <= c.bottom + 0.5,
                    filhos: ip.children.length};
        })"""
    )
    for d in dados:
        assert re.fullmatch(r"10\.99\.\d{1,3}\.\d{1,3}", d["texto"]), d
        assert d["cabe"] and d["dentro"] and d["filhos"] == 0, d
    assert erros == [], erros


def test_organograma_360_pior_estado_primeiro_sem_rolagem(
    browser: Browser, alvo: Alvo, queda_forcada: Any
) -> None:
    contexto = browser.new_context(
        viewport={"width": 360, "height": 740}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        erros = vigiar_console(page)
        entrar(page, alvo)
        esperar_estados_variados(page, queda_forcada)
        secao = abrir_organograma(page)
        secao.get_by_role("combobox", name="Estado").select_option(label="Todos")
        assert page.evaluate(SEM_ROLAGEM_HORIZONTAL) <= 360
        pesos = pesos_por_cartao(secao)
        assert pesos and all(p for p in pesos), pesos
        for lista in pesos:
            assert lista[0] == min(lista), lista  # pior estado primeiro
            assert lista == sorted(lista), lista
        # Câmeras: 120 na demonstração → 50 por página, "Próxima" leva aos próximos 50
        cameras = secao.locator('.org-cartao[data-slug="camera"]')
        itens = cameras.locator(".org-item")
        expect(itens).to_have_count(POR_PAGINA)
        expect(cameras.locator(".org-pagina-info")).to_have_text("1 de 3")
        cameras.get_by_role("button", name=re.compile("^Próxima")).click()
        expect(cameras.locator(".org-pagina-info")).to_have_text("2 de 3")
        expect(itens).to_have_count(POR_PAGINA)
        # estados mudam e reordenam: só contagem e posição, não a disjunção entre duas leituras
        assert page.evaluate(SEM_ROLAGEM_HORIZONTAL) <= 360
        # filtro "offline": só itens offline e ainda sem rolagem horizontal
        secao.get_by_role("combobox", name="Estado").select_option(label="Offline")
        expect(secao.locator(".org-item").first).to_be_visible()
        for lista in pesos_por_cartao(secao):
            assert set(lista) == {PESOS_ESTADO["offline"]}, lista
        assert page.evaluate(SEM_ROLAGEM_HORIZONTAL) <= 360
        assert erros == [], erros
    finally:
        contexto.close()


def test_organograma_filtros_compartilhados_recolher_e_painel(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    # filtro escolhido na Lista vale no Organograma (e vice-versa)
    page.get_by_role("combobox", name="Classe").select_option(label="Gravadores")
    secao = abrir_organograma(page)
    expect(secao.locator(".org-cartao")).to_have_count(1)
    expect(secao.locator('.org-cartao[data-slug="gravador"] .org-item')).to_have_count(
        9
    )  # 8 da rede sintética + o da rede do Diagnóstico
    expect(secao.get_by_role("combobox", name="Classe")).to_have_value("gravador")
    secao.get_by_role("combobox", name="Classe").select_option(label="Todas")
    page.get_by_role("tab", name="Lista").click()
    expect(page.locator("#total-filtrado")).to_have_text(str(TOTAL_DEMO))
    secao = abrir_organograma(page)
    cartoes = secao.locator(".org-cartao")
    expect(cartoes).to_have_count(10)  # 10 classes na demonstração, sem a do servidor
    # recolher um cartão, depois tudo, depois expandir tudo
    gravadores = secao.locator('.org-cartao[data-slug="gravador"]')
    alternar = gravadores.locator(".org-alternar")
    expect(alternar).to_have_attribute("aria-expanded", "true")
    alternar.click()
    expect(alternar).to_have_attribute("aria-expanded", "false")
    expect(gravadores.locator(".org-grade")).to_be_hidden()
    secao.get_by_role("button", name="Recolher tudo").click()
    expect(secao.locator('.org-alternar[aria-expanded="true"]')).to_have_count(0)
    expect(secao.locator(".org-item:visible")).to_have_count(0)
    secao.get_by_role("button", name="Expandir tudo").click()
    expect(secao.locator('.org-alternar[aria-expanded="false"]')).to_have_count(0)
    # recolhimento só na memória: sobrevive à troca de aba
    alternar.click()
    page.get_by_role("tab", name="Lista").click()
    abrir_organograma(page)
    expect(alternar).to_have_attribute("aria-expanded", "false")
    alternar.click()
    # clicar num equipamento abre o painel com o histórico (sem carregar a Teia)
    id_item = gravadores.locator(".org-item").first.get_attribute("data-id")
    item = gravadores.locator(f'.org-item[data-id="{id_item}"]')
    nome = item.locator(".org-nome").inner_text()
    item.click()
    painel = page.get_by_role("dialog", name=nome)
    expect(painel).to_be_visible()
    expect(painel.get_by_role("heading", name="Últimas quedas")).to_be_visible()
    visivel = painel.locator(".teia-historico li:visible, .teia-historico-vazio:visible")
    expect(visivel.first).to_be_visible(timeout=10_000)
    expect(painel.get_by_text("TCP 554")).to_be_visible()
    expect(painel.get_by_role("button", name=re.compile("^(Pausar|Retomar)$"))).to_be_visible()
    page.keyboard.press("Escape")
    expect(painel).to_be_hidden()
    expect(item).to_be_focused()
    assert canvases_da_teia(page) == 0
    assert erros == [], erros


# ---- Fase 3: Novos, Configurações e câmeras do gravador ---------------------------------------

API_JSON = """async ([metodo, caminho, corpo]) => {
    const csrf = document.cookie.split('; ').find((c) => c.startsWith('sentinela_csrf='));
    const r = await fetch('/api/v1' + caminho, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF': csrf ? decodeURIComponent(csrf.split('=')[1]) : '',
        },
        body: corpo === null ? undefined : JSON.stringify(corpo),
    });
    let dados = null;
    try { dados = await r.json(); } catch (e) { dados = null; }
    return {status: r.status, dados};
}"""
SENHA_SMOKE = "s3nha-do-smoke-NAO-pode-voltar"


def api_json(page: Page, metodo: str, caminho: str, corpo: Any = None) -> Any:
    return page.evaluate(API_JSON, [metodo, caminho, corpo])


def abrir_novos(page: Page) -> Any:
    page.get_by_role("tab", name="Novos").click()
    expect(page.get_by_role("tab", name="Novos")).to_have_attribute("aria-selected", "true")
    assert page.url.endswith("#novos"), page.url
    secao = page.locator("#conteudo-novos")
    expect(secao.locator(".nv-cartao").first).to_be_visible(timeout=20_000)
    return secao


def cartao_novo(secao: Any, titulo: str) -> Any:
    exato = re.compile(f"^{re.escape(titulo)}$")
    return secao.locator(".nv-cartao").filter(has=secao.page.locator(".nv-titulo", has_text=exato))


def apagar_equipamentos(page: Page, ids: list[str]) -> None:
    for id_ in ids:
        assert page.evaluate(APAGAR_VIA_API, id_) in (204, 404)


def ids_por_busca(page: Page, termo: str) -> list[str]:
    r = api_json(page, "GET", f"/equipamentos?q={termo}&limit=100")
    assert r["status"] == 200, r
    return [e["id"] for e in r["dados"]["itens"]]


def demo_de_volta(page: Page) -> None:
    """O DELETE de equipamento não vai ao WebSocket: recarrega e confere a demo intacta."""
    page.reload()
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)


def test_novos_mostra_pendentes_com_contador(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    selo = page.locator("#contador-pendentes")
    expect(selo).to_be_visible(timeout=20_000)  # as fontes simuladas já foram coletadas
    secao = abrir_novos(page)
    total = api_json(page, "GET", "/descobertas?status=pendente&limit=1")["dados"]["total"]
    assert total >= 30, total
    expect(selo).to_have_text(f"{total} pendentes")
    expect(secao.locator("#novos-info")).to_have_text(f"Mostrando {total} de {total} pendentes")
    expect(secao.locator(".nv-cartao")).to_have_count(total)
    # confiança com texto (nunca só cor) e "por que" com sinais e pontos em linguagem simples
    for texto in secao.locator(".nv-pct").all_inner_texts():
        assert re.fullmatch(r"\d{1,3}%", texto), texto
    camera = cartao_novo(secao, "ipc-garagem")
    camera.locator("summary").click()
    expect(camera.locator(".nv-sinais li").first).to_contain_text("Hikvision")
    expect(camera.locator(".nv-pontos").first).to_have_text(re.compile(r"^\+\d+ "))
    # canais do gravador agrupados sob ele, recolhíveis
    grupo = secao.get_by_role("button", name=re.compile(r"^Câmeras d"))
    expect(grupo).to_have_attribute("aria-expanded", "true")
    # o gravador da demo já é monitorado: o título usa o nome dele (vem do snapshot)
    expect(grupo).to_contain_text("(já monitorado)")
    filhos = secao.locator(".nv-linha-filho")
    expect(filhos).to_have_count(16)
    expect(filhos.first.locator(".selo-canal")).to_have_text("Canal 1")
    grupo.click()
    expect(grupo).to_have_attribute("aria-expanded", "false")
    expect(filhos).to_have_count(0)
    grupo.click()
    expect(filhos).to_have_count(16)
    assert erros == [], erros


def test_novos_aprovar_vai_para_lista_ao_vivo(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_novos(page)
    antes = int(page.locator("#contador-pendentes").inner_text().split()[0])
    cartao = cartao_novo(secao, "desktop-rh")
    cartao.get_by_label("Classe").select_option(label="Computadores")
    cartao.get_by_label("Nome (opcional)").fill("Desktop RH Smoke")
    ids: list[str] = []
    try:
        with page.expect_response("**/descobertas/*/aprovar") as resposta:
            cartao.get_by_role("button", name="Aprovar desktop-rh").click()
        assert resposta.value.status == 200
        ids.append(resposta.value.json()["id"])
        expect(cartao).to_have_count(0)
        expect(secao.locator("#novos-aviso")).to_contain_text("aprovado")
        expect(page.locator("#contador-pendentes")).to_have_text(f"{antes - 1} pendentes")
        # ao vivo na Lista, sem recarregar
        page.get_by_role("tab", name="Lista").click()
        expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO + 1), timeout=15_000)
        page.get_by_label("Buscar").first.fill("Desktop RH Smoke")
        linha = linhas(page).filter(has_text="Desktop RH Smoke")
        expect(linha).to_have_count(1)
        expect(linha.locator(".col-classe")).to_have_text("Computadores")
        assert erros == [], erros
    finally:
        apagar_equipamentos(page, ids)
    demo_de_volta(page)


def test_novos_ignorar_e_reabrir(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_novos(page)
    cartao = cartao_novo(secao, "desktop-recepcao")
    cartao.get_by_role("button", name="Ignorar desktop-recepcao").focus()
    page.keyboard.press("Enter")  # teclado: o foco não se perde quando o cartão sai
    expect(cartao).to_have_count(0)
    page.wait_for_function("() => !!document.activeElement.closest('#conteudo-novos .nv-cartao')")
    filtro = secao.get_by_role("group", name="Fila de descobertas")
    filtro.get_by_role("button", name="Ignoradas").click()
    expect(filtro.get_by_role("button", name="Ignoradas")).to_have_attribute("aria-pressed", "true")
    expect(cartao).to_have_count(1)
    # na fila de ignoradas só existe "Reabrir"
    expect(cartao.get_by_role("button", name=re.compile("^Aprovar"))).to_have_count(0)
    cartao.get_by_role("button", name="Reabrir desktop-recepcao").click()
    expect(cartao).to_have_count(0)
    filtro.get_by_role("button", name="Pendentes").click()
    expect(cartao).to_have_count(1)
    assert erros == [], erros


def test_novos_lote(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_novos(page)
    nomes = ("pc-almoxarifado", "notebook-diretoria")
    for nome in nomes:
        cartao_novo(secao, nome).get_by_role("checkbox", name=f"Selecionar {nome}").check()
    lote = secao.locator(".nv-lote")
    expect(lote).to_contain_text("2 selecionadas")
    try:
        lote.get_by_role("button", name="Aprovar selecionadas").click()
        expect(secao.locator("#novos-aviso")).to_have_text("2 aprovadas.")
        for nome in nomes:
            expect(cartao_novo(secao, nome)).to_have_count(0)
        expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO + 2), timeout=15_000)
        assert erros == [], erros
    finally:
        for nome in nomes:
            apagar_equipamentos(page, ids_por_busca(page, nome))
    demo_de_volta(page)


def test_novos_lote_respeita_classe_editada(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_novos(page)
    editada, padrao = "desktop-financeiro", "brn3c2b1a"
    sugerida = api_json(page, "GET", "/descobertas?status=pendente&limit=100")["dados"]["itens"]
    classe_padrao = next(d["classe_sugerida"] for d in sugerida if d["nome_sugerido"] == padrao)
    cartao = cartao_novo(secao, editada)
    cartao.get_by_label("Classe").select_option(label="Servidores")
    for nome in (editada, padrao):
        cartao_novo(secao, nome).get_by_role("checkbox", name=f"Selecionar {nome}").check()
    try:
        secao.locator(".nv-lote").get_by_role("button", name="Aprovar selecionadas").click()
        expect(secao.locator("#novos-aviso")).to_have_text("2 aprovadas.")
        for nome in (editada, padrao):
            expect(cartao_novo(secao, nome)).to_have_count(0)
        classes = {}
        for nome in (editada, padrao):
            itens = api_json(page, "GET", f"/equipamentos?q={nome}&limit=10")["dados"]["itens"]
            assert len(itens) == 1, itens
            classes[nome] = itens[0]["classe"]
        # a classe escolhida na linha vale no lote; a outra fica com a sugerida
        assert classes[editada] == "servidor", classes
        assert classes[padrao] == (classe_padrao or "desconhecido"), classes
        assert erros == [], erros
    finally:
        for nome in (editada, padrao):
            apagar_equipamentos(page, ids_por_busca(page, nome))
    demo_de_volta(page)


def test_novos_visualizador_so_leitura(page: Page, alvo: Alvo) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador (SENTINELA_SMOKE_LEITOR_LOGIN/SENHA)")
    erros = vigiar_console(page)
    entrar(page, alvo, alvo.login_leitor, alvo.senha_leitor)
    expect(page.get_by_role("tab", name="Configurações")).to_have_count(0)
    secao = abrir_novos(page)
    expect(secao.locator(".nv-cartao").first.locator(".nv-classe")).to_be_visible()
    for papel in ("button", "checkbox", "combobox"):
        acoes = secao.locator(".nv-lista").get_by_role(
            papel, name=re.compile("^(Aprovar|Ignorar|Sondar|Declarar|Selecionar|Classe)")
        )
        expect(acoes).to_have_count(0)
    expect(secao.locator(".nv-lote")).to_be_hidden()
    # link direto para Configurações: o visualizador volta para a Lista
    page.goto("/index.html#configuracoes")
    page.reload()
    expect(page.get_by_role("tab", name="Lista")).to_have_attribute("aria-selected", "true")
    assert page.url.endswith("#lista"), page.url
    expect(page.locator("#conteudo-configuracoes")).to_be_hidden()
    assert erros == [], erros


def test_novos_fora_das_subredes_desabilita_aprovar(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_novos(page)
    cartao = cartao_novo(secao, "tv-sala-reuniao")
    expect(cartao.get_by_text("fora das sub-redes monitoradas")).to_be_visible()
    aprovar = cartao.get_by_role("button", name="Aprovar tv-sala-reuniao")
    expect(aprovar).to_be_disabled()
    expect(cartao.get_by_role("checkbox")).to_be_disabled()
    declarar = cartao.get_by_role("button", name="Declarar sub-rede 10.99.70.0/24")
    expect(declarar).to_be_visible()
    try:
        declarar.click()
        expect(secao.locator("#novos-aviso")).to_contain_text("Sub-rede 10.99.70.0/24 declarada")
        expect(cartao.get_by_text("fora das sub-redes monitoradas")).to_be_hidden()
        expect(cartao.get_by_role("button", name="Aprovar tv-sala-reuniao")).to_be_enabled()
        assert erros == [], erros
    finally:
        subredes = api_json(page, "GET", "/subredes")["dados"]
        for s in subredes:
            if s["cidr"] == "10.99.70.0/24":
                assert api_json(page, "DELETE", f"/subredes/{s['id']}")["status"] == 204


def test_configuracoes_cria_fonte_testa_e_coleta(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    page.get_by_role("tab", name="Configurações").click()
    secao = page.locator("#conteudo-configuracoes")
    expect(secao.locator(".cfg-fonte").first).to_be_visible(timeout=15_000)
    secao.get_by_role("button", name="Nova fonte").click()
    dialogo = page.get_by_role("dialog", name="Nova fonte")
    expect(dialogo).to_be_visible()
    expect(dialogo.get_by_label("Tipo")).to_be_focused()  # foco entra no diálogo
    dialogo.get_by_role("button", name="Criar fonte").click()  # vazio: erros por campo
    expect(dialogo.get_by_text("Informe um nome.")).to_be_visible()
    expect(dialogo.get_by_label("Nome")).to_have_attribute("aria-invalid", "true")
    dialogo.get_by_label("Tipo").select_option("mikrotik")
    dialogo.get_by_label("Nome").fill("Roteador Smoke")
    dialogo.get_by_label("Endereço IP").fill("10.99.40.21")
    dialogo.get_by_label("Usuário").fill("api-smoke")
    dialogo.get_by_label("Senha", exact=True).fill(SENHA_SMOKE)
    # desativada: o orquestrador coleta uma fonte ativa nova no tick seguinte (5 s) e o
    # "Coletar agora" que viesse depois disso levaria 429 (no máximo 1 coleta a cada 30 s).
    # Assim a única coleta é a pedida pelo botão.
    expect(dialogo.get_by_label("Fonte ativa")).to_be_checked()  # padrão de fonte nova
    dialogo.get_by_label("Fonte ativa").uncheck()
    dialogo.get_by_role("button", name="Criar fonte").click()
    expect(dialogo).to_be_hidden()
    cartao = secao.locator(".cfg-fonte").filter(has_text="Roteador Smoke")
    expect(cartao).to_have_count(1)
    try:
        expect(cartao.locator(".cfg-ficha").first).to_contain_text("10.99.40.21:8729")
        expect(cartao).to_contain_text("TLS")
        expect(cartao).to_contain_text("Desativada")
        expect(cartao).to_contain_text("nunca")
        cartao.get_by_role("button", name="Testar Roteador Smoke").click()
        teste = cartao.locator(".cfg-teste")
        expect(teste).to_contain_text("Conexão funcionando", timeout=15_000)
        expect(teste).to_contain_text("Roteador Smoke")
        expect(teste).to_contain_text("simulada")
        expect(teste).to_contain_text("nenhum pacote sai para a rede")
        expect(teste).to_be_focused()
        cartao.get_by_role("button", name="Coletar agora Roteador Smoke").click()
        expect(secao.locator("#cfg-aviso")).to_contain_text("Coleta pedida")
        # o fim chega pelo WebSocket ("fonte"/"coletada") e o cartão relê GET /fontes
        expect(cartao.locator(".cfg-ficha").first).to_contain_text("agora", timeout=20_000)
        assert SENHA_SMOKE not in page.content()
        assert erros == [], erros
    finally:
        cartao.get_by_role("button", name="Remover Roteador Smoke").click()
        confirmar = page.get_by_role("dialog", name="Remover Roteador Smoke?")
        expect(confirmar).to_be_visible()
        confirmar.get_by_role("button", name="Remover").click()
        expect(cartao).to_have_count(0)


def test_configuracoes_lista_atrasada_nao_apaga_fonte_nova(page: Page, alvo: Alvo) -> None:
    """Flaky de ``test_configuracoes_cria_fonte_testa_e_coleta``: um GET /fontes disparado por
    um "coletada" (a demo coleta sem parar) antes da criação e que responde DEPOIS dela
    sobrescrevia a lista e fazia a fonte nova sumir do painel."""
    from conftest import PonteWs

    erros = vigiar_console(page)
    ponte = PonteWs(page)
    entrar(page, alvo)
    page.get_by_role("tab", name="Configurações").click()
    secao = page.locator("#conteudo-configuracoes")
    expect(secao.locator(".cfg-fonte").first).to_be_visible(timeout=15_000)
    seguradas: list[Any] = []

    def segurar(rota: Route) -> None:
        if rota.request.method != "GET" or seguradas:
            rota.continue_()
            return
        seguradas.append((rota, rota.fetch()))  # resposta de ANTES da criação, entregue depois

    page.route(re.compile(r".*/api/v1/fontes$"), segurar)
    ponte.injetar({"tipo": "fonte", "acao": "coletada", "id": "qualquer"})
    page.wait_for_timeout(300)  # o GET antigo já foi ao servidor e voltou, preso na rota
    assert len(seguradas) == 1
    secao.get_by_role("button", name="Nova fonte").click()
    dialogo = page.get_by_role("dialog", name="Nova fonte")
    dialogo.get_by_label("Tipo").select_option("mikrotik")
    dialogo.get_by_label("Nome").fill("Roteador Atrasado")
    dialogo.get_by_label("Endereço IP").fill("10.99.40.22")
    dialogo.get_by_label("Usuário").fill("api-smoke")
    dialogo.get_by_label("Senha", exact=True).fill(SENHA_SMOKE)
    dialogo.get_by_role("button", name="Criar fonte").click()
    cartao = secao.locator(".cfg-fonte").filter(has_text="Roteador Atrasado")
    try:
        expect(cartao).to_have_count(1)
        rota, resposta = seguradas[0]
        rota.fulfill(response=resposta)  # a lista velha chega depois da nova
        page.wait_for_timeout(500)
        assert cartao.count() == 1, "a lista atrasada apagou a fonte recém-criada"
        assert erros == [], erros
    finally:
        page.unroute(re.compile(r".*/api/v1/fontes$"))
        cartao.get_by_role("button", name="Remover Roteador Atrasado").click()
        confirmar = page.get_by_role("dialog", name="Remover Roteador Atrasado?")
        expect(confirmar).to_be_visible()
        confirmar.get_by_role("button", name="Remover").click()
        expect(cartao).to_have_count(0)


def test_configuracoes_confiar_certificado_e_orientacao_r5(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    impressao = "ab" * 32
    page.route(
        "**/api/v1/fontes/*/testar",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=(
                '{"ok": false, "identidade": null, "versao": null, "avisos": [],'
                f' "impressao_tls": "{impressao}",'
                ' "erro": "o RouterOS não apresentou certificado TLS"}'
            ),
        ),
    )
    confiados: list[str] = []

    def confiar(route: Route) -> None:
        confiados.append(route.request.post_data or "")
        route.fulfill(
            status=409,
            content_type="application/json",
            body='{"detail": "A impressão não confere com a do último teste; teste de novo."}',
        )

    page.route("**/api/v1/fontes/*/confiar", confiar)
    criada = api_json(
        page,
        "POST",
        "/fontes",
        {
            "tipo": "mikrotik",
            "nome": "RouterOS Smoke TLS",
            "host": "10.99.40.22",
            "credencial": {"usuario": "api", "senha": SENHA_SMOKE},
        },
    )
    assert criada["status"] == 201, criada
    try:
        page.get_by_role("tab", name="Configurações").click()
        cartao = page.locator("#conteudo-configuracoes .cfg-fonte").filter(
            has_text="RouterOS Smoke TLS"
        )
        expect(cartao).to_be_visible(timeout=15_000)
        cartao.get_by_role("button", name="Testar RouterOS Smoke TLS").click()
        teste = cartao.locator(".cfg-teste")
        expect(teste).to_contain_text("O teste falhou")
        expect(teste).to_contain_text("/certificate")  # R5: instalar o certificado no RouterOS
        expect(teste).to_contain_text("api-ssl")
        expect(teste.locator("code")).to_have_text(":".join(["AB"] * 32))
        teste.get_by_role("button", name="Confiar neste certificado").click()
        expect(cartao.get_by_role("alert")).to_contain_text("teste de novo")
        assert confiados and impressao in confiados[0]
        # o 409 simulado aparece como "Failed to load resource": é o próprio cenário
        assert [e for e in erros if "status of 409" not in e] == [], erros
    finally:
        assert api_json(page, "DELETE", f"/fontes/{criada['dados']['id']}")["status"] == 204


def test_senha_nao_volta_no_formulario(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    criada = api_json(
        page,
        "POST",
        "/fontes",
        {
            "tipo": "hikvision",
            "nome": "NVR Smoke Senha",
            "host": "10.99.50.21",
            "tls": False,
            "credencial": {"usuario": "admin-smoke", "senha": SENHA_SMOKE},
        },
    )
    assert criada["status"] == 201, criada
    try:
        page.get_by_role("tab", name="Configurações").click()
        cartao = page.locator("#conteudo-configuracoes .cfg-fonte").filter(
            has_text="NVR Smoke Senha"
        )
        cartao.get_by_role("button", name="Editar NVR Smoke Senha").click()
        dialogo = page.get_by_role("dialog", name="Editar fonte")
        expect(dialogo).to_be_visible()
        expect(dialogo.get_by_label("Nome")).to_have_value("NVR Smoke Senha")
        expect(dialogo.get_by_label("Tipo")).to_be_disabled()
        senha = dialogo.get_by_label("Senha", exact=True)
        expect(senha).to_have_value("")
        expect(senha).to_have_attribute("type", "password")
        expect(dialogo.get_by_label("Usuário")).to_have_value("")
        expect(dialogo).to_contain_text("deixe em branco para manter")
        assert SENHA_SMOKE not in page.content()
        # salvar sem senha mantém a credencial (a API diz só "definida")
        dialogo.get_by_label("Nome").fill("NVR Smoke Senha 2")
        dialogo.get_by_role("button", name="Salvar").click()
        expect(dialogo).to_be_hidden()
        fontes = api_json(page, "GET", "/fontes")["dados"]
        fonte = next(f for f in fontes if f["id"] == criada["dados"]["id"])
        assert fonte["nome"] == "NVR Smoke Senha 2" and fonte["credencial_definida"] is True
        assert SENHA_SMOKE not in str(fontes)
        assert erros == [], erros
    finally:
        assert api_json(page, "DELETE", f"/fontes/{criada['dados']['id']}")["status"] == 204


def test_faixa_de_varredura_e_cancelar(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    page.get_by_role("tab", name="Configurações").click()
    secao = page.locator("#conteudo-configuracoes")
    expect(secao).to_contain_text("pedido ARP")
    chave = secao.get_by_role("switch", name="Permitir varredura em 10.99.10.0/24")
    expect(chave).to_have_attribute("aria-checked", "false")
    faixa = page.locator("#faixa-varredura")
    try:
        chave.click()
        expect(chave).to_have_attribute("aria-checked", "true")
        secao.get_by_role("button", name="Iniciar varredura em 10.99.10.0/24").click()
        expect(faixa).to_be_visible(timeout=10_000)
        expect(faixa).to_contain_text(
            re.compile(r"Varredura lenta em 10\.99\.10\.0/24: \d{1,3}%\.")
        )
        # a faixa vale em todas as abas
        page.get_by_role("tab", name="Lista").click()
        expect(faixa).to_be_visible()
        faixa.get_by_role("button", name="Cancelar").click()
        expect(faixa).to_be_hidden(timeout=10_000)
        assert api_json(page, "GET", "/varredura")["dados"]["rodando"] is False
        assert erros == [], erros
    finally:
        api_json(page, "DELETE", "/varredura")
        for s in api_json(page, "GET", "/subredes")["dados"]:
            if s["cidr"] == "10.99.10.0/24" and s["permite_varredura"]:
                api_json(page, "PATCH", f"/subredes/{s['id']}", {"permite_varredura": False})


def test_organograma_camera_sob_gravador(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    gravador_antes = ids_por_busca(page, "10.99.50.10")
    secao = abrir_novos(page)
    canal = secao.locator(".nv-linha-filho").first
    nome = "Canal Smoke Portão"
    canal.get_by_label("Nome (opcional)").fill(nome)
    ids: list[str] = []
    try:
        canal.get_by_role("button", name=re.compile("^Aprovar")).click()
        expect(secao.locator("#novos-aviso")).to_contain_text("aprovado", timeout=10_000)
        ids = ids_por_busca(page, nome)
        assert len(ids) == 1, ids
        org = abrir_organograma(page)
        org.get_by_label("Buscar").fill(nome)
        cameras = org.locator('.org-cartao[data-slug="camera"]')
        grupo = cameras.locator(".org-grupo-filhos")
        expect(grupo).to_have_count(1, timeout=10_000)
        expect(grupo.locator(".org-grupo-titulo")).to_contain_text("Atrás de")
        item = grupo.locator(".org-item")
        expect(item).to_have_text(re.compile(nome))
        item.click()
        dialogo = page.get_by_role("dialog", name=nome)
        expect(dialogo).to_be_visible()
        expect(dialogo.locator(".equip-atras")).to_have_text(
            re.compile(r"^Atrás do gravador .+, canal \d+$")
        )
        page.keyboard.press("Escape")
        org.get_by_label("Buscar").fill("")
        assert erros == [], erros
    finally:
        apagar_equipamentos(page, ids)
        # o gravador aprovado junto (se não existia antes) também sai: a demo volta a 300
        for id_ in ids_por_busca(page, "10.99.50.10"):
            if id_ not in gravador_antes:
                apagar_equipamentos(page, [id_])
    demo_de_volta(page)


@pytest.mark.parametrize("aba", ["novos", "configuracoes"])
def test_link_direto_novos_e_config_sem_piscar_a_lista(page: Page, alvo: Alvo, aba: str) -> None:
    entrar(page, alvo)
    page.route("**/vendor/alpine-csp.min.js", lambda r: r.abort())
    page.goto(f"/index.html#{aba}")
    page.reload()
    assert page.evaluate("document.documentElement.dataset.aba") == aba
    expect(page.locator("#conteudo-lista")).to_be_hidden()
    expect(page.locator(".aviso-sem-alpine")).to_be_visible(timeout=10_000)
    page.unroute("**/vendor/alpine-csp.min.js")
    erros = vigiar_console(page)
    page.reload()
    painel = page.locator(f"#conteudo-{aba}")
    expect(painel).to_be_visible(timeout=15_000)
    expect(page.locator("#conteudo-lista")).to_be_hidden()
    expect(page.get_by_role("tabpanel")).to_have_count(1)
    page.wait_for_timeout(1000)
    assert erros == [], erros


def test_novos_2000_pendentes_pagina(browser: Browser, alvo_fila_grande: Alvo) -> None:
    contexto = browser.new_context(ignore_https_errors=True, base_url=alvo_fila_grande.url)
    try:
        page = contexto.new_page()
        erros = vigiar_console(page)
        page.goto("/login.html")
        page.get_by_label("Login").fill(alvo_fila_grande.login)
        page.get_by_label("Senha").fill(alvo_fila_grande.senha)
        page.get_by_role("button", name="Entrar").click()
        page.wait_for_url("**/index.html")
        expect(page.locator("#contador-pendentes")).to_have_text("2000 pendentes", timeout=15_000)
        pedidos: list[str] = []
        page.on("request", lambda r: pedidos.append(r.url) if "/descobertas" in r.url else None)
        secao = abrir_novos(page)
        expect(secao.locator(".nv-cartao")).to_have_count(100)
        expect(secao.locator("#novos-info")).to_have_text("Mostrando 100 de 2000 pendentes")
        assert all("limit=100" in u for u in pedidos), pedidos
        secao.get_by_role("button", name="Carregar mais").click()
        expect(secao.locator(".nv-cartao")).to_have_count(200)
        expect(secao.locator("#novos-info")).to_have_text("Mostrando 200 de 2000 pendentes")
        expect(page.locator("#contador-pendentes")).to_have_text("2000 pendentes")
        assert erros == [], erros
    finally:
        contexto.close()


# ---------- Fase 4A: inalcançável e "Depende de" ----------
DEP_ALFA = "Dep Smoke Switch Alfa"
DEP_BETA = "Dep Smoke Ponto Beta"


def criar_dependentes(page: Page) -> list[str]:
    """Dois equipamentos soltos da classe iot (10.99.60.24x) para os testes de 'Depende de'."""
    ids: list[str] = []
    for nome, ip in ((DEP_ALFA, "10.99.60.241"), (DEP_BETA, "10.99.60.242")):
        criado = page.evaluate(CRIAR_VIA_API, {"nome": nome, "ip": ip, "classe": "iot"})
        assert criado["status"] == 201, criado
        ids.append(criado["corpo"]["id"])
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO + 2), timeout=30_000)
    return ids


def abrir_ficha_no_organograma(page: Page, nome: str) -> Any:
    org = abrir_organograma(page)
    org.get_by_label("Buscar").fill(nome)
    item = org.locator(".org-item").filter(has=page.locator(".org-nome", has_text=nome))
    expect(item).to_have_count(1, timeout=10_000)
    item.click()
    dialogo = page.get_by_role("dialog", name=nome)
    expect(dialogo).to_be_visible()
    return dialogo


def test_depende_de_define_e_mostra_na_ficha(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    ids = criar_dependentes(page)
    try:
        dialogo = abrir_ficha_no_organograma(page, DEP_BETA)
        expect(dialogo.locator(".equip-dep .dep-atual")).to_have_text("Nenhum")
        dialogo.get_by_role("button", name="Alterar dependência").click()
        dialogo.get_by_label("Buscar equipamento").fill("alfa")
        opcao = dialogo.get_by_role("button", name=re.compile(DEP_ALFA))
        expect(opcao).to_have_count(1)
        # o próprio equipamento nunca é oferecido
        expect(dialogo.get_by_role("button", name=re.compile(DEP_BETA))).to_have_count(0)
        opcao.click()
        expect(dialogo.locator(".dep-escolhido")).to_have_text(f"Novo pai: {DEP_ALFA}")
        dialogo.get_by_role("button", name="Salvar").click()
        expect(dialogo.locator(".equip-dep .dep-atual")).to_have_text(DEP_ALFA, timeout=10_000)
        expect(dialogo.locator(".dep-editor")).to_be_hidden()
        # o servidor guardou o vínculo
        r = api_json(page, "GET", f"/equipamentos/{ids[1]}")
        assert r["dados"]["pai_id"] == ids[0], r
        # o pai agora não pode escolher o filho como pai (fecharia um ciclo)
        page.keyboard.press("Escape")
        dialogo = abrir_ficha_no_organograma(page, DEP_ALFA)
        dialogo.get_by_role("button", name="Alterar dependência").click()
        dialogo.get_by_label("Buscar equipamento").fill("beta")
        expect(dialogo.get_by_text("Nenhum equipamento encontrado.")).to_be_visible()
        page.keyboard.press("Escape")
        assert erros == [], erros
    finally:
        apagar_equipamentos(page, ids[::-1])  # filho antes do pai
    demo_de_volta(page)


def test_depende_de_ciclo_mostra_erro_da_api(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    ids = criar_dependentes(page)
    try:
        # a API é quem decide o ciclo: devolve a recusa e o painel mostra a mensagem dela
        page.route(
            "**/api/v1/equipamentos/*",
            lambda route: (
                route.fulfill(
                    status=422,
                    content_type="application/json",
                    body='{"detail": "Dependência circular."}',
                )
                if route.request.method == "PATCH"
                else route.continue_()
            ),
        )
        dialogo = abrir_ficha_no_organograma(page, DEP_BETA)
        dialogo.get_by_role("button", name="Alterar dependência").click()
        dialogo.get_by_label("Buscar equipamento").fill("alfa")
        dialogo.get_by_role("button", name=re.compile(DEP_ALFA)).click()
        dialogo.get_by_role("button", name="Salvar").click()
        expect(
            dialogo.get_by_role("alert").filter(has_text="Dependência circular.")
        ).to_be_visible()
        expect(dialogo.locator(".equip-dep .dep-atual")).to_have_text("Nenhum")  # nada mudou
        assert api_json(page, "GET", f"/equipamentos/{ids[1]}")["dados"]["pai_id"] is None
        page.keyboard.press("Escape")
        assert [e for e in erros if "422" not in e] == [], erros
    finally:
        page.unroute("**/api/v1/equipamentos/*")
        apagar_equipamentos(page, ids[::-1])  # filho antes do pai
    demo_de_volta(page)


def test_camera_de_gravador_depende_de_so_leitura(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    gravador_antes = ids_por_busca(page, "10.99.50.10")
    secao = abrir_novos(page)
    canal = secao.locator(".nv-linha-filho").first
    nome = "Canal Smoke Depende"
    canal.get_by_label("Nome (opcional)").fill(nome)
    ids: list[str] = []
    try:
        canal.get_by_role("button", name=re.compile("^Aprovar")).click()
        expect(secao.locator("#novos-aviso")).to_contain_text("aprovado", timeout=10_000)
        ids = ids_por_busca(page, nome)
        assert len(ids) == 1, ids
        dialogo = abrir_ficha_no_organograma(page, nome)
        expect(dialogo.get_by_text("Depende de", exact=True)).to_be_visible()
        expect(dialogo.locator(".equip-dep")).to_contain_text("somente leitura")
        expect(dialogo.get_by_role("button", name="Alterar dependência")).to_be_hidden()
        page.keyboard.press("Escape")
        assert erros == [], erros
    finally:
        apagar_equipamentos(page, ids[::-1])  # filho antes do pai
        for id_ in ids_por_busca(page, "10.99.50.10"):
            if id_ not in gravador_antes:
                apagar_equipamentos(page, [id_])
    demo_de_volta(page)


def test_visualizador_nao_edita_depende_de(page: Page, alvo: Alvo) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador (SENTINELA_SMOKE_LEITOR_LOGIN/SENHA)")
    entrar(page, alvo)
    ids = criar_dependentes(page)
    try:
        page.context.clear_cookies()
        entrar(page, alvo, alvo.login_leitor, alvo.senha_leitor, TOTAL_DEMO + 2)
        dialogo = abrir_ficha_no_organograma(page, DEP_BETA)
        expect(dialogo.get_by_text("Depende de", exact=True)).to_be_visible()  # só leitura
        expect(dialogo.get_by_role("button", name="Alterar dependência")).to_be_hidden()
        expect(dialogo.get_by_label("Buscar equipamento")).to_be_hidden()
        page.keyboard.press("Escape")
    finally:
        page.context.clear_cookies()
        entrar(page, alvo, total=TOTAL_DEMO + 2)
        apagar_equipamentos(page, ids[::-1])  # filho antes do pai
    demo_de_volta(page)


def test_legenda_tem_inalcancavel_com_icone(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    abrir_teia(page)
    item = page.locator(".teia-legenda li.st-inalcancavel")
    expect(item).to_have_text("inalcançável")
    expect(item.locator("use")).to_have_attribute("href", "#i-inalcancavel")
    expect(item.locator("svg")).to_be_visible()
    # o símbolo existe de verdade (um <use> sem destino ficaria invisível)
    assert page.evaluate("!!document.getElementById('i-inalcancavel')")
    # contador e filtro da Lista também falam do estado novo
    page.get_by_role("tab", name="Lista").click()
    expect(page.locator("#contador-inalcancavel")).to_be_visible()
    expect(
        page.get_by_role("combobox", name="Estado").locator("option", has_text="Inalcançável")
    ).to_have_count(1)
    assert erros == [], erros


@pytest.mark.parametrize("largura", [768, 800, 1024, 1199, 1200, 1366])
def test_lista_cabe_no_cartao_sem_rolagem_interna(
    browser: Browser, alvo: Alvo, largura: int
) -> None:
    contexto = browser.new_context(
        viewport={"width": largura, "height": 900}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        entrar(page, alvo)
        expect(linhas(page)).to_have_count(POR_PAGINA)
        cabe = page.evaluate(
            "(() => { const c = document.querySelector('.painel-lista');"
            " return c.scrollWidth <= c.clientWidth; })()"
        )
        assert cabe, f"a tabela passa da borda do cartão em {largura} px"
    finally:
        contexto.close()


def test_cancelar_depende_de_devolve_o_foco_ao_botao(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    ids = criar_dependentes(page)
    try:
        dialogo = abrir_ficha_no_organograma(page, DEP_BETA)
        alterar = dialogo.get_by_role("button", name="Alterar dependência")
        alterar.click()
        dialogo.get_by_role("button", name="Cancelar").click()
        expect(dialogo.locator(".dep-editor")).to_be_hidden()
        expect(alterar).to_be_focused()
        page.keyboard.press("Escape")
    finally:
        apagar_equipamentos(page, ids[::-1])
    demo_de_volta(page)


# ---------- Fase 4A: aba Alertas, silêncios e Telegram ----------
TOKEN_FICTICIO = "1234567890:AAExampleExampleExampleExampleExample12"  # noqa: S105 - só o formato, nunca um token real


def abrir_alertas(page: Page) -> Any:
    page.get_by_role("tab", name=re.compile("^Alertas")).click()
    expect(page.get_by_role("tab", name=re.compile("^Alertas"))).to_have_attribute(
        "aria-selected", "true"
    )
    assert page.url.endswith("#alertas"), page.url
    secao = page.locator("#conteudo-alertas")
    expect(secao.locator("li.al-linha").first).to_be_visible(timeout=20_000)
    return secao


def linha_do_alerta(secao: Any, alerta: dict[str, Any]) -> Any:
    return secao.locator(f'li.al-linha[data-id="{alerta["id"]}"]')


def test_aba_alertas_lista_abertos_e_contador_no_menu(
    page: Page, alvo: Alvo, alertas_semeados: dict[str, dict[str, Any]]
) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    selo = page.locator("#contador-alertas")
    expect(selo).to_be_visible(timeout=20_000)
    expect(selo).to_have_text(re.compile(r"^\d+ abertos$"))
    assert int(selo.inner_text().split()[0]) >= 3  # semeados abertos (a demo pode somar ou fechar)
    secao = abrir_alertas(page)
    a = alertas_semeados
    aberto = linha_do_alerta(secao, a["aberto"])
    expect(aberto.locator(".al-texto")).to_have_text(a["aberto"]["texto"])
    # estado nunca só por cor: ícone + rótulo; envio e afetados em texto
    expect(aberto.locator(".al-marca")).to_have_text("Aberto")
    expect(aberto.locator(".al-marca svg")).to_be_visible()
    expect(aberto).to_contain_text("3 afetados")
    expect(aberto.locator(".al-envio")).to_have_text("Telegram enviado")
    instavel = linha_do_alerta(secao, a["instavel"])
    expect(instavel.locator(".al-marca")).to_have_text("Instável")
    expect(instavel).to_contain_text("Reconhecido por admin")
    expect(linha_do_alerta(secao, a["silenciado"]).locator(".al-envio")).to_have_text("Silenciado")
    expect(linha_do_alerta(secao, a["pendente"]).locator(".al-envio")).to_have_text(
        "Telegram pendente"
    )
    expect(linha_do_alerta(secao, a["falhou"]).locator(".al-envio")).to_have_text("Telegram falhou")
    # o filtro padrão é "abertos": o alerta já resolvido não aparece
    expect(linha_do_alerta(secao, a["fechado"])).to_have_count(0)
    assert erros == [], erros


def test_alertas_filtros_e_abrir_afetados(
    page: Page, alvo: Alvo, alertas_semeados: dict[str, dict[str, Any]]
) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_alertas(page)
    a = alertas_semeados
    secao.get_by_role("button", name="Todos", exact=True).click()
    fechado = linha_do_alerta(secao, a["fechado"])
    expect(fechado).to_be_visible()
    expect(fechado.locator(".al-marca")).to_have_text("Resolvido")
    expect(fechado).to_contain_text("durou 2 min")
    secao.get_by_role("button", name="Reconhecidos", exact=True).click()
    expect(linha_do_alerta(secao, a["instavel"])).to_be_visible()
    expect(linha_do_alerta(secao, a["aberto"])).to_have_count(0)
    # classe e período: o alerta semeado continua na lista
    secao.get_by_role("button", name="Todos", exact=True).click()
    eq = api_json(page, "GET", f"/equipamentos/{a['aberto']['equipamento_id']}")["dados"]
    secao.get_by_label("Classe").select_option(eq["classe"])
    expect(linha_do_alerta(secao, a["aberto"])).to_be_visible()
    secao.get_by_label("Período").select_option("24h")
    expect(linha_do_alerta(secao, a["aberto"])).to_be_visible()
    secao.get_by_label("Classe").select_option("")
    # afetados: abre, lista os 3 e fecha
    aberto = linha_do_alerta(secao, a["aberto"])
    botao = aberto.locator(".al-acoes button").first  # o nome acessível muda ao abrir
    expect(botao).to_have_text("Ver afetados")
    botao.click()
    expect(botao).to_have_text("Ocultar afetados")
    expect(botao).to_have_attribute("aria-expanded", "true")
    expect(aberto.locator(".al-afetados li")).to_have_count(3)
    expect(aberto.locator(".al-afetados li").first.locator(".estado")).not_to_be_empty()
    botao.click()
    expect(botao).to_have_attribute("aria-expanded", "false")
    expect(aberto.locator(".al-detalhe")).to_be_hidden()
    assert erros == [], erros


def test_reconhecer_atualiza_ao_vivo(page: Page, alvo: Alvo, novo_alerta: Any) -> None:
    erros = vigiar_console(page)
    pelo_botao, pela_api = novo_alerta(), novo_alerta()
    entrar(page, alvo)
    secao = abrir_alertas(page)
    a, b = linha_do_alerta(secao, pelo_botao), linha_do_alerta(secao, pela_api)
    expect(a).to_be_visible()
    a.get_by_role("button", name=re.compile("^Reconhecer")).click()
    expect(a).to_contain_text("Reconhecido por admin")
    expect(a.get_by_role("button", name=re.compile("^Reconhecer"))).to_have_count(0)
    # outra origem (aqui, a API direto): a linha muda sem recarregar a página
    expect(b.get_by_role("button", name=re.compile("^Reconhecer"))).to_have_count(1)
    r = api_json(page, "POST", f"/alertas/{pela_api['id']}/reconhecer")
    assert r["status"] == 200, r
    expect(b).to_contain_text("Reconhecido por admin")
    assert erros == [], erros


def abrir_dialogo_silencio(page: Page, secao: Any) -> Any:
    secao.get_by_role("button", name="Silenciar ou manutenção").click()
    dialogo = page.locator("dialog[open]")
    expect(dialogo).to_be_visible()
    return dialogo


def escolher_equipamento(dialogo: Any, nome: str) -> None:
    dialogo.get_by_label("Buscar equipamento").fill(nome[:18])
    dialogo.get_by_role("button", name=re.compile(re.escape(nome))).click()
    expect(dialogo.locator("#sil-alvo-nome")).to_have_text(nome)


def test_silenciar_1h_aparece_e_encerrar(page: Page, alvo: Alvo, alertas_semeados: Any) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    nome = "Switch Torre Silêncio"
    criado = page.evaluate(CRIAR_VIA_API, {"nome": nome, "ip": "10.99.60.231", "classe": "iot"})
    assert criado["status"] == 201, criado
    try:
        expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO + 1), timeout=15_000)
        secao = abrir_alertas(page)
        dialogo = abrir_dialogo_silencio(page, secao)
        # sem alvo: erro no formulário, nada enviado
        dialogo.get_by_role("button", name="Silenciar", exact=True).click()
        expect(dialogo.locator("#sil-alvo-erro")).to_have_text("Escolha o equipamento.")
        escolher_equipamento(dialogo, nome)
        dialogo.get_by_label("Por quanto tempo").select_option("1h")
        dialogo.get_by_label("Motivo (opcional)").fill("troca do nobreak")
        dialogo.get_by_role("button", name="Silenciar", exact=True).click()
        expect(dialogo).to_have_count(0)
        item = secao.locator("li.al-silencio").filter(has_text=nome)
        expect(item).to_be_visible(timeout=10_000)
        expect(item.locator(".al-tipo")).to_have_text("Silêncio")
        # "Até 14:32" no mesmo dia; "Até 19/11 00:10" quando 1 h depois cruza a meia-noite
        # (formato certo do app: horaNoFuso põe a data se o dia mudou). Aceita os dois.
        expect(item).to_contain_text(re.compile(r"Até (\d{2}/\d{2} )?\d{2}:\d{2}"))
        expect(item).to_contain_text("troca do nobreak")
        item.get_by_role("button", name=re.compile("^Encerrar")).click()
        expect(item).to_have_count(0, timeout=10_000)
        assert api_json(page, "GET", "/silencios")["dados"] == []
        assert erros == [], erros
    finally:
        apagar_equipamentos(page, [criado["corpo"]["id"]])
        demo_de_volta(page)


def test_criar_manutencao_pausa_e_mostra(page: Page, alvo: Alvo, alertas_semeados: Any) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    nome = "Impressora em manutenção do bloco B"
    criado = page.evaluate(CRIAR_VIA_API, {"nome": nome, "ip": "10.99.60.232", "classe": "iot"})
    assert criado["status"] == 201, criado
    eid = criado["corpo"]["id"]
    try:
        expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO + 1), timeout=15_000)
        secao = abrir_alertas(page)
        dialogo = abrir_dialogo_silencio(page, secao)
        dialogo.get_by_role("button", name="Manutenção", exact=True).click()
        expect(dialogo.get_by_role("heading", name="Janela de manutenção")).to_be_visible()
        expect(dialogo).to_contain_text("também pausa a checagem")
        escolher_equipamento(dialogo, nome)
        # personalizado: o fim tem de estar no futuro e em até 30 dias
        dialogo.get_by_label("Por quanto tempo").select_option("personalizado")
        dialogo.get_by_role("button", name="Iniciar manutenção").click()
        expect(dialogo.locator("#sil-fim-erro")).to_have_text("Informe quando termina.")
        dialogo.get_by_label("Termina em").fill("2099-01-01T10:00")
        dialogo.get_by_role("button", name="Iniciar manutenção").click()
        expect(dialogo.locator("#sil-fim-erro")).to_have_text("No máximo 30 dias.")
        dialogo.get_by_label("Por quanto tempo").select_option("4h")
        dialogo.get_by_role("button", name="Iniciar manutenção").click()
        expect(dialogo).to_have_count(0)
        item = secao.locator("li.al-silencio").filter(has_text=nome)
        expect(item).to_be_visible(timeout=10_000)
        expect(item.locator(".al-tipo")).to_have_text("Manutenção")
        expect(item).to_contain_text("1 equipamento pausado")
        assert api_json(page, "GET", f"/equipamentos/{eid}")["dados"]["estado"] == "pausado"
        item.get_by_role("button", name=re.compile("^Encerrar")).click()
        expect(item).to_have_count(0, timeout=10_000)
        assert api_json(page, "GET", f"/equipamentos/{eid}")["dados"]["estado"] != "pausado"
        assert erros == [], erros
    finally:
        apagar_equipamentos(page, [eid])
        demo_de_volta(page)


def test_visualizador_ve_alertas_sem_botoes(
    page: Page, alvo: Alvo, alertas_semeados: dict[str, dict[str, Any]]
) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador (SENTINELA_SMOKE_LEITOR_LOGIN/SENHA)")
    erros = vigiar_console(page)
    entrar(page, alvo, alvo.login_leitor, alvo.senha_leitor)
    secao = abrir_alertas(page)
    aberto = linha_do_alerta(secao, alertas_semeados["aberto"])
    expect(aberto).to_be_visible()
    expect(aberto.get_by_role("button", name="Ver afetados")).to_be_visible()
    for nome in (
        re.compile("^Reconhecer"),
        re.compile("^Silenciar"),
        re.compile("^Encerrar"),
        re.compile("manutenção$"),
    ):
        expect(secao.get_by_role("button", name=nome)).to_have_count(0)
    expect(page.get_by_role("tab", name="Configurações")).to_have_count(0)
    assert erros == [], erros


def test_deep_link_alertas_sem_piscar_lista(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    page.route("**/vendor/alpine-csp.min.js", lambda r: r.abort())
    page.goto("/index.html#alertas")
    page.reload()
    assert page.evaluate("document.documentElement.dataset.aba") == "alertas"
    expect(page.locator("#conteudo-lista")).to_be_hidden()
    expect(page.locator(".aviso-sem-alpine")).to_be_visible(timeout=10_000)
    page.unroute("**/vendor/alpine-csp.min.js")
    erros = vigiar_console(page)
    page.reload()
    expect(page.locator("#conteudo-alertas")).to_be_visible(timeout=15_000)
    expect(page.locator("#conteudo-lista")).to_be_hidden()
    expect(page.get_by_role("tabpanel")).to_have_count(1)
    expect(page).to_have_title("Sentinela · Alertas")
    page.wait_for_timeout(1000)
    assert erros == [], erros


def test_alertas_360_sem_rolagem_horizontal(
    browser: Browser, alvo: Alvo, alertas_semeados: dict[str, dict[str, Any]]
) -> None:
    contexto = browser.new_context(
        viewport={"width": 360, "height": 740}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        entrar(page, alvo)
        abrir_alertas(page)
        largura = page.evaluate(
            "() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]"
        )
        assert largura[0] <= largura[1], largura
    finally:
        contexto.close()


def abrir_configuracoes(page: Page) -> Any:
    page.get_by_role("tab", name="Configurações").click()
    secao = page.locator("#conteudo-configuracoes")
    expect(secao.locator("#cfg-telegram")).to_be_visible(timeout=15_000)
    return secao


def test_telegram_token_nunca_volta_ao_formulario(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_configuracoes(page)
    cartao = secao.locator("#cfg-telegram")
    token = cartao.get_by_label("Token do bot")
    chats = cartao.get_by_label("Destinos (um por linha)")
    expect(cartao.locator("#tg-situacao")).to_have_text("Token não definido")
    # validação no formulário, sem pedido à API
    token.fill("isto-nao-e-um-token")
    cartao.get_by_role("button", name="Salvar").click()
    expect(cartao.locator("#tg-token-erro")).to_contain_text("formato inválido")
    token.fill("")
    chats.fill("\n".join(str(1000 + i) for i in range(11)))
    cartao.get_by_role("button", name="Salvar").click()
    expect(cartao.locator("#tg-chats-erro")).to_have_text("No máximo 10 destinos.")
    # salva token + destino
    token.fill(TOKEN_FICTICIO)
    chats.fill("-1001234567890")
    cartao.get_by_role("button", name="Salvar").click()
    expect(cartao.locator("#tg-aviso")).to_have_text("Configuração do Telegram salva.")
    expect(cartao.locator("#tg-situacao")).to_have_text("Token definido")
    try:
        expect(token).to_have_value("")
        page.reload()
        secao = abrir_configuracoes(page)
        cartao = secao.locator("#cfg-telegram")
        expect(cartao.locator("#tg-situacao")).to_have_text("Token definido")
        expect(cartao.get_by_label("Token do bot")).to_have_value("")
        expect(cartao.get_by_label("Destinos (um por linha)")).to_have_value("-1001234567890")
        assert TOKEN_FICTICIO not in page.content()
        assert TOKEN_FICTICIO not in page.evaluate(
            "() => [...document.querySelectorAll('input, textarea')].map((e) => e.value).join()"
        )
        resposta = api_json(page, "GET", "/config/telegram")
        assert resposta["dados"]["token_definido"] is True
        assert TOKEN_FICTICIO not in str(resposta), "o token não pode voltar da API"
        # campo vazio não apaga: o PATCH nem menciona o token
        cartao.get_by_label("Destinos (um por linha)").fill("-1001234567890\n@canal_do_noc")
        with page.expect_request(
            lambda r: r.method == "PATCH" and r.url.endswith("/config/telegram")
        ) as pedido:
            cartao.get_by_role("button", name="Salvar").click()
        assert "token" not in pedido.value.post_data_json
        expect(cartao.locator("#tg-situacao")).to_have_text("Token definido")
        # modo demonstração: o teste responde com o texto fixo do servidor
        cartao.get_by_role("button", name="Enviar teste").click()
        expect(cartao.locator("#tg-teste")).to_have_text("Indisponível no modo demonstração.")
        # o 409 esperado vira "Failed to load resource" no console: só ele é descartado
        erros[:] = [e for e in erros if "409" not in e]
    finally:
        api_json(page, "PATCH", "/config/telegram", {"token": "", "chats": []})
    page.reload()
    secao = abrir_configuracoes(page)
    expect(secao.locator("#tg-situacao")).to_have_text("Token não definido")
    assert erros == [], erros


def test_configuracoes_mostra_fuso(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_configuracoes(page)
    expect(secao.locator("#cfg-fuso")).to_have_text("America/Sao_Paulo")
    expect(secao.get_by_role("heading", name="Fuso horário")).to_be_visible()
    assert erros == [], erros


HOSTIL = "<img src=x onerror=window.__xss=1>" + "A" * 300  # noqa: E501


def test_texto_hostil_do_alerta_vira_texto_e_cabe_em_360(
    browser: Browser, alvo: Alvo, novo_alerta: Any
) -> None:
    alerta = novo_alerta(renomear=HOSTIL)
    contexto = browser.new_context(
        viewport={"width": 360, "height": 740}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        erros = vigiar_console(page)
        dialogos: list[str] = []
        page.on("dialog", lambda d: (dialogos.append(d.message), d.dismiss()))
        entrar(page, alvo)
        secao = abrir_alertas(page)
        linha = linha_do_alerta(secao, alerta)
        expect(linha.locator(".al-texto")).to_have_text(f"{HOSTIL} caiu")
        assert linha.locator("img").count() == 0
        assert page.evaluate("window.__xss") is None
        largura = page.evaluate(
            "() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]"
        )
        assert largura[0] <= largura[1], largura
        sobra = linha.evaluate("e => e.scrollWidth - e.clientWidth")
        assert sobra <= 0, sobra  # o cartão contém a palavra de 300 letras
        page.wait_for_timeout(500)
        assert dialogos == [] and erros == [], (dialogos, erros)
    finally:
        contexto.close()


# ---- Fase 4: telão /parede e Configurações → Telões ------------------------------------------

PAREDE = Path(__file__).resolve().parents[1] / "src" / "parede"
CODIGO_TELAO = re.compile(r"^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$")
SEM_WEBGL = ["--disable-webgl", "--disable-3d-apis"]


def abrir_teloes(page: Page) -> Any:
    secao = abrir_configuracoes(page)
    cartao = secao.locator("#cfg-teloes")
    expect(cartao).to_be_visible()
    return cartao


def codigo_da_tv(tv: Page) -> str:
    valor = tv.locator("#pr-codigo-valor")
    expect(valor).to_have_text(CODIGO_TELAO, timeout=15_000)
    return valor.inner_text().strip()


def aprovar_pelo_painel(admin: Page, codigo: str, nome: str) -> None:
    cartao = abrir_teloes(admin)
    # minúsculas e espaço no lugar do hífen: a tela normaliza como o servidor
    cartao.get_by_label("Código da TV").fill(codigo.lower().replace("-", " "))
    cartao.get_by_label("Nome da tela").fill(nome)
    cartao.get_by_role("button", name="Aprovar").click()
    expect(cartao.locator("#tel-aviso")).to_contain_text(f"“{nome}” aprovado", timeout=10_000)
    expect(cartao.locator("#tel-lista li", has_text=nome).first).to_be_visible()


def esperar_telao(tv: Page, timeout: float = 15_000) -> None:
    expect(tv.locator("body")).to_have_attribute("data-modo", "telao", timeout=timeout)
    expect(tv.locator("#pr-n-online")).not_to_have_text("0", timeout=timeout)


def parear(browser: Browser, admin: Page, alvo: Alvo, nome: str) -> Any:
    """Novo contexto de TV emparelhado pelo painel; devolve ``(contexto, página)``."""
    contexto = browser.new_context(
        viewport={"width": 1920, "height": 1080}, ignore_https_errors=True, base_url=alvo.url
    )
    tv = contexto.new_page()
    tv.goto("/parede/")
    aprovar_pelo_painel(admin, codigo_da_tv(tv), nome)
    esperar_telao(tv, timeout=10_000)  # a TV consulta a cada 5 s: entra sozinha
    return contexto, tv


def revogar_via_api(admin: Page, nome: str) -> None:
    r = api_json(admin, "GET", "/paredes")
    for p in r["dados"]:
        if p["nome"] == nome and p["ativa"]:
            assert api_json(admin, "DELETE", f"/paredes/{p['id']}")["status"] == 204


@pytest.fixture(scope="module")
def telao_pareado(browser: Browser, alvo: Alvo) -> Iterator[dict[str, Any]]:
    """Um telão emparelhado para o módulo (o servidor limita 10 pedidos por IP por hora):
    devolve o ``storage_state`` (com o cookie HttpOnly do token) para abrir outros contextos."""
    admin_ctx = browser.new_context(ignore_https_errors=True, base_url=alvo.url)
    admin = admin_ctx.new_page()
    entrar(admin, alvo)
    contexto, _tv = parear(browser, admin, alvo, "TV Smoke")
    estado = contexto.storage_state()
    contexto.close()
    try:
        yield {"estado": estado, "nome": "TV Smoke"}
    finally:
        revogar_via_api(admin, "TV Smoke")
        admin_ctx.close()


def navegador_sem_webgl(browser_type: Any, browser_type_launch_args: dict[str, Any]) -> Any:
    args = [*browser_type_launch_args.get("args", []), *SEM_WEBGL]
    return browser_type.launch(**{**browser_type_launch_args, "args": args})


def texto_e_dom(page: Page) -> str:
    return str(page.evaluate("() => document.body.innerText + document.documentElement.outerHTML"))


def test_bundles_do_telao_conferem_sha256() -> None:
    # os bundles commitados são os que os .sha256 declaram (o Dockerfile confere igual)
    for nome in ("parede.bundle.js", "teia-parede.bundle.js"):
        esperado, arquivo = (PAREDE / f"{nome}.sha256").read_text(encoding="ascii").split()
        assert arquivo == nome
        assert hashlib.sha256((PAREDE / nome).read_bytes()).hexdigest() == esperado
    assert not list(PAREDE.glob("*.map"))


def test_parede_mostra_codigo_e_instrucao(page: Page) -> None:
    erros = vigiar_console(page)
    page.goto("/parede/")
    codigo_da_tv(page)
    expect(page.get_by_text("Aprove em Configurações → Telões")).to_be_visible()
    expect(page.locator("body")).to_have_attribute("data-modo", "codigo")
    expect(page.locator(".pr-http").first).to_be_hidden()  # HTTPS: sem o aviso de HTTP
    expect(page).to_have_title("Sentinela · Emparelhar telão")
    assert erros == [], erros


def test_parede_emparelha_e_mostra_contadores_e_relogio(
    page: Page, browser: Browser, alvo: Alvo
) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    contexto, tv = parear(browser, page, alvo, "TV Portaria")
    try:
        erros_tv = vigiar_console(tv)
        expect(tv.locator("#pr-nome")).to_have_text("TV Portaria")
        expect(tv.locator("#pr-relogio")).to_have_text(re.compile(r"^\d{2}:\d{2}$"))
        expect(tv).to_have_title("Sentinela · Telão")
        expect(tv.locator("#pr-versao")).to_have_text(re.compile(r"^Sentinela v\d+\.\d+\.\d+"))
        soma = tv.evaluate(
            "() => ['online', 'instavel', 'offline', 'inalcancavel']"
            ".reduce((s, n) => s + Number(document.getElementById('pr-n-' + n).textContent), 0)"
        )
        assert 0 < soma <= TOTAL_DEMO, soma
        # rótulo de texto em cada contador (estado nunca só por cor)
        for grupo in ("online", "instavel", "offline", "inalcancavel"):
            expect(tv.locator(f"#pr-r-{grupo}")).not_to_be_empty()
        # headless tem WebGL por software: Teia reduzida, sem partículas (ou, se a cena ficar
        # lenta demais, já o Organograma)
        corpo = tv.locator("body")
        expect(corpo).to_have_attribute("data-visao", re.compile("^(teia|organograma)$"))
        if corpo.get_attribute("data-visao") == "teia":
            expect(tv.locator("#pr-teia")).to_have_attribute(
                "data-particulas", "nao", timeout=15_000
            )
        # o painel lista o telão como ativo, por HTTPS
        linha = page.locator("#tel-lista li", has_text="TV Portaria").first
        expect(linha).to_contain_text("HTTPS")
        tv.wait_for_timeout(1000)
        assert erros_tv == [], erros_tv
    finally:
        revogar_via_api(page, "TV Portaria")
        contexto.close()
    assert erros == [], erros


def test_parede_nunca_mostra_ip_nem_mac(
    browser_type: Any,
    browser_type_launch_args: dict[str, Any],
    alvo: Alvo,
    telao_pareado: dict[str, Any],
) -> None:
    # sem WebGL o telão mostra o Organograma: os nomes de todos os equipamentos vão ao DOM
    navegador = navegador_sem_webgl(browser_type, browser_type_launch_args)
    try:
        contexto = navegador.new_context(
            ignore_https_errors=True, base_url=alvo.url, storage_state=telao_pareado["estado"]
        )
        tv = contexto.new_page()
        erros = vigiar_console(tv)
        quadros: list[str] = []
        tv.on("websocket", lambda ws: ws.on("framereceived", lambda q: quadros.append(str(q))))
        tv.goto("/parede/")
        esperar_telao(tv)
        expect(tv.locator("#pr-org .pr-org-item").first).to_be_visible()
        tv.wait_for_timeout(2000)  # algumas mensagens de estado ao vivo
        texto = texto_e_dom(tv)
        recebido = "".join(quadros)
        assert quadros, "nenhum quadro do WebSocket"
        for proibido in ("10.99.", "02:00:00", '"ip"', '"mac"', "fabricante", "latencia"):
            assert proibido not in texto, proibido
            assert proibido not in recebido, proibido
        assert erros == [], erros
    finally:
        navegador.close()


def test_parede_revogar_volta_ao_codigo(page: Page, browser: Browser, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    contexto, tv = parear(browser, page, alvo, "TV Revogar")
    try:
        cartao = page.locator("#cfg-teloes")
        linha = cartao.locator("#tel-lista li", has_text="TV Revogar").first
        linha.get_by_role("button", name="Revogar TV Revogar").click()
        dialogo = page.get_by_role("dialog", name="Revogar “TV Revogar”?")
        dialogo.get_by_role("button", name="Revogar").click()
        expect(cartao.locator("#tel-aviso")).to_have_text("“TV Revogar” revogado.")
        expect(linha).to_contain_text("Revogado")
        # a TV cai na hora (WS 4401) e volta a mostrar um código novo
        expect(tv.locator("body")).to_have_attribute("data-modo", "codigo", timeout=10_000)
        codigo_da_tv(tv)
    finally:
        contexto.close()
    assert erros == [], erros


def test_parede_sem_conexao_aviso_apos_60s(
    browser_type: Any,
    browser_type_launch_args: dict[str, Any],
    alvo: Alvo,
    telao_pareado: dict[str, Any],
) -> None:
    # sem WebGL: com o relógio falso, 60 s de Teia seriam ~3.600 quadros 3D desenhados à força
    navegador = navegador_sem_webgl(browser_type, browser_type_launch_args)
    try:
        contexto = navegador.new_context(
            ignore_https_errors=True, base_url=alvo.url, storage_state=telao_pareado["estado"]
        )
        tv = contexto.new_page()
        estado: dict[str, Any] = {"bloquear": False, "abertos": []}

        def rota(ws: Any) -> None:
            if estado["bloquear"]:
                ws.close(code=1011)  # servidor "fora": toda tentativa nova cai
                return
            ws.connect_to_server()
            estado["abertos"].append(ws)

        tv.route_web_socket(re.compile(r"/ws/parede$"), rota)
        tv.clock.install()
        tv.goto("/parede/")
        esperar_telao(tv)
        aviso = tv.locator("#pr-sem-conexao")
        expect(aviso).to_be_hidden()
        estado["bloquear"] = True
        for ws in estado["abertos"]:
            ws.close(code=1011)
        tv.clock.run_for(55_000)
        expect(aviso).to_be_hidden()  # 55 s sem contato: ainda não
        tv.clock.run_for(6_000)
        expect(aviso).to_be_visible()
        expect(aviso).to_contain_text("Sem conexão com o servidor")
        expect(tv.locator("body")).to_have_class(re.compile(r"\bpr-desconectado\b"))
        # o servidor volta: a reconexão (recuo de até 30 s) traz um snapshot e o aviso some
        estado["bloquear"] = False
        tv.clock.run_for(31_000)
        expect(aviso).to_be_hidden(timeout=10_000)
    finally:
        navegador.close()


def test_parede_sem_webgl_usa_organograma(
    browser_type: Any,
    browser_type_launch_args: dict[str, Any],
    alvo: Alvo,
    telao_pareado: dict[str, Any],
) -> None:
    navegador = navegador_sem_webgl(browser_type, browser_type_launch_args)
    try:
        contexto = navegador.new_context(
            ignore_https_errors=True, base_url=alvo.url, storage_state=telao_pareado["estado"]
        )
        tv = contexto.new_page()
        erros = vigiar_console(tv)
        pedidos: list[str] = []
        tv.on("request", lambda r: pedidos.append(r.url))
        tv.goto("/parede/")
        esperar_telao(tv)
        expect(tv.locator("body")).to_have_attribute("data-visao", "organograma")
        expect(tv.locator("#pr-org")).to_be_visible()
        expect(tv.locator("#pr-teia")).to_be_hidden()
        expect(tv.locator("#pr-org .pr-org-classe").first).to_be_visible()
        assert not [u for u in pedidos if "teia-parede.bundle.js" in u], pedidos
        assert erros == [], erros
    finally:
        navegador.close()


def test_parede_cursor_escondido_e_nada_clicavel(
    browser: Browser, alvo: Alvo, telao_pareado: dict[str, Any]
) -> None:
    contexto = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        ignore_https_errors=True,
        base_url=alvo.url,
        storage_state=telao_pareado["estado"],
    )
    try:
        tv = contexto.new_page()
        erros = vigiar_console(tv)
        tv.goto("/parede/")
        esperar_telao(tv)
        tv.wait_for_timeout(1500)  # Teia montada (ou Organograma)
        cursores = tv.evaluate(
            "() => [...document.querySelectorAll('body, body *')]"
            ".filter((e) => e.getClientRects().length)"
            ".map((e) => getComputedStyle(e).cursor)"
        )
        assert set(cursores) == {"none"}, set(cursores)
        focaveis = tv.evaluate(
            "() => [...document.querySelectorAll("
            "'a[href], button, input, select, textarea, [tabindex], [contenteditable]')]"
            ".map((e) => e.outerHTML.slice(0, 80))"
        )
        assert focaveis == [], focaveis
        tv.keyboard.press("Tab")
        tv.keyboard.press("Tab")
        assert tv.evaluate("() => document.activeElement === document.body")
        # clicar e arrastar no meio da tela não faz nada (nem muda de modo nem abre nada)
        tv.mouse.click(960, 540)
        expect(tv.locator("body")).to_have_attribute("data-modo", "telao")
        assert erros == [], erros
    finally:
        contexto.close()


def test_teloes_codigo_errado_mostra_erro_generico(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    cartao = abrir_teloes(page)
    pedidos: list[str] = []
    page.on("request", lambda r: pedidos.append(r.url) if "/paredes/aprovar" in r.url else None)
    codigo = cartao.get_by_label("Código da TV")
    # formato errado: barrado na tela, sem pedido à API
    codigo.fill("ABC")
    cartao.get_by_label("Nome da tela").fill("TV Teste")
    cartao.get_by_role("button", name="Aprovar").click()
    expect(cartao.locator("#tel-codigo-erro")).to_contain_text("8 caracteres")
    assert pedidos == []
    # formato certo, mas código que não existe: a mensagem genérica do servidor
    codigo.fill("K7MQ-2XDP")
    cartao.get_by_role("button", name="Aprovar").click()
    expect(cartao.locator("#tel-codigo-erro")).to_have_text("Código inválido ou expirado.")
    expect(codigo).to_have_attribute("aria-invalid", "true")
    assert len(pedidos) == 1
    # o 404 esperado vira "Failed to load resource" no console: só ele é descartado
    erros[:] = [e for e in erros if "404" not in e]
    assert erros == [], erros


def test_permitir_http_mostra_aviso_hsts(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    cartao = abrir_teloes(page)
    chave = cartao.locator("#tel-http")
    aviso = cartao.locator("#tel-aviso-hsts")
    expect(chave).to_have_attribute("aria-checked", "false")
    expect(aviso).to_be_hidden()
    try:
        chave.click()
        dialogo = page.get_by_role("dialog", name="Permitir telão sem HTTPS?")
        dialogo.get_by_role("button", name="Permitir").click()
        expect(chave).to_have_attribute("aria-checked", "true")
        expect(aviso).to_be_visible()
        expect(aviso).to_contain_text("HSTS")
        expect(aviso).to_contain_text("sem cifra")
        assert api_json(page, "GET", "/config/paredes")["dados"] == {"permitir_http": True}
        page.reload()
        cartao = abrir_teloes(page)
        expect(cartao.locator("#tel-http")).to_have_attribute("aria-checked", "true")
        expect(cartao.locator("#tel-aviso-hsts")).to_be_visible()
        cartao.locator("#tel-http").click()  # desligar não pede confirmação
        expect(cartao.locator("#tel-http")).to_have_attribute("aria-checked", "false")
        expect(cartao.locator("#tel-aviso-hsts")).to_be_hidden()
    finally:
        api_json(page, "PATCH", "/config/paredes", {"permitir_http": False})
    assert erros == [], erros


# ---- Fase 4, rodada de correção: TV antiga, cena que quebra, 4403 e lista de telões viva ----

# Chromium 63 (TV Tizen 5.0) não tem nada disto; o telão tem de funcionar sem eles
TV_ANTIGA = """
delete Intl.RelativeTimeFormat;
delete window.AbortController;
delete window.queueMicrotask;
delete String.prototype.replaceAll;
delete window.structuredClone;
delete Array.prototype.at;
delete Object.fromEntries;
delete Array.prototype.flatMap;
delete Object.hasOwn;
"""
QUEBRAR_WEBGL = """() => {
    for (const ctx of [WebGLRenderingContext, window.WebGL2RenderingContext]) {
        if (!ctx) continue;
        for (const nome of ['drawElements', 'drawArrays', 'clear']) {
            ctx.prototype[nome] = () => { throw new Error('falha de desenho simulada'); };
        }
    }
}"""


def test_parede_tv_antiga_mostra_codigo_e_entra_com_a_teia(
    page: Page, browser: Browser, alvo: Alvo
) -> None:
    entrar(page, alvo)
    contexto = browser.new_context(
        viewport={"width": 1920, "height": 1080}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        contexto.add_init_script(TV_ANTIGA)
        tv = contexto.new_page()
        erros = vigiar_console(tv)
        tv.goto("/parede/")
        assert tv.evaluate("typeof Intl.RelativeTimeFormat") == "undefined"
        aprovar_pelo_painel(page, codigo_da_tv(tv), "TV Antiga")
        esperar_telao(tv, timeout=10_000)
        for grupo in ("online", "instavel", "offline", "inalcancavel"):
            expect(tv.locator(f"#pr-r-{grupo}")).not_to_be_empty()
        # com os esboços de compat-teia.js o bundle ES2017 da Teia monta (não é a queda)
        expect(tv.locator("#pr-teia canvas")).to_have_count(1, timeout=15_000)
        expect(tv.locator("#pr-teia")).to_have_attribute("data-girando", "sim")
        tv.wait_for_timeout(1500)
        assert erros == [], erros
    finally:
        revogar_via_api(page, "TV Antiga")
        contexto.close()


def test_parede_cena_que_quebra_vai_para_o_organograma(
    browser: Browser, alvo: Alvo, telao_pareado: dict[str, Any]
) -> None:
    contexto = browser.new_context(
        viewport={"width": 1280, "height": 900},
        ignore_https_errors=True,
        base_url=alvo.url,
        storage_state=telao_pareado["estado"],
    )
    try:
        tv = contexto.new_page()
        erros: list[str] = []
        tv.on("pageerror", lambda e: erros.append(str(e)))
        tv.goto("/parede/")
        esperar_telao(tv)
        expect(tv.locator("#pr-teia canvas")).to_have_count(1, timeout=15_000)
        expect(tv.locator("body")).to_have_attribute("data-visao", "teia")
        tv.evaluate(QUEBRAR_WEBGL)  # o próximo quadro do three lança dentro do laço dele
        expect(tv.locator("body")).to_have_attribute("data-visao", "organograma", timeout=10_000)
        expect(tv.locator("#pr-org .pr-org-classe").first).to_be_visible()
        expect(tv.locator("#pr-teia")).to_be_hidden()
        assert any("falha de desenho simulada" in e for e in erros), erros
    finally:
        contexto.close()


def test_parede_recusado_nao_mostra_sem_conexao_por_cima(browser: Browser, alvo: Alvo) -> None:
    contexto = browser.new_context(ignore_https_errors=True, base_url=alvo.url)
    try:
        tv = contexto.new_page()
        tv.route_web_socket(re.compile(r"/ws/parede$"), lambda ws: ws.close(code=4403))
        tv.clock.install()
        tv.goto("/parede/")
        status = tv.locator("#pr-codigo-status")
        expect(status).to_contain_text("O servidor recusou este telão")
        expect(tv.locator("#pr-codigo-valor")).to_be_hidden()
        tv.clock.run_for(61_000)  # passa dos 60 s e a nova tentativa também é recusada
        expect(status).to_contain_text("O servidor recusou este telão")
        tv.clock.run_for(61_000)
        expect(tv.locator("#pr-sem-conexao")).to_be_hidden()
        expect(tv.locator("body")).not_to_have_class(re.compile(r"\bpr-desconectado\b"))
    finally:
        contexto.close()


def test_teloes_lista_recarrega_ao_voltar_e_a_cada_30s(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    pedidos: list[str] = []
    page.on(
        "request",
        lambda r: pedidos.append(r.url) if r.url.endswith("/api/v1/paredes") else None,
    )
    page.clock.install()
    entrar(page, alvo)
    abrir_teloes(page)
    page.wait_for_timeout(500)
    assert len(pedidos) == 1, pedidos
    page.get_by_role("tab", name="Lista").click()
    abrir_teloes(page)
    page.wait_for_timeout(500)
    assert len(pedidos) == 2, pedidos  # cada entrada na aba busca a lista de novo
    page.clock.run_for(31_000)
    page.wait_for_timeout(500)
    assert len(pedidos) == 3, pedidos  # e, com a aba aberta, a cada 30 s
    page.get_by_role("tab", name="Lista").click()
    page.clock.run_for(61_000)
    page.wait_for_timeout(500)
    assert len(pedidos) == 3, pedidos  # fora de Configurações não busca
    assert erros == [], erros


# ---- Fase 4A: cartão de alerta na tela (painel e telão) -----------------------------------------
ESPIA_AUDIO = """() => {
    window.__bips = 0;
    window.AudioContext = function () {
        this.currentTime = 0;
        this.state = 'running';
        this.destination = {};
        this.resume = () => {};
        this.createOscillator = () => {
            window.__bips += 1;
            return { type: '', frequency: {}, connect() {}, start() {}, stop() {} };
        };
        this.createGain = () => ({
            gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
            connect() {},
        });
    };
}"""


def agora_iso() -> str:
    import datetime as dt

    return dt.datetime.now(dt.UTC).isoformat()


def cartoes(page: Page) -> Any:
    return page.locator("#cartoes-alerta article.ca")


def cartao_de(page: Page, alerta_id: int) -> Any:
    return page.locator(f'#cartoes-alerta article.ca[data-id="{alerta_id}"]')


def alerta_da_api(page: Page, alerta_id: int) -> dict[str, Any]:
    r = api_json(page, "GET", f"/alertas/{alerta_id}")
    assert r["status"] == 200, r
    dados: dict[str, Any] = dict(r["dados"])
    dados.pop("afetados", None)  # a mensagem do WS traz só a linha, sem a lista
    return dados


def injetar(page: Page, ponte: Any, acao: str, alerta_id: int, **mudancas: Any) -> dict[str, Any]:
    """Mensagem ``alerta`` no WebSocket do painel, com a linha real do banco (+ ``mudancas``)."""
    alerta = {**alerta_da_api(page, alerta_id), **mudancas}
    ponte.injetar({"tipo": "alerta", "acao": acao, "id": alerta_id, "alerta": alerta, "abertos": 9})
    return alerta


def entrar_com_ponte(page: Page, alvo: Alvo, login: str = "", senha: str = "") -> Any:
    from conftest import PonteWs

    ponte = PonteWs(page)
    entrar(page, alvo, login, senha)
    expect(page.locator("#cartoes-alerta")).to_be_attached()
    expect(cartoes(page)).to_have_count(0)  # o que já estava aberto na carga não vira cartão
    return ponte


def test_cartao_aparece_ao_vivo_com_ip_e_dados(page: Page, alvo: Alvo, novo_alerta: Any) -> None:
    erros = vigiar_console(page)
    a = novo_alerta()
    ponte = entrar_com_ponte(page, alvo)
    eq = api_json(page, "GET", f"/equipamentos/{a['equipamento_id']}")["dados"]
    alerta = injetar(page, ponte, "aberto", a["id"])
    cartao = cartao_de(page, a["id"])
    expect(cartao).to_be_visible(timeout=10_000)
    expect(cartao.locator(".ca-nome")).to_have_text(alerta["equipamento_nome"])
    expect(cartao.locator(".ca-marca")).to_have_text("Fora do ar")
    expect(cartao).to_contain_text(eq["ip"])
    expect(cartao.locator(".ca-dados dt", has_text="MAC")).to_be_visible(timeout=10_000)
    expect(cartao.locator(".ca-dados dt", has_text="Checagem")).to_be_visible()
    expect(cartao.locator(".ca-dados dt", has_text="Desde")).to_be_visible()
    expect(cartao.locator(".ca-sub")).to_contain_text("Online")  # estado em texto + ícone
    # papel de alerta só no título; ações do admin
    expect(cartao.locator('[role="alert"]:visible')).to_have_count(1)
    for nome in ("Ver na Teia", "Ver alerta", "Reconhecer", "Silenciar…"):
        expect(cartao.get_by_role("button", name=re.compile(f"^{nome}"))).to_be_visible()
    # o foco não é roubado e Esc num botão do cartão o fecha
    assert page.evaluate("document.activeElement.closest('#cartoes-alerta')") is None
    cartao.get_by_role("button", name="Ver alerta").focus()
    page.keyboard.press("Escape")
    expect(cartao).to_have_count(0)
    # fechado por Esc: a mesma mensagem não o reabre sozinho
    injetar(page, ponte, "aberto", a["id"])
    page.wait_for_timeout(500)
    expect(cartao).to_have_count(0)
    assert erros == [], erros


def test_cartao_nao_abre_para_silenciado_nem_para_o_que_ja_estava_aberto(
    page: Page, alvo: Alvo, alertas_semeados: dict[str, dict[str, Any]]
) -> None:
    erros = vigiar_console(page)
    ponte = entrar_com_ponte(page, alvo)
    injetar(page, ponte, "aberto", alertas_semeados["silenciado"]["id"])  # silenciado=true
    injetar(page, ponte, "atualizado", alertas_semeados["aberto"]["id"])  # já aberto na carga
    injetar(page, ponte, "atualizado", alertas_semeados["pendente"]["id"], afetados_total=4)
    page.wait_for_timeout(800)
    expect(cartoes(page)).to_have_count(0)
    assert erros == [], erros


def test_cartao_pilha_de_3_mais_n_e_transicoes(page: Page, alvo: Alvo, novo_alerta: Any) -> None:
    erros = vigiar_console(page)
    ids = [novo_alerta()["id"] for _ in range(5)]
    ponte = entrar_com_ponte(page, alvo)
    for i in ids:
        injetar(page, ponte, "aberto", i)
        injetar(page, ponte, "aberto", i)  # repetida: um cartão por alerta
    expect(cartoes(page)).to_have_count(3, timeout=10_000)
    expect(page.locator("#cartoes-alerta .ca-mais")).to_have_text("e mais 2 alertas")
    # os 3 mais novos à vista (o mais novo em cima)
    assert [c.get_attribute("data-id") for c in cartoes(page).all()] == [str(i) for i in ids[:1:-1]]
    # removido (absorvido pelo pai): o cartão some e o seguinte da pilha assume
    ponte.injetar(
        {"tipo": "alerta", "acao": "removido", "id": ids[4], "alerta": None, "abertos": 4}
    )
    expect(cartao_de(page, ids[4])).to_have_count(0)
    expect(cartoes(page)).to_have_count(3)
    expect(page.locator("#cartoes-alerta .ca-mais")).to_have_text("e mais 1 alerta")
    # fechado: fica verde, "voltou após ...", e some sozinho em 10 s
    injetar(page, ponte, "fechado", ids[3], fechado_em=agora_iso())
    voltou = cartao_de(page, ids[3])
    expect(voltou).to_have_class(re.compile(r"\bca-ok\b"))
    expect(voltou.locator(".ca-marca")).to_have_text("Voltou")
    expect(voltou).to_contain_text("voltou após")
    expect(voltou).to_have_count(0, timeout=15_000)
    # sobram 3 (ids[2], ids[1], ids[0]): todos à vista e o "e mais" some
    expect(cartoes(page)).to_have_count(3)
    expect(page.locator("#cartoes-alerta .ca-mais")).to_be_hidden()
    # um sexto alerta empurra o mais antigo para fora e o "e mais" volta; o clique leva à aba
    sexto = novo_alerta()["id"]
    injetar(page, ponte, "aberto", sexto)
    expect(page.locator("#cartoes-alerta .ca-mais")).to_have_text("e mais 1 alerta")
    assert [c.get_attribute("data-id") for c in cartoes(page).all()] == [
        str(sexto),
        str(ids[2]),
        str(ids[1]),
    ]
    page.locator("#cartoes-alerta .ca-mais").click()
    assert page.url.endswith("#alertas"), page.url
    assert erros == [], erros


def test_cartao_de_grupo_lista_afetados_com_ip(
    page: Page, alvo: Alvo, alertas_semeados: dict[str, dict[str, Any]]
) -> None:
    erros = vigiar_console(page)
    ponte = entrar_com_ponte(page, alvo)
    alerta = injetar(page, ponte, "aberto", alertas_semeados["aberto"]["id"])
    cartao = cartao_de(page, alerta["id"])
    expect(cartao.locator(".ca-ver")).to_contain_text("3 equipamentos afetados", timeout=10_000)
    expect(cartao.locator(".ca-afetados li")).to_have_count(0)  # recolhida até o clique
    cartao.locator(".ca-ver").click()
    expect(cartao.locator(".ca-afetados li")).to_have_count(3, timeout=10_000)
    expect(cartao.locator(".ca-afetados li").first).to_contain_text("10.99.")
    expect(cartao.locator(".ca-ver")).to_have_attribute("aria-expanded", "true")
    assert erros == [], erros


def test_cartao_instavel_tem_estilo_de_aviso(page: Page, alvo: Alvo, novo_alerta: Any) -> None:
    erros = vigiar_console(page)
    a = novo_alerta(tipo="instavel")
    ponte = entrar_com_ponte(page, alvo)
    injetar(page, ponte, "aberto", a["id"])
    cartao = cartao_de(page, a["id"])
    expect(cartao).to_have_class(re.compile(r"\bca-aviso\b"))
    expect(cartao.locator(".ca-marca")).to_have_text("Instável")
    assert erros == [], erros


def test_cartao_reconhecer_e_silenciar_pelo_cartao(
    page: Page, alvo: Alvo, novo_alerta: Any
) -> None:
    erros = vigiar_console(page)
    a = novo_alerta()
    ponte = entrar_com_ponte(page, alvo)
    injetar(page, ponte, "aberto", a["id"])
    cartao = cartao_de(page, a["id"])
    cartao.get_by_role("button", name=re.compile("^Reconhecer")).click()
    expect(cartao).to_contain_text("Reconhecido por admin", timeout=10_000)
    expect(cartao.get_by_role("button", name=re.compile("^Reconhecer"))).to_have_count(0)
    assert api_json(page, "GET", f"/alertas/{a['id']}")["dados"]["reconhecido_por"] == "admin"
    cartao.get_by_role("button", name="Silenciar…").click()
    dialogo = page.locator("dialog[open]")
    expect(dialogo).to_be_visible()
    expect(dialogo.locator("#sil-alvo-nome")).to_have_text(re.compile(r"\S"))
    page.keyboard.press("Escape")
    expect(dialogo).to_have_count(0)
    assert erros == [], erros


def test_cartao_ver_na_teia_abre_a_ficha(page: Page, alvo: Alvo, novo_alerta: Any) -> None:
    erros = vigiar_console(page)
    a = novo_alerta()
    ponte = entrar_com_ponte(page, alvo)
    alerta = injetar(page, ponte, "aberto", a["id"])
    cartao_de(page, a["id"]).get_by_role("button", name="Ver na Teia").click()
    assert page.url.endswith("#teia"), page.url
    ficha = page.locator("#painel-equipamento")
    expect(ficha).to_be_visible(timeout=20_000)
    expect(ficha.locator("#titulo-equip")).to_have_text(alerta["equipamento_nome"])
    assert erros == [], erros


def test_cartao_visualizador_so_ve_os_botoes_de_leitura(
    page: Page, alvo: Alvo, novo_alerta: Any
) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador neste alvo")
    a = novo_alerta()
    ponte = entrar_com_ponte(page, alvo, alvo.login_leitor, alvo.senha_leitor)
    injetar(page, ponte, "aberto", a["id"])
    cartao = cartao_de(page, a["id"])
    expect(cartao.get_by_role("button", name="Ver na Teia")).to_be_visible(timeout=10_000)
    expect(cartao.get_by_role("button", name=re.compile("^Reconhecer"))).to_have_count(0)
    expect(cartao.get_by_role("button", name="Silenciar…")).to_have_count(0)


def test_som_nos_alertas_so_depois_do_gesto_e_lembrado(
    page: Page, alvo: Alvo, novo_alerta: Any
) -> None:
    erros = vigiar_console(page)
    page.add_init_script(f"({ESPIA_AUDIO})()")
    a, b = novo_alerta(), novo_alerta()
    ponte = entrar_com_ponte(page, alvo)
    injetar(page, ponte, "aberto", a["id"])
    expect(cartao_de(page, a["id"])).to_be_visible(timeout=10_000)
    assert page.evaluate("window.__bips") == 0  # desligado por padrão
    abrir_alertas(page)
    caixa = page.get_by_label("Som nos alertas")
    expect(caixa).not_to_be_checked()
    caixa.check()  # o clique é o gesto: um bip de confirmação
    assert page.evaluate("window.__bips") == 1
    injetar(page, ponte, "aberto", b["id"])
    expect(cartao_de(page, b["id"])).to_be_visible(timeout=10_000)
    assert page.evaluate("window.__bips") == 2
    page.reload()
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)
    abrir_alertas(page)
    expect(page.get_by_label("Som nos alertas")).to_be_checked()
    assert erros == [], erros


def test_parede_cartao_de_queda_sem_ip_mac_nem_fabricante(
    browser_type: Any,
    browser_type_launch_args: dict[str, Any],
    alvo: Alvo,
    telao_pareado: dict[str, Any],
) -> None:
    from conftest import PonteWs

    navegador = navegador_sem_webgl(browser_type, browser_type_launch_args)
    try:
        contexto = navegador.new_context(
            ignore_https_errors=True, base_url=alvo.url, storage_state=telao_pareado["estado"]
        )
        tv = contexto.new_page()
        erros = vigiar_console(tv)
        ponte = PonteWs(tv, r".*/ws/parede$")
        tv.goto("/parede/")
        esperar_telao(tv)
        snap = tv.evaluate("async () => (await (await fetch('/api/v1/parede/snapshot')).json())")
        eq = snap["equipamentos"][0]
        expect(tv.locator("#pr-cartoes .pr-ca")).to_have_count(0)
        alerta = {
            "id": 987001, "tipo": "queda", "texto": f"{eq['nome']} caiu · 14 afetados",
            "aberto_em": agora_iso(), "equipamento_id": eq["id"], "afetados": 14,
        }  # fmt: skip
        cartao = tv.locator("#pr-cartoes .pr-ca")
        silenciado = {**alerta, "id": 987009, "silenciado": True}
        ponte.injetar({"tipo": "alerta", "acao": "aberto", "alerta": silenciado})
        tv.wait_for_timeout(600)
        expect(cartao).to_have_count(0)  # alerta silenciado: só a faixa, sem cartão
        ponte.injetar(
            {"tipo": "alerta", "acao": "aberto", "alerta": {**alerta, "silenciado": False}}
        )
        expect(cartao).to_have_count(1)
        expect(cartao.locator(".pr-ca-nome")).to_have_text(eq["nome"])
        expect(cartao).to_contain_text("14 equipamentos afetados")
        expect(cartao.locator(".pr-ca-dados")).to_contain_text("Desde")
        dentro = cartao.inner_text() + cartao.inner_html()
        for proibido in ("10.99.", "02:00:00", "Fabricante", "Checagem", "latência"):
            assert proibido not in dentro, proibido
        assert "10.99." not in texto_e_dom(tv)
        # no máximo 2 cartões; fechado some sozinho em 10 s
        for n in (987002, 987003):
            ponte.injetar({"tipo": "alerta", "acao": "aberto", "alerta": {**alerta, "id": n}})
        expect(cartao).to_have_count(2)
        for n in (987003, 987002, 987001):
            ponte.injetar({"tipo": "alerta", "acao": "fechado", "id": n})
        expect(cartao).to_have_count(0, timeout=17_000)
        assert erros == [], erros
    finally:
        navegador.close()


# ---------------------------------------------------------------- Fase 4B: segundo fator e backup


def preencher_login(page: Page, login: str, senha: str) -> None:
    page.goto("/login.html")
    page.get_by_label("Login").fill(login)
    page.get_by_label("Senha").fill(senha)
    page.get_by_role("button", name="Entrar").click()


def test_login_com_totp_pede_o_codigo_e_entra(page: Page, conta_com_totp: Any) -> None:
    conta = conta_com_totp()
    erros = vigiar_console(page)
    preencher_login(page, conta.login, conta.senha)
    campo = page.get_by_label("Código do aplicativo")
    expect(page.locator("#form-totp")).to_be_visible()
    expect(page.locator("#form-login")).to_be_hidden()
    expect(campo).to_be_focused()
    assert campo.get_attribute("autocomplete") == "one-time-code"
    assert campo.get_attribute("inputmode") == "numeric"
    codigo = conta.codigo_seguinte()
    campo.fill(f" {codigo[:3]} {codigo[3:]}")  # espaços no começo e no meio são tolerados
    page.get_by_role("button", name="Confirmar").click()
    page.wait_for_url("**/index.html")
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)
    assert erros == [], erros


def test_login_codigo_errado_mostra_erro_generico_e_mantem_a_etapa(
    page: Page, conta_com_totp: Any
) -> None:
    conta = conta_com_totp()
    preencher_login(page, conta.login, conta.senha)
    campo = page.get_by_label("Código do aplicativo")
    expect(page.locator("#form-totp")).to_be_visible()
    campo.fill("000000")
    page.get_by_role("button", name="Confirmar").click()
    expect(page.locator("#erro-totp")).to_have_text("Código inválido.")
    expect(page.locator("#form-totp")).to_be_visible()
    expect(page.locator("#form-login")).to_be_hidden()
    expect(campo).to_have_value("")
    expect(campo).to_be_focused()
    # "Voltar" limpa a etapa e devolve a tela de login
    page.get_by_role("button", name="Voltar").click()
    expect(page.locator("#form-login")).to_be_visible()
    expect(page.locator("#form-totp")).to_be_hidden()
    expect(page.get_by_label("Senha")).to_have_value("")


def test_login_duas_recusas_seguidas_voltam_a_etapa_1_com_aviso(
    page: Page, conta_com_totp: Any
) -> None:
    conta = conta_com_totp()
    preencher_login(page, conta.login, conta.senha)
    campo = page.get_by_label("Código do aplicativo")
    expect(page.locator("#form-totp")).to_be_visible()
    for _ in range(2):
        campo.fill("000000")
        page.get_by_role("button", name="Confirmar").click()
        if _ == 0:
            expect(page.locator("#erro-totp")).to_have_text("Código inválido.")
    expect(page.locator("#form-login")).to_be_visible()
    expect(page.locator("#form-totp")).to_be_hidden()
    expect(page.locator("#erro-login")).to_have_text("A etapa expirou; entre de novo.")


def test_login_com_codigo_de_recuperacao(page: Page, conta_com_totp: Any) -> None:
    conta = conta_com_totp()
    preencher_login(page, conta.login, conta.senha)
    expect(page.locator("#form-totp")).to_be_visible()
    page.get_by_role("button", name="Usar código de recuperação").click()
    campo = page.get_by_label("Código de recuperação", exact=True)
    expect(campo).to_be_focused()
    campo.fill(" " + conta.codigos[0].replace("-", "").lower())  # espaço, minúsculas, sem hífen
    page.get_by_role("button", name="Confirmar").click()
    page.wait_for_url("**/index.html")
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)


def test_admin_restrito_cai_na_pagina_de_seguranca_e_depois_entra(
    page: Page, conta_com_totp: Any, novo_usuario: Any
) -> None:
    import pyotp

    dono = conta_com_totp()  # admin com segundo fator: liga e desliga a política
    sem_fator, senha = novo_usuario("admin")
    r = dono.patch("/config/seguranca", {"exigir_totp_admin": True})
    assert r.status == 200, r.status
    try:
        preencher_login(page, sem_fator, senha)
        page.wait_for_url("**/seguranca.html", timeout=15_000)
        expect(page.locator("#seg-restrita")).to_be_visible()
        page.get_by_label("Confirme sua senha").fill(senha)
        page.get_by_role("button", name="Continuar").click()
        expect(page.locator("#seg-qr")).to_be_visible()
        chave = "".join(page.locator("#seg-chave span").all_inner_texts())
        page.get_by_label("Código que o aplicativo mostra agora").fill(pyotp.TOTP(chave).now())
        page.get_by_role("button", name="Ativar segundo fator").click()
        expect(page.locator("#seg-codigos li")).to_have_count(10)
        page.get_by_label("Guardei os códigos em lugar seguro").check()
        page.get_by_role("button", name="Continuar").click()
        page.wait_for_url("**/index.html")
        expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)
    finally:
        assert dono.patch("/config/seguranca", {"exigir_totp_admin": False}).status == 200


def test_ativar_mostra_qr_chave_e_10_codigos_so_uma_vez(page: Page, novo_usuario: Any) -> None:
    import pyotp

    login, senha = novo_usuario("admin")
    preencher_login(page, login, senha)
    page.wait_for_url("**/index.html")
    page.goto("/seguranca.html")
    expect(page.locator("#seg-restrita")).to_be_hidden()  # política desligada: ativação voluntária
    page.get_by_label("Confirme sua senha").fill("senha-errada-de-proposito")
    page.get_by_role("button", name="Continuar").click()
    expect(page.locator("#seg-senha-erro")).to_have_text("Senha incorreta.")
    erros = vigiar_console(page)  # o 401 da senha errada acima é esperado e fica de fora
    page.get_by_label("Confirme sua senha").fill(senha)
    page.get_by_role("button", name="Continuar").click()
    qr = page.locator("#seg-qr")
    expect(qr).to_be_visible()
    assert qr.evaluate("(i) => i.complete && i.naturalWidth > 0")
    blocos = page.locator("#seg-chave span")
    expect(blocos).to_have_count(8)
    chave = "".join(blocos.all_inner_texts())
    assert len(chave) == 32
    page.get_by_label("Código que o aplicativo mostra agora").fill(pyotp.TOTP(chave).now())
    page.get_by_role("button", name="Ativar segundo fator").click()
    itens = page.locator("#seg-codigos li")
    expect(itens).to_have_count(10)
    codigos = [t.split(". ")[-1].strip() for t in itens.all_inner_texts()]
    assert all(re.fullmatch(r"[A-Z0-9]{5}-[A-Z0-9]{5}", c) for c in codigos), codigos
    assert qr.get_attribute("src") is None  # a imagem do QR some depois de ativar
    continuar = page.get_by_role("button", name="Continuar")
    expect(continuar).to_be_disabled()
    with page.expect_download() as baixado:
        page.get_by_role("button", name="Baixar .txt").click()
    arquivo = Path(baixado.value.path()).read_text(encoding="utf-8")
    assert all(c in arquivo for c in codigos)
    page.get_by_label("Guardei os códigos em lugar seguro").check()
    expect(continuar).to_be_enabled()
    # nada de códigos nem chave no armazenamento do navegador
    guardado = page.evaluate(
        "JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)])"
    )
    assert not any(c in guardado for c in codigos) and chave not in guardado
    # recarregar não mostra de novo: a conta já está ativa e a lista é só da memória
    page.reload()
    expect(page.locator("#passo-ativo")).to_be_visible()
    expect(page.locator("#seg-codigos li")).to_have_count(0)
    assert not any(c in page.content() for c in codigos)
    assert erros == [], erros


def test_cartao_backup_mostra_aviso_do_env_e_botao_fazer_backup_agora(
    page: Page, alvo: Alvo
) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    page.goto("/index.html#configuracoes")
    cartao = page.locator("#cfg-backup")
    expect(cartao).to_be_visible(timeout=20_000)
    aviso = cartao.locator("#bk-aviso-env")
    expect(aviso).to_be_visible()
    expect(aviso).to_contain_text(".env")
    expect(aviso).to_contain_text("SENTINELA_CHAVE_CREDENCIAIS")
    botao = cartao.get_by_role("button", name="Fazer backup agora")
    expect(botao).to_be_visible()
    botao.click()
    expect(cartao.locator("#bk-aviso")).to_have_text("Backup feito.", timeout=30_000)
    expect(cartao.locator("#bk-lista li").first).to_be_visible()
    expect(cartao.locator("#bk-resumo")).to_contain_text("Último backup")
    expect(aviso).to_be_visible()  # o aviso não some depois do backup
    # o cartão Segurança vem junto e lista os usuários
    expect(page.locator("#cfg-seguranca")).to_be_visible()
    expect(page.locator("#seg-usuarios li").first).to_be_visible()
    # com a lista na tela o aviso de lista vazia não pode ficar preso (regressão: o x-show do Alpine
    # adia o "mostrar" e vencia o "esconder" quando "carregando" caía antes de a lista chegar)
    page.wait_for_timeout(500)
    expect(page.get_by_text("Nenhum usuário encontrado.")).to_be_hidden()
    expect(page.get_by_text("Nenhuma cópia guardada ainda.")).to_be_hidden()
    assert erros == [], erros


def test_cartao_seguranca_visualizador_nao_aparece(page: Page, alvo: Alvo) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador (SENTINELA_SMOKE_LEITOR_LOGIN/SENHA)")
    entrar(page, alvo, alvo.login_leitor, alvo.senha_leitor)
    page.goto("/index.html#configuracoes")
    page.reload()
    assert page.url.endswith("#lista"), page.url
    expect(page.locator("#cfg-seguranca")).to_be_hidden()
    expect(page.locator("#cfg-backup")).to_be_hidden()
    expect(page.get_by_role("button", name="Fazer backup agora")).to_be_hidden()


# ---------- classes vazias somem da Teia e do Organograma; cartão de alerta cabe ----------
CLASSES_ESVAZIADAS = ("impressora", "iot")
NOMES_ESVAZIADOS = ("Impressoras", "IoT/Automação", "Desconhecidos")  # a última já é vazia


class PonteSemClasses:
    """WebSocket do painel sem os equipamentos de ``CLASSES_ESVAZIADAS`` (só o que o navegador
    recebe; o servidor não é tocado) e com injeção de mensagens do teste."""

    def __init__(self, page: Page, manter: tuple[str, ...] | None = None) -> None:
        self.rotas: list[Any] = []
        self.removidos: set[str] = set()
        self.manter = manter  # None: só tira CLASSES_ESVAZIADAS; senão fica só com estas classes

        def ao_ws(ws: Any) -> None:
            servidor = ws.connect_to_server()
            ws.on_message(lambda m: servidor.send(m))
            servidor.on_message(lambda m: ws.send(self._filtrar(m)))
            self.rotas.append(ws)

        page.route_web_socket(re.compile(r".*/ws$"), ao_ws)

    def _filtrar(self, texto: Any) -> Any:
        import json

        if not isinstance(texto, str):
            return texto
        try:
            msg = json.loads(texto)
        except ValueError:
            return texto
        if msg.get("tipo") == "snapshot":
            todos = msg.get("equipamentos", [])
            self.removidos = {e["id"] for e in todos if self._sai(e.get("classe"))}
            msg["equipamentos"] = [e for e in todos if e["id"] not in self.removidos]
            return json.dumps(msg)
        if msg.get("id") in self.removidos:  # estados dos que o navegador não conhece
            return json.dumps({"tipo": "ping"})
        return texto

    def _sai(self, classe: Any) -> bool:
        if self.manter is None:
            return bool(classe in CLASSES_ESVAZIADAS)
        return bool(classe not in self.manter)

    def injetar(self, mensagem: dict[str, Any]) -> None:
        import json

        assert self.rotas, "o navegador ainda não abriu o WebSocket"
        self.rotas[-1].send(json.dumps(mensagem))


def equipamento_ws(id_: str, classe: str, nome: str, ip: str) -> dict[str, Any]:
    return {
        "tipo": "equipamento",
        "acao": "criado",
        "equipamento": {
            "id": id_,
            "nome": nome,
            "ip": ip,
            "classe": classe,
            "estado": "pausado",
            "desde": None,
            "checagem": "icmp",
        },
    }


def test_classe_vazia_nao_aparece_na_teia_nem_no_organograma(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    ponte = PonteSemClasses(page)
    page.goto("/login.html")
    page.get_by_label("Login").fill(alvo.login)
    page.get_by_label("Senha").fill(alvo.senha)
    page.get_by_role("button", name="Entrar").click()
    page.wait_for_url("**/index.html")
    expect(page.locator("#contador-total")).not_to_have_text("0", timeout=15_000)
    page.wait_for_timeout(500)
    assert ponte.removidos, "o demo tem impressoras e sensores"
    esperado = TOTAL_DEMO - len(ponte.removidos)
    expect(page.locator("#contador-total")).to_have_text(str(esperado))
    # Lista: o filtro "Classe" é do catálogo e continua com todas as classes
    for nome in NOMES_ESVAZIADOS:
        expect(page.locator("#filtro-classe option", has_text=nome)).to_have_count(1)

    # Teia: nenhum nó nem botão para a classe sem equipamento
    page.get_by_role("tab", name="Teia").click()
    palco = page.locator("#conteudo-teia [data-equipamentos]")
    expect(palco).to_have_attribute("data-equipamentos", str(esperado), timeout=20_000)
    expect(palco).to_have_attribute("data-classes", re.compile(r"\bcamera\b"))
    atual = palco.get_attribute("data-classes") or ""
    for slug in (*CLASSES_ESVAZIADAS, "desconhecido", "sentinela"):
        assert slug not in atual.split(","), atual
    botoes = page.locator("#teia-classes .teia-classe")
    expect(botoes.filter(has_text="Câmeras")).to_have_count(1)
    for nome in NOMES_ESVAZIADOS:
        expect(botoes.filter(has_text=nome)).to_have_count(0)

    # o painel de classes é o mesmo em todos os estilos (Árvore 3D incluída)
    for estilo in ("Árvore 3D", "Órbitas", "Constelação"):
        page.get_by_role("button", name=estilo, exact=True).click()
        for nome in NOMES_ESVAZIADOS:
            expect(botoes.filter(has_text=nome)).to_have_count(0)
        expect(botoes.filter(has_text="Câmeras")).to_have_count(1)

    # ao vivo: o 1º equipamento da classe faz ela aparecer; o último removido faz sumir
    ponte.injetar(equipamento_ws("vazia-1", "impressora", "Impressora do teste", "10.99.61.250"))
    expect(palco).to_have_attribute("data-classes", re.compile(r"\bimpressora\b"))
    expect(botoes.filter(has_text="Impressoras")).to_have_count(1)
    ponte.injetar({"tipo": "equipamento", "acao": "removido", "id": "vazia-1"})
    expect(palco).not_to_have_attribute("data-classes", re.compile(r"impressora"))
    expect(botoes.filter(has_text="Impressoras")).to_have_count(0)

    # Organograma: sem cartão para a classe vazia; aparece/some ao vivo
    secao = abrir_organograma(page)
    expect(secao.locator('.org-cartao[data-slug="camera"]')).to_have_count(1)
    for slug in (*CLASSES_ESVAZIADAS, "desconhecido"):
        expect(secao.locator(f'.org-cartao[data-slug="{slug}"]')).to_have_count(0)
    ponte.injetar(equipamento_ws("vazia-2", "iot", "Sensor do teste", "10.99.61.251"))
    expect(secao.locator('.org-cartao[data-slug="iot"]')).to_have_count(1, timeout=10_000)
    ponte.injetar({"tipo": "equipamento", "acao": "removido", "id": "vazia-2"})
    expect(secao.locator('.org-cartao[data-slug="iot"]')).to_have_count(0, timeout=10_000)
    assert erros == [], erros


LARGURAS_CARTAO = (360, 390, 768, 1024, 1280, 1300, 1366, 1440, 1920)
NOME_60 = "Câmera do refeitório principal, corredor leste do bloco B 02"
MEDIR_CARTAO = """() => {
    const vw = document.documentElement.clientWidth;
    const fora = [];
    const pilha = document.querySelector('#cartoes-alerta');
    for (const el of pilha.querySelectorAll('article.ca, article.ca *')) {
        if (getComputedStyle(el).display === 'none') continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.left < 15.5 || r.right > vw - 15.5) {
            fora.push([el.className || el.tagName, r.left, r.right]);
        }
    }
    const nome = pilha.querySelector('.ca-nome');
    return {vw, rolagem: document.documentElement.scrollWidth, fora,
            nomeCortado: nome.scrollWidth > nome.clientWidth + 1};
}"""


def test_cartao_de_alerta_cabe_na_janela_em_todas_as_larguras(
    browser: Browser, alvo: Alvo, novo_alerta: Any
) -> None:
    from conftest import PonteWs

    assert len(NOME_60) == 60
    for largura in LARGURAS_CARTAO:
        contexto = browser.new_context(
            viewport={"width": largura, "height": 900}, ignore_https_errors=True, base_url=alvo.url
        )
        try:
            page = contexto.new_page()
            a = novo_alerta()
            ponte = PonteWs(page)
            entrar(page, alvo)
            expect(page.locator("#cartoes-alerta")).to_be_attached()
            injetar(page, ponte, "aberto", a["id"], equipamento_nome=NOME_60)
            cartao = cartao_de(page, a["id"])
            expect(cartao).to_be_visible(timeout=10_000)
            expect(cartao.locator(".ca-dados dt", has_text="Checagem")).to_be_visible()
            page.wait_for_timeout(500)  # fim da animação de entrada
            m = page.evaluate(MEDIR_CARTAO)
            assert m["fora"] == [], (largura, m)  # nada colado ou além da margem de 16 px
            assert m["rolagem"] <= largura, (largura, m)
            assert not m["nomeCortado"], (largura, m)
            expect(cartao.locator(".ca-nome")).to_have_text(NOME_60)
            for nome in ("Ver na Teia", "Ver alerta", "Reconhecer", "Silenciar…"):
                expect(cartao.get_by_role("button", name=re.compile(f"^{nome}"))).to_be_visible()
        finally:
            contexto.close()


MEDIR_ROTULOS_TEIA = """() => {
    const palco = document.querySelector('#conteudo-teia .teia-palco').getBoundingClientRect();
    const painel = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? r : null;
    };
    const proibidas = ['#teia-classes', '.teia-estilos', '.teia-ver-tudo', '.teia-legenda']
        .map(painel).filter(Boolean);
    const caixas = [...document.querySelectorAll('#conteudo-teia .teia-rotulo:not(.servidor)')]
        .filter((el) => !el.hidden)
        .map((el) => el.querySelector('span').getBoundingClientRect());
    const cruza = (a, b) =>
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const fora = [], sobre = [], toca = [];
    caixas.forEach((c, i) => {
        if (c.left < palco.left || c.right > palco.right
            || c.top < palco.top || c.bottom > palco.bottom) {
            fora.push(i);
        }
        if (proibidas.some((p) => cruza(c, p))) sobre.push(i);
        caixas.slice(i + 1).forEach((o) => { if (cruza(c, o)) toca.push(i); });
    });
    return {rotulos: caixas.length, fora, sobre, toca};
}"""

CENARIOS_TEIA = {
    "demo": None,
    "quatro": ("roteador", "gravador", "camera", "computador"),
    "uma": ("camera",),
}


def test_teia_vista_geral_rotulos_na_area_livre_sem_sobreposicao(
    browser: Browser, alvo: Alvo
) -> None:
    for nome, manter in CENARIOS_TEIA.items():
        for largura, altura in ((1366, 900), (1024, 900), (768, 900), (390, 900)):
            contexto = browser.new_context(
                viewport={"width": largura, "height": altura},
                ignore_https_errors=True,
                base_url=alvo.url,
            )
            try:
                page = contexto.new_page()
                ponte = PonteSemClasses(page, manter) if manter else None
                page.goto("/login.html")
                page.get_by_label("Login").fill(alvo.login)
                page.get_by_label("Senha").fill(alvo.senha)
                page.get_by_role("button", name="Entrar").click()
                page.wait_for_url("**/index.html")
                expect(page.locator("#contador-total")).to_have_text(re.compile(r"^[1-9]"))
                page.get_by_role("tab", name="Teia").click()
                palco = page.locator("#conteudo-teia [data-classes]")
                esperado = len(manter) if manter else 10  # demo: 10 classes têm equipamento
                expect(palco).to_have_attribute("data-classes", re.compile(r"\w"), timeout=20_000)
                assert len((palco.get_attribute("data-classes") or "").split(",")) == esperado
                if ponte:
                    assert ponte.removidos
                page.wait_for_timeout(4000)  # câmera da vista geral (1,2 s) e nível da cena
                for _ in range(3):  # a rotação automática muda o desenho: mede em 3 instantes
                    m = page.evaluate(MEDIR_ROTULOS_TEIA)
                    assert m["rotulos"] == esperado, (nome, largura, m)
                    assert m["fora"] == [], (nome, largura, m)
                    assert m["sobre"] == [], (nome, largura, m)
                    assert m["toca"] == [], (nome, largura, m)
                    page.wait_for_timeout(1500)
            finally:
                contexto.close()


VERSAO = re.compile(r"^v\d+\.\d+\.\d+$")


def test_versao_aparece_no_painel_e_no_login_em_todas_as_larguras(
    browser: Browser, alvo: Alvo
) -> None:
    import sentinela

    for largura in (360, 390, 768, 1024, 1366, 1920):
        contexto = browser.new_context(
            viewport={"width": largura, "height": 900}, ignore_https_errors=True, base_url=alvo.url
        )
        try:
            page = contexto.new_page()
            page.goto("/login.html")
            login = page.locator(".rodape-login.versao")
            expect(login).to_have_text(VERSAO)
            expect(login).to_have_text(f"v{sentinela.__version__}")
            caixa = login.bounding_box()
            assert caixa and caixa["x"] >= 0 and caixa["x"] + caixa["width"] <= largura
            page.get_by_label("Login").fill(alvo.login)
            page.get_by_label("Senha").fill(alvo.senha)
            page.get_by_role("button", name="Entrar").click()
            page.wait_for_url("**/index.html")
            topo = page.locator(".topo .versao")
            expect(topo).to_have_text(VERSAO)
            expect(topo).to_have_text(f"v{sentinela.__version__}")
            m = page.evaluate(
                """() => {
                    const r = document.querySelector('.topo .versao').getBoundingClientRect();
                    const n = document.querySelector('.topo .marca span').getBoundingClientRect();
                    return {e: r.left, d: r.right, y0: r.top, y1: r.bottom, vw: innerWidth,
                            nomeD: n.right, rolagem: document.documentElement.scrollWidth};
                }"""
            )
            assert m["e"] >= m["nomeD"] and m["d"] <= m["vw"], (largura, m)  # ao lado do nome
            assert m["y0"] >= 0 and m["rolagem"] <= largura, (largura, m)
        finally:
            contexto.close()


# ---------------------------------------------------------------- primeiro acesso (Fase 5)
COMANDO_NOVO_CODIGO = "docker compose exec core python -m sentinela.cli codigo-instalacao"
LOGIN_64_ASSISTENTE = ("administrador-geral-da-rede-do-escritorio-" + "x" * 40)[:64]
SENHA_ASSISTENTE = "senha-ficticia-do-smoke-1"


def abrir_instalacao(browser: Browser, inst: Instalacao, largura: int = 1280) -> Page:
    contexto = browser.new_context(
        viewport={"width": largura, "height": 900}, ignore_https_errors=True, base_url=inst.url
    )
    return contexto.new_page()


def conferir_codigo(page: Page, texto: str) -> None:
    page.get_by_label("Código de instalação", exact=True).fill(texto)
    page.get_by_role("button", name="Continuar").click()


def test_sem_usuario_login_leva_ao_primeiro_acesso(
    browser: Browser, instalacao_nova: Instalacao
) -> None:
    page = abrir_instalacao(browser, instalacao_nova)
    try:
        page.goto("/login.html")
        page.wait_for_url("**/primeiro-acesso.html", timeout=10_000)
        expect(page.get_by_role("heading", name="Código de instalação")).to_be_visible()
        expect(page.locator("[data-versao]")).to_have_text(re.compile(r"^v\d+\.\d+\.\d+"))
    finally:
        page.context.close()


def test_codigo_errado_mostra_erro_generico_e_fica_no_passo(
    browser: Browser, instalacao_nova: Instalacao
) -> None:
    page = abrir_instalacao(browser, instalacao_nova)
    try:
        page.goto("/primeiro-acesso.html")
        conferir_codigo(page, "ZZZZ-0000")  # formato inválido: nem sai do navegador
        expect(page.locator("#erro-codigo")).to_contain_text("O código tem 8 letras e números")
        conferir_codigo(page, "ZZZZ-9876")
        expect(page.locator("#erro-codigo")).to_have_text("Código inválido.")
        expect(page.locator("#codigo")).to_have_value("")  # nunca fica o que foi digitado
        expect(page.locator("#passo-codigo")).to_be_visible()
        expect(page.locator("#passo-administrador")).to_be_hidden()
        assert page.locator("#erro-codigo").get_attribute("role") == "alert"
    finally:
        page.context.close()


def test_codigo_expirado_mostra_o_comando_para_gerar_outro(
    browser: Browser, instalacao_nova: Instalacao
) -> None:
    instalacao_nova.regravar_codigo(horas_atras=25)
    page = abrir_instalacao(browser, instalacao_nova)
    try:
        page.goto("/primeiro-acesso.html")
        expect(page.locator("#pa-comando")).to_have_text(COMANDO_NOVO_CODIGO)
        expect(page.locator("#pa-novo-texto")).to_contain_text("não existe ou expirou")
        conferir_codigo(page, "ABCD-2345")  # o código certo, mas vencido: resposta genérica
        expect(page.locator("#erro-codigo")).to_have_text("Código inválido.")
        expect(page.locator("#passo-administrador")).to_be_hidden()
    finally:
        page.context.close()


def test_muitas_tentativas_mostra_como_gerar_codigo_novo(
    browser: Browser, instalacao_nova: Instalacao
) -> None:
    page = abrir_instalacao(browser, instalacao_nova)
    try:
        texto = (
            "Muitas tentativas. Aguarde, ou gere um código novo no terminal "
            "(python -m sentinela.cli codigo-instalacao)."
        )
        page.route(
            "**/api/v1/primeiro-acesso/conferir",
            lambda r: r.fulfill(
                status=429,
                content_type="application/json",
                body=json.dumps({"detail": texto}),
                headers={"Retry-After": "120"},
            ),
        )
        page.goto("/primeiro-acesso.html")
        conferir_codigo(page, "ABCD-2345")
        expect(page.locator("#erro-codigo")).to_have_text(texto)
        expect(page.locator("#continuar-codigo")).to_be_disabled()
        expect(page.locator("#continuar-codigo")).to_contain_text("Aguarde")
        expect(page.locator("#pa-comando")).to_have_text(COMANDO_NOVO_CODIGO)
        expect(page.locator("#codigo")).to_have_value("")
    finally:
        page.context.close()


def test_limite_do_nginx_nao_pede_codigo_novo(
    browser: Browser, instalacao_nova: Instalacao
) -> None:
    page = abrir_instalacao(browser, instalacao_nova)
    try:
        page.route(  # 429 do nginx: corpo HTML, sem JSON
            "**/api/v1/primeiro-acesso/conferir",
            lambda r: r.fulfill(status=429, content_type="text/html", body="<html>429</html>"),
        )
        page.goto("/primeiro-acesso.html")
        conferir_codigo(page, "ABCD-2345")
        expect(page.locator("#erro-codigo")).to_have_text(
            "Muitas tentativas. Aguarde um minuto e tente de novo."
        )
        expect(page.locator("#continuar-codigo")).to_contain_text("Aguarde")
        expect(page.locator("#pa-novo-texto")).not_to_contain_text("libera o bloqueio")
        expect(page.locator("#pa-novo-codigo.pa-destaque")).to_have_count(0)
    finally:
        page.context.close()


def test_codigo_expirado_sem_usuario_login_nao_redireciona(
    browser: Browser, instalacao_nova: Instalacao
) -> None:
    instalacao_nova.regravar_codigo(horas_atras=25)
    page = abrir_instalacao(browser, instalacao_nova)
    try:
        page.goto("/login.html")
        expect(page.get_by_role("button", name="Entrar")).to_be_visible()
        aviso = page.locator("#aviso-instalacao")
        expect(aviso).to_be_visible()
        expect(aviso).to_contain_text("Instalação ainda sem administrador")
        expect(aviso).to_contain_text("python -m sentinela.cli codigo-instalacao")
        page.wait_for_timeout(1000)  # a consulta já voltou: nada de redirecionar
        assert page.url.endswith("/login.html")
    finally:
        page.context.close()


def test_passo_2_nao_tem_voltar_e_codigo_nao_fica_na_pagina(
    browser: Browser, instalacao_nova: Instalacao
) -> None:
    page = abrir_instalacao(browser, instalacao_nova)
    try:
        page.goto("/primeiro-acesso.html")
        conferir_codigo(page, "ABCD-2345")
        expect(page.locator("#passo-administrador")).to_be_visible()
        expect(page.locator("#passo-administrador [data-voltar]")).to_have_count(0)
        expect(page.locator("#codigo")).to_have_value("")
    finally:
        page.context.close()


def test_assistente_completo_entra_no_painel_com_roteador_e_varredura(
    browser: Browser, instalacao_nova: Instalacao
) -> None:
    page = abrir_instalacao(browser, instalacao_nova)
    try:
        erros = vigiar_console(page)
        page.goto("/primeiro-acesso.html")
        conferir_codigo(page, "abcd 2345")  # minúsculas e espaço valem
        expect(page.get_by_role("heading", name="Administrador")).to_be_visible()
        assert "2345" not in page.content()  # o código não fica na página
        page.get_by_label("Login", exact=True).fill(LOGIN_64_ASSISTENTE)
        page.get_by_label("Senha", exact=True).fill("curta")
        page.get_by_label("Repita a senha").fill("curta")
        page.get_by_role("button", name="Continuar").click()
        expect(page.locator("#erro-administrador")).to_contain_text("pelo menos 12 caracteres")
        page.get_by_label("Senha", exact=True).fill(SENHA_ASSISTENTE)
        page.get_by_label("Repita a senha").fill(SENHA_ASSISTENTE)
        page.get_by_role("button", name="Continuar").click()
        expect(page.get_by_role("heading", name="Sua rede")).to_be_visible()
        expect(page.locator("#cidr")).to_have_value(REDE_DO_ASSISTENTE)
        expect(page.locator("#gateway")).to_have_value(GATEWAY_DO_ASSISTENTE)
        chave = page.get_by_role("switch", name="Achar os aparelhos sozinho (varredura)")
        expect(chave).to_have_attribute("aria-checked", "true")
        expect(page.locator("#pa-arp")).to_contain_text("pedido ARP")
        page.get_by_label("Sub-rede", exact=True).fill("8.8.8.0/24")
        page.get_by_role("button", name="Continuar").click()
        expect(page.locator("#erro-rede")).to_have_text("A sub-rede deve ser privada (RFC 1918).")
        page.get_by_label("Sub-rede", exact=True).fill(REDE_DO_ASSISTENTE)
        page.get_by_role("button", name="Continuar").click()
        expect(page.get_by_role("heading", name="Tudo pronto?")).to_be_visible()
        expect(page.locator("#res-login")).to_have_text(LOGIN_64_ASSISTENTE)
        expect(page.locator("#res-cidr")).to_have_text(REDE_DO_ASSISTENTE)
        page.get_by_role("button", name="Concluir e entrar").click()
        page.wait_for_url("**/index.html", timeout=20_000)
        expect(page.locator("#lista tbody tr.linha", has_text="Roteador")).to_have_count(
            1, timeout=15_000
        )
        expect(page.locator("#faixa-varredura")).to_be_visible(timeout=15_000)
        assert erros == [], erros
        # o assistente acabou: a página volta ao login (o usuário agora existe)
        page.goto("/primeiro-acesso.html")
        page.wait_for_url("**/login.html", timeout=10_000)
    finally:
        page.context.close()


def test_com_usuario_primeiro_acesso_html_volta_ao_login(browser: Browser, alvo: Alvo) -> None:
    contexto = browser.new_context(ignore_https_errors=True, base_url=alvo.url)
    try:
        page = contexto.new_page()
        page.goto("/primeiro-acesso.html")
        page.wait_for_url("**/login.html", timeout=10_000)
        expect(page.get_by_role("button", name="Entrar")).to_be_visible()
        expect(page.locator("#aviso-instalacao")).to_be_hidden()  # há usuário: sem aviso
        entrar(page, alvo)  # o login segue normal
    finally:
        contexto.close()


def test_visualizador_nao_alcanca_o_primeiro_acesso(browser: Browser, alvo: Alvo) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador (SENTINELA_SMOKE_LEITOR_LOGIN/SENHA)")
    contexto = browser.new_context(ignore_https_errors=True, base_url=alvo.url)
    try:
        page = contexto.new_page()
        entrar(page, alvo, alvo.login_leitor, alvo.senha_leitor)
        page.goto("/primeiro-acesso.html")
        page.wait_for_url("**/login.html", timeout=10_000)
        expect(page.locator("#passo-codigo")).to_have_count(0)
        assert page.request.get("/api/v1/primeiro-acesso").status == 404
        for rota in ("conferir", "concluir"):
            r = page.request.post(f"/api/v1/primeiro-acesso/{rota}", data={"codigo": "ABCD2345"})
            assert r.status == 404, (rota, r.status)
    finally:
        contexto.close()


# ---------- Fase 5, Task 10: aparelho novo, Sub-redes e Atualizações ----------
def aviso_de_atualizacao(**campos: Any) -> dict[str, Any]:
    """Corpo de ``GET /atualizacao`` (fictício) para o smoke."""
    import datetime as dt

    agora = dt.datetime.now(dt.UTC).isoformat()
    padrao: dict[str, Any] = {
        "versao": "0.5.0",
        "ativo": True,
        "agendado": True,
        "ultima_verificacao": agora,
        "ultima_verificacao_ok": agora,
        "resultado": "atualizado",
        "de": "0.4.1",
        "para": "0.5.0",
        "mensagem": None,
        "aviso": "Atualizado para 0.5.0",
        "comando_manual": "./update.sh",
        "arquivo_ilegivel": False,
    }
    return {**padrao, **campos}


def servir_atualizacao(page: Page, corpo: dict[str, Any]) -> None:
    """Responde ``GET /api/v1/atualizacao`` com ``corpo`` (a escrita segue para o servidor)."""

    def tratar(route: Route) -> None:
        if route.request.method == "GET":
            route.fulfill(status=200, content_type="application/json", body=json.dumps(corpo))
        else:
            route.continue_()

    page.route("**/api/v1/atualizacao", tratar)


def test_aviso_de_aparelho_novo_e_ver_em_novos_foca_o_cartao(
    page: Page, alvo: Alvo, novo_aparelho: Any
) -> None:
    erros = vigiar_console(page)
    a = novo_aparelho()
    ponte = entrar_com_ponte(page, alvo)
    alerta = injetar(page, ponte, "aberto", a["alerta_id"])
    assert alerta["tipo"] == "aparelho_novo" and alerta["ip"] == a["ip"], alerta
    cartao = cartao_de(page, a["alerta_id"])
    expect(cartao).to_be_visible(timeout=10_000)
    expect(cartao.locator(".ca-marca")).to_have_text("Novo na rede")
    expect(cartao.locator(".ca-nome")).to_have_text("Novo aparelho conectou na rede")
    expect(cartao.locator(".ca-dados")).to_contain_text(a["ip"])
    expect(cartao.locator(".ca-dados")).to_contain_text("Fabricante Fictício")
    expect(cartao.locator(".ca-dados")).to_contain_text("80, 443")
    # a lista de alertas mostra a mesma linha, com o atalho
    page.get_by_role("tab", name="Alertas").click()
    linha = page.locator(f'#lista-alertas li[data-id="{a["alerta_id"]}"]')
    expect(linha).to_be_visible(timeout=10_000)
    info = linha.locator(".al-info-novo")
    expect(info).to_contain_text(a["ip"])
    expect(info).to_contain_text("Fabricante Fictício")
    expect(info).to_contain_text("portas 80, 443")
    expect(linha.get_by_role("button", name="Ver em Novos")).to_be_visible()
    page.get_by_role("tab", name="Lista").click()
    # "Ver em Novos" no cartão: abre a fila e destaca o cartão da descoberta, com o foco nele
    cartao.get_by_role("button", name="Ver em Novos").click()
    expect(page.get_by_role("tab", name="Novos")).to_have_attribute("aria-selected", "true")
    alvo_novos = page.locator(f'#conteudo-novos .nv-cartao[data-id="{a["descoberta_id"]}"]')
    expect(alvo_novos).to_be_visible(timeout=20_000)
    expect(alvo_novos).to_have_class(re.compile(r"nv-destaque"))
    expect(alvo_novos).to_be_focused()
    box = alvo_novos.bounding_box()
    altura = (page.viewport_size or {"height": 720})["height"]
    assert box is not None and 0 <= box["y"] < altura, box
    expect(cartao).to_have_count(0)  # o aviso cumpriu o papel
    assert erros == [], erros


def test_ignorar_em_novos_fecha_o_aviso(page: Page, alvo: Alvo, novo_aparelho: Any) -> None:
    erros = vigiar_console(page)
    a = novo_aparelho()
    entrar(page, alvo)
    page.get_by_role("tab", name="Alertas").click()
    linha = page.locator(f'#lista-alertas li[data-id="{a["alerta_id"]}"]')
    expect(linha).to_be_visible(timeout=10_000)
    linha.get_by_role("button", name="Ver em Novos").click()
    alvo_novos = page.locator(f'#conteudo-novos .nv-cartao[data-id="{a["descoberta_id"]}"]')
    expect(alvo_novos).to_be_focused(timeout=20_000)
    alvo_novos.get_by_role("button", name=re.compile("^Ignorar")).click()
    expect(alvo_novos).to_have_count(0, timeout=10_000)
    page.get_by_role("tab", name="Alertas").click()
    # o agrupador fecha o alerta (ao vivo): sai de "Abertos"
    expect(linha).to_have_count(0, timeout=15_000)
    r = api_json(page, "GET", f"/alertas/{a['alerta_id']}")
    assert r["status"] == 200 and r["dados"]["fechado_em"] is not None, r
    assert erros == [], erros


def test_faixa_de_varredura_automatica(page: Page, alvo: Alvo) -> None:
    from conftest import PonteWs

    erros = vigiar_console(page)
    ponte = PonteWs(page)
    entrar(page, alvo)
    faixa = page.locator("#faixa-varredura")
    base = {
        "tipo": "varredura", "estado": "rodando", "cidr": "10.99.10.0/24",
        "total": 200, "feitos": 50, "achados": 1,
    }  # fmt: skip
    ponte.injetar({**base, "origem": "agendada"})
    expect(faixa).to_contain_text("Varredura automática em 10.99.10.0/24: 25%.")
    ponte.injetar({**base, "origem": "manual"})
    expect(faixa).to_contain_text("Varredura lenta em 10.99.10.0/24: 25%.")
    ponte.injetar({"tipo": "varredura", "estado": "concluida"})
    expect(faixa).to_be_hidden()
    assert erros == [], erros


def test_cartao_atualizacoes_mostra_versao_e_chave(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    versao = api_json(page, "GET", "/atualizacao")["dados"]["versao"]
    page.get_by_role("tab", name="Configurações").click()
    cartao = page.locator("#cfg-atualizacoes")
    expect(cartao).to_be_visible(timeout=10_000)
    expect(cartao.locator("#atz-versao")).to_have_text(f"Versão instalada: {versao}")
    chave = cartao.get_by_role("switch", name="Atualizar sozinho")
    expect(chave).to_have_attribute("aria-checked", "true")  # ligada por padrão
    expect(cartao.locator("#atz-agendamento")).to_contain_text("rode ./update.sh")
    expect(cartao.locator("#atz-resultado")).to_have_text(
        "Ainda não houve verificação de atualização."
    )
    try:
        with page.expect_request(
            lambda r: r.method == "PATCH" and r.url.endswith("/api/v1/atualizacao")
        ) as pedido:
            chave.click()
        assert json.loads(pedido.value.post_data or "{}") == {"ativo": False}
        expect(chave).to_have_attribute("aria-checked", "false")
        expect(cartao.locator("#atz-aviso")).to_have_text("Atualização automática desligada.")
        assert api_json(page, "GET", "/atualizacao")["dados"]["ativo"] is False
    finally:
        api_json(page, "PATCH", "/atualizacao", {"ativo": True})
    page.reload()
    page.get_by_role("tab", name="Configurações").click()
    expect(cartao.get_by_role("switch", name="Atualizar sozinho")).to_have_attribute(
        "aria-checked", "true"
    )
    assert erros == [], erros


def test_visualizador_nao_ve_o_cartao_atualizacoes_mas_ve_o_aviso(
    browser: Browser, alvo: Alvo
) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador (SENTINELA_SMOKE_LEITOR_LOGIN/SENHA)")
    contexto = browser.new_context(ignore_https_errors=True, base_url=alvo.url)
    try:
        page = contexto.new_page()
        erros = vigiar_console(page)
        servir_atualizacao(page, aviso_de_atualizacao())
        entrar(page, alvo, alvo.login_leitor, alvo.senha_leitor)
        expect(page.locator("#aviso-atualizacao")).to_contain_text("Atualizado para 0.5.0")
        page.goto("/index.html#configuracoes")
        expect(page.get_by_role("tab", name="Lista")).to_have_attribute("aria-selected", "true")
        expect(page.locator("#cfg-atualizacoes")).to_be_hidden()
        r = page.request.patch(
            "/api/v1/atualizacao", data={"ativo": False}, headers={"X-CSRF": "x"}
        )
        assert r.status in (401, 403), r.status
        assert erros == [], erros
    finally:
        contexto.close()


def test_aviso_de_24h_aparece_e_dispensa(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    servir_atualizacao(page, aviso_de_atualizacao())
    entrar(page, alvo)
    aviso = page.locator("#aviso-atualizacao")
    expect(aviso).to_be_visible(timeout=10_000)
    expect(aviso).to_contain_text("Atualizado para 0.5.0")
    # abaixo do cabeçalho e acima do conteúdo: nunca cobre nada
    topo = page.locator("header.topo").bounding_box()
    caixa = aviso.bounding_box()
    conteudo = page.locator("#conteudo").bounding_box()
    assert topo and caixa and conteudo
    assert caixa["y"] >= topo["y"] + topo["height"] - 1, (topo, caixa)
    assert caixa["y"] + caixa["height"] <= conteudo["y"] + 1, (caixa, conteudo)
    aviso.get_by_role("button", name=re.compile("^Dispensar")).click()
    expect(aviso).to_be_hidden()
    page.reload()
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)
    page.wait_for_timeout(500)
    expect(aviso).to_be_hidden()  # a dispensa fica guardada (por pessoa, neste navegador)
    assert erros == [], erros


def test_aviso_voltou_e_atencao_e_o_de_7_dias_usa_a_data_local(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    servir_atualizacao(
        page,
        aviso_de_atualizacao(
            resultado="voltou",
            aviso="A atualização para 0.5.0 falhou; o Sentinela voltou para 0.4.1",
        ),
    )
    entrar(page, alvo)
    aviso = page.locator("#aviso-atualizacao")
    expect(aviso).to_contain_text("voltou para 0.4.1", timeout=10_000)
    expect(aviso.locator(".aviso-atz")).to_have_class(re.compile("aviso-atz-atencao"))
    page.unroute_all()
    # 21/11 01:00 UTC é 20/11 22:00 no fuso da instalação (America/Sao_Paulo): a data é a local
    servir_atualizacao(
        page,
        aviso_de_atualizacao(
            resultado="sem_conexao",
            ultima_verificacao_ok="2026-11-21T01:00:00+00:00",
            aviso="O Sentinela não conseguiu verificar atualizações desde 21/11",
        ),
    )
    page.reload()
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)
    expect(aviso).to_contain_text("não conseguiu verificar atualizações", timeout=10_000)
    fuso = api_json(page, "GET", "/config/geral")["dados"]["fuso"]
    if fuso == "America/Sao_Paulo":
        expect(aviso).to_contain_text("desde 20/11")
    assert erros == [], erros


def test_subrede_salva_gateway_e_intervalo(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    sub = next(
        s for s in api_json(page, "GET", "/subredes")["dados"] if s["cidr"] == "10.99.10.0/24"
    )
    ajustes0 = api_json(page, "GET", "/config/descoberta")["dados"]
    page.get_by_role("tab", name="Configurações").click()
    secao = page.locator("#conteudo-configuracoes")
    campo = secao.get_by_label("Gateway (roteador) de 10.99.10.0/24")
    expect(campo).to_be_visible(timeout=10_000)
    salvar = secao.get_by_role("button", name="Salvar o gateway de 10.99.10.0/24")
    erro_gw = secao.locator(f"#cfg-gw-erro-{sub['id']}")
    escritas: list[str] = []
    page.on(
        "request",
        lambda r: escritas.append(r.url) if r.method == "PATCH" and "/api/v1/" in r.url else None,
    )
    try:
        # inválido: nada é enviado
        campo.fill("10.99.11.1")
        salvar.click()
        expect(erro_gw).to_have_text("O gateway precisa estar dentro da sub-rede.")
        campo.fill("roteador")
        salvar.click()
        expect(erro_gw).to_have_text("Informe um endereço IPv4, como 192.168.15.1.")
        assert escritas == [], escritas
        # válido: grava e o servidor confirma
        campo.fill("10.99.10.1")
        salvar.click()
        expect(secao.locator("#cfg-aviso")).to_have_text("Gateway de 10.99.10.0/24 salvo.")
        lista = api_json(page, "GET", "/subredes")["dados"]
        assert next(s for s in lista if s["id"] == sub["id"])["gateway_ip"] == "10.99.10.1"
        # intervalo fora de 15 a 240: nada é enviado
        n_antes = len(escritas)
        intervalo = secao.get_by_label("Varredura automática a cada (minutos)")
        botao = secao.get_by_role("button", name="Salvar intervalo")
        for ruim in ("14", "241"):
            intervalo.fill(ruim)
            botao.click()
            expect(secao.locator("#cfg-intervalo-erro")).to_have_text(
                "Informe de 15 a 240 minutos."
            )
        assert len(escritas) == n_antes, escritas
        intervalo.fill("45")
        botao.click()
        expect(secao.locator("#cfg-aviso")).to_contain_text("a cada 45 minutos")
        assert api_json(page, "GET", "/config/descoberta")["dados"]["varredura_continua_min"] == 45
    finally:
        api_json(page, "PATCH", f"/subredes/{sub['id']}", {"gateway_ip": sub["gateway_ip"]})
        api_json(
            page,
            "PATCH",
            "/config/descoberta",
            {"varredura_continua_min": ajustes0["varredura_continua_min"]},
        )
    assert erros == [], erros


LARGURAS_T10 = (360, 390, 768, 1024, 1280, 1366, 1440, 1920)
MEDIR_T10 = """(seletores) => {
    const vw = document.documentElement.clientWidth;
    const problemas = [];
    for (const sel of seletores) {
        for (const raiz of document.querySelectorAll(sel)) {
            for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
                const cs = getComputedStyle(el);
                if (cs.display === 'none' || cs.visibility === 'hidden') continue;
                if (el.closest('.so-leitor')) continue; // texto só para leitor de tela
                const r = el.getBoundingClientRect();
                if (!r.width || !r.height) continue;
                if (r.left < -0.5 || r.right > vw + 0.5) {
                    problemas.push([sel, el.className, 'fora', r.left, r.right]);
                }
                if (cs.textOverflow === 'ellipsis') {
                    problemas.push([sel, el.className, 'reticencias']);
                }
                const folga = el.scrollWidth > el.clientWidth + 1;
                if (el.children.length === 0 && folga && cs.overflowX !== 'visible') {
                    problemas.push([sel, el.className, 'cortado', el.scrollWidth, el.clientWidth]);
                }
            }
        }
    }
    return {vw, rolagem: document.documentElement.scrollWidth, problemas};
}"""


def test_telas_novas_sem_corte_nas_8_larguras(
    browser: Browser, alvo: Alvo, novo_aparelho: Any
) -> None:
    """Sub-redes, Atualizações, aviso de 24 h e a linha de aparelho novo (fabricante de 120
    caracteres, 12 portas, mensagem de 200): nada passa da janela, nada é cortado nem vira
    reticências, em 360 a 1920 px."""
    a = novo_aparelho(
        fabricante=(
            "Fabricante Internacional de Equipamentos de Rede e Telecomunicações Ltda., Divisão"
            " Industrial de Câmeras IP e Gravadores de Vídeo"
        )[:120],
        sinais={"portas": [21, 22, 23, 80, 443, 554, 8000, 8080, 8443, 9000, 37777, 49152]},
    )
    mensagem = "Falha ao verificar a imagem: " + "x" * 160 + " fim."
    corpo = aviso_de_atualizacao(
        resultado="falhou", mensagem=mensagem[:200], aviso="A atualização falhou; " + "y" * 120
    )
    for largura in LARGURAS_T10:
        contexto = browser.new_context(
            viewport={"width": largura, "height": 900}, ignore_https_errors=True, base_url=alvo.url
        )
        try:
            page = contexto.new_page()
            servir_atualizacao(page, corpo)
            entrar(page, alvo)
            expect(page.locator("#aviso-atualizacao")).to_be_visible(timeout=10_000)
            r = page.evaluate(MEDIR_T10, ["#aviso-atualizacao"])
            assert r["rolagem"] <= r["vw"] and r["problemas"] == [], (largura, r)
            page.get_by_role("tab", name="Alertas").click()
            expect(page.locator(f'#lista-alertas li[data-id="{a["alerta_id"]}"]')).to_be_visible(
                timeout=10_000
            )
            r = page.evaluate(MEDIR_T10, ["#lista-alertas"])
            assert r["rolagem"] <= r["vw"] and r["problemas"] == [], (largura, r)
            page.get_by_role("tab", name="Configurações").click()
            expect(page.locator("#cfg-subredes li").first).to_be_visible(timeout=10_000)
            page.locator("#cfg-atualizacoes").scroll_into_view_if_needed()
            expect(page.locator("#atz-resultado")).to_contain_text(mensagem[:200])
            r = page.evaluate(
                MEDIR_T10, ["#cfg-subredes", "#cfg-intervalo-bloco", "#cfg-atualizacoes"]
            )
            assert r["rolagem"] <= r["vw"] and r["problemas"] == [], (largura, r)
        finally:
            contexto.close()


# ---------- Diagnóstico (Fase 5, Task 11) ----------
CODIGO_PERIODO = {"24 horas": "24h", "7 dias": "7d", "30 dias": "30d"}


def abrir_diagnostico(page: Page, periodo: str = "30 dias") -> Any:
    page.get_by_role("tab", name="Diagnóstico").click()
    expect(page.get_by_role("tab", name="Diagnóstico")).to_have_attribute("aria-selected", "true")
    assert page.url.endswith("#diagnostico"), page.url
    secao = page.locator("#conteudo-diagnostico")
    expect(secao.locator("#dg-resumo")).to_be_visible(timeout=20_000)  # 24 h, a abertura
    with page.expect_response(
        re.compile(rf"/api/v1/diagnostico\?periodo={CODIGO_PERIODO[periodo]}$")
    ) as resposta:
        secao.get_by_role("button", name=periodo, exact=True).click()
    assert resposta.value.status == 200
    expect(secao.get_by_role("button", name=periodo, exact=True)).to_have_attribute(
        "aria-pressed", "true"
    )
    expect(secao.locator("#dg-resumo")).to_be_visible(timeout=20_000)
    return secao


def test_aba_diagnostico_mostra_resumo_barras_e_incidentes(page: Page, alvo: Alvo) -> None:
    erros = vigiar_console(page)
    entrar(page, alvo)
    secao = abrir_diagnostico(page)
    assert int(secao.locator("#dg-total").inner_text()) >= 20  # o roteador reinicia quase todo dia
    assert secao.locator("#dg-fora").inner_text().strip() not in ("", "0 s")
    expect(secao.locator(".dg-coluna")).to_have_count(24)
    expect(secao.locator("#dg-tabela-horas tbody tr")).to_have_count(24)
    expect(secao.locator(".dg-barra.dg-barra-pico")).to_have_count(1)  # um só pico, às 19 h locais
    expect(secao.locator("#dg-pico")).to_contain_text("19 h")
    # "provável" (sem uptime não há "confirmado") e o porquê visível, não só em dica
    primeiro = secao.locator("#lista-incidentes li.dg-inc").first
    expect(primeiro).to_be_visible()
    expect(primeiro.locator(".dg-inc-rotulo")).to_contain_text("provável")
    expect(primeiro.get_by_text("Por quê", exact=True)).to_be_visible()
    expect(primeiro.locator(".dg-inc-porque li").first).to_be_visible()
    expect(primeiro.locator(".dg-nomes li").first).to_be_visible()
    # sugestões por tipo, o texto de energia e a regra do período (incidentes que começaram nele)
    expect(secao.locator("#dg-sugestoes")).to_contain_text("Trocar a fonte do roteador.")
    expect(secao.locator("#dg-energia")).to_contain_text("nobreak")
    expect(secao.locator("#dg-nota")).to_contain_text("começaram")
    expect(secao.locator("#dg-carregando")).to_be_hidden()
    assert erros == [], erros


def test_trocar_periodo_recarrega(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    secao = abrir_diagnostico(page, "30 dias")
    total30 = int(secao.locator("#dg-total").inner_text())
    with page.expect_request(re.compile(r"/api/v1/diagnostico\?periodo=7d$")):
        secao.get_by_role("button", name="7 dias", exact=True).click()
    expect(secao.get_by_role("button", name="7 dias", exact=True)).to_have_attribute(
        "aria-pressed", "true"
    )
    expect(secao.get_by_role("button", name="30 dias", exact=True)).to_have_attribute(
        "aria-pressed", "false"
    )
    expect(secao.locator("#dg-total")).not_to_have_text(str(total30), timeout=10_000)
    expect(secao.locator("#dg-periodo-texto")).to_contain_text("De ")


def test_baixar_csv(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    secao = abrir_diagnostico(page)
    with page.expect_download() as baixado:
        secao.locator("#dg-baixar-csv").click()
    arquivo = baixado.value
    assert re.fullmatch(r"sentinela-diagnostico-\d{8}-30d\.csv", arquivo.suggested_filename)
    texto = Path(arquivo.path()).read_bytes().decode("utf-8")
    assert texto.startswith('﻿"inicio";"fim";"duracao";"classificacao";')
    assert "Roteador reiniciou (provável)" in texto
    assert "10.99." not in texto  # só nomes, nunca IP


def test_impressao_esconde_navegacao(page: Page, alvo: Alvo) -> None:
    entrar(page, alvo)
    secao = abrir_diagnostico(page)
    expect(secao.locator(".dg-laudo-cabeca")).to_be_hidden()  # só no papel
    page.emulate_media(media="print")
    expect(page.locator(".topo")).to_be_hidden()
    expect(page.locator("nav.abas")).to_be_hidden()
    expect(page.locator("#cartoes-alerta")).to_be_hidden()
    expect(page.locator(".campo")).to_be_hidden()
    expect(secao.locator(".dg-ferramentas")).to_be_hidden()
    expect(secao.locator(".dg-laudo-cabeca")).to_be_visible()
    expect(secao.locator(".dg-laudo-cabeca h2")).to_have_text("Laudo de quedas: últimos 30 dias")
    expect(secao.locator(".dg-laudo-cabeca")).to_contain_text("Gerado em")
    expect(secao.locator("#lista-incidentes li.dg-inc").first).to_be_visible()
    cor = secao.locator(".dg-inc").first.evaluate("e => getComputedStyle(e).backgroundColor")
    assert cor == "rgb(255, 255, 255)", cor  # papel branco mesmo no tema escuro
    largura = page.evaluate(
        "() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]"
    )
    assert largura[0] <= largura[1], largura


def test_sem_gateway_mostra_a_dica(page: Page, alvo: Alvo) -> None:
    aviso = "Sem o gateway cadastrado, o Diagnóstico não consegue dizer se o roteador reiniciou."

    def sem_gateway(rota: Route) -> None:
        corpo = rota.fetch().json()
        corpo["gateway_configurado"] = False
        corpo["aviso_gateway"] = aviso
        rota.fulfill(json=corpo)

    page.route(re.compile(r"/api/v1/diagnostico\?"), sem_gateway)
    entrar(page, alvo)
    abrir_diagnostico(page)
    expect(page.locator("#dg-aviso-gateway")).to_have_text(aviso)


def test_diagnostico_vazio_truncado_e_429(page: Page, alvo: Alvo) -> None:
    vazio = {
        "periodo": "24h",
        "de": "2026-11-19T15:00:00Z",
        "ate": "2026-11-20T15:00:00Z",
        "resumo": {"incidentes": 0, "por_tipo": {}, "fora_s": 0},
        "horas": [0] * 24,
        "incidentes": [],
        "gateway_configurado": True,
        "truncado": False,
        "aviso_energia": "Queda de energia não é medida pelo Sentinela.",
        "aviso_gateway": None,
    }
    estado = {"modo": "vazio"}

    def responder(rota: Route) -> None:
        if estado["modo"] == "429":
            rota.fulfill(status=429, json={"detail": "x"}, headers={"Retry-After": "7"})
        else:
            rota.fulfill(json={**vazio, "truncado": estado["modo"] == "truncado"})

    page.route(re.compile(r"/api/v1/diagnostico\?"), responder)
    entrar(page, alvo)
    page.get_by_role("tab", name="Diagnóstico").click()
    secao = page.locator("#conteudo-diagnostico")
    expect(secao.locator("#dg-vazio")).to_contain_text("Nenhuma queda no período")
    expect(secao.locator("#dg-resumo")).to_be_hidden()
    expect(secao.locator("#dg-aviso-truncado")).to_be_hidden()
    estado["modo"] = "truncado"
    secao.get_by_role("button", name="7 dias", exact=True).click()
    expect(secao.locator("#dg-aviso-truncado")).to_be_visible()
    estado["modo"] = "429"
    secao.get_by_role("button", name="30 dias", exact=True).click()
    expect(secao.locator("#dg-erro")).to_contain_text("Aguarde 7 s")
    # o 429 não apaga o que já estava na tela: continua o período anterior, com o aviso
    expect(secao.get_by_role("button", name="7 dias", exact=True)).to_have_attribute(
        "aria-pressed", "true"
    )
    expect(secao.locator("#dg-aviso-truncado")).to_be_visible()
    estado["modo"] = "vazio"
    secao.get_by_role("button", name="Tentar de novo").click()
    expect(secao.locator("#dg-erro")).to_be_hidden()
    expect(secao.locator("#dg-vazio")).to_be_visible()


def test_alternar_periodos_nao_chega_ao_429_e_usa_cache(page: Page, alvo: Alvo) -> None:
    codigos: list[int] = []
    page.on(
        "response",
        lambda r: codigos.append(r.status) if re.search(r"/api/v1/diagnostico\?", r.url) else None,
    )
    entrar(page, alvo)
    secao = abrir_diagnostico(page, "30 dias")
    for _ in range(2):
        for nome in ("24 horas", "7 dias", "30 dias"):
            secao.get_by_role("button", name=nome, exact=True).click()
            expect(secao.get_by_role("button", name=nome, exact=True)).to_have_attribute(
                "aria-pressed", "true"
            )
            expect(secao.locator("#dg-resumo")).to_be_visible()
    assert 429 not in codigos and set(codigos) == {200}, codigos
    assert len(codigos) == 3, codigos  # 24 h, 30 d e 7 d; o resto saiu do cache de 60 s
    expect(secao.locator("#dg-erro")).to_be_hidden()


def test_csv_com_429_mostra_o_aviso_na_pagina(page: Page, alvo: Alvo) -> None:
    page.route(
        re.compile(r"/api/v1/diagnostico/laudo\.csv"),
        lambda r: r.fulfill(status=429, json={"detail": "x"}, headers={"Retry-After": "9"}),
    )
    entrar(page, alvo)
    secao = abrir_diagnostico(page)
    secao.locator("#dg-baixar-csv").click()
    expect(secao.locator("#dg-erro-csv")).to_contain_text("Aguarde 9 s")
    expect(secao.locator("#dg-resumo")).to_be_visible()  # a tela não perdeu os dados


def test_visualizador_ve_diagnostico(page: Page, alvo: Alvo) -> None:
    if not alvo.login_leitor:
        pytest.skip("sem usuário visualizador (SENTINELA_SMOKE_LEITOR_LOGIN/SENHA)")
    erros = vigiar_console(page)
    entrar(page, alvo, alvo.login_leitor, alvo.senha_leitor)
    secao = abrir_diagnostico(page)
    expect(secao.locator("#lista-incidentes li.dg-inc").first).to_be_visible()
    expect(secao.locator("#dg-baixar-csv")).to_be_visible()
    expect(page.get_by_role("tab", name="Configurações")).to_have_count(0)
    assert erros == [], erros
