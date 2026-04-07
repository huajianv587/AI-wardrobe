from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.sync import SyncRunResponse, SyncStatusResponse
from services import sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/status", response_model=SyncStatusResponse)
def sync_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> SyncStatusResponse:
    return sync_service.build_sync_status(db, current_user)


def _run_sync(db: Session, current_user: User) -> SyncRunResponse:
    return sync_service.sync_user_wardrobe(db, current_user)


@router.post("/wardrobe", response_model=SyncRunResponse)
def sync_wardrobe(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> SyncRunResponse:
    return _run_sync(db, current_user)


@router.post("/run", response_model=SyncRunResponse)
def sync_run(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> SyncRunResponse:
    return _run_sync(db, current_user)
