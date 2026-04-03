from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supabase_user_id: str | None = None
    email: EmailStr
    display_name: str | None = None
    auth_provider: str | None = None
    avatar_url: str | None = None
    created_at: datetime


class EmailPasswordAuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RefreshSessionRequest(BaseModel):
    refresh_token: str = Field(min_length=8)
    access_token: str | None = None


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class PasswordResetRequest(BaseModel):
    email: EmailStr
    redirect_to: str | None = None


class StatusMessageResponse(BaseModel):
    status: str
    message: str


class OAuthStartResponse(BaseModel):
    provider: str
    url: str


class AuthSessionResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: int | None = None
    expires_in: int | None = None
    token_type: str = "bearer"
    requires_email_confirmation: bool = False
    message: str | None = None
    user: UserSummary


class MiniProgramAuthOptionsResponse(BaseModel):
    wechat_login_enabled: bool
    wechat_test_mode: bool
    email_test_login_enabled: bool
    wechat_app_id: str | None = None
    request_domain: str | None = None
    upload_domain: str | None = None
    socket_domain: str | None = None


class WeChatMiniLoginRequest(BaseModel):
    code: str = Field(min_length=2)
    display_name: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = Field(default=None, max_length=500)
    device_label: str | None = Field(default="wechat-mini-program", max_length=120)
