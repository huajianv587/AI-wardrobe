from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.assistant import (
    AssistantOverviewResponse,
    AssistantTaskResponse,
    ClosetGapResponse,
    GeoLocationOption,
    MemoryCardEnvelope,
    PackingRequest,
    PackingResponse,
    QuickModeRequest,
    RecommendationSignalPayload,
    ReminderResponse,
    SavedOutfitPayload,
    SavedOutfitResponse,
    StatusMessageResponse,
    StyleProfilePayload,
    StyleProfileResponse,
    TomorrowAssistantRequest,
    TomorrowAssistantResponse,
    WearLogPayload,
    WearLogResponse,
)
from app.schemas.recommendation import RecommendationResponse
from app.schemas.wardrobe import ClothingMemoryCardCreate
from services import assistant_service

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/overview", response_model=AssistantOverviewResponse)
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssistantOverviewResponse:
    return assistant_service.build_overview(db, current_user)


@router.get("/location-search", response_model=list[GeoLocationOption])
def search_locations(
    q: str = Query(min_length=2),
    _: User = Depends(get_current_user),
) -> list[GeoLocationOption]:
    return assistant_service.search_locations(q)


@router.post("/tomorrow", response_model=TomorrowAssistantResponse)
def tomorrow_assistant(
    payload: TomorrowAssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TomorrowAssistantResponse:
    return assistant_service.generate_tomorrow_plan(db, current_user, payload)


@router.post("/quick-mode", response_model=RecommendationResponse)
def quick_mode(
    payload: QuickModeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecommendationResponse:
    return assistant_service.generate_quick_mode(db, current_user, payload)


@router.get("/gaps", response_model=ClosetGapResponse)
def gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClosetGapResponse:
    return assistant_service.build_gap_overview(db, current_user)


@router.get("/reminders", response_model=ReminderResponse)
def reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReminderResponse:
    return assistant_service.build_reminders(db, current_user)


@router.get("/style-profile", response_model=StyleProfileResponse)
def style_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StyleProfileResponse:
    return assistant_service.get_style_profile(db, current_user)


@router.put("/style-profile", response_model=StyleProfileResponse)
def update_style_profile(
    payload: StyleProfilePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StyleProfileResponse:
    return assistant_service.update_style_profile(db, current_user, payload)


@router.get("/items/{item_id}/memory-card", response_model=MemoryCardEnvelope)
def get_memory_card(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MemoryCardEnvelope:
    return assistant_service.get_memory_card(db, item_id, current_user)


@router.put("/items/{item_id}/memory-card", response_model=MemoryCardEnvelope)
def put_memory_card(
    item_id: int,
    payload: ClothingMemoryCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MemoryCardEnvelope:
    return assistant_service.upsert_memory_card(db, item_id, current_user, payload.model_dump())


@router.post("/feedback", response_model=StatusMessageResponse)
def feedback(
    payload: RecommendationSignalPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StatusMessageResponse:
    return assistant_service.record_feedback(db, current_user, payload)


@router.get("/outfits", response_model=list[SavedOutfitResponse])
def list_saved_outfits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SavedOutfitResponse]:
    return assistant_service.list_saved_outfits(db, current_user)


@router.post("/outfits", response_model=SavedOutfitResponse)
def save_outfit(
    payload: SavedOutfitPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SavedOutfitResponse:
    return assistant_service.save_outfit(db, current_user, payload)


@router.get("/wear-log", response_model=list[WearLogResponse])
def wear_log(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WearLogResponse]:
    return assistant_service.list_wear_logs(db, current_user)


@router.post("/wear-log", response_model=WearLogResponse)
def create_wear_log(
    payload: WearLogPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WearLogResponse:
    return assistant_service.create_wear_log(db, current_user, payload)


@router.post("/packing", response_model=PackingResponse)
def packing(
    payload: PackingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PackingResponse:
    return assistant_service.generate_packing_plan(db, current_user, payload)


@router.get("/tasks/{task_id}", response_model=AssistantTaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssistantTaskResponse:
    return assistant_service.get_task(db, task_id, current_user)
