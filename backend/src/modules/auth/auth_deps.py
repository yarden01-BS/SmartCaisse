"""Shared FastAPI dependencies for authenticated routes."""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ...core.security import decode_access_token
from ...db.models import AccountType

REFRESH_TOKEN_COOKIE = "refresh_token"

bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED_HEADERS = {"WWW-Authenticate": "Bearer"}


async def get_current_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(  # noqa: B008
        bearer_scheme
    ),
) -> dict[str, str]:
    """Validate the bearer access token and return its claims."""
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

    return {"account_id": str(account_id), "role": str(payload.get("role", ""))}


async def get_current_account_id(
    current: dict[str, str] = Depends(get_current_account),  # noqa: B008
) -> int:
    """Return the authenticated account id as an integer."""
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
    """Require an authenticated account with the admin role."""
    if current.get("role") != AccountType.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current


async def require_cashier(
    current: dict[str, str] = Depends(get_current_account),  # noqa: B008
) -> dict[str, str]:
    """Require an authenticated account with the cashier role."""
    if current.get("role") != AccountType.CASHIER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cashier access required",
        )
    return current
