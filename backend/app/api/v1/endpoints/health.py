from fastapi import APIRouter
from core.config import settings
from services import supabase_service

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.app_env,
        "model_training_dir": settings.model_training_dir,
        "storage_mode": supabase_service.describe_mode(),
        "supabase_configured": supabase_service.is_enabled(),
        "supabase_storage_bucket": settings.supabase_storage_bucket,
        "ai_cleanup_mode": "remote" if settings.ai_cleanup_api_url else "placeholder",
    }
