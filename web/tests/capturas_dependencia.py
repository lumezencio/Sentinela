"""Capturas da Task 9 (inalcançável e "Depende de") nas 8 larguras do dono, altura 900.

Não é coletado pelo smoke normal (nome fora de ``test_*``). Rodar de ``core/``::

    SENTINELA_CAPTURAS=<pasta> uv run --with pytest-playwright --with cryptography \\
        pytest ../web/tests/capturas_dependencia.py -q

O demo não deixa o admin forçar ``inalcancavel``; aqui o WebSocket do navegador é
interceptado e o snapshot reescrito (o equipamento "filho" vira inalcançável com causa
``pai:<id>`` e o pai, offline). Só dados fictícios. A Task 10 (``capturar_telas.py``) é o
roteiro comum (larguras, pasta de saída e interceptação do WebSocket vêm de lá).
"""

import json
import re
from pathlib import Path
from typing import Any

from capturar_telas import ALTURA, LARGURAS, interceptar_ws, pasta_saida
from playwright.sync_api import Page, expect
from test_smoke import (
    CRIAR_VIA_API,
    TOTAL_DEMO,
    abrir_organograma,
    apagar_equipamentos,
    api_json,
    entrar,
)

from conftest import Alvo

PAI = "Switch Torre Norte"
FILHO = "Impressora do Financeiro, sala 2 do segundo andar do bloco B"
OUTRO = "Câmera do Pátio"


def reescrever_snapshot(texto: str, ids: dict[str, str]) -> str:
    """Pai offline e filho inalcançável por ele, só no que o navegador recebe."""
    try:
        msg: dict[str, Any] = json.loads(texto)
    except ValueError:
        return texto
    if msg.get("tipo") == "estado" and msg.get("id") in ids.values():
        # a simulação do demo continua publicando estados: os três seguem fixos na captura
        if msg["id"] == ids[PAI]:
            msg["estado"] = "offline"
        else:
            msg["estado"], msg["causa"] = "inalcancavel", f"pai:{ids[PAI]}"
        return json.dumps(msg)
    if msg.get("tipo") != "snapshot":
        return texto
    for eq in msg.get("equipamentos", []):
        if eq["id"] == ids[PAI]:
            eq["estado"] = "offline"
        elif eq["id"] in (ids[FILHO], ids[OUTRO]):
            eq["estado"] = "inalcancavel"
            eq["causa"] = f"pai:{ids[PAI]}"
    return json.dumps(msg)


def test_capturar_dependencia(page: Page, alvo: Alvo) -> None:
    saida = pasta_saida()
    entrar(page, alvo)
    ids: dict[str, str] = {}
    for nome, ip in ((PAI, "10.99.60.241"), (FILHO, "10.99.60.242"), (OUTRO, "10.99.60.243")):
        criado = page.evaluate(CRIAR_VIA_API, {"nome": nome, "ip": ip, "classe": "iot"})
        assert criado["status"] == 201, criado
        ids[nome] = criado["corpo"]["id"]
    try:
        for nome in (FILHO, OUTRO):
            r = api_json(page, "PATCH", f"/equipamentos/{ids[nome]}", {"pai_id": ids[PAI]})
            assert r["status"] == 200, r
        interceptar_ws(page, lambda texto: reescrever_snapshot(texto, ids))
        page.reload()
        expect(page.locator("#contador-total")).to_have_text(str(TOTAL_DEMO + 3), timeout=20_000)
        expect(page.locator("#contador-inalcancavel")).to_have_text("2")
        for largura in LARGURAS:
            page.set_viewport_size({"width": largura, "height": ALTURA})
            # Lista filtrada em inalcançável
            page.goto("/index.html#lista")
            expect(page.locator("#contador-total")).to_have_text(
                str(TOTAL_DEMO + 3), timeout=20_000
            )
            page.get_by_role("combobox", name="Estado").select_option("inalcancavel")
            expect(page.locator("#lista tbody tr.linha").first).to_be_visible()
            page.evaluate("window.scrollTo(0, 0)")
            page.screenshot(path=str(saida / f"lista-{largura}.png"))
            page.get_by_role("combobox", name="Estado").select_option("")
            # ficha no Organograma, com o editor de "Depende de" aberto
            org = abrir_organograma(page)
            org.get_by_label("Buscar").fill(FILHO[:20])
            item = org.locator(".org-item")
            expect(item).to_have_count(1, timeout=10_000)
            item.click()
            dialogo = page.get_by_role("dialog", name=FILHO)
            expect(dialogo).to_be_visible()
            page.wait_for_timeout(600)  # fim da animação de entrada do diálogo
            page.screenshot(path=str(saida / f"ficha-{largura}.png"))
            dialogo.get_by_role("button", name="Alterar dependência").click()
            dialogo.get_by_label("Buscar equipamento").fill("torre")
            dialogo.get_by_role("button", name=re.compile(PAI)).click()
            page.screenshot(path=str(saida / f"ficha-editor-{largura}.png"))
            page.keyboard.press("Escape")
            org.get_by_label("Buscar").fill("")
            # Teia: painel e legenda
            abrir_teia_com_ficha(page, saida, largura)
    finally:
        page.unroute_all(behavior="ignore_errors")
        apagar_equipamentos(page, [ids[FILHO], ids[OUTRO], ids[PAI]])


def abrir_teia_com_ficha(page: Page, saida: Path, largura: int) -> None:
    page.goto("/index.html#teia")
    expect(page.locator("#conteudo-teia canvas")).to_have_count(1, timeout=30_000)
    page.wait_for_timeout(1500)
    page.locator('#teia-classes [data-slug="iot"]').dispatch_event("click")
    botoes = page.locator("#teia-classes ul.teia-equips").get_by_role("button")
    botoes.filter(has=page.locator(".teia-equip-nome", has_text=FILHO[:20])).dispatch_event("click")
    expect(page.locator("#painel-equipamento")).to_be_visible()
    page.wait_for_timeout(800)
    page.screenshot(path=str(saida / f"teia-{largura}.png"))
