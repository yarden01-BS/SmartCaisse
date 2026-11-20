"""SmartCaisse API entry point."""

import sys
from pathlib import Path

# Allow `uvicorn src.main:app` from backend/ and `uvicorn main:app` from backend/src/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI

from src.modules.auth.auth_router import router as auth_router
from src.modules.beneficiary.beneficiary_router import router as beneficiary_router
from src.modules.cashier.cashier_router import router as cashier_router
from src.modules.users.users_router import router as users_router

app = FastAPI(title="SmartCaisse")

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(beneficiary_router)
app.include_router(cashier_router)
