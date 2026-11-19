"""TESTE (testes-operacao/rodar.sh): migração que sempre falha.

Faz o core nunca ficar saudável na versão candidata, para provar a volta automática do update.sh.
"""

from alembic import op  # noqa: F401

revision = "0099"
down_revision = "0098"
branch_labels = None
depends_on = None


def upgrade() -> None:
    raise RuntimeError("falha proposital do teste de atualização")


def downgrade() -> None:
    pass
