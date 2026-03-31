from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.miniprogram import MiniProgramAccountResponse, MiniProgramHomeResponse, MiniProgramWardrobeResponse
from services import miniprogram_service

router = APIRouter(prefix="/mini-program", tags=["mini-program"])


@router.get("/home", response_model=MiniProgramHomeResponse)
def mini_program_home(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MiniProgramHomeResponse:
    return miniprogram_service.build_home_payload(db, current_user)


@router.get("/wardrobe", response_model=MiniProgramWardrobeResponse)
def mini_program_wardrobe(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MiniProgramWardrobeResponse:
    return miniprogram_service.build_wardrobe_payload(db, current_user)


@router.get("/account", response_model=MiniProgramAccountResponse)
def mini_program_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MiniProgramAccountResponse:
    return miniprogram_service.build_account_payload(db, current_user)
