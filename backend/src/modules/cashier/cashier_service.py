"""Business logic for the cashier purchase-order and transaction workflow."""

from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from ...db.models import PurchaseOrder, Transaction
from .cashier_repo import (
    CashierBeneficiaryRepository,
    CashierOrderRepository,
    CashierTransactionRepository,
)
from .cashier_schemas import (
    CashierReport,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    ReportPeriod,
    TransactionResponse,
)

COMPANY_RATE = Decimal("0.5")
COMPANY_CAP = 1000


class BeneficiaryNotFoundError(Exception):
    """Raised when the beneficiary is unknown or inactive."""


class PurchaseOrderNotFoundError(Exception):
    """Raised when the order does not belong to this cashier."""


class TransactionAlreadyExistsError(Exception):
    """Raised when the order has already been paid."""


def compute_shares(amount: float | Decimal) -> tuple[int, int]:
    """Return (company_share, customer_share) for an order amount in FCFA."""
    total = int(Decimal(str(amount)).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    if total <= 0:
        raise ValueError("Order amount must be positive")

    exact_share = Decimal(total) * COMPANY_RATE
    rounded_share = int(exact_share.quantize(Decimal(1), rounding=ROUND_HALF_UP))
    company_share = min(rounded_share, COMPANY_CAP)
    return company_share, total - company_share


async def create_order(
    session: AsyncSession, cashier_id: int, data: PurchaseOrderCreate
) -> PurchaseOrderResponse:
    """Register a purchase order handed to the cashier by a beneficiary."""
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
        order_number=data.order_number,
        amount=data.amount,
        order_date=datetime.now(UTC),
    )
    return PurchaseOrderResponse.model_validate(
        await CashierOrderRepository(session).add(order)
    )


async def perform_transaction(
    session: AsyncSession, cashier_id: int, order_id: int
) -> TransactionResponse:
    """Pay an order and split its total between the company and the client."""
    order = await CashierOrderRepository(session).get_for_cashier(order_id, cashier_id)
    if order is None:
        raise PurchaseOrderNotFoundError(f"Purchase order {order_id} not found")

    transactions = CashierTransactionRepository(session)
    if await transactions.get_by_order(order_id) is not None:
        raise TransactionAlreadyExistsError(
            f"Purchase order {order_id} already has a transaction"
        )

    company_share, customer_share = compute_shares(order.amount)
    transaction = Transaction(
        purchase_order_id=order.id,
        account_id=cashier_id,
        company_share=company_share,
        customer_share=customer_share,
        created_at=datetime.now(UTC),
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
        order_number=order.order_number,
        beneficiary_id=order.beneficiary_id,
        account_id=transaction.account_id,
        total_amount=total,
        customer_share=transaction.customer_share,
        company_share=transaction.company_share,
        created_at=transaction.created_at,
    )


async def get_report(session: AsyncSession, cashier_id: int) -> CashierReport:
    """Aggregate the cashier's transactions with explicit payer breakdowns."""
    rows = await CashierTransactionRepository(session).list_report_rows(cashier_id)
    periods = [ReportPeriod.model_validate(row) for row in rows]
    return CashierReport(
        transaction_count=sum(period.transaction_count for period in periods),
        total_amount=sum(period.total_amount for period in periods),
        customer_share=sum(period.customer_share for period in periods),
        company_share=sum(period.company_share for period in periods),
        periods=periods,
    )
