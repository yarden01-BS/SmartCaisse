"""initialise les tables

Revision ID: 96a710d0bbac
Revises:
Create Date: 2026-11-19 18:40:44.460717

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

# Identifiants de révision, utilisés par Alembic.
revision: str = "96a710d0bbac"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ENUM_TYPES = {
    "beneficiary_situation": ("permanent", "stagiare"),
    "account_role": ("admin", "cashier"),
    "report_type": ("daily", "monthly"),
}


def upgrade() -> None:
    """Met à jour le schéma."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Réutilise les types d'énumération laissés par les tentatives précédentes et complète les libellés manquants.
    for name, labels in ENUM_TYPES.items():
        sa.Enum(*labels, name=name, create_type=False).create(
            op.get_bind(), checkfirst=True
        )
        for label in labels:
            op.execute(f"ALTER TYPE {name} ADD VALUE IF NOT EXISTS '{label}'")

    # ### commandes générées automatiquement par Alembic - à ajuster ! ###
    op.create_table(
        "beneficiaries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("profession", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "situation",
            sa.Enum(
                "permanent", "stagiare", name="beneficiary_situation", create_type=False
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "cashiers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("beneficiary_id", sa.Integer(), nullable=True),
        sa.Column("cashier_id", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column(
            "role",
            sa.Enum("admin", "cashier", name="account_role", create_type=False),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.CheckConstraint(
            "(cashier_id IS NOT NULL) <> (beneficiary_id IS NOT NULL)",
            name="ck_account_one_owner",
        ),
        sa.ForeignKeyConstraint(
            ["beneficiary_id"], ["beneficiaries.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["cashier_id"], ["cashiers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("beneficiary_id"),
        sa.UniqueConstraint("cashier_id"),
    )
    op.create_table(
        "face_embeddings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("beneficiary_id", sa.Integer(), nullable=False),
        sa.Column("embedding", Vector(512), nullable=False),
        sa.Column(
            "enrolled_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["beneficiary_id"], ["beneficiaries.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("beneficiary_id"),
    )
    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("beneficiary_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column(
            "order_date",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("order_number", sa.String(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Double(), nullable=False),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["accounts.id"],
        ),
        sa.ForeignKeyConstraint(
            ["beneficiary_id"], ["beneficiaries.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum("daily", "monthly", name="report_type", create_type=False),
            nullable=False,
        ),
        sa.Column("period", sa.Date(), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["accounts.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("purchase_order_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("company_share", sa.Integer(), nullable=False),
        sa.Column("customer_share", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["accounts.id"],
        ),
        sa.ForeignKeyConstraint(
            ["purchase_order_id"],
            ["purchase_orders.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    # ### fin des commandes Alembic ###


def downgrade() -> None:
    """Rétrograde le schéma."""
    # ### commandes générées automatiquement par Alembic - à ajuster ! ###
    op.drop_table("transactions")
    op.drop_table("reports")
    op.drop_table("purchase_orders")
    op.drop_table("face_embeddings")
    op.drop_table("accounts")
    op.drop_table("cashiers")
    op.drop_table("beneficiaries")
    op.execute("DROP TYPE IF EXISTS account_role")
    op.execute("DROP TYPE IF EXISTS beneficiary_situation")
    op.execute("DROP TYPE IF EXISTS report_type")
    # ### fin des commandes Alembic ###
