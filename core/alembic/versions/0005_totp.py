"""segundo fator (TOTP) e códigos de recuperação

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-18 15:00:00.000000

`usuario` ganha `totp_cifrado` e `totp_ultimo_contador` (nulos: ninguém tem TOTP ao atualizar)
e nasce `codigo_recuperacao`. O downgrade remove a tabela, as colunas e a chave `seguranca` de
`config`, sem tocar nos usuários nem nas demais tabelas.
"""

import sqlalchemy as sa

import sentinela.db.base
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("usuario") as lote:
        lote.add_column(sa.Column("totp_cifrado", sa.String(length=512), nullable=True))
        lote.add_column(sa.Column("totp_ultimo_contador", sa.BigInteger(), nullable=True))
    op.create_table(
        "codigo_recuperacao",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("hash_codigo", sa.String(length=255), nullable=False),
        sa.Column("criado_em", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("usado_em", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuario.id"],
            name=op.f("fk_codigo_recuperacao_usuario_id_usuario"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_codigo_recuperacao")),
    )
    op.create_index(
        op.f("ix_codigo_recuperacao_usuario_id"), "codigo_recuperacao", ["usuario_id"], unique=False
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM config WHERE chave = 'seguranca'"))
    op.drop_index(op.f("ix_codigo_recuperacao_usuario_id"), table_name="codigo_recuperacao")
    op.drop_table("codigo_recuperacao")
    with op.batch_alter_table("usuario") as lote:
        lote.drop_column("totp_ultimo_contador")
        lote.drop_column("totp_cifrado")
