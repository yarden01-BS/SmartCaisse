"""Accès à la base de données pour le flux du caissier."""

from datetime import date
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

    async def list_active(self) -> list[Beneficiary]:
        result = await self._session.execute(
            select(Beneficiary)
            .where(Beneficiary.is_active.is_(True))
            .order_by(Beneficiary.id)
        )
        return list(result.scalars().all())


class CashierOrderRepository(BaseRepository[PurchaseOrder]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, PurchaseOrder)

    async def get_for_cashier(
        self, order_id: int, cashier_id: int
    ) -> PurchaseOrder | None:
        """Verrouille une commande pour éviter un double paiement concurrent."""
        result = await self._session.execute(
            select(PurchaseOrder)
            .where(
                PurchaseOrder.id == order_id,
                PurchaseOrder.account_id == cashier_id,
            )
            .with_for_update()
        )
        return result.scalars().first()

    async def list_for_cashier(self, cashier_id: int) -> list[dict[str, Any]]:
        """Renvoie les bons du caissier avec bénéficiaire et paiement éventuel."""
        statement = (
            select(
                PurchaseOrder.id.label("id"),
                PurchaseOrder.beneficiary_id.label("beneficiary_id"),
                PurchaseOrder.amount.label("amount"),
                PurchaseOrder.order_date.label("order_date"),
                Beneficiary.first_name.label("first_name"),
                Beneficiary.last_name.label("last_name"),
                Beneficiary.matricule.label("matricule"),
                Beneficiary.profession.label("profession"),
                Beneficiary.situation.label("situation"),
                Beneficiary.is_active.label("is_active"),
                Transaction.id.label("transaction_id"),
                Transaction.company_share.label("company_share"),
                Transaction.customer_share.label("customer_share"),
                Transaction.created_at.label("transaction_date"),
            )
            .join(Beneficiary, Beneficiary.id == PurchaseOrder.beneficiary_id)
            .outerjoin(Transaction, Transaction.purchase_order_id == PurchaseOrder.id)
            .where(PurchaseOrder.account_id == cashier_id)
            .order_by(PurchaseOrder.order_date.desc(), PurchaseOrder.id.desc())
        )
        result = await self._session.execute(statement)
        return [dict(row._mapping) for row in result.all()]


class CashierTransactionRepository(BaseRepository[Transaction]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Transaction)

    async def get_by_order(self, order_id: int) -> Transaction | None:
        result = await self._session.execute(
            select(Transaction).where(Transaction.purchase_order_id == order_id)
        )
        return result.scalars().first()

    async def list_report_rows(
        self,
        cashier_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict[str, Any]]:
        """Agrège les transactions du caissier par jour."""
        period = cast(Transaction.created_at, Date)
        statement = (
            select(
                period.label("period"),
                func.count(Transaction.id).label("transaction_count"),
                func.coalesce(func.sum(Transaction.company_share), 0).label(
                    "company_share"
                ),
                func.coalesce(func.sum(Transaction.customer_share), 0).label(
                    "customer_share"
                ),
            )
            .join(PurchaseOrder, PurchaseOrder.id == Transaction.purchase_order_id)
            .where(PurchaseOrder.account_id == cashier_id)
        )
        if start_date is not None:
            statement = statement.where(period >= start_date)
        if end_date is not None:
            statement = statement.where(period < end_date)
        statement = statement.group_by(period).order_by(period.desc())

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

    async def list_beneficiary_report_rows(
        self,
        cashier_id: int,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict[str, Any]]:
        """Agrège les transactions du caissier par bénéficiaire."""
        statement = (
            select(
                Beneficiary.id.label("beneficiary_id"),
                Beneficiary.first_name.label("first_name"),
                Beneficiary.last_name.label("last_name"),
                Beneficiary.matricule.label("matricule"),
                Beneficiary.profession.label("profession"),
                Beneficiary.situation.label("situation"),
                func.count(Transaction.id).label("transaction_count"),
                func.coalesce(func.sum(Transaction.company_share), 0).label(
                    "company_share"
                ),
                func.coalesce(func.sum(Transaction.customer_share), 0).label(
                    "customer_share"
                ),
            )
            .join(PurchaseOrder, PurchaseOrder.id == Transaction.purchase_order_id)
            .join(Beneficiary, Beneficiary.id == PurchaseOrder.beneficiary_id)
            .where(PurchaseOrder.account_id == cashier_id)
        )
        if start_date is not None:
            statement = statement.where(
                cast(Transaction.created_at, Date) >= start_date
            )
        if end_date is not None:
            statement = statement.where(cast(Transaction.created_at, Date) < end_date)
        total = func.sum(Transaction.company_share + Transaction.customer_share)
        statement = statement.group_by(
            Beneficiary.id,
            Beneficiary.first_name,
            Beneficiary.last_name,
            Beneficiary.matricule,
            Beneficiary.profession,
            Beneficiary.situation,
        ).order_by(total.desc())

        result = await self._session.execute(statement)
        return [
            {
                "beneficiary_id": row.beneficiary_id,
                "first_name": row.first_name,
                "last_name": row.last_name,
                "matricule": row.matricule,
                "profession": row.profession,
                "situation": row.situation,
                "transaction_count": int(row.transaction_count),
                "company_share": int(row.company_share),
                "customer_share": int(row.customer_share),
                "total_amount": int(row.company_share) + int(row.customer_share),
            }
            for row in result.all()
        ]
