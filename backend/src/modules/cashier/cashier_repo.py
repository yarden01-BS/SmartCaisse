"""Database access for the cashier workflow."""

from typing import Any

from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.base_repo import BaseRepository
from ...db.models import Beneficiary, PurchaseOrder, Transaction


class CashierBeneficiaryRepository(BaseRepository[Beneficiary]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Beneficiary)

    async def get_active_by_id(self, beneficiary_id: int) -> Beneficiary | None:
        result = await self._session.execute(
            select(Beneficiary).where(
                Beneficiary.id == beneficiary_id,
                Beneficiary.is_active.is_(True),
            )
        )
        return result.scalars().first()


class CashierOrderRepository(BaseRepository[PurchaseOrder]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, PurchaseOrder)

    async def get_for_cashier(
        self, order_id: int, cashier_id: int
    ) -> PurchaseOrder | None:
        """Lock an order so it cannot be paid twice by concurrent requests."""
        result = await self._session.execute(
            select(PurchaseOrder)
            .where(
                PurchaseOrder.id == order_id,
                PurchaseOrder.account_id == cashier_id,
            )
            .with_for_update()
        )
        return result.scalars().first()


class CashierTransactionRepository(BaseRepository[Transaction]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Transaction)

    async def get_by_order(self, order_id: int) -> Transaction | None:
        result = await self._session.execute(
            select(Transaction).where(Transaction.purchase_order_id == order_id)
        )
        return result.scalars().first()

    async def list_report_rows(self, cashier_id: int) -> list[dict[str, Any]]:
        """Aggregate the cashier's transactions by day."""
        period = cast(Transaction.created_at, Date).label("period")
        statement = (
            select(
                period,
                func.count(Transaction.id).label("transaction_count"),
                func.coalesce(func.sum(Transaction.company_share), 0).label(
                    "company_share"
                ),
                func.coalesce(func.sum(Transaction.customer_share), 0).label(
                    "customer_share"
                ),
            )
            .where(Transaction.account_id == cashier_id)
            .group_by(period)
            .order_by(period.desc())
        )
        result = await self._session.execute(statement)
        return [
            {
                "period": row.period,
                "transaction_count": int(row.transaction_count),
                "company_share": int(row.company_share),
                "customer_share": int(row.customer_share),
                "total_amount": int(row.company_share) + int(row.customer_share),
            }
            for row in result.all()
        ]
