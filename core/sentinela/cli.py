"""Linha de comando administrativa.

    python -m sentinela.cli criar-admin --login X
    python -m sentinela.cli sub-rede adicionar|remover CIDR
    python -m sentinela.cli sub-rede listar
    python -m sentinela.cli totp-zerar LOGIN
    python -m sentinela.cli oui-atualizar ARQUIVO.csv [...] [--saida oui.tsv.gz]

A senha é lida com ``getpass`` (duas vezes, para confirmar). Fora de produção, se
``SENTINELA_ADMIN_SENHA`` estiver definida, ela é usada no lugar (testes/demonstração).

``sub-rede`` usa a mesma validação da API, grava a auditoria com ``usuario_id`` nulo e ação
``cli:subrede.*`` e pausa/retoma os equipamentos como a API faz. Ela escreve só no banco: com
o core no ar, a Guarda dele só muda no próximo reinício (``docker compose restart core``).
Com o Sentinela no ar, prefira a tela "Sub-redes" (ou a API), que aplica na hora.
"""

import argparse
import asyncio
import getpass
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.api.comum import sincronizar
from sentinela.api.subredes import (
    MAX_SUB_REDES,
    MSG_DUPLICADA,
    MSG_LIMITE,
    normalizar_cidr,
)
from sentinela.config import Settings, obter_settings
from sentinela.db.modelos import Auditoria, SubRede, Usuario
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.descoberta.classificador.oui import CAMINHO_PADRAO as OUI_PADRAO
from sentinela.descoberta.classificador.oui import atualizar_de_csv
from sentinela.monitor.montagem import sub_redes_do_banco
from sentinela.rede.guarda import DestinoProibido, Guarda
from sentinela.seguranca.politica import zerar_totp
from sentinela.seguranca.senhas import gerar_hash_async, validar_senha

VARIAVEL_SENHA = "SENTINELA_ADMIN_SENHA"


class ErroCli(Exception):
    def __init__(self, mensagem: str, codigo: int) -> None:
        super().__init__(mensagem)
        self.codigo = codigo


def _ler_senha(settings: Settings) -> str:
    if settings.ambiente != "producao":
        da_variavel = os.environ.get(VARIAVEL_SENHA)
        if da_variavel:
            return da_variavel
    senha = getpass.getpass("Senha do administrador: ")
    if getpass.getpass("Confirme a senha: ") != senha:
        raise ErroCli("as senhas não conferem", 2)
    return senha


async def _criar_admin(settings: Settings, login: str) -> None:
    login = login.strip()
    if not 1 <= len(login) <= 64:
        raise ErroCli("o login deve ter de 1 a 64 caracteres", 2)
    senha = _ler_senha(settings)
    try:
        validar_senha(senha)
    except ValueError as erro:
        raise ErroCli(str(erro), 2) from None
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            existe = await db.scalar(select(Usuario.id).where(Usuario.login == login))
            if existe is not None:
                raise ErroCli(f"o login {login!r} já existe; nada foi alterado", 1)
            hash_senha = await gerar_hash_async(senha)
            db.add(Usuario(login=login, hash_senha=hash_senha, papel="admin"))
            try:
                await db.commit()
            except IntegrityError:
                # outro criar-admin gravou o mesmo login entre a checagem e o INSERT
                raise ErroCli(f"o login {login!r} já existe; nada foi alterado", 1) from None
    finally:
        await motor.dispose()


AVISO_REINICIO = (
    "se o Sentinela estiver no ar, reinicie o core para aplicar "
    "(docker compose restart core) ou use a tela Sub-redes"
)


async def _aplicar_sub_redes(db: AsyncSession, acao: str, cidr: str) -> None:
    """Auditoria (sem usuário: veio da CLI) e pausa/retomada dos equipamentos, como na API."""
    antes_depois = {"cidr": cidr}
    db.add(
        Auditoria(
            usuario_id=None,
            acao=f"cli:subrede.{acao}",
            alvo=cidr,
            antes=antes_depois if acao == "remover" else None,
            depois=antes_depois if acao == "criar" else None,
            ip=None,
            em=datetime.now(UTC),
        )
    )
    await db.flush()
    # sem agendador: as transições viram eventos gravados aqui mesmo
    await sincronizar(db, None, Guarda(await sub_redes_do_banco(db)))
    await db.commit()


async def _sub_rede(settings: Settings, acao: str, texto: str | None) -> None:
    cidr = ""
    if acao != "listar":
        if not texto:
            raise ErroCli("informe a sub-rede, ex. 10.99.0.0/24", 2)
        try:
            cidr = normalizar_cidr(texto)
        except DestinoProibido as e:
            raise ErroCli(e.motivo, 2) from None
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            if acao == "listar":
                for linha in (
                    await db.execute(select(SubRede.cidr).order_by(SubRede.id))
                ).scalars():
                    print(linha)
                return
            existente = await db.scalar(select(SubRede).where(SubRede.cidr == cidr))
            if acao == "adicionar":
                if existente is not None:
                    raise ErroCli(MSG_DUPLICADA, 1)
                total = await db.scalar(select(func.count()).select_from(SubRede)) or 0
                if total >= MAX_SUB_REDES:
                    raise ErroCli(MSG_LIMITE, 2)
                db.add(SubRede(cidr=cidr))
                await _aplicar_sub_redes(db, "criar", cidr)
                print(f"sub-rede {cidr} adicionada; {AVISO_REINICIO}")
            else:
                if existente is None:
                    raise ErroCli("Sub-rede não cadastrada.", 1)
                await db.delete(existente)
                await _aplicar_sub_redes(db, "remover", cidr)
                print(f"sub-rede {cidr} removida; {AVISO_REINICIO}")
    finally:
        await motor.dispose()


async def _totp_zerar(settings: Settings, login: str) -> None:
    """Emergência (perdeu o aplicativo e os códigos): apaga o TOTP e revoga as sessões."""
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            alvo = await db.scalar(select(Usuario).where(Usuario.login == login.strip()))
            if alvo is None:
                raise ErroCli("usuário não encontrado; nada foi alterado", 1)
            await zerar_totp(db, alvo.id)
            db.add(
                Auditoria(
                    usuario_id=None,
                    acao="cli:totp.zerar",
                    alvo=f"usuario:{alvo.id}",
                    antes=None,
                    depois=None,
                    ip=None,
                    em=datetime.now(UTC),
                )
            )
            await db.commit()
    finally:
        await motor.dispose()
    print(
        f"segundo fator de {login.strip()!r} apagado e sessões revogadas; "
        "o usuário pode ativar de novo no próximo login"
    )


def _oui_atualizar(arquivos: list[str], saida: str | None) -> None:
    """Regera a base OUI a partir de CSVs da IEEE já baixados (nunca acessa a rede)."""
    destino = Path(saida) if saida else OUI_PADRAO
    try:
        total = atualizar_de_csv([Path(a) for a in arquivos], destino)
    except (OSError, UnicodeDecodeError) as e:
        raise ErroCli(f"não foi possível ler/gravar a base OUI ({type(e).__name__})", 2) from None
    print(f"{total} prefixos gravados em {destino}")


async def executar(argv: list[str], settings: Settings | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m sentinela.cli")
    comandos = parser.add_subparsers(dest="comando", required=True)
    criar = comandos.add_parser("criar-admin", help="cria um usuário administrador")
    criar.add_argument("--login", required=True)
    sub = comandos.add_parser("sub-rede", help="declara as sub-redes privadas monitoradas")
    sub.add_argument("acao", choices=["adicionar", "remover", "listar"])
    sub.add_argument("cidr", nargs="?", help="ex. 10.99.0.0/24")
    zerar = comandos.add_parser(
        "totp-zerar", help="apaga o segundo fator (TOTP) de um usuário e revoga as sessões dele"
    )
    zerar.add_argument("login")
    oui = comandos.add_parser(
        "oui-atualizar", help="regera a base OUI a partir de CSVs da IEEE (MA-L, MA-M, MA-S)"
    )
    oui.add_argument("arquivos", nargs="+", help="CSV da IEEE já baixado")
    oui.add_argument("--saida", help="arquivo de saída (padrão: a base embutida)")
    args = parser.parse_args(argv)

    settings = settings or obter_settings()
    try:
        if args.comando == "oui-atualizar":
            _oui_atualizar(args.arquivos, args.saida)
            return 0
        if args.comando == "totp-zerar":
            await _totp_zerar(settings, args.login)
            return 0
        if args.comando == "sub-rede":
            await _sub_rede(settings, args.acao, args.cidr)
            return 0
        await _criar_admin(settings, args.login)
    except ErroCli as erro:
        print(f"erro: {erro}", file=sys.stderr)
        return erro.codigo
    print(f"administrador {args.login.strip()!r} criado")
    return 0


def main() -> None:
    sys.exit(asyncio.run(executar(sys.argv[1:])))


if __name__ == "__main__":
    main()
