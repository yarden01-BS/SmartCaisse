"""Schémas pour l'administration des comptes utilisateurs."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ...db.models import AccountType

AccountRole = Literal["admin", "cashier"]


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: AccountType
    is_active: bool
    nom: str
    prenom: str


class AccountCreate(BaseModel):
    nom: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=1)
    role: AccountRole
    is_active: bool = True


class AccountUpdate(BaseModel):
    nom: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=1)
    is_active: bool | None = None
