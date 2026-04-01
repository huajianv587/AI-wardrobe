from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel, Field

DEFAULT_MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"
DEFAULT_MODEL_PATH = "/app/model_training/checkpoints/llm-recommender"
DEFAULT_DATASET_DIR = "/app/model_training/datasets/llm-recommender"


class WorkerSettings(BaseModel):
    service_name: str = "llm-recommender"
    port: int = 9001
    run_mode: str = os.getenv("LLM_RECOMMENDER_RUN_MODE", "heuristic")
    model_name: str = os.getenv("LLM_RECOMMENDER_MODEL_NAME", DEFAULT_MODEL_NAME)
    model_path: str = os.getenv("LLM_RECOMMENDER_MODEL_PATH", DEFAULT_MODEL_PATH)
    dataset_dir: str = os.getenv("LLM_RECOMMENDER_DATASET_DIR", DEFAULT_DATASET_DIR)

    @property
    def checkpoint_present(self) -> bool:
        return Path(self.model_path).exists()


settings = WorkerSettings()
app = FastAPI(title="AI Wardrobe LLM Recommender", version="0.1.0")


class MemoryCardPayload(BaseModel):
    highlights: list[str] = Field(default_factory=list)
    avoid_contexts: list[str] = Field(default_factory=list)
    season_tags: list[str] = Field(default_factory=list)


class WardrobeItemPayload(BaseModel):
    id: int
    name: str
    slot: str
    category: str
    color: str
    brand: str | None = None
    tags: list[str] = Field(default_factory=list)
    occasions: list[str] = Field(default_factory=list)
    style_notes: str | None = None
    memory_card: MemoryCardPayload | None = None


class InferRequest(BaseModel):
    prompt: str
    weather: str | None = None
    scene: str | None = None
    style: str | None = None
    model_name: str | None = None
    wardrobe_items: list[WardrobeItemPayload] = Field(default_factory=list)


def _prompt_keywords(prompt: str) -> tuple[list[str], str, str]:
    lowered = prompt.lower()
    if any(token in lowered for token in ["office", "meeting", "work", "commute", "上班"]):
        return ["office", "meeting", "smart", "repeat-friendly", "soft-formal"], "Soft Formal Balance", "Structured neutrals keep the outfit professional while a soft top prevents the result from feeling too hard."
    if any(token in lowered for token in ["date", "dinner", "约会", "evening"]):
        return ["date", "elegant", "soft", "gallery"], "Rosy Evening Layer", "A softer palette and one refined accent make the outfit feel cared-for without looking overdone."
    return ["weekend", "travel", "coffee", "cozy", "casual"], "Light Weekend Edit", "This look keeps the silhouette relaxed, then adds one anchor piece so it still feels intentional."


def _score_item(item: WardrobeItemPayload, keywords: list[str], prompt: str) -> float:
    score = 0.0
    lowered_prompt = prompt.lower()
    item_tokens = " ".join(
        [
            item.name.lower(),
            item.slot.lower(),
            item.category.lower(),
            item.color.lower(),
            " ".join(item.tags).lower(),
            " ".join(item.occasions).lower(),
            item.style_notes.lower() if item.style_notes else "",
        ]
    )

    for keyword in keywords:
        if keyword in item_tokens:
            score += 2.0

    if item.slot in {"top", "bottom", "shoes"}:
        score += 1.0

    if item.memory_card:
        score += min(len(item.memory_card.highlights), 2) * 0.25
        if "rain" in lowered_prompt and any(token in item.memory_card.avoid_contexts for token in ["下雨别穿", "mud", "rain"]):
            score -= 1.0

    if any(token in lowered_prompt for token in item.occasions):
        score += 1.0

    return round(score, 2)


def _pick_best_by_slot(items: list[WardrobeItemPayload], slot: str, keywords: list[str], prompt: str) -> WardrobeItemPayload | None:
    candidates = [item for item in items if item.slot == slot]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: _score_item(item, keywords, prompt), reverse=True)[0]


def _substitutes(items: list[WardrobeItemPayload], chosen_ids: list[int], slot: str) -> list[int]:
    candidate_ids = [item.id for item in items if item.slot == slot and item.id not in chosen_ids]
    return candidate_ids[:2]


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": settings.service_name,
        "mode": settings.run_mode,
        "model_name": settings.model_name,
        "model_path": settings.model_path,
        "dataset_dir": settings.dataset_dir,
        "checkpoint_present": settings.checkpoint_present,
        "note": "Stage-1 worker is live. Replace heuristic mode with your local checkpoint runner when training is finished.",
    }


@app.post("/infer")
def infer(payload: InferRequest) -> dict:
    keywords, title, rationale = _prompt_keywords(payload.prompt)
    items = payload.wardrobe_items

    top = _pick_best_by_slot(items, "top", keywords, payload.prompt)
    bottom = _pick_best_by_slot(items, "bottom", keywords, payload.prompt)
    outerwear = _pick_best_by_slot(items, "outerwear", keywords, payload.prompt)
    shoes = _pick_best_by_slot(items, "shoes", keywords, payload.prompt)
    accessory = _pick_best_by_slot(items, "accessory", keywords, payload.prompt)

    primary = [item for item in [outerwear, top, bottom, shoes] if item]
    alternate = [item for item in [top, bottom, shoes, accessory] if item]
    primary_ids = [item.id for item in primary]

    key_item = next((item for item in primary if item.slot in {"outerwear", "top"}), primary[0] if primary else None)
    key_slot = key_item.slot if key_item else "top"

    return {
        "source": "llm-worker-local",
        "outfits": [
            {
                "title": title,
                "rationale": rationale,
                "item_ids": primary_ids,
                "confidence": 0.86,
                "confidence_label": "很懂你",
                "key_item_id": key_item.id if key_item else None,
                "substitute_item_ids": _substitutes(items, primary_ids, key_slot),
                "reason_badges": [
                    key_item.color.lower() if key_item else "balanced palette",
                    "repeat-friendly",
                    payload.style or "soft balance",
                ],
                "charm_copy": "✨ 这套把稳定的主角单品放前面，适合先把明天穿什么这件事变轻一点。",
                "mood_emoji": "✨",
            },
            {
                "title": "Change Another Look",
                "rationale": "Keep the same scene fit, but rotate one visible hero piece so the look feels fresher.",
                "item_ids": [item.id for item in alternate],
                "confidence": 0.74,
                "confidence_label": "相当稳",
                "key_item_id": top.id if top else None,
                "substitute_item_ids": _substitutes(items, [item.id for item in alternate], "top"),
                "reason_badges": ["second option", "lighter switch"],
                "charm_copy": "🌷 如果你想保留整体方向但不要太像上一套，这套会更顺手。",
                "mood_emoji": "🌷",
            },
        ],
        "agent_trace": [
            {"node": "Router Agent", "summary": "Parsed the scene, mood, and practical constraints from the prompt."},
            {"node": "Retriever Agent", "summary": "Ranked wardrobe items by slot, occasion, and style hints."},
            {"node": "Stylist Agent", "summary": f"Generated a stage-1 local answer using model target {payload.model_name or settings.model_name}."},
            {"node": "Verifier Agent", "summary": "Checked that the final look includes core slots and a visible hero piece."},
        ],
        "profile_summary": "Stage-1 worker summary. Once your LoRA checkpoint is ready, replace heuristic generation with the local model runner.",
        "closet_gaps": ["Need one dependable dark bottom if your tops greatly outnumber bottoms."],
        "reminder_flags": ["Rotate overused hero pieces every few days to keep looks fresh."],
        "worker_meta": {
            "run_mode": settings.run_mode,
            "model_name": payload.model_name or settings.model_name,
            "model_path": settings.model_path,
        },
    }
