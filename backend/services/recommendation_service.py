from __future__ import annotations

import json
import logging
import re
from urllib.parse import urlparse

import httpx

from app.models.wardrobe import ClothingItem
from app.schemas.recommendation import AgentTraceStep, RecommendationOption, RecommendationRequest, RecommendationResponse
from core import local_model
from core.config import settings

logger = logging.getLogger(__name__)

RECOMMENDER_SYSTEM_PROMPT = (
    "You are an AI wardrobe stylist. Return strict JSON only. "
    "Use only the wardrobe item ids that appear in wardrobe_items. "
    "Prefer 2 outfit options when enough items exist. "
    "Return this schema exactly: "
    '{"source":"remote-model","outfits":[{"title":"...","rationale":"...","item_ids":[1,2],"confidence":0.84,'
    '"confidence_label":"很懂你","key_item_id":1,"substitute_item_ids":[3],"reason_badges":["soft office"],'
    '"charm_copy":"...","mood_emoji":"✨"}],"agent_trace":[{"node":"Router Agent","summary":"..."}],'
    '"profile_summary":"...","closet_gaps":["..."],"reminder_flags":["..."]}. '
    "Do not wrap the JSON in markdown."
)


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


def _chat_completions_url(base_url: str) -> str:
    trimmed = base_url.rstrip("/")
    if trimmed.endswith("/chat/completions"):
        return trimmed
    if trimmed.endswith("/v1"):
        return f"{trimmed}/chat/completions"
    return f"{trimmed}/v1/chat/completions"


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
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _content_from_chat_completions(payload: dict) -> str:
    choices = payload.get("choices", []) if isinstance(payload, dict) else []
    if not choices:
        return ""
    message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
    content = message.get("content") or ""
    if isinstance(content, list):
        return "\n".join(str(part.get("text") or "") for part in content if isinstance(part, dict))
    return str(content)


def _looks_like_openai_compatible_url(base_url: str) -> bool:
    trimmed = base_url.strip().rstrip("/")
    if not trimmed:
        return False
    parsed = urlparse(trimmed)
    host = parsed.netloc.lower()
    path = parsed.path.rstrip("/")
    if path.endswith("/chat/completions") or path.endswith("/v1"):
        return True
    if host.endswith("openai.com") or host.endswith("deepseek.com"):
        return True
    return bool(settings.vllm_base_url.strip() and trimmed == settings.vllm_base_url.strip().rstrip("/"))


def _llm_recommender_api_key(base_url: str, explicit_key: str = "") -> str:
    explicit_key = explicit_key.strip()
    if explicit_key:
        return explicit_key

    trimmed = base_url.strip().rstrip("/")
    if settings.vllm_base_url.strip() and trimmed == settings.vllm_base_url.strip().rstrip("/"):
        return ""

    host = urlparse(trimmed).netloc.lower()
    if host.endswith("deepseek.com"):
        return settings.deepseek_api_key.strip()
    if host.endswith("openai.com"):
        return settings.openai_api_key.strip()
    return ""


def _llm_recommender_model_name(base_url: str, explicit_name: str = "") -> str:
    explicit_name = explicit_name.strip()
    if explicit_name:
        return explicit_name

    trimmed = base_url.strip().rstrip("/")
    if settings.vllm_base_url.strip() and trimmed == settings.vllm_base_url.strip().rstrip("/"):
        return settings.qwen_model_name.strip() or "Qwen/Qwen2.5-7B-Instruct"

    host = urlparse(trimmed).netloc.lower()
    if host.endswith("deepseek.com"):
        return settings.deepseek_multimodal_model.strip() or "deepseek-chat"
    if host.endswith("openai.com"):
        return settings.openai_multimodal_model.strip() or "gpt-4.1-mini"
    return settings.llm_recommender_fallback_model_name.strip() or "Qwen/Qwen2.5-7B-Instruct"


def _recommender_worker_model_name(explicit_name: str = "") -> str:
    return (
        explicit_name.strip()
        or settings.llm_recommender_model_name.strip()
        or settings.llm_recommender_fallback_model_name.strip()
        or "Qwen/Qwen2.5-7B-Instruct"
    )


def _worker_label(base_url: str) -> str:
    trimmed = base_url.strip().rstrip("/")
    parsed = urlparse(trimmed)
    host = parsed.netloc or parsed.path or trimmed
    path = parsed.path.rstrip("/")
    if path and path != "/":
        return f"{host}{path}"
    return host


def _openai_style_messages(request: RecommendationRequest, items: list[ClothingItem]) -> list[dict]:
    snapshot = {
        "prompt": request.prompt,
        "weather": request.weather,
        "scene": request.scene,
        "style": request.style,
        "wardrobe_items": _serialize_items(items),
    }
    return [
        {"role": "system", "content": RECOMMENDER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "Build the best outfit recommendations for this wardrobe snapshot. "
                "If the wardrobe is small, it is okay to reuse items across looks. "
                f"Snapshot: {json.dumps(snapshot, ensure_ascii=False)}"
            ),
        },
    ]


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


def _remote_worker_recommendations(
    request: RecommendationRequest,
    items: list[ClothingItem],
    worker_url: str,
    *,
    model_name: str = "",
) -> RecommendationResponse:
    payload = {
        "prompt": request.prompt,
        "weather": request.weather,
        "scene": request.scene,
        "style": request.style,
        "wardrobe_items": _serialize_items(items),
        "model_name": _recommender_worker_model_name(model_name),
    }

    response = httpx.post(
        _infer_url(worker_url),
        json=payload,
        timeout=settings.ai_demo_adapter_timeout_seconds,
    )
    response.raise_for_status()
    return _parse_remote_response(response.json(), items)


def _openai_compatible_recommendations(
    request: RecommendationRequest,
    items: list[ClothingItem],
    base_url: str,
    *,
    api_key: str = "",
    model_name: str = "",
) -> RecommendationResponse:
    headers = {"Content-Type": "application/json"}
    if api_key := _llm_recommender_api_key(base_url, api_key):
        headers["Authorization"] = f"Bearer {api_key}"

    response = httpx.post(
        _chat_completions_url(base_url),
        headers=headers,
        json={
            "model": _llm_recommender_model_name(base_url, model_name),
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": _openai_style_messages(request, items),
        },
        timeout=max(settings.ai_demo_adapter_timeout_seconds, settings.multimodal_request_timeout_seconds),
    )
    response.raise_for_status()
    payload = _json_from_text(_content_from_chat_completions(response.json()))
    if payload is None:
        raise ValueError("OpenAI-compatible recommender response did not contain valid JSON.")
    return _parse_remote_response(payload, items)


def _remote_recommendations_via_url(
    request: RecommendationRequest,
    items: list[ClothingItem],
    worker_url: str,
    *,
    api_key: str = "",
    model_name: str = "",
) -> RecommendationResponse:
    if _looks_like_openai_compatible_url(worker_url):
        return _openai_compatible_recommendations(request, items, worker_url, api_key=api_key, model_name=model_name)
    return _remote_worker_recommendations(request, items, worker_url, model_name=model_name)


def _remote_recommendation_targets() -> list[tuple[str, str, str, str]]:
    primary_url = local_model.get_remote_worker_url("llm_recommender")
    fallback_url = settings.llm_recommender_fallback_api_url.strip()
    targets: list[tuple[str, str, str, str]] = []
    if primary_url:
        targets.append(
            (
                "primary-remote",
                primary_url,
                settings.llm_recommender_api_key.strip(),
                settings.llm_recommender_model_name.strip(),
            )
        )
    if fallback_url and fallback_url.rstrip("/") != (primary_url or "").rstrip("/"):
        targets.append(
            (
                "fallback-worker",
                fallback_url,
                settings.llm_recommender_fallback_api_key.strip(),
                settings.llm_recommender_fallback_model_name.strip(),
            )
        )
    return targets


def generate_recommendations(request: RecommendationRequest, items: list[ClothingItem]) -> RecommendationResponse:
    if local_model.should_use_local_model("llm_recommender"):
        return _local_recommendations(request, items)

    targets = _remote_recommendation_targets()
    errors: list[tuple[str, str, Exception]] = []

    for route_name, worker_url, api_key, model_name in targets:
        try:
            response = _remote_recommendations_via_url(
                request,
                items,
                worker_url,
                api_key=api_key,
                model_name=model_name,
            )
            if route_name == "fallback-worker":
                response.agent_trace.insert(
                    0,
                    AgentTraceStep(
                        node="Failover Router",
                        summary=(
                            "The primary LLM provider was unavailable, so the secondary Qwen LoRA worker "
                            f"at {_worker_label(worker_url)} handled this request."
                        ),
                    ),
                )
                if response.source == "remote-model":
                    response.source = "fallback-worker-model"
            return response
        except Exception as exc:
            logger.warning("%s LLM recommender failed for %s: %s", route_name, _worker_label(worker_url), exc)
            errors.append((route_name, worker_url, exc))

    local_response = _local_recommendations(request, items)
    local_response.source = "remote-fallback-local-model"
    if not targets:
        detail = "No external LLM recommender worker URL is configured."
    else:
        detail = "; ".join(f"{route_name}@{_worker_label(worker_url)} => {exc}" for route_name, worker_url, exc in errors)
    local_response.agent_trace.insert(
        0,
        AgentTraceStep(
            node="Failover Router",
            summary=(
                "External recommender providers were unavailable or returned invalid payloads, "
                f"so the local fallback model handled this request instead. Detail: {detail}"
            ),
        ),
    )
    return local_response
