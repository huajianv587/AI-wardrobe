from fastapi import APIRouter

from app.api.v1.endpoints import ai_demo, assets, auth, health, miniprogram, recommendations, sync, wardrobe

router = APIRouter()
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(wardrobe.router)
router.include_router(recommendations.router)
router.include_router(ai_demo.router)
router.include_router(sync.router)
router.include_router(miniprogram.router)
router.include_router(assets.router)
