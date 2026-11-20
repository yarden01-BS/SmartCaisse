"""Database access for beneficiaries."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.base_repo import BaseRepository
from ...db.models import Beneficiary
from .beneficiary_schemas import BeneficiarySort


class BeneficiaryRepository(BaseRepository[Beneficiary]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Beneficiary)

    async def get_by_id(self, beneficiary_id: int) -> Beneficiary | None:
        result = await self._session.execute(
            select(Beneficiary).where(Beneficiary.id == beneficiary_id)
        )
        return result.scalars().first()

    async def list_all(
        self, sort: BeneficiarySort, is_active: bool | None
    ) -> list[Beneficiary]:
        """List beneficiaries, optionally filtered by status and sorted by creation date."""
        query = select(Beneficiary)
        if is_active is not None:
            query = query.where(Beneficiary.is_active == is_active)

        if sort == "recent":
            query = query.order_by(Beneficiary.created_at.desc(), Beneficiary.id.desc())
        else:
            query = query.order_by(Beneficiary.created_at.asc(), Beneficiary.id.asc())

        result = await self._session.execute(query)
        return list(result.scalars().all())
