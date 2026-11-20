"""Password hashing and JWT helpers shared by the auth module."""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import bcrypt
import jwt

from .config import settings


def hash_password(password: str) -> str:
    """Hash a plain password with bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Return True when the password matches the stored hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (TypeError, ValueError):
        return False


def create_access_token(
    payload: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Build a short-lived signed JWT used to authorize requests."""
    data = payload.copy()
    lifetime = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    data["type"] = "access"
    data["jti"] = str(uuid4())
    data["exp"] = datetime.now(UTC) + lifetime
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    payload: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Build a long-lived signed JWT with a unique id used for revocation and rotation."""
    data = payload.copy()
    lifetime = expires_delta or timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    data["type"] = "refresh"
    data["jti"] = str(uuid4())
    data["exp"] = datetime.now(UTC) + lifetime
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Validate the signature and expiration of an access JWT."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def decode_refresh_token(token: str) -> dict[str, Any]:
    """Validate a refresh JWT and require its type and revocation id."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("type") != "refresh" or not payload.get("jti"):
        raise jwt.InvalidTokenError("Not a refresh token")
    return payload
