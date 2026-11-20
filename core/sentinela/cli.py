"""Linha de comando administrativa.

    python -m sentinela.cli criar-admin --login X
    python -m sentinela.cli codigo-instalacao
    python -m sentinela.cli sub-rede adicionar|remover CIDR
    python -m sentinela.cli sub-rede listar
    python -m sentinela.cli totp-zerar LOGIN
    python -m sentinela.cli backup-criar [--origem manual|atualizacao]
    python -m sentinela.cli backup-verificar ARQUIVO
    python -m sentinela.cli restaurar ARQUIVO
    python -m sentinela.cli atualizacao-registrar --resultado R [--de V] [--para V] [--mensagem T]
    python -m sentinela.cli atualizacao-registrar --agendado
    python -m sentinela.cli atualizacao-ativa
    python -m sentinela.cli oui-atualizar ARQUIVO.csv [...] [--saida oui.tsv.gz]

A senha é lida com ``getpass`` (duas vezes, para confirmar). Fora de produção, se
``SENTINELA_ADMIN_SENHA`` estiver definida, ela é usada no lugar (testes/demonstração).

``backup-criar`` imprime só o nome do arquivo gerado em ``<pasta do banco>/backups`` (funciona
com o core no ar). ``backup-verificar`` sai com 1 e mensagem genérica se o arquivo for inválido.
``restaurar`` verifica, guarda o banco atual como ``pre-restore``, restaura e imprime o nome do
``pre-restore``. Recusa rodar se o core responder na porta 8000 em 127.0.0.1 (``compose exec``) ou
pelo nome de serviço ``core`` na rede do compose (``compose run``); fora do compose a sonda não vê
o core, e a trava final é o banco ter escritor ativo. O caminho seguro é o ``restore.sh``, que
para o core antes. O ``.env`` nunca entra no backup: os comandos repetem o aviso em texto fixo.

``codigo-instalacao`` gera o código do primeiro acesso pela tela, grava só o hash argon2id em
``<pasta do banco>/instalacao.json`` (0600, substitui o anterior) e imprime SÓ o código no
stdout. Com algum usuário já criado, sai com 3 e não grava nada.

``atualizacao-registrar`` guarda o resultado da última atualização em ``atualizacao.json`` (quem
chama é o ``update.sh``; ``--agendado`` marca que o timer foi instalado). ``atualizacao-ativa``
sai com 0 se a atualização automática está ligada (o padrão) e com 3 se foi desligada.

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
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela import __version__, atualizacao
from sentinela.api.backup import AVISO as AVISO_ENV
from sentinela.api.comum import sincronizar
from sentinela.api.subredes import (
    MAX_SUB_REDES,
    MSG_DUPLICADA,
    MSG_LIMITE,
    normalizar_cidr,
)
from sentinela.backup.arquivo import (
    ErroBackup,
    TipoBackup,
    criar_backup,
    restaurar_backup,
    revisoes_do_codigo,
    verificar_backup,
)
from sentinela.backup.porta import HOSTS_DO_CORE, porta_responde
from sentinela.config import Settings, obter_settings, pasta_dados
from sentinela.db.modelos import Auditoria, SubRede, Usuario
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.descoberta.classificador.oui import CAMINHO_PADRAO as OUI_PADRAO
from sentinela.descoberta.classificador.oui import atualizar_de_csv
from sentinela.monitor.montagem import sub_redes_do_banco
from sentinela.rede.guarda import DestinoProibido, Guarda
from sentinela.seguranca import instalacao
from sentinela.seguranca.politica import zerar_totp
from sentinela.seguranca.senhas import gerar_hash_async, validar_senha

VARIAVEL_SENHA = "SENTINELA_ADMIN_SENHA"
PORTA_CORE = 8000  # a porta do core dentro do contêiner (a mesma do uvicorn na imagem)
HOSTS_CORE: tuple[str, ...] = HOSTS_DO_CORE  # 127.0.0.1 (exec) e o serviço "core" (run)
MSG_CORE_NO_AR = "o core está no ar; pare-o antes de restaurar (nada foi alterado)"


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


MSG_JA_HA_ADMIN = "já existe um administrador; o primeiro acesso está encerrado"


async def _codigo_instalacao(settings: Settings) -> None:
    """Gera o código do primeiro acesso: só o hash vai ao disco; o código só ao stdout."""
    try:
        pasta = pasta_dados(settings)
    except ValueError:
        raise ErroCli("o banco configurado não é um arquivo", 2) from None
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            if await db.scalar(select(Usuario.id).limit(1)) is not None:
                raise ErroCli(MSG_JA_HA_ADMIN, 3)
    finally:
        await motor.dispose()
    codigo = instalacao.gerar_codigo()
    try:
        await instalacao.gravar(pasta, codigo, datetime.now(UTC))
    except OSError:
        raise ErroCli("não foi possível gravar o código de instalação", 1) from None
    print(codigo)


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


def _caminho_banco(settings: Settings) -> Path:
    banco = make_url(settings.banco_url).database
    if not banco:
        raise ErroCli("o banco configurado não é um arquivo", 2)
    return Path(banco)


def _backup_criar(settings: Settings, origem: TipoBackup) -> None:
    banco = _caminho_banco(settings)
    try:
        caminho = criar_backup(
            banco, banco.parent / "backups", origem, datetime.now(UTC), __version__
        )
    except ErroBackup as e:
        raise ErroCli(str(e), 1) from None
    print(caminho.name)
    print(f"aviso: {AVISO_ENV}", file=sys.stderr)


def _backup_verificar(settings: Settings, arquivo: str) -> None:
    try:
        manifesto = verificar_backup(
            Path(arquivo), revisoes_do_codigo(), _caminho_banco(settings).parent
        )
    except ErroBackup as e:
        # ErroBackup só carrega textos fixos (inválido, versão mais nova, sem espaço...)
        raise ErroCli(str(e), 1) from None
    print(f"backup válido: esquema {manifesto.esquema}, Sentinela {manifesto.sentinela}")


async def _restaurar(settings: Settings, arquivo: str) -> None:
    if await porta_responde(PORTA_CORE, hosts=HOSTS_CORE):
        raise ErroCli(MSG_CORE_NO_AR, 1)
    banco = _caminho_banco(settings)
    try:
        guardado = restaurar_backup(Path(arquivo), banco, datetime.now(UTC), __version__)
    except ErroBackup as e:
        raise ErroCli(str(e), 1) from None
    except OSError:
        raise ErroCli("não foi possível restaurar (nada foi apagado)", 1) from None
    if guardado is not None:
        print(guardado.name)
    print(f"aviso: {AVISO_ENV}", file=sys.stderr)


def _pasta_atualizacao(settings: Settings) -> Path:
    try:
        return pasta_dados(settings)
    except ValueError:
        raise ErroCli("o banco configurado não é um arquivo", 2) from None


def _atualizacao_registrar(
    settings: Settings,
    resultado: str | None,
    de: str | None,
    para: str | None,
    mensagem: str | None,
    agendado: bool,
) -> None:
    pasta = _pasta_atualizacao(settings)
    if agendado:
        if resultado or de or para or mensagem:
            raise ErroCli("--agendado não se combina com os dados do resultado", 2)
        try:
            atualizacao.marcar_agendado(pasta)
        except OSError:
            raise ErroCli("não foi possível gravar o estado da atualização", 1) from None
        return
    if resultado not in atualizacao.RESULTADOS:
        raise ErroCli("informe --resultado (atualizado, sem_novidade, voltou ou falhou)", 2)
    for versao in (de, para):
        if versao is not None and atualizacao.versao_valida(versao) is None:
            raise ErroCli("versão inválida: use X.Y.Z", 2)
    try:
        atualizacao.registrar(
            pasta,
            resultado,  # type: ignore[arg-type]
            de,
            para,
            mensagem,
            datetime.now(UTC),
        )
    except OSError:
        raise ErroCli("não foi possível gravar o estado da atualização", 1) from None


def _atualizacao_ativa(settings: Settings) -> None:
    if not atualizacao.ler(_pasta_atualizacao(settings)).ativo:
        raise ErroCli("a atualização automática está desligada", 3)


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
    comandos.add_parser(
        "codigo-instalacao", help="gera o código do primeiro acesso pela tela (8 caracteres)"
    )
    sub = comandos.add_parser("sub-rede", help="declara as sub-redes privadas monitoradas")
    sub.add_argument("acao", choices=["adicionar", "remover", "listar"])
    sub.add_argument("cidr", nargs="?", help="ex. 10.99.0.0/24")
    zerar = comandos.add_parser(
        "totp-zerar", help="apaga o segundo fator (TOTP) de um usuário e revoga as sessões dele"
    )
    zerar.add_argument("login")
    bcriar = comandos.add_parser("backup-criar", help="cria um backup do banco (sem o .env)")
    bcriar.add_argument("--origem", choices=["manual", "atualizacao"], default="manual")
    bverif = comandos.add_parser("backup-verificar", help="confere um arquivo de backup")
    bverif.add_argument("arquivo")
    restaura = comandos.add_parser(
        "restaurar", help="restaura um backup (com o core parado); guarda o banco atual antes"
    )
    restaura.add_argument("arquivo")
    areg = comandos.add_parser(
        "atualizacao-registrar", help="guarda o resultado da última atualização (update.sh)"
    )
    areg.add_argument("--resultado")
    areg.add_argument("--de")
    areg.add_argument("--para")
    areg.add_argument("--mensagem")
    areg.add_argument("--agendado", action="store_true")
    comandos.add_parser(
        "atualizacao-ativa", help="sai com 0 se a atualização automática está ligada, 3 se não"
    )
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
        if args.comando == "codigo-instalacao":
            await _codigo_instalacao(settings)
            return 0
        if args.comando == "atualizacao-registrar":
            _atualizacao_registrar(
                settings, args.resultado, args.de, args.para, args.mensagem, args.agendado
            )
            return 0
        if args.comando == "atualizacao-ativa":
            _atualizacao_ativa(settings)
            return 0
        if args.comando == "backup-criar":
            _backup_criar(settings, args.origem)
            return 0
        if args.comando == "backup-verificar":
            _backup_verificar(settings, args.arquivo)
            return 0
        if args.comando == "restaurar":
            await _restaurar(settings, args.arquivo)
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
