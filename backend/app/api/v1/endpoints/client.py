from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ai_demo import AiDemoWorkflow
from app.schemas.miniprogram import MiniProgramAccountResponse, MiniProgramHomeResponse, MiniProgramWardrobeResponse
from services import ai_demo_service, miniprogram_service

router = APIRouter(prefix="/client", tags=["client"])


@router.get("/bootstrap", response_model=MiniProgramHomeResponse)
def client_bootstrap(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MiniProgramHomeResponse:
    return miniprogram_service.build_home_payload(db, current_user)


@router.get("/wardrobe", response_model=MiniProgramWardrobeResponse)
def client_wardrobe(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MiniProgramWardrobeResponse:
    return miniprogram_service.build_wardrobe_payload(db, current_user)


@router.get("/account", response_model=MiniProgramAccountResponse)
def client_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MiniProgramAccountResponse:
    return miniprogram_service.build_account_payload(db, current_user)


@router.get("/ai/workflows", response_model=list[AiDemoWorkflow])
def client_ai_workflows(_: User = Depends(get_current_user)) -> list[AiDemoWorkflow]:
    return ai_demo_service.list_workflows()
