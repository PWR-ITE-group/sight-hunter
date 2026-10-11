import uuid
from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.deps import CurrentUser, IdempotencyKeyDep, SessionDep, StorageDep
from app.core.redis import get_arq
from app.modules.finds import service
from app.modules.finds.schemas import AttemptCreated, AttemptOut, AttemptRequest

rounds_attempts_router = APIRouter(prefix="/rounds", tags=["attempts"])
attempts_router = APIRouter(prefix="/attempts", tags=["attempts"])


@rounds_attempts_router.post(
    "/{round_id}/attempts", status_code=status.HTTP_201_CREATED, response_model=AttemptCreated
)
async def create_attempt(
    round_id: uuid.UUID,
    body: AttemptRequest,
    user: CurrentUser,
    session: SessionDep,
    storage: StorageDep,
) -> AttemptCreated:
    return await service.create_attempt(session, storage, user, round_id, body)


@attempts_router.post("/{attempt_id}/submit", response_model=AttemptOut, status_code=202)
async def submit_attempt(
    attempt_id: uuid.UUID,
    user: CurrentUser,
    session: SessionDep,
    storage: StorageDep,
    idempotency_key: IdempotencyKeyDep,
) -> Any:
    arq = await get_arq()
    code, body = await service.submit_attempt(
        session, storage, arq, user, attempt_id, idempotency_key
    )
    return JSONResponse(body, status_code=code)


@attempts_router.get("/{attempt_id}", response_model=AttemptOut)
async def get_attempt(attempt_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> AttemptOut:
    return await service.get_attempt(session, user, attempt_id)
