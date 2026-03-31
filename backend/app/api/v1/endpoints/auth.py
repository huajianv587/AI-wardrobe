from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import AuthSessionResponse, EmailPasswordAuthRequest, UserSummary
from services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sign-up", response_model=AuthSessionResponse)
def sign_up(payload: EmailPasswordAuthRequest, db: Session = Depends(get_db)) -> AuthSessionResponse:
    return auth_service.sign_up_with_password(db, payload.email, payload.password)


@router.post("/login", response_model=AuthSessionResponse)
def login(payload: EmailPasswordAuthRequest, db: Session = Depends(get_db)) -> AuthSessionResponse:
    return auth_service.sign_in_with_password(db, payload.email, payload.password)


@router.get("/me", response_model=UserSummary)
def current_user(user: User = Depends(get_current_user)) -> UserSummary:
    return auth_service.build_user_summary(user)
