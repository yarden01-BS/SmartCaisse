"""Tests pour l'administration des bénéficiaires."""

import asyncio
from collections.abc import Iterator
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import create_access_token
from src.db.models import Situation
from src.db.session import get_session
from src.main import app
from src.modules.beneficiary import beneficiary_service
from src.modules.beneficiary.beneficiary_repo import BeneficiaryRepository
from src.modules.beneficiary.beneficiary_schemas import (
    BeneficiaryCreate,
    BeneficiaryResponse,
    BeneficiaryUpdate,
)


def make_beneficiary(**changes: Any) -> SimpleNamespace:
    values: dict[str, Any] = {
        "id": 5,
        "first_name": "Jane",
        "last_name": "Doe",
        "profession": "Teacher",
        "situation": Situation.PERMANENT,
        "is_active": True,
        "created_at": datetime(2026, 11, 20, tzinfo=UTC),
    }
    values.update(changes)
    return SimpleNamespace(**values)


def sample_response(**changes: Any) -> BeneficiaryResponse:
    return BeneficiaryResponse.model_validate(make_beneficiary(**changes))


def auth_headers(role: str) -> dict[str, str]:
    token = create_access_token({"sub": "1", "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client() -> Iterator[TestClient]:
    async def override_session() -> Any:
        yield object()

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_create_requires_admin(client: TestClient) -> None:
    body = {
        "first_name": "Jane",
        "last_name": "Doe",
        "profession": "Teacher",
        "situation": "permanent",
    }

    assert client.post("/beneficiaries", json=body).status_code == 401
    assert (
        client.post(
            "/beneficiaries", json=body, headers=auth_headers("cashier")
        ).status_code
        == 403
    )


def test_update_and_suspend_require_admin(client: TestClient) -> None:
    cashier = auth_headers("cashier")

    assert client.patch("/beneficiaries/5", json={}, headers=cashier).status_code == 403
    assert client.post("/beneficiaries/5/suspend", headers=cashier).status_code == 403


def test_create_beneficiary(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: dict[str, Any] = {}

    async def fake_create(session: Any, data: BeneficiaryCreate) -> BeneficiaryResponse:
        received["data"] = data
        return sample_response(id=6)

    monkeypatch.setattr(beneficiary_service, "create", fake_create)
    response = client.post(
        "/beneficiaries",
        headers=auth_headers("admin"),
        json={
            "first_name": "Jane",
            "last_name": "Doe",
            "profession": "Teacher",
            "situation": "permanent",
        },
    )

    assert response.status_code == 201
    assert response.json()["id"] == 6
    assert received["data"].first_name == "Jane"
    assert received["data"].situation is Situation.PERMANENT


def test_update_beneficiary(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: dict[str, Any] = {}

    async def fake_update(
        session: Any, beneficiary_id: int, data: BeneficiaryUpdate
    ) -> BeneficiaryResponse:
        received["id"] = beneficiary_id
        received["data"] = data
        return sample_response(profession="Engineer")

    monkeypatch.setattr(beneficiary_service, "update", fake_update)
    response = client.patch(
        "/beneficiaries/5",
        headers=auth_headers("admin"),
        json={"profession": "Engineer"},
    )

    assert response.status_code == 200
    assert response.json()["profession"] == "Engineer"
    assert received["id"] == 5
    assert received["data"].profession == "Engineer"


def test_suspend_beneficiary(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: list[int] = []

    async def fake_suspend(session: Any, beneficiary_id: int) -> BeneficiaryResponse:
        received.append(beneficiary_id)
        return sample_response(is_active=False)

    monkeypatch.setattr(beneficiary_service, "suspend", fake_suspend)
    response = client.post("/beneficiaries/5/suspend", headers=auth_headers("admin"))

    assert response.status_code == 200
    assert response.json()["is_active"] is False
    assert received == [5]


def test_update_not_found_is_404(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_update(
        session: Any, beneficiary_id: int, data: BeneficiaryUpdate
    ) -> BeneficiaryResponse:
        raise beneficiary_service.BeneficiaryNotFoundError("Beneficiary 404 not found")

    monkeypatch.setattr(beneficiary_service, "update", fake_update)
    response = client.patch(
        "/beneficiaries/404", headers=auth_headers("admin"), json={"profession": "X"}
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Beneficiary 404 not found"


def test_suspend_not_found_is_404(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_suspend(session: Any, beneficiary_id: int) -> BeneficiaryResponse:
        raise beneficiary_service.BeneficiaryNotFoundError("Beneficiary 404 not found")

    monkeypatch.setattr(beneficiary_service, "suspend", fake_suspend)
    response = client.post("/beneficiaries/404/suspend", headers=auth_headers("admin"))

    assert response.status_code == 404


def test_service_create_sets_active(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    async def fake_add(self: Any, entity: Any) -> Any:
        captured["entity"] = entity
        return make_beneficiary(id=6)

    monkeypatch.setattr(BeneficiaryRepository, "add", fake_add)
    result = asyncio.run(
        beneficiary_service.create(
            object(),
            BeneficiaryCreate(
                first_name="Jane",
                last_name="Doe",
                profession="Teacher",
                situation=Situation.PERMANENT,
            ),
        )
    )

    assert captured["entity"].is_active is True
    assert captured["entity"].first_name == "Jane"
    assert result.id == 6


def test_service_update_applies_only_supplied_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    async def fake_get_by_id(self: Any, beneficiary_id: int) -> Any:
        assert beneficiary_id == 5
        return make_beneficiary()

    async def fake_update(self: Any, entity: Any, **data: Any) -> Any:
        captured.update(data)
        return make_beneficiary(**data)

    monkeypatch.setattr(BeneficiaryRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(BeneficiaryRepository, "update", fake_update)

    asyncio.run(
        beneficiary_service.update(
            object(), 5, BeneficiaryUpdate(profession="Engineer")
        )
    )

    assert captured == {"profession": "Engineer"}


def test_service_suspend_sets_inactive(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    async def fake_get_by_id(self: Any, beneficiary_id: int) -> Any:
        return make_beneficiary()

    async def fake_update(self: Any, entity: Any, **data: Any) -> Any:
        captured.update(data)
        return make_beneficiary(**data)

    monkeypatch.setattr(BeneficiaryRepository, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(BeneficiaryRepository, "update", fake_update)

    asyncio.run(beneficiary_service.suspend(object(), 5))

    assert captured == {"is_active": False}


def test_service_get_missing_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_by_id(self: Any, beneficiary_id: int) -> None:
        return None

    monkeypatch.setattr(BeneficiaryRepository, "get_by_id", fake_get_by_id)

    with pytest.raises(beneficiary_service.BeneficiaryNotFoundError):
        asyncio.run(beneficiary_service.get(object(), 404))


def test_list_requires_admin(client: TestClient) -> None:
    assert client.get("/beneficiaries").status_code == 401
    assert (
        client.get("/beneficiaries", headers=auth_headers("cashier")).status_code == 403
    )


def test_list_beneficiaries_defaults(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: dict[str, Any] = {}

    async def fake_list_all(
        session: Any, sort: str, is_active: bool | None
    ) -> list[BeneficiaryResponse]:
        received.update(sort=sort, is_active=is_active)
        return [sample_response(id=1), sample_response(id=2)]

    monkeypatch.setattr(beneficiary_service, "list_all", fake_list_all)
    response = client.get("/beneficiaries", headers=auth_headers("admin"))

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [1, 2]
    assert received == {"sort": "recent", "is_active": None}


def test_list_beneficiaries_old_and_inactive(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: dict[str, Any] = {}

    async def fake_list_all(
        session: Any, sort: str, is_active: bool | None
    ) -> list[BeneficiaryResponse]:
        received.update(sort=sort, is_active=is_active)
        return []

    monkeypatch.setattr(beneficiary_service, "list_all", fake_list_all)
    response = client.get(
        "/beneficiaries?sort=old&is_active=false", headers=auth_headers("admin")
    )

    assert response.status_code == 200
    assert response.json() == []
    assert received == {"sort": "old", "is_active": False}


def test_service_list_all_maps_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    received: dict[str, Any] = {}

    async def fake_list_all(self: Any, sort: str, is_active: bool | None) -> list[Any]:
        received.update(sort=sort, is_active=is_active)
        return [make_beneficiary(id=1), make_beneficiary(id=2)]

    monkeypatch.setattr(BeneficiaryRepository, "list_all", fake_list_all)
    result = asyncio.run(beneficiary_service.list_all(object(), "old", True))

    assert [item.id for item in result] == [1, 2]
    assert received == {"sort": "old", "is_active": True}


class FakeSession:
    def __init__(self) -> None:
        self.statement: Any = None

    async def execute(self, statement: Any) -> Any:
        self.statement = statement
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=list))


def test_repo_list_recent_filters_and_sorts_desc() -> None:
    session = FakeSession()
    repository = BeneficiaryRepository(cast(AsyncSession, session))

    asyncio.run(repository.list_all("recent", True))

    sql = str(session.statement)
    assert "beneficiaries.is_active" in sql
    assert "ORDER BY beneficiaries.created_at DESC" in sql


def test_repo_list_old_sorts_asc_without_filter() -> None:
    session = FakeSession()
    repository = BeneficiaryRepository(cast(AsyncSession, session))

    asyncio.run(repository.list_all("old", None))

    sql = str(session.statement)
    assert " WHERE " not in sql
    assert "ORDER BY beneficiaries.created_at ASC" in sql
