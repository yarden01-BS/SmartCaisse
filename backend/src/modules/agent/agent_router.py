"""Routes HTTP pour l'agent biométrique (serveur local)."""

import base64

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ..agent.agent_deps import require_agent_key
from . import agent_schemas, agent_service

router = APIRouter(
    prefix="/agent",
    tags=["agent"],
    dependencies=[Depends(require_agent_key)],
)


def _not_found(exc: agent_service.AgentResourceNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _conflict(exc: agent_service.AgentConflictError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.get("/pending")
async def get_pending(
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Response:
    result = await agent_service.get_pending(session)
    if result is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    kind, rid = result
    return agent_schemas.AgentPendingResponse(type=kind, id=rid)


@router.get(
    "/transactions/{transaction_id}/reference-template",
    response_model=agent_schemas.AgentReferenceTemplateResponse,
)
async def reference_template(
    transaction_id: int,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> agent_schemas.AgentReferenceTemplateResponse:
    try:
        template = await agent_service.get_reference_template(session, transaction_id)
    except agent_service.AgentResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    except agent_service.AgentConflictError as exc:
        raise _conflict(exc) from exc
    return agent_schemas.AgentReferenceTemplateResponse(
        template=base64.b64encode(template).decode("ascii")
    )


@router.post("/beneficiaries/{beneficiary_id}/enroll", status_code=status.HTTP_204_NO_CONTENT)
async def enroll_beneficiary(
    beneficiary_id: int,
    data: agent_schemas.AgentEnrollRequest,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> None:
    try:
        await agent_service.enroll_beneficiary(session, beneficiary_id, data.template)
    except agent_service.AgentResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    except agent_service.AgentConflictError as exc:
        raise _conflict(exc) from exc


@router.post("/transactions/{transaction_id}/verify", status_code=status.HTTP_204_NO_CONTENT)
async def verify_transaction(
    transaction_id: int,
    data: agent_schemas.AgentVerifyRequest,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> None:
    try:
        await agent_service.verify_transaction(session, transaction_id, data.match)
    except agent_service.AgentResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    except agent_service.AgentConflictError as exc:
        raise _conflict(exc) from exc