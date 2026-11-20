"""Logique métier pour le profil de l'utilisateur authentifié."""

from sqlalchemy.ext.asyncio import AsyncSession

from ...db.models import Account
from .users_repo import UserRepository
from .users_schemas import BeneficiaryProfile, CashierProfile, UserProfileResponse


class AccountNotFoundError(Exception):
    """Levée lorsque le jeton pointe vers un compte supprimé ou inactif."""


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
    """Renvoie le profil appartenant au compte authentifié donné."""
    account = await UserRepository(session).get_with_profile(account_id)

    if account is None or not account.is_active:
        raise AccountNotFoundError("Account not found or inactive")

    return _to_response(account)
