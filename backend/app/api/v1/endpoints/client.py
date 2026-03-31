from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ai_demo import AiDemoWorkflow
from app.schemas.assistant import AssistantOverviewResponse, PackingRequest, PackingResponse, QuickModeRequest, ReminderResponse, TomorrowAssistantRequest, TomorrowAssistantResponse
from app.schemas.miniprogram import MiniProgramAccountResponse, MiniProgramHomeResponse, MiniProgramWardrobeResponse
from app.schemas.recommendation import RecommendationResponse
from services import ai_demo_service, assistant_service, miniprogram_service

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


@router.get("/assistant/overview", response_model=AssistantOverviewResponse)
def client_assistant_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> AssistantOverviewResponse:
    return assistant_service.build_overview(db, current_user)


@router.get("/assistant/reminders", response_model=ReminderResponse)
def client_assistant_reminders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ReminderResponse:
    return assistant_service.build_reminders(db, current_user)


@router.post("/assistant/quick-mode", response_model=RecommendationResponse)
def client_assistant_quick_mode(
    payload: QuickModeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecommendationResponse:
    return assistant_service.generate_quick_mode(db, current_user, payload)


@router.post("/assistant/tomorrow", response_model=TomorrowAssistantResponse)
def client_assistant_tomorrow(
    payload: TomorrowAssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TomorrowAssistantResponse:
    return assistant_service.generate_tomorrow_plan(db, current_user, payload)


@router.post("/assistant/packing", response_model=PackingResponse)
def client_assistant_packing(
    payload: PackingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PackingResponse:
    return assistant_service.generate_packing_plan(db, current_user, payload)
