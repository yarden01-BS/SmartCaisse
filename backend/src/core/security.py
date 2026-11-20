"""Utilitaires de hachage de mots de passe et de JWT partagés par le module d'authentification."""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import bcrypt
import jwt

from .config import settings


def hash_password(password: str) -> str:
    """Hache un mot de passe en clair avec bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Renvoie True lorsque le mot de passe correspond au hachage stocké."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (TypeError, ValueError):
        return False


def create_access_token(
    payload: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Construit un JWT signé de courte durée utilisé pour autoriser les requêtes."""
    data = payload.copy()
    lifetime = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    data["type"] = "access"
    data["jti"] = str(uuid4())
    data["exp"] = datetime.now(UTC) + lifetime
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    payload: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Construit un JWT signé de longue durée avec un identifiant unique utilisé pour la révocation et la rotation."""
    data = payload.copy()
    lifetime = expires_delta or timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    data["type"] = "refresh"
    data["jti"] = str(uuid4())
    data["exp"] = datetime.now(UTC) + lifetime
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Valide la signature et l'expiration d'un JWT d'accès."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def decode_refresh_token(token: str) -> dict[str, Any]:
    """Valide un JWT d'actualisation et exige son type et son identifiant de révocation."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("type") != "refresh" or not payload.get("jti"):
        raise jwt.InvalidTokenError("Not a refresh token")
    return payload
