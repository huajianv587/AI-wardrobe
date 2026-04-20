from __future__ import annotations

import base64
import json
import logging
import re
import warnings
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageOps

from app.models.wardrobe import ClothingItem
from core.config import settings
from services import assistant_service, local_fashion_segmentation_service, storage_service

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency
    import numpy as np
except Exception:  # pragma: no cover - optional dependency
    np = None

try:  # pragma: no cover - optional dependency
    from ultralytics import YOLO
except Exception:  # pragma: no cover - optional dependency
    YOLO = None

try:  # pragma: no cover - optional dependency
    import torch
    warnings.filterwarnings(
        "ignore",
        message=r"`torch\.utils\._pytree\._register_pytree_node` is deprecated\..*",
        category=FutureWarning,
    )
    from transformers import CLIPModel, CLIPProcessor
except Exception:  # pragma: no cover - optional dependency
    torch = None
    CLIPModel = None
    CLIPProcessor = None

SLOT_TO_CATEGORY = {
    "top": "tops",
    "bottom": "bottoms",
    "outerwear": "outerwear",
    "shoes": "shoes",
    "accessory": "accessories",
    "dress": "dresses",
}

SLOT_LABELS = {
    "top": "上衣",
    "bottom": "下装",
    "outerwear": "外套",
    "shoes": "鞋子",
    "accessory": "包包",
    "dress": "连衣裙",
}

CATEGORY_LABELS = {
    "tops": "上衣",
    "bottoms": "下装",
    "outerwear": "外套",
    "shoes": "鞋子",
    "accessories": "配饰",
    "dresses": "连衣裙",
}

EMOJI_MAP = {
    "top": "👕",
    "bottom": "👖",
    "outerwear": "🧥",
    "shoes": "👟",
    "accessory": "👜",
    "dress": "👗",
}

COLOR_PALETTE = {
    "米白色": (245, 242, 238),
    "白色": (249, 248, 244),
    "黑色": (43, 39, 37),
    "深蓝色": (53, 81, 109),
    "蓝色": (91, 126, 171),
    "棕色": (139, 106, 82),
    "驼色": (199, 160, 120),
    "灰色": (117, 119, 124),
    "绿色": (127, 160, 123),
    "粉色": (218, 172, 182),
    "紫色": (173, 149, 197),
    "红色": (183, 85, 84),
}

FASHION_LABEL_CANDIDATES = {
    "top": ["hoodie", "sweatshirt", "shirt", "blouse", "t-shirt", "knit top", "cardigan", "tank top"],
    "bottom": ["jeans", "trousers", "wide-leg pants", "straight jeans", "skirt", "pleated skirt", "shorts"],
    "outerwear": ["trench coat", "coat", "jacket", "blazer", "cardigan"],
    "shoes": ["sneakers", "loafers", "heels", "boots", "sandals"],
    "accessory": ["tote bag", "shoulder bag", "crossbody bag", "bucket bag", "backpack", "handbag"],
    "dress": ["dress", "shirt dress", "slip dress", "knit dress", "floral dress"],
}

STYLE_CANDIDATES = ["casual", "oversize", "commute", "minimal", "sporty", "romantic", "relaxed", "tailored"]
MATERIAL_CANDIDATES = ["cotton", "denim", "leather", "knit", "wool", "linen", "polyester", "canvas"]
SEASON_CANDIDATES = ["spring", "summer", "autumn", "winter", "all season"]

LABEL_TRANSLATIONS = {
    "hoodie": "卫衣",
    "sweatshirt": "卫衣",
    "shirt": "衬衫",
    "blouse": "衬衫",
    "t-shirt": "T恤",
    "knit top": "针织上衣",
    "cardigan": "开衫",
    "tank top": "背心",
    "jeans": "牛仔裤",
    "trousers": "长裤",
    "wide-leg pants": "阔腿裤",
    "straight jeans": "直筒牛仔裤",
    "skirt": "半裙",
    "pleated skirt": "百褶裙",
    "shorts": "短裤",
    "trench coat": "风衣",
    "coat": "大衣",
    "jacket": "夹克",
    "blazer": "西装外套",
    "sneakers": "运动鞋",
    "loafers": "乐福鞋",
    "heels": "高跟鞋",
    "boots": "靴子",
    "sandals": "凉鞋",
    "tote bag": "托特包",
    "shoulder bag": "单肩包",
    "crossbody bag": "斜挎包",
    "bucket bag": "水桶包",
    "backpack": "双肩包",
    "handbag": "手提包",
    "dress": "连衣裙",
    "shirt dress": "衬衫裙",
    "slip dress": "吊带裙",
    "knit dress": "针织连衣裙",
    "floral dress": "碎花连衣裙",
    "casual": "休闲",
    "oversize": "Oversize",
    "commute": "通勤",
    "minimal": "极简",
    "sporty": "运动",
    "romantic": "浪漫",
    "relaxed": "松弛",
    "tailored": "利落",
    "cotton": "棉",
    "denim": "牛仔",
    "leather": "皮革",
    "knit": "针织",
    "wool": "羊毛",
    "linen": "亚麻",
    "polyester": "聚酯纤维",
    "canvas": "帆布",
    "spring": "春",
    "summer": "夏",
    "autumn": "秋",
    "winter": "冬",
    "all season": "四季",
}

TITLE_KEYWORDS = [
    (("连衣裙", "dress"), "dress"),
    (("风衣", "大衣", "coat", "trench", "blazer", "jacket"), "outerwear"),
    (("裤", "jean", "pants", "trousers", "shorts"), "bottom"),
    (("鞋", "loafer", "sneaker", "heel", "boot"), "shoes"),
    (("包", "tote", "bag", "backpack", "crossbody"), "accessory"),
    (("衬衫", "t恤", "hoodie", "shirt", "blouse", "sweater", "knit", "top"), "top"),
]

YOLO_COCO_CLASS_MAP = {
    "handbag": "accessory",
    "backpack": "accessory",
    "tie": "accessory",
}


def _fashion_model_root() -> Path:
    configured = (settings.fashion_model_root or "").strip() or "./data/models/fashion"
    return Path(configured).expanduser()


def _resolve_local_model_path(*parts: str) -> Path:
    return _fashion_model_root().joinpath(*parts)


def _resolve_yolo_weights() -> str:
    configured = (settings.fashion_detector_weights or "").strip()
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.exists():
            return str(candidate)
    bundled = _resolve_local_model_path("yolo", "yolo26n.pt")
    if bundled.exists():
        return str(bundled)
    fallback = Path("yolo26n.pt")
    if fallback.exists():
        return str(fallback)
    return "yolo26n.pt"


def _resolve_fashionclip_source() -> str | None:
    bundled = _resolve_local_model_path("fashion-clip")
    if bundled.exists() and any(bundled.iterdir()):
        return str(bundled)
    configured = (settings.fashion_clip_model_id or "").strip()
    return configured or None


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff_-]+", "-", value.strip())
    return cleaned.strip("-").lower() or "piece"


def _dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def _clamp(value: int, lower: int, upper: int) -> int:
    return max(lower, min(upper, value))


def _guess_slot_from_text(text: str, fallback: str = "top") -> str:
    normalized = text.lower()
    for keywords, slot in TITLE_KEYWORDS:
        if any(keyword in normalized for keyword in keywords):
            return slot
    return fallback


def _corner_brightness(image: Image.Image) -> float:
    sample = image.resize((48, 48)).convert("RGB")
    pixels = [
        sample.getpixel((0, 0)),
        sample.getpixel((47, 0)),
        sample.getpixel((0, 47)),
        sample.getpixel((47, 47)),
    ]
    return sum(sum(pixel) / 3 for pixel in pixels) / max(1, len(pixels))


def _guess_image_mode(image: Image.Image) -> str:
    width, height = image.size
    bright = _corner_brightness(image)
    if height >= width * 1.18 and bright < 242:
        return "person-photo"
    if bright >= 242:
        return "flatlay"
    if width >= height * 1.2:
        return "flatlay"
    return "single-item"


def _dominant_color_name(image: Image.Image) -> str:
    swatch = image.resize((32, 32)).convert("RGB")
    pixels = [swatch.getpixel((x, y)) for y in range(swatch.height) for x in range(swatch.width)]
    if not pixels:
        return "米白色"
    avg = tuple(sum(channel) / len(pixels) for channel in zip(*pixels))
    best_label = "米白色"
    best_distance = float("inf")
    for label, rgb in COLOR_PALETTE.items():
        distance = sum((avg[index] - rgb[index]) ** 2 for index in range(3))
        if distance < best_distance:
            best_distance = distance
            best_label = label
    return best_label


def _image_reference(image_url: str) -> str | None:
    if not image_url:
        return None
    try:
        loaded = storage_service.load_asset_bytes(image_url)
    except Exception:
        loaded = None
    if loaded:
        mime_type = loaded.content_type or "image/png"
        encoded = base64.b64encode(loaded.payload).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"
    if image_url.startswith("http://") or image_url.startswith("https://") or image_url.startswith("data:"):
        return image_url
    return None


def _json_from_text(content: str) -> dict[str, Any] | None:
    if not content:
        return None
    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None


@lru_cache(maxsize=1)
def _get_yolo_model():  # pragma: no cover - depends on optional runtime setup
    if YOLO is None:
        return None
    weights = _resolve_yolo_weights()
    try:
        return YOLO(weights)
    except Exception as exc:
        logger.info("YOLO detector unavailable: %s", exc)
        return None


@lru_cache(maxsize=1)
def _get_fashionclip_bundle():  # pragma: no cover - depends on optional runtime setup
    if torch is None or CLIPModel is None or CLIPProcessor is None:
        return None
    model_source = _resolve_fashionclip_source()
    if not model_source:
        return None
    try:
        model = CLIPModel.from_pretrained(model_source)
        processor = CLIPProcessor.from_pretrained(model_source)
        model.eval()
        return model, processor
    except Exception as exc:
        logger.info("FashionCLIP unavailable: %s", exc)
        return None


def _call_fashionclip(image: Image.Image, slot: str) -> dict[str, str] | None:  # pragma: no cover - optional runtime
    bundle = _get_fashionclip_bundle()
    if bundle is None or torch is None:
        return None
    model, processor = bundle
    label_candidates = FASHION_LABEL_CANDIDATES.get(slot, FASHION_LABEL_CANDIDATES["top"])
    sequence = label_candidates + STYLE_CANDIDATES + MATERIAL_CANDIDATES + SEASON_CANDIDATES
    inputs = processor(
        text=[f"a fashion product photo of {entry}" for entry in sequence],
        images=image,
        return_tensors="pt",
        padding=True,
    )
    with torch.no_grad():
        outputs = model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1)[0].tolist()
    ranked = sorted(zip(sequence, probs), key=lambda entry: entry[1], reverse=True)
    best_label = next((item for item in ranked if item[0] in label_candidates), None)
    best_style = next((item for item in ranked if item[0] in STYLE_CANDIDATES), None)
    best_material = next((item for item in ranked if item[0] in MATERIAL_CANDIDATES), None)
    best_season = next((item for item in ranked if item[0] in SEASON_CANDIDATES), None)
    if not best_label:
        return None
    return {
        "category_name": LABEL_TRANSLATIONS.get(best_label[0], best_label[0]),
        "style": LABEL_TRANSLATIONS.get(best_style[0], best_style[0]) if best_style else "",
        "material": LABEL_TRANSLATIONS.get(best_material[0], best_material[0]) if best_material else "",
        "season": LABEL_TRANSLATIONS.get(best_season[0], best_season[0]) if best_season else "",
    }


def _yolo_boxes(image: Image.Image) -> list[dict[str, Any]]:  # pragma: no cover - optional runtime
    model = _get_yolo_model()
    if model is None:
        return []
    try:
        results = model.predict(source=image, verbose=False, imgsz=960, conf=0.18, iou=0.45)
    except Exception as exc:
        logger.info("YOLO predict failed: %s", exc)
        return []
    if not results:
        return []
    result = results[0]
    names = result.names
    raw_boxes = getattr(result, "boxes", None)
    if raw_boxes is None or raw_boxes.xyxy is None:
        return []
    boxes = []
    for index in range(len(raw_boxes.xyxy)):
        cls_id = int(raw_boxes.cls[index].item()) if raw_boxes.cls is not None else -1
        label = str(names.get(cls_id) if isinstance(names, dict) else names[cls_id])
        score = float(raw_boxes.conf[index].item()) if raw_boxes.conf is not None else 0.0
        x1, y1, x2, y2 = [int(value) for value in raw_boxes.xyxy[index].tolist()]
        boxes.append(
            {
                "label": label,
                "confidence": score,
                "bbox": {"x": x1, "y": y1, "w": max(1, x2 - x1), "h": max(1, y2 - y1)},
            }
        )
    return boxes


def _source_text(bundle: dict[str, Any]) -> str:
    return " ".join(
        [
            str(bundle.get("title") or ""),
            str(bundle.get("description") or ""),
            str(bundle.get("name") or ""),
            str(bundle.get("platform") or ""),
        ]
    ).strip()


def _person_piece_boxes(image: Image.Image, source_text: str, detections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    width, height = image.size
    person = next((entry for entry in detections if entry["label"] == "person"), None)
    if person:
        bbox = person["bbox"]
        x = bbox["x"]
        y = bbox["y"]
        w = bbox["w"]
        h = bbox["h"]
    else:
        x = int(width * 0.18)
        y = int(height * 0.06)
        w = int(width * 0.64)
        h = int(height * 0.88)

    top_box = {
        "slot": "top",
        "bbox": {"x": x, "y": y + int(h * 0.12), "w": w, "h": max(1, int(h * 0.32))},
        "confidence": 0.62,
    }
    bottom_box = {
        "slot": "dress" if any(keyword in source_text.lower() for keyword in ("dress", "连衣裙")) else "bottom",
        "bbox": {"x": x + int(w * 0.02), "y": y + int(h * 0.44), "w": int(w * 0.96), "h": max(1, int(h * 0.34))},
        "confidence": 0.6,
    }
    shoes_box = {
        "slot": "shoes",
        "bbox": {"x": x + int(w * 0.14), "y": y + int(h * 0.83), "w": int(w * 0.72), "h": max(1, int(h * 0.12))},
        "confidence": 0.52,
    }
    pieces = [top_box]
    if bottom_box["slot"] == "dress":
        pieces[0]["slot"] = "dress"
        pieces[0]["bbox"] = {
            "x": top_box["bbox"]["x"],
            "y": top_box["bbox"]["y"],
            "w": top_box["bbox"]["w"],
            "h": max(1, bottom_box["bbox"]["y"] + bottom_box["bbox"]["h"] - top_box["bbox"]["y"]),
        }
        pieces[0]["confidence"] = 0.66
    else:
        pieces.append(bottom_box)
        pieces.append(shoes_box)

    accessory_boxes = [
        entry
        for entry in detections
        if YOLO_COCO_CLASS_MAP.get(entry["label"]) == "accessory"
    ]
    for entry in accessory_boxes[:1]:
        pieces.append({"slot": "accessory", "bbox": entry["bbox"], "confidence": max(0.58, entry["confidence"])})
    return pieces


def _flatlay_piece_boxes(image: Image.Image, source_text: str, detections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    width, height = image.size
    accessory_boxes = [
        {"slot": "accessory", "bbox": entry["bbox"], "confidence": max(0.6, entry["confidence"])}
        for entry in detections
        if YOLO_COCO_CLASS_MAP.get(entry["label"]) == "accessory"
    ]
    if accessory_boxes:
        return accessory_boxes
    slot = _guess_slot_from_text(source_text, "top")
    return [
        {
            "slot": slot,
            "bbox": {"x": int(width * 0.08), "y": int(height * 0.08), "w": int(width * 0.84), "h": int(height * 0.84)},
            "confidence": 0.68,
        }
    ]


def _crop_box(image: Image.Image, bbox: dict[str, int], padding_ratio: float = 0.06) -> tuple[int, int, int, int]:
    width, height = image.size
    x = bbox.get("x", 0)
    y = bbox.get("y", 0)
    w = max(1, bbox.get("w", width))
    h = max(1, bbox.get("h", height))
    pad_x = int(w * padding_ratio)
    pad_y = int(h * padding_ratio)
    left = _clamp(x - pad_x, 0, width)
    top = _clamp(y - pad_y, 0, height)
    right = _clamp(x + w + pad_x, left + 1, width)
    bottom = _clamp(y + h + pad_y, top + 1, height)
    return left, top, right, bottom


def _transparent_from_bright_background(crop: Image.Image) -> Image.Image:
    rgba = crop.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0) if red > 242 and green > 242 and blue > 242 else (red, green, blue, alpha)
    return rgba


def _masked_crop_from_region(crop: Image.Image, mask: Any, crop_region: tuple[int, int, int, int]) -> Image.Image | None:
    if np is None or mask is None:
        return None
    left, top, right, bottom = crop_region
    mask_array = np.asarray(mask).astype(bool)
    if mask_array.ndim == 3:
        mask_array = mask_array[:, :, 0]
    if mask_array.shape[0] < bottom or mask_array.shape[1] < right:
        return None
    crop_mask = mask_array[top:bottom, left:right]
    if not crop_mask.any():
        return None
    rgba = np.asarray(crop.convert("RGBA")).copy()
    rgba[:, :, 3] = np.where(crop_mask, 255, 0).astype("uint8")
    return Image.fromarray(rgba, "RGBA")


def _semantic_crop_from_piece(crop: Image.Image, piece: dict[str, Any], crop_region: tuple[int, int, int, int]) -> Image.Image:
    masked_crop = _masked_crop_from_region(crop, piece.get("mask"), crop_region)
    if masked_crop is None:
        return crop
    matte = Image.new("RGBA", masked_crop.size, (255, 255, 255, 255))
    matte.alpha_composite(masked_crop.convert("RGBA"))
    return matte.convert("RGB")


def _save_image_variant(relative_directory: str, filename: str, image: Image.Image) -> str:
    buffer = BytesIO()
    save_image = image
    if image.mode not in {"RGB", "RGBA"}:
        save_image = image.convert("RGBA")
    save_image.save(buffer, format="PNG")
    asset = storage_service.save_generated_asset(relative_directory, filename, buffer.getvalue(), "image/png")
    return asset.url


def _compose_piece_assets(
    image: Image.Image,
    piece: dict[str, Any],
    *,
    user_id: int | None,
    preview_id: str,
    piece_index: int,
    clean_background: bool,
) -> dict[str, str]:
    crop_region = _crop_box(image, piece["bbox"])
    crop = image.crop(crop_region)
    base_dir = f"wardrobe/decomposition/user-{user_id or 0}/preview-{preview_id}"
    slug = _slug(piece.get("slot") or f"piece-{piece_index}")
    preview_url = _save_image_variant(base_dir, f"{piece_index:02d}-{slug}-crop.png", crop)
    masked_crop = _masked_crop_from_region(crop, piece.get("mask"), crop_region)
    if masked_crop is not None:
        processed = masked_crop
    else:
        processed = _transparent_from_bright_background(crop) if clean_background else crop
    processed_url = _save_image_variant(base_dir, f"{piece_index:02d}-{slug}-processed.png", processed)
    return {"preview_image_url": preview_url, "processed_image_url": processed_url}


def _heuristic_material(slot: str, label: str, color: str) -> str:
    normalized = label.lower()
    if "牛仔" in label or "jean" in normalized:
        return "牛仔"
    if slot == "accessory":
        return "皮革"
    if slot == "shoes":
        return "皮革" if color in {"黑色", "棕色", "驼色"} else "织物"
    if "针织" in label or "knit" in normalized:
        return "针织"
    if slot == "outerwear":
        return "羊毛"
    return "棉"


def _heuristic_style(slot: str, label: str) -> str:
    normalized = label.lower()
    if slot == "accessory":
        return "通勤"
    if slot == "shoes":
        return "休闲"
    if "卫衣" in label or "hoodie" in normalized:
        return "休闲/Oversize"
    if "西装" in label or "blazer" in normalized:
        return "通勤/利落"
    if slot == "bottom":
        return "修身"
    if slot == "dress":
        return "优雅"
    return "休闲"


def _heuristic_season(slot: str, label: str, material: str) -> str:
    normalized = label.lower()
    if material in {"羊毛", "针织"} or slot == "outerwear":
        return "秋冬"
    if "短裤" in label or "凉鞋" in label or "summer" in normalized:
        return "夏"
    if slot in {"accessory", "shoes", "bottom"}:
        return "四季"
    return "春秋"


def _translate_or_default(value: str, fallback: str) -> str:
    return LABEL_TRANSLATIONS.get(value, value or fallback) or fallback


def _piece_occasions(slot: str, style: str) -> list[str]:
    normalized = style.lower()
    if slot == "accessory":
        return ["通勤", "日常"]
    if "通勤" in style or "commute" in normalized:
        return ["通勤", "见人"]
    if slot == "shoes":
        return ["日常", "周末"]
    if slot == "dress":
        return ["约会", "周末"]
    return ["日常", "通勤"]


def _build_piece_name(color: str, label: str) -> str:
    if not label:
        return color
    return f"{color}{label}" if not label.startswith(color) else label


def _normalize_piece(
    piece: dict[str, Any],
    *,
    piece_index: int,
    provider: str,
    platform: str,
) -> dict[str, Any]:
    slot = piece.get("slot") or "top"
    if slot not in SLOT_TO_CATEGORY:
        slot = _guess_slot_from_text(str(piece.get("category_name") or piece.get("name") or ""), "top")
    category = piece.get("category") or SLOT_TO_CATEGORY[slot]
    color = str(piece.get("color") or "米白色")
    category_name = str(piece.get("category_name") or SLOT_LABELS.get(slot, "单品"))
    style = str(piece.get("style") or _heuristic_style(slot, category_name))
    material = str(piece.get("material") or _heuristic_material(slot, category_name, color))
    season = str(piece.get("season") or _heuristic_season(slot, category_name, material))
    summary = " | ".join([_build_piece_name(color, category_name), style, material, season])
    bbox = piece.get("bbox") or {"x": 0, "y": 0, "w": 0, "h": 0}
    confidence = round(float(piece.get("confidence") or 0.68), 3)
    tags = _dedupe(
        [
            "智能解构",
            "新增",
            SLOT_LABELS.get(slot, "单品"),
            color,
            style,
            material,
            platform,
        ]
    )
    return {
        "id": str(piece.get("id") or f"piece-{piece_index}"),
        "piece_index": piece_index,
        "slot": slot,
        "slot_label": SLOT_LABELS.get(slot, "单品"),
        "category": category,
        "category_label": CATEGORY_LABELS.get(category, category),
        "emoji": EMOJI_MAP.get(slot, "✨"),
        "name": _build_piece_name(color, category_name),
        "summary": summary,
        "attributes": {
            "category": category_name,
            "color": color,
            "style": style,
            "material": material,
            "season": season,
        },
        "bbox": {
            "x": int(bbox.get("x", 0)),
            "y": int(bbox.get("y", 0)),
            "w": int(bbox.get("w", 0)),
            "h": int(bbox.get("h", 0)),
        },
        "confidence": confidence,
        "preview_image_url": piece.get("preview_image_url"),
        "processed_image_url": piece.get("processed_image_url"),
        "source_image_url": piece.get("source_image_url"),
        "provider": provider,
        "tags": tags,
        "occasions": _piece_occasions(slot, style),
    }


def _enrich_piece_with_local_semantics(piece: dict[str, Any], crop: Image.Image, source_text: str, config: dict[str, Any]) -> dict[str, Any]:
    slot = piece.get("slot") or "top"
    color = _dominant_color_name(crop)
    category_name = ""
    style = ""
    material = ""
    season = ""

    fashionclip_result = _call_fashionclip(crop, slot)
    if fashionclip_result:
        category_name = fashionclip_result.get("category_name", "")
        style = fashionclip_result.get("style", "")
        material = fashionclip_result.get("material", "")
        season = fashionclip_result.get("season", "")

    if not category_name:
        hinted_slot = _guess_slot_from_text(source_text, slot)
        category_name = SLOT_LABELS.get(hinted_slot if hinted_slot != "accessory" else slot, SLOT_LABELS.get(slot, "单品"))
        if slot == "accessory":
            category_name = "托特包" if "tote" in source_text.lower() or "包" in source_text.lower() else "包包"
        elif slot == "shoes":
            category_name = "运动鞋" if "sneaker" in source_text.lower() or "鞋" in source_text.lower() else "鞋子"
        elif slot == "bottom":
            category_name = "直筒牛仔裤" if "牛仔" in source_text.lower() or "jean" in source_text.lower() else "下装"
        elif slot == "top":
            category_name = "卫衣" if "卫衣" in source_text or "hoodie" in source_text.lower() else "上衣"
        elif slot == "outerwear":
            category_name = "风衣" if "风衣" in source_text or "trench" in source_text.lower() else "外套"
        elif slot == "dress":
            category_name = "连衣裙"

    piece.update(
        {
            "color": color,
            "category_name": category_name,
            "style": style or _heuristic_style(slot, category_name),
            "material": material or _heuristic_material(slot, category_name, color),
            "season": season or _heuristic_season(slot, category_name, material or ""),
        }
    )

    if settings.vllm_base_url.strip():
        pseudo_item = ClothingItem(
            name=_build_piece_name(piece["color"], piece["category_name"]),
            category=SLOT_TO_CATEGORY[slot],
            slot=slot,
            color=piece["color"],
            brand="Local Preview",
            image_url=piece.get("preview_image_url"),
            processed_image_url=piece.get("processed_image_url"),
            tags=[piece["category_name"], piece["style"]],
            occasions=[],
            style_notes=source_text,
        )
        try:
            enriched = assistant_service.describe_item_image(pseudo_item, config)
        except Exception:
            enriched = None
        if enriched:
            extra_tags = [str(entry) for entry in enriched.get("tags", [])][:2]
            extra_occasions = [str(entry) for entry in enriched.get("occasions", [])][:2]
            piece["llm_tags"] = extra_tags
            piece["llm_occasions"] = extra_occasions
    return piece


def _build_local_preview(bundle: dict[str, Any], *, user_id: int | None, preview_id: str, config: dict[str, Any]) -> dict[str, Any] | None:
    image_url = str(bundle.get("primary_image_url") or "")
    if not image_url:
        return None
    try:
        loaded = storage_service.load_asset_bytes(image_url)
    except Exception as exc:
        logger.info("Could not load primary decomposition image: %s", exc)
        return None
    try:
        with Image.open(BytesIO(loaded.payload)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
    except Exception as exc:
        logger.info("Could not decode primary decomposition image: %s", exc)
        return None

    source_text = _source_text(bundle)
    image_mode = _guess_image_mode(image)
    clean_background = image_mode in {"flatlay", "single-item"} and _corner_brightness(image) >= 238
    detections = _yolo_boxes(image)
    segmentation_notes: list[str] = []
    if image_mode == "person-photo":
        segmented_pieces, segmentation_notes = local_fashion_segmentation_service.extract_person_photo_pieces(image, detections, source_text)
        raw_pieces = segmented_pieces or _person_piece_boxes(image, source_text, detections)
        if not segmented_pieces:
            segmentation_notes.append("当前人物图未取到 SCHP 掩码，已回退到本地框选裁切。")
    else:
        seed_pieces = _flatlay_piece_boxes(image, source_text, detections)
        refined_pieces, segmentation_notes = local_fashion_segmentation_service.refine_seed_pieces_with_sam2(image, seed_pieces)
        raw_pieces = refined_pieces or seed_pieces
        if not any(piece.get("mask") is not None for piece in raw_pieces):
            segmentation_notes.append("当前平铺图未取到 SAM2 掩码，已回退到边界框裁切。")

    pieces = []
    provider_labels: list[str] = []
    for piece_index, raw_piece in enumerate(raw_pieces, start=1):
        crop_region = _crop_box(image, raw_piece["bbox"])
        crop = image.crop(crop_region)
        semantic_crop = _semantic_crop_from_piece(crop, raw_piece, crop_region)
        raw_piece["source_image_url"] = image_url
        raw_piece.update(
            _compose_piece_assets(
                image,
                raw_piece,
                user_id=user_id,
                preview_id=preview_id,
                piece_index=piece_index,
                clean_background=clean_background,
            )
        )
        raw_piece = _enrich_piece_with_local_semantics(raw_piece, semantic_crop, source_text, config)
        provider_label = str(raw_piece.get("segmentation_provider") or "本地视觉解构")
        provider_labels.append(provider_label)
        normalized = _normalize_piece(
            raw_piece,
            piece_index=piece_index,
            provider=provider_label,
            platform=str(bundle.get("platform") or "外部导入"),
        )
        if raw_piece.get("llm_tags"):
            normalized["tags"] = _dedupe([*normalized["tags"], *raw_piece["llm_tags"]])
        if raw_piece.get("llm_occasions"):
            normalized["occasions"] = _dedupe([*normalized["occasions"], *raw_piece["llm_occasions"]])
        pieces.append(normalized)

    if not pieces:
        return None
    provider_suffix = " / ".join(_dedupe(provider_labels))
    provider_used = "本地视觉解构" if not provider_suffix or provider_suffix == "本地视觉解构" else f"本地视觉解构 · {provider_suffix}"
    return {
        "provider_used": provider_used,
        "image_mode": image_mode,
        "notes": _dedupe(["已优先尝试本地视觉解构链。", *segmentation_notes]),
        "pieces": pieces,
    }


def _decomposition_prompt(bundle: dict[str, Any]) -> list[dict[str, Any]]:
    reference = _image_reference(str(bundle.get("primary_image_url") or ""))
    if not reference:
        return []
    snapshot = {
        "platform": bundle.get("platform"),
        "title": bundle.get("title"),
        "description": bundle.get("description"),
        "source_url": bundle.get("source_url"),
    }
    return [
        {
            "role": "system",
            "content": (
                "你是时尚单品解构器。只输出 JSON，对图片中的服装与配饰做拆解。"
                "bbox 使用 0 到 1 的归一化坐标，字段为 x,y,w,h。"
                "slot 只能是 top,bottom,outerwear,shoes,accessory,dress。"
            ),
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "请输出 JSON，格式为 "
                        '{"image_mode":"person-photo|flatlay|single-item|non-fashion","pieces":[{"slot":"top","category_name":"卫衣","color":"米白色","style":"休闲/Oversize","material":"棉","season":"春秋","confidence":0.86,"bbox":{"x":0.1,"y":0.1,"w":0.5,"h":0.3}}]}。'
                        f"上下文：{json.dumps(snapshot, ensure_ascii=False)}"
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": reference},
                },
            ],
        },
    ]


def _chat_completions_url(base_url: str) -> str:
    trimmed = base_url.rstrip("/")
    if trimmed.endswith("/chat/completions"):
        return trimmed
    if trimmed.endswith("/v1"):
        return trimmed + "/chat/completions"
    return trimmed + "/v1/chat/completions"


def _call_remote_decomposition(
    *,
    base_url: str,
    model_name: str,
    api_key: str,
    bundle: dict[str, Any],
) -> dict[str, Any] | None:
    if not base_url.strip() or not model_name.strip():
        return None
    messages = _decomposition_prompt(bundle)
    if not messages:
        return None
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    response = httpx.post(
        _chat_completions_url(base_url),
        headers=headers,
        json={
            "model": model_name,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": messages,
        },
        timeout=settings.fashion_multimodal_timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    choices = payload.get("choices", []) if isinstance(payload, dict) else []
    content = ""
    if choices:
        message = choices[0].get("message", {})
        content = message.get("content") or ""
        if isinstance(content, list):
            content = "\n".join(str(part.get("text") or "") for part in content if isinstance(part, dict))
    return _json_from_text(str(content))


def _normalize_remote_bbox(raw_bbox: dict[str, Any], image_size: tuple[int, int]) -> dict[str, int]:
    width, height = image_size
    x = float(raw_bbox.get("x", 0))
    y = float(raw_bbox.get("y", 0))
    w = float(raw_bbox.get("w", 1))
    h = float(raw_bbox.get("h", 1))
    if x <= 1 and y <= 1 and w <= 1.01 and h <= 1.01:
        return {
            "x": int(x * width),
            "y": int(y * height),
            "w": max(1, int(w * width)),
            "h": max(1, int(h * height)),
        }
    return {
        "x": int(x),
        "y": int(y),
        "w": max(1, int(w)),
        "h": max(1, int(h)),
    }


def _build_remote_preview(
    bundle: dict[str, Any],
    *,
    user_id: int | None,
    preview_id: str,
    provider_label: str,
    remote_payload: dict[str, Any],
) -> dict[str, Any] | None:
    image_url = str(bundle.get("primary_image_url") or "")
    try:
        loaded = storage_service.load_asset_bytes(image_url)
    except Exception:
        loaded = None
    if loaded:
        with Image.open(BytesIO(loaded.payload)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
    else:
        image = None
    clean_background = bool(image and _corner_brightness(image) >= 238)
    raw_pieces = remote_payload.get("pieces", []) if isinstance(remote_payload, dict) else []
    if not isinstance(raw_pieces, list):
        return None

    pieces = []
    for piece_index, raw_piece in enumerate(raw_pieces, start=1):
        if not isinstance(raw_piece, dict):
            continue
        slot = str(raw_piece.get("slot") or _guess_slot_from_text(str(raw_piece.get("category_name") or ""), "top"))
        normalized_piece: dict[str, Any] = {
            "slot": slot,
            "color": _translate_or_default(str(raw_piece.get("color") or ""), "米白色"),
            "category_name": _translate_or_default(str(raw_piece.get("category_name") or ""), SLOT_LABELS.get(slot, "单品")),
            "style": _translate_or_default(str(raw_piece.get("style") or ""), ""),
            "material": _translate_or_default(str(raw_piece.get("material") or ""), ""),
            "season": _translate_or_default(str(raw_piece.get("season") or ""), ""),
            "confidence": float(raw_piece.get("confidence") or 0.66),
            "source_image_url": image_url,
        }
        if image and isinstance(raw_piece.get("bbox"), dict):
            normalized_piece["bbox"] = _normalize_remote_bbox(raw_piece["bbox"], image.size)
            normalized_piece.update(
                _compose_piece_assets(
                    image,
                    normalized_piece,
                    user_id=user_id,
                    preview_id=preview_id,
                    piece_index=piece_index,
                    clean_background=clean_background,
                )
            )
        else:
            normalized_piece["bbox"] = {"x": 0, "y": 0, "w": 0, "h": 0}
            normalized_piece["preview_image_url"] = image_url
            normalized_piece["processed_image_url"] = image_url
        pieces.append(
            _normalize_piece(
                normalized_piece,
                piece_index=piece_index,
                provider=provider_label,
                platform=str(bundle.get("platform") or "外部导入"),
            )
        )

    if not pieces:
        return None
    return {
        "provider_used": provider_label,
        "image_mode": str(remote_payload.get("image_mode") or "unknown"),
        "notes": [f"已由 {provider_label} 补做单品解构与属性识别。"],
        "pieces": pieces,
    }


def _fallback_preview(bundle: dict[str, Any], *, provider_label: str) -> dict[str, Any]:
    source_text = _source_text(bundle)
    slot = _guess_slot_from_text(source_text, "top")
    color = "米白色"
    category_name = "托特包" if slot == "accessory" else "运动鞋" if slot == "shoes" else "连衣裙" if slot == "dress" else SLOT_LABELS.get(slot, "单品")
    material = _heuristic_material(slot, category_name, color)
    style = _heuristic_style(slot, category_name)
    season = _heuristic_season(slot, category_name, material)
    piece = _normalize_piece(
        {
            "id": "piece-1",
            "slot": slot,
            "color": color,
            "category_name": category_name,
            "style": style,
            "material": material,
            "season": season,
            "confidence": 0.45,
            "bbox": {"x": 0, "y": 0, "w": 0, "h": 0},
            "preview_image_url": bundle.get("primary_image_url"),
            "processed_image_url": bundle.get("primary_image_url"),
            "source_image_url": bundle.get("primary_image_url"),
        },
        piece_index=1,
        provider=provider_label,
        platform=str(bundle.get("platform") or "外部导入"),
    )
    return {
        "provider_used": provider_label,
        "image_mode": "fallback",
        "notes": ["图片暂时没能被精确分割，已按单品级规则兜底生成预览，可继续确认入库或重新解析。"],
        "pieces": [piece],
    }


def _provider_chain(config: dict[str, Any]) -> str:
    return " → ".join(
        [
            str(config.get("recognition_local_model") or "本地视觉解构"),
            str(config.get("recognition_deepseek_model") or "DeepSeek"),
            str(config.get("recognition_openai_model") or "OpenAI"),
        ]
    )


def generate_decomposition_preview(
    bundle: dict[str, Any],
    *,
    user_id: int | None,
    config: dict[str, Any] | None = None,
    preview_id: str | None = None,
) -> dict[str, Any]:
    normalized_config = config or {}
    resolved_preview_id = preview_id or Path(str(bundle.get("source_url") or "preview")).stem or "preview"
    attempts = max(1, min(3, int(normalized_config.get("recognition_retries", 1)) + 1))

    providers: list[tuple[str, Any]] = [
        ("本地视觉解构", lambda: _build_local_preview(bundle, user_id=user_id, preview_id=resolved_preview_id, config=normalized_config)),
    ]
    if settings.vllm_base_url.strip():
        providers.append(
            (
                f"本地多模态 · {settings.qwen_model_name}",
                lambda: _build_remote_preview(
                    bundle,
                    user_id=user_id,
                    preview_id=resolved_preview_id,
                    provider_label=f"本地多模态 · {settings.qwen_model_name}",
                    remote_payload=_call_remote_decomposition(
                        base_url=settings.vllm_base_url,
                        model_name=settings.qwen_model_name,
                        api_key="",
                        bundle=bundle,
                    )
                    or {},
                ),
            )
        )
    if settings.deepseek_api_key.strip():
        providers.append(
            (
                f"DeepSeek · {normalized_config.get('recognition_deepseek_model') or settings.deepseek_multimodal_model}",
                lambda: _build_remote_preview(
                    bundle,
                    user_id=user_id,
                    preview_id=resolved_preview_id,
                    provider_label=f"DeepSeek · {normalized_config.get('recognition_deepseek_model') or settings.deepseek_multimodal_model}",
                    remote_payload=_call_remote_decomposition(
                        base_url=settings.deepseek_base_url,
                        model_name=str(normalized_config.get('recognition_deepseek_model') or settings.deepseek_multimodal_model),
                        api_key=settings.deepseek_api_key,
                        bundle=bundle,
                    )
                    or {},
                ),
            )
        )
    if settings.openai_api_key.strip():
        providers.append(
            (
                f"OpenAI · {normalized_config.get('recognition_openai_model') or settings.openai_multimodal_model}",
                lambda: _build_remote_preview(
                    bundle,
                    user_id=user_id,
                    preview_id=resolved_preview_id,
                    provider_label=f"OpenAI · {normalized_config.get('recognition_openai_model') or settings.openai_multimodal_model}",
                    remote_payload=_call_remote_decomposition(
                        base_url=settings.openai_base_url,
                        model_name=str(normalized_config.get('recognition_openai_model') or settings.openai_multimodal_model),
                        api_key=settings.openai_api_key,
                        bundle=bundle,
                    )
                    or {},
                ),
            )
        )

    preview_core = None
    for _, runner in providers:
        for _ in range(attempts):
            try:
                preview_core = runner()
            except Exception as exc:
                logger.warning("Decomposition provider failed: %s", exc)
                preview_core = None
            if preview_core and preview_core.get("pieces"):
                break
        if preview_core and preview_core.get("pieces"):
            break

    if not preview_core:
        preview_core = _fallback_preview(bundle, provider_label="规则兜底")

    candidates = bundle.get("image_candidates") or []
    return {
        "id": resolved_preview_id,
        "platform": bundle.get("platform") or "外部导入",
        "title": bundle.get("title") or bundle.get("name") or "智能解构预览",
        "description": bundle.get("description") or "",
        "source_url": bundle.get("source_url"),
        "primary_image_url": bundle.get("primary_image_url"),
        "image_candidates": candidates[:4],
        "strategy": {
            "provider_chain": _provider_chain(normalized_config),
            "provider_used": preview_core.get("provider_used"),
            "image_mode": preview_core.get("image_mode"),
            "candidate_count": len(candidates),
            "notes": preview_core.get("notes") or [],
        },
        "pieces": preview_core.get("pieces") or [],
    }
