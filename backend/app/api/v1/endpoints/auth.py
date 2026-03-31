from datetime import datetime
from fastapi import APIRouter
from app.schemas.auth import DemoLoginResponse, UserSummary

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/demo-login", response_model=DemoLoginResponse)
def demo_login() -> DemoLoginResponse:
    return DemoLoginResponse(
        access_token="demo-token",
        user=UserSummary(id=1, email="demo@ai-wardrobe.dev", avatar_url=None, created_at=datetime.utcnow()),
    )