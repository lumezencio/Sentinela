"""Linha de comando administrativa.

    python -m sentinela.cli criar-admin --login X

A senha é lida com ``getpass`` (duas vezes, para confirmar). Fora de produção, se
``SENTINELA_ADMIN_SENHA`` estiver definida, ela é usada no lugar (testes/demonstração).
"""

import argparse
import asyncio
import getpass
import os
import sys

from sqlalchemy import select

from sentinela.config import Settings, obter_settings
from sentinela.db.modelos import Usuario
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.seguranca.senhas import gerar_hash, validar_senha

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
            hash_senha = await asyncio.to_thread(gerar_hash, senha)
            db.add(Usuario(login=login, hash_senha=hash_senha, papel="admin"))
            await db.commit()
    finally:
        await motor.dispose()


async def executar(argv: list[str], settings: Settings | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m sentinela.cli")
    comandos = parser.add_subparsers(dest="comando", required=True)
    criar = comandos.add_parser("criar-admin", help="cria um usuário administrador")
    criar.add_argument("--login", required=True)
    args = parser.parse_args(argv)

    settings = settings or obter_settings()
    try:
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
