"""CLI ``sub-rede adicionar|remover|listar`` (instalação real: a Guarda nasce vazia)."""

from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import select

from sentinela import cli
from sentinela.config import Settings
from sentinela.db.modelos import Auditoria, Classe, Equipamento, Evento, SubRede
from sentinela.db.sementes import semear_classes
from sentinela.db.sessao import criar_motor, fabrica_sessao
from tests.conftest import criar_esquema

T0 = datetime(2026, 1, 1, tzinfo=UTC)


@pytest.fixture
async def settings(tmp_path: Path) -> Settings:
    s = Settings(
        ambiente="teste",
        banco_url=f"sqlite+aiosqlite:///{tmp_path / 'cli.db'}",
        chave_sessao="x",
    )
    await criar_esquema(s.banco_url)
    return s


async def _ler(settings: Settings, modelo: type) -> list:  # type: ignore[type-arg]
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            return list((await db.execute(select(modelo))).scalars())
    finally:
        await motor.dispose()


async def _com_equipamento(settings: Settings, pausado: bool, causa: str | None) -> None:
    motor = criar_motor(settings.banco_url)
    try:
        async with fabrica_sessao(motor)() as db:
            await semear_classes(db)
            cid = (await db.execute(select(Classe.id).limit(1))).scalar_one()
            db.add(
                Equipamento(
                    id="eq1",
                    nome="câmera",
                    ip="10.99.0.10",
                    classe_id=cid,
                    estado="pausado" if pausado else "desconhecido",
                    estado_desde=T0,
                    pausado=pausado,
                    criado_em=T0,
                )
            )
            if pausado:
                db.add(
                    Evento(equipamento_id="eq1", de="online", para="pausado", em=T0, causa=causa)
                )
            await db.commit()
    finally:
        await motor.dispose()


async def test_adicionar_listar_remover(
    settings: Settings, capsys: pytest.CaptureFixture[str]
) -> None:
    assert await cli.executar(["sub-rede", "adicionar", " 10.99.0.0/24 "], settings) == 0
    assert [s.cidr for s in await _ler(settings, SubRede)] == ["10.99.0.0/24"]
    assert "reinicie o core" in capsys.readouterr().out

    assert await cli.executar(["sub-rede", "listar"], settings) == 0
    assert capsys.readouterr().out.strip().splitlines() == ["10.99.0.0/24"]

    assert await cli.executar(["sub-rede", "remover", "10.99.0.0/24"], settings) == 0
    assert await _ler(settings, SubRede) == []
    auditoria = await _ler(settings, Auditoria)
    assert [(a.acao, a.alvo, a.usuario_id) for a in auditoria] == [
        ("cli:subrede.criar", "10.99.0.0/24", None),
        ("cli:subrede.remover", "10.99.0.0/24", None),
    ]


@pytest.mark.parametrize(
    ("cidr", "motivo"),
    [
        ("8.8.8.0/24", "privada"),
        ("10.0.0.0/8", "prefixo"),
        ("10.99.0.1/24", "CIDR"),
        ("lixo", "CIDR"),
    ],
)
async def test_validacao_igual_a_da_api(
    settings: Settings, capsys: pytest.CaptureFixture[str], cidr: str, motivo: str
) -> None:
    assert await cli.executar(["sub-rede", "adicionar", cidr], settings) == 2
    erro = capsys.readouterr().err
    assert motivo in erro
    assert await _ler(settings, SubRede) == []


async def test_duplicada_e_inexistente(
    settings: Settings, capsys: pytest.CaptureFixture[str]
) -> None:
    assert await cli.executar(["sub-rede", "adicionar", "10.99.0.0/24"], settings) == 0
    assert await cli.executar(["sub-rede", "adicionar", "10.99.0.0/24"], settings) == 1
    assert "já cadastrada" in capsys.readouterr().err
    assert await cli.executar(["sub-rede", "remover", "10.99.1.0/24"], settings) == 1
    assert "não cadastrada" in capsys.readouterr().err


async def test_cidr_obrigatorio(settings: Settings) -> None:
    assert await cli.executar(["sub-rede", "adicionar"], settings) == 2


async def test_remover_pausa_e_readicionar_retoma(settings: Settings) -> None:
    await _com_equipamento(settings, pausado=False, causa=None)
    assert await cli.executar(["sub-rede", "adicionar", "10.99.0.0/24"], settings) == 0
    assert await cli.executar(["sub-rede", "remover", "10.99.0.0/24"], settings) == 0
    (eq,) = await _ler(settings, Equipamento)
    assert (eq.pausado, eq.estado) == (True, "pausado")
    assert await cli.executar(["sub-rede", "adicionar", "10.99.0.0/24"], settings) == 0
    (eq,) = await _ler(settings, Equipamento)
    assert (eq.pausado, eq.estado) == (False, "desconhecido")
    causas = [(e.para, e.causa) for e in await _ler(settings, Evento)]
    assert causas == [
        ("pausado", "fora_das_subredes"),
        ("desconhecido", "dentro_das_subredes"),
    ]


async def test_pausado_manual_continua_pausado(settings: Settings) -> None:
    await _com_equipamento(settings, pausado=True, causa="manual")
    assert await cli.executar(["sub-rede", "adicionar", "10.99.0.0/24"], settings) == 0
    (eq,) = await _ler(settings, Equipamento)
    assert eq.pausado is True
