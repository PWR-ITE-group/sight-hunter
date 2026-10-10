"""Leaderboard, reel feed, social actions, shop, admin."""

import uuid

import pytest
from httpx import AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.modules.wallet import service as wallet
from app.modules.wallet.models import LedgerReason
from app.seed import seed, sid
from tests.test_auth import bearer, register


@pytest.fixture(autouse=True)
async def _seeded(session: AsyncSession) -> None:
    await seed(session)


@pytest.fixture
async def auth(client: AsyncClient) -> dict[str, str]:
    return bearer(await register(client))


async def give_xp(session: AsyncSession, user_id: str, xp: int) -> None:
    wallet.add_xp(session, uuid.UUID(user_id), xp, LedgerReason.FIND, uuid.uuid4())
    await session.commit()


# --- leaderboard ---------------------------------------------------------------------------


async def test_leaderboard_rebuilds_from_ledger_and_ranks_me(
    client: AsyncClient, session: AsyncSession, redis: Redis
) -> None:
    a, b, c = await register(client), await register(client), await register(client)
    for who, nick in ((a, "Ala"), (b, "Bartek")):
        await client.put("/api/v1/me/nickname", json={"nickname": nick}, headers=bearer(who))
    await give_xp(session, a["user"]["id"], 300)
    await give_xp(session, b["user"]["id"], 100)
    assert not await redis.exists("lb:all")  # nothing cached yet → rebuilt from xp_ledger

    r = await client.get("/api/v1/leaderboard", params={"scope": "all"}, headers=bearer(b))
    assert r.status_code == 200
    body = r.json()
    assert [(e["rank"], e["nickname"], e["xp"]) for e in body["items"]] == [
        (1, "Ala", 300),
        (2, "Bartek", 100),
    ]
    assert body["me"] == {"rank": 2, "nickname": "Bartek", "xp": 100}

    r = await client.get("/api/v1/leaderboard", headers=bearer(c))  # default scope: week
    me = r.json()["me"]
    assert me["rank"] is None and me["xp"] == 0 and me["nickname"] == "Gracz"


# --- reels & social ------------------------------------------------------------------------


async def test_feed_locks_reward_and_paid_reels(client: AsyncClient, auth: dict[str, str]) -> None:
    r = await client.get("/api/v1/reels/feed", headers=auth)
    assert r.status_code == 200
    body = r.json()
    assert body["next_cursor"] is None
    by_id = {i["id"]: i for i in body["items"]}
    assert len(by_id) == 5
    reward = by_id[str(sid("reel:ratusz"))]
    assert reward["locked"] is True and reward["playback_url"] is None
    assert reward["finders_count"] == 0
    free = by_id[str(sid("reel:how"))]
    assert free["locked"] is False and free["playback_url"].startswith("https://")
    paid = by_id[str(sid("reel:krasnale"))]
    assert paid["locked"] is True and paid["price_points"] == 40


async def test_like_is_idempotent_and_counted(client: AsyncClient, auth: dict[str, str]) -> None:
    reel = f"/api/v1/reels/{sid('reel:how')}"
    assert (await client.put(f"{reel}/like", headers=auth)).status_code == 204
    assert (await client.put(f"{reel}/like", headers=auth)).status_code == 204
    item = next(
        i
        for i in (await client.get("/api/v1/reels/feed", headers=auth)).json()["items"]
        if i["id"] == str(sid("reel:how"))
    )
    assert item["likes_count"] == 1 and item["liked_by_me"] is True
    assert (await client.delete(f"{reel}/like", headers=auth)).status_code == 204
    item = next(
        i
        for i in (await client.get("/api/v1/reels/feed", headers=auth)).json()["items"]
        if i["id"] == str(sid("reel:how"))
    )
    assert item["likes_count"] == 0 and item["liked_by_me"] is False
    assert (await client.put(f"/api/v1/reels/{uuid.uuid4()}/like", headers=auth)).status_code == 404


async def test_comments_and_views(client: AsyncClient, auth: dict[str, str]) -> None:
    await client.put("/api/v1/me/nickname", json={"nickname": "Zosia"}, headers=auth)
    reel = f"/api/v1/reels/{sid('reel:city')}"
    r = await client.post(f"{reel}/comments", json={"text": "  Super!  "}, headers=auth)
    assert r.status_code == 201
    assert r.json()["author_nickname"] == "Zosia" and r.json()["text"] == "Super!"
    r = await client.post(f"{reel}/comments", json={"text": ""}, headers=auth)
    assert r.status_code == 422
    r = await client.get(f"{reel}/comments", headers=auth)
    assert [c["text"] for c in r.json()["items"]] == ["Super!"]
    assert (await client.post(f"{reel}/views", headers=auth)).status_code == 204


async def test_comment_rate_limit(client: AsyncClient, auth: dict[str, str]) -> None:
    reel = f"/api/v1/reels/{sid('reel:city')}"
    codes = [
        (await client.post(f"{reel}/comments", json={"text": f"c{i}"}, headers=auth)).status_code
        for i in range(11)
    ]
    assert codes[:10] == [201] * 10 and codes[10] == 429


async def test_share_link_carries_my_ref_code(client: AsyncClient) -> None:
    me = await register(client)
    r = await client.get(f"/api/v1/tasks/{sid('task:ratusz')}/share-link", headers=bearer(me))
    assert r.status_code == 200
    base = get_settings().share_base_url.rstrip("/")
    assert r.json()["url"] == f"{base}/t/{sid('task:ratusz')}?ref={me['user']['ref_code']}"


# --- shop ----------------------------------------------------------------------------------


async def test_shop_lists_paid_reels_and_sells_once(
    client: AsyncClient, auth: dict[str, str]
) -> None:
    r = await client.get("/api/v1/shop/items", headers=auth)
    assert r.status_code == 200
    assert r.json()["balance"] == 50
    items = r.json()["items"]
    assert [i["id"] for i in items] == [str(sid("reel:krasnale"))]
    assert items[0]["type"] == "reel" and items[0]["price_points"] == 40

    key = str(uuid.uuid4())
    r = await client.post(
        "/api/v1/shop/purchases",
        json={"item_id": str(sid("reel:krasnale"))},
        headers={**auth, "Idempotency-Key": key},
    )
    assert r.status_code == 201, r.text
    assert r.json()["balance"] == 10
    # Same key → same answer, no second charge.
    again = await client.post(
        "/api/v1/shop/purchases",
        json={"item_id": str(sid("reel:krasnale"))},
        headers={**auth, "Idempotency-Key": key},
    )
    assert again.json() == r.json()
    me = (await client.get("/api/v1/me", headers=auth)).json()
    assert me["points"] == 10

    feed = (await client.get("/api/v1/reels/feed", headers=auth)).json()["items"]
    bought = next(i for i in feed if i["id"] == str(sid("reel:krasnale")))
    assert bought["locked"] is False and bought["playback_url"]
    assert (await client.get("/api/v1/shop/items", headers=auth)).json()["items"] == []

    # Buying it again with a new key: no longer on sale.
    r = await client.post(
        "/api/v1/shop/purchases",
        json={"item_id": str(sid("reel:krasnale"))},
        headers={**auth, "Idempotency-Key": str(uuid.uuid4())},
    )
    assert r.status_code == 404


async def test_shop_insufficient_points(client: AsyncClient, session: AsyncSession) -> None:
    me = await register(client)
    wallet.add_points(session, uuid.UUID(me["user"]["id"]), -20, LedgerReason.PURCHASE, None)
    await session.commit()
    r = await client.post(
        "/api/v1/shop/purchases",
        json={"item_id": str(sid("reel:krasnale"))},
        headers={**bearer(me), "Idempotency-Key": str(uuid.uuid4())},
    )
    assert r.status_code == 409
    body = r.json()
    assert body["code"] == "insufficient_points"
    assert body["details"] == {"balance": 30, "price_points": 40}


# --- admin ---------------------------------------------------------------------------------


async def test_admin_requires_login_then_lists_places(client: AsyncClient) -> None:
    r = await client.get("/admin/place/list")
    assert r.status_code in (302, 307)
    assert "/admin/login" in r.headers["location"]
    s = get_settings()
    r = await client.post("/admin/login", data={"username": s.admin_user, "password": "wrong"})
    assert r.status_code in (200, 400)  # login page shown again
    r = await client.post(
        "/admin/login", data={"username": s.admin_user, "password": s.admin_password}
    )
    assert r.status_code in (302, 303)
    r = await client.get("/admin/place/list")
    assert r.status_code == 200
    assert "Ratusz we Wrocławiu" in r.text
    assert "51.110000, 17.031800" in r.text
