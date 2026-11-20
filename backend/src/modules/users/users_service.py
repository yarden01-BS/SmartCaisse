"""Business logic for the authenticated user's profile."""

from sqlalchemy.ext.asyncio import AsyncSession

from ...db.models import Account
from .users_repo import UserRepository
from .users_schemas import BeneficiaryProfile, CashierProfile, UserProfileResponse


class AccountNotFoundError(Exception):
    """Raised when the token points at an account that is gone or inactive."""


def _to_response(account: Account) -> UserProfileResponse:
    profile: BeneficiaryProfile | CashierProfile | None = None
    if account.beneficiary is not None:
        profile = BeneficiaryProfile.model_validate(account.beneficiary)
    elif account.cashier is not None:
        profile = CashierProfile.model_validate(account.cashier)

    return UserProfileResponse(
        account_id=account.id,
        email=account.email,
        role=account.role,
        is_active=account.is_active,
        profile=profile,
    )


async def get_profile(session: AsyncSession, account_id: int) -> UserProfileResponse:
    """Return the profile belonging to the given authenticated account."""
    account = await UserRepository(session).get_with_profile(account_id)

    if account is None or not account.is_active:
        raise AccountNotFoundError("Account not found or inactive")

    return _to_response(account)
