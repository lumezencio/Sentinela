"""índices de descoberta por IP e por status (fila e buscas da mescla)

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-17 18:00:00.000000

Só cria/remove índices: nenhum dado muda nos dois sentidos.
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(op.f("ix_descoberta_ip"), "descoberta", ["ip"], unique=False)
    op.create_index(op.f("ix_descoberta_status"), "descoberta", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_descoberta_status"), table_name="descoberta")
    op.drop_index(op.f("ix_descoberta_ip"), table_name="descoberta")
