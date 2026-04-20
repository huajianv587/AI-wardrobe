from __future__ import annotations

import json
import os
import re
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

DEFAULT_MODEL_NAME = "Qwen/Qwen2.5-VL-7B-Instruct"
DEFAULT_MODEL_PATH = "/app/model_training/checkpoints/multimodal-reader"
DEFAULT_DATASET_DIR = "/app/model_training/datasets/multimodal-reader"
DEFAULT_PROMPT = "Describe the garment for wardrobe enrichment and return JSON only."
SYSTEM_PROMPT = (
    "You extract wardrobe metadata from a single garment image. "
    "Return strict JSON with keys tags, occasions, style_notes, color_family, "
    "dominant_color, fabric_guess, silhouette, season, mood, and category."
)


class WorkerSettings(BaseModel):
    service_name: str = "multimodal-reader"
    port: int = 9004
    run_mode: str = os.getenv("MULTIMODAL_READER_RUN_MODE", "heuristic")
    model_name: str = os.getenv("MULTIMODAL_READER_MODEL_NAME", DEFAULT_MODEL_NAME)
    model_path: str = os.getenv("MULTIMODAL_READER_MODEL_PATH", DEFAULT_MODEL_PATH)
    dataset_dir: str = os.getenv("MULTIMODAL_READER_DATASET_DIR", DEFAULT_DATASET_DIR)
    upstream_url: str = os.getenv("MULTIMODAL_READER_UPSTREAM_URL", os.getenv("VLLM_BASE_URL", ""))
    api_key: str = os.getenv("MULTIMODAL_READER_API_KEY", "")
    timeout_seconds: float = float(os.getenv("MULTIMODAL_READER_TIMEOUT_SECONDS", "45"))

    @property
    def checkpoint_present(self) -> bool:
        return Path(self.model_path).exists()

    @property
    def dataset_present(self) -> bool:
        return Path(self.dataset_dir).exists()


settings = WorkerSettings()
app = FastAPI(title="AI Wardrobe Multimodal Reader", version="0.2.0")


class WardrobeItemPayload(BaseModel):
    id: int | None = None
    name: str | None = None
    category: str | None = None
    slot: str | None = None
    color: str | None = None
    brand: str | None = None
    tags: list[str] = Field(default_factory=list)
    occasions: list[str] = Field(default_factory=list)
    style_notes: str | None = None
    image_url: str | None = None


class InferRequest(BaseModel):
    image_url: str | None = None
    prompt: str = ""
    garment_name: str | None = None
    mode: str | None = None
    item: WardrobeItemPayload | None = None


WardrobeItemPayload.model_rebuild()
InferRequest.model_rebuild()


def _chat_completions_url(base_url: str) -> str:
    trimmed = base_url.rstrip("/")
    if trimmed.endswith("/chat/completions"):
        return trimmed
    if trimmed.endswith("/v1"):
        return trimmed + "/chat/completions"
    return trimmed + "/v1/chat/completions"


def _json_from_text(content: str | None) -> dict | None:
    if not content:
        return None
    cleaned = str(content).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _normalize_list(values: object, limit: int) -> list[str]:
    if not isinstance(values, list):
        return []
    cleaned = [str(value).strip() for value in values if str(value).strip()]
    return list(dict.fromkeys(cleaned))[:limit]


def _normalize_payload(payload: dict | None) -> dict[str, object] | None:
    if not isinstance(payload, dict):
        return None
    normalized = {
        "tags": _normalize_list(payload.get("tags"), 8),
        "occasions": _normalize_list(payload.get("occasions"), 6),
        "style_notes": str(payload.get("style_notes") or payload.get("note") or "").strip(),
        "color_family": str(payload.get("color_family") or "").strip(),
        "dominant_color": str(payload.get("dominant_color") or "").strip(),
        "fabric_guess": str(payload.get("fabric_guess") or "").strip(),
        "silhouette": str(payload.get("silhouette") or "").strip(),
        "season": str(payload.get("season") or "").strip(),
        "mood": str(payload.get("mood") or "").strip(),
        "category": str(payload.get("category") or "").strip(),
    }
    if not normalized["tags"] and not normalized["style_notes"]:
        return None
    return normalized


def _effective_image_url(payload: InferRequest) -> str | None:
    return (payload.image_url or (payload.item.image_url if payload.item else None) or "").strip() or None


def _context_snapshot(payload: InferRequest) -> dict[str, object]:
    item = payload.item
    return {
        "garment_name": payload.garment_name or (item.name if item else "") or "",
        "category": item.category if item else "",
        "slot": item.slot if item else "",
        "color": item.color if item else "",
        "brand": item.brand if item else "",
        "tags": list(item.tags) if item else [],
        "occasions": list(item.occasions) if item else [],
        "style_notes": item.style_notes if item else "",
        "mode": payload.mode or "attribute-reading",
    }


def _heuristic_result(payload: InferRequest) -> dict[str, object]:
    item = payload.item
    garment_name = payload.garment_name or (item.name if item else "") or "garment"
    text = " ".join(
        [
            garment_name.lower(),
            payload.prompt.lower(),
            item.category.lower() if item and item.category else "",
            item.slot.lower() if item and item.slot else "",
            item.color.lower() if item and item.color else "",
            " ".join(item.tags).lower() if item else "",
            " ".join(item.occasions).lower() if item else "",
            item.style_notes.lower() if item and item.style_notes else "",
        ]
    )
    if any(token in text for token in ["blazer", "shirt", "trouser", "loafer", "office", "meeting"]):
        occasions = ["office", "meeting"]
        mood = "sharp polished"
        color_family = "dark-neutral" if any(token in text for token in ["black", "charcoal", "navy"]) else "earth"
        fabric_guess = "woven blend"
        silhouette = "structured layer"
    elif any(token in text for token in ["dress", "skirt", "heel", "date", "dinner"]):
        occasions = ["date-night", "dinner"]
        mood = "soft feminine"
        color_family = "color"
        fabric_guess = "woven blend"
        silhouette = "soft drape"
    else:
        occasions = ["weekend", "errand"]
        mood = "calm refined"
        color_family = "light-neutral" if any(token in text for token in ["cream", "ivory", "white", "beige"]) else "earth"
        fabric_guess = "cotton blend"
        silhouette = "clean regular"

    if item and item.category:
        category = item.category.strip()
    elif "blazer" in text:
        category = "blazer"
    elif "cardigan" in text:
        category = "cardigan"
    elif "dress" in text:
        category = "dress"
    elif "loafer" in text:
        category = "loafers"
    elif "boot" in text:
        category = "boots"
    else:
        category = "top"
    dominant_color = (item.color if item and item.color else "").strip().lower() or "neutral"
    tags = list(
        dict.fromkeys(
            [
                category.lower(),
                dominant_color,
                color_family,
                fabric_guess,
                mood.split()[0],
            ]
        )
    )
    style_notes = (
        f"This {garment_name} reads {mood}, with a {silhouette} profile and "
        f"a {fabric_guess} feel that fits {', '.join(occasions[:2])} use."
    )
    return {
        "status": "heuristic",
        "provider_mode": "heuristic",
        "tags": tags,
        "occasions": occasions,
        "style_notes": style_notes,
        "color_family": color_family,
        "dominant_color": dominant_color,
        "fabric_guess": fabric_guess,
        "silhouette": silhouette,
        "season": "trans-seasonal",
        "mood": mood,
        "category": category,
        "attributes": {
            "color_family": color_family,
            "dominant_color": dominant_color,
            "fabric_guess": fabric_guess,
            "silhouette": silhouette,
            "season": "trans-seasonal",
            "mood": mood,
            "category": category,
        },
        "worker_meta": {
            "run_mode": settings.run_mode,
            "model_name": settings.model_name,
            "model_path": settings.model_path,
        },
    }


def _call_upstream(payload: InferRequest, image_url: str) -> dict[str, object] | None:
    if not settings.upstream_url.strip():
        return None

    headers = {"Content-Type": "application/json"}
    if settings.api_key:
        headers["Authorization"] = f"Bearer {settings.api_key}"

    context_snapshot = _context_snapshot(payload)
    response = httpx.post(
        _chat_completions_url(settings.upstream_url),
        headers=headers,
        json={
            "model": settings.model_name,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"{payload.prompt.strip() or DEFAULT_PROMPT}\n"
                                f"Context: {json.dumps(context_snapshot, ensure_ascii=False)}"
                            ),
                        },
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                },
            ],
        },
        timeout=settings.timeout_seconds,
    )
    response.raise_for_status()
    payload_json = response.json()
    content = ""
    if isinstance(payload_json, dict):
        choices = payload_json.get("choices", [])
        if choices:
            message = choices[0].get("message", {})
            content = message.get("content") or ""
            if isinstance(content, list):
                content = "\n".join(
                    str(part.get("text") or "")
                    for part in content
                    if isinstance(part, dict)
                )
    normalized = _normalize_payload(_json_from_text(content))
    if not normalized:
        return None
    normalized["status"] = "ready"
    normalized["provider_mode"] = "proxy"
    normalized["attributes"] = {
        "color_family": normalized.get("color_family"),
        "dominant_color": normalized.get("dominant_color"),
        "fabric_guess": normalized.get("fabric_guess"),
        "silhouette": normalized.get("silhouette"),
        "season": normalized.get("season"),
        "mood": normalized.get("mood"),
        "category": normalized.get("category"),
    }
    normalized["worker_meta"] = {
        "run_mode": settings.run_mode,
        "model_name": settings.model_name,
        "model_path": settings.model_path,
        "upstream_url": settings.upstream_url,
    }
    return normalized


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": settings.service_name,
        "mode": settings.run_mode,
        "model_name": settings.model_name,
        "model_path": settings.model_path,
        "dataset_dir": settings.dataset_dir,
        "checkpoint_present": settings.checkpoint_present,
        "dataset_present": settings.dataset_present,
        "upstream_configured": bool(settings.upstream_url.strip()),
        "upstream_url": settings.upstream_url,
    }


@app.post("/infer")
def infer(payload: InferRequest) -> dict[str, object]:
    image_url = _effective_image_url(payload)
    if settings.run_mode == "proxy" and not image_url:
        raise HTTPException(status_code=400, detail="image_url is required in proxy mode.")

    if image_url and settings.upstream_url.strip():
        try:
            upstream = _call_upstream(payload, image_url)
        except Exception as exc:
            upstream = None
            error_message = str(exc)
        else:
            error_message = ""
        if upstream:
            return upstream
        heuristic = _heuristic_result(payload)
        heuristic["message"] = f"Upstream call failed, returned heuristic fallback: {error_message}" if error_message else "Returned heuristic fallback."
        return heuristic

    if settings.run_mode == "proxy" and not settings.upstream_url.strip():
        raise HTTPException(status_code=503, detail="Proxy mode requires MULTIMODAL_READER_UPSTREAM_URL or VLLM_BASE_URL.")

    return _heuristic_result(payload)
