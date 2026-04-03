from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ROOT_ENV_FILE), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Wardrobe API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./data/ai_wardrobe.db"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"],
        validation_alias=AliasChoices("CORS_ORIGINS", "BACKEND_CORS_ORIGINS"),
    )
    local_storage_root: str = "./data/assets"
    model_training_dir: str = "../model_training"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "wardrobe-assets"
    supabase_sync_table: str = "clothing_items"
    redis_url: str = "redis://localhost:6379/0"
    ai_cleanup_api_url: str = ""
    ai_cleanup_api_key: str = ""
    ai_cleanup_timeout_seconds: float = 45.0
    ai_demo_adapter_timeout_seconds: float = 8.0
    vllm_base_url: str = ""
    qwen_model_name: str = "Qwen2.5-7B-Instruct"
    next_public_app_url: str = "http://localhost:3000"
    backend_public_base_url: str = "http://localhost:8000"
    llm_recommender_api_url: str = ""
    image_processor_api_url: str = ""
    classifier_api_url: str = ""
    multimodal_reader_api_url: str = ""
    virtual_tryon_api_url: str = ""
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


settings = Settings()
