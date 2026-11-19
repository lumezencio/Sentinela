import secrets
from pathlib import Path

import pytest
from sqlalchemy import select

from sentinela import cli
from sentinela.config import Settings
from sentinela.db.modelos import Auditoria, CodigoRecuperacao, Sessao, Usuario
from sentinela.db.sessao import criar_motor, fabrica_sessao
from sentinela.seguranca import recuperacao
from sentinela.seguranca.sessoes import criar_sessao
from sentinela.seguranca.totp import cifrar_segredo, novo_segredo
from tests.apoio_totp import AGORA_FIXO
from tests.conftest import criar_esquema


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'cli.db'}",
        chave_sessao="x",
        chave_credenciais=secrets.token_hex(32),
    )


async def _preparar(settings: Settings) -> None:
    from sentinela.seguranca.cofre import Cofre

    await criar_esquema(settings.banco_url)
    cofre = Cofre(settings.chave_credenciais)
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            db.add_all(
                [
                    Usuario(
                        id=1,
                        login="ana",
                        hash_senha="h",
                        papel="admin",
                        totp_cifrado=cifrar_segredo(cofre, novo_segredo()),
                        totp_ultimo_contador=7,
                    ),
                    Usuario(id=2, login="bia", hash_senha="h"),
                ]
            )
            await db.commit()
            await recuperacao.emitir(db, 1, AGORA_FIXO)
            await recuperacao.emitir(db, 2, AGORA_FIXO)
            await criar_sessao(db, 1, AGORA_FIXO)
            await criar_sessao(db, 2, AGORA_FIXO)
    finally:
        await motor.dispose()


async def test_cli_totp_zerar_limpa_segredo_codigos_e_sessoes_e_audita(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    settings = _settings(tmp_path)
    await _preparar(settings)
    assert await cli.executar(["totp-zerar", "ana"], settings) == 0
    saida = capsys.readouterr().out
    assert "revogadas" in saida and "ativar de novo" in saida
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            ana = (await db.execute(select(Usuario).where(Usuario.login == "ana"))).scalar_one()
            assert ana.totp_cifrado is None and ana.totp_ultimo_contador is None
            codigos = (await db.execute(select(CodigoRecuperacao))).scalars().all()
            assert {c.usuario_id for c in codigos} == {2}  # os da outra usuária ficam
            sessoes = (await db.execute(select(Sessao))).scalars().all()
            assert {s.usuario_id: s.revogada for s in sessoes} == {1: True, 2: False}
            bia = (await db.execute(select(Usuario).where(Usuario.login == "bia"))).scalar_one()
            auditorias = (await db.execute(select(Auditoria))).scalars().all()
    finally:
        await motor.dispose()
    assert bia.hash_senha == "h"
    assert [(a.acao, a.usuario_id, a.alvo) for a in auditorias] == [
        ("cli:totp.zerar", None, "usuario:1")
    ]


async def test_cli_totp_zerar_login_inexistente_codigo_1(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    settings = _settings(tmp_path)
    await _preparar(settings)
    assert await cli.executar(["totp-zerar", "fantasma"], settings) == 1
    captura = capsys.readouterr()
    assert captura.err.startswith("erro: ")
    assert captura.out == ""
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            assert (await db.execute(select(Auditoria))).scalars().all() == []
            ana = (await db.execute(select(Usuario).where(Usuario.login == "ana"))).scalar_one()
            assert ana.totp_ultimo_contador == 7
    finally:
        await motor.dispose()
