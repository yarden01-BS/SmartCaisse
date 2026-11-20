"""Tests pour le point d'accès au profil de l'utilisateur authentifié."""

import asyncio
from collections.abc import Iterator
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.core.security import create_access_token
from src.db.models import AccountType, Situation
from src.db.session import get_session
from src.main import app
from src.modules.auth import auth_service
from src.modules.auth.auth_deps import REFRESH_TOKEN_COOKIE
from src.modules.auth.auth_schemas import LoginResponse
from src.modules.users import users_service
from src.modules.users.users_repo import UserRepository
from src.modules.users.users_schemas import (
    BeneficiaryProfile,
    CashierProfile,
    UserProfileResponse,
)


@pytest.fixture
def client() -> Iterator[TestClient]:
    async def override_session() -> Any:
        yield object()

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_me_uses_account_id_from_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[int] = []

    async def fake_get_profile(session: Any, account_id: int) -> UserProfileResponse:
        seen.append(account_id)
        return UserProfileResponse(
            account_id=account_id,
            email="donaldgarcia@example.net",
            role=AccountType.ADMIN,
            is_active=True,
            profile=BeneficiaryProfile(
                id=1,
                first_name="Donald",
                last_name="Garcia",
                profession="Engineer",
                situation=Situation.PERMANENT,
                is_active=True,
            ),
        )

    monkeypatch.setattr(users_service, "get_profile", fake_get_profile)
    token = create_access_token({"sub": "42", "role": "admin"})
    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert seen == [42]
    body = response.json()
    assert body["account_id"] == 42
    assert body["role"] == "admin"
    assert body["profile"]["first_name"] == "Donald"
    assert body["profile"]["situation"] == "permanent"


def test_me_without_token_is_unauthorized(client: TestClient) -> None:
    response = client.get("/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_with_invalid_token_is_unauthorized(client: TestClient) -> None:
    response = client.get("/me", headers={"Authorization": "Bearer garbage"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"


def test_me_maps_missing_account_to_unauthorized(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_get_profile(session: Any, account_id: int) -> UserProfileResponse:
        raise users_service.AccountNotFoundError("Account not found or inactive")

    monkeypatch.setattr(users_service, "get_profile", fake_get_profile)
    token = create_access_token({"sub": "99", "role": "admin"})
    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Account not found or inactive"


def test_get_profile_maps_beneficiary_account(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account = SimpleNamespace(
        id=7,
        email="beneficiary@example.com",
        role=AccountType.ADMIN,
        is_active=True,
        beneficiary=SimpleNamespace(
            id=3,
            first_name="Jane",
            last_name="Doe",
            profession="Teacher",
            situation=Situation.PERMANENT,
            is_active=True,
        ),
        cashier=None,
    )

    async def fake_get_with_profile(self: Any, account_id: int) -> Any:
        assert account_id == 7
        return account

    monkeypatch.setattr(UserRepository, "get_with_profile", fake_get_with_profile)

    result = asyncio.run(users_service.get_profile(object(), 7))

    assert result.account_id == 7
    assert isinstance(result.profile, BeneficiaryProfile)
    assert result.profile.first_name == "Jane"


def test_get_profile_maps_cashier_account(monkeypatch: pytest.MonkeyPatch) -> None:
    account = SimpleNamespace(
        id=8,
        email="cashier@example.com",
        role=AccountType.CASHIER,
        is_active=True,
        beneficiary=None,
        cashier=SimpleNamespace(
            id=4,
            first_name="John",
            last_name="Smith",
            company="SmartCaisse",
            is_active=True,
        ),
    )

    async def fake_get_with_profile(self: Any, account_id: int) -> Any:
        return account

    monkeypatch.setattr(UserRepository, "get_with_profile", fake_get_with_profile)

    result = asyncio.run(users_service.get_profile(object(), 8))

    assert result.role is AccountType.CASHIER
    assert isinstance(result.profile, CashierProfile)
    assert result.profile.company == "SmartCaisse"


def test_get_profile_rejects_inactive_account(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_get_with_profile(self: Any, account_id: int) -> Any:
        return SimpleNamespace(
            id=9,
            email="inactive@example.com",
            role=AccountType.ADMIN,
            is_active=False,
            beneficiary=None,
            cashier=None,
        )

    monkeypatch.setattr(UserRepository, "get_with_profile", fake_get_with_profile)

    with pytest.raises(users_service.AccountNotFoundError):
        asyncio.run(users_service.get_profile(object(), 9))


def test_me_does_not_accept_refresh_cookie(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[int] = []

    async def fake_get_profile(session: Any, account_id: int) -> UserProfileResponse:
        seen.append(account_id)
        return UserProfileResponse(
            account_id=account_id,
            email="cashier@smartcaisse.com",
            role=AccountType.CASHIER,
            is_active=True,
        )

    monkeypatch.setattr(users_service, "get_profile", fake_get_profile)
    token = create_access_token({"sub": "11", "role": "cashier"})
    client.cookies.set(REFRESH_TOKEN_COOKIE, token)

    response = client.get("/me")

    assert response.status_code == 401
    assert seen == []


def test_login_access_token_is_used_by_me(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[int] = []
    access_token = create_access_token({"sub": "12", "role": "cashier"})

    async def fake_authenticate(
        session: Any, credentials: Any
    ) -> tuple[str, str, LoginResponse]:
        return (
            access_token,
            "signed-refresh",
            LoginResponse(
                access_token=access_token,
                account_id=12,
                role=AccountType.CASHIER,
            ),
        )

    async def fake_get_profile(session: Any, account_id: int) -> UserProfileResponse:
        seen.append(account_id)
        return UserProfileResponse(
            account_id=account_id,
            email="cashier@smartcaisse.com",
            role=AccountType.CASHIER,
            is_active=True,
        )

    monkeypatch.setattr(auth_service, "authenticate", fake_authenticate)
    monkeypatch.setattr(users_service, "get_profile", fake_get_profile)

    login = client.post(
        "/auth/login",
        json={"email": "cashier@smartcaisse.com", "password": "password123"},
    )
    me = client.get(
        "/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"}
    )

    assert login.status_code == 200
    assert REFRESH_TOKEN_COOKIE in login.cookies
    assert "refresh_token" not in login.json()
    assert me.status_code == 200
    assert seen == [12]
