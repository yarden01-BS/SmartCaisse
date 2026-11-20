"""HTTP routes for the cashier purchase-order and transaction workflow."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ..auth.auth_deps import get_current_account_id, require_cashier
from . import cashier_service
from .cashier_schemas import (
    CashierReport,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    TransactionResponse,
)

router = APIRouter(
    prefix="/cashier",
    tags=["cashier"],
    dependencies=[Depends(require_cashier)],
)


@router.post(
    "/purchase-orders",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    cashier_id: int = Depends(get_current_account_id),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> PurchaseOrderResponse:
    """Register a purchase order received from a beneficiary."""
    try:
        return await cashier_service.create_order(session, cashier_id, data)
    except cashier_service.BeneficiaryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post(
    "/purchase-orders/{order_id}/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def perform_transaction(
    order_id: int,
    cashier_id: int = Depends(get_current_account_id),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> TransactionResponse:
    """Pay an order and record the company/client subsidy split."""
    try:
        return await cashier_service.perform_transaction(session, cashier_id, order_id)
    except cashier_service.PurchaseOrderNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    except cashier_service.TransactionAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


@router.get("/reports", response_model=CashierReport)
async def get_report(
    cashier_id: int = Depends(get_current_account_id),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> CashierReport:
    """Return totals received, client-paid, and company-subsidized amounts."""
    return await cashier_service.get_report(session, cashier_id)
