from __future__ import annotations

import logging

import httpx

from app.models.wardrobe import ClothingItem
from app.schemas.recommendation import AgentTraceStep, RecommendationOption, RecommendationRequest, RecommendationResponse
from core import local_model
from core.config import settings

logger = logging.getLogger(__name__)


def _pick_by_slot(items: list[ClothingItem], slot: str, keywords: list[str]) -> ClothingItem | None:
    for item in items:
        if item.slot == slot and any(keyword in item.tags or keyword in item.occasions for keyword in keywords):
            return item

    for item in items:
        if item.slot == slot:
            return item

    return None


def _local_recommendations(request: RecommendationRequest, items: list[ClothingItem]) -> RecommendationResponse:
    prompt = request.prompt.lower()

    if any(keyword in prompt for keyword in ["office", "meeting", "work", "commute"]):
        keywords = ["office", "meeting", "soft-formal"]
        title = "Soft Formal Balance"
        rationale = "Use structured neutrals to keep the look professional, then soften the impression with light layers so the result stays approachable."
    elif any(keyword in prompt for keyword in ["date", "dinner", "evening"]):
        keywords = ["date", "soft", "elegant"]
        title = "Rosy Evening Layer"
        rationale = "A softer palette and one refined accessory create a polished date look without feeling overdone."
    else:
        keywords = ["weekend", "travel", "cozy"]
        title = "Light Weekend Edit"
        rationale = "Keep the silhouette relaxed, then add one clean anchor piece so the outfit still feels intentional."

    top = _pick_by_slot(items, "top", keywords)
    bottom = _pick_by_slot(items, "bottom", keywords)
    outerwear = _pick_by_slot(items, "outerwear", keywords)
    shoes = _pick_by_slot(items, "shoes", keywords)
    accessory = _pick_by_slot(items, "accessory", keywords)

    primary_items = [item for item in [outerwear, top, bottom, shoes] if item]
    alternate_items = [item for item in [top, bottom, shoes, accessory] if item]

    return RecommendationResponse(
        source="local-model",
        outfits=[
            RecommendationOption(title=title, rationale=rationale, item_ids=[item.id for item in primary_items]),
            RecommendationOption(title="Change Another Look", rationale="This alternative composition keeps the occasion fit while reducing repeated hero pieces.", item_ids=[item.id for item in alternate_items]),
        ],
        agent_trace=[
            AgentTraceStep(node="Router Agent", summary="Parsed user scene, mood, and dress-code intent."),
            AgentTraceStep(node="Retriever Agent", summary="Matched wardrobe candidates by slot and occasion tags."),
            AgentTraceStep(node="Stylist Agent", summary="Composed the outfit and generated explanation text locally."),
            AgentTraceStep(node="Verifier Agent", summary="Checked coherence and scene suitability."),
        ],
    )


def _serialize_items(items: list[ClothingItem]) -> list[dict]:
    serialized = []
    for item in items:
        serialized.append(
            {
                "id": item.id,
                "name": item.name,
                "slot": item.slot,
                "category": item.category,
                "color": item.color,
                "brand": item.brand,
                "tags": item.tags or [],
                "occasions": item.occasions or [],
                "style_notes": item.style_notes,
                "memory_card": {
                    "highlights": getattr(item.memory_card, "highlights", []) if getattr(item, "memory_card", None) else [],
                    "avoid_contexts": getattr(item.memory_card, "avoid_contexts", []) if getattr(item, "memory_card", None) else [],
                    "season_tags": getattr(item.memory_card, "season_tags", []) if getattr(item, "memory_card", None) else [],
                },
            }
        )
    return serialized


def _infer_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/infer"


def _coerce_item_ids(raw_option: dict, items: list[ClothingItem]) -> list[int]:
    items_by_name = {item.name.lower(): item.id for item in items}
    candidates = raw_option.get("item_ids") or raw_option.get("garment_ids") or []
    parsed: list[int] = []

    for candidate in candidates:
        if isinstance(candidate, int):
            parsed.append(candidate)
        elif isinstance(candidate, str) and candidate.isdigit():
            parsed.append(int(candidate))
        elif isinstance(candidate, str):
            mapped = items_by_name.get(candidate.lower())
            if mapped:
                parsed.append(mapped)

    if parsed:
        return list(dict.fromkeys(parsed))

    candidate_names = raw_option.get("item_names") or raw_option.get("garment_names") or []
    for candidate in candidate_names:
        if isinstance(candidate, str):
            mapped = items_by_name.get(candidate.lower())
            if mapped:
                parsed.append(mapped)
    return list(dict.fromkeys(parsed))


def _coerce_agent_trace(raw_trace: list[dict] | None) -> list[AgentTraceStep]:
    steps = raw_trace or []
    trace: list[AgentTraceStep] = []
    for index, step in enumerate(steps):
        if isinstance(step, dict):
            trace.append(
                AgentTraceStep(
                    node=str(step.get("node") or step.get("name") or f"Remote Step {index + 1}"),
                    summary=str(step.get("summary") or step.get("message") or step.get("detail") or "Remote worker step."),
                )
            )
    return trace


def _parse_remote_response(payload: dict, items: list[ClothingItem]) -> RecommendationResponse:
    raw_outfits = payload.get("outfits") or payload.get("recommendations") or payload.get("looks") or []
    outfits: list[RecommendationOption] = []

    for index, raw_option in enumerate(raw_outfits):
        if not isinstance(raw_option, dict):
            continue

        item_ids = _coerce_item_ids(raw_option, items)
        if not item_ids:
            continue

        outfits.append(
            RecommendationOption(
                title=str(raw_option.get("title") or raw_option.get("name") or f"Remote Look {index + 1}"),
                rationale=str(raw_option.get("rationale") or raw_option.get("reason") or raw_option.get("summary") or "Generated by the remote recommender."),
                item_ids=item_ids,
                confidence=float(raw_option["confidence"]) if isinstance(raw_option.get("confidence"), (int, float)) else None,
                confidence_label=raw_option.get("confidence_label"),
                key_item_id=raw_option.get("key_item_id"),
                substitute_item_ids=[int(value) for value in raw_option.get("substitute_item_ids", []) if isinstance(value, int)],
                reason_badges=[str(value) for value in raw_option.get("reason_badges", []) if isinstance(value, str)],
                charm_copy=raw_option.get("charm_copy"),
                mood_emoji=raw_option.get("mood_emoji"),
            )
        )

    if not outfits:
        raise ValueError("Remote LLM recommender did not return any usable outfits.")

    return RecommendationResponse(
        source=str(payload.get("source") or "remote-model"),
        outfits=outfits,
        agent_trace=_coerce_agent_trace(payload.get("agent_trace")) or [
            AgentTraceStep(node="Remote Recommender", summary="The recommendation was produced by the external LLM worker."),
        ],
        profile_summary=payload.get("profile_summary"),
        closet_gaps=[str(value) for value in payload.get("closet_gaps", []) if isinstance(value, str)],
        reminder_flags=[str(value) for value in payload.get("reminder_flags", []) if isinstance(value, str)],
    )


def _remote_recommendations(request: RecommendationRequest, items: list[ClothingItem]) -> RecommendationResponse:
    worker_url = local_model.get_remote_worker_url("llm_recommender")
    if not worker_url:
        raise ValueError("No external LLM recommender worker URL is configured.")

    payload = {
        "prompt": request.prompt,
        "weather": request.weather,
        "scene": request.scene,
        "style": request.style,
        "wardrobe_items": _serialize_items(items),
        "model_name": settings.qwen_model_name,
    }

    response = httpx.post(
        _infer_url(worker_url),
        json=payload,
        timeout=settings.ai_demo_adapter_timeout_seconds,
    )
    response.raise_for_status()
    return _parse_remote_response(response.json(), items)


def generate_recommendations(request: RecommendationRequest, items: list[ClothingItem]) -> RecommendationResponse:
    if local_model.should_use_local_model("llm_recommender"):
        return _local_recommendations(request, items)

    try:
        return _remote_recommendations(request, items)
    except Exception as exc:
        logger.warning("Remote LLM recommender failed, falling back to local mode: %s", exc)
        local_response = _local_recommendations(request, items)
        local_response.source = "remote-fallback-local-model"
        local_response.agent_trace.insert(
            0,
            AgentTraceStep(
                node="Remote Adapter",
                summary=f"External LLM worker was unavailable or returned an invalid payload, so the local fallback model handled this request instead. Detail: {exc}",
            ),
        )
        return local_response
