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
    PurchaseOrder,
    Report,
    Situation,
    Transaction,
)

BENEFICIARY_COUNT = 3
CASHIER_COUNT = 1
ORDER_COUNT = 20
REPORT_COUNT = 8

DEMO_PASSWORD = "password123"
ADMIN_EMAIL = "admin@smartcaisse.com"
CASHIER_EMAIL = "cashier@smartcaisse.com"

fake = Faker()


async def seed() -> None:
    """Remplit les tables avec des données fictives relationnellement cohérentes."""
    fake.seed_instance(42)
    random.seed(42)

    async with SessionLocal() as session:
        beneficiaries: list[Beneficiary] = []
        for index in range(BENEFICIARY_COUNT):
            beneficiary = Beneficiary(
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                matricule=f"SIAT-{index + 1:03d}",
                profession=fake.job(),
                situation=random.choice(list(Situation)),
                is_active=True
                if not beneficiaries
                else fake.boolean(chance_of_getting_true=90),
            )
            session.add(beneficiary)
            await session.flush()
            beneficiaries.append(beneficiary)

        admin_account = Account(
            beneficiary_id=beneficiaries[0].id,
            email=ADMIN_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            role=AccountType.ADMIN,
            is_active=True,
        )
        session.add(admin_account)
        await session.flush()

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
                email=CASHIER_EMAIL,
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
                amount=round(random.uniform(2, 25), 2),
            )
            session.add(order)
            await session.flush()

            session.add(
                Transaction(
                    purchase_order_id=order.id,
                    company_share=random.randint(1, 8),
                    customer_share=random.randint(1, 5),
                )
            )

        for _ in range(REPORT_COUNT):
            session.add(Report(account_id=random.choice(cashier_accounts).id))

        await session.commit()

    accounts_count = 1 + len(cashier_accounts)
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
