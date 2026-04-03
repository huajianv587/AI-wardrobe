from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_or_demo_user, get_db
from app.models.user import User
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from services import assistant_service

router = APIRouter(prefix="/outfits", tags=["recommendations"])


@router.post("/recommend", response_model=RecommendationResponse)
def recommend(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
) -> RecommendationResponse:
    return assistant_service.generate_recommendation(db, current_user, payload)
