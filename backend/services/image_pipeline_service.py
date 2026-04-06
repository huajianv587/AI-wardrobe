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
    if mode == "local":
        return [
            {"key": "detect-person", "label": "人像定位", "status": "done"},
            {"key": "lock-user", "label": "主体锁定", "status": "done"},
            {"key": "segment-garment", "label": "服饰分割", "status": "done"},
            {"key": "render-white", "label": "白底图输出", "status": "done"},
        ]
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


def _piece_area(piece: dict) -> int:
    bbox = piece.get("bbox") or {}
    return max(1, int(bbox.get("w", 1))) * max(1, int(bbox.get("h", 1)))


def _piece_priority(piece: dict) -> tuple[int, int]:
    slot_order = {
        "dress": 0,
        "outerwear": 1,
        "top": 2,
        "bottom": 3,
        "shoes": 4,
        "accessory": 5,
    }
    slot = str(piece.get("slot") or "")
    return slot_order.get(slot, 6), -_piece_area(piece)


def _transparent_from_white_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    remapped = []
    for red, green, blue, alpha in rgba.getdata():
        if red >= 246 and green >= 246 and blue >= 246:
            remapped.append((red, green, blue, 0))
        else:
            remapped.append((red, green, blue, alpha))
    rgba.putdata(remapped)
    return rgba


def _render_subject_on_white(subject: Image.Image, item_id: int) -> tuple[bytes, str, str]:
    rgba = subject.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    trimmed = rgba.crop(bbox) if bbox else rgba
    canvas_width = max(trimmed.width + 140, 960)
    canvas_height = max(trimmed.height + 140, 960)
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (255, 255, 255, 255))
    scale = min((canvas_width - 140) / max(1, trimmed.width), (canvas_height - 140) / max(1, trimmed.height), 1.28)
    render = trimmed.copy()
    if scale != 1:
        resized = (
            max(1, int(render.width * scale)),
            max(1, int(render.height * scale)),
        )
        render = render.resize(resized, Image.LANCZOS)
    offset = ((canvas_width - render.width) // 2, (canvas_height - render.height) // 2)
    canvas.alpha_composite(render, offset)
    output = BytesIO()
    canvas.convert("RGB").save(output, format="PNG")
    return output.getvalue(), "image/png", f"item-{item_id}-processed.png"


def _local_cleanup_candidate(image: Image.Image) -> tuple[Image.Image | None, str, str, list[str]]:
    from services import fashion_decomposition_service, local_fashion_segmentation_service

    detections = fashion_decomposition_service._yolo_boxes(image)
    image_mode = fashion_decomposition_service._guess_image_mode(image)
    notes: list[str] = []

    if image_mode == "person-photo":
        pieces, segmentation_notes = local_fashion_segmentation_service.extract_person_photo_pieces(image, detections, "wardrobe cleanup")
        notes.extend(segmentation_notes)
        if pieces:
            piece = sorted(pieces, key=_piece_priority)[0]
            crop_region = fashion_decomposition_service._crop_box(image, piece["bbox"], padding_ratio=0.08)
            crop = image.crop(crop_region)
            masked = fashion_decomposition_service._masked_crop_from_region(crop, piece.get("mask"), crop_region)
            subject = masked if masked is not None else crop.convert("RGBA")
            provider = str(piece.get("segmentation_provider") or "SCHP / SAM2")
            notes.append("已从人物图中提取主体服饰，优先保留占比最高的可穿着单品。")
            return subject.convert("RGBA"), provider, "dominant-garment-local", notes

    seed_pieces = fashion_decomposition_service._flatlay_piece_boxes(image, "", detections)
    refined_pieces, segmentation_notes = local_fashion_segmentation_service.refine_seed_pieces_with_sam2(image, seed_pieces)
    notes.extend(segmentation_notes)
    candidate_pieces = refined_pieces or seed_pieces
    if candidate_pieces:
        piece = sorted(candidate_pieces, key=_piece_priority)[0]
        crop_region = fashion_decomposition_service._crop_box(image, piece["bbox"], padding_ratio=0.06)
        crop = image.crop(crop_region)
        masked = fashion_decomposition_service._masked_crop_from_region(crop, piece.get("mask"), crop_region)
        if masked is not None:
            notes.append("已使用本地分割模型输出带透明边界的服饰主体。")
            return masked.convert("RGBA"), str(piece.get("segmentation_provider") or "SAM2"), "garment-local", notes

    if fashion_decomposition_service._corner_brightness(image) >= 238:
        notes.append("没有取到完整掩码，已按浅色背景启发式去底。")
        return _transparent_from_white_background(image), "本地背景去除", "background-aware-local", notes

    return None, "", "preview-only", notes


def _call_local_cleanup(source: storage_service.LoadedAsset, item_id: int) -> CleanupResult | None:
    try:
        with Image.open(BytesIO(source.payload)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
    except Exception as exc:  # pragma: no cover - invalid image bytes
        logger.debug("Could not decode item %s for local cleanup: %s", item_id, exc)
        return None

    subject, provider, subject_mode, notes = _local_cleanup_candidate(image)
    if subject is None:
        return None

    payload, content_type, filename = _render_subject_on_white(subject, item_id)
    note = "本地视觉分割已完成白底图输出。"
    if notes:
        note = f"{note} {' '.join(notes)}"

    return CleanupResult(
        payload=payload,
        content_type=content_type,
        filename=filename,
        mode="local",
        note=note,
        tag="cleanup-local",
        provider=provider or "本地服饰分割",
        subject_mode=subject_mode,
        stages=_pipeline_stages("local"),
    )


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
    use_local_first = prefer_local or local_model.should_use_local_model("image_cleanup") or not settings.ai_cleanup_api_url

    if use_local_first:
        local_result = _call_local_cleanup(source, item_id)
        if local_result is not None:
            return local_result
        if settings.ai_cleanup_api_url and not prefer_local:
            try:
                return _call_remote_cleanup(source, item_id)
            except Exception as exc:
                logger.warning("External AI cleanup failed after local path for item %s: %s", item_id, exc)
        return _placeholder_cleanup(
            source,
            item_id,
            "本地真实分割链暂时没有成功产出结果，所以先回退成白底预览图。请检查 SAM2 / SCHP / YOLO 权重是否已下载。",
            "cleanup-fallback",
            mode="fallback",
        )

    if settings.ai_cleanup_api_url:
        try:
            return _call_remote_cleanup(source, item_id)
        except Exception as exc:
            logger.warning("External AI cleanup failed for item %s, trying local cleanup: %s", item_id, exc)
            local_result = _call_local_cleanup(source, item_id)
            if local_result is not None:
                local_result.note = f"远端抠图暂时不可用，已自动切回本地真实分割。 {local_result.note}"
                return local_result

    return _placeholder_cleanup(
        source,
        item_id,
        "AI cleanup fallback completed locally. 当前只输出白底预览图；请下载本地分割权重，或配置远端抠图 Worker，以启用真正的服饰分割。",
        "cleanup-placeholder",
    )
