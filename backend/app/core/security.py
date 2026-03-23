"""
Security utilities for encrypting sensitive data.

Used for:
- LLM provider API keys
- Future secrets (tokens, credentials, etc.)

Encryption scheme:
Fernet (AES + HMAC authenticated encryption)
"""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken
from app.config import settings


# ---------------------------------------------------------------------
# Initialize Fernet instance once (module-level singleton)
# ---------------------------------------------------------------------

if not settings.ENCRYPTION_KEY:
    raise RuntimeError("ENCRYPTION_KEY is not configured")

_fernet = Fernet(settings.ENCRYPTION_KEY.encode())


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------

def encrypt_api_key(plaintext: str) -> str:
    """
    Encrypt plaintext API key before storing in DB.

    Args:
        plaintext: Raw API key string

    Returns:
        Encrypted base64 string safe for storage
    """
    if not plaintext:
        raise ValueError("Cannot encrypt empty API key")

    encrypted: bytes = _fernet.encrypt(plaintext.encode())
    return encrypted.decode()


def decrypt_api_key(ciphertext: str) -> str:
    """
    Decrypt stored API key at runtime.

    Args:
        ciphertext: Encrypted string from DB

    Returns:
        Original plaintext API key

    Raises:
        ValueError if decryption fails
    """
    if not ciphertext:
        raise ValueError("Ciphertext is empty")

    try:
        decrypted: bytes = _fernet.decrypt(ciphertext.encode())
        return decrypted.decode()

    except InvalidToken as exc:
        raise ValueError("Invalid encryption token or key mismatch") from exc