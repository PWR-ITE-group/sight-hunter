import uuid

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, RedisDep, SessionDep
from app.modules.social import service
from app.modules.social.schemas import CommentOut, CommentRequest, CommentsOut, ShareLinkOut

social_router = APIRouter(tags=["social"])


@social_router.get("/reels/{reel_id}/comments", response_model=CommentsOut)
async def list_comments(
    reel_id: uuid.UUID, user: CurrentUser, session: SessionDep, cursor: str | None = None
) -> CommentsOut:
    return await service.list_comments(session, reel_id, cursor)


@social_router.post(
    "/reels/{reel_id}/comments", status_code=status.HTTP_201_CREATED, response_model=CommentOut
)
async def add_comment(
    reel_id: uuid.UUID,
    body: CommentRequest,
    user: CurrentUser,
    session: SessionDep,
    redis: RedisDep,
) -> CommentOut:
    return await service.add_comment(session, redis, user, reel_id, body.text)


@social_router.get("/tasks/{task_id}/share-link", response_model=ShareLinkOut)
async def get_share_link(
    task_id: uuid.UUID, user: CurrentUser, session: SessionDep
) -> ShareLinkOut:
    return await service.share_link(session, user, task_id)
