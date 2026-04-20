from __future__ import annotations

import socket
import time
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from core import local_model
from core.config import settings
from db.session import engine
from services import r2_storage_service, supabase_service, task_queue_service

router = APIRouter(tags=["health"])
_started_at = time.monotonic()


def _dependency_status() -> dict[str, dict]:
    r2_enabled = r2_storage_service.is_enabled()
    database_ok = True
    database_error = ""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        database_ok = False
        database_error = f"{type(exc).__name__}: {exc}"

    redis_ok = True
    redis_error = ""
    redis_url = settings.redis_url.strip()
    if redis_url:
        parsed = urlparse(redis_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        try:
            with socket.create_connection((host, port), timeout=settings.health_probe_timeout_seconds):
                pass
        except OSError as exc:
            redis_ok = False
            redis_error = f"{type(exc).__name__}: {exc}"

    storage_root = Path(settings.local_storage_root).resolve()
    storage_root_exists = storage_root.exists()
    storage_ready = r2_enabled or storage_root_exists
    task_queue_runtime = task_queue_service.describe_runtime()
    task_queue_enabled = bool(task_queue_runtime.get("enabled"))
    task_queue_eager = bool(task_queue_runtime.get("eager"))
    queue_connection_ok = bool(task_queue_runtime.get("connection_ok"))
    queue_workers = int(task_queue_runtime.get("active_workers") or 0)
    queue_ok = (
        not task_queue_enabled
        or task_queue_eager
        or (queue_connection_ok and queue_workers > 0)
    )
    if not task_queue_enabled:
        queue_detail = "disabled"
    elif task_queue_eager:
        queue_detail = "eager-inline"
    elif queue_connection_ok:
        queue_detail = f"redis ok, workers={queue_workers}"
    else:
        queue_detail = str(task_queue_runtime.get("error") or "queue unavailable")

    return {
        "database": {
            "ok": database_ok,
            "detail": "connected" if database_ok else database_error,
            "critical": True,
        },
        "redis": {
            "ok": redis_ok,
            "detail": "reachable" if redis_ok else redis_error,
            "critical": False,
        },
        "task_queue": {
            "ok": queue_ok,
            "detail": queue_detail,
            "critical": False,
            "runtime": task_queue_runtime,
        },
        "local_storage": {
            "ok": storage_ready,
            "detail": str(storage_root),
            "critical": not r2_enabled,
        },
        "supabase": {
            "ok": supabase_service.is_enabled(),
            "detail": "configured" if supabase_service.is_enabled() else "not configured",
            "critical": False,
        },
        "r2": {
            "ok": r2_enabled or storage_root_exists,
            "detail": r2_storage_service.describe_mode(),
            "critical": False,
        },
    }


def _base_payload() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.app_env,
        "uptime_seconds": round(time.monotonic() - _started_at, 2),
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
        "task_queue": task_queue_service.describe_runtime(),
    }


@router.get("/health")
def health_check() -> dict:
    payload = _base_payload()
    payload["dependencies"] = _dependency_status()
    return payload


@router.get("/health/live")
def health_live() -> dict:
    return _base_payload()


@router.get("/health/dependencies")
def health_dependencies() -> dict:
    return {
        "status": "ok",
        "dependencies": _dependency_status(),
    }


@router.get("/health/ready")
def health_ready() -> dict:
    dependencies = _dependency_status()
    failed = [name for name, status in dependencies.items() if status.get("critical") and not status["ok"]]
    if failed:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "degraded",
                "failed_dependencies": failed,
                "dependencies": dependencies,
            },
        )
    return {
        "status": "ready",
        "dependencies": dependencies,
    }
