"""Agent local SmartCaisse: lit le BioMini 2 et appelle le backend."""

import base64
import hmac
import os
import time

from dotenv import load_dotenv

load_dotenv()

import requests

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
AGENT_KEY = os.getenv("AGENT_API_KEY", "")
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL", "2"))

if not AGENT_KEY:
    raise SystemExit("AGENT_API_KEY est vide : définissez-le dans le .env racine.")

from scanner import ScannerService

scanner = ScannerService()
session = requests.Session()
session.headers.update({"X-Agent-Key": AGENT_KEY})


def url(path: str) -> str:
    return f"{BACKEND_URL}{path}"


def poll_pending():
    response = session.get(url("/agent/pending"), timeout=10)
    if response.status_code == 204:
        return None
    response.raise_for_status()
    return response.json()


def handle_beneficiary_enroll(beneficiary_id):
    template_b64 = scanner.capture_template_base64()
    response = session.post(
        url(f"/agent/beneficiaries/{beneficiary_id}/enroll"),
        json={"template": template_b64},
        timeout=30,
    )
    response.raise_for_status()
    print(f"Bénéficiaire {beneficiary_id} enrôlé.")


def handle_transaction_verify(transaction_id):
    reference = session.get(
        url(f"/agent/transactions/{transaction_id}/reference-template"), timeout=10
    )
    if reference.status_code == 404:
        print(
            f"Transaction {transaction_id} : aucun modèle de référence, "
            "vérification ignorée."
        )
        return
    reference.raise_for_status()
    reference_template = base64.b64decode(reference.json()["template"])

    current_template = base64.b64decode(scanner.capture_template_base64())
    # Comparaison 1:1 réelle à brancher sur le SDK Suprema une fois les
    # fonctions d'extraction/verification connues. En attendant, on compare
    # les octets capturés et on envoie toujours le résultat au backend.
    match = hmac.compare_digest(current_template, reference_template)
    score = 1.0 if match else 0.0

    response = session.post(
        url(f"/agent/transactions/{transaction_id}/verify"),
        json={"match": match, "score": score},
        timeout=30,
    )
    response.raise_for_status()
    print(f"Transaction {transaction_id} : résultat envoyé (match={match}).")


def main():
    print(f"Agent SmartCaisse démarré. Polling {BACKEND_URL}")
    while True:
        try:
            pending = poll_pending()
            if pending:
                kind = pending["type"]
                resource_id = pending["id"]
                if kind == "beneficiary":
                    handle_beneficiary_enroll(resource_id)
                elif kind == "transaction":
                    handle_transaction_verify(resource_id)
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "?"
            detail = exc.response.text if exc.response is not None else str(exc)
            print(f"Erreur agent HTTP {status}: {detail}")
        except Exception as exc:
            print("Erreur agent:", exc)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
