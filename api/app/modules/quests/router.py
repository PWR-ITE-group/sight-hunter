import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Query, Response, status
from fastapi.responses import JSONResponse

from app.core.deps import CurrentUser, IdempotencyKeyDep, SessionDep
from app.modules.quests import service
from app.modules.quests.schemas import HintOut, NearbyOut, NextMode, NextPlaceOut, RoundOut, TaskOut

places_router = APIRouter(prefix="/places", tags=["places"])
tasks_router = APIRouter(prefix="/tasks", tags=["rounds"])
rounds_router = APIRouter(prefix="/rounds", tags=["rounds"])


@places_router.get("/nearby", response_model=NearbyOut)
async def get_nearby_places(
    user: CurrentUser,
    session: SessionDep,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
    radius: Annotated[int, Query(ge=50, le=5000)] = 2000,
) -> NearbyOut:
    return await service.nearby(session, user, lat, lng, radius)


@places_router.get("/next", response_model=NextPlaceOut)
async def get_next_place(
    user: CurrentUser,
    session: SessionDep,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
    mode: Annotated[NextMode, Query()] = "nearest",
) -> NextPlaceOut:
    return await service.next_place(session, user, lat, lng, mode)


@tasks_router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> TaskOut:
    return await service.get_task(session, user, task_id)


@tasks_router.post(
    "/{task_id}/rounds",
    response_model=RoundOut,
    responses={status.HTTP_201_CREATED: {"model": RoundOut}},
)
async def start_round(
    task_id: uuid.UUID, user: CurrentUser, session: SessionDep, response: Response
) -> RoundOut:
    created, rnd = await service.start_round(session, user, task_id)
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return rnd


@rounds_router.post("/{round_id}/hints", response_model=HintOut)
async def use_hint(
    round_id: uuid.UUID,
    user: CurrentUser,
    session: SessionDep,
    idempotency_key: IdempotencyKeyDep,
) -> Any:
    code, body = await service.use_hint(session, user, round_id, idempotency_key)
    return JSONResponse(body, status_code=code)
