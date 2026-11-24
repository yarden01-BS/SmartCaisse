"""drop redundant cashier storage columns

Revision ID: f6f73adfe59a
Revises: 8601d4c23a51
Create Date: 2026-11-24 06:27:09.924965

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f6f73adfe59a"
down_revision: str | Sequence[str] | None = "8601d4c23a51"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Supprime les colonnes redondantes du caissier."""
    op.drop_constraint(
        "fk_transactions_account_id_accounts", "transactions", type_="foreignkey"
    )
    op.drop_column("transactions", "account_id")
    op.drop_column("reports", "sent_at")
    op.drop_column("reports", "period")
    op.drop_column("reports", "type")
    op.execute("DROP TYPE IF EXISTS report_type")


def downgrade() -> None:
    """Restaure les colonnes et récupère le caissier depuis le bon."""
    op.execute(
        "DO $$ BEGIN CREATE TYPE report_type AS ENUM ('daily', 'monthly'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )
    report_type = postgresql.ENUM(
        "daily", "monthly", name="report_type", create_type=False
    )

    op.add_column(
        "reports",
        sa.Column("type", report_type, nullable=False, server_default="daily"),
    )
    op.alter_column("reports", "type", server_default=None)
    op.add_column(
        "reports",
        sa.Column(
            "period",
            sa.Date(),
            nullable=False,
            server_default=sa.text("CURRENT_DATE"),
        ),
    )
    op.alter_column("reports", "period", server_default=None)
    op.add_column(
        "reports",
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.add_column("transactions", sa.Column("account_id", sa.Integer(), nullable=True))
    op.execute(
        "UPDATE transactions AS t SET account_id = po.account_id "
        "FROM purchase_orders AS po WHERE po.id = t.purchase_order_id"
    )
    op.alter_column(
        "transactions", "account_id", existing_type=sa.Integer(), nullable=False
    )
    op.create_foreign_key(
        "fk_transactions_account_id_accounts",
        "transactions",
        "accounts",
        ["account_id"],
        ["id"],
    )
