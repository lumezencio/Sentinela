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

Destinos do painel (Task 10; sobem o demo com admin, banco temporário, sem rede): ``aparelho-novo``
(cartão ao vivo e linha em Alertas; fabricante de 120 caracteres e 12 portas), ``subredes``
(Configurações → Sub-redes com gateway e intervalo), ``subredes-erro`` (gateway inválido),
``atualizacoes-atualizado``, ``atualizacoes-voltou``, ``atualizacoes-falhou`` (mensagem de 200
caracteres), ``atualizacoes-sem-agendamento``, ``aviso-atualizacao`` e
``aviso-atualizacao-voltou`` (o aviso de 24 h abaixo do cabeçalho).

Destinos do assistente: ``codigo`` (passo 1), ``codigo-bloqueio`` (429 longo com o comando),
``codigo-expirado`` (sem código válido), ``administrador`` (login de 64 caracteres, erro de
senha curta), ``rede`` (sugestão detectada e chave ligada, com erro), ``concluir`` (resumo) e
``concluir-erro`` (mensagem longa do servidor).
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

DESTINOS: tuple[str, ...] = (
    "codigo",
    "codigo-bloqueio",
    "codigo-expirado",
    "administrador",
    "rede",
    "concluir",
    "concluir-erro",
    "login-pendente",
)
DESTINOS_PAINEL = (
    "aparelho-novo",
    "subredes",
    "subredes-erro",
    "atualizacoes-atualizado",
    "atualizacoes-voltou",
    "atualizacoes-falhou",
    "atualizacoes-sem-agendamento",
    "aviso-atualizacao",
    "aviso-atualizacao-voltou",
)
FABRICANTE_120 = (
    "Fabricante Internacional de Equipamentos de Rede e Telecomunicações Ltda., Divisão "
    "Industrial de Câmeras IP e Gravadores de Vídeo"
)[:120]
PORTAS_12 = [21, 22, 23, 80, 443, 554, 8000, 8080, 8443, 9000, 37777, 49152]
MENSAGEM_200 = (
    "A nova imagem não passou na verificação de saúde depois de subir: o serviço principal "
    "reiniciou três vezes em dois minutos, o banco recusou a migração e o update.sh devolveu "
    "a versão anterior intacta."
)
assert len(MENSAGEM_200) <= 200
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


def _estado_atualizacao(destino: str) -> dict[str, Any]:
    """Corpo fictício de ``GET /atualizacao`` por destino."""
    agora = dt.datetime.now(dt.UTC)
    base: dict[str, Any] = {
        "versao": "0.5.0",
        "ativo": True,
        "agendado": True,
        "ultima_verificacao": (agora - dt.timedelta(hours=3)).isoformat(),
        "ultima_verificacao_ok": (agora - dt.timedelta(hours=3)).isoformat(),
        "resultado": "sem_novidade",
        "de": None,
        "para": None,
        "mensagem": None,
        "aviso": None,
        "comando_manual": "./update.sh",
        "arquivo_ilegivel": False,
    }
    if destino in ("atualizacoes-atualizado", "aviso-atualizacao"):
        base |= {"resultado": "atualizado", "de": "0.4.1", "para": "0.5.0"}
        base["aviso"] = "Atualizado para 0.5.0"
    elif destino in ("atualizacoes-voltou", "aviso-atualizacao-voltou"):
        base |= {"resultado": "voltou", "de": "0.4.1", "para": "0.5.0", "mensagem": MENSAGEM_200}
        base["aviso"] = "A atualização para 0.5.0 falhou; o Sentinela voltou para 0.4.1"
    elif destino == "atualizacoes-falhou":
        base |= {"resultado": "falhou", "de": "0.4.1", "para": "0.5.0", "mensagem": MENSAGEM_200}
    elif destino == "atualizacoes-sem-agendamento":
        base |= {"agendado": False, "resultado": None, "ultima_verificacao": None}
    return base


def _subir_painel(pasta: Path) -> tuple[str, str, str, Any]:
    """Demo local com admin (HTTPS, banco temporário) e um aparelho novo de caso extremo
    (fabricante de 120 caracteres, 12 portas)."""
    from conftest import (
        ServidorLocal,
        _certificado,
        _em_thread,
        _porta_livre,
        _preparar_banco,
        inserir_aparelho_novo,
    )
    from sentinela.demo import simulador

    simulador._P_QUEDA = 0.0  # capturas repetíveis: sem quedas simuladas
    simulador._INTERVALO_SWITCH_S = 1e9
    banco = f"sqlite+aiosqlite:///{(pasta / 'capt-painel.db').as_posix()}"
    login, senha = "admin", "capt-" + dt.datetime.now(dt.UTC).strftime("%H%M%S%f") + "-x"
    _em_thread(lambda: asyncio.run(_preparar_banco(banco, login, senha)))
    chave, cert = _certificado(pasta)
    servidor = ServidorLocal(banco, _porta_livre(), chave, cert)
    servidor.levantar()
    saida: dict[str, Any] = {}
    _em_thread(
        lambda: saida.update(
            asyncio.run(
                inserir_aparelho_novo(
                    banco, 950, fabricante=FABRICANTE_120, sinais={"portas": PORTAS_12}
                )
            )
        )
    )
    servidor.aparelho = saida
    return f"https://127.0.0.1:{servidor.porta}", login, senha, servidor


GATEWAY_VIA_API = """async () => {
    const c = decodeURIComponent(
        document.cookie.split('; ').find((x) => x.startsWith('sentinela_csrf=')).split('=')[1]);
    const subs = await (await fetch('/api/v1/subredes')).json();
    const s = subs.find((x) => x.cidr === '10.99.10.0/24');
    await fetch('/api/v1/subredes/' + s.id, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json', 'X-CSRF': c},
        body: JSON.stringify({gateway_ip: '10.99.10.1'}),
    });
}"""
ROLAR_AO_BLOCO = """(sel) => {
    const b = document.querySelector(sel).closest('.cfg-bloco');
    window.scrollTo(0, b.getBoundingClientRect().top + window.scrollY - 128);
}"""


def _abrir_painel(page: Page, destino: str, aparelho: dict[str, Any], ponte: Any) -> None:
    if destino.startswith(("atualizacoes-", "aviso-atualizacao")):
        corpo = _estado_atualizacao(destino)
        page.route(
            "**/api/v1/atualizacao",
            lambda r: _json(r, 200, corpo) if r.request.method == "GET" else r.continue_(),
        )
    if destino == "aparelho-novo":
        page.goto("/index.html#alertas")
        linha = page.locator(f'#lista-alertas li[data-id="{aparelho["alerta_id"]}"]')
        expect(linha).to_be_visible(timeout=20_000)
        alerta = page.evaluate(
            "async (id) => (await (await fetch('/api/v1/alertas/' + id)).json())",
            aparelho["alerta_id"],
        )
        alerta.pop("afetados", None)
        ponte.injetar(
            {"tipo": "alerta", "acao": "aberto", "id": alerta["id"], "alerta": alerta, "abertos": 1}
        )
        expect(page.locator("#cartoes-alerta article.ca")).to_have_count(1, timeout=10_000)
    elif destino.startswith("aviso-atualizacao"):
        page.goto("/index.html")  # sem #lista: o âncora rolaria a página até a tabela
        expect(page.locator("#aviso-atualizacao")).to_be_visible(timeout=20_000)
    else:
        page.goto("/index.html#configuracoes")
        expect(page.locator("#cfg-subredes li").first).to_be_visible(timeout=20_000)
        alvo = "#cfg-subredes" if destino.startswith("subredes") else "#cfg-atualizacoes"
        if destino == "subredes-erro":
            campo = page.get_by_label("Gateway (roteador) de 10.99.10.0/24")
            campo.fill("10.99.11.1")
            page.get_by_role("button", name="Salvar o gateway de 10.99.10.0/24").click()
            expect(page.locator("#cfg-subredes .campo-erro:visible")).to_have_count(1)
        if destino.startswith("atualizacoes-"):
            expect(page.locator("#atz-resultado")).not_to_be_empty()
            # os cartões de cima carregam sob demanda e mudam a altura: espera-os antes de rolar
            page.locator("#cfg-seguranca").scroll_into_view_if_needed()
            page.locator("#cfg-backup").scroll_into_view_if_needed()
            expect(page.locator("#bk-resumo")).not_to_be_empty(timeout=20_000)
            expect(page.locator("#seg-usuarios li").first).to_be_visible(timeout=20_000)
        page.evaluate(ROLAR_AO_BLOCO, alvo)
    page.wait_for_timeout(700)


def capturar_painel(destinos: list[str], saida: Path) -> None:
    from conftest import PonteWs

    with tempfile.TemporaryDirectory(prefix="sentinela-capt-") as tmp:
        url, login, senha, servidor = _subir_painel(Path(tmp))
        try:
            with sync_playwright() as p:
                navegador = p.chromium.launch(ignore_default_args=["--hide-scrollbars"])
                try:
                    ctx0 = navegador.new_context(ignore_https_errors=True, base_url=url)
                    pg0 = ctx0.new_page()
                    pg0.goto("/login.html")
                    pg0.get_by_label("Login").fill(login)
                    pg0.get_by_label("Senha").fill(senha)
                    pg0.get_by_role("button", name="Entrar").click()
                    pg0.wait_for_url("**/index.html")
                    pg0.evaluate(GATEWAY_VIA_API)
                    estado = ctx0.storage_state()
                    ctx0.close()
                    for destino in destinos:
                        for tema in TEMAS:
                            for largura in LARGURAS:
                                ctx = navegador.new_context(
                                    viewport={"width": largura, "height": ALTURA},
                                    ignore_https_errors=True,
                                    base_url=url,
                                    storage_state=estado,
                                    color_scheme="light" if tema == "claro" else "dark",
                                )
                                try:
                                    page = ctx.new_page()
                                    ponte = PonteWs(page)
                                    _abrir_painel(page, destino, servidor.aparelho, ponte)
                                    base = saida / f"{destino}-{tema}-{largura}"
                                    page.screenshot(path=f"{base}.png")
                                    page.evaluate(
                                        "document.querySelector('.topo').style.position = 'static'"
                                    )
                                    page.screenshot(path=f"{base}-pagina.png", full_page=True)
                                finally:
                                    ctx.close()
                finally:
                    navegador.close()
        finally:
            servidor.derrubar()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--saida", type=Path, default=None)
    ap.add_argument("--destinos", default=",".join(DESTINOS + DESTINOS_PAINEL))
    args = ap.parse_args()
    destinos = [d.strip() for d in args.destinos.split(",") if d.strip()]
    ruins = [d for d in destinos if d not in DESTINOS + DESTINOS_PAINEL]
    if ruins:
        sys.exit(f"destino desconhecido: {', '.join(ruins)}")
    saida = args.saida or pasta_saida()
    saida.mkdir(parents=True, exist_ok=True)
    do_painel = [d for d in destinos if d in DESTINOS_PAINEL]
    if do_painel:
        capturar_painel(do_painel, saida)
        print(f"capturas do painel em {saida}")
    destinos = [d for d in destinos if d in DESTINOS]
    if not destinos:
        return
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
