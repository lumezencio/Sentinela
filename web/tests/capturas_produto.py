"""Capturas da Fase 5 (assistente de primeiro acesso) nas 8 larguras do dono (360, 390, 768, 1024,
1280, 1366, 1440 e 1920 px), altura 900 px, claro e escuro. Não é coletado pelo smoke (nome fora
de ``test_*``). Reaproveita ``LARGURAS``, ``ALTURA``, ``TEMAS`` e ``pasta_saida`` de
``capturar_telas.py``. De ``core/``::

    SENTINELA_CAPTURAS=<pasta> uv run --with pytest-playwright --with cryptography \\
        python ../web/tests/capturas_produto.py [--destinos codigo,rede]

Sobe um core local SEM usuário (HTTPS, banco temporário, sem demonstração, ping simulado: nenhum
pacote sai) com um código de instalação fictício. As telas passam pelo fluxo real; só o erro
longo do 429 e o do concluir são simulados na própria página (o limite real bloquearia as
capturas seguintes). Só dados fictícios.

Destinos: ``codigo`` (passo 1), ``codigo-bloqueio`` (429 longo com o comando), ``codigo-expirado``
(sem código válido), ``administrador`` (login de 64 caracteres, erro de senha curta), ``rede``
(sugestão detectada e chave ligada, com erro), ``concluir`` (resumo) e ``concluir-erro``
(mensagem longa do servidor).
"""

import argparse
import asyncio
import datetime as dt
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, expect

from capturar_telas import ALTURA, LARGURAS, TEMAS, pasta_saida, sync_playwright

DESTINOS = (
    "codigo",
    "codigo-bloqueio",
    "codigo-expirado",
    "administrador",
    "rede",
    "concluir",
    "concluir-erro",
    "login-pendente",
)
CODIGO = "ABCD-2345"  # fictício
LOGIN_64 = "operador.noc.bloco-administrativo-b.sala-de-telecom-segundo-and-01"[:64]
SENHA = "senha-ficticia-de-captura-1"
REDE, GATEWAY = "10.99.60.0/24", "10.99.60.1"
MSG_429 = (
    "Muitas tentativas. Aguarde, ou gere um código novo no terminal "
    "(python -m sentinela.cli codigo-instalacao)."
)
ERRO_LONGO = (
    "A sub-rede informada já está em uso por outra instalação e o servidor recusou a conclusão; "
    "revise a sub-rede e o gateway, confirme que o computador do Sentinela está nessa rede e "
    "tente concluir outra vez; nenhum administrador foi criado e o código continua valendo"
)


def _json(rota: Any, status: int, corpo: Any, cabecalhos: dict[str, str] | None = None) -> None:
    rota.fulfill(
        status=status,
        content_type="application/json",
        body=json.dumps(corpo),
        headers=cabecalhos or {},
    )


def _subir(pasta: Path) -> tuple[str, Any]:
    import sentinela.db.modelos  # noqa: F401 - registra as tabelas no Base
    from conftest import ServidorLocal, _certificado, _porta_livre
    from sentinela.db.base import Base
    from sentinela.db.sessao import criar_motor
    from sentinela.seguranca import instalacao

    banco = f"sqlite+aiosqlite:///{(pasta / 'capt-produto.db').as_posix()}"

    async def preparar() -> None:
        motor = criar_motor(banco)
        try:
            async with motor.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        finally:
            await motor.dispose()
        agora = dt.datetime.now(dt.UTC)
        await instalacao.gravar(pasta, CODIGO, agora)

    asyncio.run(preparar())
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(
        banco,
        _porta_livre(),
        chave,
        cert,
        demo=False,
        rede_sugerida=REDE,
        gateway_sugerido=GATEWAY,
    )
    servidor.levantar()
    return f"https://127.0.0.1:{servidor.porta}", servidor


def _passo_codigo(page: Page) -> None:
    page.get_by_label("Código de instalação", exact=True).fill(CODIGO.lower())
    page.get_by_role("button", name="Continuar").click()
    expect(page.locator("#passo-administrador")).to_be_visible()


def _passo_admin(page: Page) -> None:
    page.get_by_label("Login", exact=True).fill(LOGIN_64)
    page.get_by_label("Senha", exact=True).fill(SENHA)
    page.get_by_label("Repita a senha").fill(SENHA)
    page.get_by_role("button", name="Continuar").click()
    expect(page.locator("#passo-rede")).to_be_visible()


def _abrir(page: Page, destino: str) -> None:
    if destino == "login-pendente":  # sem usuário e sem código válido: o login avisa
        page.route(
            "**/api/v1/saude",
            lambda r: _json(
                r, 200, {"status": "ok", "versao": "0.5.0", "primeiro_acesso": "expirado"}
            ),
        )
        page.goto("/login.html")
        expect(page.locator("#aviso-instalacao")).to_be_visible()
        page.wait_for_timeout(700)
        return
    if destino == "codigo-bloqueio":
        page.route(
            "**/api/v1/primeiro-acesso/conferir",
            lambda r: _json(r, 429, {"detail": MSG_429}, {"Retry-After": "300"}),
        )
    if destino == "codigo-expirado":
        page.route(
            "**/api/v1/primeiro-acesso",
            lambda r: (
                _json(r, 200, {"codigo": "expirado"})
                if r.request.method == "GET"
                else r.continue_()
            ),
        )
    page.goto("/primeiro-acesso.html")
    expect(page.locator("#passo-codigo")).to_be_visible()
    if destino == "codigo-bloqueio":
        page.get_by_label("Código de instalação", exact=True).fill(CODIGO)
        page.get_by_role("button", name="Continuar").click()
        expect(page.locator("#erro-codigo")).to_be_visible()
    elif destino == "codigo-expirado":
        expect(page.locator("#pa-comando")).to_be_visible()
    elif destino != "codigo":
        _passo_codigo(page)
        if destino == "administrador":
            page.get_by_label("Login", exact=True).fill(LOGIN_64)
            page.get_by_label("Senha", exact=True).fill("curta")
            page.get_by_label("Repita a senha").fill("curta")
            page.get_by_role("button", name="Continuar").click()
            expect(page.locator("#erro-administrador")).to_be_visible()
        else:
            _passo_admin(page)
            if destino == "rede":
                page.get_by_label("Gateway (o roteador da rede)").fill("10.99.61.1")
                page.get_by_role("button", name="Continuar").click()
                expect(page.locator("#erro-rede")).to_be_visible()
            else:
                page.get_by_role("button", name="Continuar").click()
                expect(page.locator("#passo-concluir")).to_be_visible()
                if destino == "concluir-erro":
                    page.route(
                        "**/api/v1/primeiro-acesso/concluir",
                        lambda r: _json(r, 422, {"detail": ERRO_LONGO}),
                    )
                    page.get_by_role("button", name="Concluir e entrar").click()
                    expect(page.locator("#erro-concluir")).to_be_visible()
    page.wait_for_timeout(700)  # fim da animação de entrada


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
        url, servidor = _subir(Path(tmp))
        try:
            with sync_playwright() as p:
                # barras de rolagem clássicas, como no navegador do dono
                navegador = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
                try:
                    for destino in destinos:
                        for tema in TEMAS:
                            for largura in LARGURAS:
                                ctx = navegador.new_context(
                                    viewport={"width": largura, "height": ALTURA},
                                    ignore_https_errors=True,
                                    base_url=url,
                                    color_scheme="light" if tema == "claro" else "dark",
                                )
                                try:
                                    page = ctx.new_page()
                                    _abrir(page, destino)
                                    page.screenshot(
                                        path=saida / f"{destino}-{tema}-{largura}.png",
                                        full_page=True,
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
