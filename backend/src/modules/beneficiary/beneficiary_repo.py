"""Accès à la base de données pour les bénéficiaires."""

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

    async def get_by_matricule(self, matricule: str) -> Beneficiary | None:
        result = await self._session.execute(
            select(Beneficiary).where(Beneficiary.matricule == matricule)
        )
        return result.scalars().first()

    async def next_matricule(self) -> str:
        """Génère le prochain matricule au format SIAT-XXX."""
        result = await self._session.execute(select(Beneficiary.matricule))
        max_number = 0
        for (matricule,) in result.all():
            if matricule and matricule.startswith("SIAT-"):
                suffix = matricule.removeprefix("SIAT-")
                if suffix.isdigit():
                    max_number = max(max_number, int(suffix))
        return f"SIAT-{max_number + 1:03d}"

    async def list_all(
        self, sort: BeneficiarySort, is_active: bool | None
    ) -> list[Beneficiary]:
        """Liste les bénéficiaires, filtrés par statut et triés par date de création."""
        query = select(Beneficiary)
        if is_active is not None:
            query = query.where(Beneficiary.is_active == is_active)

        if sort == "recent":
            query = query.order_by(Beneficiary.created_at.desc(), Beneficiary.id.desc())
        else:
            query = query.order_by(Beneficiary.created_at.asc(), Beneficiary.id.asc())

        result = await self._session.execute(query)
        return list(result.scalars().all())
