"""Tests for account authentication."""

import asyncio
from collections.abc import Iterator
from datetime import timedelta
from typing import Any

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from starlette.requests import Request

from src.core.config import settings
from src.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from src.db.models import AccountType
from src.db.session import get_session
from src.main import app
from src.modules.auth import auth_service
from src.modules.auth.auth_deps import ACCESS_TOKEN_COOKIE, get_current_account
from src.modules.auth.auth_schemas import LoginResponse


def make_request(cookie_token: str | None = None) -> Request:
    headers: list[tuple[bytes, bytes]] = []
    if cookie_token:
        headers.append((b"cookie", f"{ACCESS_TOKEN_COOKIE}={cookie_token}".encode()))
    return Request({"type": "http", "headers": headers, "method": "GET", "path": "/"})


@pytest.fixture
def client() -> Iterator[TestClient]:
    async def override_session() -> Any:
        yield object()

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


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
    assert "exp" in payload


def test_expired_token_is_rejected() -> None:
    token = create_access_token({"sub": "7"}, expires_delta=timedelta(seconds=-1))

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_login_returns_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_authenticate(
        session: Any, credentials: Any
    ) -> tuple[str, LoginResponse]:
        return "signed-token", LoginResponse(
            account_id=7,
            role=AccountType.CASHIER,
        )

    monkeypatch.setattr(auth_service, "authenticate", fake_authenticate)
    response = client.post(
        "/auth/login",
        json={"email": "cashier@smartcaisse.com", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "token_type": "bearer",
        "account_id": 7,
        "role": "cashier",
    }
    assert "access_token" not in response.json()


def test_login_sets_httponly_cookie(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_authenticate(
        session: Any, credentials: Any
    ) -> tuple[str, LoginResponse]:
        return "signed-token", LoginResponse(
            account_id=7,
            role=AccountType.CASHIER,
        )

    monkeypatch.setattr(auth_service, "authenticate", fake_authenticate)
    response = client.post(
        "/auth/login",
        json={"email": "cashier@smartcaisse.com", "password": "password123"},
    )

    cookie_header = response.headers["set-cookie"].lower()
    assert f"{ACCESS_TOKEN_COOKIE}=signed-token" in cookie_header
    assert "httponly" in cookie_header
    assert "samesite=lax" in cookie_header
    assert f"max-age={settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60}" in cookie_header
    assert ("secure" in cookie_header) is settings.COOKIE_SECURE


def test_login_rejects_invalid_credentials(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_authenticate(
        session: Any, credentials: Any
    ) -> tuple[str, LoginResponse]:
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


def test_logout_clears_cookie(client: TestClient) -> None:
    response = client.post("/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"detail": "Logged out"}
    cookie_header = response.headers["set-cookie"].lower()
    assert f"{ACCESS_TOKEN_COOKIE}=" in cookie_header
    assert "max-age=0" in cookie_header


def test_get_current_account_accepts_valid_bearer_token() -> None:
    token = create_access_token({"sub": "3", "role": "admin"})
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    assert asyncio.run(get_current_account(make_request(), credentials)) == {
        "account_id": "3",
        "role": "admin",
    }


def test_get_current_account_reads_cookie() -> None:
    token = create_access_token({"sub": "5", "role": "cashier"})

    assert asyncio.run(get_current_account(make_request(token), None)) == {
        "account_id": "5",
        "role": "cashier",
    }


def test_get_current_account_without_token_is_unauthorized() -> None:
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_account(make_request(), None))

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Not authenticated"


def test_get_current_account_rejects_invalid_token() -> None:
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="garbage")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_account(make_request(), credentials))

    assert exc_info.value.status_code == 401
