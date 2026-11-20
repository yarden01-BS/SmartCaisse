"""Logique métier pour l'administration des bénéficiaires."""

from sqlalchemy.ext.asyncio import AsyncSession

from ...db.models import Beneficiary
from .beneficiary_repo import BeneficiaryRepository
from .beneficiary_schemas import (
    BeneficiaryCreate,
    BeneficiaryResponse,
    BeneficiarySort,
    BeneficiaryUpdate,
)


class BeneficiaryNotFoundError(Exception):
    """Levée lorsqu'aucun bénéficiaire ne correspond à l'identifiant demandé."""


def _to_response(beneficiary: Beneficiary) -> BeneficiaryResponse:
    return BeneficiaryResponse.model_validate(beneficiary)


async def create(session: AsyncSession, data: BeneficiaryCreate) -> BeneficiaryResponse:
    """Crée un nouveau bénéficiaire actif."""
    repository = BeneficiaryRepository(session)
    beneficiary = Beneficiary(
        first_name=data.first_name,
        last_name=data.last_name,
        profession=data.profession,
        situation=data.situation,
        is_active=True,
    )
    return _to_response(await repository.add(beneficiary))


async def list_all(
    session: AsyncSession, sort: BeneficiarySort, is_active: bool | None
) -> list[BeneficiaryResponse]:
    """Renvoie les employés (bénéficiaires) triés et filtrés selon la demande."""
    beneficiaries = await BeneficiaryRepository(session).list_all(sort, is_active)
    return [_to_response(beneficiary) for beneficiary in beneficiaries]


async def get(session: AsyncSession, beneficiary_id: int) -> BeneficiaryResponse:
    """Renvoie un bénéficiaire ou lève BeneficiaryNotFoundError."""
    beneficiary = await BeneficiaryRepository(session).get_by_id(beneficiary_id)
    if beneficiary is None:
        raise BeneficiaryNotFoundError(f"Beneficiary {beneficiary_id} not found")
    return _to_response(beneficiary)


async def update(
    session: AsyncSession, beneficiary_id: int, data: BeneficiaryUpdate
) -> BeneficiaryResponse:
    """Applique les champs fournis à un bénéficiaire existant."""
    repository = BeneficiaryRepository(session)
    beneficiary = await repository.get_by_id(beneficiary_id)
    if beneficiary is None:
        raise BeneficiaryNotFoundError(f"Beneficiary {beneficiary_id} not found")

    changes = data.model_dump(exclude_unset=True)
    return _to_response(await repository.update(beneficiary, **changes))


async def suspend(session: AsyncSession, beneficiary_id: int) -> BeneficiaryResponse:
    """Marque un bénéficiaire comme inactif sans supprimer ses données."""
    repository = BeneficiaryRepository(session)
    beneficiary = await repository.get_by_id(beneficiary_id)
    if beneficiary is None:
        raise BeneficiaryNotFoundError(f"Beneficiary {beneficiary_id} not found")

    return _to_response(await repository.update(beneficiary, is_active=False))
