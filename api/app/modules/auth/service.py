import secrets
import uuid
from datetime import UTC, datetime

from fastapi import status
from redis.asyncio import Redis
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import ratelimit
from app.core.config import get_settings
from app.core.errors import AppError, unauthorized
from app.core.security import (
    decode_token,
    hash_password,
    make_access_token,
    make_refresh_token,
    verify_password,
)
from app.modules.auth import repository as repo
from app.modules.auth.models import RefreshToken, User
from app.modules.auth.schemas import AuthOut, UserOut
from app.modules.wallet import service as wallet
from app.modules.wallet.models import LedgerReason

_REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I


def _new_ref_code() -> str:
    return "".join(secrets.choice(_REF_ALPHABET) for _ in range(8))


async def check_login_rate(redis: Redis, email: str, ip: str) -> None:
    """Not more than N attempts per minute per e-mail and per IP (counted even on success)."""
    limit = get_settings().login_attempts_per_minute
    ok_email = await ratelimit.hit(redis, f"rl:login:email:{email}", limit, 60)
    ok_ip = await ratelimit.hit(redis, f"rl:login:ip:{ip}", limit, 60)
    if not (ok_email and ok_ip):
        raise AppError("rate_limited", status.HTTP_429_TOO_MANY_REQUESTS)


async def user_out(session: AsyncSession, user: User) -> UserOut:
    points, xp = await wallet.balances(session, user.id)
    return UserOut(
        id=user.id,
        email=user.email,
        nickname=user.nickname,
        avatar_url=user.avatar_url,
        points=points,
        xp=xp,
        ref_code=user.ref_code,
    )


async def issue_tokens(session: AsyncSession, user: User) -> AuthOut:
    jti = uuid.uuid4()
    refresh, expires_at = make_refresh_token(user.id, jti)
    repo.add_refresh_token(session, RefreshToken(id=jti, user_id=user.id, expires_at=expires_at))
    await session.commit()
    return AuthOut(
        access=make_access_token(user.id), refresh=refresh, user=await user_out(session, user)
    )


async def register(
    session: AsyncSession, email: str, password: str, ref_code: str | None
) -> AuthOut:
    settings = get_settings()
    if await repo.email_exists(session, email):
        raise AppError("email_taken", status.HTTP_409_CONFLICT)

    referrer_id: uuid.UUID | None = None
    if ref_code:
        referrer_id = await repo.user_id_by_ref_code(session, ref_code.strip().upper())

    user = repo.add_user(
        session,
        User(
            email=email,
            password_hash=hash_password(password),
            ref_code=_new_ref_code(),
            referred_by=referrer_id,
        ),
    )
    try:
        await session.flush()
    except IntegrityError:
        # Lost a race on the e-mail (or, very unlikely, the ref code) unique index.
        await session.rollback()
        raise AppError("email_taken", status.HTTP_409_CONFLICT) from None

    if settings.welcome_points > 0:
        wallet.add_points(session, user.id, settings.welcome_points, LedgerReason.WELCOME, user.id)
    return await issue_tokens(session, user)


async def login(session: AsyncSession, email: str, password: str) -> AuthOut:
    user = await repo.get_user_by_email(session, email)
    # Same answer for unknown e-mail and wrong password.
    if user is None or not verify_password(user.password_hash, password):
        raise AppError("invalid_credentials", status.HTTP_401_UNAUTHORIZED)
    return await issue_tokens(session, user)


async def refresh(session: AsyncSession, token: str) -> AuthOut:
    payload = decode_token(token, "refresh")
    if payload is None:
        raise unauthorized()
    row = await repo.get_refresh_token_for_update(session, uuid.UUID(payload["jti"]))
    now = datetime.now(UTC)
    if (
        row is None
        or row.revoked_at is not None
        or row.expires_at <= now
        or str(row.user_id) != payload["sub"]
    ):
        raise unauthorized()
    user = await repo.get_user(session, row.user_id)
    if user is None:
        raise unauthorized()
    row.revoked_at = now  # rotation: each refresh token works once
    return await issue_tokens(session, user)


async def set_nickname(session: AsyncSession, user: User, nickname: str) -> UserOut:
    if await repo.nickname_taken(session, nickname, except_user=user.id):
        raise AppError("nickname_taken", status.HTTP_409_CONFLICT)
    user.nickname = nickname
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise AppError("nickname_taken", status.HTTP_409_CONFLICT) from None
    return await user_out(session, user)
