"""Database session dependency for FastAPI."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from .database import SessionLocal


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield a session, committing on success and rolling back on error."""
    async with SessionLocal() as session, session.begin():
        yield session
