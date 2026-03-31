from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    avatar_url: str | None = None
    created_at: datetime


class DemoLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary