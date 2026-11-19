from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.db.base import Beneficiary
from backend.src.db.base_repo import BaseRepository


class CashierRepository(BaseRepository[Beneficiary]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Beneficiary)
