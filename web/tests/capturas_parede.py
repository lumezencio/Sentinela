"""Capturas do telão ``/parede`` e do cartão Configurações → Telões nas 8 larguras do dono
(altura 900 px). Não é coletado pelo smoke (nome fora de ``test_*``). De ``core/``::

    uv run --with pytest-playwright --with cryptography python ../web/tests/capturas_parede.py \\
        --saida capturas

Sobe o demo do smoke (HTTPS local, banco temporário) com 9 alertas abertos (inclusive o nome
de 300 caracteres), emparelha um telão de nome longo pela API e captura:

- ``parede-codigo-<largura>.png``: tela do código (TV ainda não emparelhada);
- ``parede-teia-<largura>.png``: telão com a Teia (WebGL por software do Chromium);
- ``parede-organograma-<largura>.png``: telão sem WebGL (Organograma em modo telão);
- ``parede-sem-conexao-<largura>.png``: servidor fora por mais de 60 s (relógio falso);
- ``teloes-<tema>-<largura>.png`` e ``...-pagina.png``: o cartão Telões (com a chave HTTP
  ligada, mostrando o aviso de HSTS, um telão ativo e um revogado).

A faixa de alertas (6 visíveis + "e mais 3") aparece nas capturas do telão.
"""

import argparse
import asyncio
import re
import tempfile
from pathlib import Path
from typing import Any

from capturar_telas import ALTURA, LARGURAS, POST_JSON, TEMAS, _entrar, _subir_local, pasta_saida
from playwright.sync_api import Browser, Page, expect, sync_playwright

from conftest import inserir_alerta

NOME_TELAO = "TV da portaria principal do bloco administrativo B, ao lado da"  # 62 caracteres
SEM_WEBGL = ["--disable-webgl", "--disable-3d-apis"]

PEDIR_CODIGO = """async () => {
    const r = await fetch('/api/v1/parede/pedido', {method: 'POST'});
    return (await r.json()).codigo;
}"""
CONSULTAR = "async () => (await fetch('/api/v1/parede/pedido')).status"
REQUISITAR = """async ([metodo, caminho, corpo]) => {
    const csrf = document.cookie.split('; ').find((c) => c.startsWith('sentinela_csrf='));
    const r = await fetch('/api/v1' + caminho, {
        method: metodo,
        headers: {'Content-Type': 'application/json',
                  'X-CSRF': decodeURIComponent(csrf.split('=')[1])},
        body: corpo === null ? undefined : JSON.stringify(corpo),
    });
    return r.status;
}"""


def _emparelhar(navegador: Browser, url: str, admin: dict[str, Any], nome: str) -> dict[str, Any]:
    """Storage state de uma TV emparelhada pela API (cookie HttpOnly do token)."""
    tv_ctx = navegador.new_context(ignore_https_errors=True, base_url=url)
    adm_ctx = navegador.new_context(ignore_https_errors=True, base_url=url, storage_state=admin)
    try:
        tv = tv_ctx.new_page()
        tv.goto("/favicon.svg")
        codigo = tv.evaluate(PEDIR_CODIGO)
        adm = adm_ctx.new_page()
        adm.goto("/favicon.svg")
        r = adm.evaluate(POST_JSON, ["/paredes/aprovar", {"codigo": codigo, "nome": nome}])
        assert r["status"] == 201, r
        assert tv.evaluate(CONSULTAR) == 200
        return tv_ctx.storage_state()
    finally:
        tv_ctx.close()
        adm_ctx.close()


def _telao(page: Page, saida: Path, prefixo: str, espera_ms: int) -> None:
    page.goto("/parede/")
    expect(page.locator("body")).to_have_attribute("data-modo", "telao", timeout=20_000)
    page.wait_for_timeout(espera_ms)
    for largura in LARGURAS:
        page.set_viewport_size({"width": largura, "height": ALTURA})
        page.wait_for_timeout(espera_ms // 2)
        page.screenshot(path=str(saida / f"{prefixo}-{largura}.png"))


def _sem_conexao(navegador: Browser, url: str, estado: dict[str, Any], saida: Path) -> None:
    contexto = navegador.new_context(ignore_https_errors=True, base_url=url, storage_state=estado)
    try:
        page = contexto.new_page()
        abertos: list[Any] = []
        bloquear = {"sim": False}

        def rota(ws: Any) -> None:
            if bloquear["sim"]:
                ws.close(code=1011)
                return
            ws.connect_to_server()
            abertos.append(ws)

        page.route_web_socket(re.compile(r"/ws/parede$"), rota)
        page.clock.install()
        page.goto("/parede/")
        expect(page.locator("body")).to_have_attribute("data-modo", "telao", timeout=20_000)
        bloquear["sim"] = True
        for ws in abertos:
            ws.close(code=1011)
        page.clock.run_for(61_000)
        expect(page.locator("#pr-sem-conexao")).to_be_visible()
        for largura in LARGURAS:
            page.set_viewport_size({"width": largura, "height": ALTURA})
            page.clock.run_for(100)
            page.screenshot(path=str(saida / f"parede-sem-conexao-{largura}.png"))
    finally:
        contexto.close()


def _teloes(navegador: Browser, url: str, admin: dict[str, Any], saida: Path) -> None:
    for tema in TEMAS:
        for largura in LARGURAS:
            contexto = navegador.new_context(
                viewport={"width": largura, "height": ALTURA},
                ignore_https_errors=True,
                base_url=url,
                storage_state=admin,
                color_scheme="light" if tema == "claro" else "dark",
            )
            try:
                page = contexto.new_page()
                page.goto("/index.html#configuracoes")
                cartao = page.locator("#cfg-teloes")
                expect(cartao.locator("#tel-lista li").first).to_be_visible(timeout=20_000)
                expect(cartao.locator("#tel-aviso-hsts")).to_be_visible()
                cartao.get_by_label("Código da TV").fill("abc")
                cartao.get_by_role("button", name="Aprovar").click()  # erro de validação à vista
                expect(cartao.locator("#tel-codigo-erro")).to_be_visible()
                page.wait_for_timeout(900)
                cartao.evaluate("e => e.scrollIntoView({block: 'start'})")
                page.wait_for_timeout(200)
                base = saida / f"teloes-{tema}-{largura}"
                page.screenshot(path=f"{base}.png")
                page.evaluate("document.querySelector('.topo').style.position = 'static'")
                cartao.screenshot(path=f"{base}-cartao.png")
            finally:
                contexto.close()


def capturar(url: str, login: str, senha: str, banco: str, saida: Path) -> None:
    for i in range(4):  # 5 abertos do semear_alertas + 4 = 9 (faixa: 6 + "e mais 3")
        asyncio.run(inserir_alerta(banco, i))
    with sync_playwright() as p:
        navegador = p.chromium.launch()
        sem_gl = p.chromium.launch(args=SEM_WEBGL)
        try:
            admin = _entrar(navegador, url, login, senha)
            # tela do código: um único pedido (o servidor limita 10 por IP por hora)
            contexto = navegador.new_context(ignore_https_errors=True, base_url=url)
            page = contexto.new_page()
            page.goto("/parede/")
            expect(page.locator("#pr-codigo-valor")).to_have_text(
                re.compile(r"^[2-9A-Z]{4}-[2-9A-Z]{4}$"), timeout=15_000
            )
            for largura in LARGURAS:
                page.set_viewport_size({"width": largura, "height": ALTURA})
                page.wait_for_timeout(200)
                page.screenshot(path=str(saida / f"parede-codigo-{largura}.png"))
            contexto.close()

            estado = _emparelhar(navegador, url, admin, NOME_TELAO)
            _emparelhar(navegador, url, admin, "TV antiga da guarita")  # revogado logo abaixo
            for nome, ctx_estado in (("teia", estado), ("organograma", estado)):
                nav = navegador if nome == "teia" else sem_gl
                contexto = nav.new_context(
                    ignore_https_errors=True, base_url=url, storage_state=ctx_estado
                )
                try:
                    _telao(contexto.new_page(), saida, f"parede-{nome}", 3000)
                finally:
                    contexto.close()
            _sem_conexao(sem_gl, url, estado, saida)

            # cartão Telões: um ativo, um revogado e a chave HTTP ligada (aviso de HSTS)
            adm_ctx = navegador.new_context(
                ignore_https_errors=True, base_url=url, storage_state=admin
            )
            adm = adm_ctx.new_page()
            adm.goto("/favicon.svg")
            lista = adm.evaluate("async () => (await fetch('/api/v1/paredes')).json()")
            antigo = next(t["id"] for t in lista if t["nome"] == "TV antiga da guarita")
            assert adm.evaluate(REQUISITAR, ["DELETE", f"/paredes/{antigo}", None]) == 204
            assert (
                adm.evaluate(REQUISITAR, ["PATCH", "/config/paredes", {"permitir_http": True}])
                == 200
            )
            adm_ctx.close()
            _teloes(navegador, url, admin, saida)
        finally:
            sem_gl.close()
            navegador.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--saida", type=Path, default=None, help="pasta das imagens")
    args = ap.parse_args()
    saida = args.saida or pasta_saida()
    saida.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sentinela-capt-") as tmp:
        url, login, senha, servidor = _subir_local(Path(tmp))
        banco = f"sqlite+aiosqlite:///{(Path(tmp) / 'capturas.db').as_posix()}"
        try:
            capturar(url, login, senha, banco, saida)
        finally:
            servidor.derrubar()
    print(f"capturas em {saida}")


if __name__ == "__main__":
    main()
