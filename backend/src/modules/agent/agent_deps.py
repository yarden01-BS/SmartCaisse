"""Dépendances pour l'authentification de l'agent local."""

import hmac

from fastapi import Header, HTTPException, status

from ...core.config import settings


async def require_agent_key(x_agent_key: str | None = Header(default=None)) -> None:
    if x_agent_key is None or not hmac.compare_digest(
        x_agent_key, settings.AGENT_API_KEY
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid agent key",
        )