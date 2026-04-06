from __future__ import annotations

import importlib
import logging
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import Image

from core.config import settings

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency
    import cv2
except Exception:  # pragma: no cover - optional dependency
    cv2 = None

try:  # pragma: no cover - optional dependency
    import numpy as np
except Exception:  # pragma: no cover - optional dependency
    np = None

try:  # pragma: no cover - optional dependency
    import torch
except Exception:  # pragma: no cover - optional dependency
    torch = None

try:  # pragma: no cover - optional dependency
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
except Exception:  # pragma: no cover - optional dependency
    build_sam2 = None
    SAM2ImagePredictor = None


SAM2_DEFAULT_CONFIG = "configs/sam2.1/sam2.1_hiera_s.yaml"
SAM2_DEFAULT_CHECKPOINT = "sam2.1_hiera_small.pt"
SCHP_CHECKPOINTS = {
    "atr": "exp-schp-201908301523-atr.pth",
    "lip": "exp-schp-201908261155-lip.pth",
}
SCHP_LABELS = {
    "lip": [
        "Background",
        "Hat",
        "Hair",
        "Glove",
        "Sunglasses",
        "Upper-clothes",
        "Dress",
        "Coat",
        "Socks",
        "Pants",
        "Jumpsuits",
        "Scarf",
        "Skirt",
        "Face",
        "Left-arm",
        "Right-arm",
        "Left-leg",
        "Right-leg",
        "Left-shoe",
        "Right-shoe",
    ],
    "atr": [
        "Background",
        "Hat",
        "Hair",
        "Sunglasses",
        "Upper-clothes",
        "Skirt",
        "Pants",
        "Dress",
        "Belt",
        "Left-shoe",
        "Right-shoe",
        "Face",
        "Left-leg",
        "Right-leg",
        "Left-arm",
        "Right-arm",
        "Bag",
        "Scarf",
    ],
}
SCHP_INPUT_SIZES = {
    "lip": [473, 473],
    "atr": [512, 512],
}
SCHP_LABEL_TO_INDEX = {
    dataset: {label: index for index, label in enumerate(labels)}
    for dataset, labels in SCHP_LABELS.items()
}
YOLO_ACCESSORY_LABELS = {"handbag", "backpack", "tie"}


def _fashion_model_root() -> Path:
    configured = (settings.fashion_model_root or "").strip() or "./data/models/fashion"
    return Path(configured).expanduser()


def _resolve_sam2_checkpoint() -> Path | None:
    configured = (settings.fashion_sam2_checkpoint or "").strip()
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.exists():
            return candidate
    bundled = _fashion_model_root() / "sam2" / SAM2_DEFAULT_CHECKPOINT
    if bundled.exists():
        return bundled
    return None


def _resolve_sam2_config() -> str:
    configured = (settings.fashion_sam2_config or "").strip()
    return configured or SAM2_DEFAULT_CONFIG


def _resolve_schp_checkpoint(dataset: str) -> Path | None:
    configured = (settings.fashion_schp_checkpoint or "").strip()
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.is_dir():
            nested = candidate / dataset / SCHP_CHECKPOINTS[dataset]
            if nested.exists():
                return nested
        elif candidate.exists() and dataset in candidate.name.lower():
            return candidate
    bundled = _fashion_model_root() / "schp" / dataset / SCHP_CHECKPOINTS[dataset]
    if bundled.exists():
        return bundled
    return None


def _torch_device() -> str:
    if torch is not None and torch.cuda.is_available():  # pragma: no cover - hardware dependent
        return "cuda"
    return "cpu"


def _vendor_root(name: str) -> Path:
    return Path(__file__).resolve().parents[1] / "vendor" / name


def _ensure_schp_imports():
    repo_root = _vendor_root("self_correction_human_parsing")
    if not repo_root.exists():
        return None
    repo_str = str(repo_root.resolve())
    if repo_str not in sys.path:
        sys.path.insert(0, repo_str)
    try:
        networks = importlib.import_module("networks")
        transforms_module = importlib.import_module("utils.transforms")
    except Exception as exc:  # pragma: no cover - optional runtime path
        logger.info("SCHP vendor imports unavailable: %s", exc)
        return None
    return networks, transforms_module


def _xywh_to_center_scale(x: float, y: float, width: float, height: float, input_size: list[int]) -> tuple[Any, Any]:
    center = np.zeros((2,), dtype=np.float32)
    center[0] = x + width * 0.5
    center[1] = y + height * 0.5
    aspect_ratio = input_size[1] * 1.0 / input_size[0]
    if width > aspect_ratio * height:
        height = width * 1.0 / aspect_ratio
    elif width < aspect_ratio * height:
        width = height * aspect_ratio
    scale = np.array([width, height], dtype=np.float32)
    return center, scale


def _largest_component(mask: Any) -> Any:
    if np is None:
        return mask
    mask_bool = np.asarray(mask).astype(bool)
    if not mask_bool.any() or cv2 is None:
        return mask_bool
    label_count, label_map, stats, _ = cv2.connectedComponentsWithStats(mask_bool.astype("uint8"), 8)
    if label_count <= 1:
        return mask_bool
    largest_label = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return label_map == largest_label


def _mask_area(mask: Any) -> int:
    if np is None:
        return 0
    mask_bool = np.asarray(mask).astype(bool)
    return int(mask_bool.sum())


def _mask_to_bbox(mask: Any) -> dict[str, int] | None:
    if np is None:
        return None
    mask_bool = np.asarray(mask).astype(bool)
    if not mask_bool.any():
        return None
    ys, xs = np.where(mask_bool)
    x1 = int(xs.min())
    y1 = int(ys.min())
    x2 = int(xs.max()) + 1
    y2 = int(ys.max()) + 1
    return {"x": x1, "y": y1, "w": max(1, x2 - x1), "h": max(1, y2 - y1)}


def _place_crop_mask(mask: Any, image_size: tuple[int, int], region: tuple[int, int, int, int]) -> Any:
    if np is None:
        return None
    left, top, right, bottom = region
    width, height = image_size
    full_mask = np.zeros((height, width), dtype=bool)
    full_mask[top:bottom, left:right] = np.asarray(mask).astype(bool)
    return full_mask


def _piece_from_mask(slot: str, full_mask: Any, confidence: float, provider: str) -> dict[str, Any] | None:
    if np is None or full_mask is None:
        return None
    mask = _largest_component(full_mask)
    bbox = _mask_to_bbox(mask)
    if not bbox:
        return None
    return {
        "slot": slot,
        "bbox": bbox,
        "mask": mask,
        "confidence": confidence,
        "segmentation_provider": provider,
    }


@lru_cache(maxsize=2)
def _get_schp_model(dataset: str):  # pragma: no cover - depends on optional runtime setup
    if np is None or cv2 is None or torch is None:
        return None
    modules = _ensure_schp_imports()
    checkpoint = _resolve_schp_checkpoint(dataset)
    if modules is None or checkpoint is None:
        return None
    networks, _ = modules
    try:
        model = networks.init_model("resnet101", num_classes=len(SCHP_LABELS[dataset]), pretrained=None)
        loaded = torch.load(str(checkpoint), map_location="cpu")
        state_dict = loaded.get("state_dict", loaded) if isinstance(loaded, dict) else loaded
        cleaned = {}
        for key, value in state_dict.items():
            normalized_key = key[7:] if str(key).startswith("module.") else key
            cleaned[normalized_key] = value
        model.load_state_dict(cleaned, strict=False)
        model = model.to(_torch_device())
        model.eval()
        return model
    except Exception as exc:
        logger.info("SCHP %s unavailable: %s", dataset, exc)
        return None


def _parse_schp(image: Image.Image, dataset: str):  # pragma: no cover - depends on optional runtime setup
    if np is None or cv2 is None or torch is None:
        return None
    modules = _ensure_schp_imports()
    model = _get_schp_model(dataset)
    if modules is None or model is None:
        return None
    _, transforms_module = modules
    input_size = SCHP_INPUT_SIZES[dataset]
    rgb = np.asarray(image.convert("RGB"))
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    height, width = bgr.shape[:2]
    center, scale = _xywh_to_center_scale(0, 0, max(1, width - 1), max(1, height - 1), input_size)
    affine = transforms_module.get_affine_transform(center, scale, 0, np.asarray(input_size))
    warped = cv2.warpAffine(
        bgr,
        affine,
        (int(input_size[1]), int(input_size[0])),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )
    tensor = torch.from_numpy(warped.transpose((2, 0, 1))).float() / 255.0
    mean = torch.tensor([0.406, 0.456, 0.485], dtype=torch.float32).view(3, 1, 1)
    std = torch.tensor([0.225, 0.224, 0.229], dtype=torch.float32).view(3, 1, 1)
    tensor = ((tensor - mean) / std).unsqueeze(0).to(_torch_device())
    with torch.no_grad():
        output = model(tensor)
        logits = output
        if isinstance(logits, (list, tuple)) and logits:
            logits = logits[0]
        if isinstance(logits, (list, tuple)) and logits:
            logits = logits[-1]
        if isinstance(logits, torch.Tensor) and logits.dim() == 4:
            upsampled = torch.nn.functional.interpolate(
                logits,
                size=input_size,
                mode="bilinear",
                align_corners=True,
            )
            logits_array = upsampled[0].permute(1, 2, 0).detach().cpu().numpy()
        else:
            return None
    restored = transforms_module.transform_logits(logits_array, center, scale, width, height, input_size=input_size)
    return np.argmax(restored, axis=2).astype("uint8")


@lru_cache(maxsize=1)
def _get_sam2_model():  # pragma: no cover - depends on optional runtime setup
    if np is None or torch is None or build_sam2 is None:
        return None
    checkpoint = _resolve_sam2_checkpoint()
    if checkpoint is None:
        return None
    try:
        return build_sam2(
            _resolve_sam2_config(),
            ckpt_path=str(checkpoint),
            device=_torch_device(),
        )
    except Exception as exc:
        logger.info("SAM2 unavailable: %s", exc)
        return None


def _predict_mask_from_box(predictor: Any, bbox: dict[str, int]):
    if np is None:
        return None
    x1 = int(bbox.get("x", 0))
    y1 = int(bbox.get("y", 0))
    x2 = x1 + max(1, int(bbox.get("w", 1)))
    y2 = y1 + max(1, int(bbox.get("h", 1)))
    if x2 <= x1 or y2 <= y1:
        return None
    masks, scores, _ = predictor.predict(
        box=np.asarray([x1, y1, x2, y2], dtype=np.float32),
        multimask_output=True,
        return_logits=False,
        normalize_coords=False,
    )
    if masks is None or not len(masks):
        return None
    box_area = max(1, (x2 - x1) * (y2 - y1))
    best_mask = None
    best_score = float("-inf")
    for index, mask in enumerate(masks):
        mask_bool = _largest_component(np.asarray(mask).astype(bool))
        area = _mask_area(mask_bool)
        if area < max(120, int(box_area * 0.04)):
            continue
        score = float(scores[index]) if index < len(scores) else 0.0
        area_ratio = area / float(box_area)
        if area_ratio > 2.4:
            continue
        quality = score - abs(min(area_ratio, 1.0) - 0.72) * 0.08
        if quality > best_score:
            best_score = quality
            best_mask = mask_bool
    return best_mask


def _person_region(image: Image.Image, detections: list[dict[str, Any]]) -> tuple[tuple[int, int, int, int], Image.Image]:
    width, height = image.size
    people = [entry for entry in detections if str(entry.get("label") or "") == "person"]
    if people:
        target = max(people, key=lambda entry: int(entry.get("bbox", {}).get("w", 0)) * int(entry.get("bbox", {}).get("h", 0)))
        bbox = target.get("bbox") or {}
        x = int(bbox.get("x", 0))
        y = int(bbox.get("y", 0))
        w = max(1, int(bbox.get("w", width)))
        h = max(1, int(bbox.get("h", height)))
    else:
        x, y, w, h = int(width * 0.16), int(height * 0.04), int(width * 0.68), int(height * 0.9)
    pad_x = int(w * 0.16)
    pad_y = int(h * 0.12)
    left = max(0, x - pad_x)
    top = max(0, y - pad_y)
    right = min(width, x + w + pad_x)
    bottom = min(height, y + h + pad_y)
    region = (left, top, max(left + 1, right), max(top + 1, bottom))
    return region, image.crop(region)


def _merge_valid_masks(*masks: Any):
    if np is None:
        return None
    merged = None
    for mask in masks:
        if mask is None:
            continue
        current = np.asarray(mask).astype(bool)
        merged = current if merged is None else np.logical_or(merged, current)
    return merged


def extract_person_photo_pieces(image: Image.Image, detections: list[dict[str, Any]], source_text: str) -> tuple[list[dict[str, Any]], list[str]]:
    if np is None:
        return [], []
    region, crop = _person_region(image, detections)
    atr_map = _parse_schp(crop, "atr")
    lip_map = _parse_schp(crop, "lip")
    if atr_map is None and lip_map is None:
        return [], []

    crop_area = max(1, crop.width * crop.height)
    atr_lookup = SCHP_LABEL_TO_INDEX["atr"]
    lip_lookup = SCHP_LABEL_TO_INDEX["lip"]

    def atr_mask(*labels: str):
        if atr_map is None:
            return None
        return _merge_valid_masks(*[(atr_map == atr_lookup[label]) for label in labels if label in atr_lookup])

    def lip_mask(*labels: str):
        if lip_map is None:
            return None
        return _merge_valid_masks(*[(lip_map == lip_lookup[label]) for label in labels if label in lip_lookup])

    def to_full(mask: Any):
        if mask is None:
            return None
        return _place_crop_mask(mask, image.size, region)

    def passes(mask: Any, ratio: float) -> bool:
        return mask is not None and _mask_area(mask) >= max(120, int(crop_area * ratio))

    dress_hint = any(token in source_text.lower() for token in ("dress", "连衣裙"))
    notes = ["人物图已启用 SCHP 人像精分。"]

    top_crop = _merge_valid_masks(atr_mask("Upper-clothes"), lip_mask("Upper-clothes"))
    outerwear_crop = lip_mask("Coat")
    dress_crop = _merge_valid_masks(atr_mask("Dress"), lip_mask("Dress"))
    bottom_crop = _merge_valid_masks(atr_mask("Pants", "Skirt"), lip_mask("Pants", "Skirt"))
    shoes_crop = _merge_valid_masks(atr_mask("Left-shoe", "Right-shoe"), lip_mask("Left-shoe", "Right-shoe"))
    accessory_crop = atr_mask("Bag")

    pieces: list[dict[str, Any]] = []
    dress_area = _mask_area(dress_crop)
    top_area = _mask_area(top_crop)
    bottom_area = _mask_area(bottom_crop)
    use_dress = passes(dress_crop, 0.065) and (dress_hint or dress_area >= max(int((top_area + bottom_area) * 0.75), int(crop_area * 0.12)))

    if passes(outerwear_crop, 0.03):
        piece = _piece_from_mask("outerwear", to_full(outerwear_crop), 0.84, "SCHP LIP")
        if piece:
            pieces.append(piece)

    if use_dress:
        piece = _piece_from_mask("dress", to_full(dress_crop), 0.88, "SCHP ATR/LIP")
        if piece:
            pieces.append(piece)
    else:
        if passes(top_crop, 0.028):
            piece = _piece_from_mask("top", to_full(top_crop), 0.86, "SCHP ATR/LIP")
            if piece:
                pieces.append(piece)
        if passes(bottom_crop, 0.026):
            piece = _piece_from_mask("bottom", to_full(bottom_crop), 0.84, "SCHP ATR/LIP")
            if piece:
                pieces.append(piece)

    if passes(shoes_crop, 0.012):
        piece = _piece_from_mask("shoes", to_full(shoes_crop), 0.8, "SCHP ATR/LIP")
        if piece:
            pieces.append(piece)

    if passes(accessory_crop, 0.006):
        piece = _piece_from_mask("accessory", to_full(accessory_crop), 0.78, "SCHP ATR")
        if piece:
            pieces.append(piece)

    if not any(piece["slot"] == "accessory" for piece in pieces):
        sam_model = _get_sam2_model()
        if sam_model is not None and SAM2ImagePredictor is not None:
            predictor = SAM2ImagePredictor(sam_model)
            predictor.set_image(np.asarray(image.convert("RGB")))
            try:
                for detection in detections:
                    if str(detection.get("label") or "") not in YOLO_ACCESSORY_LABELS:
                        continue
                    refined_mask = _predict_mask_from_box(predictor, detection.get("bbox") or {})
                    full_piece = _piece_from_mask(
                        "accessory",
                        refined_mask,
                        max(0.74, float(detection.get("confidence") or 0.0)),
                        "YOLO + SAM2",
                    ) if refined_mask is not None else None
                    if full_piece is not None:
                        pieces.append(full_piece)
                        notes.append("包袋已由 YOLO + SAM2 补做精细边界。")
                        break
            finally:
                predictor.reset_predictor()

    return pieces, notes


def refine_seed_pieces_with_sam2(image: Image.Image, seed_pieces: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    if np is None:
        return [dict(piece) for piece in seed_pieces], []
    sam_model = _get_sam2_model()
    if sam_model is None or SAM2ImagePredictor is None:
        return [dict(piece) for piece in seed_pieces], []

    predictor = SAM2ImagePredictor(sam_model)
    predictor.set_image(np.asarray(image.convert("RGB")))
    refined_pieces: list[dict[str, Any]] = []
    refined_count = 0
    try:
        for piece in seed_pieces:
            updated = dict(piece)
            refined_mask = _predict_mask_from_box(predictor, updated.get("bbox") or {})
            if refined_mask is not None:
                bbox = _mask_to_bbox(refined_mask)
                image_area = max(1, image.size[0] * image.size[1])
                area = _mask_area(refined_mask)
                if bbox and area < int(image_area * 0.96):
                    updated["mask"] = refined_mask
                    updated["bbox"] = bbox
                    updated["confidence"] = max(float(updated.get("confidence") or 0.68), 0.74)
                    updated["segmentation_provider"] = "SAM2"
                    refined_count += 1
            refined_pieces.append(updated)
    finally:
        predictor.reset_predictor()

    notes = ["平铺图已启用 SAM2 盒提示分割。"] if refined_count else []
    return refined_pieces, notes
