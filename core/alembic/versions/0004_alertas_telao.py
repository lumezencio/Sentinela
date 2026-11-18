"""alertas, silêncios/manutenções, telões e pedidos de pareamento

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-18 09:00:00.000000

O `estado` de `equipamento` não tem CHECK: o upgrade não mexe nele. O downgrade converte
`inalcancavel` (estado novo desta fase) em `offline` no equipamento e no histórico de eventos,
antes de remover as tabelas, e apaga as chaves de `config` que só esta fase conhece.
"""

import sqlalchemy as sa

import sentinela.db.base
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

_CHAVES_CONFIG = ("telegram", "telegram_status", "paredes_http")


def upgrade() -> None:
    op.create_table(
        "alerta",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=16), nullable=False),
        sa.Column("equipamento_id", sa.String(length=36), nullable=True),
        sa.Column("fonte_id", sa.String(length=36), nullable=True),
        sa.Column("quedas", sa.JSON(), nullable=False),
        sa.Column("afetados", sa.JSON(), nullable=False),
        sa.Column("voltaram", sa.JSON(), nullable=False),
        sa.Column("aberto_em", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("fechado_em", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("breve", sa.Boolean(), nullable=False),
        sa.Column("alerta_origem_id", sa.Integer(), nullable=True),
        sa.Column("reconhecido_por", sa.Integer(), nullable=True),
        sa.Column("reconhecido_em", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("silenciado", sa.Boolean(), nullable=False),
        sa.Column("envio", sa.String(length=10), nullable=False),
        sa.Column("envio_tentativas", sa.Integer(), nullable=False),
        sa.Column("envio_proxima", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("enviado_para", sa.JSON(), nullable=False),
        sa.Column("telegram_msgs", sa.JSON(), nullable=False),
        sa.CheckConstraint(
            "tipo IN ('queda', 'volta', 'instavel', 'fonte_falhou')", name=op.f("ck_alerta_tipo")
        ),
        sa.CheckConstraint(
            "envio IN ('nao_aplica', 'pendente', 'enviado', 'falhou')",
            name=op.f("ck_alerta_envio"),
        ),
        sa.ForeignKeyConstraint(
            ["equipamento_id"],
            ["equipamento.id"],
            name=op.f("fk_alerta_equipamento_id_equipamento"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["fonte_id"], ["fonte.id"], name=op.f("fk_alerta_fonte_id_fonte"), ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["alerta_origem_id"],
            ["alerta.id"],
            name=op.f("fk_alerta_alerta_origem_id_alerta"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["reconhecido_por"],
            ["usuario.id"],
            name=op.f("fk_alerta_reconhecido_por_usuario"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_alerta")),
    )
    op.create_index(op.f("ix_alerta_aberto_em"), "alerta", ["aberto_em"], unique=False)
    op.create_index(op.f("ix_alerta_fechado_em"), "alerta", ["fechado_em"], unique=False)
    op.create_index(op.f("ix_alerta_envio"), "alerta", ["envio"], unique=False)

    op.create_table(
        "silencio",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=10), nullable=False),
        sa.Column("alvo_tipo", sa.String(length=12), nullable=False),
        sa.Column("equipamento_id", sa.String(length=36), nullable=True),
        sa.Column("classe_id", sa.Integer(), nullable=True),
        sa.Column("inicio", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("fim", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("motivo", sa.String(length=200), nullable=True),
        sa.Column("criado_por", sa.Integer(), nullable=True),
        sa.Column("encerrado_em", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("pausados", sa.JSON(), nullable=False),
        sa.CheckConstraint("tipo IN ('silencio', 'manutencao')", name=op.f("ck_silencio_tipo")),
        sa.CheckConstraint(
            "alvo_tipo IN ('equipamento', 'classe')", name=op.f("ck_silencio_alvo_tipo")
        ),
        sa.CheckConstraint(
            "(alvo_tipo = 'equipamento' AND equipamento_id IS NOT NULL AND classe_id IS NULL)"
            " OR (alvo_tipo = 'classe' AND classe_id IS NOT NULL AND equipamento_id IS NULL)",
            name=op.f("ck_silencio_alvo"),
        ),
        sa.CheckConstraint("fim > inicio", name=op.f("ck_silencio_periodo")),
        sa.ForeignKeyConstraint(
            ["equipamento_id"],
            ["equipamento.id"],
            name=op.f("fk_silencio_equipamento_id_equipamento"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["classe_id"],
            ["classe.id"],
            name=op.f("fk_silencio_classe_id_classe"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["criado_por"],
            ["usuario.id"],
            name=op.f("fk_silencio_criado_por_usuario"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_silencio")),
    )

    op.create_table(
        "parede",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=64), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=True),
        sa.Column("modo", sa.String(length=5), nullable=False),
        sa.Column("ip_vinculado", sa.String(length=45), nullable=True),
        sa.Column("criado_em", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("ultimo_acesso", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("ultimo_ip", sa.String(length=45), nullable=True),
        sa.Column("revogada_em", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.CheckConstraint("modo IN ('https', 'http')", name=op.f("ck_parede_modo")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_parede")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_parede_token_hash")),
    )

    op.create_table(
        "parede_pedido",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("codigo_hash", sa.String(length=64), nullable=False),
        sa.Column("segredo_hash", sa.String(length=64), nullable=False),
        sa.Column("ip", sa.String(length=45), nullable=False),
        sa.Column("modo", sa.String(length=5), nullable=False),
        sa.Column("criado_em", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("expira_em", sentinela.db.base.UTCDateTime(), nullable=False),
        sa.Column("aprovado_em", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("consumido_em", sentinela.db.base.UTCDateTime(), nullable=True),
        sa.Column("parede_id", sa.Integer(), nullable=True),
        sa.CheckConstraint("modo IN ('https', 'http')", name=op.f("ck_parede_pedido_modo")),
        sa.ForeignKeyConstraint(
            ["parede_id"],
            ["parede.id"],
            name=op.f("fk_parede_pedido_parede_id_parede"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_parede_pedido")),
        sa.UniqueConstraint("codigo_hash", name=op.f("uq_parede_pedido_codigo_hash")),
        sa.UniqueConstraint("segredo_hash", name=op.f("uq_parede_pedido_segredo_hash")),
    )


def downgrade() -> None:
    # `inalcancavel` não existe na versão anterior: vira `offline` (equipamento e histórico)
    op.execute(sa.text("UPDATE equipamento SET estado = 'offline' WHERE estado = 'inalcancavel'"))
    op.execute(sa.text("UPDATE evento SET de = 'offline' WHERE de = 'inalcancavel'"))
    op.execute(sa.text("UPDATE evento SET para = 'offline' WHERE para = 'inalcancavel'"))
    for chave in _CHAVES_CONFIG:
        op.execute(sa.text("DELETE FROM config WHERE chave = :c").bindparams(c=chave))
    op.drop_table("parede_pedido")
    op.drop_table("parede")
    op.drop_table("silencio")
    op.drop_index(op.f("ix_alerta_envio"), table_name="alerta")
    op.drop_index(op.f("ix_alerta_fechado_em"), table_name="alerta")
    op.drop_index(op.f("ix_alerta_aberto_em"), table_name="alerta")
    op.drop_table("alerta")
