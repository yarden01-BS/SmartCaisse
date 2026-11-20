"""Insère des données fictives dans toutes les tables pour le développement local."""

import asyncio
import random

from faker import Faker

from src.core.security import hash_password
from src.db.database import SessionLocal
from src.db.models import (
    Account,
    AccountType,
    Beneficiary,
    Cashier,
    FaceEmbedding,
    PurchaseOrder,
    Report,
    ReportType,
    Situation,
    Transaction,
)

BENEFICIARY_COUNT = 10
CASHIER_COUNT = 4
ORDER_COUNT = 20
REPORT_COUNT = 8

DEMO_PASSWORD = "password123"
ADMIN_EMAIL = "admin@smartcaisse.com"
CASHIER_EMAIL = "cashier@smartcaisse.com"

fake = Faker()


def make_face_embedding() -> list[float]:
    """Faker n'a pas de fournisseur de vecteurs, donc on construit directement un plongement de 512 dimensions."""
    return [round(random.random(), 6) for _ in range(512)]


async def seed() -> None:
    """Remplit toutes les tables avec des données fictives mais cohérentes sur le plan relationnel."""
    fake.seed_instance(42)
    random.seed(42)

    async with SessionLocal() as session:
        beneficiaries: list[Beneficiary] = []
        for _ in range(BENEFICIARY_COUNT):
            beneficiary = Beneficiary(
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                profession=fake.job(),
                situation=random.choice(list(Situation)),
                is_active=fake.boolean(chance_of_getting_true=90),
            )
            session.add(beneficiary)
            await session.flush()
            beneficiaries.append(beneficiary)

            session.add(
                FaceEmbedding(
                    beneficiary_id=beneficiary.id,
                    embedding=make_face_embedding(),
                )
            )
            session.add(
                Account(
                    beneficiary_id=beneficiary.id,
                    email=ADMIN_EMAIL
                    if len(beneficiaries) == 1
                    else fake.unique.email(),
                    password_hash=hash_password(DEMO_PASSWORD),
                    role=AccountType.ADMIN,
                    is_active=True,
                )
            )

        cashier_accounts: list[Account] = []
        for _ in range(CASHIER_COUNT):
            cashier = Cashier(
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                company=fake.company(),
                is_active=True,
            )
            session.add(cashier)
            await session.flush()

            account = Account(
                cashier_id=cashier.id,
                email=CASHIER_EMAIL if not cashier_accounts else fake.unique.email(),
                password_hash=hash_password(DEMO_PASSWORD),
                role=AccountType.CASHIER,
                is_active=True,
            )
            session.add(account)
            await session.flush()
            cashier_accounts.append(account)

        for _ in range(ORDER_COUNT):
            order = PurchaseOrder(
                beneficiary_id=random.choice(beneficiaries).id,
                account_id=random.choice(cashier_accounts).id,
                order_number=fake.unique.bothify(text="PO-#####"),
                amount=round(random.uniform(2, 25), 2),
            )
            session.add(order)
            await session.flush()

            session.add(
                Transaction(
                    purchase_order_id=order.id,
                    account_id=order.account_id,
                    company_share=random.randint(1, 8),
                    customer_share=random.randint(1, 5),
                )
            )

        for _ in range(REPORT_COUNT):
            session.add(
                Report(
                    account_id=random.choice(cashier_accounts).id,
                    type=random.choice(list(ReportType)),
                    period=fake.date_between(start_date="-30d", end_date="today"),
                )
            )

        await session.commit()

    accounts_count = BENEFICIARY_COUNT + CASHIER_COUNT
    print(
        f"Seeded: {BENEFICIARY_COUNT} beneficiaries, "
        f"{BENEFICIARY_COUNT} face embeddings, "
        f"{CASHIER_COUNT} cashiers, {accounts_count} accounts, "
        f"{ORDER_COUNT} purchase orders, {ORDER_COUNT} transactions, "
        f"{REPORT_COUNT} reports."
    )
    print(f"Demo logins: {ADMIN_EMAIL} / {CASHIER_EMAIL} (password: {DEMO_PASSWORD})")


if __name__ == "__main__":
    asyncio.run(seed())
