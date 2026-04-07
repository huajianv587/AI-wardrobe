from __future__ import annotations

import base64
import importlib.util
import os
import platform
import sys
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from pydantic import BaseModel, Field

try:
    import torch
except Exception:  # pragma: no cover - runtime availability only
    torch = None


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OOTD_ROOT = PROJECT_ROOT / "model_training" / "checkpoints" / "virtual-tryon" / "ootdiffusion"
OOTD_RUN_ROOT = OOTD_ROOT / "run"
OOTD_CHECKPOINT_ROOT = OOTD_ROOT / "checkpoints"

HTTP_TIMEOUT_SECONDS = 60.0
OUTPUT_SIZE = (768, 1024)
REQUIRED_PACKAGES = (
    "torch",
    "diffusers",
    "accelerate",
    "onnxruntime",
    "transformers",
    "cv2",
    "einops",
    "config",
)
REQUIRED_PATHS = {
    "ootd_source": OOTD_ROOT / "ootd",
    "run_scripts": OOTD_RUN_ROOT / "utils_ootd.py",
    "clip_checkpoint": OOTD_CHECKPOINT_ROOT / "clip-vit-large-patch14",
    "ootd_checkpoint": OOTD_CHECKPOINT_ROOT / "ootd" / "model_index.json",
    "openpose_checkpoint": OOTD_CHECKPOINT_ROOT / "openpose" / "ckpts" / "body_pose_model.pth",
    "humanparsing_atr": OOTD_CHECKPOINT_ROOT / "humanparsing" / "parsing_atr.onnx",
    "humanparsing_lip": OOTD_CHECKPOINT_ROOT / "humanparsing" / "parsing_lip.onnx",
}

app = FastAPI(
    title="AI Wardrobe Virtual Try-On Worker",
    version="2.0.0",
    description="Local OOTDiffusion worker with a visible composite fallback.",
)


class TryOnInferRequest(BaseModel):
    person_image_url: str | None = None
    garment_image_urls: list[str] = Field(default_factory=list)
    item_ids: list[int] = Field(default_factory=list)
    prompt: str | None = None
    scene: str | None = None
    category: str | None = None
    model_type: str | None = None
    num_samples: int = Field(default=1, ge=1, le=4)
    num_steps: int = Field(default=20, ge=1, le=50)
    guidance_scale: float = Field(default=2.0, ge=0.1, le=8.0)
    seed: int = -1


@dataclass
class RuntimeStatus:
    ready: bool
    missing: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class TryOnRuntime:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._modules_loaded = False
        self._openpose = None
        self._parsing = None
        self._hd_model = None
        self._dc_model = None
        self._get_mask_location = None

    def status(self) -> RuntimeStatus:
        missing: list[str] = []
        warnings: list[str] = []

        for key, path in REQUIRED_PATHS.items():
            if not path.exists():
                missing.append(f"path:{key}")

        for package_name in REQUIRED_PACKAGES:
            if importlib.util.find_spec(package_name) is None:
                missing.append(f"package:{package_name}")

        if torch is None:
            missing.append("package:torch")
        elif not torch.cuda.is_available():
            missing.append("runtime:cuda")

        if platform.system().lower() != "linux":
            warnings.append("OOTDiffusion official pipeline is primarily validated on Linux; current platform may need extra fixes.")

        return RuntimeStatus(ready=not missing, missing=missing, warnings=warnings)

    def _ensure_import_paths(self) -> None:
        for path in (OOTD_ROOT, OOTD_RUN_ROOT):
            value = str(path)
            if value not in sys.path:
                sys.path.insert(0, value)

    def _load_modules(self) -> None:
        if self._modules_loaded:
            return

        self._ensure_import_paths()

        from preprocess.openpose.run_openpose import OpenPose
        from preprocess.humanparsing.run_parsing import Parsing
        from run.utils_ootd import get_mask_location
        from ootd.inference_ootd_dc import OOTDiffusionDC
        from ootd.inference_ootd_hd import OOTDiffusionHD

        self._OpenPose = OpenPose
        self._Parsing = Parsing
        self._OOTDiffusionDC = OOTDiffusionDC
        self._OOTDiffusionHD = OOTDiffusionHD
        self._get_mask_location = get_mask_location
        self._modules_loaded = True

    def _shared_preprocessors(self) -> tuple[object, object]:
        with self._lock:
            self._load_modules()
            if self._openpose is None:
                self._openpose = self._OpenPose(0)
            if self._parsing is None:
                self._parsing = self._Parsing(0)
            return self._openpose, self._parsing

    def _model(self, model_type: str) -> object:
        with self._lock:
            self._load_modules()
            if model_type == "hd":
                if self._hd_model is None:
                    self._hd_model = self._OOTDiffusionHD(0)
                return self._hd_model
            if self._dc_model is None:
                self._dc_model = self._OOTDiffusionDC(0)
            return self._dc_model

    def render(
        self,
        *,
        person_image: Image.Image,
        garment_image: Image.Image,
        category: str,
        model_type: str,
        num_samples: int,
        num_steps: int,
        guidance_scale: float,
        seed: int,
    ) -> tuple[list[Image.Image], list[str]]:
        openpose_model, parsing_model = self._shared_preprocessors()
        warnings: list[str] = []
        category_code = {"upper_body": 0, "lower_body": 1, "dresses": 2}[category]
        runtime_model = model_type
        if runtime_model == "hd" and category != "upper_body":
            runtime_model = "dc"
            warnings.append("HD mode only supports upper-body garments, switched to DC mode automatically.")

        resized_person = person_image.resize(OUTPUT_SIZE, Image.LANCZOS)
        resized_garment = garment_image.resize(OUTPUT_SIZE, Image.LANCZOS)
        keypoints = openpose_model(resized_person.resize((384, 512)))
        parsed_image, _ = parsing_model(resized_person.resize((384, 512)))
        mask, mask_gray = self._get_mask_location(runtime_model, category, parsed_image, keypoints)
        mask = mask.resize(OUTPUT_SIZE, Image.NEAREST)
        mask_gray = mask_gray.resize(OUTPUT_SIZE, Image.NEAREST)
        masked_vton_img = Image.composite(mask_gray, resized_person, mask)

        model = self._model(runtime_model)
        category_label = {"upper_body": "upperbody", "lower_body": "lowerbody", "dresses": "dress"}[category]
        images = model(
            model_type=runtime_model,
            category=category_label,
            image_garm=resized_garment,
            image_vton=masked_vton_img,
            mask=mask,
            image_ori=resized_person,
            num_samples=num_samples,
            num_steps=num_steps,
            image_scale=guidance_scale,
            seed=seed,
        )
        return images, warnings


RUNTIME = TryOnRuntime()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _png_base64(image: Image.Image) -> str:
    output = BytesIO()
    image.save(output, format="PNG")
    return base64.b64encode(output.getvalue()).decode("ascii")


def _module_available(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def _download_image(url: str) -> Image.Image:
    response = httpx.get(url, follow_redirects=True, timeout=HTTP_TIMEOUT_SECONDS)
    response.raise_for_status()
    with Image.open(BytesIO(response.content)) as opened:
        return ImageOps.exif_transpose(opened).convert("RGBA")


def _transparentize_light_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, alpha in rgba.getdata():
        if red >= 246 and green >= 246 and blue >= 246:
            pixels.append((red, green, blue, 0))
        else:
            pixels.append((red, green, blue, alpha))
    rgba.putdata(pixels)
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
    draw.rounded_rectangle(
        (width * 0.32, height * 0.25, width * 0.68, height * 0.84),
        radius=220,
        fill=(247, 239, 231, 112),
        outline=(210, 188, 173, 160),
        width=6,
    )
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


def _infer_slot(category: str) -> str:
    return {
        "upper_body": "top",
        "lower_body": "bottom",
        "dresses": "dress",
    }[category]


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


def _fallback_render(
    *,
    person_image: Image.Image | None,
    garment_image: Image.Image,
    category: str,
    prompt: str | None,
    scene: str | None,
) -> Image.Image:
    base = person_image.resize((1024, 1366), Image.LANCZOS).convert("RGBA") if person_image is not None else _background_canvas()
    if person_image is None:
        base.alpha_composite(_mannequin_silhouette(base.size))
    _place_overlay(base, garment_image, _infer_slot(category))

    footer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(footer)
    draw.rounded_rectangle((74, 1232, 950, 1304), radius=28, fill=(255, 250, 245, 214))
    draw.text((110, 1250), "Local Try-On Fallback", fill=(95, 66, 45, 255))
    subtitle = (scene or prompt or "Local composite preview")[:48]
    draw.text((110, 1278), subtitle, fill=(136, 104, 83, 255))
    base.alpha_composite(footer)
    return base.convert("RGBA")


def _infer_category(payload: TryOnInferRequest) -> str:
    if payload.category:
        normalized = payload.category.strip().lower()
        mapping = {
            "upperbody": "upper_body",
            "upper_body": "upper_body",
            "top": "upper_body",
            "tops": "upper_body",
            "outerwear": "upper_body",
            "lowerbody": "lower_body",
            "lower_body": "lower_body",
            "bottom": "lower_body",
            "bottoms": "lower_body",
            "pants": "lower_body",
            "dress": "dresses",
            "dresses": "dresses",
        }
        if normalized in mapping:
            return mapping[normalized]

    hint_text = " ".join([payload.prompt or "", payload.scene or ""]).lower()
    if any(keyword in hint_text for keyword in ("dress", "gown", "连衣裙", "裙装")):
        return "dresses"
    if any(keyword in hint_text for keyword in ("pants", "trousers", "jeans", "skirt", "shorts", "裤", "裙", "半裙")):
        return "lower_body"
    return "upper_body"


def _infer_model_type(payload: TryOnInferRequest, category: str) -> str:
    if payload.model_type:
        normalized = payload.model_type.strip().lower()
        if normalized in {"hd", "dc"}:
            return normalized
    return "hd" if category == "upper_body" else "dc"


@app.get("/health")
def health() -> dict[str, object]:
    status = RUNTIME.status()
    return {
        "status": "ready" if status.ready else "degraded",
        "mode": "ootdiffusion-ready" if status.ready else "local-composite-fallback",
        "provider": "OOTDiffusion" if status.ready else "Local composite fallback",
        "checkpoint_root": str(OOTD_ROOT),
        "cuda_available": bool(torch is not None and torch.cuda.is_available()),
        "windows_runtime": platform.system().lower().startswith("win"),
        "missing": status.missing,
        "warnings": status.warnings,
        "checked_at": _utc_now_iso(),
    }


@app.post("/infer")
def infer(payload: TryOnInferRequest) -> dict[str, object]:
    if not payload.garment_image_urls:
        raise HTTPException(status_code=400, detail="garment_image_urls must include at least one image.")

    try:
        garment_image = _download_image(payload.garment_image_urls[0])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to load garment image: {exc}") from exc

    person_image = None
    if payload.person_image_url:
        try:
            person_image = _download_image(payload.person_image_url)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Unable to load person image: {exc}") from exc

    category = _infer_category(payload)
    model_type = _infer_model_type(payload, category)
    status = RUNTIME.status()
    warnings = list(status.warnings)

    if status.ready and person_image is not None:
        try:
            images, runtime_warnings = RUNTIME.render(
                person_image=person_image,
                garment_image=garment_image,
                category=category,
                model_type=model_type,
                num_samples=payload.num_samples,
                num_steps=payload.num_steps,
                guidance_scale=payload.guidance_scale,
                seed=payload.seed,
            )
            warnings.extend(runtime_warnings)
            result_image = images[0].convert("RGBA")
            return {
                "status": "ready",
                "provider_mode": "local",
                "provider": "OOTDiffusion local",
                "content_type": "image/png",
                "image_base64": _png_base64(result_image),
                "category": category,
                "model_type": model_type,
                "warnings": warnings,
                "generated_at": _utc_now_iso(),
            }
        except Exception as exc:
            warnings.append(f"OOTDiffusion inference failed, switched to local composite fallback: {exc}")

    fallback_image = _fallback_render(
        person_image=person_image,
        garment_image=garment_image,
        category=category,
        prompt=payload.prompt,
        scene=payload.scene,
    )
    if person_image is None:
        warnings.append("No person_image_url was provided, so the worker rendered a mannequin-based local preview.")
    if status.missing:
        warnings.append("Local generative runtime is not fully ready on this machine.")

    return {
        "status": "degraded",
        "provider_mode": "local-fallback",
        "provider": "Local composite fallback",
        "content_type": "image/png",
        "image_base64": _png_base64(fallback_image),
        "category": category,
        "model_type": model_type,
        "warnings": warnings,
        "missing": status.missing,
        "generated_at": _utc_now_iso(),
    }

