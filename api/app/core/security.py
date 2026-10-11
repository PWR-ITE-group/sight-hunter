import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import get_settings

_hasher = PasswordHasher()

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def _encode(payload: dict[str, Any], ttl_s: int) -> tuple[str, datetime]:
    now = datetime.now(UTC)
    exp = now + timedelta(seconds=ttl_s)
    payload = {**payload, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(payload, get_settings().jwt_secret, algorithm="HS256"), exp


def make_access_token(user_id: uuid.UUID) -> str:
    token, _ = _encode({"sub": str(user_id), "type": "access"}, get_settings().jwt_access_ttl_s)
    return token


def make_refresh_token(user_id: uuid.UUID, jti: uuid.UUID) -> tuple[str, datetime]:
    return _encode(
        {"sub": str(user_id), "jti": str(jti), "type": "refresh"},
        get_settings().jwt_refresh_ttl_s,
    )


def decode_token(token: str, expected: TokenType) -> dict[str, Any] | None:
    try:
        payload: dict[str, Any] = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != expected or "sub" not in payload:
        return None
    return payload
