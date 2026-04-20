import os
import re
from pathlib import Path
from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

WINDOWS_DRIVE_PATH_RE = re.compile(r"^[A-Za-z]:[/\\\\]")
LOCAL_DEV_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
]


def _discover_root_dir(config_path: Path | None = None) -> Path:
    resolved_config = (config_path or Path(__file__)).resolve()
    backend_dir = resolved_config.parents[1]
    repo_root = backend_dir.parent

    repo_markers = (
        repo_root / "frontend",
        repo_root / "infra",
        repo_root / ".git",
        repo_root / "README.md",
    )
    if any(marker.exists() for marker in repo_markers):
        return repo_root
    return backend_dir


ROOT_DIR = _discover_root_dir()
ROOT_ENV_FILE = ROOT_DIR / ".env"


def _resolve_env_files() -> tuple[str, ...]:
    forced_env_file = os.getenv("AI_WARDROBE_ENV_FILE", "").strip()
    requested_env = os.getenv("APP_ENV", "").strip().lower()
    aliases = {
        "prod": "production",
        "production": "production",
        "stage": "staging",
        "staging": "staging",
        "test": "test",
        "testing": "test",
        "dev": "development",
        "development": "development",
    }

    if forced_env_file:
        forced_path = Path(forced_env_file)
        return (str(forced_path if forced_path.is_absolute() else ROOT_DIR / forced_path),)

    candidates: list[Path] = []
    normalized_env = aliases.get(requested_env, requested_env)

    if normalized_env == "test":
        candidates.extend(
            [
                ROOT_DIR / ".env.test",
                ROOT_DIR / ".env.test.local",
            ]
        )
    else:
        candidates.extend(
            [
                ROOT_DIR / ".env",
                ROOT_DIR / ".env.local",
            ]
        )
        if normalized_env:
            candidates.extend(
                [
                    ROOT_DIR / f".env.{normalized_env}",
                    ROOT_DIR / f".env.{normalized_env}.local",
                ]
            )

    resolved: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        normalized = str(candidate)
        if normalized not in seen:
            seen.add(normalized)
            resolved.append(normalized)
    return tuple(resolved)


def _resolve_project_path(value: str) -> str:
    candidate = Path(str(value)).expanduser()
    resolved = candidate if candidate.is_absolute() else ROOT_DIR / candidate
    return str(resolved.resolve())


def _resolve_database_url(value: str) -> str:
    normalized = str(value or "").strip()
    sqlite_prefix = "sqlite:///"
    if not normalized.startswith(sqlite_prefix):
        return normalized

    raw_path = normalized[len(sqlite_prefix) :]
    if not raw_path or raw_path == ":memory:":
        return normalized
    if raw_path.startswith("/") or WINDOWS_DRIVE_PATH_RE.match(raw_path):
        return normalized

    resolved = (ROOT_DIR / Path(raw_path).expanduser()).resolve()
    return f"{sqlite_prefix}{resolved.as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_resolve_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Wardrobe API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./data/ai_wardrobe.db"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"],
        validation_alias=AliasChoices("CORS_ORIGINS", "BACKEND_CORS_ORIGINS"),
    )
    local_storage_root: str = "./data/assets"
    model_training_dir: str = "../model_training"
    fashion_model_root: str = "./data/models/fashion"
    fashion_detector_weights: str = ""
    fashion_sam2_checkpoint: str = ""
    fashion_sam2_config: str = ""
    fashion_schp_checkpoint: str = ""
    fashion_schp_repo: str = ""
    fashion_clip_model_id: str = "patrickjohncyh/fashion-clip"
    fashion_multimodal_timeout_seconds: float = 35.0
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "wardrobe-assets"
    supabase_sync_table: str = "clothing_items"
    r2_account_id: str = ""
    r2_bucket: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_endpoint_url: str = ""
    r2_public_base_url: str = ""
    r2_region: str = "auto"
    r2_presign_expires_seconds: int = 900
    redis_url: str = "redis://localhost:6379/0"
    ai_cleanup_api_url: str = ""
    ai_cleanup_api_key: str = ""
    ai_cleanup_timeout_seconds: float = 45.0
    ai_demo_adapter_timeout_seconds: float = 8.0
    multimodal_request_timeout_seconds: float = 20.0
    vllm_base_url: str = ""
    qwen_model_name: str = "Qwen2.5-7B-Instruct"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_multimodal_model: str = "gpt-4.1-mini"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_multimodal_model: str = "deepseek-chat"
    next_public_app_url: str = "http://localhost:3000"
    backend_public_base_url: str = "http://localhost:8000"
    llm_recommender_api_url: str = ""
    llm_recommender_api_key: str = ""
    llm_recommender_model_name: str = ""
    llm_recommender_fallback_api_url: str = ""
    llm_recommender_fallback_api_key: str = ""
    llm_recommender_fallback_model_name: str = ""
    image_processor_api_url: str = ""
    classifier_api_url: str = ""
    multimodal_reader_api_url: str = ""
    virtual_tryon_api_url: str = ""
    virtual_tryon_api_key: str = ""
    virtual_tryon_fallback_api_url: str = ""
    virtual_tryon_fallback_api_key: str = ""
    virtual_tryon_replicate_version: str = ""
    virtual_tryon_replicate_input_template: str = ""
    virtual_tryon_poll_timeout_seconds: float = 300.0
    virtual_tryon_poll_interval_seconds: float = 2.0
    product_renderer_api_url: str = ""
    avatar_builder_api_url: str = ""
    model_use_local_default: bool = True
    model_use_local_llm_recommender: bool | None = None
    model_use_local_image_cleanup: bool | None = None
    model_use_local_classifier: bool | None = None
    model_use_local_multimodal_reader: bool | None = None
    model_use_local_virtual_tryon: bool | None = None
    model_use_local_product_renderer: bool | None = None
    model_use_local_avatar_builder: bool | None = None
    wechat_miniprogram_app_id: str = ""
    wechat_miniprogram_app_secret: str = ""
    wechat_miniprogram_login_enabled: bool = False
    wechat_miniprogram_test_mode: bool = True
    wechat_miniprogram_request_domain: str = ""
    wechat_miniprogram_upload_domain: str = ""
    wechat_miniprogram_socket_domain: str = ""
    wechat_code2session_base_url: str = "https://api.weixin.qq.com"
    local_access_token_ttl_minutes: int = 120
    local_refresh_token_ttl_days: int = 30
    local_password_reset_ttl_minutes: int = 30
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "AI Wardrobe"
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    log_level: str = "INFO"
    log_json: bool = False
    alert_webhook_url: str = ""
    alert_email_to: str = ""
    alert_email_subject_prefix: str = "[AI Wardrobe Alert]"
    alert_on_uncaught_exceptions: bool = True
    alert_dedupe_window_seconds: int = 900
    health_probe_timeout_seconds: float = 5.0
    rate_limit_enabled: bool = True
    rate_limit_use_redis: bool = True
    rate_limit_redis_prefix: str = "ai-wardrobe:ratelimit"
    rate_limit_default_requests: int = 240
    rate_limit_default_window_seconds: int = 60
    rate_limit_auth_requests: int = 20
    rate_limit_auth_window_seconds: int = 300
    rate_limit_heavy_requests: int = 24
    rate_limit_heavy_window_seconds: int = 300
    task_queue_enabled: bool = True
    task_queue_eager: bool = False
    task_queue_result_ttl_seconds: int = 1800
    task_queue_default_timeout_seconds: int = 900
    task_queue_image_cleanup_timeout_seconds: int = 1200
    task_queue_smart_timeout_seconds: int = 1500
    task_queue_queue_prefix: str = "ai-wardrobe"
    task_queue_image_cleanup_name: str = "image_cleanup"
    task_queue_smart_default_name: str = "smart_default"
    task_queue_smart_priority_name: str = "smart_priority"
    expo_public_api_base_url: str = ""
    expo_project_id: str = ""
    ios_bundle_id: str = ""
    android_package_name: str = ""
    app_store_display_name: str = "AI Wardrobe"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                return [entry.strip() for entry in stripped.strip("[]").replace('"', "").split(",") if entry.strip()]
            return [entry.strip() for entry in stripped.split(",") if entry.strip()]
        return value

    @field_validator("cors_origins", mode="after")
    @classmethod
    def append_local_dev_cors_origins(cls, value: list[str]) -> list[str]:
        merged: list[str] = []
        for origin in [*(value or []), *LOCAL_DEV_CORS_ORIGINS]:
            normalized = origin.strip()
            if normalized and normalized not in merged:
                merged.append(normalized)
        return merged

    @field_validator("database_url", mode="before")
    @classmethod
    def resolve_database_url(cls, value: str) -> str:
        return _resolve_database_url(value)

    @field_validator("local_storage_root", "model_training_dir", "fashion_model_root", mode="before")
    @classmethod
    def resolve_project_relative_paths(cls, value: str) -> str:
        return _resolve_project_path(value)

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        return str(value or "INFO").strip().upper()


settings = Settings()
