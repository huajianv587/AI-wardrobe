from __future__ import annotations

from core.config import settings

LOCAL_MODEL_DEFAULT = True

LOCAL_MODEL_SWITCHES: dict[str, bool] = {
    "llm_recommender": False,
    "image_cleanup": False,
    "classifier": False,
    "multimodal_reader": False,
    "virtual_tryon": False,
    "product_renderer": False,
    "avatar_builder": False,
}

FEATURE_ALIASES: dict[str, str] = {
    "llm-recommender": "llm_recommender",
    "image-processor": "image_cleanup",
    "image_cleanup": "image_cleanup",
    "classifier": "classifier",
    "multimodal-reader": "multimodal_reader",
    "virtual-tryon": "virtual_tryon",
    "product-renderer": "product_renderer",
    "avatar-builder": "avatar_builder",
}

FEATURE_ENV_MAP: dict[str, str] = {
    "llm_recommender": "model_use_local_llm_recommender",
    "image_cleanup": "model_use_local_image_cleanup",
    "classifier": "model_use_local_classifier",
    "multimodal_reader": "model_use_local_multimodal_reader",
    "virtual_tryon": "model_use_local_virtual_tryon",
    "product_renderer": "model_use_local_product_renderer",
    "avatar_builder": "model_use_local_avatar_builder",
}

FEATURE_REMOTE_URL_MAP: dict[str, str] = {
    "llm_recommender": "llm_recommender_api_url",
    "image_cleanup": "ai_cleanup_api_url",
    "classifier": "classifier_api_url",
    "multimodal_reader": "multimodal_reader_api_url",
    "virtual_tryon": "virtual_tryon_api_url",
    "product_renderer": "product_renderer_api_url",
    "avatar_builder": "avatar_builder_api_url",
}


def normalize_feature(feature: str) -> str:
    canonical = feature.strip().replace("-", "_")
    return FEATURE_ALIASES.get(canonical, canonical)


def should_use_local_model(feature: str) -> bool:
    normalized = normalize_feature(feature)
    python_default = LOCAL_MODEL_SWITCHES.get(normalized, settings.model_use_local_default or LOCAL_MODEL_DEFAULT)
    env_attr = FEATURE_ENV_MAP.get(normalized)
    if env_attr:
        env_override = getattr(settings, env_attr)
        if env_override is not None:
            return bool(env_override)

    return python_default


def get_remote_worker_url(feature: str) -> str | None:
    normalized = normalize_feature(feature)
    attr = FEATURE_REMOTE_URL_MAP.get(normalized)
    if not attr:
        return None

    value = getattr(settings, attr, "")
    return value.strip() or None


def resolve_model_mode(feature: str) -> str:
    if should_use_local_model(feature):
        return "local-forced"
    if get_remote_worker_url(feature):
        return "remote-preferred"
    return "local-fallback"
