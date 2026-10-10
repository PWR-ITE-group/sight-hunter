import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from tests.conftest import unique_email

PASSWORD = "haslo1234"


async def register(client: AsyncClient, email: str | None = None, **extra: str) -> dict:  # type: ignore[type-arg]
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": email or unique_email(), "password": PASSWORD, **extra},
    )
    assert r.status_code == 201, r.text
    data: dict = r.json()  # type: ignore[type-arg]
    return data


def bearer(auth: dict) -> dict[str, str]:  # type: ignore[type-arg]
    return {"Authorization": f"Bearer {auth['access']}"}


async def test_register_gives_tokens_and_welcome_points(client: AsyncClient) -> None:
    auth = await register(client)
    assert auth["access"] and auth["refresh"]
    user = auth["user"]
    assert user["nickname"] is None
    assert user["points"] == 50
    assert user["xp"] == 0
    assert len(user["ref_code"]) == 8


async def test_register_duplicate_email(client: AsyncClient) -> None:
    email = unique_email()
    await register(client, email)
    r = await client.post("/api/v1/auth/register", json={"email": email, "password": PASSWORD})
    assert r.status_code == 409
    assert r.json()["code"] == "email_taken"


async def test_register_weak_password_rejected(client: AsyncClient) -> None:
    r = await client.post(
        "/api/v1/auth/register", json={"email": unique_email(), "password": "abcdefgh"}
    )
    assert r.status_code == 422
    assert r.json()["code"] == "validation_error"


async def test_register_with_ref_code_links_referrer(
    client: AsyncClient, session: AsyncSession
) -> None:
    inviter = await register(client)
    invited = await register(client, ref_code=inviter["user"]["ref_code"].lower())
    row = await session.scalar(select(User).where(User.id == uuid.UUID(invited["user"]["id"])))
    assert row is not None
    assert str(row.referred_by) == inviter["user"]["id"]


async def test_login_ok_and_wrong_password(client: AsyncClient) -> None:
    email = unique_email()
    await register(client, email)
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "zle12345"})
    assert r.status_code == 401
    assert r.json()["code"] == "invalid_credentials"
    r = await client.post(
        "/api/v1/auth/login", json={"email": unique_email(), "password": PASSWORD}
    )
    assert r.json()["code"] == "invalid_credentials"


async def test_login_rate_limited(client: AsyncClient) -> None:
    email = unique_email()
    codes = []
    for _ in range(6):
        r = await client.post("/api/v1/auth/login", json={"email": email, "password": "x1234567"})
        codes.append(r.status_code)
    assert codes[:5] == [401] * 5
    assert codes[5] == 429


async def test_refresh_rotates_and_old_token_dies(client: AsyncClient) -> None:
    auth = await register(client)
    r = await client.post("/api/v1/auth/refresh", json={"refresh": auth["refresh"]})
    assert r.status_code == 200
    fresh = r.json()
    assert fresh["refresh"] != auth["refresh"]
    r = await client.post("/api/v1/auth/refresh", json={"refresh": auth["refresh"]})
    assert r.status_code == 401
    r = await client.get("/api/v1/me", headers=bearer(fresh))
    assert r.status_code == 200


async def test_me_requires_token(client: AsyncClient) -> None:
    r = await client.get("/api/v1/me")
    assert r.status_code == 401
    assert r.json()["code"] == "unauthorized"
    r = await client.get("/api/v1/me", headers={"Authorization": "Bearer nope"})
    assert r.status_code == 401


async def test_nickname_set_and_taken_case_insensitive(client: AsyncClient) -> None:
    a = await register(client)
    b = await register(client)
    r = await client.put("/api/v1/me/nickname", json={"nickname": "Krasnal"}, headers=bearer(a))
    assert r.status_code == 200
    assert r.json()["nickname"] == "Krasnal"
    r = await client.put("/api/v1/me/nickname", json={"nickname": "krasnal"}, headers=bearer(b))
    assert r.status_code == 409
    assert r.json()["code"] == "nickname_taken"
    # Re-saving your own nickname is fine.
    r = await client.put("/api/v1/me/nickname", json={"nickname": "Krasnal"}, headers=bearer(a))
    assert r.status_code == 200


async def test_password_reset_is_accepted_quietly(client: AsyncClient) -> None:
    r = await client.post("/api/v1/auth/password-reset", json={"email": unique_email()})
    assert r.status_code == 202
