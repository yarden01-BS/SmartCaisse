"""Tests pour le flux des bons de commande et des transactions du caissier."""

import asyncio
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any, cast

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import create_access_token
from src.db.models import Beneficiary, FingerStatus, PurchaseOrder, Report, Situation, Transaction
from src.db.session import get_session
from src.main import app
from src.modules.cashier import cashier_service
from src.modules.cashier.cashier_repo import (
    CashierBeneficiaryRepository,
    CashierOrderRepository,
    CashierTransactionRepository,
)
from src.modules.cashier.cashier_schemas import (
    CashierBeneficiaryResponse,
    CashierReport,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    TransactionResponse,
)

CASHIER_ID = 21
ORDER_DATE = datetime(2026, 11, 20, 10, 30, tzinfo=UTC)


def auth_headers(role: str) -> dict[str, str]:
    token = create_access_token({"sub": str(CASHIER_ID), "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client() -> Iterator[TestClient]:
    async def override_session() -> Any:
        yield object()

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def sample_order(**changes: Any) -> SimpleNamespace:
    values: dict[str, Any] = {
        "id": 5,
        "beneficiary_id": 3,
        "account_id": CASHIER_ID,
        "amount": 2500.0,
        "order_date": ORDER_DATE,
    }
    values.update(changes)
    return SimpleNamespace(**values)


def sample_transaction(**changes: Any) -> SimpleNamespace:
    values: dict[str, Any] = {
        "id": 9,
        "purchase_order_id": 5,
        "company_share": 1000,
        "customer_share": 1500,
        "finger_status": FingerStatus.ENROLLING,
        "created_at": ORDER_DATE,
    }
    values.update(changes)
    return SimpleNamespace(**values)


def sample_beneficiary(**changes: Any) -> SimpleNamespace:
    values: dict[str, Any] = {
        "id": 3,
        "first_name": "Jane",
        "last_name": "Doe",
        "matricule": "SIAT-003",
        "profession": "Teacher",
        "situation": Situation.PERMANENT,
        "is_active": True,
        "finger_status": FingerStatus.VALIDATED,
    }
    values.update(changes)
    return SimpleNamespace(**values)


def sample_order_row(paid: bool = True) -> dict[str, Any]:
    return {
        "id": 5,
        "beneficiary_id": 3,
        "amount": 2500.0,
        "order_date": ORDER_DATE,
        "first_name": "Jane",
        "last_name": "Doe",
        "matricule": "SIAT-003",
        "profession": "Teacher",
        "situation": Situation.PERMANENT,
        "is_active": True,
        "transaction_id": 9 if paid else None,
        "company_share": 1000,
        "customer_share": 1500,
        "transaction_finger_status": FingerStatus.ENROLLING,
        "transaction_date": ORDER_DATE,
    }


def test_redundant_storage_columns_are_removed() -> None:
    assert "account_id" not in Transaction.__table__.columns
    assert not {"type", "period", "sent_at"} & set(Report.__table__.columns.keys())


def test_matricule_is_stored_and_order_number_is_gone() -> None:
    assert "matricule" in Beneficiary.__table__.columns
    assert Beneficiary.__table__.c.matricule.unique
    assert "order_number" not in PurchaseOrder.__table__.columns


def test_cashier_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/cashier/beneficiaries").status_code == 401
    assert client.get("/cashier/purchase-orders").status_code == 401
    assert client.post("/cashier/purchase-orders", json={}).status_code == 401
    assert client.post("/cashier/purchase-orders/5/transactions").status_code == 401
    assert client.get("/cashier/reports").status_code == 401


def test_cashier_routes_reject_admin(client: TestClient) -> None:
    admin = auth_headers("admin")
    body = {
        "beneficiary_id": 3,
        "amount": 2500,
    }

    assert client.get("/cashier/beneficiaries", headers=admin).status_code == 403
    assert client.get("/cashier/purchase-orders", headers=admin).status_code == 403
    assert (
        client.post("/cashier/purchase-orders", json=body, headers=admin).status_code
        == 403
    )
    assert (
        client.post(
            "/cashier/purchase-orders/5/transactions", headers=admin
        ).status_code
        == 403
    )
    assert client.get("/cashier/reports", headers=admin).status_code == 403


def test_list_beneficiaries_route(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_list(session: Any) -> list[CashierBeneficiaryResponse]:
        return [CashierBeneficiaryResponse.model_validate(sample_beneficiary())]

    monkeypatch.setattr(cashier_service, "list_beneficiaries", fake_list)
    response = client.get("/cashier/beneficiaries", headers=auth_headers("cashier"))

    assert response.status_code == 200
    assert response.json()[0]["first_name"] == "Jane"


def test_list_orders_route_uses_token_cashier(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: dict[str, int] = {}

    async def fake_list(session: Any, cashier_id: int) -> Any:
        seen["cashier_id"] = cashier_id
        return [cashier_service._to_order_response(sample_order_row(), cashier_id)]

    monkeypatch.setattr(cashier_service, "list_orders", fake_list)
    response = client.get("/cashier/purchase-orders", headers=auth_headers("cashier"))

    assert response.status_code == 200
    assert seen["cashier_id"] == CASHIER_ID
    body = response.json()[0]
    assert "order_number" not in body
    assert body["beneficiary"]["matricule"] == "SIAT-003"
    assert body["beneficiary"]["first_name"] == "Jane"
    assert body["transaction"]["company_share"] == 1000


def test_order_without_transaction_has_no_payment() -> None:
    order = cashier_service._to_order_response(sample_order_row(paid=False), CASHIER_ID)
    assert order.transaction is None


def test_report_date_range_bounds() -> None:
    assert cashier_service._report_date_range("all") == (None, None)

    today = datetime.now(UTC).date()
    assert cashier_service._report_date_range("daily") == (
        today,
        today + timedelta(days=1),
    )

    first_day = today.replace(day=1)
    next_month = (first_day + timedelta(days=32)).replace(day=1)
    assert cashier_service._report_date_range("monthly") == (first_day, next_month)


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        (1000, (500, 500)),
        (2000, (1000, 1000)),
        (2001, (1000, 1001)),
        (2500, (1000, 1500)),
        (5000, (1000, 4000)),
        (1501, (751, 750)),
    ],
)
def test_compute_shares_applies_half_and_cap(
    amount: int, expected: tuple[int, int]
) -> None:
    assert cashier_service.compute_shares(amount) == expected


def test_compute_shares_rejects_non_positive_amount() -> None:
    with pytest.raises(ValueError):
        cashier_service.compute_shares(0)


def test_create_purchase_order_route(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: dict[str, Any] = {}

    async def fake_create_order(
        session: Any, cashier_id: int, data: PurchaseOrderCreate
    ) -> PurchaseOrderResponse:
        received.update(cashier_id=cashier_id, data=data)
        return PurchaseOrderResponse.model_validate(sample_order())

    monkeypatch.setattr(cashier_service, "create_order", fake_create_order)
    response = client.post(
        "/cashier/purchase-orders",
        headers=auth_headers("cashier"),
        json={
            "beneficiary_id": 3,
            "amount": 2500,
        },
    )

    assert response.status_code == 201
    assert response.json()["account_id"] == CASHIER_ID
    assert received["cashier_id"] == CASHIER_ID
    assert received["data"].beneficiary_id == 3


def test_create_purchase_order_not_found(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_create_order(
        session: Any, cashier_id: int, data: PurchaseOrderCreate
    ) -> PurchaseOrderResponse:
        raise cashier_service.BeneficiaryNotFoundError(
            "Active beneficiary 999 not found"
        )

    monkeypatch.setattr(cashier_service, "create_order", fake_create_order)
    response = client.post(
        "/cashier/purchase-orders",
        headers=auth_headers("cashier"),
        json={
            "beneficiary_id": 999,
            "amount": 1000,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Active beneficiary 999 not found"


def test_perform_transaction_route(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    received: dict[str, Any] = {}

    def response() -> TransactionResponse:
        return cashier_service._to_transaction_response(
            sample_transaction(), sample_order()
        )

    async def fake_perform(
        session: Any, cashier_id: int, order_id: int
    ) -> TransactionResponse:
        received.update(cashier_id=cashier_id, order_id=order_id)
        return response()

    monkeypatch.setattr(cashier_service, "perform_transaction", fake_perform)
    result = client.post(
        "/cashier/purchase-orders/5/transactions", headers=auth_headers("cashier")
    )

    assert result.status_code == 201
    assert received == {"cashier_id": CASHIER_ID, "order_id": 5}
    assert result.json()["total_amount"] == 2500
    assert result.json()["customer_share"] == 1500
    assert result.json()["company_share"] == 1000


def test_perform_transaction_errors(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def missing(session: Any, cashier_id: int, order_id: int) -> Any:
        raise cashier_service.PurchaseOrderNotFoundError("Purchase order 404 not found")

    async def duplicate(session: Any, cashier_id: int, order_id: int) -> Any:
        raise cashier_service.TransactionAlreadyExistsError("already paid")

    monkeypatch.setattr(cashier_service, "perform_transaction", missing)
    assert (
        client.post(
            "/cashier/purchase-orders/404/transactions",
            headers=auth_headers("cashier"),
        ).status_code
        == 404
    )

    monkeypatch.setattr(cashier_service, "perform_transaction", duplicate)
    assert (
        client.post(
            "/cashier/purchase-orders/5/transactions",
            headers=auth_headers("cashier"),
        ).status_code
        == 409
    )


def test_service_create_order_uses_token_cashier(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    async def fake_beneficiary(self: Any, beneficiary_id: int) -> Any:
        return SimpleNamespace(id=beneficiary_id, situation=Situation.PERMANENT)

    async def fake_add(self: Any, entity: Any) -> Any:
        captured["entity"] = entity
        return sample_order(
            id=6,
            beneficiary_id=entity.beneficiary_id,
            account_id=entity.account_id,
            amount=entity.amount,
            order_date=entity.order_date,
        )

    monkeypatch.setattr(
        CashierBeneficiaryRepository, "get_active_by_id", fake_beneficiary
    )
    monkeypatch.setattr(CashierOrderRepository, "add", fake_add)

    result = asyncio.run(
        cashier_service.create_order(
            object(),
            CASHIER_ID,
            PurchaseOrderCreate(
                beneficiary_id=3,
                amount=2500,
            ),
        )
    )

    assert captured["entity"].account_id == CASHIER_ID
    assert captured["entity"].beneficiary_id == 3
    assert result.id == 6


def test_service_create_order_requires_active_beneficiary(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def missing(self: Any, beneficiary_id: int) -> None:
        return None

    monkeypatch.setattr(CashierBeneficiaryRepository, "get_active_by_id", missing)

    with pytest.raises(cashier_service.BeneficiaryNotFoundError):
        asyncio.run(
            cashier_service.create_order(
                object(),
                CASHIER_ID,
                PurchaseOrderCreate(
                    beneficiary_id=999,
                    amount=1000,
                ),
            )
        )


def test_service_perform_transaction_saves_split(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    async def fake_order(self: Any, order_id: int, cashier_id: int) -> Any:
        captured["order_id"] = order_id
        captured["cashier_id"] = cashier_id
        return sample_order()

    async def no_transaction(self: Any, order_id: int) -> None:
        return None

    async def fake_add(self: Any, entity: Any) -> Any:
        captured["transaction"] = entity
        return sample_transaction()

    monkeypatch.setattr(CashierOrderRepository, "get_for_cashier", fake_order)
    monkeypatch.setattr(CashierTransactionRepository, "get_by_order", no_transaction)
    monkeypatch.setattr(CashierTransactionRepository, "add", fake_add)

    result = asyncio.run(cashier_service.perform_transaction(object(), CASHIER_ID, 5))

    assert captured["order_id"] == 5
    assert captured["cashier_id"] == CASHIER_ID
    assert captured["transaction"].company_share == 1000
    assert captured["transaction"].customer_share == 1500
    assert result.total_amount == 2500
    assert result.beneficiary_id == 3


def test_service_rejects_missing_and_duplicate_orders(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def missing_order(self: Any, order_id: int, cashier_id: int) -> None:
        return None

    monkeypatch.setattr(CashierOrderRepository, "get_for_cashier", missing_order)
    with pytest.raises(cashier_service.PurchaseOrderNotFoundError):
        asyncio.run(cashier_service.perform_transaction(object(), CASHIER_ID, 404))

    async def existing_order(self: Any, order_id: int, cashier_id: int) -> Any:
        return sample_order()

    async def existing_transaction(self: Any, order_id: int) -> Any:
        return sample_transaction()

    monkeypatch.setattr(CashierOrderRepository, "get_for_cashier", existing_order)
    monkeypatch.setattr(
        CashierTransactionRepository, "get_by_order", existing_transaction
    )
    with pytest.raises(cashier_service.TransactionAlreadyExistsError):
        asyncio.run(cashier_service.perform_transaction(object(), CASHIER_ID, 5))


def test_report_service_aggregates_payer_breakdowns(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_rows(
        self: Any, cashier_id: int, start_date: Any, end_date: Any
    ) -> list[dict[str, Any]]:
        assert cashier_id == CASHIER_ID
        assert (start_date, end_date) == (None, None)
        return [
            {
                "period": ORDER_DATE.date(),
                "transaction_count": 2,
                "company_share": 2000,
                "customer_share": 3000,
                "total_amount": 5000,
            },
            {
                "period": ORDER_DATE.date().replace(day=19),
                "transaction_count": 1,
                "company_share": 500,
                "customer_share": 500,
                "total_amount": 1000,
            },
        ]

    async def fake_beneficiary_rows(
        self: Any, cashier_id: int, start_date: Any, end_date: Any
    ) -> list[dict[str, Any]]:
        return [
            {
                "beneficiary_id": 3,
                "first_name": "Jane",
                "last_name": "Doe",
                "matricule": "SIAT-003",
                "profession": "Teacher",
                "situation": Situation.PERMANENT,
                "transaction_count": 3,
                "company_share": 2500,
                "customer_share": 3500,
                "total_amount": 6000,
            }
        ]

    monkeypatch.setattr(CashierTransactionRepository, "list_report_rows", fake_rows)
    monkeypatch.setattr(
        CashierTransactionRepository,
        "list_beneficiary_report_rows",
        fake_beneficiary_rows,
    )
    report = asyncio.run(cashier_service.get_report(object(), CASHIER_ID))

    assert report.transaction_count == 3
    assert report.total_amount == 6000
    assert report.company_share == 2500
    assert report.customer_share == 3500
    assert [period.total_amount for period in report.periods] == [5000, 1000]
    assert report.beneficiaries[0].total_amount == 6000
    assert report.beneficiaries[0].matricule == "SIAT-003"
    assert report.beneficiaries[0].situation == Situation.PERMANENT


def test_report_route_forwards_period(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: dict[str, Any] = {}

    async def fake_report(session: Any, cashier_id: int, period: Any) -> CashierReport:
        seen.update(cashier_id=cashier_id, period=period)
        return CashierReport(
            transaction_count=1,
            total_amount=2500,
            customer_share=1500,
            company_share=1000,
            periods=[],
            beneficiaries=[],
        )

    monkeypatch.setattr(cashier_service, "get_report", fake_report)
    response = client.get(
        "/cashier/reports?period=daily", headers=auth_headers("cashier")
    )

    assert response.status_code == 200
    assert seen == {"cashier_id": CASHIER_ID, "period": "daily"}
    assert response.json()["total_amount"] == 2500
    assert response.json()["beneficiaries"] == []
    assert (
        client.get(
            "/cashier/reports?period=yearly", headers=auth_headers("cashier")
        ).status_code
        == 422
    )


class FakeResult:
    def __init__(self, rows: list[Any], scalar: Any = None) -> None:
        self.rows = rows
        self.scalar = scalar

    def all(self) -> list[Any]:
        return self.rows

    def scalars(self) -> "FakeResult":
        return self

    def first(self) -> Any:
        return self.rows[0] if self.rows else None

    def scalar_one_or_none(self) -> Any:
        return self.scalar


class FakeSession:
    def __init__(self, rows: list[Any] | None = None) -> None:
        self.rows = rows or []
        self.statement: Any = None

    async def execute(self, statement: Any) -> FakeResult:
        self.statement = statement
        return FakeResult(self.rows)


def test_repo_order_query_is_scoped_to_cashier() -> None:
    session = FakeSession()
    repository = CashierOrderRepository(cast(AsyncSession, session))

    asyncio.run(repository.get_for_cashier(5, CASHIER_ID))

    sql = str(session.statement)
    assert "purchase_orders.account_id" in sql
    assert "FOR UPDATE" in sql


def test_repo_report_query_groups_and_filters_by_cashier() -> None:
    rows = [
        SimpleNamespace(
            period=ORDER_DATE.date(),
            transaction_count=1,
            company_share=1000,
            customer_share=1500,
        )
    ]
    session = FakeSession(rows)
    repository = CashierTransactionRepository(cast(AsyncSession, session))

    result = asyncio.run(repository.list_report_rows(CASHIER_ID))

    sql = str(session.statement)
    assert "purchase_orders.account_id" in sql
    assert "transactions.company_share" in sql
    assert "transactions.customer_share" in sql
    assert "purchase_orders.amount" not in sql
    assert "GROUP BY" in sql
    assert result[0]["total_amount"] == 2500


def test_repo_order_list_query_is_scoped_to_cashier() -> None:
    class MappingRow:
        _mapping = sample_order_row()

    session = FakeSession([MappingRow()])
    repository = CashierOrderRepository(cast(AsyncSession, session))

    rows = asyncio.run(repository.list_for_cashier(CASHIER_ID))

    assert "purchase_orders.account_id" in str(session.statement)
    assert "order_number" not in rows[0]
    assert rows[0]["matricule"] == "SIAT-003"


def test_repo_beneficiary_report_query_groups_by_beneficiary() -> None:
    rows = [
        SimpleNamespace(
            beneficiary_id=3,
            first_name="Jane",
            last_name="Doe",
            matricule="SIAT-003",
            profession="Teacher",
            situation=Situation.PERMANENT,
            transaction_count=1,
            company_share=1000,
            customer_share=1500,
        )
    ]
    session = FakeSession(rows)
    repository = CashierTransactionRepository(cast(AsyncSession, session))

    result = asyncio.run(repository.list_beneficiary_report_rows(CASHIER_ID))

    sql = str(session.statement)
    assert "purchase_orders.account_id" in sql
    assert "transactions.company_share" in sql
    assert "transactions.customer_share" in sql
    assert "purchase_orders.amount" not in sql
    assert "GROUP BY" in sql
    assert result[0]["total_amount"] == 2500
    assert result[0]["matricule"] == "SIAT-003"
    assert result[0]["situation"] == Situation.PERMANENT
