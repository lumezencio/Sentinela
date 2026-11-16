"""Smoke do front da Fase 1: login, lista ao vivo, filtro, reconexão e celular.

Rodar (de ``core/``)::

    uv run --with pytest-playwright --with cryptography playwright install chromium  # 1ª vez
    uv run --with pytest-playwright --with cryptography pytest ../web/tests -q

Contra o compose (Task 13): defina ``SENTINELA_URL_SMOKE``, ``SENTINELA_SMOKE_LOGIN`` e
``SENTINELA_SMOKE_SENHA``; a queda do core vira ``docker compose stop/start core``.
"""

import gzip
from typing import Any

from playwright.sync_api import Browser, ConsoleMessage, Page, Response, expect

from conftest import Alvo

TETO_PRIMEIRA_TELA = 150 * 1024  # gzip, §12
TOTAL_DEMO = 300
CAMERAS_DEMO = 120
POR_PAGINA = 50
TIPOS_PRIMEIRA_TELA = ("document", "script", "stylesheet", "image", "fetch", "font")


def entrar(page: Page, alvo: Alvo) -> None:
    page.goto("/login.html")
    page.get_by_label("Login").fill(alvo.login)
    page.get_by_label("Senha").fill(alvo.senha)
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
    # abas futuras visíveis mas desabilitadas
    expect(page.get_by_role("tab", name="Teia")).to_be_disabled()
    expect(page.get_by_role("tab", name="Organograma")).to_be_disabled()
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
    finally:
        contexto.close()


def test_primeira_tela_leve_e_sem_erros_no_console(page: Page, alvo: Alvo) -> None:
    erros: list[str] = []
    respostas: list[Response] = []
    page.on("console", lambda m: _anotar_erro(erros, m))
    page.on("pageerror", lambda e: erros.append(str(e)))
    entrar(page, alvo)  # o login também precisa passar sem violação de CSP
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
