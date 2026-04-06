from __future__ import annotations

import base64
import logging
import mimetypes
from dataclasses import dataclass, field
from io import BytesIO

import httpx
from PIL import Image, ImageOps

from core import local_model
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
    provider: str
    subject_mode: str = "preview-only"
    stages: list[dict[str, str]] = field(default_factory=list)


def _extension_for_content_type(content_type: str, fallback_filename: str) -> str:
    guessed = mimetypes.guess_extension(content_type or "")
    if guessed:
        return guessed

    suffix = storage_service.safe_suffix_from_filename(fallback_filename)
    return suffix or ".png"


def _pipeline_stages(mode: str) -> list[dict[str, str]]:
    if mode == "remote":
        return [
            {"key": "detect-person", "label": "人像定位", "status": "done"},
            {"key": "lock-user", "label": "用户锁定", "status": "done"},
            {"key": "segment-garment", "label": "服饰分割", "status": "done"},
            {"key": "render-white", "label": "白底图输出", "status": "done"},
        ]
    if mode == "fallback":
        return [
            {"key": "detect-person", "label": "人像定位", "status": "fallback"},
            {"key": "lock-user", "label": "用户锁定", "status": "fallback"},
            {"key": "segment-garment", "label": "服饰分割", "status": "fallback"},
            {"key": "render-white", "label": "白底图输出", "status": "done"},
        ]
    return [
        {"key": "detect-person", "label": "人像定位", "status": "preview"},
        {"key": "lock-user", "label": "用户锁定", "status": "preview"},
        {"key": "segment-garment", "label": "服饰分割", "status": "preview"},
        {"key": "render-white", "label": "白底图输出", "status": "done"},
    ]


def _render_local_white_preview(source: storage_service.LoadedAsset, item_id: int) -> tuple[bytes, str, str]:
    try:
        with Image.open(BytesIO(source.payload)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGBA")

        canvas_width = max(image.width + 96, 960)
        canvas_height = max(image.height + 96, 960)
        canvas = Image.new("RGBA", (canvas_width, canvas_height), (255, 255, 255, 255))

        preview = image.copy()
        preview.thumbnail((canvas_width - 96, canvas_height - 96), Image.LANCZOS)
        offset = ((canvas_width - preview.width) // 2, (canvas_height - preview.height) // 2)
        canvas.alpha_composite(preview, offset)

        output = BytesIO()
        canvas.convert("RGB").save(output, format="PNG")
        return output.getvalue(), "image/png", f"item-{item_id}-processed.png"
    except Exception as exc:  # pragma: no cover - invalid or non-image bytes
        logger.debug("Could not render local white preview for item %s, reusing original bytes: %s", item_id, exc)
        extension = _extension_for_content_type(source.content_type, source.filename)
        return source.payload, source.content_type, f"item-{item_id}-processed{extension}"


def _placeholder_cleanup(source: storage_service.LoadedAsset, item_id: int, note: str, tag: str, *, mode: str = "placeholder") -> CleanupResult:
    payload, content_type, filename = _render_local_white_preview(source, item_id)
    return CleanupResult(
        payload=payload,
        content_type=content_type,
        filename=filename,
        mode=mode,
        note=note,
        tag=tag,
        provider="本地白底预览",
        subject_mode="preview-only",
        stages=_pipeline_stages("fallback" if mode == "fallback" else "placeholder"),
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
    provider = "外部用户服饰抠图 Worker"
    subject_mode = "auto-user-match"
    stages = _pipeline_stages("remote")

    if content_type.startswith("application/json"):
        response_payload = response.json()
        payload, content_type = _parse_json_payload(response_payload, source)
        provider = str(response_payload.get("provider") or provider)
        subject_mode = str(response_payload.get("subject_mode") or subject_mode)
        if isinstance(response_payload.get("stages"), list):
            stages = [
                {
                    "key": str(entry.get("key") or ""),
                    "label": str(entry.get("label") or entry.get("key") or ""),
                    "status": str(entry.get("status") or "done"),
                }
                for entry in response_payload["stages"]
                if isinstance(entry, dict)
            ] or stages
    else:
        payload = response.content
        content_type = content_type if content_type.startswith("image/") else source.content_type

    extension = _extension_for_content_type(content_type, source.filename)
    return CleanupResult(
        payload=payload,
        content_type=content_type,
        filename=f"item-{item_id}-processed{extension}",
        mode="remote",
        note="AI cleanup completed via the configured external service. 远端流水线应先定位人物、锁定用户，再输出服饰白底图。",
        tag="cleanup-remote",
        provider=provider,
        subject_mode=subject_mode,
        stages=stages,
    )


def process_item_image(item_id: int, image_url: str, *, prefer_local: bool = False) -> CleanupResult:
    source = storage_service.load_asset_bytes(image_url)

    if not prefer_local and not local_model.should_use_local_model("image_cleanup") and settings.ai_cleanup_api_url:
        try:
            return _call_remote_cleanup(source, item_id)
        except Exception as exc:
            logger.warning("External AI cleanup failed for item %s, falling back to local placeholder: %s", item_id, exc)
            return _placeholder_cleanup(
                source,
                item_id,
                "External AI cleanup was unavailable, so a local placeholder asset was generated instead. 当前回退为本地白底预览图。",
                "cleanup-fallback",
                mode="fallback",
            )

    return _placeholder_cleanup(
        source,
        item_id,
        "AI cleanup placeholder completed locally. 当前仅生成本地白底预览图；如需自动识别用户并只抠出用户身上服饰，请配置远端抠图 Worker。",
        "cleanup-placeholder",
    )
