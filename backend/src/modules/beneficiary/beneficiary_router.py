"""Routes HTTP pour l'administration des bénéficiaires (administrateurs uniquement)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ..auth.auth_deps import require_admin
from . import beneficiary_service
from .beneficiary_schemas import (
    BeneficiaryCreate,
    BeneficiaryResponse,
    BeneficiarySort,
    BeneficiaryUpdate,
)

router = APIRouter(
    prefix="/beneficiaries",
    tags=["beneficiaries"],
    dependencies=[Depends(require_admin)],
)


def _not_found(exc: beneficiary_service.BeneficiaryNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("", response_model=list[BeneficiaryResponse])
async def list_beneficiaries(
    sort: BeneficiarySort = "recent",
    is_active: bool | None = None,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> list[BeneficiaryResponse]:
    """Liste les employés, les plus anciens/récents en premier et filtrés par statut."""
    return await beneficiary_service.list_all(session, sort, is_active)


@router.post(
    "", response_model=BeneficiaryResponse, status_code=status.HTTP_201_CREATED
)
async def create_beneficiary(
    data: BeneficiaryCreate,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> BeneficiaryResponse:
    """Crée un bénéficiaire."""
    try:
        return await beneficiary_service.create(session, data)
    except beneficiary_service.MatriculeAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


@router.patch("/{beneficiary_id}", response_model=BeneficiaryResponse)
async def update_beneficiary(
    beneficiary_id: int,
    data: BeneficiaryUpdate,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> BeneficiaryResponse:
    """Met à jour les champs fournis d'un bénéficiaire."""
    try:
        return await beneficiary_service.update(session, beneficiary_id, data)
    except beneficiary_service.BeneficiaryNotFoundError as exc:
        raise _not_found(exc) from exc


@router.post("/{beneficiary_id}/suspend", response_model=BeneficiaryResponse)
async def suspend_beneficiary(
    beneficiary_id: int,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> BeneficiaryResponse:
    """Suspend un bénéficiaire en passant is_active à false."""
    try:
        return await beneficiary_service.suspend(session, beneficiary_id)
    except beneficiary_service.BeneficiaryNotFoundError as exc:
        raise _not_found(exc) from exc


@router.delete("/{beneficiary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_beneficiary(
    beneficiary_id: int,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> None:
    """Supprime un bénéficiaire et ses données associées."""
    try:
        await beneficiary_service.remove_cascade(session, beneficiary_id)
    except beneficiary_service.BeneficiaryNotFoundError as exc:
        raise _not_found(exc) from exc
