"""ajoute la table RefreshToken

Revision ID: 147a71c08312
Revises: 1de417ce039b
Create Date: 2026-11-20 03:47:05.065976

"""

from collections.abc import Sequence

# Identifiants de révision, utilisés par Alembic.
revision: str = "147a71c08312"
down_revision: str | Sequence[str] | None = "1de417ce039b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Met à jour le schéma."""
    # ### commandes générées automatiquement par Alembic - à ajuster ! ###
    # ### fin des commandes Alembic ###


def downgrade() -> None:
    """Rétrograde le schéma."""
    # ### commandes générées automatiquement par Alembic - à ajuster ! ###
    # ### fin des commandes Alembic ###
