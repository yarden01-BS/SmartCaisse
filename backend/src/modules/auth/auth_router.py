"""Routes HTTP pour l'authentification."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...db.session import get_session
from . import auth_service
from .auth_deps import REFRESH_TOKEN_COOKIE, get_current_account
from .auth_schemas import LoginRequest, LoginResponse

__all__ = ["get_current_account", "login", "logout", "refresh", "router"]

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_token_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> LoginResponse:
    """Authentifie un compte et définit le cookie de rafraîchissement."""
    try:
        access_token, refresh_token, result = await auth_service.authenticate(
            session, credentials
        )
    except auth_service.InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    _set_refresh_token_cookie(response, refresh_token)
    return result.model_copy(update={"access_token": access_token})


@router.post("/refresh", response_model=LoginResponse)
async def refresh(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> LoginResponse:
    """Fait tourner le cookie d'actualisation et renvoie un nouveau jeton d'accès."""
    token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    try:
        access_token, refresh_token, result = await auth_service.refresh(session, token)
    except auth_service.InvalidRefreshTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    _set_refresh_token_cookie(response, refresh_token)
    return result.model_copy(update={"access_token": access_token})


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict[str, str]:
    """Révoque le cookie d'actualisation et le supprime du navigateur."""
    await auth_service.revoke(session, request.cookies.get(REFRESH_TOKEN_COOKIE))
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path="/",
        secure=settings.COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )
    return {"detail": "Logged out"}
