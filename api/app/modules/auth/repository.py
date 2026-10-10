import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import RefreshToken, User


async def get_user(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await session.get(User, user_id)


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(select(User).where(User.email == email))


async def email_exists(session: AsyncSession, email: str) -> bool:
    return await session.scalar(select(User.id).where(User.email == email)) is not None


async def user_id_by_ref_code(session: AsyncSession, ref_code: str) -> uuid.UUID | None:
    return await session.scalar(select(User.id).where(User.ref_code == ref_code))


async def nickname_taken(session: AsyncSession, nickname: str, except_user: uuid.UUID) -> bool:
    other = await session.scalar(
        select(User.id).where(func.lower(User.nickname) == nickname.lower(), User.id != except_user)
    )
    return other is not None


def add_user(session: AsyncSession, user: User) -> User:
    session.add(user)
    return user


def add_refresh_token(session: AsyncSession, token: RefreshToken) -> RefreshToken:
    session.add(token)
    return token


async def get_refresh_token_for_update(
    session: AsyncSession, jti: uuid.UUID
) -> RefreshToken | None:
    return await session.get(RefreshToken, jti, with_for_update=True)
