"""Dépendances FastAPI partagées pour les routes authentifiées."""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.security import decode_access_token
from ...db.models import Account, AccountType
from ...db.session import get_session

REFRESH_TOKEN_COOKIE = "refresh_token"

bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED_HEADERS = {"WWW-Authenticate": "Bearer"}


async def get_current_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(  # noqa: B008
        bearer_scheme
    ),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, str]:
    """Valide le jeton d'accès bearer et renvoie ses revendications."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers=_UNAUTHORIZED_HEADERS,
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers=_UNAUTHORIZED_HEADERS,
        ) from exc

    account_id = payload.get("sub")
    if not account_id or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers=_UNAUTHORIZED_HEADERS,
        )

    # Vérifie que le compte existe et n'est pas suspendu (si la session le permet).
    if hasattr(session, "execute"):
        result = await session.execute(
            select(Account).where(Account.id == int(account_id))
        )
        account = result.scalars().first()
        if account is None or not account.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended or not found",
            )

    return {"account_id": str(account_id), "role": str(payload.get("role", ""))}


async def get_current_account_id(
    current: dict[str, str] = Depends(get_current_account),  # noqa: B008
) -> int:
    """Renvoie l'identifiant du compte authentifié sous forme d'entier."""
    try:
        return int(current["account_id"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers=_UNAUTHORIZED_HEADERS,
        ) from exc


async def require_admin(
    current: dict[str, str] = Depends(get_current_account),  # noqa: B008
) -> dict[str, str]:
    """Exige un compte authentifié avec le rôle administrateur."""
    if current.get("role") != AccountType.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current


async def require_cashier(
    current: dict[str, str] = Depends(get_current_account),  # noqa: B008
) -> dict[str, str]:
    """Exige un compte authentifié avec le rôle caissier."""
    if current.get("role") != AccountType.CASHIER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cashier access required",
        )
    return current
