from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from services import recommendation_service, wardrobe_service

router = APIRouter(prefix="/outfits", tags=["recommendations"])


@router.post("/recommend", response_model=RecommendationResponse)
def recommend(payload: RecommendationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> RecommendationResponse:
    items = wardrobe_service.list_items(db, current_user.id)
    return recommendation_service.generate_recommendations(payload, items)
