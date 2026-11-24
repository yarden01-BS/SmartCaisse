"""Routes HTTP pour l'administration des comptes utilisateurs."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ..auth.auth_deps import require_admin
from . import admin_service
from .admin_schemas import AccountCreate, AccountResponse, AccountUpdate

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


def _email_conflict(exc: admin_service.EmailAlreadyExistsError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


def _not_found(exc: admin_service.AccountNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/accounts", response_model=list[AccountResponse])
async def list_accounts(
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> list[AccountResponse]:
    """Liste tous les comptes avec le nom de leur propriétaire."""
    return await admin_service.list_all(session)


@router.post(
    "/accounts", response_model=AccountResponse, status_code=status.HTTP_201_CREATED
)
async def create_account(
    data: AccountCreate,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> AccountResponse:
    """Crée un compte caissier ou administrateur."""
    try:
        return await admin_service.create(session, data)
    except admin_service.EmailAlreadyExistsError as exc:
        raise _email_conflict(exc) from exc


@router.patch("/accounts/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: int,
    data: AccountUpdate,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> AccountResponse:
    """Met à jour un compte existant."""
    try:
        return await admin_service.update(session, account_id, data)
    except admin_service.AccountNotFoundError as exc:
        raise _not_found(exc) from exc
    except admin_service.EmailAlreadyExistsError as exc:
        raise _email_conflict(exc) from exc


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: int,
    current: dict[str, str] = Depends(require_admin),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> None:
    """Supprime un compte, sauf celui de l'administrateur connecté."""
    if int(current["account_id"]) == account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )
    try:
        await admin_service.remove(session, account_id)
    except admin_service.AccountNotFoundError as exc:
        raise _not_found(exc) from exc
