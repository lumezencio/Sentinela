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
import re
from pathlib import Path
from typing import Any

import pytest
from playwright.sync_api import Browser, ConsoleMessage, Page, Response, Route, expect

from conftest import Alvo

TETO_PRIMEIRA_TELA = 150 * 1024  # gzip, §12
TOTAL_DEMO = 300
CAMERAS_DEMO = 120
POR_PAGINA = 50
TIPOS_PRIMEIRA_TELA = ("document", "script", "stylesheet", "image", "fetch", "font")


def entrar(page: Page, alvo: Alvo, login: str = "", senha: str = "") -> None:
    page.goto("/login.html")
    page.get_by_label("Login").fill(login or alvo.login)
    page.get_by_label("Senha").fill(senha or alvo.senha)
    page.get_by_role("button", name="Entrar").click()
    page.wait_for_url("**/index.html")
    expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO), timeout=15_000)


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
        if palco.get_attribute("data-nivel") != "agrupado":
            expect(palco).to_have_attribute("data-nos", str(TOTAL_DEMO + 1))
            # nenhum nó duplicado entregue ao grafo (não só no mapa interno da cena)
            expect(palco).to_have_attribute("data-nos-grafo", str(TOTAL_DEMO + 1))
        assert canvases_da_teia(page) == 1
        # 10 trocas de aba não acumulam geometrias/texturas na GPU (um renderer, objetos reusados)
        page.wait_for_timeout(600)
        nivel = palco.get_attribute("data-nivel")
        geo = int(palco.get_attribute("data-geometrias") or "0")
        tex = int(palco.get_attribute("data-texturas") or "0")
        assert geo > 0, geo
        for n in range(10):
            page.get_by_role("tab", name="Lista" if n % 2 == 0 else "Teia").click()
        expect(page.get_by_role("tab", name="Teia")).to_have_attribute("aria-selected", "true")
        page.wait_for_timeout(600)
        assert canvases_da_teia(page) == 1
        if palco.get_attribute("data-nivel") == nivel:  # trocar de nível recria os objetos
            assert int(palco.get_attribute("data-geometrias") or "0") <= geo
            assert int(palco.get_attribute("data-texturas") or "0") <= tex
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
    # rotação automática ligada e câmera na vista geral do estilo A (órbita em y = 260, raio 520)
    expect(palco).to_have_attribute("data-girando", "sim")
    expect(page.locator("#painel-equipamento")).to_be_hidden()
    page.wait_for_timeout(600)
    x, y, z = (int(v) for v in (palco.get_attribute("data-camera") or "0,0,0").split(","))
    assert abs(y - 260) <= 5, (x, y, z)
    assert abs((x * x + z * z) ** 0.5 - 520) <= 10, (x, y, z)
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


def esperar_estados_variados(page: Page) -> None:
    """Demonstração rodando há algum tempo: já há equipamento fora do online."""
    for _ in range(60):
        ruins = sum(
            int(page.locator(f"#contador-{n}").inner_text()) for n in ("offline", "instavel")
        )
        if ruins:
            return
        page.wait_for_timeout(500)
    pytest.fail("a demonstração não produziu nenhum equipamento offline/instável em 30 s")


def pesos_por_cartao(secao: Any) -> list[list[int]]:
    resultado: list[list[int]] = secao.locator(".org-cartao").evaluate_all(
        "cs => cs.map(c => [...c.querySelectorAll('.org-item')].map(i => Number(i.dataset.peso)))"
    )
    return resultado


def test_organograma_360_pior_estado_primeiro_sem_rolagem(browser: Browser, alvo: Alvo) -> None:
    contexto = browser.new_context(
        viewport={"width": 360, "height": 740}, ignore_https_errors=True, base_url=alvo.url
    )
    try:
        page = contexto.new_page()
        erros = vigiar_console(page)
        entrar(page, alvo)
        esperar_estados_variados(page)
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
    expect(secao.locator('.org-cartao[data-slug="gravador"] .org-item')).to_have_count(8)
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
    dialogo.get_by_role("button", name="Criar fonte").click()
    expect(dialogo).to_be_hidden()
    cartao = secao.locator(".cfg-fonte").filter(has_text="Roteador Smoke")
    expect(cartao).to_have_count(1)
    try:
        expect(cartao.locator(".cfg-ficha").first).to_contain_text("10.99.40.21:8729")
        expect(cartao).to_contain_text("TLS")
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
