"""descoberta automática: fontes, descobertas, config, hierarquia de equipamentos

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-17 10:00:00.000000

Atenção (SQLite): recriar `equipamento` (necessário para trocar o CHECK e o UNIQUE de `ip`)
dispara `ON DELETE CASCADE` em `evento` e `amostra` quando as chaves estrangeiras estão
ligadas. Por isso o histórico é copiado para tabelas temporárias antes e devolvido depois.
"""

import sqlalchemy as sa

import sentinela.db.base
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

# nomes fixos: nada aqui vem de entrada externa, então o SQL montado é seguro
_FILHAS = ("evento", "amostra")


def _guardar_historico() -> None:
    for t in _FILHAS:
        op.execute(sa.text(f"CREATE TABLE _bak_{t} AS SELECT * FROM {t}"))  # noqa: S608


def _devolver_historico() -> None:
    for t in _FILHAS:
        op.execute(sa.text(f"DELETE FROM {t}"))  # noqa: S608
        op.execute(sa.text(f"INSERT INTO {t} SELECT * FROM _bak_{t}"))  # noqa: S608
        op.execute(sa.text(f"DROP TABLE _bak_{t}"))


def upgrade() -> None:
    _guardar_historico()
    op.drop_index(
        "uq_equipamento_mac_presente",
        table_name="equipamento",
        sqlite_where=sa.text("mac IS NOT NULL"),
    )
    with op.batch_alter_table("equipamento", recreate="always") as lote:
        lote.drop_constraint(op.f("uq_equipamento_ip"), type_="unique")
        lote.drop_constraint(op.f("ck_equipamento_checagem"), type_="check")
        lote.add_column(sa.Column("pai_id", sa.String(length=36), nullable=True))
        lote.add_column(sa.Column("canal", sa.Integer(), nullable=True))
        lote.create_foreign_key(
            op.f("fk_equipamento_pai_id_equipamento"),
            "equipamento",
            ["pai_id"],
            ["id"],
            ondelete="SET NULL",
        )
        lote.create_check_constraint(
            op.f("ck_equipamento_checagem"),
            "checagem IN ('icmp', 'tcp', 'http', 'gravador')",
        )
    op.create_index(
        "uq_equipamento_mac_presente",
        "equipamento",
        ["mac"],
        unique=True,
        sqlite_where=sa.text("mac IS NOT NULL"),
    )
    op.create_index(
        "uq_equipamento_ip_exceto_gravador",
        "equipamento",
        ["ip"],
        unique=True,
        sqlite_where=sa.text("checagem <> 'gravador'"),
    )
    _devolver_historico()

    op.add_column(
        "sub_rede",
        sa.Column("permite_varredura", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "fonte",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tipo", sa.String(length=16), nullable=False),
        sa.Column("nome", sa.String(length=64), nullable=False),
        sa.Column("host", sa.String(length=255), nullable=False),
        sa.Column("porta", sa.Integer(), nullable=False),
        sa.Column("tls", sa.Boolean(), nullable=False),
        sa.Column("credencial_cifrada", sa.LargeBinary(), nullable=False),
        sa.Column("impressao_tls", sa.String(length=64), nullable=True),
        sa.Column("ativa", sa.Boolean(), nullable=False),
        sa.Column("intervalo_s", sa.Integer(), nullable=False),
        sa.Column("ultima_coleta", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("ultimo_erro", sa.String(length=200), nullable=True),
        sa.Column("equipamento_id", sa.String(length=36), nullable=True),
        sa.CheckConstraint(
            "tipo IN ('mikrotik', 'snmp', 'hikvision', 'dahua', 'simulada')",
            name=op.f("ck_fonte_tipo"),
        ),
        sa.CheckConstraint("intervalo_s BETWEEN 300 AND 3600", name=op.f("ck_fonte_intervalo_s")),
        sa.ForeignKeyConstraint(
            ["equipamento_id"],
            ["equipamento.id"],
            name=op.f("fk_fonte_equipamento_id_equipamento"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_fonte")),
    )
    op.create_table(
        "descoberta",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("chave", sa.String(length=80), nullable=False),
        sa.Column("ip", sa.String(length=45), nullable=False),
        sa.Column("mac", sa.String(length=17), nullable=True),
        sa.Column("fabricante", sa.String(length=120), nullable=True),
        sa.Column("nome_sugerido", sa.String(length=120), nullable=True),
        sa.Column("sinais", sa.JSON(), nullable=False),
        sa.Column("classe_sugerida", sa.String(length=32), nullable=True),
        sa.Column("confianca", sa.Float(), nullable=False),
        sa.Column("origens", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("pai_equipamento_id", sa.String(length=36), nullable=True),
        sa.Column("canal", sa.Integer(), nullable=True),
        sa.Column("equipamento_id", sa.String(length=36), nullable=True),
        sa.Column("fora_das_subredes", sa.Boolean(), nullable=False),
        sa.Column("conflito_com", sa.String(length=36), nullable=True),
        sa.Column("sondada_em", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("primeira_vez", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("ultima_vez", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.CheckConstraint(
            "status IN ('pendente', 'aprovada', 'ignorada')", name=op.f("ck_descoberta_status")
        ),
        sa.ForeignKeyConstraint(
            ["pai_equipamento_id"],
            ["equipamento.id"],
            name=op.f("fk_descoberta_pai_equipamento_id_equipamento"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["equipamento_id"],
            ["equipamento.id"],
            name=op.f("fk_descoberta_equipamento_id_equipamento"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_descoberta")),
        sa.UniqueConstraint("chave", name=op.f("uq_descoberta_chave")),
    )
    op.create_table(
        "config",
        sa.Column("chave", sa.String(length=64), nullable=False),
        sa.Column("valor", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("chave", name=op.f("pk_config")),
    )


def downgrade() -> None:
    op.drop_table("config")
    op.drop_table("descoberta")
    op.drop_table("fonte")
    with op.batch_alter_table("sub_rede") as lote:
        lote.drop_column("permite_varredura")

    # câmeras de gravador não existem no esquema antigo (IP repetido, checagem nova)
    op.execute(sa.text("DELETE FROM equipamento WHERE checagem = 'gravador'"))
    _guardar_historico()
    op.drop_index(
        "uq_equipamento_ip_exceto_gravador",
        table_name="equipamento",
        sqlite_where=sa.text("checagem <> 'gravador'"),
    )
    op.drop_index(
        "uq_equipamento_mac_presente",
        table_name="equipamento",
        sqlite_where=sa.text("mac IS NOT NULL"),
    )
    with op.batch_alter_table("equipamento", recreate="always") as lote:
        lote.drop_constraint(op.f("fk_equipamento_pai_id_equipamento"), type_="foreignkey")
        lote.drop_column("pai_id")
        lote.drop_column("canal")
        lote.drop_constraint(op.f("ck_equipamento_checagem"), type_="check")
        lote.create_check_constraint(
            op.f("ck_equipamento_checagem"), "checagem IN ('icmp', 'tcp', 'http')"
        )
        lote.create_unique_constraint(op.f("uq_equipamento_ip"), ["ip"])
    op.create_index(
        "uq_equipamento_mac_presente",
        "equipamento",
        ["mac"],
        unique=True,
        sqlite_where=sa.text("mac IS NOT NULL"),
    )
    _devolver_historico()
