"""produto: aparelho_novo, gateway e linha de base das sub-redes, leituras de uptime

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-20 10:00:00.000000

`alerta` aceita o tipo `aparelho_novo` e ganha `descoberta_id` (FK SET NULL); `sub_rede` ganha
`gateway_ip`, `ultima_varredura_em` e `linha_base_em` (nulos); nasce `leitura_uptime`. O
downgrade apaga os alertas `aparelho_novo`, devolve o CHECK antigo, remove as colunas e a
tabela e apaga a chave `varredura_continua_min` de `config`; os demais alertas e as sub-redes
ficam como estão.
"""

import sqlalchemy as sa

import sentinela.db.base
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

_CHECK_NOVO = "tipo IN ('queda', 'volta', 'instavel', 'fonte_falhou', 'aparelho_novo')"
_CHECK_ANTIGO = "tipo IN ('queda', 'volta', 'instavel', 'fonte_falhou')"


def upgrade() -> None:
    with op.batch_alter_table("sub_rede") as lote:
        lote.add_column(sa.Column("gateway_ip", sa.String(length=45), nullable=True))
        lote.add_column(
            sa.Column("ultima_varredura_em", sentinela.db.base.UTCDateTime(), nullable=True)
        )
        lote.add_column(sa.Column("linha_base_em", sentinela.db.base.UTCDateTime(), nullable=True))
    # recria `alerta` (SQLite não troca CHECK no lugar); o `alerta_origem_id` aponta para a
    # própria tabela e as FKs são religadas pela recriação
    with op.batch_alter_table("alerta", recreate="always") as lote:
        lote.drop_constraint(op.f("ck_alerta_tipo"), type_="check")
        lote.create_check_constraint("tipo", sa.text(_CHECK_NOVO))
        lote.add_column(sa.Column("descoberta_id", sa.String(length=36), nullable=True))
        lote.create_foreign_key(
            op.f("fk_alerta_descoberta_id_descoberta"),
            "descoberta",
            ["descoberta_id"],
            ["id"],
            ondelete="SET NULL",
        )
        lote.create_index(op.f("ix_alerta_descoberta_id"), ["descoberta_id"], unique=False)
    op.create_table(
        "leitura_uptime",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fonte_id", sa.String(length=36), nullable=False),
        sa.Column("equipamento_id", sa.String(length=36), nullable=False),
        sa.Column("lido_em", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("uptime_s", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(
            ["fonte_id"],
            ["fonte.id"],
            name=op.f("fk_leitura_uptime_fonte_id_fonte"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["equipamento_id"],
            ["equipamento.id"],
            name=op.f("fk_leitura_uptime_equipamento_id_equipamento"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_leitura_uptime")),
    )
    op.create_index(
        "ix_leitura_uptime_equipamento_lido",
        "leitura_uptime",
        ["equipamento_id", "lido_em"],
        unique=False,
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM config WHERE chave = 'varredura_continua_min'"))
    op.drop_index("ix_leitura_uptime_equipamento_lido", table_name="leitura_uptime")
    op.drop_table("leitura_uptime")
    op.execute(sa.text("DELETE FROM alerta WHERE tipo = 'aparelho_novo'"))
    with op.batch_alter_table("alerta", recreate="always") as lote:
        lote.drop_index(op.f("ix_alerta_descoberta_id"))
        lote.drop_constraint(op.f("fk_alerta_descoberta_id_descoberta"), type_="foreignkey")
        lote.drop_column("descoberta_id")
        lote.drop_constraint(op.f("ck_alerta_tipo"), type_="check")
        lote.create_check_constraint("tipo", sa.text(_CHECK_ANTIGO))
    # DROP COLUMN nativo (SQLite >= 3.35), como na 0005
    op.execute(sa.text("ALTER TABLE sub_rede DROP COLUMN linha_base_em"))
    op.execute(sa.text("ALTER TABLE sub_rede DROP COLUMN ultima_varredura_em"))
    op.execute(sa.text("ALTER TABLE sub_rede DROP COLUMN gateway_ip"))
