"""supprime la quantité des bons de commande

Revision ID: 025f16bdea2e
Revises: 147a71c08312
Create Date: 2026-11-20 04:25:35.283872

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Identifiants de révision, utilisés par Alembic.
revision: str = "025f16bdea2e"
down_revision: str | Sequence[str] | None = "147a71c08312"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Met à jour le schéma."""
    # ### commandes générées automatiquement par Alembic - à ajuster ! ###
    op.drop_column("purchase_orders", "quantity")
    # ### fin des commandes Alembic ###


def downgrade() -> None:
    """Rétrograde le schéma."""
    # ### commandes générées automatiquement par Alembic - à ajuster ! ###
    # Remplit les lignes existantes afin que la colonne NOT NULL restaurée puisse être créée en toute sécurité.
    op.add_column(
        "purchase_orders",
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
    )
    op.alter_column("purchase_orders", "quantity", server_default=None)
    # ### fin des commandes Alembic ###
