"""Database access for user profiles."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...db.base_repo import BaseRepository
from ...db.models import Account


class UserRepository(BaseRepository[Account]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Account)

    async def get_with_profile(self, account_id: int) -> Account | None:
        """Load an account together with its beneficiary or cashier profile."""
        result = await self._session.execute(
            select(Account)
            .where(Account.id == account_id)
            .options(selectinload(Account.beneficiary), selectinload(Account.cashier))
        )
        return result.scalars().first()
