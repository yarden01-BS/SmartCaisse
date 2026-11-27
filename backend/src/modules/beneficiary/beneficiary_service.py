"""Logique métier pour l'administration des bénéficiaires."""

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import UTC, datetime, timedelta

from ...core.config import settings
from ...db.models import (
    Account,
    Beneficiary,
    FingerStatus,
    PurchaseOrder,
    Transaction,
)
from .beneficiary_repo import BeneficiaryRepository
from .beneficiary_schemas import (
    BeneficiaryCreate,
    BeneficiaryResponse,
    BeneficiarySort,
    BeneficiaryUpdate,
)


class BeneficiaryNotFoundError(Exception):
    """Levée lorsqu'aucun bénéficiaire ne correspond à l'identifiant demandé."""


class MatriculeAlreadyExistsError(Exception):
    """Levée lorsque le matricule est déjà attribué à un autre bénéficiaire."""


class EnrollmentConflictError(Exception):
    """Levée lorsqu'une autre ressource est déjà en cours d'enrôlement."""


def _to_response(beneficiary: Beneficiary) -> BeneficiaryResponse:
    return BeneficiaryResponse.model_validate(beneficiary)


async def create(session: AsyncSession, data: BeneficiaryCreate) -> BeneficiaryResponse:
    """Crée un nouveau bénéficiaire actif."""
    repository = BeneficiaryRepository(session)
    matricule = data.matricule.strip().upper() if data.matricule else None
    if matricule is None:
        matricule = await repository.next_matricule()
    elif await repository.get_by_matricule(matricule) is not None:
        raise MatriculeAlreadyExistsError(
            f"Matricule {matricule} is already in use"
        )

    beneficiary = Beneficiary(
        first_name=data.first_name,
        last_name=data.last_name,
        matricule=matricule,
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


async def remove_cascade(session: AsyncSession, beneficiary_id: int) -> None:
    """Supprime un bénéficiaire et toutes les données qui lui sont rattachées."""
    repository = BeneficiaryRepository(session)
    beneficiary = await repository.get_by_id(beneficiary_id)
    if beneficiary is None:
        raise BeneficiaryNotFoundError(f"Beneficiary {beneficiary_id} not found")

    commandes = (
        await session.execute(
            select(PurchaseOrder.id).where(
                PurchaseOrder.beneficiary_id == beneficiary_id
            )
        )
    ).scalars().all()
    if commandes:
        await session.execute(
            delete(Transaction).where(Transaction.purchase_order_id.in_(commandes))
        )
        await session.execute(
            delete(PurchaseOrder).where(PurchaseOrder.id.in_(commandes))
        )

    await session.execute(
        delete(Account).where(Account.beneficiary_id == beneficiary_id)
    )
    await session.delete(beneficiary)
    await session.flush()


async def _has_enrolling_resource(
    session: AsyncSession,
    exclude_beneficiary_id: int | None = None,
    exclude_transaction_id: int | None = None,
) -> bool:
    stmt = select(Beneficiary.id).where(
        Beneficiary.finger_status == FingerStatus.ENROLLING
    )
    if exclude_beneficiary_id is not None:
        stmt = stmt.where(Beneficiary.id != exclude_beneficiary_id)
    result = await session.execute(stmt)
    if result.scalars().first() is not None:
        return True

    stmt = select(Transaction.id).where(Transaction.finger_status == FingerStatus.ENROLLING)
    if exclude_transaction_id is not None:
        stmt = stmt.where(Transaction.id != exclude_transaction_id)
    result = await session.execute(stmt)
    return result.scalars().first() is not None


async def start_enrollment(
    session: AsyncSession, beneficiary_id: int
) -> BeneficiaryResponse:
    beneficiary = await BeneficiaryRepository(session).get_by_id(beneficiary_id)
    if beneficiary is None:
        raise BeneficiaryNotFoundError(f"Beneficiary {beneficiary_id} not found")
    if await _has_enrolling_resource(session, exclude_beneficiary_id=beneficiary_id):
        raise EnrollmentConflictError("Another resource is already enrolling")
    beneficiary.finger_status = FingerStatus.ENROLLING
    beneficiary.enroll_expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.ENROLL_EXPIRES_MINUTES
    )
    await session.flush()
    return _to_response(beneficiary)


async def cancel_enrollment(
    session: AsyncSession, beneficiary_id: int
) -> BeneficiaryResponse:
    beneficiary = await BeneficiaryRepository(session).get_by_id(beneficiary_id)
    if beneficiary is None:
        raise BeneficiaryNotFoundError(f"Beneficiary {beneficiary_id} not found")
    beneficiary.finger_status = FingerStatus.FINGER_PENDING
    beneficiary.enroll_expires_at = None
    await session.flush()
    return _to_response(beneficiary)
