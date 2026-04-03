from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    EmailPasswordAuthRequest,
    LogoutRequest,
    MiniProgramAuthOptionsResponse,
    OAuthStartResponse,
    PasswordResetRequest,
    RefreshSessionRequest,
    StatusMessageResponse,
    UserSummary,
    WeChatMiniLoginRequest,
)
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


@router.post("/sign-up", response_model=AuthSessionResponse)
def sign_up(payload: EmailPasswordAuthRequest, db: Session = Depends(get_db)) -> AuthSessionResponse:
    return auth_service.sign_up_with_password(db, payload.email, payload.password)


@router.post("/login", response_model=AuthSessionResponse)
def login(payload: EmailPasswordAuthRequest, db: Session = Depends(get_db)) -> AuthSessionResponse:
    return auth_service.sign_in_with_password(db, payload.email, payload.password)


@router.post("/password-reset", response_model=StatusMessageResponse)
def password_reset(payload: PasswordResetRequest) -> StatusMessageResponse:
    return auth_service.send_password_reset_email(payload.email, redirect_to=payload.redirect_to)


@router.get("/oauth/{provider}/start", response_model=OAuthStartResponse)
def oauth_start(provider: str, redirect_to: str | None = None) -> OAuthStartResponse:
    return auth_service.build_oauth_start_url(provider, redirect_to=redirect_to)


@router.post("/refresh", response_model=AuthSessionResponse)
def refresh(payload: RefreshSessionRequest, db: Session = Depends(get_db)) -> AuthSessionResponse:
    return auth_service.refresh_session(db, payload.refresh_token, access_token=payload.access_token)


@router.post("/logout", response_model=StatusMessageResponse)
def logout(
    payload: LogoutRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> StatusMessageResponse:
    if credentials and credentials.scheme.lower() == "bearer":
        auth_service.sign_out_session(credentials.credentials, payload.refresh_token)

    return StatusMessageResponse(status="signed_out", message="The local session can be cleared on this device.")


@router.get("/mini-program/options", response_model=MiniProgramAuthOptionsResponse)
def mini_program_auth_options() -> MiniProgramAuthOptionsResponse:
    return auth_service.get_mini_program_auth_options()


@router.post("/mini-program/login/wechat", response_model=AuthSessionResponse)
def mini_program_wechat_login(payload: WeChatMiniLoginRequest, db: Session = Depends(get_db)) -> AuthSessionResponse:
    return auth_service.sign_in_with_wechat_code(
        db,
        code=payload.code,
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
        device_label=payload.device_label,
    )


@router.get("/me", response_model=UserSummary)
def current_user(user: User = Depends(get_current_user)) -> UserSummary:
    return auth_service.build_user_summary(user)
