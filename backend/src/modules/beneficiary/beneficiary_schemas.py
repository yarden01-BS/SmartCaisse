"""Schémas pour l'administration des bénéficiaires."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from ...db.models import Situation

BeneficiarySort = Literal["old", "recent"]


class BeneficiaryCreate(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    matricule: str = Field(min_length=1)
    profession: str = Field(min_length=1)
    situation: Situation


class BeneficiaryUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1)
    last_name: str | None = Field(default=None, min_length=1)
    profession: str | None = Field(default=None, min_length=1)
    situation: Situation | None = None


class BeneficiaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    matricule: str
    profession: str
    situation: Situation
    is_active: bool
    created_at: datetime
