from __future__ import annotations

import base64
from collections import Counter
from datetime import datetime, timedelta
import json
import logging
import mimetypes
import re
from typing import Callable, TypeVar

import httpx
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.assistant import AssistantTask, ClothingMemoryCard, RecommendationSignal, StyleProfile, WearLog
from app.models.outfit import Outfit
from app.models.user import User
from app.models.wardrobe import ClothingItem
from app.schemas.assistant import (
    AssistantOverviewResponse,
    ClosetGapResponse,
    GapInsight,
    MemoryCardEnvelope,
    PackingRequest,
    PackingResponse,
    PackingSuggestion,
    QuickModeRequest,
    RecommendationSignalPayload,
    ReminderCard,
    ReminderResponse,
    SavedOutfitPayload,
    StatusMessageResponse,
    StyleProfilePayload,
    TomorrowAssistantRequest,
    TomorrowAssistantResponse,
    TomorrowPlanBlock,
    WeatherSummary,
    WearLogPayload,
)
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from core import local_model
from core.config import settings
from services import recommendation_service, storage_service, weather_service, wardrobe_service

logger = logging.getLogger(__name__)
T = TypeVar("T")

LOW_THOUGHT_MODES = {
    "上班": "Office commute tomorrow, polished and easy to repeat",
    "约会": "Gentle date night, flattering and softly romantic",
    "出门买咖啡": "Coffee run with a polished casual feel",
    "今天不想费脑": "Low effort, high confidence, grab-and-go wardrobe formula",
    "office": "Office commute tomorrow, polished and easy to repeat",
    "date": "Gentle date night, flattering and softly romantic",
    "coffee": "Coffee run with a polished casual feel",
    "low-thought": "Low effort, high confidence, grab-and-go wardrobe formula",
}

CHARM_EMOJI = {
    "office": "☁️",
    "date": "💞",
    "weekend": "🌷",
    "travel": "🧳",
    "rain": "☔",
    "default": "✨",
}

COLOR_FAMILIES = {
    "black": "dark-neutral",
    "charcoal": "dark-neutral",
    "graphite": "dark-neutral",
    "navy": "dark-neutral",
    "ivory": "light-neutral",
    "cream": "light-neutral",
    "white": "light-neutral",
    "beige": "light-neutral",
    "pearl": "light-neutral",
    "brown": "earth",
    "mint": "soft-color",
    "green": "soft-color",
    "pink": "soft-color",
    "dusty rose": "soft-color",
    "blue": "soft-color",
}

MULTIMODAL_SYSTEM_PROMPT = (
    "You extract wardrobe metadata from a single garment image. "
    "Return strict JSON with keys tags, occasions, style_notes. "
    "tags and occasions must be short arrays of strings. "
    "style_notes must be a short sentence in Chinese."
)


def _unique_preserve(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


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


def _normalize_multimodal_payload(payload: dict | None) -> dict[str, list[str] | str] | None:
    if not isinstance(payload, dict):
        return None
    tags = _unique_preserve([str(entry).strip() for entry in payload.get("tags", []) if str(entry).strip()])[:8]
    occasions = _unique_preserve([str(entry).strip() for entry in payload.get("occasions", []) if str(entry).strip()])[:6]
    style_notes = str(payload.get("style_notes") or payload.get("note") or "").strip()
    if not tags and not occasions and not style_notes:
        return None
    return {
        "tags": tags,
        "occasions": occasions,
        "style_notes": style_notes,
    }


def _multimodal_image_reference(item: ClothingItem) -> str | None:
    image_url = item.processed_image_url or item.image_url
    if not image_url:
        return None

    try:
        asset_bytes = storage_service.load_asset_bytes(image_url)
    except Exception:
        asset_bytes = None

    if asset_bytes:
        mime_type = mimetypes.guess_type(image_url)[0] or "image/png"
        encoded = base64.b64encode(asset_bytes).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    if image_url.startswith("http://") or image_url.startswith("https://") or image_url.startswith("data:"):
        return image_url
    return None


def _openai_style_messages(item: ClothingItem, image_reference: str) -> list[dict]:
    item_snapshot = {
        "name": item.name,
        "category": item.category,
        "slot": item.slot,
        "color": item.color,
        "brand": item.brand or "",
        "tags": list(item.tags or []),
        "occasions": list(item.occasions or []),
        "style_notes": item.style_notes or "",
    }
    return [
        {"role": "system", "content": MULTIMODAL_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "请只输出 JSON。结合图片和已有上下文，为这件衣物补全标签与适合场景。"
                        f"已有上下文：{json.dumps(item_snapshot, ensure_ascii=False)}"
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": image_reference},
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


def _call_openai_compatible_multimodal_enrich(
    *,
    base_url: str,
    model_name: str,
    api_key: str,
    item: ClothingItem,
) -> dict[str, list[str] | str] | None:
    image_reference = _multimodal_image_reference(item)
    if not image_reference or not base_url.strip() or not model_name.strip():
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
            "messages": _openai_style_messages(item, image_reference),
        },
        timeout=settings.multimodal_request_timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    content = ""
    if isinstance(payload, dict):
        choices = payload.get("choices", [])
        if choices:
            message = choices[0].get("message", {})
            content = message.get("content") or ""
            if isinstance(content, list):
                content = "\n".join(
                    str(part.get("text") or "")
                    for part in content
                    if isinstance(part, dict)
                )
    return _normalize_multimodal_payload(_json_from_text(content))


def _call_remote_worker_multimodal_enrich(item: ClothingItem) -> dict[str, list[str] | str] | None:
    worker_url = local_model.get_remote_worker_url("multimodal_reader")
    image_url = item.processed_image_url or item.image_url
    if not worker_url or not image_url:
        return None

    response = httpx.post(
        worker_url,
        json={
            "mode": "wardrobe-tag-enrich",
            "item": {
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "slot": item.slot,
                "color": item.color,
                "brand": item.brand,
                "tags": list(item.tags or []),
                "occasions": list(item.occasions or []),
                "style_notes": item.style_notes,
                "image_url": image_url,
            },
        },
        timeout=settings.multimodal_request_timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    return _normalize_multimodal_payload(payload if isinstance(payload, dict) else None)


def _configured_multimodal_label(multimodal_config: dict | None, key: str, fallback: str) -> str:
    value = str((multimodal_config or {}).get(key) or "").strip()
    return value or fallback


def _configured_multimodal_model_name(configured_value: str, fallback: str) -> str:
    value = str(configured_value or "").strip()
    if not value:
        return fallback
    if re.search(r"[\u4e00-\u9fff]", value):
        return fallback
    if " " in value and fallback:
        return fallback
    return value


def _configured_multimodal_attempts(multimodal_config: dict | None) -> int:
    try:
        retries_value = (multimodal_config or {}).get("recognition_retries")
        retries = int(1 if retries_value is None else retries_value)
    except (TypeError, ValueError):
        retries = 1
    return max(1, min(4, retries + 1))


def _call_multimodal_enrich_chain(
    item: ClothingItem,
    multimodal_config: dict | None = None,
) -> dict[str, list[str] | str] | None:
    providers: list[tuple[str, Callable[[], dict[str, list[str] | str] | None]]] = []
    attempts = _configured_multimodal_attempts(multimodal_config)
    local_endpoint = (settings.vllm_base_url or "").strip()
    local_label = _configured_multimodal_label(multimodal_config, "recognition_local_model", "本地多模态模型")
    openai_label = _configured_multimodal_label(multimodal_config, "recognition_openai_model", "OpenAI 视觉识别")
    deepseek_label = _configured_multimodal_label(multimodal_config, "recognition_deepseek_model", "DeepSeek 视觉提取")
    local_model_name = _configured_multimodal_model_name(local_label, (settings.qwen_model_name or "").strip())
    openai_model_name = _configured_multimodal_model_name(openai_label, settings.openai_multimodal_model.strip())
    deepseek_model_name = _configured_multimodal_model_name(deepseek_label, settings.deepseek_multimodal_model.strip())

    if local_endpoint and local_model_name:
        providers.append(
            (
                f"本地识别 · {local_label}",
                lambda: _call_openai_compatible_multimodal_enrich(
                    base_url=local_endpoint,
                    model_name=local_model_name,
                    api_key="",
                    item=item,
                ),
            )
        )
    elif local_model.get_remote_worker_url("multimodal_reader"):
        providers.append((f"本地识别 · {local_label}", lambda: _call_remote_worker_multimodal_enrich(item)))

    if settings.deepseek_api_key.strip():
        providers.append(
            (
                f"DeepSeek · {deepseek_label}",
                lambda: _call_openai_compatible_multimodal_enrich(
                    base_url=settings.deepseek_base_url,
                    model_name=deepseek_model_name,
                    api_key=settings.deepseek_api_key,
                    item=item,
                ),
            )
        )

    if settings.openai_api_key.strip():
        providers.append(
            (
                f"OpenAI · {openai_label}",
                lambda: _call_openai_compatible_multimodal_enrich(
                    base_url=settings.openai_base_url,
                    model_name=openai_model_name,
                    api_key=settings.openai_api_key,
                    item=item,
                ),
            )
        )

    for label, runner in providers:
        for _ in range(attempts):
            try:
                payload = runner()
            except Exception:
                payload = None
            if payload:
                payload["provider"] = label
                return payload
    return None


def describe_item_image(
    item: ClothingItem,
    multimodal_config: dict | None = None,
) -> dict[str, list[str] | str] | None:
    return _call_multimodal_enrich_chain(item, multimodal_config)


def _item_text(item: ClothingItem) -> str:
    return " ".join(
        [
            item.name.lower(),
            item.category.lower(),
            item.slot.lower(),
            item.color.lower(),
            (item.brand or "").lower(),
            " ".join((item.tags or [])).lower(),
            " ".join((item.occasions or [])).lower(),
            (item.style_notes or "").lower(),
        ]
    )


def _build_style_profile_snapshot(user_id: int, items: list[ClothingItem]) -> StyleProfile:
    colors = Counter(item.color.lower() for item in items if item.color)
    silhouettes = Counter(tag for item in items for tag in (item.tags or []) if tag in {"minimal", "structured", "soft", "airy", "cozy", "elegant"})
    occasions = Counter(occasion for item in items for occasion in (item.occasions or []) if occasion)

    return StyleProfile(
        user_id=user_id,
        favorite_colors=[color.title() for color, _ in colors.most_common(3)],
        avoid_colors=[],
        favorite_silhouettes=[tag for tag, _ in silhouettes.most_common(3)],
        avoid_silhouettes=[],
        style_keywords=[occasion for occasion, _ in occasions.most_common(3)],
        dislike_keywords=[],
        commute_profile="balanced-soft" if any("office" in occasion for occasion in occasions) else "gentle-casual",
        comfort_priorities=["easy layering", "repeat-friendly"],
        wardrobe_rules=["Prefer one anchor piece and one gentle accent."],
        personal_note="Still learning your closet rhythm, but already tracking what feels most like you.",
        updated_at=datetime.utcnow(),
    )


def _ensure_style_profile(db: Session, user: User) -> StyleProfile:
    profile = db.scalar(select(StyleProfile).where(StyleProfile.user_id == user.id))
    if profile is not None:
        return profile

    items = wardrobe_service.list_items(db, user.id)
    profile = _build_style_profile_snapshot(user.id, items)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def _infer_memory_card(item: ClothingItem) -> ClothingMemoryCard:
    item_text = _item_text(item)
    color = item.color.lower()

    highlights: list[str] = []
    avoid_contexts: list[str] = []
    season_tags: list[str] = []

    if color in {"ivory", "cream", "white", "pearl"}:
        highlights.extend(["显气色", "适合拍照"])
        avoid_contexts.append("下雨别穿")

    if "knit" in item_text or "sweater" in item_text:
        highlights.append("冷气房友好")
        season_tags.extend(["autumn", "winter"])

    if "coat" in item_text or "blazer" in item_text or item.slot == "outerwear":
        highlights.append("通勤气场稳定")
        season_tags.extend(["autumn", "winter", "spring"])

    if item.slot == "shoes":
        highlights.append("赶时间也能直接搭")
        if color in {"white", "ivory", "cream"}:
            avoid_contexts.append("泥地慎穿")

    if "date" in item_text or "elegant" in item_text:
        highlights.append("约会很加分")

    if item.slot == "top" and color in {"mint", "pink", "dusty rose"}:
        highlights.append("靠近脸部会更柔和")

    if not season_tags:
        season_tags.extend(["spring", "summer"] if item.slot in {"top", "accessory"} else ["all-season"])

    return ClothingMemoryCard(
        user_id=item.user_id or 0,
        item_id=item.id,
        highlights=_unique_preserve(highlights or ["这件单品很会撑起整体气质"]),
        avoid_contexts=_unique_preserve(avoid_contexts),
        care_status="fresh",
        care_note="默认由 AI 记忆卡生成，可随时改成更像你的表达。",
        season_tags=_unique_preserve(season_tags),
    )


def attach_memory_cards(db: Session, items: list[ClothingItem], user_id: int) -> list[ClothingItem]:
    if not items:
        return items

    cards = list(
        db.scalars(
            select(ClothingMemoryCard).where(
                ClothingMemoryCard.user_id == user_id,
                ClothingMemoryCard.item_id.in_([item.id for item in items]),
            )
        ).all()
    )
    cards_by_item_id = {card.item_id: card for card in cards}

    for item in items:
        card = cards_by_item_id.get(item.id)
        if card is None:
            card = _infer_memory_card(item)
            card.user_id = user_id
            db.add(card)
            db.flush()
            cards_by_item_id[item.id] = card
        item.memory_card = cards_by_item_id[item.id]

    db.commit()
    for item in items:
        db.refresh(item)
        item.memory_card = cards_by_item_id[item.id]
    return items


def attach_memory_card(db: Session, item: ClothingItem, user_id: int) -> ClothingItem:
    attach_memory_cards(db, [item], user_id)
    return item


def get_memory_card(db: Session, item_id: int, user: User) -> MemoryCardEnvelope:
    item = wardrobe_service.get_item(db, item_id, user.id)
    attach_memory_card(db, item, user.id)
    return MemoryCardEnvelope(item_id=item.id, card=item.memory_card)


def upsert_memory_card(db: Session, item_id: int, user: User, payload: dict) -> MemoryCardEnvelope:
    item = wardrobe_service.get_item(db, item_id, user.id)
    card = db.scalar(
        select(ClothingMemoryCard).where(
            ClothingMemoryCard.user_id == user.id,
            ClothingMemoryCard.item_id == item.id,
        )
    )

    if card is None:
        card = _infer_memory_card(item)
        card.user_id = user.id
        card.item_id = item.id
        db.add(card)

    for field, value in payload.items():
        setattr(card, field, value)

    db.commit()
    db.refresh(card)
    item.memory_card = card
    return MemoryCardEnvelope(item_id=item.id, card=card)


def auto_enrich_item(
    db: Session,
    item: ClothingItem,
    user: User,
    multimodal_config: dict | None = None,
) -> ClothingItem:
    item_text = _item_text(item)
    inferred_tags = list(item.tags or [])
    inferred_occasions = list(item.occasions or [])
    inferred_notes: list[str] = []

    keyword_rules = [
        ({"blazer", "shirt", "trouser", "loafer"}, ["smart", "repeat-friendly"], ["office", "commute"], "AI noticed a polished weekday anchor."),
        ({"coat", "wrap"}, ["hero", "elegant"], ["meeting", "date"], "Feels like a hero layer for cooler city moments."),
        ({"knit", "sweater"}, ["soft", "cozy"], ["coffee", "weekend"], "Reads as a comforting texture for low-pressure styling."),
        ({"skirt"}, ["airy", "feminine"], ["date", "gallery"], "Adds movement and a softer silhouette."),
        ({"sneaker"}, ["casual", "versatile"], ["travel", "weekend"], "Strong fallback option for easy repeat looks."),
        ({"bag"}, ["accent", "finishing-touch"], ["date", "city"], "Useful as the small detail that makes the look feel considered."),
    ]

    for keywords, tags, occasions, note in keyword_rules:
        if any(keyword in item_text for keyword in keywords):
            inferred_tags.extend(tags)
            inferred_occasions.extend(occasions)
            inferred_notes.append(note)

    color_family = COLOR_FAMILIES.get(item.color.lower())
    if color_family == "dark-neutral" and item.slot == "bottom":
        inferred_tags.append("anchor-piece")
    if color_family == "light-neutral":
        inferred_tags.append("brightening")

    remote_payload = _call_multimodal_enrich_chain(item, multimodal_config)
    if remote_payload:
        inferred_tags.extend(remote_payload.get("tags", []))
        inferred_occasions.extend(remote_payload.get("occasions", []))
        if remote_note := remote_payload.get("style_notes"):
            inferred_notes.append(remote_note)

    item.tags = _unique_preserve(inferred_tags)
    item.occasions = _unique_preserve(inferred_occasions)

    if inferred_notes:
        merged_note = " ".join(inferred_notes)
        if item.style_notes:
            if merged_note not in item.style_notes:
                item.style_notes = f"{item.style_notes} {merged_note}"
        else:
            item.style_notes = merged_note

    db.commit()
    db.refresh(item)
    attach_memory_card(db, item, user.id)
    return item

def _build_profile_summary(profile: StyleProfile) -> str:
    favorite_colors = " / ".join(profile.favorite_colors[:3]) if profile.favorite_colors else "soft versatile tones"
    silhouettes = "、".join(profile.favorite_silhouettes[:3]) if profile.favorite_silhouettes else "柔和有秩序的轮廓"
    note = profile.personal_note or "还在慢慢学习你的风格偏好。"
    return f"偏爱 {favorite_colors}，常用轮廓是 {silhouettes}。{note}"


def _preference_scores(
    items: list[ClothingItem],
    profile: StyleProfile,
    signals: list[RecommendationSignal],
    wear_logs: list[WearLog],
    prompt: str,
) -> dict[int, float]:
    prompt_lower = prompt.lower()
    item_scores: dict[int, float] = {item.id: 0.0 for item in items}
    signal_weights = {"liked": 1.8, "saved": 1.4, "worn": 1.2, "dismissed": -1.4, "tweaked": 0.6}
    recent_wear_counts: Counter[int] = Counter()

    for signal in signals:
        weight = signal_weights.get(signal.action, 0.25)
        for item_id in signal.item_ids:
            item_scores[item_id] = item_scores.get(item_id, 0.0) + weight

    for wear_log in wear_logs:
        for item_id in wear_log.item_ids:
            recent_wear_counts[item_id] += 1

    for item in items:
        score = item_scores[item.id]
        color = item.color.title()
        if color in profile.favorite_colors:
            score += 1.2
        if color in profile.avoid_colors:
            score -= 1.6

        item_tags = set(item.tags or [])
        if any(keyword in item_tags for keyword in profile.favorite_silhouettes):
            score += 1.0
        if any(keyword in item_tags for keyword in profile.avoid_silhouettes):
            score -= 1.0
        if any(keyword in item_tags or keyword in item.occasions for keyword in profile.style_keywords):
            score += 0.7
        if any(keyword in item_tags or keyword in item.occasions for keyword in profile.dislike_keywords):
            score -= 0.8

        if any(keyword in prompt_lower for keyword in item.occasions):
            score += 1.3
        if any(keyword in prompt_lower for keyword in item.tags):
            score += 0.8
        if "rain" in prompt_lower and item.color.lower() in {"white", "ivory", "cream"}:
            score -= 0.7
        if recent_wear_counts[item.id] >= 2:
            score -= 0.65 * recent_wear_counts[item.id]

        item_scores[item.id] = round(score, 2)

    return item_scores


def _build_gap_response(items: list[ClothingItem]) -> ClosetGapResponse:
    counts = Counter(item.slot for item in items)
    lower_colors = Counter(item.color.lower() for item in items if item.slot == "bottom")
    insights: list[GapInsight] = []

    if counts["bottom"] < max(1, counts["top"] // 2):
        insights.append(
            GapInsight(
                title="下装偏少",
                description="你现在上装明显多于下装，推荐补一条能反复搭大多数上衣的深色下装。",
                urgency="high",
            )
        )

    if not any(color in {"black", "charcoal", "graphite", "navy"} for color in lower_colors):
        insights.append(
            GapInsight(
                title="缺稳定的深色下装",
                description="衣橱里还没有真正的深色中性下装，通勤、约会和旅行都少了一个高复用锚点。",
                urgency="high",
            )
        )

    if counts["outerwear"] == 0:
        insights.append(
            GapInsight(
                title="外套层不够",
                description="天气有温差时会很吃亏，补一件轻量外套就能让很多搭配更完整。",
                urgency="medium",
            )
        )

    if counts["shoes"] <= 1:
        insights.append(
            GapInsight(
                title="鞋履选择偏单一",
                description="现在鞋履轮换空间比较小，容易出现搭配成立但脚下没有最佳答案的情况。",
                urgency="medium",
            )
        )

    if not insights:
        insights.append(
            GapInsight(
                title="衣橱结构很稳",
                description="当前品类覆盖已经比较健康，下一步更适合围绕个性化风格和场景细分去补单品。",
                urgency="low",
            )
        )

    summary = " ".join(insight.description for insight in insights[:2])
    return ClosetGapResponse(summary=summary, insights=insights)


def _current_season(now: datetime) -> str:
    if now.month in {3, 4, 5}:
        return "spring"
    if now.month in {6, 7, 8}:
        return "summer"
    if now.month in {9, 10, 11}:
        return "autumn"
    return "winter"


def _build_reminder_response(db: Session, items: list[ClothingItem], user_id: int) -> ReminderResponse:
    recent_logs = list(
        db.scalars(
            select(WearLog)
            .where(WearLog.user_id == user_id, WearLog.worn_on >= datetime.utcnow() - timedelta(days=10))
            .order_by(desc(WearLog.worn_on))
        ).all()
    )
    wear_counts = Counter(item_id for log in recent_logs for item_id in log.item_ids)
    memory_cards = {
        card.item_id: card
        for card in db.scalars(select(ClothingMemoryCard).where(ClothingMemoryCard.user_id == user_id)).all()
    }
    last_worn_map: dict[int, datetime] = {}
    for log in recent_logs:
        for item_id in log.item_ids:
            last_worn_map.setdefault(item_id, log.worn_on)

    repeat_warning: list[ReminderCard] = []
    laundry_and_care: list[ReminderCard] = []
    idle_and_seasonal: list[ReminderCard] = []

    for item in items:
        if wear_counts[item.id] >= 3:
            repeat_warning.append(
                ReminderCard(
                    title=f"{item.name} 最近出现得有点频繁",
                    description="如果明天想显得更新鲜，建议先换掉这件主角单品，保留别的搭配骨架。",
                    tone="gentle-warning",
                    item_ids=[item.id],
                )
            )

        card = memory_cards.get(item.id)
        if card and card.care_status != "fresh":
            laundry_and_care.append(
                ReminderCard(
                    title=f"{item.name} 该休息一下了",
                    description=card.care_note or "这件单品的护理状态不再是 fresh，适合先洗护再安排下一次出场。",
                    tone="care",
                    item_ids=[item.id],
                )
            )

        last_worn = last_worn_map.get(item.id)
        if last_worn is None and item.created_at <= datetime.utcnow() - timedelta(days=90):
            idle_and_seasonal.append(
                ReminderCard(
                    title=f"{item.name} 已经很久没出现",
                    description="超过 90 天没有穿到，适合重新搭一次，或者考虑收纳/断舍离。",
                    tone="gentle-nudge",
                    item_ids=[item.id],
                )
            )

        if card and card.season_tags and "all-season" not in card.season_tags:
            season = _current_season(datetime.utcnow())
            if season not in card.season_tags:
                idle_and_seasonal.append(
                    ReminderCard(
                        title=f"{item.name} 更适合别的季节",
                        description=f"它的记忆卡更像 {', '.join(card.season_tags)} 单品，这阵子可以先收进换季区。",
                        tone="seasonal",
                        item_ids=[item.id],
                    )
                )

    return ReminderResponse(
        repeat_warning=repeat_warning[:3],
        laundry_and_care=laundry_and_care[:3],
        idle_and_seasonal=idle_and_seasonal[:4],
    )


def _empty_reminder_response() -> ReminderResponse:
    return ReminderResponse(repeat_warning=[], laundry_and_care=[], idle_and_seasonal=[])


def _rollback_sidecar_failure(db: Session, label: str, exc: Exception) -> None:
    try:
        db.rollback()
    except Exception as rollback_exc:
        logger.warning("Assistant sidecar '%s' rollback also failed: %s: %s", label, type(rollback_exc).__name__, rollback_exc)
    logger.warning("Assistant sidecar '%s' failed; using fallback. %s: %s", label, type(exc).__name__, exc)


def _safe_sidecar(db: Session, label: str, loader: Callable[[], T], fallback_factory: Callable[[], T]) -> T:
    try:
        return loader()
    except Exception as exc:
        _rollback_sidecar_failure(db, label, exc)
        return fallback_factory()


def _safe_attach_memory_cards(db: Session, items: list[ClothingItem], user_id: int) -> list[ClothingItem]:
    def _fallback() -> list[ClothingItem]:
        for item in items:
            item.memory_card = None
        return items

    return _safe_sidecar(
        db,
        "memory_cards",
        lambda: attach_memory_cards(db, items, user_id),
        _fallback,
    )


def _load_recent_signals(db: Session, user_id: int, limit: int = 60) -> list[RecommendationSignal]:
    return list(
        db.scalars(
            select(RecommendationSignal)
            .where(RecommendationSignal.user_id == user_id)
            .order_by(desc(RecommendationSignal.created_at))
            .limit(limit)
        ).all()
    )


def _safe_recent_signals(db: Session, user_id: int, limit: int = 60) -> list[RecommendationSignal]:
    return _safe_sidecar(
        db,
        "recommendation_signals",
        lambda: _load_recent_signals(db, user_id, limit),
        list,
    )


def _load_recent_wear_logs(db: Session, user_id: int, limit: int = 40) -> list[WearLog]:
    return list(
        db.scalars(
            select(WearLog)
            .where(WearLog.user_id == user_id)
            .order_by(desc(WearLog.worn_on))
            .limit(limit)
        ).all()
    )


def _safe_recent_wear_logs(db: Session, user_id: int, limit: int = 40) -> list[WearLog]:
    return _safe_sidecar(
        db,
        "wear_logs",
        lambda: _load_recent_wear_logs(db, user_id, limit),
        list,
    )


def _safe_style_profile(db: Session, user: User, items: list[ClothingItem]) -> StyleProfile:
    return _safe_sidecar(
        db,
        "style_profile",
        lambda: _ensure_style_profile(db, user),
        lambda: _build_style_profile_snapshot(user.id, items),
    )


def _safe_reminder_response(db: Session, items: list[ClothingItem], user_id: int) -> ReminderResponse:
    return _safe_sidecar(
        db,
        "reminders",
        lambda: _build_reminder_response(db, items, user_id),
        _empty_reminder_response,
    )


def _substitute_item_ids(items: list[ClothingItem], selected_item_ids: list[int], slot: str) -> list[int]:
    selected = set(selected_item_ids)
    candidates = [item.id for item in items if item.slot == slot and item.id not in selected]
    return candidates[:2]


def _confidence_label(score: float) -> str:
    if score >= 0.85:
        return "很懂你"
    if score >= 0.72:
        return "相当稳"
    return "可继续微调"


def _emoji_for_prompt(prompt: str) -> str:
    prompt_lower = prompt.lower()
    for keyword, emoji in CHARM_EMOJI.items():
        if keyword != "default" and keyword in prompt_lower:
            return emoji
    return CHARM_EMOJI["default"]


def _enrich_recommendation(
    response: RecommendationResponse,
    items: list[ClothingItem],
    profile: StyleProfile,
    gap_response: ClosetGapResponse,
    reminder_response: ReminderResponse,
    preference_scores: dict[int, float],
    prompt: str,
) -> RecommendationResponse:
    items_by_id = {item.id: item for item in items}
    reminder_flags = [card.title for group in [reminder_response.repeat_warning, reminder_response.laundry_and_care, reminder_response.idle_and_seasonal] for card in group[:1]]

    for outfit in response.outfits:
        scores = [preference_scores.get(item_id, 0.0) for item_id in outfit.item_ids]
        mean_score = (sum(scores) / len(scores)) if scores else 0.0
        normalized_score = max(0.58, min(0.96, 0.74 + mean_score * 0.05 + len(outfit.item_ids) * 0.015))
        outfit.confidence = round(normalized_score, 2)
        outfit.confidence_label = _confidence_label(normalized_score)

        key_item_id = next(
            (
                item_id
                for item_id in outfit.item_ids
                if items_by_id.get(item_id) and items_by_id[item_id].slot in {"outerwear", "top"}
            ),
            outfit.item_ids[0] if outfit.item_ids else None,
        )
        outfit.key_item_id = key_item_id

        if key_item_id is not None:
            key_item = items_by_id.get(key_item_id)
            slot = key_item.slot if key_item else "top"
            outfit.substitute_item_ids = _substitute_item_ids(items, outfit.item_ids, slot)
            reason_badges = []
            if key_item is not None:
                reason_badges.append(f"{key_item.color} main piece")
                reason_badges.extend((key_item.tags or [])[:2])
            if profile.favorite_colors:
                reason_badges.append(f"leans into {profile.favorite_colors[0]}")
            outfit.reason_badges = _unique_preserve(reason_badges)[:4]
            outfit.charm_copy = (
                f"{_emoji_for_prompt(prompt)} 我记得你喜欢看起来不费力但有被认真照顾到的感觉，这套就把 {key_item.name if key_item else '主角单品'} 放在了最顺手的位置。"
            )
            outfit.mood_emoji = _emoji_for_prompt(prompt)

    response.profile_summary = _build_profile_summary(profile)
    response.closet_gaps = [insight.title for insight in gap_response.insights[:3]]
    response.reminder_flags = reminder_flags[:3]
    return response


def generate_recommendation(db: Session, user: User, payload: RecommendationRequest) -> RecommendationResponse:
    items = wardrobe_service.list_items(db, user.id)
    _safe_attach_memory_cards(db, items, user.id)
    profile = _safe_style_profile(db, user, items)
    recent_signals = _safe_recent_signals(db, user.id)
    recent_wear_logs = _safe_recent_wear_logs(db, user.id)
    preference_scores = _preference_scores(items, profile, recent_signals, recent_wear_logs, payload.prompt)
    sorted_items = sorted(items, key=lambda item: preference_scores.get(item.id, 0.0), reverse=True)
    response = recommendation_service.generate_recommendations(payload, sorted_items)
    gap_response = _build_gap_response(items)
    reminder_response = _safe_reminder_response(db, items, user.id)
    return _enrich_recommendation(response, items, profile, gap_response, reminder_response, preference_scores, payload.prompt)


def search_locations(query: str):
    return weather_service.search_locations(query)


def _weather_summary_from_forecast(forecast: weather_service.DailyForecast) -> WeatherSummary:
    return WeatherSummary(
        location_name=forecast.location_name,
        timezone=forecast.timezone,
        date=forecast.date,
        weather_code=forecast.weather_code,
        condition_label=forecast.condition_label,
        temperature_max=forecast.temperature_max,
        temperature_min=forecast.temperature_min,
        precipitation_probability_max=forecast.precipitation_probability_max,
    )


def _commute_tip(weather: WeatherSummary, has_commute: bool) -> str:
    if not has_commute:
        return "明天不通勤的话，可以把舒适度放在第一位，留一点松弛感会更像你。"
    if weather.precipitation_probability_max and weather.precipitation_probability_max >= 45:
        return "明天有明显降雨概率，尽量避开浅色易脏鞋履，并把外套和包包都选成更耐折腾的搭档。"
    if weather.temperature_min <= 14:
        return "早晚温差偏大，通勤层次最好做成可脱卸结构，别让上午和晚上像两套完全不同的计划。"
    return "明天通勤压力不算高，选一件稳定的主角单品，再用轻量鞋履收尾会很省心。"


def generate_tomorrow_plan(db: Session, user: User, payload: TomorrowAssistantRequest) -> TomorrowAssistantResponse:
    location = weather_service.resolve_location(
        location_query=payload.location_query,
        latitude=payload.latitude,
        longitude=payload.longitude,
        timezone_name=payload.timezone,
    )
    forecast = weather_service.fetch_daily_forecast(
        latitude=location.latitude,
        longitude=location.longitude,
        location_name=", ".join(part for part in [location.name, location.admin1, location.country] if part),
        timezone_name=location.timezone,
        date=payload.date,
    )
    weather = _weather_summary_from_forecast(forecast)
    weather_text = f"{weather.condition_label}, {weather.temperature_min:.0f}-{weather.temperature_max:.0f}°C"

    morning_prompt = f"{payload.schedule}. Tomorrow morning with commute={payload.has_commute}. Weather: {weather_text}. Need a stable start."
    evening_prompt = f"{payload.schedule}. Tomorrow evening after the day is over. Weather: {weather_text}. Need a look that still feels fresh."

    morning_recommendation = generate_recommendation(
        db,
        user,
        RecommendationRequest(prompt=morning_prompt, weather=weather.condition_label, scene="tomorrow-morning", style="gentle-practical"),
    )
    evening_recommendation = generate_recommendation(
        db,
        user,
        RecommendationRequest(prompt=evening_prompt, weather=weather.condition_label, scene="tomorrow-evening", style="soft-refresh"),
    )

    return TomorrowAssistantResponse(
        weather=weather,
        morning=TomorrowPlanBlock(
            period="morning",
            summary="早上这套更偏稳定和省心，优先照顾通勤与温差。",
            recommendation=morning_recommendation,
        ),
        evening=TomorrowPlanBlock(
            period="evening",
            summary="晚上这套会更在意疲惫后的体感和新鲜感，尽量避免像把白天那套硬撑到晚上。",
            recommendation=evening_recommendation,
        ),
        commute_tip=_commute_tip(weather, payload.has_commute),
    )


def generate_quick_mode(db: Session, user: User, payload: QuickModeRequest) -> RecommendationResponse:
    prompt = LOW_THOUGHT_MODES.get(payload.mode, LOW_THOUGHT_MODES["今天不想费脑"])
    return generate_recommendation(
        db,
        user,
        RecommendationRequest(prompt=prompt, scene="quick-mode", style="low-friction"),
    )


def build_gap_overview(db: Session, user: User) -> ClosetGapResponse:
    items = wardrobe_service.list_items(db, user.id)
    return _build_gap_response(items)


def build_reminders(db: Session, user: User) -> ReminderResponse:
    items = wardrobe_service.list_items(db, user.id)
    _safe_attach_memory_cards(db, items, user.id)
    return _safe_reminder_response(db, items, user.id)


def get_style_profile(db: Session, user: User) -> StyleProfile:
    return _ensure_style_profile(db, user)


def update_style_profile(db: Session, user: User, payload: StyleProfilePayload) -> StyleProfile:
    profile = _ensure_style_profile(db, user)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return profile


def record_feedback(db: Session, user: User, payload: RecommendationSignalPayload) -> StatusMessageResponse:
    signal = RecommendationSignal(
        user_id=user.id,
        prompt=payload.prompt,
        scene=payload.scene,
        action=payload.action,
        item_ids=payload.item_ids,
        feedback_note=payload.feedback_note,
        metadata_json=payload.metadata_json,
    )
    db.add(signal)
    db.commit()
    return StatusMessageResponse(status="recorded", message="Preference signal stored for future ranking.")


def list_saved_outfits(db: Session, user: User) -> list[Outfit]:
    return list(
        db.scalars(
            select(Outfit).where(Outfit.user_id == user.id).order_by(desc(Outfit.created_at)).limit(12)
        ).all()
    )


def save_outfit(db: Session, user: User, payload: SavedOutfitPayload) -> Outfit:
    outfit = Outfit(
        user_id=user.id,
        name=payload.name,
        occasion=payload.occasion,
        style=payload.style,
        item_ids=payload.item_ids,
        reasoning=payload.reasoning,
        ai_generated=True,
    )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)

    db.add(
        RecommendationSignal(
            user_id=user.id,
            action="saved",
            scene=payload.occasion,
            item_ids=payload.item_ids,
            feedback_note=payload.reasoning,
            metadata_json={"outfit_id": outfit.id, "style": payload.style},
        )
    )
    db.commit()
    return outfit


def list_wear_logs(db: Session, user: User) -> list[WearLog]:
    return list(
        db.scalars(
            select(WearLog).where(WearLog.user_id == user.id).order_by(desc(WearLog.worn_on), desc(WearLog.id)).limit(20)
        ).all()
    )


def create_wear_log(db: Session, user: User, payload: WearLogPayload) -> WearLog:
    wear_log = WearLog(
        user_id=user.id,
        outfit_id=payload.outfit_id,
        outfit_name=payload.outfit_name,
        item_ids=payload.item_ids,
        occasion=payload.occasion,
        period=payload.period,
        location_label=payload.location_label,
        feedback_note=payload.feedback_note,
        worn_on=payload.worn_on or datetime.utcnow(),
    )
    db.add(wear_log)
    db.commit()
    db.refresh(wear_log)

    db.add(
        RecommendationSignal(
            user_id=user.id,
            action="worn",
            scene=payload.occasion,
            item_ids=payload.item_ids,
            feedback_note=payload.feedback_note,
            metadata_json={"wear_log_id": wear_log.id, "period": payload.period},
        )
    )
    db.commit()
    return wear_log


def generate_packing_plan(db: Session, user: User, payload: PackingRequest) -> PackingResponse:
    location = weather_service.resolve_location(location_query=payload.city)
    forecast = weather_service.fetch_daily_forecast(
        latitude=location.latitude,
        longitude=location.longitude,
        location_name=", ".join(part for part in [location.name, location.admin1, location.country] if part),
        timezone_name=location.timezone,
    )
    weather = _weather_summary_from_forecast(forecast)
    recommendation = generate_quick_mode(
        db,
        user,
        QuickModeRequest(mode="上班" if payload.include_commute else "今天不想费脑"),
    )
    items = wardrobe_service.list_items(db, user.id)
    chosen_ids = recommendation.outfits[0].item_ids if recommendation.outfits else []
    suggestions: list[PackingSuggestion] = []
    used_ids: set[int] = set()

    for item_id in chosen_ids:
        item = next((entry for entry in items if entry.id == item_id), None)
        if item is None or item.id in used_ids:
            continue
        suggestions.append(
            PackingSuggestion(
                item_id=item.id,
                reason=f"Because {item.name} works as a dependable {item.slot} for {payload.trip_kind} days.",
            )
        )
        used_ids.add(item.id)

    for slot in ["top", "bottom", "shoes"]:
        for item in items:
            if item.slot == slot and item.id not in used_ids:
                suggestions.append(
                    PackingSuggestion(
                        item_id=item.id,
                        reason=f"备用 {slot}，让 {payload.days} 天的行李胶囊衣橱更不容易重复得太明显。",
                    )
                )
                used_ids.add(item.id)
                break

    if weather.temperature_min <= 14 or (weather.precipitation_probability_max and weather.precipitation_probability_max > 40):
        for item in items:
            if item.slot == "outerwear" and item.id not in used_ids:
                suggestions.append(
                    PackingSuggestion(
                        item_id=item.id,
                        reason="天气有温差或降雨风险，带一件外套会让整趟行程更稳。",
                    )
                )
                used_ids.add(item.id)
                break

    return PackingResponse(
        city=payload.city,
        weather=weather,
        capsule_summary=f"{payload.days} 天 {payload.trip_kind} 行程建议维持轻量胶囊衣橱：一件锚点外套、两套高复用主搭配、再留一件替补单品。",
        suggestions=suggestions[: min(8, max(4, payload.days + 2))],
    )


def build_overview(db: Session, user: User) -> AssistantOverviewResponse:
    items = wardrobe_service.list_items(db, user.id)
    profile = _safe_style_profile(db, user, items)
    try:
        tomorrow = generate_tomorrow_plan(
            db,
            user,
            TomorrowAssistantRequest(location_query="Shanghai", schedule="Tomorrow's regular routine", has_commute=True),
        )
    except HTTPException:
        fallback_weather = WeatherSummary(
            location_name="Shanghai",
            timezone="Asia/Shanghai",
            date=(datetime.utcnow() + timedelta(days=1)).date().isoformat(),
            weather_code=2,
            condition_label="Partly cloudy",
            temperature_max=24,
            temperature_min=15,
            precipitation_probability_max=20,
        )
        fallback_recommendation = generate_quick_mode(db, user, QuickModeRequest(mode="今天不想费脑"))
        tomorrow = TomorrowAssistantResponse(
            weather=fallback_weather,
            morning=TomorrowPlanBlock(period="morning", summary="默认天气卡片不可用时的温柔 fallback。", recommendation=fallback_recommendation),
            evening=TomorrowPlanBlock(period="evening", summary="晚间建议沿用同一主角单品，但换一个更松弛的收尾。", recommendation=fallback_recommendation),
            commute_tip="天气接口暂时不可用，所以这里先给你一套稳妥版建议。",
        )

    return AssistantOverviewResponse(
        tomorrow=tomorrow,
        gaps=build_gap_overview(db, user),
        reminders=build_reminders(db, user),
        style_profile=profile,
        recent_saved_outfits=list_saved_outfits(db, user)[:4],
    )


def create_task(db: Session, user: User, task_type: str, input_payload: dict) -> AssistantTask:
    task = AssistantTask(user_id=user.id, task_type=task_type, status="queued", input_payload=input_payload)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def mark_task_running(db: Session, task_id: int) -> AssistantTask:
    task = db.get(AssistantTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant task not found.")
    task.status = "running"
    db.commit()
    db.refresh(task)
    return task


def complete_task(db: Session, task_id: int, result_payload: dict) -> AssistantTask:
    task = db.get(AssistantTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant task not found.")
    task.status = "completed"
    task.result_payload = result_payload
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


def fail_task(db: Session, task_id: int, error_message: str) -> AssistantTask:
    task = db.get(AssistantTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant task not found.")
    task.status = "failed"
    task.error_message = error_message
    task.updated_at = datetime.utcnow()
    task.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


def get_task(db: Session, task_id: int, user: User) -> AssistantTask:
    task = db.get(AssistantTask, task_id)
    if task is None or task.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assistant task not found.")
    return task
