from fastapi import APIRouter, Request, Response, status

from app.core.deps import CurrentUser, RedisDep, SessionDep
from app.modules.auth import service
from app.modules.auth.schemas import (
    AuthOut,
    LoginRequest,
    NicknameRequest,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    UserOut,
)

auth_router = APIRouter(prefix="/auth", tags=["auth"])
me_router = APIRouter(prefix="/me", tags=["me"])


def client_ip(request: Request) -> str:
    # Behind Caddy/Coolify the real address is the first X-Forwarded-For entry.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@auth_router.post("/register", status_code=status.HTTP_201_CREATED, response_model=AuthOut)
async def register(
    body: RegisterRequest, request: Request, session: SessionDep, redis: RedisDep
) -> AuthOut:
    await service.check_login_rate(redis, body.email, client_ip(request))
    return await service.register(session, body.email, body.password, body.ref_code)


@auth_router.post("/login", response_model=AuthOut)
async def login(
    body: LoginRequest, request: Request, session: SessionDep, redis: RedisDep
) -> AuthOut:
    await service.check_login_rate(redis, body.email, client_ip(request))
    return await service.login(session, body.email, body.password)


@auth_router.post("/refresh", response_model=AuthOut)
async def refresh_tokens(body: RefreshRequest, session: SessionDep) -> AuthOut:
    return await service.refresh(session, body.refresh)


@auth_router.post("/password-reset", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    body: PasswordResetRequest, request: Request, redis: RedisDep
) -> Response:
    # Demo build: no e-mail is sent. Same answer whether the address exists or not,
    # rate-limited so it cannot be used to probe addresses.
    await service.check_login_rate(redis, body.email, client_ip(request))
    return Response(status_code=status.HTTP_202_ACCEPTED)


@me_router.get("", response_model=UserOut)
async def get_me(user: CurrentUser, session: SessionDep) -> UserOut:
    return await service.user_out(session, user)


@me_router.put("/nickname", response_model=UserOut)
async def set_nickname(body: NicknameRequest, user: CurrentUser, session: SessionDep) -> UserOut:
    return await service.set_nickname(session, user, body.nickname)
