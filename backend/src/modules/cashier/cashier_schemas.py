"""Schemas for the cashier purchase-order and transaction workflow."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PurchaseOrderCreate(BaseModel):
    beneficiary_id: int = Field(gt=0)
    order_number: str = Field(min_length=1)
    amount: float = Field(gt=0)


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    beneficiary_id: int
    account_id: int
    order_number: str
    amount: float
    order_date: datetime


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    order_number: str
    beneficiary_id: int
    account_id: int
    total_amount: int
    customer_share: int
    company_share: int
    created_at: datetime


class ReportPeriod(BaseModel):
    period: date
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
