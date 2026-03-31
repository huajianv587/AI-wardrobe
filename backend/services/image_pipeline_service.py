from __future__ import annotations

import base64
import logging
import mimetypes
from dataclasses import dataclass

import httpx

from core.config import settings
from services import storage_service

logger = logging.getLogger(__name__)


@dataclass
class CleanupResult:
    payload: bytes
    content_type: str
    filename: str
    mode: str
    note: str
    tag: str


def _extension_for_content_type(content_type: str, fallback_filename: str) -> str:
    guessed = mimetypes.guess_extension(content_type or "")
    if guessed:
        return guessed

    suffix = storage_service.safe_suffix_from_filename(fallback_filename)
    return suffix or ".png"


def _placeholder_cleanup(source: storage_service.LoadedAsset, item_id: int, note: str, tag: str) -> CleanupResult:
    extension = _extension_for_content_type(source.content_type, source.filename)
    return CleanupResult(
        payload=source.payload,
        content_type=source.content_type,
        filename=f"item-{item_id}-processed{extension}",
        mode="placeholder",
        note=note,
        tag=tag,
    )


def _parse_json_payload(payload: dict, source: storage_service.LoadedAsset) -> tuple[bytes, str]:
    if image_base64 := payload.get("image_base64"):
        content_type = payload.get("content_type") or source.content_type
        return base64.b64decode(image_base64), content_type

    if image_url := payload.get("image_url"):
        loaded = storage_service.load_asset_bytes(image_url)
        return loaded.payload, loaded.content_type

    raise ValueError("Cleanup service returned JSON without image_base64 or image_url.")


def _call_remote_cleanup(source: storage_service.LoadedAsset, item_id: int) -> CleanupResult:
    headers: dict[str, str] = {}
    if settings.ai_cleanup_api_key:
        headers["Authorization"] = f"Bearer {settings.ai_cleanup_api_key}"
        headers["X-API-Key"] = settings.ai_cleanup_api_key

    response = httpx.post(
        settings.ai_cleanup_api_url,
        files={"image": (source.filename, source.payload, source.content_type)},
        headers=headers,
        timeout=settings.ai_cleanup_timeout_seconds,
    )
    response.raise_for_status()

    content_type = response.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        payload, content_type = _parse_json_payload(response.json(), source)
    else:
        payload = response.content
        content_type = content_type if content_type.startswith("image/") else source.content_type

    extension = _extension_for_content_type(content_type, source.filename)
    return CleanupResult(
        payload=payload,
        content_type=content_type,
        filename=f"item-{item_id}-processed{extension}",
        mode="remote",
        note="AI cleanup completed via the configured external service.",
        tag="cleanup-remote",
    )


def process_item_image(item_id: int, image_url: str) -> CleanupResult:
    source = storage_service.load_asset_bytes(image_url)

    if settings.ai_cleanup_api_url:
        try:
            return _call_remote_cleanup(source, item_id)
        except Exception as exc:
            logger.warning("External AI cleanup failed for item %s, falling back to local placeholder: %s", item_id, exc)
            return _placeholder_cleanup(
                source,
                item_id,
                "External AI cleanup was unavailable, so a local placeholder asset was generated instead.",
                "cleanup-fallback",
            )

    return _placeholder_cleanup(
        source,
        item_id,
        "AI cleanup placeholder completed locally. Set AI_CLEANUP_API_URL to switch to a real cleanup service.",
        "cleanup-placeholder",
    )
