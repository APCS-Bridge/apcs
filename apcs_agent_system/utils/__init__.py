"""
Utilitaires généraux pour l'application APCS.
"""
import secrets
import time


def generate_cuid() -> str:
    """
    Génère un ID unique compatible avec le format CUID utilisé par Prisma.
    Format: c + timestamp (base36) + random (16 chars)
    Exemple: clxxx9a8b7c6d5e4f3g2h1
    """
    # Timestamp en base36
    timestamp = int(time.time() * 1000)
    ts_part = _to_base36(timestamp)
    
    # Partie aléatoire (16 caractères base36)
    random_part = secrets.token_hex(8)  # 16 hex chars
    
    return f"c{ts_part}{random_part}"[:25]  # CUID typique ~25 chars


def _to_base36(num: int) -> str:
    """Convertir un nombre en base36"""
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if num == 0:
        return "0"
    result = ""
    while num:
        result = chars[num % 36] + result
        num //= 36
    return result
