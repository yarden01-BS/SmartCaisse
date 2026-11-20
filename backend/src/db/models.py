from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, MetaData, func
from sqlalchemy import Enum as SQEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# Classe de base
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


# Utilitaires pour les énumérations
def enum_values(e: type[Enum]) -> list[str]:
    """Stocke la valeur ("permanent") plutôt que le nom ("PERMANENT")."""
    return [m.value for m in e]


# Énumérations
class Situation(Enum):
    PERMANENT = "permanent"
    STAGIAIRE = "stagiare"


class ReportType(Enum):
    DAILY = "daily"
    MONTHLY = "monthly"


class AccountType(Enum):
    ADMIN = "admin"
    CASHIER = "cashier"


# Tables
class Beneficiary(Base):
    __tablename__ = "beneficiaries"
    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str]
    last_name: Mapped[str]
    profession: Mapped[str]
    is_active: Mapped[bool] = mapped_column(default=True)
    situation: Mapped[Situation] = mapped_column(
        SQEnum(Situation, name="beneficiary_situation", values_callable=enum_values)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    account: Mapped[Account | None] = relationship(
        back_populates="beneficiary",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
    face_embedding: Mapped[FaceEmbedding | None] = relationship(
        back_populates="beneficiary",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
    purchase_orders: Mapped[list[PurchaseOrder]] = relationship(
        back_populates="beneficiary"
    )


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(
        ForeignKey("beneficiaries.id", ondelete="CASCADE"),
        unique=True,
    )
    embedding: Mapped[list[float]] = mapped_column(Vector(512), nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    beneficiary: Mapped[Beneficiary] = relationship(
        back_populates="face_embedding", uselist=False
    )


class Cashier(Base):
    __tablename__ = "cashiers"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str]
    last_name: Mapped[str]
    company: Mapped[str]
    is_active: Mapped[bool] = mapped_column(default=True)
    account: Mapped[Account | None] = relationship(
        back_populates="cashier",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int | None] = mapped_column(
        ForeignKey("beneficiaries.id", ondelete="CASCADE"), unique=True
    )
    cashier_id: Mapped[int | None] = mapped_column(
        ForeignKey("cashiers.id", ondelete="CASCADE"), unique=True
    )
    email: Mapped[str]
    password_hash: Mapped[str]
    role: Mapped[AccountType] = mapped_column(
        SQEnum(AccountType, name="account_role", values_callable=enum_values)
    )
    is_active: Mapped[bool]
    beneficiary: Mapped[Beneficiary | None] = relationship(
        back_populates="account", uselist=False
    )
    cashier: Mapped[Cashier | None] = relationship(
        back_populates="account", uselist=False
    )
    purchase_orders: Mapped[list[PurchaseOrder]] = relationship(
        back_populates="account"
    )
    transactions: Mapped[list[Transaction]] = relationship(back_populates="account")
    reports: Mapped[list[Report]] = relationship(back_populates="account")
    __table_args__ = (
        CheckConstraint(
            "(cashier_id IS NOT NULL) <> (beneficiary_id IS NOT NULL)",
            name="ck_account_one_owner",
        ),
    )


class RevokedToken(Base):
    """Identifiants des jetons d'actualisation révoqués lors de la déconnexion ou de la rotation."""

    __tablename__ = "revoked_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    jti: Mapped[str] = mapped_column(unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(
        ForeignKey("beneficiaries.id", ondelete="CASCADE")
    )
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    order_number: Mapped[str]
    amount: Mapped[float]

    beneficiary: Mapped[Beneficiary] = relationship(
        back_populates="purchase_orders", uselist=False
    )
    account: Mapped[Account] = relationship(
        back_populates="purchase_orders", uselist=False
    )
    transaction: Mapped[Transaction | None] = relationship(
        back_populates="purchase_order", uselist=False
    )


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    company_share: Mapped[int]
    customer_share: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    purchase_order: Mapped[PurchaseOrder] = relationship(
        back_populates="transaction", uselist=False
    )
    account: Mapped[Account] = relationship(
        back_populates="transactions", uselist=False
    )


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    type: Mapped[ReportType] = mapped_column(
        SQEnum(ReportType, name="report_type", values_callable=enum_values)
    )
    period: Mapped[date]
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    account: Mapped[Account] = relationship(back_populates="reports", uselist=False)
