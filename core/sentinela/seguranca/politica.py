"""Política do segundo fator: "exigir TOTP dos administradores" e a limpeza do TOTP."""

from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from sentinela.db.modelos import CodigoRecuperacao, Config, Sessao, Usuario
from sentinela.seguranca.totp import totp_ativo

CHAVE = "seguranca"


async def exigir_totp_admin(db: AsyncSession) -> bool:
    linha = await db.get(Config, CHAVE)
    valor = linha.valor if linha is not None else None
    return isinstance(valor, dict) and valor.get("exigir_totp_admin") is True


async def definir_exigir_totp_admin(db: AsyncSession, valor: bool) -> None:
    """Grava a política (o chamador dá o ``commit``)."""
    novo = {"exigir_totp_admin": valor}
    linha = await db.get(Config, CHAVE)
    if linha is None:
        db.add(Config(chave=CHAVE, valor=novo))
    else:
        linha.valor = novo


def restrita(usuario: Usuario, exigir: bool) -> bool:
    """Administrador, política ligada e sem TOTP ativo: sessão só para a ativação."""
    return exigir and usuario.papel == "admin" and not totp_ativo(usuario)


async def zerar_totp(db: AsyncSession, usuario_id: int) -> None:
    """Apaga segredo, contador e códigos e revoga as sessões do usuário (o chamador dá o
    ``commit``)."""
    await db.execute(
        update(Usuario)
        .where(Usuario.id == usuario_id)
        .values(totp_cifrado=None, totp_ultimo_contador=None)
        .execution_options(synchronize_session=False)
    )
    await db.execute(delete(CodigoRecuperacao).where(CodigoRecuperacao.usuario_id == usuario_id))
    await db.execute(
        update(Sessao)
        .where(Sessao.usuario_id == usuario_id)
        .values(revogada=True)
        .execution_options(synchronize_session=False)
    )
