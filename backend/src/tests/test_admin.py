"""Tests pour l'administration des comptes via l'API."""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.core.security import create_access_token
from src.db.models import AccountType
from src.db.session import get_session
from src.main import app
from src.modules.admin import admin_service
from src.modules.admin.admin_schemas import AccountResponse


def auth_headers(role: str, account_id: int = 1) -> dict[str, str]:
    token = create_access_token({"sub": str(account_id), "role": role})
    return {"Authorization": f"Bearer {token}"}


def sample_account(**changes: Any) -> AccountResponse:
    values: dict[str, Any] = {
        "id": 2,
        "email": "nadia@siat.cg",
        "role": AccountType.CASHIER,
        "is_active": True,
        "nom": "Nadia Malonga",
        "prenom": "Nadia",
    }
    values.update(changes)
    return AccountResponse(**values)


@pytest.fixture
def client() -> Iterator[TestClient]:
    async def override_session() -> Any:
        yield object()

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_admin_routes_require_admin(client: TestClient) -> None:
    assert client.get("/admin/accounts").status_code == 401
    reponse = client.get("/admin/accounts", headers=auth_headers("cashier"))
    assert reponse.status_code == 403


def test_list_accounts(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_list_all(session: Any) -> list[AccountResponse]:
        return [sample_account(), sample_account(id=3, email="admin@siat.cg")]

    monkeypatch.setattr(admin_service, "list_all", fake_list_all)
    response = client.get("/admin/accounts", headers=auth_headers("admin"))

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [2, 3]
    assert response.json()[0]["role"] == "cashier"


def test_create_account(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: dict[str, Any] = {}

    async def fake_create(session: Any, data: Any) -> AccountResponse:
        received["data"] = data
        return sample_account()

    monkeypatch.setattr(admin_service, "create", fake_create)
    response = client.post(
        "/admin/accounts",
        headers=auth_headers("admin"),
        json={
            "nom": "Nadia Malonga",
            "email": "nadia@siat.cg",
            "password": "secret",
            "role": "cashier",
            "is_active": True,
        },
    )

    assert response.status_code == 201
    assert response.json()["nom"] == "Nadia Malonga"
    assert received["data"].role == "cashier"


def test_create_account_conflict(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_create(session: Any, data: Any) -> AccountResponse:
        raise admin_service.EmailAlreadyExistsError("Email already in use")

    monkeypatch.setattr(admin_service, "create", fake_create)
    response = client.post(
        "/admin/accounts",
        headers=auth_headers("admin"),
        json={
            "nom": "Nadia Malonga",
            "email": "nadia@siat.cg",
            "password": "secret",
            "role": "cashier",
        },
    )

    assert response.status_code == 409


def test_update_account(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: dict[str, Any] = {}

    async def fake_update(session: Any, account_id: int, data: Any) -> AccountResponse:
        received.update(id=account_id, data=data)
        return sample_account(is_active=False)

    monkeypatch.setattr(admin_service, "update", fake_update)
    response = client.patch(
        "/admin/accounts/2",
        headers=auth_headers("admin"),
        json={"is_active": False},
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False
    assert received["id"] == 2
    assert received["data"].is_active is False


def test_update_account_not_found(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_update(session: Any, account_id: int, data: Any) -> AccountResponse:
        raise admin_service.AccountNotFoundError("Account 404 not found")

    monkeypatch.setattr(admin_service, "update", fake_update)
    response = client.patch(
        "/admin/accounts/404", headers=auth_headers("admin"), json={}
    )

    assert response.status_code == 404


def test_delete_account_requires_another_account(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    appels: list[int] = []

    async def fake_remove(session: Any, account_id: int) -> None:
        appels.append(account_id)

    monkeypatch.setattr(admin_service, "remove", fake_remove)
    response = client.delete("/admin/accounts/1", headers=auth_headers("admin"))

    assert response.status_code == 400
    assert appels == []

    response = client.delete("/admin/accounts/2", headers=auth_headers("admin"))

    assert response.status_code == 204
    assert appels == [2]


def test_delete_base_admin_is_protected(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    appels: list[int] = []

    async def fake_remove(session: Any, account_id: int) -> None:
        appels.append(account_id)
        raise admin_service.ProtectedAccountError("protected")

    monkeypatch.setattr(admin_service, "remove", fake_remove)
    response = client.delete("/admin/accounts/1", headers=auth_headers("admin", 99))

    assert response.status_code == 403
    assert appels == [1]


def test_split_name() -> None:
    assert admin_service._split_name("Nadia Malonga") == ("Nadia", "Malonga")
    assert admin_service._split_name("Nadia") == ("Nadia", "Nadia")
