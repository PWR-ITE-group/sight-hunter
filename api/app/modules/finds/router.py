import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Header, Request, Response, status
from fastapi.responses import JSONResponse

from app.core.deps import CurrentUser, IdempotencyKeyDep, SessionDep, StorageDep
from app.core.redis import get_arq
from app.modules.finds import service
from app.modules.finds.schemas import AttemptCreated, AttemptOut, AttemptRequest

rounds_attempts_router = APIRouter(prefix="/rounds", tags=["attempts"])
attempts_router = APIRouter(prefix="/attempts", tags=["attempts"])
uploads_router = APIRouter(prefix="/uploads", tags=["attempts"])


@rounds_attempts_router.post(
    "/{round_id}/attempts", status_code=status.HTTP_201_CREATED, response_model=AttemptCreated
)
async def create_attempt(
    round_id: uuid.UUID,
    body: AttemptRequest,
    request: Request,
    user: CurrentUser,
    session: SessionDep,
) -> AttemptCreated:
    return await service.create_attempt(session, user, round_id, body, str(request.base_url))


@uploads_router.put("/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def upload_photo(
    token: str,
    request: Request,
    session: SessionDep,
    storage: StorageDep,
    content_type: Annotated[str | None, Header()] = None,
    content_length: Annotated[int | None, Header()] = None,
) -> Response:
    """Target of `upload_url`: raw image bytes in the body. The token in the path is the
    credential, so the client sends no Authorization header."""
    await service.receive_upload(
        session, storage, token, content_type, content_length, request.stream()
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
