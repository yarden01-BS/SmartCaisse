"""Schemas for the authenticated user's profile."""

from pydantic import BaseModel, ConfigDict, EmailStr

from ...db.models import AccountType, Situation


class BeneficiaryProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    profession: str
    situation: Situation
    is_active: bool


class CashierProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    company: str
    is_active: bool


class UserProfileResponse(BaseModel):
    account_id: int
    email: EmailStr
    role: AccountType
    is_active: bool
    profile: BeneficiaryProfile | CashierProfile | None = None
