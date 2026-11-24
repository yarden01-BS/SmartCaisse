"""Schémas pour le flux des bons de commande et des transactions du caissier."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from ...db.models import Situation

ReportPeriodFilter = Literal["all", "daily", "monthly"]


class PurchaseOrderCreate(BaseModel):
    beneficiary_id: int = Field(gt=0)
    amount: float = Field(gt=0)


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    beneficiary_id: int
    account_id: int
    amount: float
    order_date: datetime


class CashierBeneficiaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    matricule: str
    profession: str
    situation: Situation
    is_active: bool


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    beneficiary_id: int
    account_id: int
    total_amount: int
    customer_share: int
    company_share: int
    created_at: datetime


class CashierOrderResponse(BaseModel):
    id: int
    beneficiary_id: int
    beneficiary: CashierBeneficiaryResponse
    amount: float
    order_date: datetime
    transaction: TransactionResponse | None


class ReportPeriod(BaseModel):
    period: date
    transaction_count: int
    total_amount: int
    customer_share: int
    company_share: int


class ReportBeneficiary(BaseModel):
    beneficiary_id: int
    first_name: str
    last_name: str
    matricule: str
    profession: str
    situation: Situation
    transaction_count: int
    total_amount: int
    customer_share: int
    company_share: int


class CashierReport(BaseModel):
    transaction_count: int
    total_amount: int
    customer_share: int
    company_share: int
    periods: list[ReportPeriod]
    beneficiaries: list[ReportBeneficiary]
