import math
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.finds.models import Find
from app.seed import PLACES, seed, sid
from tests.test_auth import bearer, register

RATUSZ = PLACES[0]


@pytest.fixture
async def seeded(session: AsyncSession) -> None:
    await seed(session)


@pytest.fixture
async def auth(client: AsyncClient) -> dict[str, str]:
    data = await register(client)
    return bearer(data)


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    d_lat = (lat2 - lat1) * 111_320
    d_lng = (lng2 - lng1) * 111_320 * math.cos(math.radians(lat1))
    return math.hypot(d_lat, d_lng)


async def test_nearby_hides_exact_point_until_found(
    client: AsyncClient, seeded: None, auth: dict[str, str]
) -> None:
    r = await client.get(
        "/api/v1/places/nearby",
        params={"lat": RATUSZ["lat"], "lng": RATUSZ["lng"], "radius": 3000},
        headers=auth,
    )
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 2
    ratusz = next(i for i in items if i["id"] == str(sid("place:ratusz")))
    assert ratusz["found"] is False
    assert ratusz["name"] is None
    assert ratusz["task_id"] == str(sid("task:ratusz"))
    zone = ratusz["zone"]
    shift = distance_m(RATUSZ["lat"], RATUSZ["lng"], zone["lat"], zone["lng"])
    # Not centred on the place, but the place (with its radius) is inside the circle.
    assert shift > 20
    assert shift + RATUSZ["radius_m"] < zone["radius_m"]


async def test_nearby_respects_radius(
    client: AsyncClient, seeded: None, auth: dict[str, str]
) -> None:
    r = await client.get(
        "/api/v1/places/nearby",
        params={"lat": RATUSZ["lat"], "lng": RATUSZ["lng"], "radius": 100},
        headers=auth,
    )
    assert [i["id"] for i in r.json()["items"]] == [str(sid("place:ratusz"))]


async def test_task_has_no_hint_texts(
    client: AsyncClient, seeded: None, auth: dict[str, str]
) -> None:
    r = await client.get(f"/api/v1/tasks/{sid('task:ratusz')}", headers=auth)
    assert r.status_code == 200
    body = r.json()
    assert body["hints_total"] == 3
    assert body["reward_points"] == 40
    assert body["reward_xp"] == 100
    assert "hints" not in body
    r = await client.get(f"/api/v1/tasks/{uuid.uuid4()}", headers=auth)
    assert r.status_code == 404
    assert r.json()["code"] == "not_found"


async def test_start_round_twice_returns_same_round(
    client: AsyncClient, seeded: None, auth: dict[str, str]
) -> None:
    url = f"/api/v1/tasks/{sid('task:ratusz')}/rounds"
    first = await client.post(url, headers=auth)
    assert first.status_code == 201
    second = await client.post(url, headers=auth)
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    body = first.json()
    assert body["status"] == "active"
    assert body["hints"] == []
    assert body["attempts_left"] == 5


async def test_hints_cut_points_only_and_are_idempotent(
    client: AsyncClient, seeded: None, auth: dict[str, str]
) -> None:
    rnd = (await client.post(f"/api/v1/tasks/{sid('task:ratusz')}/rounds", headers=auth)).json()
    url = f"/api/v1/rounds/{rnd['id']}/hints"
    me_before = (await client.get("/api/v1/me", headers=auth)).json()

    key = str(uuid.uuid4())
    r = await client.post(url, headers={**auth, "Idempotency-Key": key})
    assert r.status_code == 200
    assert r.json() == {"hint_text": RATUSZ["hints"][0], "hints_used": 1, "reward_points": 30}
    # Same key → same answer, nothing consumed.
    again = await client.post(url, headers={**auth, "Idempotency-Key": key})
    assert again.json() == r.json()

    r2 = await client.post(url, headers={**auth, "Idempotency-Key": str(uuid.uuid4())})
    assert r2.json()["reward_points"] == 20
    r3 = await client.post(url, headers={**auth, "Idempotency-Key": str(uuid.uuid4())})
    assert r3.json() == {"hint_text": RATUSZ["hints"][2], "hints_used": 3, "reward_points": 10}
    r4 = await client.post(url, headers={**auth, "Idempotency-Key": str(uuid.uuid4())})
    assert r4.status_code == 409
    assert r4.json()["code"] == "no_hints_left"

    me_after = (await client.get("/api/v1/me", headers=auth)).json()
    assert me_after["points"] == me_before["points"]
    assert me_after["xp"] == me_before["xp"]
    task = (await client.get(f"/api/v1/tasks/{sid('task:ratusz')}", headers=auth)).json()
    assert task["reward_points"] == 10
    assert task["reward_xp"] == 100
    rnd_now = (await client.post(f"/api/v1/tasks/{sid('task:ratusz')}/rounds", headers=auth)).json()
    assert rnd_now["hints"] == RATUSZ["hints"]


async def test_hint_requires_idempotency_key(
    client: AsyncClient, seeded: None, auth: dict[str, str]
) -> None:
    rnd = (await client.post(f"/api/v1/tasks/{sid('task:ratusz')}/rounds", headers=auth)).json()
    r = await client.post(f"/api/v1/rounds/{rnd['id']}/hints", headers=auth)
    assert r.status_code == 422


async def test_hint_on_someone_elses_round(
    client: AsyncClient, seeded: None, auth: dict[str, str]
) -> None:
    rnd = (await client.post(f"/api/v1/tasks/{sid('task:ratusz')}/rounds", headers=auth)).json()
    other = bearer(await register(client))
    r = await client.post(
        f"/api/v1/rounds/{rnd['id']}/hints",
        headers={**other, "Idempotency-Key": str(uuid.uuid4())},
    )
    assert r.status_code == 404


async def test_next_place_nearest_popular_random(
    client: AsyncClient, seeded: None, auth: dict[str, str], session: AsyncSession
) -> None:
    katedra = PLACES[1]
    at_katedra = {"lat": katedra["lat"], "lng": katedra["lng"]}

    r = await client.get("/api/v1/places/next", params=at_katedra, headers=auth)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == str(sid("place:katedra"))
    assert body["task_id"] == str(sid("task:katedra"))
    assert body["found"] is False and body["name"] is None
    assert body["distance_m"] < 10
    assert body["zone"]["radius_m"] >= 150

    # Someone else found Ratusz → it is the popular one, even though Katedra is nearer.
    other = await register(client)
    session.add(
        Find(
            user_id=uuid.UUID(other["user"]["id"]),
            task_id=sid("task:ratusz"),
            attempt_id=None,
            points_awarded=40,
            xp_awarded=100,
        )
    )
    await session.commit()
    r = await client.get(
        "/api/v1/places/next", params={**at_katedra, "mode": "popular"}, headers=auth
    )
    assert r.json()["id"] == str(sid("place:ratusz"))

    seen = {
        (
            await client.get(
                "/api/v1/places/next", params={**at_katedra, "mode": "random"}, headers=auth
            )
        ).json()["id"]
        for _ in range(20)
    }
    assert seen <= {str(sid("place:ratusz")), str(sid("place:katedra"))}

    r = await client.get("/api/v1/places/next", params={**at_katedra, "mode": "nope"}, headers=auth)
    assert r.status_code == 422


async def test_next_place_404_when_everything_found(
    client: AsyncClient, seeded: None, auth: dict[str, str], session: AsyncSession
) -> None:
    me = (await client.get("/api/v1/me", headers=auth)).json()
    for key in ("ratusz", "katedra"):
        session.add(
            Find(
                user_id=uuid.UUID(me["id"]),
                task_id=sid(f"task:{key}"),
                attempt_id=None,
                points_awarded=40,
                xp_awarded=100,
            )
        )
    await session.commit()
    r = await client.get(
        "/api/v1/places/next", params={"lat": RATUSZ["lat"], "lng": RATUSZ["lng"]}, headers=auth
    )
    assert r.status_code == 404
    assert r.json()["code"] == "not_found"
