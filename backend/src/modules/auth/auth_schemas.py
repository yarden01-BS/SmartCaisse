"""Request and response schemas for authentication."""

from pydantic import BaseModel, EmailStr, Field

from ...db.models import AccountType


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    account_id: int
    role: AccountType
