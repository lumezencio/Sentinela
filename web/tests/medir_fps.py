"""Mede o FPS da aba Teia em cada estilo (não roda no CI nem no pytest).

Sobe o mesmo servidor do smoke (uvicorn + banco SQLite TEMPORÁRIO + demonstração com 300
equipamentos); nunca toca a demonstração em execução. Com ``--equipamentos 1000`` cria
equipamentos sintéticos extras pela API (10.99.100.0/24 em diante) até o total pedido.

Rodar (de ``core/``)::

    uv run --with playwright --with cryptography python ../web/tests/medir_fps.py
    uv run --with playwright --with cryptography python ../web/tests/medir_fps.py \\
        --equipamentos 1000 --modo gpu

Modos: ``padrao`` (headless do Playwright), ``gpu`` (headless pedindo ANGLE/D3D11 e GPU),
``janela`` (navegador com janela, GPU real do Windows).
"""

import argparse
import asyncio
import json
import secrets
import sqlite3
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from playwright.sync_api import Page, expect, sync_playwright  # noqa: E402

from conftest import ServidorLocal, _certificado, _em_thread, _porta_livre, _preparar_banco  # noqa: E402

ESTILOS = ("Constelação", "Órbitas", "Galáxia", "Átomo", "Árvore 3D")
ARGS_GPU = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"]
CLASSES = ("camera", "gravador", "computador", "iot", "impressora", "roteador", "switch", "wifi")

CONTADOR_RAF = """
(ms) => new Promise((resolve) => {
  let n = 0;
  const t0 = performance.now();
  function passo(t) {
    n += 1;
    if (t - t0 >= ms) resolve({ quadros: n, ms: t - t0 });
    else requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
})
"""

RENDERER = """
() => {
  const gl = document.createElement('canvas').getContext('webgl2')
    || document.createElement('canvas').getContext('webgl');
  if (!gl) return 'sem WebGL';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
}
"""


def _api(page: Page, metodo: str, caminho: str, corpo: Any = None) -> Any:
    return page.evaluate(
        """async ([metodo, caminho, corpo]) => {
          const cookie = document.cookie.split('; ').find(c => c.startsWith('sentinela_csrf='));
          const r = await fetch(caminho, {
            method: metodo,
            headers: { 'Content-Type': 'application/json',
                       'X-CSRF': cookie ? cookie.split('=')[1] : '' },
            body: corpo ? JSON.stringify(corpo) : undefined,
          });
          return { status: r.status, corpo: (await r.text()).slice(0, 200) };
        }""",
        [metodo, caminho, corpo],
    )


def criar_sinteticos(page: Page, banco: Path, total: int) -> int:
    """Leva o total a `total` com equipamentos 10.99.100.x (API) e espalha estados no banco."""
    atual = sqlite3.connect(banco).execute("select count(*) from equipamento").fetchone()[0]
    faltam = max(0, total - atual)
    for s in range(100, 100 + faltam // 253 + 1):
        _api(page, "POST", "/api/v1/subredes", {"cidr": f"10.99.{s}.0/24"})
    for i in range(faltam):
        sub, host = 100 + i // 253, 1 + i % 253
        r = _api(
            page,
            "POST",
            "/api/v1/equipamentos",
            {
                "nome": f"Sintetico {i + 1:04d}",
                "ip": f"10.99.{sub}.{host}",
                "mac": f"02:00:00:ff:{i // 256:02x}:{i % 256:02x}",
                "classe": CLASSES[i % len(CLASSES)],
            },
        )
        if r["status"] != 201:
            raise SystemExit(f"falha ao criar sintético {i}: HTTP {r['status']} {r['corpo']}")
    # estados variados (só no banco temporário): 70% online, resto instável/offline
    con = sqlite3.connect(banco)
    con.execute(
        "update equipamento set estado = case abs(random()) % 10 "
        "when 0 then 'offline' when 1 then 'instavel' else 'online' end "
        "where nome like 'Sintetico %'"
    )
    con.commit()
    return faltam


def _medir_cena(page: Page, palco: Any, nome: str, segundos: int) -> tuple[str, float, str, str]:
    r = page.evaluate(CONTADOR_RAF, segundos * 1000)
    fps = r["quadros"] * 1000 / r["ms"]
    rotulos = palco.get_attribute("data-rotulos-ip") or "-"
    return (nome, round(fps, 1), palco.get_attribute("data-nivel") or "?", f"ip:{rotulos}")


def medir(modo: str, total: int, segundos: int) -> list[tuple[str, float, str, str]]:
    pasta = Path(tempfile.mkdtemp(prefix="medir-fps-"))
    banco = pasta / "fps.db"
    banco_url = f"sqlite+aiosqlite:///{banco.as_posix()}"
    login, senha = "admin", secrets.token_urlsafe(18)
    _em_thread(lambda: asyncio.run(_preparar_banco(banco_url, login, senha)))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco_url, _porta_livre(), chave, cert)
    servidor.levantar()
    url = f"https://127.0.0.1:{servidor.porta}"
    resultados: list[tuple[str, float, str, str]] = []
    gpu = "?"
    try:
        with sync_playwright() as p:
            args = ARGS_GPU if modo in ("gpu", "janela") else []
            navegador = p.chromium.launch(headless=modo != "janela", args=args)
            ctx = navegador.new_context(
                ignore_https_errors=True, base_url=url, viewport={"width": 1440, "height": 900}
            )
            page = ctx.new_page()
            page.goto("/login.html")
            page.get_by_label("Login").fill(login)
            page.get_by_label("Senha").fill(senha)
            page.get_by_role("button", name="Entrar").click()
            page.wait_for_url("**/index.html")
            expect(page.locator("#contador-total")).to_have_text("307", timeout=20_000)
            if total > 307:
                criar = criar_sinteticos(page, banco, total)
                print(f"criados {criar} equipamentos sintéticos", file=sys.stderr)
                page.reload()
            gpu = page.evaluate(RENDERER)
            print(f"modo={modo} renderer={gpu} total={total}", file=sys.stderr)
            page.get_by_role("tab", name="Teia").click()
            palco = page.locator("#conteudo-teia [data-equipamentos]")
            palco.wait_for()
            expect(palco).to_have_attribute("data-equipamentos", str(total), timeout=30_000)
            barra = page.get_by_role("group", name="Estilo da Teia")
            for nome in ESTILOS:
                barra.get_by_role("button", name=nome).click()
                page.wait_for_timeout(3500)  # bloom/nível se decidem nos primeiros 3 s
                r = page.evaluate(CONTADOR_RAF, segundos * 1000)
                fps = r["quadros"] * 1000 / r["ms"]
                nivel = palco.get_attribute("data-nivel") or "?"
                nos = palco.get_attribute("data-nos") or "?"
                resultados.append((nome, round(fps, 1), nivel, nos))
            # de perto: classe focada e equipamento focado (rótulos de IP visíveis, Task 11b)
            barra.get_by_role("button", name=ESTILOS[0]).click()
            page.wait_for_timeout(1500)
            page.locator(".teia-classe").first.click()
            page.wait_for_timeout(2500)
            resultados.append(_medir_cena(page, palco, "classe focada", segundos))
            page.locator(".teia-equip").first.click()
            page.wait_for_timeout(2500)
            resultados.append(_medir_cena(page, palco, "equip. focado", segundos))
            navegador.close()
    finally:
        servidor.derrubar()
    print(json.dumps({"modo": modo, "gpu": gpu, "total": total}))
    return resultados


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--equipamentos", type=int, default=300)
    ap.add_argument("--modo", choices=("padrao", "gpu", "janela"), default="padrao")
    ap.add_argument("--segundos", type=int, default=10)
    a = ap.parse_args()
    tabela = medir(a.modo, a.equipamentos, a.segundos)
    print(f"\nTeia com {a.equipamentos} equipamentos, modo {a.modo}, média de {a.segundos} s")
    print(f"{'estilo':<14}{'fps':>8}  {'nivel':<10}{'nos':>8}")
    for nome, fps, nivel, nos in tabela:
        print(f"{nome:<14}{fps:>8}  {nivel:<10}{nos:>8}")


if __name__ == "__main__":
    main()
