"""Chiffrement des templates biométriques (backend uniquement)."""

import base64
import hashlib

from cryptography.fernet import Fernet

from .config import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.TEMPLATE_KEY.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_template(template: bytes) -> bytes:
    return _fernet().encrypt(template)


def decrypt_template(blob: bytes) -> bytes:
    return _fernet().decrypt(blob)