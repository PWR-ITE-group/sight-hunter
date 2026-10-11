import re
import uuid
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _email(value: str) -> str:
    value = value.strip().lower()
    if not _EMAIL_RE.match(value) or len(value) > 254:
        raise ValueError("invalid e-mail")
    return value


def _password(value: str) -> str:
    # Contract: at least 8 characters with one letter and one digit.
    if len(value) < 8 or not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("password needs 8+ characters, a letter and a digit")
    return value


Email = Annotated[str, AfterValidator(_email)]
Password = Annotated[str, AfterValidator(_password)]


class RegisterRequest(BaseModel):
    email: Email
    password: Password
    ref_code: str | None = Field(default=None, max_length=12)


class LoginRequest(BaseModel):
    email: Email
    password: str


class RefreshRequest(BaseModel):
    refresh: str


class PasswordResetRequest(BaseModel):
    email: Email


class NicknameRequest(BaseModel):
    nickname: str = Field(min_length=3, max_length=24, pattern=r"^[\w.\-]+$")


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    nickname: str | None
    avatar_url: str | None
    points: int
    xp: int
    ref_code: str


class AuthOut(BaseModel):
    access: str
    refresh: str
    user: UserOut
