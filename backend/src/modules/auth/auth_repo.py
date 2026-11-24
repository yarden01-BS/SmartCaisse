"""Accès aux comptes et à la révocation des jetons d'actualisation."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.base_repo import BaseRepository
from ...db.models import Account, RevokedToken


class AccountRepository(BaseRepository[Account]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Account)

    async def get_by_email(self, email: str) -> Account | None:
        result = await self._session.execute(
            select(Account).where(Account.email == email)
        )
        return result.scalars().first()

    async def get_by_id(self, account_id: int) -> Account | None:
        result = await self._session.execute(
            select(Account).where(Account.id == account_id)
        )
        return result.scalars().first()


class RevokedTokenRepository(BaseRepository[RevokedToken]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, RevokedToken)

    async def is_revoked(self, jti: str) -> bool:
        result = await self._session.execute(
            select(RevokedToken.id).where(RevokedToken.jti == jti)
        )
        return result.scalar_one_or_none() is not None

    async def revoke(self, jti: str, expires_at: datetime) -> bool:
        """Insère une révocation idempotente ; renvoie False si elle existe déjà."""
        statement = (
            insert(RevokedToken)
            .values(jti=jti, expires_at=expires_at)
            .on_conflict_do_nothing(index_elements=["jti"])
            .returning(RevokedToken.id)
        )
        result = await self._session.execute(statement)
        return result.scalar_one_or_none() is not None
