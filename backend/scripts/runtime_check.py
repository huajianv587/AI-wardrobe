from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable

import httpx
from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core import local_model
from core.config import settings
from db.session import engine


def _status(value: str) -> str:
    return "set" if str(value or "").strip() else "missing"


def _database_status() -> str:
    database_url = settings.database_url.strip()
    if not database_url:
        return "missing"
    if database_url.startswith("postgresql+psycopg://"):
        return "set(postgres)"
    if database_url.startswith("sqlite"):
        return "set(sqlite)"
    return "set(other)"


def _vllm_models_url() -> str | None:
    base_url = settings.vllm_base_url.strip().rstrip("/")
    if not base_url:
        return None
    if base_url.endswith("/v1"):
        return f"{base_url}/models"
    if base_url.endswith("/v1/models"):
        return base_url
    return f"{base_url}/v1/models"


def _probe_vllm() -> str:
    models_url = _vllm_models_url()
    if not models_url:
        return "not-configured"
    try:
        response = httpx.get(models_url, timeout=5.0)
        response.raise_for_status()
    except Exception:
        return "configured-but-unreachable"
    return "reachable"


def _sanitize_error(message: str) -> str:
    sanitized = message
    database_url = settings.database_url.strip()
    if database_url:
        sanitized = sanitized.replace(database_url, "[DATABASE_URL]")
    return sanitized


def _probe_database() -> tuple[str, str | None]:
    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
    except Exception:
        exc_type, exc, _ = __import__("sys").exc_info()
        detail = f"{exc_type.__name__}: {_sanitize_error(str(exc))}" if exc_type and exc else "Unknown database error"
        return "fail", detail
    return "ok", None


def _print_lines(lines: Iterable[tuple[str, str]]) -> None:
    for key, value in lines:
        print(f"{key}: {value}")


def _multimodal_mode_summary() -> str:
    if settings.vllm_base_url.strip():
        return "local-vllm-first"
    if settings.openai_api_key.strip() or settings.deepseek_api_key.strip():
        return "external-chain-first"
    return local_model.resolve_model_mode("multimodal_reader")


def main() -> None:
    _print_lines(
        [
            ("DATABASE_URL", _database_status()),
            ("SUPABASE_URL", _status(settings.supabase_url)),
            ("SUPABASE_ANON_KEY", _status(settings.supabase_anon_key)),
            ("SUPABASE_SERVICE_ROLE_KEY", _status(settings.supabase_service_role_key)),
            ("BACKEND_PUBLIC_BASE_URL", _status(settings.backend_public_base_url)),
            ("NEXT_PUBLIC_APP_URL", _status(settings.next_public_app_url)),
            ("VLLM_BASE_URL", _status(settings.vllm_base_url)),
            ("OPENAI_API_KEY", _status(settings.openai_api_key)),
            ("DEEPSEEK_API_KEY", _status(settings.deepseek_api_key)),
            ("LLM_RECOMMENDER_API_URL", _status(settings.llm_recommender_api_url)),
            ("LLM_RECOMMENDER_FALLBACK_API_URL", _status(settings.llm_recommender_fallback_api_url)),
            ("AI_CLEANUP_API_URL", _status(settings.ai_cleanup_api_url)),
            ("VIRTUAL_TRYON_API_URL", _status(settings.virtual_tryon_api_url)),
            ("VIRTUAL_TRYON_FALLBACK_API_URL", _status(settings.virtual_tryon_fallback_api_url)),
            ("SMTP_HOST", _status(settings.smtp_host)),
            ("SMTP_FROM_EMAIL", _status(settings.smtp_from_email)),
        ]
    )

    db_status, db_detail = _probe_database()
    print(f"DB_CONNECT: {db_status}")
    if db_detail:
        print(f"DB_ERROR: {db_detail}")
    print(f"VLLM_CONNECT: {_probe_vllm()}")
    print(f"LLM_RECOMMENDER_MODE: {local_model.resolve_model_mode('llm_recommender')}")
    print(f"IMAGE_CLEANUP_MODE: {local_model.resolve_model_mode('image_cleanup')}")
    print(f"MULTIMODAL_READER_MODE: {_multimodal_mode_summary()}")
    print(f"VIRTUAL_TRYON_MODE: {local_model.resolve_model_mode('virtual_tryon')}")


if __name__ == "__main__":
    main()
