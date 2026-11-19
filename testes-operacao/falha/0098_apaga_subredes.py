"""TESTE (testes-operacao/rodar.sh): apaga as sub-redes e confirma a mudança.

Copiada para core/alembic/versions/ só dentro do clone temporário do teste real do update.sh.
Simula uma migração que já alterou dados quando a seguinte quebra: a volta do update.sh tem de
trazer o banco do backup (as sub-redes de volta), sem alembic downgrade.
"""

from alembic import op

revision = "0098"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM sub_rede")
    # confirma já: a falha da 0099 não pode desfazer esta mudança (o teste exige banco alterado)
    op.get_bind().commit()


def downgrade() -> None:
    pass
