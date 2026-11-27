"""Routes HTTP pour l'annulation des transactions (caissier)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ..auth.auth_deps import get_current_account_id, require_cashier
from ..cashier import cashier_service
from ..cashier.cashier_schemas import TransactionResponse

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
    dependencies=[Depends(require_cashier)],
)


@router.post("/{transaction_id}/cancel", response_model=TransactionResponse)
async def cancel_transaction(
    transaction_id: int,
    cashier_id: int = Depends(get_current_account_id),
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> TransactionResponse:
    try:
        return await cashier_service.cancel_transaction(session, cashier_id, transaction_id)
    except cashier_service.PurchaseOrderNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except cashier_service.TransactionAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc