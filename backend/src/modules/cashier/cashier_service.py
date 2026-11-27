"""Logique métier pour le flux des bons de commande et des transactions du caissier."""

from datetime import UTC, date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from datetime import timedelta

from ...core.config import settings
from ...db.models import FingerStatus, PurchaseOrder, Transaction
from .cashier_repo import (
    CashierBeneficiaryRepository,
    CashierOrderRepository,
    CashierTransactionRepository,
)
from .cashier_schemas import (
    CashierBeneficiaryResponse,
    CashierOrderResponse,
    CashierReport,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    ReportBeneficiary,
    ReportPeriod,
    ReportPeriodFilter,
    TransactionResponse,
)

COMPANY_RATE = Decimal("0.5")
COMPANY_CAP = 1000


class BeneficiaryNotFoundError(Exception):
    """Levée lorsque le bénéficiaire est inconnu ou inactif."""


class PurchaseOrderNotFoundError(Exception):
    """Levée lorsque le bon de commande n'appartient pas à ce caissier."""


class TransactionAlreadyExistsError(Exception):
    """Levée lorsque le bon de commande a déjà été payé."""


class EnrollmentConflictError(Exception):
    """Levée lorsqu'une autre ressource est déjà en cours d'enrôlement."""


def compute_shares(amount: float | Decimal) -> tuple[int, int]:
    """Renvoie (company_share, customer_share) pour un montant de commande en FCFA."""
    total = int(Decimal(str(amount)).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    if total <= 0:
        raise ValueError("Order amount must be positive")

    exact_share = Decimal(total) * COMPANY_RATE
    rounded_share = int(exact_share.quantize(Decimal(1), rounding=ROUND_HALF_UP))
    company_share = min(rounded_share, COMPANY_CAP)
    return company_share, total - company_share


def _report_date_range(period: ReportPeriodFilter) -> tuple[date | None, date | None]:
    """Renvoie les bornes [début, fin) du rapport demandé."""
    if period == "all":
        return None, None

    today = datetime.now(UTC).date()
    if period == "daily":
        return today, today + timedelta(days=1)

    first_day = today.replace(day=1)
    next_month = first_day + timedelta(days=32)
    return first_day, next_month.replace(day=1)


async def list_beneficiaries(
    session: AsyncSession,
) -> list[CashierBeneficiaryResponse]:
    """Renvoie les bénéficiaires actifs proposés au caissier."""
    beneficiaries = await CashierBeneficiaryRepository(session).list_active()
    return [CashierBeneficiaryResponse.model_validate(item) for item in beneficiaries]


async def list_orders(
    session: AsyncSession, cashier_id: int
) -> list[CashierOrderResponse]:
    """Renvoie les bons du caissier avec leur paiement le cas échéant."""
    rows = await CashierOrderRepository(session).list_for_cashier(cashier_id)
    return [_to_order_response(row, cashier_id) for row in rows]


def _to_order_response(row: dict[str, Any], cashier_id: int) -> CashierOrderResponse:
    beneficiary = CashierBeneficiaryResponse(
        id=row["beneficiary_id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        matricule=row["matricule"],
        profession=row["profession"],
        situation=row["situation"],
        is_active=row["is_active"],
    )
    transaction = None
    if row["transaction_id"] is not None:
        transaction = TransactionResponse(
            id=row["transaction_id"],
            purchase_order_id=row["id"],
            beneficiary_id=row["beneficiary_id"],
            account_id=cashier_id,
            total_amount=row["company_share"] + row["customer_share"],
            customer_share=row["customer_share"],
            company_share=row["company_share"],
            finger_status=row["transaction_finger_status"],
            created_at=row["transaction_date"],
        )
    return CashierOrderResponse(
        id=row["id"],
        beneficiary_id=row["beneficiary_id"],
        beneficiary=beneficiary,
        amount=row["amount"],
        order_date=row["order_date"],
        transaction=transaction,
    )


async def create_order(
    session: AsyncSession, cashier_id: int, data: PurchaseOrderCreate
) -> PurchaseOrderResponse:
    """Enregistre un bon de commande remis au caissier par un bénéficiaire."""
    beneficiary = await CashierBeneficiaryRepository(session).get_active_by_id(
        data.beneficiary_id
    )
    if beneficiary is None:
        raise BeneficiaryNotFoundError(
            f"Active beneficiary {data.beneficiary_id} not found"
        )

    order = PurchaseOrder(
        beneficiary_id=data.beneficiary_id,
        account_id=cashier_id,
        amount=data.amount,
        order_date=datetime.now(UTC),
    )
    return PurchaseOrderResponse.model_validate(
        await CashierOrderRepository(session).add(order)
    )


async def perform_transaction(
    session: AsyncSession, cashier_id: int, order_id: int
) -> TransactionResponse:
    """Paie une commande et répartit son total entre l'entreprise et le client."""
    order = await CashierOrderRepository(session).get_for_cashier(order_id, cashier_id)
    if order is None:
        raise PurchaseOrderNotFoundError(f"Purchase order {order_id} not found")

    transactions = CashierTransactionRepository(session)
    if await transactions.get_by_order(order_id) is not None:
        raise TransactionAlreadyExistsError(
            f"Purchase order {order_id} already has a transaction"
        )

    # Une seule ressource en enrôlement à la fois (bénéficiaire ou transaction).
    if hasattr(session, "execute"):
        from sqlalchemy import select

        from ...db.models import Beneficiary

        enrolling_beneficiary = await session.execute(
            select(Beneficiary.id).where(
                Beneficiary.finger_status == FingerStatus.ENROLLING
            )
        )
        if enrolling_beneficiary.scalars().first() is not None:
            raise EnrollmentConflictError("Another resource is already enrolling")
        enrolling_transaction = await session.execute(
            select(Transaction.id).where(
                Transaction.finger_status == FingerStatus.ENROLLING
            )
        )
        if enrolling_transaction.scalars().first() is not None:
            raise EnrollmentConflictError("Another resource is already enrolling")

    company_share, customer_share = compute_shares(order.amount)
    now = datetime.now(UTC)
    transaction = Transaction(
        purchase_order_id=order.id,
        company_share=company_share,
        customer_share=customer_share,
        finger_status=FingerStatus.ENROLLING,
        enroll_expires_at=now + timedelta(minutes=settings.ENROLL_EXPIRES_MINUTES),
        verification_attempts=0,
        created_at=now,
    )
    saved = await transactions.add(transaction)
    return _to_transaction_response(saved, order)


def _to_transaction_response(
    transaction: Transaction, order: PurchaseOrder
) -> TransactionResponse:
    total = transaction.company_share + transaction.customer_share
    return TransactionResponse(
        id=transaction.id,
        purchase_order_id=order.id,
        beneficiary_id=order.beneficiary_id,
        account_id=order.account_id,
        total_amount=total,
        customer_share=transaction.customer_share,
        company_share=transaction.company_share,
        finger_status=transaction.finger_status,
        created_at=transaction.created_at,
    )


async def cancel_transaction(
    session: AsyncSession, cashier_id: int, transaction_id: int
) -> TransactionResponse:
    from sqlalchemy import select

    from ...db.models import PurchaseOrder

    transaction = await CashierTransactionRepository(session).get_by_id(transaction_id) if hasattr(CashierTransactionRepository(session), "get_by_id") else None
    # fallback manual
    if transaction is None:
        result = await session.execute(
            select(Transaction).where(Transaction.id == transaction_id)
        )
        transaction = result.scalars().first()
    if transaction is None:
        raise PurchaseOrderNotFoundError(f"Transaction {transaction_id} not found")
    po_result = await session.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == transaction.purchase_order_id)
    )
    order = po_result.scalars().first()
    if order is None or order.account_id != cashier_id:
        raise PurchaseOrderNotFoundError(f"Transaction {transaction_id} not found")
    if transaction.finger_status != FingerStatus.ENROLLING:
        raise TransactionAlreadyExistsError("Transaction is not enrolling")
    transaction.finger_status = FingerStatus.CANCELLED
    transaction.enroll_expires_at = None
    await session.flush()
    return _to_transaction_response(transaction, order)


async def get_report(
    session: AsyncSession, cashier_id: int, period: ReportPeriodFilter = "all"
) -> CashierReport:
    """Agrège les transactions du caissier par jour et par bénéficiaire."""
    start_date, end_date = _report_date_range(period)
    transactions = CashierTransactionRepository(session)
    rows = await transactions.list_report_rows(cashier_id, start_date, end_date)
    beneficiary_rows = await transactions.list_beneficiary_report_rows(
        cashier_id, start_date, end_date
    )
    periods = [ReportPeriod.model_validate(row) for row in rows]
    beneficiaries = [ReportBeneficiary.model_validate(row) for row in beneficiary_rows]
    return CashierReport(
        transaction_count=sum(period.transaction_count for period in periods),
        total_amount=sum(period.total_amount for period in periods),
        customer_share=sum(period.customer_share for period in periods),
        company_share=sum(period.company_share for period in periods),
        periods=periods,
        beneficiaries=beneficiaries,
    )
