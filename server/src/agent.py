"""Agent local SmartCaisse: lit le BioMini 2 et appelle le backend."""

import base64
import os
import time

from dotenv import load_dotenv

load_dotenv()

import requests

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
AGENT_KEY = os.getenv("AGENT_API_KEY", "")
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL", "2"))

from scanner import ScannerService

scanner = ScannerService()


def headers():
    return {"X-Agent-Key": AGENT_KEY}


def poll_pending():
    r = requests.get(f"{BACKEND_URL}/agent/pending", headers=headers(), timeout=10)
    if r.status_code == 204:
        return None
    r.raise_for_status()
    return r.json()


def handle_beneficiary_enroll(bid):
    # TODO: remplacer la capture d'image par l'extraction de template SDK
    # une fois les fonctions Suprema connues (test.py ne les couvre pas).
    template_b64 = scanner.capture_template_base64()
    r = requests.post(
        f"{BACKEND_URL}/agent/beneficiaries/{bid}/enroll",
        headers=headers(),
        json={"template": template_b64},
        timeout=30,
    )
    r.raise_for_status()
    print(f"Bénéficiaire {bid} enrôlé.")


def handle_transaction_verify(tid):
    # TODO: test.py ne couvre pas la comparaison 1:1 de templates.
    # Ici il faudrait:
    #   1. GET /agent/transactions/{tid}/reference-template
    #   2. capturer le template courant
    #   3. comparer via le SDK (fonction à confirmer)
    #   4. POST /agent/transactions/{tid}/verify avec {match, score}
    ref = requests.get(
        f"{BACKEND_URL}/agent/transactions/{tid}/reference-template",
        headers=headers(),
        timeout=10,
    )
    ref.raise_for_status()
    ref_template = base64.b64decode(ref.json()["template"])
    current_template_b64 = scanner.capture_template_base64()
    # Comparaison non implémentée: on ne peut pas décider. Demander à l'utilisateur.
    print("TODO: comparaison de templates non implémentée (SDK inconnu).")
    # Par sécurité, on n'envoie pas de résultat.


def main():
    print("Agent SmartCaisse démarré. Polling", BACKEND_URL)
    while True:
        try:
            pending = poll_pending()
            if pending:
                kind = pending["type"]
                rid = pending["id"]
                if kind == "beneficiary":
                    handle_beneficiary_enroll(rid)
                elif kind == "transaction":
                    handle_transaction_verify(rid)
        except Exception as exc:
            print("Erreur agent:", exc)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()