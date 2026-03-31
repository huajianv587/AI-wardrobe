from fastapi import APIRouter

from app.api.v1.endpoints import assets, auth, health, recommendations, wardrobe

router = APIRouter()
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(wardrobe.router)
router.include_router(recommendations.router)
router.include_router(assets.router)