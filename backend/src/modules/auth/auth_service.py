"""Business logic for account authentication and refresh-token rotation."""

from datetime import UTC, datetime
from typing import Any

import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    verify_password,
)
from ...db.models import Account
from .auth_repo import AccountRepository, RevokedTokenRepository
from .auth_schemas import LoginRequest, LoginResponse


class InvalidCredentialsError(Exception):
    """Raised when the email/password pair does not match an active account."""


class InvalidRefreshTokenError(Exception):
    """Raised when a refresh token is missing, invalid, expired, or revoked."""


def _claims(account: Account) -> dict[str, str]:
    return {"sub": str(account.id), "role": account.role.value}


def _login_response(account: Account, access_token: str) -> LoginResponse:
    return LoginResponse(
        access_token=access_token,
        account_id=account.id,
        role=account.role,
    )


async def _issue_tokens(account: Account) -> tuple[str, str, LoginResponse]:
    claims = _claims(account)
    access_token = create_access_token(claims)
    refresh_token = create_refresh_token(claims)
    return access_token, refresh_token, _login_response(account, access_token)


async def authenticate(
    session: AsyncSession, credentials: LoginRequest
) -> tuple[str, str, LoginResponse]:
    """Check credentials and return a new access/refresh token pair."""
    account = await AccountRepository(session).get_by_email(credentials.email)

    if (
        account is None
        or not account.is_active
        or not verify_password(credentials.password, account.password_hash)
    ):
        raise InvalidCredentialsError("Invalid email or password")

    return await _issue_tokens(account)


def _refresh_payload(token: str) -> dict[str, Any]:
    try:
        payload = decode_refresh_token(token)
        payload["_expires_at"] = datetime.fromtimestamp(payload["exp"], UTC)
        int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise InvalidRefreshTokenError("Invalid or expired refresh token") from exc
    return payload


async def refresh(
    session: AsyncSession, token: str | None
) -> tuple[str, str, LoginResponse]:
    """Rotate a valid refresh token and return a new token pair."""
    if not token:
        raise InvalidRefreshTokenError("Refresh token missing")

    payload = _refresh_payload(token)
    jti = payload["jti"]
    revoked = RevokedTokenRepository(session)
    if await revoked.is_revoked(jti):
        raise InvalidRefreshTokenError("Refresh token has been revoked")

    account = await AccountRepository(session).get_by_id(int(payload["sub"]))
    if account is None or not account.is_active:
        raise InvalidRefreshTokenError("Account not found or inactive")

    # Claim the old id before issuing its replacement so it cannot be reused.
    if not await revoked.revoke(jti, payload["_expires_at"]):
        raise InvalidRefreshTokenError("Refresh token has been revoked")

    return await _issue_tokens(account)


async def revoke(session: AsyncSession, token: str | None) -> None:
    """Revoke the refresh token held in the cookie; invalid tokens are ignored."""
    if not token:
        return

    try:
        payload = _refresh_payload(token)
    except InvalidRefreshTokenError:
        return

    await RevokedTokenRepository(session).revoke(payload["jti"], payload["_expires_at"])
