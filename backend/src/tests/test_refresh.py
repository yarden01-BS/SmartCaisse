"""Tests pour la rotation et la révocation des jetons d'actualisation."""

import asyncio
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)
from src.db.models import AccountType
from src.db.session import get_session
from src.main import app
from src.modules.auth import auth_service
from src.modules.auth.auth_deps import REFRESH_TOKEN_COOKIE
from src.modules.auth.auth_repo import AccountRepository, RevokedTokenRepository
from src.modules.auth.auth_schemas import LoginResponse


@pytest.fixture
def client() -> Iterator[TestClient]:
    async def override_session() -> Any:
        yield object()

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def account(is_active: bool = True) -> SimpleNamespace:
    return SimpleNamespace(id=7, role=AccountType.ADMIN, is_active=is_active)


def login_response(access_token: str) -> LoginResponse:
    return LoginResponse(
        access_token=access_token, account_id=7, role=AccountType.ADMIN
    )


def patch_repos(
    monkeypatch: pytest.MonkeyPatch,
    mocked_account: SimpleNamespace | None = None,
    revoked: bool = False,
    claimed: bool = True,
) -> dict[str, Any]:
    captured: dict[str, Any] = {}

    async def fake_is_revoked(self: Any, jti: str) -> bool:
        captured["checked_jti"] = jti
        return revoked

    async def fake_revoke(self: Any, jti: str, expires_at: datetime) -> bool:
        captured["revoked_jti"] = jti
        captured["expires_at"] = expires_at
        return claimed

    async def fake_get_by_id(self: Any, account_id: int) -> Any:
        captured["account_id"] = account_id
        return mocked_account if mocked_account is not None else account()

    monkeypatch.setattr(RevokedTokenRepository, "is_revoked", fake_is_revoked)
    monkeypatch.setattr(RevokedTokenRepository, "revoke", fake_revoke)
    monkeypatch.setattr(AccountRepository, "get_by_id", fake_get_by_id)
    return captured


def test_refresh_rotates_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = patch_repos(monkeypatch)
    old = create_refresh_token({"sub": "7", "role": "admin"})
    old_payload = decode_refresh_token(old)

    access, refreshed, result = asyncio.run(auth_service.refresh(object(), old))

    assert captured["checked_jti"] == old_payload["jti"]
    assert captured["revoked_jti"] == old_payload["jti"]
    assert captured["account_id"] == 7
    assert isinstance(captured["expires_at"], datetime)
    assert refreshed != old
    assert decode_refresh_token(refreshed)["jti"] != old_payload["jti"]
    assert decode_access_token(result.access_token)["sub"] == "7"
    assert access == result.access_token


def test_refresh_rejects_revoked_token(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = patch_repos(monkeypatch, revoked=True)

    with pytest.raises(auth_service.InvalidRefreshTokenError, match="revoked"):
        asyncio.run(auth_service.refresh(object(), create_refresh_token({"sub": "7"})))

    assert "revoked_jti" not in captured


def test_refresh_rejects_expired_token(monkeypatch: pytest.MonkeyPatch) -> None:
    patch_repos(monkeypatch)
    expired = create_refresh_token({"sub": "7"}, expires_delta=timedelta(seconds=-1))

    with pytest.raises(auth_service.InvalidRefreshTokenError, match="expired"):
        asyncio.run(auth_service.refresh(object(), expired))


def test_refresh_rejects_missing_token(monkeypatch: pytest.MonkeyPatch) -> None:
    patch_repos(monkeypatch)

    with pytest.raises(auth_service.InvalidRefreshTokenError, match="missing"):
        asyncio.run(auth_service.refresh(object(), None))


def test_refresh_rejects_inactive_account(monkeypatch: pytest.MonkeyPatch) -> None:
    patch_repos(monkeypatch, mocked_account=account(is_active=False))

    with pytest.raises(auth_service.InvalidRefreshTokenError, match="inactive"):
        asyncio.run(auth_service.refresh(object(), create_refresh_token({"sub": "7"})))


def test_refresh_rejects_concurrent_reuse(monkeypatch: pytest.MonkeyPatch) -> None:
    patch_repos(monkeypatch, claimed=False)

    with pytest.raises(auth_service.InvalidRefreshTokenError, match="revoked"):
        asyncio.run(auth_service.refresh(object(), create_refresh_token({"sub": "7"})))


def test_refresh_rejects_access_token(monkeypatch: pytest.MonkeyPatch) -> None:
    patch_repos(monkeypatch)

    with pytest.raises(auth_service.InvalidRefreshTokenError):
        asyncio.run(auth_service.refresh(object(), create_access_token({"sub": "7"})))


def test_revoke_stores_the_token_id(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = patch_repos(monkeypatch)
    token = create_refresh_token({"sub": "7"})
    payload = decode_refresh_token(token)

    asyncio.run(auth_service.revoke(object(), token))

    assert captured["revoked_jti"] == payload["jti"]


def test_revoke_ignores_invalid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = patch_repos(monkeypatch)

    asyncio.run(auth_service.revoke(object(), "garbage"))
    asyncio.run(auth_service.revoke(object(), None))

    assert captured == {}


class FakeResult:
    def __init__(self, value: Any) -> None:
        self.value = value

    def scalar_one_or_none(self) -> Any:
        return self.value


class FakeSession:
    def __init__(self, value: Any) -> None:
        self.value = value
        self.statement: Any = None

    async def execute(self, statement: Any) -> FakeResult:
        self.statement = statement
        return FakeResult(self.value)


def test_repo_is_revoked() -> None:
    session = FakeSession(1)
    repository = RevokedTokenRepository(session)  # type: ignore[arg-type]

    assert asyncio.run(repository.is_revoked("jti-1")) is True
    session.value = None
    assert asyncio.run(repository.is_revoked("jti-2")) is False


def test_repo_revoke_is_idempotent() -> None:
    session = FakeSession(1)
    repository = RevokedTokenRepository(session)  # type: ignore[arg-type]
    expires_at = datetime.now(UTC)

    assert asyncio.run(repository.revoke("jti-1", expires_at)) is True
    assert "ON CONFLICT (jti) DO NOTHING" in str(session.statement)
    session.value = None
    assert asyncio.run(repository.revoke("jti-1", expires_at)) is False


def test_refresh_route_returns_new_access_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[str | None] = []

    async def fake_refresh(
        session: Any, token: str | None
    ) -> tuple[str, str, LoginResponse]:
        seen.append(token)
        return "new-access", "new-refresh", login_response("new-access")

    monkeypatch.setattr(auth_service, "refresh", fake_refresh)
    client.cookies.set(REFRESH_TOKEN_COOKIE, "old-refresh")
    response = client.post("/auth/refresh")

    assert response.status_code == 200
    assert response.json()["access_token"] == "new-access"
    assert seen == ["old-refresh"]
    assert f"{REFRESH_TOKEN_COOKIE}=new-refresh" in response.headers["set-cookie"]


def test_refresh_route_rejects_invalid_cookie(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_refresh(session: Any, token: str | None) -> Any:
        raise auth_service.InvalidRefreshTokenError("Refresh token has been revoked")

    monkeypatch.setattr(auth_service, "refresh", fake_refresh)
    response = client.post("/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Refresh token has been revoked"
    assert "set-cookie" not in response.headers
