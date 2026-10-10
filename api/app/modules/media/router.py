import uuid

from fastapi import APIRouter, Response, status

from app.core.deps import CurrentUser, SessionDep
from app.modules.media import service
from app.modules.media.schemas import FeedOut

reels_router = APIRouter(prefix="/reels", tags=["reels"])


@reels_router.get("/feed", response_model=FeedOut)
async def get_reel_feed(
    user: CurrentUser, session: SessionDep, cursor: str | None = None
) -> FeedOut:
    return await service.feed(session, user, cursor)


@reels_router.post("/{reel_id}/views", status_code=status.HTTP_204_NO_CONTENT)
async def count_reel_view(reel_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> Response:
    await service.count_view(session, user, reel_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
