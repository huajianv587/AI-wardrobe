from __future__ import annotations

import base64
import json
import time
from datetime import datetime
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.wardrobe import ClothingItem
from app.schemas.try_on import TryOnLookItem, TryOnRenderRequest, TryOnRenderResponse
from core import local_model
from core.config import settings
from services import storage_service, wardrobe_service

DEFAULT_REPLICATE_INPUT_TEMPLATE = {
    "human_img": "{{person_image_url}}",
    "garm_img": "{{primary_garment_url}}",
    "garment_des": "{{prompt_or_scene}}",
    "category": "{{replicate_category}}",
    "crop": False,
    "force_dc": "{{replicate_force_dc}}",
}
REPLICATE_TERMINAL_SUCCESS = {"succeeded"}
REPLICATE_TERMINAL_FAILURE = {"failed", "canceled", "aborted"}


def _look_items_from_ids(db: Session, user: User, item_ids: list[int]) -> list[ClothingItem]:
    items: list[ClothingItem] = []
    for item_id in item_ids:
        try:
            items.append(wardrobe_service.get_item(db, item_id, user.id))
        except HTTPException:
            continue
    return items


def _item_image_url(item: ClothingItem) -> str | None:
    return item.processed_image_url or item.image_url


def _ensure_external_image_url(
    image_url: str | None,
    *,
    relative_directory: str,
    fallback_filename: str,
) -> str | None:
    if not image_url:
        return None
    if image_url.startswith(("http://", "https://")):
        return image_url
    if backup_url := storage_service.public_backup_url_for_asset(image_url):
        return backup_url

    loaded = storage_service.load_asset_bytes(image_url)
    suffix = Path(loaded.filename).suffix or ".png"
    filename = fallback_filename if Path(fallback_filename).suffix else f"{fallback_filename}{suffix}"
    stored = storage_service.save_generated_asset(relative_directory, filename, loaded.payload, loaded.content_type)
    return stored.backup_url or storage_service.public_backup_url_for_asset(stored.url) or stored.url


def _remote_item_image_url(item: ClothingItem) -> str | None:
    return _ensure_external_image_url(
        _item_image_url(item),
        relative_directory="tryon/remote-inputs/garment",
        fallback_filename=f"item-{item.id or 'garment'}.png",
    )


def _open_image(image_url: str | None) -> Image.Image | None:
    if not image_url:
        return None
    loaded = storage_service.load_asset_bytes(image_url)
    with Image.open(BytesIO(loaded.payload)) as opened:
        return ImageOps.exif_transpose(opened).convert("RGBA")


def _transparentize_light_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    remapped = []
    for red, green, blue, alpha in rgba.getdata():
        if red >= 246 and green >= 246 and blue >= 246:
            remapped.append((red, green, blue, 0))
        else:
            remapped.append((red, green, blue, alpha))
    rgba.putdata(remapped)
    return rgba


def _trim_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def _background_canvas() -> Image.Image:
    width, height = 1024, 1366
    canvas = Image.new("RGBA", (width, height), (249, 244, 238, 255))
    draw = ImageDraw.Draw(canvas)
    for index, color in enumerate(((255, 248, 241, 255), (244, 226, 212, 255), (232, 214, 205, 255))):
        margin = 40 + index * 52
        draw.rounded_rectangle(
            (margin, margin + 30, width - margin, height - margin),
            radius=48 + index * 14,
            fill=color,
        )
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((180, 160, 840, 980), fill=(255, 236, 220, 210))
    glow = glow.filter(ImageFilter.GaussianBlur(72))
    canvas.alpha_composite(glow)
    return canvas


def _mannequin_silhouette(size: tuple[int, int]) -> Image.Image:
    width, height = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    tone = (206, 186, 175, 135)
    draw.ellipse((width * 0.39, height * 0.12, width * 0.61, height * 0.26), fill=tone)
    draw.rounded_rectangle((width * 0.32, height * 0.25, width * 0.68, height * 0.84), radius=220, fill=(247, 239, 231, 112), outline=(210, 188, 173, 160), width=6)
    draw.rounded_rectangle((width * 0.22, height * 0.31, width * 0.78, height * 0.41), radius=160, fill=(244, 233, 224, 96))
    draw.rounded_rectangle((width * 0.38, height * 0.82, width * 0.62, height * 0.93), radius=80, fill=(238, 224, 214, 96))
    return layer.filter(ImageFilter.GaussianBlur(0.3))


def _slot_box(slot: str, canvas_size: tuple[int, int]) -> tuple[int, int, int, int]:
    width, height = canvas_size
    boxes = {
        "outerwear": (int(width * 0.24), int(height * 0.20), int(width * 0.76), int(height * 0.64)),
        "dress": (int(width * 0.27), int(height * 0.23), int(width * 0.73), int(height * 0.82)),
        "top": (int(width * 0.28), int(height * 0.22), int(width * 0.72), int(height * 0.52)),
        "bottom": (int(width * 0.31), int(height * 0.48), int(width * 0.69), int(height * 0.86)),
        "shoes": (int(width * 0.27), int(height * 0.84), int(width * 0.73), int(height * 0.97)),
        "accessory": (int(width * 0.58), int(height * 0.43), int(width * 0.82), int(height * 0.73)),
    }
    return boxes.get(slot, boxes["top"])


def _place_overlay(canvas: Image.Image, overlay: Image.Image, slot: str) -> None:
    left, top, right, bottom = _slot_box(slot, canvas.size)
    target_width = max(1, right - left)
    target_height = max(1, bottom - top)
    render = _trim_alpha(_transparentize_light_background(overlay))
    render.thumbnail((target_width, target_height), Image.LANCZOS)
    offset_x = left + (target_width - render.width) // 2
    offset_y = top + (target_height - render.height) // 2
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (offset_x + 14, offset_y + 18, offset_x + render.width + 14, offset_y + render.height + 18),
        radius=32,
        fill=(52, 34, 21, 26),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(render, (offset_x, offset_y))


def _serialize_items(items: list[ClothingItem], extra_urls: list[str]) -> list[TryOnLookItem]:
    payload = [
        TryOnLookItem(
            item_id=item.id,
            name=item.name,
            slot=item.slot,
            image_url=_item_image_url(item),
        )
        for item in items
    ]
    for index, image_url in enumerate(extra_urls, start=1):
        payload.append(
            TryOnLookItem(
                item_id=None,
                name=f"外部衣物 {index}",
                slot="top",
                image_url=image_url,
            )
        )
    return payload


def _is_replicate_predictions_url(base_url: str) -> bool:
    parsed = urlparse(base_url.rstrip("/"))
    if parsed.netloc.lower() != "api.replicate.com":
        return False
    return parsed.path.rstrip("/").endswith("/predictions")


def _tryon_route_label(base_url: str) -> str:
    trimmed = base_url.strip().rstrip("/")
    parsed = urlparse(trimmed)
    host = parsed.netloc or parsed.path or trimmed
    path = parsed.path.rstrip("/")
    if path and path != "/":
        return f"{host}{path}"
    return host


def _replicate_headers(api_key: str, *, include_body_headers: bool = True) -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if include_body_headers:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "wait=5"
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def _replicate_category(request: TryOnRenderRequest, items: list[ClothingItem]) -> str:
    for item in items:
        category = str(item.category or "").strip().lower()
        slot = str(item.slot or "").strip().lower()
        if category == "dresses" or slot == "dress":
            return "dresses"
        if category == "bottoms" or slot == "bottom":
            return "lower_body"
        if category in {"tops", "outerwear"} or slot in {"top", "outerwear"}:
            return "upper_body"

    hint_text = " ".join([request.prompt or "", request.scene or ""]).lower()
    if any(keyword in hint_text for keyword in ("dress", "gown", "连衣裙", "裙装")):
        return "dresses"
    if any(keyword in hint_text for keyword in ("pants", "trousers", "jeans", "skirt", "shorts", "裤", "裙", "半裙")):
        return "lower_body"
    return "upper_body"


def _replicate_template_context(request: TryOnRenderRequest, items: list[ClothingItem]) -> dict[str, object]:
    garment_urls = [
        entry
        for entry in [_remote_item_image_url(item) for item in items]
        if entry
    ] + [
        entry
        for entry in [
            _ensure_external_image_url(
                image_url,
                relative_directory="tryon/remote-inputs/garment",
                fallback_filename="garment-upload.png",
            )
            for image_url in (request.garment_image_urls or [])
        ]
        if entry
    ]
    primary_garment_url = garment_urls[0] if garment_urls else None
    replicate_category = _replicate_category(request, items)
    return {
        "person_image_url": _ensure_external_image_url(
            request.person_image_url,
            relative_directory="tryon/remote-inputs/person",
            fallback_filename="person-photo.png",
        ),
        "primary_garment_url": primary_garment_url,
        "garment_image_urls": garment_urls,
        "prompt": request.prompt or "",
        "scene": request.scene or "",
        "prompt_or_scene": request.prompt or request.scene or "Virtual try-on preview",
        "item_ids": [item.id for item in items],
        "garment_count": len(garment_urls),
        "replicate_category": replicate_category,
        "replicate_force_dc": replicate_category == "dresses",
    }


def _render_template_value(value: object, context: dict[str, object]) -> object:
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("{{") and stripped.endswith("}}") and stripped.count("{{") == 1 and stripped.count("}}") == 1:
            return context.get(stripped[2:-2].strip())
        rendered = value
        for key, replacement in context.items():
            if isinstance(replacement, (str, int, float)):
                rendered = rendered.replace(f"{{{{{key}}}}}", str(replacement))
        return rendered
    if isinstance(value, list):
        return [_render_template_value(entry, context) for entry in value]
    if isinstance(value, dict):
        return {str(key): _render_template_value(entry, context) for key, entry in value.items()}
    return value


def _replicate_input_payload(request: TryOnRenderRequest, items: list[ClothingItem]) -> dict:
    context = _replicate_template_context(request, items)
    if not context["person_image_url"]:
        raise ValueError("Replicate try-on requires person_image_url.")
    if not context["primary_garment_url"]:
        raise ValueError("Replicate try-on requires at least one garment image.")

    raw_template = settings.virtual_tryon_replicate_input_template.strip()
    template = DEFAULT_REPLICATE_INPUT_TEMPLATE
    if raw_template:
        try:
            parsed = json.loads(raw_template)
        except json.JSONDecodeError as exc:
            raise ValueError("VIRTUAL_TRYON_REPLICATE_INPUT_TEMPLATE is not valid JSON.") from exc
        if not isinstance(parsed, dict):
            raise ValueError("VIRTUAL_TRYON_REPLICATE_INPUT_TEMPLATE must be a JSON object.")
        template = parsed

    payload = _render_template_value(template, context)
    if not isinstance(payload, dict):
        raise ValueError("Replicate input template did not render to a JSON object.")
    return payload


def _extract_output_reference(output: object) -> str | None:
    if isinstance(output, str):
        return output
    if isinstance(output, list):
        for entry in output:
            resolved = _extract_output_reference(entry)
            if resolved:
                return resolved
        return None
    if isinstance(output, dict):
        for key in ("image", "image_url", "url", "file", "output"):
            if key in output:
                resolved = _extract_output_reference(output[key])
                if resolved:
                    return resolved
        for entry in output.values():
            resolved = _extract_output_reference(entry)
            if resolved:
                return resolved
    return None


def _replicate_provider_label(prediction: dict) -> str:
    version = settings.virtual_tryon_replicate_version.strip()
    if version:
        return f"Replicate · {version}"
    if model := str(prediction.get("model") or "").strip():
        return f"Replicate · {model}"
    return "Replicate"


def _create_replicate_prediction(
    request: TryOnRenderRequest,
    items: list[ClothingItem],
    *,
    api_url: str,
    api_key: str,
) -> dict:
    payload = {"input": _replicate_input_payload(request, items)}
    configured_version = settings.virtual_tryon_replicate_version.strip()
    if configured_version and "/models/" not in api_url:
        payload["version"] = configured_version

    response = httpx.post(
        api_url,
        json=payload,
        headers=_replicate_headers(api_key),
        timeout=settings.ai_cleanup_timeout_seconds,
    )
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Replicate did not return a JSON prediction payload.")
    return body


def _poll_replicate_prediction(started_prediction: dict, *, api_key: str) -> dict:
    urls = started_prediction.get("urls") if isinstance(started_prediction.get("urls"), dict) else {}
    get_url = str(urls.get("get") or "").strip()
    if not get_url:
        raise ValueError("Replicate prediction payload did not include urls.get for polling.")

    deadline = time.monotonic() + max(5.0, settings.virtual_tryon_poll_timeout_seconds)
    while time.monotonic() < deadline:
        response = httpx.get(
            get_url,
            headers=_replicate_headers(api_key, include_body_headers=False),
            timeout=settings.ai_cleanup_timeout_seconds,
        )
        response.raise_for_status()
        body = response.json()
        if not isinstance(body, dict):
            raise ValueError("Replicate polling returned a non-JSON payload.")

        status_value = str(body.get("status") or "").lower()
        if status_value in REPLICATE_TERMINAL_SUCCESS:
            return body
        if status_value in REPLICATE_TERMINAL_FAILURE:
            raise ValueError(f"Replicate prediction failed: {body.get('error') or status_value}")
        time.sleep(max(0.2, settings.virtual_tryon_poll_interval_seconds))

    raise TimeoutError("Replicate prediction timed out before reaching a terminal state.")


def _remote_tryon_replicate(
    *,
    request: TryOnRenderRequest,
    items: list[ClothingItem],
    api_url: str,
    api_key: str,
) -> tuple[bytes, str, str]:
    started_prediction = _create_replicate_prediction(request, items, api_url=api_url, api_key=api_key)
    status_value = str(started_prediction.get("status") or "").lower()
    completed_prediction = started_prediction

    if status_value in REPLICATE_TERMINAL_FAILURE:
        raise ValueError(f"Replicate prediction failed: {started_prediction.get('error') or status_value}")
    if status_value not in REPLICATE_TERMINAL_SUCCESS:
        completed_prediction = _poll_replicate_prediction(started_prediction, api_key=api_key)

    output_reference = _extract_output_reference(completed_prediction.get("output"))
    if not output_reference:
        raise ValueError("Replicate prediction completed without an output image reference.")

    loaded = storage_service.load_asset_bytes(output_reference)
    return loaded.payload, loaded.content_type, _replicate_provider_label(completed_prediction)


def _remote_tryon_worker(
    *,
    request: TryOnRenderRequest,
    items: list[ClothingItem],
    api_url: str,
    api_key: str,
) -> tuple[bytes, str, str]:
    headers: dict[str, str] = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        headers["X-API-Key"] = api_key

    payload = {
        "person_image_url": _ensure_external_image_url(
            request.person_image_url,
            relative_directory="tryon/remote-inputs/person",
            fallback_filename="person-photo.png",
        ),
        "garment_image_urls": [
            entry
            for entry in [_remote_item_image_url(item) for item in items]
            if entry
        ] + [
            entry
            for entry in [
                _ensure_external_image_url(
                    image_url,
                    relative_directory="tryon/remote-inputs/garment",
                    fallback_filename="garment-upload.png",
                )
                for image_url in (request.garment_image_urls or [])
            ]
            if entry
        ],
        "item_ids": [item.id for item in items],
        "prompt": request.prompt,
        "scene": request.scene,
    }
    response = httpx.post(
        api_url,
        json=payload,
        headers=headers,
        timeout=settings.ai_cleanup_timeout_seconds,
    )
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        body = response.json()
        if body.get("image_base64"):
            return base64.b64decode(body["image_base64"]), body.get("content_type") or "image/png", str(body.get("provider") or "远端试衣 Worker")
        if body.get("image_url"):
            loaded = storage_service.load_asset_bytes(body["image_url"])
            return loaded.payload, loaded.content_type, str(body.get("provider") or "远端试衣 Worker")
        raise ValueError("Remote try-on worker did not return image data.")
    return response.content, content_type or "image/png", "远端试衣 Worker"


def _remote_tryon(
    *,
    request: TryOnRenderRequest,
    items: list[ClothingItem],
    api_url: str,
    api_key: str,
) -> tuple[bytes, str, str]:
    if _is_replicate_predictions_url(api_url):
        return _remote_tryon_replicate(request=request, items=items, api_url=api_url, api_key=api_key)
    return _remote_tryon_worker(request=request, items=items, api_url=api_url, api_key=api_key)


def _tryon_targets() -> list[tuple[str, str, str]]:
    primary_url = settings.virtual_tryon_api_url.strip()
    fallback_url = settings.virtual_tryon_fallback_api_url.strip()

    if local_model.should_use_local_model("virtual_tryon"):
        if fallback_url:
            return [("local-worker", fallback_url, settings.virtual_tryon_fallback_api_key.strip())]
        return []

    targets: list[tuple[str, str, str]] = []
    if primary_url:
        targets.append(("remote", primary_url, settings.virtual_tryon_api_key.strip()))
    if fallback_url and fallback_url.rstrip("/") != primary_url.rstrip("/"):
        targets.append(("fallback-worker", fallback_url, settings.virtual_tryon_fallback_api_key.strip()))
    return targets


def _local_tryon(
    *,
    request: TryOnRenderRequest,
    items: list[ClothingItem],
) -> tuple[bytes, str, str]:
    base = _open_image(request.person_image_url) if request.person_image_url else None
    canvas = base.resize((1024, 1366), Image.LANCZOS).convert("RGBA") if base is not None else _background_canvas()
    if base is None:
        canvas.alpha_composite(_mannequin_silhouette(canvas.size))

    overlays = []
    for item in items:
        image = _open_image(_item_image_url(item))
        if image is not None:
            overlays.append((item.slot, image))
    for image_url in request.garment_image_urls:
        image = _open_image(image_url)
        if image is not None:
            overlays.append(("top", image))

    if not overlays:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="至少需要 1 件可用于试衣的衣物图片。")

    slot_priority = {"outerwear": 0, "dress": 1, "top": 2, "bottom": 3, "accessory": 4, "shoes": 5}
    for slot, overlay in sorted(overlays, key=lambda entry: slot_priority.get(entry[0], 9)):
        _place_overlay(canvas, overlay, slot)

    footer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(footer)
    draw.rounded_rectangle((74, 1232, 950, 1304), radius=28, fill=(255, 250, 245, 214))
    draw.text((110, 1254), "Virtual Try-On Preview", fill=(95, 66, 45, 255))
    subtitle = request.scene or request.prompt or "本地试衣预览"
    draw.text((110, 1280), subtitle[:44], fill=(136, 104, 83, 255))
    canvas.alpha_composite(footer)

    output = BytesIO()
    canvas.convert("RGB").save(output, format="PNG")
    return output.getvalue(), "image/png", "本地试衣合成"


def render_try_on(db: Session, user: User, payload: TryOnRenderRequest) -> TryOnRenderResponse:
    items = _look_items_from_ids(db, user, payload.item_ids)
    if not items and not payload.garment_image_urls:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请至少选择 1 件衣物后再生成试衣图。")

    routes = _tryon_targets()
    provider_mode = "local"
    route_errors: list[tuple[str, str, Exception]] = []
    image_bytes: bytes | None = None
    content_type = "image/png"
    provider = ""
    skipped_remote_for_missing_person_image = False

    for route_name, route_url, route_key in routes:
        if _is_replicate_predictions_url(route_url) and not payload.person_image_url:
            skipped_remote_for_missing_person_image = True
            continue
        try:
            image_bytes, content_type, provider = _remote_tryon(
                request=payload,
                items=items,
                api_url=route_url,
                api_key=route_key,
            )
            if route_name == "remote":
                provider_mode = "remote"
            elif route_name == "fallback-worker":
                provider_mode = "remote-fallback-worker"
            else:
                provider_mode = "local-worker"
            break
        except Exception as exc:
            route_errors.append((route_name, route_url, exc))

    if image_bytes is None:
        image_bytes, content_type, provider = _local_tryon(request=payload, items=items)
        if route_errors:
            route_names = {route_name for route_name, _, _ in route_errors}
            if "fallback-worker" in route_names:
                provider_mode = "remote-fallback-worker-fallback-local"
            elif "remote" in route_names:
                provider_mode = "remote-fallback-local"
            elif "local-worker" in route_names:
                provider_mode = "local-worker-fallback-local"

    saved = storage_service.save_generated_asset(
        f"tryon/user-{user.id}",
        f"tryon-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.png",
        image_bytes,
        content_type,
    )
    look_items = _serialize_items(items, payload.garment_image_urls)
    if provider_mode == "remote":
        message = "试衣图已经由远端模型服务生成。"
    elif provider_mode == "remote-fallback-worker":
        message = "云端试衣 API 暂时不可用，已自动切换到本地 OOT worker。"
    elif provider_mode == "local-worker":
        message = "试衣图已经由本地 OOT worker 生成。"
    elif provider_mode == "remote-fallback-local":
        message = "远端试衣服务暂时不可用，已自动切回本地试衣合成。"
    elif provider_mode == "remote-fallback-worker-fallback-local":
        detail = "; ".join(f"{route_name}@{_tryon_route_label(route_url)} => {exc}" for route_name, route_url, exc in route_errors)
        message = f"云端试衣 API 和本地 OOT worker 都不可用，已切换到本地试衣合成预览。Detail: {detail}"
    elif provider_mode == "local-worker-fallback-local":
        detail = "; ".join(f"{route_name}@{_tryon_route_label(route_url)} => {exc}" for route_name, route_url, exc in route_errors)
        message = f"本地 OOT worker 暂时不可用，已切换到本地试衣合成预览。Detail: {detail}"
    elif skipped_remote_for_missing_person_image:
        message = "未上传全身照，当前先生成本地试衣预览。上传全身照后会自动切到 Replicate 云端试衣。"
    else:
        message = "试衣图已经由本地试衣合成链路生成。"

    return TryOnRenderResponse(
        status="ready",
        provider_mode=provider_mode,
        provider=provider,
        preview_url=saved.url,
        item_ids=[item.id for item in items],
        items=look_items,
        message=message,
        prompt=payload.prompt,
        scene=payload.scene,
        created_at=datetime.utcnow(),
    )
