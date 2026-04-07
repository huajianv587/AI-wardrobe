from fastapi import APIRouter
from core import local_model
from core.config import settings
from services import r2_storage_service, supabase_service

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.app_env,
        "model_training_dir": settings.model_training_dir,
        "storage_mode": r2_storage_service.describe_mode(),
        "asset_storage_mode": r2_storage_service.describe_mode(),
        "r2_configured": r2_storage_service.is_enabled(),
        "r2_bucket": r2_storage_service.configured_bucket(),
        "supabase_configured": supabase_service.is_enabled(),
        "supabase_sync_table": settings.supabase_sync_table,
        "ai_cleanup_mode": "remote" if settings.ai_cleanup_api_url else "placeholder",
        "runtime_modes": {
            "llm_recommender": local_model.resolve_model_mode("llm_recommender"),
            "image_cleanup": local_model.resolve_model_mode("image_cleanup"),
            "virtual_tryon": local_model.resolve_model_mode("virtual_tryon"),
        },
    }
