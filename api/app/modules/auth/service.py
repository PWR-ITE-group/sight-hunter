import secrets
import uuid
from datetime import UTC, datetime

from fastapi import status
from redis.asyncio import Redis
from sqlalchemy import func, select
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
    session.add(RefreshToken(id=jti, user_id=user.id, expires_at=expires_at))
    await session.commit()
    return AuthOut(
        access=make_access_token(user.id), refresh=refresh, user=await user_out(session, user)
    )


async def register(
    session: AsyncSession, email: str, password: str, ref_code: str | None
) -> AuthOut:
    settings = get_settings()
    exists = await session.scalar(select(User.id).where(User.email == email))
    if exists is not None:
        raise AppError("email_taken", status.HTTP_409_CONFLICT)

    referrer_id: uuid.UUID | None = None
    if ref_code:
        referrer_id = await session.scalar(
            select(User.id).where(User.ref_code == ref_code.strip().upper())
        )

    user = User(
        email=email,
        password_hash=hash_password(password),
        ref_code=_new_ref_code(),
        referred_by=referrer_id,
    )
    session.add(user)
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
    user = await session.scalar(select(User).where(User.email == email))
    # Same answer for unknown e-mail and wrong password.
    if user is None or not verify_password(user.password_hash, password):
        raise AppError("invalid_credentials", status.HTTP_401_UNAUTHORIZED)
    return await issue_tokens(session, user)


async def refresh(session: AsyncSession, token: str) -> AuthOut:
    payload = decode_token(token, "refresh")
    if payload is None:
        raise unauthorized()
    row = await session.get(RefreshToken, uuid.UUID(payload["jti"]), with_for_update=True)
    now = datetime.now(UTC)
    if (
        row is None
        or row.revoked_at is not None
        or row.expires_at <= now
        or str(row.user_id) != payload["sub"]
    ):
        raise unauthorized()
    user = await session.get(User, row.user_id)
    if user is None:
        raise unauthorized()
    row.revoked_at = now  # rotation: each refresh token works once
    return await issue_tokens(session, user)


async def set_nickname(session: AsyncSession, user: User, nickname: str) -> UserOut:
    taken = await session.scalar(
        select(User.id).where(func.lower(User.nickname) == nickname.lower(), User.id != user.id)
    )
    if taken is not None:
        raise AppError("nickname_taken", status.HTTP_409_CONFLICT)
    user.nickname = nickname
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise AppError("nickname_taken", status.HTTP_409_CONFLICT) from None
    return await user_out(session, user)
