from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from services import recommendation_service, wardrobe_service

router = APIRouter(prefix="/outfits", tags=["recommendations"])


@router.post("/recommend", response_model=RecommendationResponse)
def recommend(payload: RecommendationRequest, db: Session = Depends(get_db)) -> RecommendationResponse:
    items = wardrobe_service.list_items(db)
    return recommendation_service.generate_recommendations(payload, items)