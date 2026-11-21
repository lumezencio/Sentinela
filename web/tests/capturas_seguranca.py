"""Capturas da Fase 4B (etapa TOTP do login, seguranca.html e cartões Segurança e Backup) nas 8
larguras do dono (360, 390, 768, 1024, 1280, 1366, 1440 e 1920 px), altura 900 px, claro e
escuro. Não é coletado pelo smoke (nome fora de ``test_*``). Reaproveita ``LARGURAS``,
``ALTURA``, ``TEMAS`` e ``pasta_saida`` de ``capturar_telas.py``. De ``core/``::

    SENTINELA_CAPTURAS=<pasta> uv run --with pytest-playwright --with cryptography \\
        python ../web/tests/capturas_seguranca.py [--destinos login-totp,config-backup]

Sobe o demo do smoke (HTTPS local, banco temporário). Só dados fictícios; nada toca o compose
do dono. As respostas que o navegador recebe de ``/auth/login``, ``/auth/totp/entrar`` (401 e
429), ``/auth/totp/confirmar`` e ``GET /backup`` são simuladas na própria página (o login com
segundo fator consome a cota de falhas do IP, e os códigos de recuperação reais só existem
uma vez); o resto é o servidor de verdade (QR real, lista real de usuários).

Destinos: ``login-totp`` (etapa do código, erro), ``login-totp-recuperacao`` (código de
recuperação, aviso do 429 e contagem), ``seguranca-qr`` (passo 2: QR e chave de 32
caracteres), ``seguranca-codigos`` (passo 3: 10 códigos), ``config-seguranca`` e
``config-backup`` (cartões inteiros, com login de 64 caracteres, erro longo e 20 cópias).
"""

import argparse
import asyncio
import json
import secrets
import sys
import tempfile
from pathlib import Path
from typing import Any

from capturar_telas import ALTURA, LARGURAS, TEMAS, pagina_inteira, pasta_saida, sync_playwright
from playwright.sync_api import Page, expect

DESTINOS = (
    "login-totp",
    "login-totp-recuperacao",
    "seguranca-qr",
    "seguranca-codigos",
    "config-seguranca",
    "config-backup",
)
LOGIN_64 = "operador.noc.bloco-administrativo-b.sala-de-telecom-segundo-and-01"[:64]
CODIGOS_FALSOS = [  # fictícios, só para a tela
    "K7MQ2-XDP34", "R4TWN-86HVA", "B9ZCE-3JF5U", "M2XQH-7KD8P", "T6NAY-5WEC3",
    "H8DFG-2RJ9S", "Y3PUK-4BVM6", "E5CXZ-9TQN7", "W7GJA-6LHD2", "N4SBR-8FYK5",
]  # fmt: skip
ERRO_LONGO = (
    "disco cheio ao gravar /dados/backups/sentinela-20261118T030000Z-diario.tar.gz.parcial: "
    "não há espaço restante no dispositivo; libere espaço no volume de dados e tente outra vez; "
    "nenhuma cópia anterior foi apagada e a rotação só roda depois de uma cópia completa"
)


def _copias() -> list[dict[str, Any]]:
    tipos = (
        ["diario"] * 7 + ["semanal"] * 4 + ["manual"] * 5 + ["atualizacao"] * 3 + ["pre-restore"]
    )
    return [
        {
            "nome": (
                f"sentinela-202611{18 - i // 2:02d}T0{3 + i % 2}0000Z-{t}"
                "-0.4.0-bloco-administrativo-b.tar.gz"
            ),
            "tipo": t,
            "criado_em": f"2026-11-{18 - i // 2:02d}T0{3 + i % 2}:00:00+00:00",
            "tamanho": int(12.4 * 1024 * 1024 + i * 913_000),
        }
        for i, t in enumerate(tipos)
    ]


def _estado_backup() -> dict[str, Any]:
    return {
        "ultimo_em": "2026-11-18T03:00:00+00:00",
        "ultimo_tamanho": int(12.4 * 1024 * 1024),
        "ultimo_erro": ERRO_LONGO,
        "copias": _copias(),
        "diretorio": "/dados/backups",
        "aviso": "x",
    }


async def _semear(banco_url: str) -> None:
    from sqlalchemy import update

    from conftest import criar_usuario
    from sentinela.db.modelos import Usuario
    from sentinela.db.sessao import criar_motor, fabrica_sessao

    nomes = [(LOGIN_64, "admin"), ("marina.souza", "admin"), ("leitor.recepcao", "visualizador")]
    nomes += [(f"tecnico.plantao{n}", "visualizador") for n in range(1, 6)]
    for login, papel in nomes:
        await criar_usuario(banco_url, login, secrets.token_urlsafe(18), papel)
    motor = criar_motor(banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            # "ativo" só para a lista (nunca é decifrado nas capturas)
            await db.execute(
                update(Usuario)
                .where(Usuario.login.in_([LOGIN_64, "marina.souza", "tecnico.plantao2"]))
                .values(totp_cifrado="ficticio", totp_ultimo_contador=1)
            )
            await db.commit()
    finally:
        await motor.dispose()


def _subir(pasta: Path) -> tuple[str, str, str, Any]:
    from conftest import (
        ServidorLocal,
        _certificado,
        _porta_livre,
        _preparar_banco,
    )
    from sentinela.demo import simulador

    simulador._P_QUEDA = 0.0
    simulador._INTERVALO_SWITCH_S = 1e9
    banco = f"sqlite+aiosqlite:///{(pasta / 'capt-seg.db').as_posix()}"
    login, senha = "admin", secrets.token_urlsafe(18)
    asyncio.run(_preparar_banco(banco, login, senha))
    asyncio.run(_semear(banco))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco, _porta_livre(), chave, cert)
    servidor.levantar()
    return f"https://127.0.0.1:{servidor.porta}", login, senha, servidor


def _json(rota: Any, status: int, corpo: Any, cabecalhos: dict[str, str] | None = None) -> None:
    rota.fulfill(
        status=status,
        content_type="application/json",
        body=json.dumps(corpo),
        headers=cabecalhos or {},
    )


def _simular_login(page: Page, status_totp: int) -> None:
    page.route(
        "**/api/v1/auth/login",
        lambda r: _json(r, 202, {"etapa": "totp"}),
    )
    if status_totp == 429:
        page.route(
            "**/api/v1/auth/totp/entrar",
            lambda r: _json(
                r,
                429,
                {"detail": "Muitas tentativas. Aguarde e tente novamente."},
                {"Retry-After": "300"},
            ),
        )
    else:
        page.route(
            "**/api/v1/auth/totp/entrar",
            lambda r: _json(r, 401, {"detail": "Código inválido."}),
        )


def _abrir_login_totp(page: Page, recuperacao: bool) -> None:
    _simular_login(page, 429 if recuperacao else 401)
    page.goto("/login.html")
    page.get_by_label("Login").fill(LOGIN_64)
    page.get_by_label("Senha").fill("senha-ficticia-de-captura")
    page.get_by_role("button", name="Entrar").click()
    expect(page.locator("#form-totp")).to_be_visible()
    if recuperacao:
        page.get_by_role("button", name="Usar código de recuperação").click()
        page.get_by_label("Código de recuperação", exact=True).fill("k7mq2xdp34")
    else:
        page.get_by_label("Código do aplicativo").fill("123 456")
    page.get_by_role("button", name="Confirmar").click()
    expect(page.locator("#erro-totp")).to_be_visible()
    page.wait_for_timeout(700)  # fim da animação de entrada


def _abrir_seguranca(page: Page, senha: str, codigos: bool) -> None:
    if codigos:
        page.route(
            "**/api/v1/auth/totp/confirmar",
            lambda r: _json(r, 200, {"codigos": CODIGOS_FALSOS}),
        )
    page.goto("/seguranca.html")
    page.get_by_label("Confirme sua senha").fill(senha)
    page.get_by_role("button", name="Continuar").click()
    expect(page.locator("#seg-qr")).to_be_visible()
    page.wait_for_function(
        "(() => { const i = document.getElementById('seg-qr');"
        " return i.complete && i.naturalWidth > 0; })()"
    )
    if codigos:
        page.get_by_label("Código que o aplicativo mostra agora").fill("123456")
        page.get_by_role("button", name="Ativar segundo fator").click()
        expect(page.locator("#seg-codigos li")).to_have_count(10)
        page.get_by_label("Guardei os códigos em lugar seguro").check()
    page.wait_for_timeout(700)


def _abrir_config(page: Page, cartao: str) -> None:
    page.route(
        "**/api/v1/backup",
        lambda r: _json(r, 200, _estado_backup()) if r.request.method == "GET" else r.continue_(),
    )
    page.goto("/index.html#configuracoes")
    expect(page.locator(cartao)).to_be_visible(timeout=20_000)
    # os cartões carregam só ao entrar na tela (quandoVisivel): rolar até cada um antes de esperar
    page.locator("#cfg-seguranca").scroll_into_view_if_needed()
    expect(page.locator("#seg-usuarios li").first).to_be_visible(timeout=20_000)
    page.locator("#cfg-backup").scroll_into_view_if_needed()
    expect(page.locator("#bk-lista li").first).to_be_visible(timeout=20_000)
    page.wait_for_timeout(900)
    page.evaluate("document.querySelector('.topo').style.position = 'static'")


def _capturar(page: Page, destino: str, base: Path, senha: str) -> None:
    if destino.startswith("login-totp"):
        _abrir_login_totp(page, destino.endswith("recuperacao"))
        pagina_inteira(page, f"{base}.png")
    elif destino.startswith("seguranca-"):
        _abrir_seguranca(page, senha, destino.endswith("codigos"))
        pagina_inteira(page, f"{base}.png")
    else:
        cartao = "#cfg-seguranca" if destino == "config-seguranca" else "#cfg-backup"
        _abrir_config(page, cartao)
        page.locator(cartao).screenshot(path=f"{base}.png")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--saida", type=Path, default=None)
    ap.add_argument("--destinos", default=",".join(DESTINOS))
    args = ap.parse_args()
    destinos = [d.strip() for d in args.destinos.split(",") if d.strip()]
    ruins = [d for d in destinos if d not in DESTINOS]
    if ruins:
        sys.exit(f"destino desconhecido: {', '.join(ruins)}")
    saida = args.saida or pasta_saida()
    saida.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sentinela-capt-") as tmp:
        url, login, senha, servidor = _subir(Path(tmp))
        try:
            with sync_playwright() as p:
                navegador = p.chromium.launch()
                try:
                    contexto = navegador.new_context(ignore_https_errors=True, base_url=url)
                    pg = contexto.new_page()
                    pg.goto("/login.html")
                    pg.get_by_label("Login").fill(login)
                    pg.get_by_label("Senha").fill(senha)
                    pg.get_by_role("button", name="Entrar").click()
                    pg.wait_for_url("**/index.html")
                    estado = contexto.storage_state()
                    contexto.close()
                    for destino in destinos:
                        for tema in TEMAS:
                            for largura in LARGURAS:
                                ctx = navegador.new_context(
                                    viewport={"width": largura, "height": ALTURA},
                                    ignore_https_errors=True,
                                    base_url=url,
                                    storage_state=None if destino.startswith("login") else estado,
                                    color_scheme="light" if tema == "claro" else "dark",
                                )
                                try:
                                    _capturar(
                                        ctx.new_page(),
                                        destino,
                                        saida / f"{destino}-{tema}-{largura}",
                                        senha,
                                    )
                                finally:
                                    ctx.close()
                finally:
                    navegador.close()
        finally:
            servidor.derrubar()
    print(f"capturas em {saida}")


if __name__ == "__main__":
    main()
