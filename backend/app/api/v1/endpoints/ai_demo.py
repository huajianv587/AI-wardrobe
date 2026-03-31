from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ai_demo import AiDemoRunRequest, AiDemoRunResponse, AiDemoServiceStatus, AiDemoWorkflow
from services import ai_demo_service, wardrobe_service

router = APIRouter(prefix="/ai-demo", tags=["ai-demo"])


@router.get("/workflows", response_model=list[AiDemoWorkflow])
def list_workflows(_: User = Depends(get_current_user)) -> list[AiDemoWorkflow]:
    return ai_demo_service.list_workflows()


@router.get("/status", response_model=list[AiDemoServiceStatus])
def list_service_statuses(_: User = Depends(get_current_user)) -> list[AiDemoServiceStatus]:
    return ai_demo_service.list_service_statuses()


@router.post("/run", response_model=AiDemoRunResponse)
def run_workflow(payload: AiDemoRunRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> AiDemoRunResponse:
    wardrobe_count = len(wardrobe_service.list_items(db, current_user.id))

    try:
        return ai_demo_service.run_workflow(payload, current_user, wardrobe_count)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
