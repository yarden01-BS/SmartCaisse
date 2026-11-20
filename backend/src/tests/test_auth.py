"""Tests pour l'authentification des comptes."""

import asyncio
from collections.abc import Iterator
from datetime import timedelta
from typing import Any

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from src.core.config import settings
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from src.db.models import AccountType
from src.db.session import get_session
from src.main import app
from src.modules.auth import auth_service
from src.modules.auth.auth_deps import (
    REFRESH_TOKEN_COOKIE,
    get_current_account,
    require_admin,
)
from src.modules.auth.auth_schemas import LoginResponse


@pytest.fixture
def client() -> Iterator[TestClient]:
    async def override_session() -> Any:
        yield object()

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def login_response(
    account_id: int = 7, role: AccountType = AccountType.CASHIER
) -> LoginResponse:
    return LoginResponse(
        access_token=create_access_token({"sub": str(account_id), "role": role.value}),
        account_id=account_id,
        role=role,
    )


def test_password_hashing_round_trip() -> None:
    hashed = hash_password("s3cret")

    assert hashed != "s3cret"
    assert verify_password("s3cret", hashed)
    assert not verify_password("wrong", hashed)
    assert not verify_password("s3cret", "not-a-hash")


def test_access_token_round_trip() -> None:
    token = create_access_token({"sub": "7", "role": "admin"})
    payload = decode_access_token(token)

    assert payload["sub"] == "7"
    assert payload["role"] == "admin"
    assert payload["type"] == "access"
    assert "exp" in payload


def test_access_tokens_are_unique() -> None:
    payload = {"sub": "7", "role": "admin"}

    assert create_access_token(payload) != create_access_token(payload)


def test_expired_access_token_is_rejected() -> None:
    token = create_access_token({"sub": "7"}, expires_delta=timedelta(seconds=-1))

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_refresh_token_round_trip() -> None:
    token = create_refresh_token({"sub": "7", "role": "admin"})
    payload = decode_refresh_token(token)

    assert payload["sub"] == "7"
    assert payload["role"] == "admin"
    assert payload["type"] == "refresh"
    assert payload["jti"]
    assert "exp" in payload


def test_expired_refresh_token_is_rejected() -> None:
    token = create_refresh_token({"sub": "7"}, expires_delta=timedelta(seconds=-1))

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_refresh_token(token)


def test_access_token_is_not_a_refresh_token() -> None:
    token = create_access_token({"sub": "7"})

    with pytest.raises(jwt.InvalidTokenError):
        decode_refresh_token(token)


def test_login_returns_access_token_in_json(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_authenticate(
        session: Any, credentials: Any
    ) -> tuple[str, str, LoginResponse]:
        return "signed-access", "signed-refresh", login_response()

    monkeypatch.setattr(auth_service, "authenticate", fake_authenticate)
    response = client.post(
        "/auth/login",
        json={"email": "cashier@smartcaisse.com", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "signed-access",
        "token_type": "bearer",
        "account_id": 7,
        "role": "cashier",
    }
    assert "refresh_token" not in response.json()


def test_login_sets_httponly_refresh_cookie(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_authenticate(
        session: Any, credentials: Any
    ) -> tuple[str, str, LoginResponse]:
        return "signed-access", "signed-refresh", login_response()

    monkeypatch.setattr(auth_service, "authenticate", fake_authenticate)
    response = client.post(
        "/auth/login",
        json={"email": "cashier@smartcaisse.com", "password": "password123"},
    )

    cookie_header = response.headers["set-cookie"].lower()
    assert f"{REFRESH_TOKEN_COOKIE}=signed-refresh" in cookie_header
    assert "access_token=" not in cookie_header
    assert "httponly" in cookie_header
    assert "samesite=lax" in cookie_header
    assert f"max-age={settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60}" in cookie_header
    assert ("secure" in cookie_header) is settings.COOKIE_SECURE


def test_login_rejects_invalid_credentials(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_authenticate(
        session: Any, credentials: Any
    ) -> tuple[str, str, LoginResponse]:
        raise auth_service.InvalidCredentialsError("Invalid email or password")

    monkeypatch.setattr(auth_service, "authenticate", fake_authenticate)
    response = client.post(
        "/auth/login",
        json={"email": "admin@smartcaisse.com", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    assert response.headers["www-authenticate"] == "Bearer"
    assert "set-cookie" not in response.headers


def test_login_validates_email(client: TestClient) -> None:
    response = client.post(
        "/auth/login", json={"email": "not-an-email", "password": "password123"}
    )

    assert response.status_code == 422


def test_logout_revokes_and_clears_refresh_cookie(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[str | None] = []

    async def fake_revoke(session: Any, token: str | None) -> None:
        seen.append(token)

    monkeypatch.setattr(auth_service, "revoke", fake_revoke)
    client.cookies.set(REFRESH_TOKEN_COOKIE, "signed-refresh")
    response = client.post("/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"detail": "Logged out"}
    assert seen == ["signed-refresh"]
    cookie_header = response.headers["set-cookie"].lower()
    assert f"{REFRESH_TOKEN_COOKIE}=" in cookie_header
    assert "max-age=0" in cookie_header


def test_logout_without_cookie_still_succeeds(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[str | None] = []

    async def fake_revoke(session: Any, token: str | None) -> None:
        seen.append(token)

    monkeypatch.setattr(auth_service, "revoke", fake_revoke)
    response = client.post("/auth/logout")

    assert response.status_code == 200
    assert seen == [None]


def test_get_current_account_accepts_valid_bearer_token() -> None:
    token = create_access_token({"sub": "3", "role": "admin"})
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    assert asyncio.run(get_current_account(credentials)) == {
        "account_id": "3",
        "role": "admin",
    }


def test_get_current_account_without_token_is_unauthorized() -> None:
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_account(None))

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Not authenticated"


def test_get_current_account_rejects_invalid_token() -> None:
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="garbage")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_account(credentials))

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_get_current_account_rejects_refresh_token() -> None:
    token = create_refresh_token({"sub": "3", "role": "admin"})
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_account(credentials))

    assert exc_info.value.status_code == 401


def test_require_admin_checks_the_role_claim() -> None:
    admin = {"account_id": "1", "role": "admin"}
    cashier = {"account_id": "2", "role": "cashier"}

    assert asyncio.run(require_admin(admin)) == admin
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_admin(cashier))

    assert exc_info.value.status_code == 403
