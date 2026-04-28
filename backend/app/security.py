from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def _to_bytes(senha: str) -> bytes:
    return senha.encode("utf-8")[:72]


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(_to_bytes(senha), bcrypt.gensalt()).decode("utf-8")


def verify_senha(senha: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(senha), senha_hash.encode("utf-8"))
    except ValueError:
        return False


def criar_token(payload: dict) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode = {**payload, "exp": expires}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
