from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supabase_user_id: str | None = None
    email: EmailStr
    avatar_url: str | None = None
    created_at: datetime


class EmailPasswordAuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class AuthSessionResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: int | None = None
    expires_in: int | None = None
    token_type: str = "bearer"
    requires_email_confirmation: bool = False
    message: str | None = None
    user: UserSummary
