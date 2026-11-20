"""ajoute les jetons d'actualisation révoqués

Revision ID: 1de417ce039b
Revises: 96a710d0bbac
Create Date: 2026-11-20 03:33:43.512787

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# Identifiants de révision, utilisés par Alembic.
revision: str = "1de417ce039b"
down_revision: str | Sequence[str] | None = "96a710d0bbac"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Met à jour le schéma."""
    # ### commandes générées automatiquement par Alembic - à ajuster ! ###
    op.create_table(
        "revoked_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("jti", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_revoked_tokens_jti"), "revoked_tokens", ["jti"], unique=True
    )
    # ### fin des commandes Alembic ###


def downgrade() -> None:
    """Rétrograde le schéma."""
    # ### commandes générées automatiquement par Alembic - à ajuster ! ###
    op.drop_index(op.f("ix_revoked_tokens_jti"), table_name="revoked_tokens")
    op.drop_table("revoked_tokens")
    # ### fin des commandes Alembic ###
