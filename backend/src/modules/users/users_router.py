"""Routes HTTP pour l'utilisateur authentifié."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ..auth.auth_deps import get_current_account_id
from . import users_service
from .users_schemas import UserProfileResponse

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    account_id: int = Depends(get_current_account_id),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> UserProfileResponse:
    """Renvoie le profil du compte auquel appartient le jeton d'accès."""
    try:
        return await users_service.get_profile(session, account_id)
    except users_service.AccountNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
