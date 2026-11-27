"""Logique métier pour l'agent biométrique (serveur local)."""

import base64
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.crypto import decrypt_template, encrypt_template
from ...db.models import Beneficiary, FingerStatus, Transaction

MAX_ATTEMPTS = 3


class AgentResourceNotFoundError(Exception):
    pass


class AgentConflictError(Exception):
    pass


async def _get_beneficiary(session: AsyncSession, beneficiary_id: int) -> Beneficiary:
    result = await session.execute(
        select(Beneficiary).where(Beneficiary.id == beneficiary_id)
    )
    beneficiary = result.scalars().first()
    if beneficiary is None:
        raise AgentResourceNotFoundError(f"Beneficiary {beneficiary_id} not found")
    return beneficiary


async def _get_transaction(session: AsyncSession, transaction_id: int) -> Transaction:
    result = await session.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    transaction = result.scalars().first()
    if transaction is None:
        raise AgentResourceNotFoundError(f"Transaction {transaction_id} not found")
    return transaction


def _is_expired(resource) -> bool:
    expires = getattr(resource, "enroll_expires_at", None)
    return expires is not None and expires < datetime.now(UTC)


async def get_pending(session: AsyncSession):
    # Beneficiary enrolling
    result = await session.execute(
        select(Beneficiary).where(Beneficiary.finger_status == FingerStatus.ENROLLING)
    )
    beneficiary = result.scalars().first()
    if beneficiary is not None:
        if _is_expired(beneficiary):
            beneficiary.finger_status = FingerStatus.CANCELLED
            beneficiary.enroll_expires_at = None
            await session.flush()
        else:
            return ("beneficiary", beneficiary.id)

    result = await session.execute(
        select(Transaction).where(Transaction.finger_status == FingerStatus.ENROLLING)
    )
    transaction = result.scalars().first()
    if transaction is not None:
        if _is_expired(transaction):
            transaction.finger_status = FingerStatus.CANCELLED
            transaction.enroll_expires_at = None
            await session.flush()
        else:
            return ("transaction", transaction.id)

    return None


async def get_reference_template(session: AsyncSession, transaction_id: int) -> bytes:
    transaction = await _get_transaction(session, transaction_id)
    if transaction.finger_status != FingerStatus.ENROLLING or _is_expired(transaction):
        raise AgentConflictError("Transaction is not enrolling or expired")
    from ...db.models import PurchaseOrder

    po_result = await session.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == transaction.purchase_order_id)
    )
    po = po_result.scalars().first()
    if po is None:
        raise AgentResourceNotFoundError("Purchase order not found")
    ben_result = await session.execute(
        select(Beneficiary).where(Beneficiary.id == po.beneficiary_id)
    )
    beneficiary = ben_result.scalars().first()
    if beneficiary is None or not beneficiary.fingerprint_template:
        raise AgentResourceNotFoundError("Reference template not found")
    return decrypt_template(beneficiary.fingerprint_template)


async def enroll_beneficiary(session: AsyncSession, beneficiary_id: int, template_b64: str) -> None:
    beneficiary = await _get_beneficiary(session, beneficiary_id)
    if beneficiary.finger_status != FingerStatus.ENROLLING or _is_expired(beneficiary):
        raise AgentConflictError("Beneficiary is not enrolling or expired")
    beneficiary.fingerprint_template = encrypt_template(base64.b64decode(template_b64))
    beneficiary.finger_status = FingerStatus.VALIDATED
    beneficiary.enroll_expires_at = None
    await session.flush()


async def verify_transaction(session: AsyncSession, transaction_id: int, match: bool) -> None:
    transaction = await _get_transaction(session, transaction_id)
    if transaction.finger_status != FingerStatus.ENROLLING or _is_expired(transaction):
        raise AgentConflictError("Transaction is not enrolling or expired")
    if match:
        transaction.finger_status = FingerStatus.VALIDATED
        transaction.enroll_expires_at = None
        await session.flush()
        return
    transaction.verification_attempts += 1
    if transaction.verification_attempts >= MAX_ATTEMPTS or _is_expired(transaction):
        transaction.finger_status = FingerStatus.CANCELLED
        transaction.enroll_expires_at = None
    await session.flush()