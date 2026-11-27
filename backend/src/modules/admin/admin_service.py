"""Logique métier pour l'administration des comptes utilisateurs."""

from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.security import hash_password
from ...db.models import (
    Account,
    AccountType,
    Beneficiary,
    Cashier,
    PurchaseOrder,
    Report,
    Situation,
    Transaction,
)
from ..beneficiary import beneficiary_service
from .admin_repo import AdminRepository
from .admin_schemas import AccountCreate, AccountResponse, AccountUpdate


class EmailAlreadyExistsError(Exception):
    """Levée lorsqu'une adresse e-mail est déjà attribuée à un compte."""


class AccountNotFoundError(Exception):
    """Levée lorsqu'aucun compte ne correspond à l'identifiant demandé."""


class ProtectedAccountError(Exception):
    """Levée lorsqu'on tente de supprimer le compte administrateur de base."""


def _split_name(nom: str) -> tuple[str, str]:
    """Sépare un nom complet en prénom et nom de famille."""
    parties = nom.strip().split(maxsplit=1)
    if len(parties) == 1:
        return parties[0], parties[0]
    if not parties:
        return "", ""
    return parties[0], parties[1]


def _to_response(account: Account) -> AccountResponse:
    profil = account.beneficiary or account.cashier
    prenom = profil.first_name if profil is not None else ""
    nom = f"{prenom} {profil.last_name}".strip() if profil is not None else ""
    return AccountResponse(
        id=account.id,
        email=account.email,
        role=account.role,
        is_active=account.is_active,
        nom=nom,
        prenom=prenom,
    )


async def create(session: AsyncSession, data: AccountCreate) -> AccountResponse:
    """Crée un compte et le profil (caissier ou bénéficiaire) qui lui est associé."""
    repository = AdminRepository(session)
    email = data.email.strip().lower()
    if await repository.get_by_email(email) is not None:
        raise EmailAlreadyExistsError(f"Email {email} is already in use")

    prenom, nom = _split_name(data.nom)
    mot_de_passe_hash = hash_password(data.password)

    if data.role == "cashier":
        proprietaire: Beneficiary | Cashier = Cashier(
            first_name=prenom,
            last_name=nom,
            company="SIAT",
            is_active=True,
        )
        role = AccountType.CASHIER
    else:
        proprietaire = Beneficiary(
            first_name=prenom,
            last_name=nom,
            matricule=f"ADM-{uuid4().hex[:10].upper()}",
            profession="Administration",
            situation=Situation.PERMANENT,
            is_active=True,
        )
        role = AccountType.ADMIN

    await repository.add(proprietaire)
    account = Account(
        email=email,
        password_hash=mot_de_passe_hash,
        role=role,
        is_active=data.is_active,
    )
    if isinstance(proprietaire, Cashier):
        account.cashier_id = proprietaire.id
    else:
        account.beneficiary_id = proprietaire.id

    return _to_response(await repository.add(account))


async def list_all(session: AsyncSession) -> list[AccountResponse]:
    """Renvoie tous les comptes avec le nom de leur propriétaire."""
    comptes = await AdminRepository(session).list_all()
    return [_to_response(account) for account in comptes]


async def update(
    session: AsyncSession, account_id: int, data: AccountUpdate
) -> AccountResponse:
    """Met à jour un compte existant et, si besoin, le nom de son profil."""
    repository = AdminRepository(session)
    account = await repository.get_by_id(account_id)
    if account is None:
        raise AccountNotFoundError(f"Account {account_id} not found")

    changes = data.model_dump(exclude_unset=True)

    if account.id == 1 and changes.get("is_active") is False:
        raise ProtectedAccountError("The base administrator account cannot be suspended")

    if "email" in changes and changes["email"]:
        email = changes["email"].strip().lower()
        doublon = await repository.get_by_email(email)
        if doublon is not None and doublon.id != account_id:
            raise EmailAlreadyExistsError(f"Email {email} is already in use")
        account.email = email

    if "password" in changes and changes["password"]:
        account.password_hash = hash_password(changes["password"])

    if "is_active" in changes and changes["is_active"] is not None:
        account.is_active = changes["is_active"]
        if account.beneficiary is not None:
            account.beneficiary.is_active = changes["is_active"]
        if account.cashier is not None:
            account.cashier.is_active = changes["is_active"]

    if "nom" in changes and changes["nom"]:
        prenom, nom = _split_name(changes["nom"])
        if account.beneficiary is not None:
            account.beneficiary.first_name = prenom
            account.beneficiary.last_name = nom
        if account.cashier is not None:
            account.cashier.first_name = prenom
            account.cashier.last_name = nom

    return _to_response(await repository.update(account))


async def remove(session: AsyncSession, account_id: int) -> None:
    """Supprime un compte ainsi que les données qui lui sont rattachées."""
    repository = AdminRepository(session)
    account = await repository.get_by_id(account_id)
    if account is None:
        raise AccountNotFoundError(f"Account {account_id} not found")

    if account.id == 1:
        raise ProtectedAccountError("The base administrator account cannot be deleted")

    if account.cashier_id is not None:
        raise ProtectedAccountError("Cashier accounts cannot be deleted; suspend the account instead")

    if account.beneficiary_id is not None:
        beneficiary_id = account.beneficiary_id
        await session.execute(delete(Report).where(Report.account_id == account_id))
        await session.execute(
            delete(Account).where(Account.beneficiary_id == beneficiary_id)
        )
        await beneficiary_service.remove_cascade(session, beneficiary_id)
        return

    await repository.delete(account)
