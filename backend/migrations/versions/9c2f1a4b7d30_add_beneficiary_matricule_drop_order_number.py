"""add beneficiary matricule and drop purchase order number

Revision ID: 9c2f1a4b7d30
Revises: f6f73adfe59a
Create Date: 2026-11-24 07:05:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9c2f1a4b7d30"
down_revision: str | Sequence[str] | None = "f6f73adfe59a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Stocke le matricule et retire le numéro de bon redondant."""
    op.add_column("beneficiaries", sa.Column("matricule", sa.String(), nullable=True))
    op.execute("UPDATE beneficiaries SET matricule = 'SIAT-' || lpad(id::text, 3, '0')")
    op.alter_column(
        "beneficiaries", "matricule", existing_type=sa.String(), nullable=False
    )
    op.create_unique_constraint(
        "uq_beneficiaries_matricule", "beneficiaries", ["matricule"]
    )
    op.drop_column("purchase_orders", "order_number")


def downgrade() -> None:
    """Restaure le numéro de bon et retire la colonne matricule."""
    op.add_column(
        "purchase_orders", sa.Column("order_number", sa.String(), nullable=True)
    )
    op.execute(
        "UPDATE purchase_orders SET order_number = 'PO-' || lpad(id::text, 5, '0')"
    )
    op.alter_column(
        "purchase_orders", "order_number", existing_type=sa.String(), nullable=False
    )
    op.drop_constraint("uq_beneficiaries_matricule", "beneficiaries", type_="unique")
    op.drop_column("beneficiaries", "matricule")
