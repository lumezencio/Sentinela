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
``configuracoes`` (cartões do Telegram e do fuso). Cada um sai em
``<destino>-<tema>-<largura>.png`` (a janela de 900 px) e ``...-pagina.png`` (a página inteira).
"""

import argparse
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
)
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


def _abrir(page: Page, destino: str) -> None:
    if destino in ("teia", "teia-perto"):
        _abrir_teia(page, destino == "teia-perto")
        return
    if destino == "organograma":
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


def _capturar_tela(page: Page, destino: str, saida: Path, tema: str, largura: int) -> None:
    base = saida / f"{destino}-{tema}-{largura}"
    _abrir(page, destino)
    if destino == "configuracoes":
        page.locator("#cfg-telegram").scroll_into_view_if_needed()
        page.wait_for_timeout(200)
    if destino == "alertas-dialogo":
        _preparar_dialogo(page)
        page.screenshot(path=f"{base}.png")
        page.keyboard.press("Escape")
        return
    page.screenshot(path=f"{base}.png")
    if destino.startswith("teia"):
        return  # a Teia ocupa a janela: a página inteira seria igual
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
    url: str, login: str, senha: str, destinos: list[str], saida: Path, gpu: bool = False
) -> None:
    with sync_playwright() as p:
        navegador = p.chromium.launch(args=ARGS_GPU if gpu else [])
        try:
            estado = _entrar(navegador, url, login, senha)
            for destino in destinos:
                for tema in TEMAS:
                    for largura in LARGURAS:
                        contexto = navegador.new_context(
                            viewport={"width": largura, "height": ALTURA},
                            ignore_https_errors=True,
                            base_url=url,
                            storage_state=estado,
                            color_scheme="light" if tema == "claro" else "dark",
                        )
                        ids: list[int] = []
                        try:
                            page = contexto.new_page()
                            if destino == "alertas-silencio":
                                ids = _criar_silencios(page)
                            _capturar_tela(page, destino, saida, tema, largura)
                        finally:
                            if ids:
                                _encerrar_silencios(page, ids)
                            contexto.close()
        finally:
            navegador.close()


def _subir_local(pasta: Path) -> tuple[str, str, str, Any]:
    """Demo do smoke (HTTPS local, banco temporário) com alertas fictícios; devolve
    (url, login, senha, servidor)."""
    import asyncio

    from conftest import (
        ServidorLocal,
        _certificado,
        _porta_livre,
        _preparar_banco,
        semear_alertas,
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
    asyncio.run(semear_alertas(banco, NOME_LONGO, NOME_EXTREMO))
    return f"https://127.0.0.1:{servidor.porta}", login, senha, servidor


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--url", help="endereço do Sentinela (padrão: SENTINELA_URL_SMOKE)")
    ap.add_argument("--local", action="store_true", help="sobe o demo do smoke e captura nele")
    ap.add_argument("--saida", type=Path, default=None, help="pasta das imagens")
    ap.add_argument("--destinos", default=",".join(DESTINOS), help=f"entre {', '.join(DESTINOS)}")
    ap.add_argument("--gpu", action="store_true", help="Chromium com GPU real (Teia sem agrupar)")
    args = ap.parse_args()
    destinos = [d.strip() for d in args.destinos.split(",") if d.strip()]
    desconhecidos = [d for d in destinos if d not in DESTINOS]
    if desconhecidos:
        sys.exit(f"destino desconhecido: {', '.join(desconhecidos)}")
    saida = args.saida or pasta_saida()
    saida.mkdir(parents=True, exist_ok=True)
    if args.local:
        with tempfile.TemporaryDirectory(prefix="sentinela-capt-") as tmp:
            url, login, senha, servidor = _subir_local(Path(tmp))
            try:
                capturar(url, login, senha, destinos, saida, args.gpu)
            finally:
                servidor.derrubar()
    else:
        url = args.url or os.environ.get("SENTINELA_URL_SMOKE", "")
        login = os.environ.get("SENTINELA_SMOKE_LOGIN", "")
        senha = os.environ.get("SENTINELA_SMOKE_SENHA", "")
        if not (url and login and senha):
            sys.exit("informe --url (ou SENTINELA_URL_SMOKE) e SENTINELA_SMOKE_LOGIN/SENHA")
        capturar(url, login, senha, destinos, saida, args.gpu)
    print(f"capturas em {saida}")


if __name__ == "__main__":
    main()
