"""Schémas pour les routes agent (serveur local)."""

from pydantic import BaseModel


class AgentPendingResponse(BaseModel):
    type: str
    id: int


class AgentEnrollRequest(BaseModel):
    template: str  # base64


class AgentVerifyRequest(BaseModel):
    match: bool
    score: float | None = None


class AgentReferenceTemplateResponse(BaseModel):
    template: str  # base64