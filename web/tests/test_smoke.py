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
    soma = sum(
        int(page.locator(f"#contador-{nome}").inner_text())
        for nome in ("online", "instavel", "offline", "pausado", "aguardando")
    )
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
        assert canvases_da_teia(page) == 1
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
        primeira = set(itens.evaluate_all("is => is.map(i => i.dataset.id)"))
        cameras.get_by_role("button", name=re.compile("^Próxima")).click()
        expect(cameras.locator(".org-pagina-info")).to_have_text("2 de 3")
        expect(itens).to_have_count(POR_PAGINA)
        segunda = set(itens.evaluate_all("is => is.map(i => i.dataset.id)"))
        assert len(segunda) == POR_PAGINA and not primeira & segunda
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
    item = gravadores.locator(".org-item").first
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
