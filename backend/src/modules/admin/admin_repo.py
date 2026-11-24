"""Accès à la base de données pour l'administration des comptes."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...db.base_repo import BaseRepository
from ...db.models import Account


class AdminRepository(BaseRepository[Account]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Account)

    def _with_profile(self, query):
        return query.options(
            selectinload(Account.beneficiary), selectinload(Account.cashier)
        )

    async def list_all(self) -> list[Account]:
        """Liste tous les comptes avec le profil de leur propriétaire."""
        result = await self._session.execute(self._with_profile(select(Account)))
        return list(result.scalars().all())

    async def get_by_id(self, account_id: int) -> Account | None:
        result = await self._session.execute(
            self._with_profile(select(Account).where(Account.id == account_id))
        )
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Account | None:
        result = await self._session.execute(
            select(Account).where(Account.email == email)
        )
        return result.scalars().first()
