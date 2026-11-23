"""Point d'entrée de l'API SmartCaisse."""

import sys
from pathlib import Path

# Permet `uvicorn src.main:app` depuis backend/ et `uvicorn main:app` depuis backend/src/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.modules.auth.auth_router import router as auth_router
from src.modules.beneficiary.beneficiary_router import router as beneficiary_router
from src.modules.cashier.cashier_router import router as cashier_router
from src.modules.users.users_router import router as users_router

app = FastAPI(title="SmartCaisse")

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(beneficiary_router)
app.include_router(cashier_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # URL de ton front
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
