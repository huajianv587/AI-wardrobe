from pathlib import Path

from pydantic import Field
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
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"])
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
    llm_recommender_api_url: str = ""
    image_processor_api_url: str = ""
    classifier_api_url: str = ""
    multimodal_reader_api_url: str = ""
    virtual_tryon_api_url: str = ""
    product_renderer_api_url: str = ""
    avatar_builder_api_url: str = ""


settings = Settings()
