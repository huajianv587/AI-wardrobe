from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_or_demo_user, get_db
from app.models.user import User
from app.schemas.try_on import TryOnRenderRequest, TryOnRenderResponse
from services import virtual_tryon_service

router = APIRouter(prefix="/try-on", tags=["try-on"])


@router.post("/render", response_model=TryOnRenderResponse)
def render_try_on(
    payload: TryOnRenderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
) -> TryOnRenderResponse:
    return virtual_tryon_service.render_try_on(db, current_user, payload)
