"""Dépendance de session de base de données pour FastAPI."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from .database import SessionLocal


async def get_session() -> AsyncIterator[AsyncSession]:
    """Fournit une session, validant en cas de succès et annulant en cas d'erreur."""
    async with SessionLocal() as session, session.begin():
        yield session
