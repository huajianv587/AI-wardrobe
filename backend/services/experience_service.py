from __future__ import annotations

from collections import Counter
from copy import deepcopy
from datetime import datetime, timedelta
import html
import httpx
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse
from fastapi import HTTPException, UploadFile, status

from sqlalchemy import desc, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.experience_state import ExperienceUserState
from app.models.assistant import RecommendationSignal, WearLog
from app.models.outfit import Outfit
from app.models.user import User
from app.models.wardrobe import ClothingItem
from app.schemas.assistant import PackingRequest, StyleProfilePayload, WearLogPayload
from app.schemas.experience import (
    ExperienceDecomposeConfirmPayload,
    ExperienceDiaryLogPayload,
    ExperienceIdleActionPayload,
    ExperienceImportUrlPayload,
    ExperienceSmartConfigPayload,
    ExperienceSmartEditPayload,
    ExperienceStyleProfilePatch,
    ExperienceSuitcasePayload,
    ExperienceUploadBatchPayload,
    ExperienceWardrobeBulkPayload,
    ExperienceWardrobeItemPayload,
)
from app.schemas.wardrobe import ClothingItemCreate, ClothingItemUpdate, ImageUploadFinalizeRequest, ImageUploadPrepareRequest
from db.session import SessionLocal
from services import assistant_service, fashion_decomposition_service, storage_service, wardrobe_service

DEMO_USER_EMAIL = "guest@wenwen-wardrobe.local"
DEMO_USER_NAME = "文文的衣橱 · 公开体验"
DEFAULT_YEAR = 2026
DEFAULT_MONTH = 4

SMART_PIPELINE_LABELS = [
    "人像定位",
    "用户锁定",
    "服饰分割",
    "白底图输出",
    "标签补全",
    "本地 fallback",
]

WARDROBE_TARGETS = {
    "tops": 12,
    "bottoms": 8,
    "outerwear": 6,
    "dresses": 6,
    "shoes": 7,
    "accessories": 5,
}

THEME_CLASSES = ["ci1", "ci2", "ci3", "ci4", "ci5", "ci6", "ci7", "ci8", "ci10"]
SILHOUETTE_MAP = {
    "top": "shirt",
    "bottom": "skirt",
    "outerwear": "coat",
    "shoes": "shoe",
    "accessory": "bag",
}
EMOJI_MAP = {
    "top": "👕",
    "bottom": "👖",
    "outerwear": "🧥",
    "shoes": "👟",
    "accessory": "👜",
    "dress": "👗",
}
SLOT_LABELS = {
    "top": "上衣",
    "bottom": "下装",
    "outerwear": "外套",
    "shoes": "鞋子",
    "accessory": "配饰",
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
COLOR_HEX = {
    "米白": "#f5f2ee",
    "薄荷绿": "#c4d8d3",
    "驼色": "#c9a882",
    "薰衣草紫": "#d4c0d8",
    "天蓝": "#aac0d8",
    "焦糖": "#b48755",
    "草绿": "#c8d8a8",
    "玫粉": "#d4908a",
    "奶白": "#efe8de",
    "深蓝": "#35516d",
    "白色": "#f8f7f3",
    "棕色": "#8b6a52",
    "黑色": "#2f2a26",
    "鼠尾草绿": "#9db3a7",
    "石墨灰": "#5c5c5c",
    "裸粉": "#c8b0a0",
}
STYLE_AXES = [
    {"key": "cute", "label": "可爱感", "archetype": "可爱型", "color": "#f3aac4", "summary": "甜感、柔和、轻盈。"},
    {"key": "sexy", "label": "性感感", "archetype": "性感型", "color": "#d88c8b", "summary": "曲线、氛围、存在感。"},
    {"key": "commute", "label": "通勤感", "archetype": "通勤型", "color": "#8aa4bb", "summary": "利落、可靠、适合工作日。"},
    {"key": "mature", "label": "轻熟感", "archetype": "轻熟型", "color": "#c6a27f", "summary": "有分寸的高级感和气质感。"},
    {"key": "casual", "label": "松弛感", "archetype": "休闲型", "color": "#9cb79a", "summary": "舒服、放松、没有压力。"},
    {"key": "edgy", "label": "个性感", "archetype": "个性型", "color": "#aa95c5", "summary": "辨识度、层次和一点态度。"},
]
STYLE_SIGNAL_WEIGHTS = {
    "cute": {
        "可爱": 3.6,
        "甜": 2.2,
        "甜美": 3.0,
        "少女": 3.0,
        "温柔": 1.6,
        "清新": 1.5,
        "轻盈": 1.4,
        "连衣裙": 1.3,
        "花": 1.0,
        "粉": 1.0,
        "约会": 1.2,
        "下午茶": 1.1,
        "柔和": 1.1,
    },
    "sexy": {
        "性感": 3.8,
        "御姐": 3.0,
        "吊带": 3.2,
        "收腰": 1.9,
        "曲线": 2.2,
        "贴身": 1.8,
        "高光": 1.5,
        "拍照": 1.3,
        "氛围": 1.2,
        "丝": 1.2,
    },
    "commute": {
        "通勤": 3.2,
        "商务": 2.6,
        "上班": 2.6,
        "开会": 2.4,
        "职场": 2.5,
        "西装": 2.1,
        "衬衫": 1.6,
        "利落": 1.6,
        "干练": 1.8,
        "正式": 1.8,
    },
    "mature": {
        "轻熟": 3.4,
        "高级": 2.8,
        "质感": 2.1,
        "法式": 1.9,
        "优雅": 2.0,
        "大地色": 2.2,
        "羊绒": 1.8,
        "毛呢": 1.6,
        "气质": 1.8,
        "稳": 1.0,
    },
    "casual": {
        "周末": 3.0,
        "休闲": 2.8,
        "旅行": 2.0,
        "city": 1.2,
        "轻松": 1.9,
        "松弛": 2.8,
        "牛仔": 1.7,
        "帆布鞋": 1.5,
        "t恤": 1.2,
        "散步": 1.6,
        "咖啡店": 1.5,
    },
    "edgy": {
        "个性": 3.2,
        "文艺": 2.2,
        "层次": 2.0,
        "中性": 1.7,
        "实验": 1.8,
        "撞色": 1.6,
        "风衣": 1.2,
        "条纹": 1.0,
        "海洋风": 1.1,
        "酷": 1.8,
    },
}
STYLE_COLOR_HINTS = {
    "玫粉": {"cute": 2.2, "sexy": 1.2},
    "裸粉": {"cute": 1.4, "mature": 0.7},
    "薄荷绿": {"cute": 1.8, "casual": 0.6},
    "薰衣草紫": {"cute": 1.3, "edgy": 1.0},
    "草绿": {"casual": 1.1, "edgy": 0.7},
    "米白": {"mature": 1.1, "cute": 0.5},
    "奶白": {"mature": 1.0, "cute": 0.4},
    "驼色": {"mature": 1.9, "commute": 0.8},
    "焦糖": {"mature": 1.5, "commute": 0.6},
    "深蓝": {"commute": 1.6, "mature": 0.7},
    "天蓝": {"commute": 1.0, "cute": 0.5},
    "黑色": {"sexy": 1.1, "commute": 0.8, "edgy": 0.8},
    "棕色": {"mature": 0.9, "commute": 0.6},
    "白色": {"cute": 0.4, "commute": 0.7},
}
SILHOUETTE_PRESETS = [
    {"name": "H型", "desc": "直筒·利落", "fallback_badge": "常穿"},
    {"name": "V型", "desc": "宽肩·收腰", "fallback_badge": "偏好"},
    {"name": "X型", "desc": "收腰·曲线", "fallback_badge": ""},
    {"name": "宽松廓形", "desc": "Oversize", "fallback_badge": "周末"},
    {"name": "修身", "desc": "贴合身形", "fallback_badge": ""},
    {"name": "A型", "desc": "上紧下宽", "fallback_badge": ""},
]
STYLE_DNA_SEGMENTS = [
    {"key": "cute", "label": "甜美可爱", "color": "#F0A6C1", "summary": "轻盈、柔和、带一点亲近感"},
    {"key": "mature", "label": "优雅知性", "color": "#C7A07B", "summary": "有分寸、讲究细节、质感在线"},
    {"key": "edgy", "label": "街头潮酷", "color": "#A794C9", "summary": "有态度、层次感强、辨识度更高"},
    {"key": "commute", "label": "轻熟商务", "color": "#8EA6BD", "summary": "利落、稳定、适合工作与见人场景"},
    {"key": "sexy", "label": "性感魅惑", "color": "#D68D8D", "summary": "强调曲线、氛围感和镜头表现力"},
    {"key": "casual", "label": "独家慵懒", "color": "#9CB792", "summary": "舒适、松弛、看起来毫不费力"},
]
SOURCE_PLATFORM_LABELS = {
    "taobao.com": "淘宝",
    "tmall.com": "天猫",
    "jd.com": "京东",
    "pinduoduo.com": "拼多多",
    "yangkeduo.com": "拼多多",
    "douyin.com": "抖音",
    "iesdouyin.com": "抖音",
    "xiaohongshu.com": "小红书",
    "weidian.com": "微店",
}
DIRECT_IMAGE_SUFFIXES = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp")


def _now() -> datetime:
    return datetime.utcnow()


def _state_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "experience_state.json"


def _smart_service_defaults() -> dict[str, Any]:
    return {
        "primary_service": "R2 解构资产输出",
        "remove_bg_key": "",
        "fallback_strategy": "本地失败后切换 OpenAI / DeepSeek",
        "person_detector": "YOLO26 · 人体/配件检测",
        "face_selector": "人物主体锁定",
        "garment_segmenter": "SAM 2.1 / SCHP / 本地抠图",
        "label_model": "FashionCLIP + Vision LLM",
        "recognition_local_model": "FashionCLIP + 本地视觉解构",
        "recognition_openai_model": "gpt-4.1-mini",
        "recognition_deepseek_model": "deepseek-chat",
        "recognition_retries": 1,
        "concurrency": 3,
    }


def _normalize_smart_services(value: dict[str, Any] | None) -> dict[str, Any]:
    merged = _merge_mapping(_smart_service_defaults(), value or {})
    merged["concurrency"] = max(1, min(10, int(merged.get("concurrency") or 3)))
    retries = merged.get("recognition_retries")
    merged["recognition_retries"] = max(0, min(3, int(1 if retries is None else retries)))
    merged["remove_bg_key"] = str(merged.get("remove_bg_key") or "")
    return merged


def _default_user_state() -> dict[str, Any]:
    return {
        "smart": {
            "services": _smart_service_defaults(),
            "item_status": {},
            "last_run_at": None,
            "last_upload_mode": None,
            "decomposition_previews": {},
            "recent_item_ids": [],
        },
        "wardrobe": {
            "source_meta": {},
        },
        "analysis": {
            "idle_actions": {},
            "care_completed": [],
            "care_reminders": {},
        },
        "diary": {
            "suitcase_history": [],
        },
    }


def _default_state() -> dict[str, Any]:
    return {
        "users": {},
        "meta": {
            "legacy_assigned_to": None,
            "legacy_user_state": None,
        },
    }


def _merge_mapping(base: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in incoming.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _merge_mapping(merged[key], value)
        else:
            merged[key] = value
    return merged


def _normalize_user_state(value: dict[str, Any] | None) -> dict[str, Any]:
    normalized = _merge_mapping(_default_user_state(), value or {})
    normalized["smart"]["services"] = _normalize_smart_services(normalized["smart"].get("services"))
    return normalized


def _extract_legacy_user_state(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    sections = {key: value[key] for key in _default_user_state() if key in value}
    return _normalize_user_state(sections) if sections else None


def _load_state() -> dict[str, Any]:
    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        state = _default_state()
        path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        return state

    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        loaded = {}

    state = _default_state()
    if isinstance(loaded.get("users"), dict):
        for user_key, user_state in loaded["users"].items():
            state["users"][str(user_key)] = _normalize_user_state(user_state)
    if isinstance(loaded.get("meta"), dict):
        state["meta"] = _merge_mapping(state["meta"], loaded["meta"])

    legacy_user_state = _extract_legacy_user_state(loaded)
    if legacy_user_state and not state["meta"].get("legacy_user_state"):
        state["meta"]["legacy_user_state"] = legacy_user_state
    return state


def _save_state(state: dict[str, Any]) -> None:
    if state.get("__db_user_id") is not None:
        user_state = state["users"].get(state.get("__user_key"), {})
        _save_db_user_state(int(state["__db_user_id"]), user_state)
        return

    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _state_user_key(user: User) -> str:
    if user.id is not None:
        return str(user.id)
    return (user.email or DEMO_USER_EMAIL).strip().lower()


def _load_db_user_state(user_id: int) -> dict[str, Any] | None:
    try:
        with SessionLocal() as db:
            record = db.scalar(select(ExperienceUserState).where(ExperienceUserState.user_id == user_id))
            if record is None:
                return None
            return _normalize_user_state(record.state_json if isinstance(record.state_json, dict) else {})
    except SQLAlchemyError:
        return None


def _save_db_user_state(user_id: int, user_state: dict[str, Any]) -> None:
    try:
        with SessionLocal() as db:
            record = db.scalar(select(ExperienceUserState).where(ExperienceUserState.user_id == user_id))
            normalized = _normalize_user_state(user_state)
            if record is None:
                record = ExperienceUserState(user_id=user_id, state_json=normalized)
                db.add(record)
            else:
                record.state_json = normalized
            db.commit()
    except SQLAlchemyError:
        fallback_state = _load_state()
        fallback_state.setdefault("users", {})[str(user_id)] = _normalize_user_state(user_state)
        path = _state_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(fallback_state, ensure_ascii=False, indent=2), encoding="utf-8")


def _ensure_user_state(state: dict[str, Any], user: User) -> tuple[dict[str, Any], bool]:
    changed = False
    users = state.setdefault("users", {})
    user_key = _state_user_key(user)
    current = users.get(user_key)
    if current is None:
        legacy = state.setdefault("meta", {}).get("legacy_user_state")
        if legacy and not state["meta"].get("legacy_assigned_to"):
            users[user_key] = _normalize_user_state(legacy)
            state["meta"]["legacy_assigned_to"] = user_key
        else:
            users[user_key] = _default_user_state()
        changed = True
    else:
        normalized = _normalize_user_state(current)
        if normalized != current:
            users[user_key] = normalized
            changed = True
    return users[user_key], changed


def _load_user_state(user: User) -> tuple[dict[str, Any], dict[str, Any]]:
    if user.id is not None:
        user_key = _state_user_key(user)
        db_state = _load_db_user_state(user.id)
        if db_state is None:
            db_state = _default_user_state()
            _save_db_user_state(user.id, db_state)
        return {
            "__db_user_id": user.id,
            "__user_key": user_key,
            "users": {user_key: db_state},
            "meta": {},
        }, db_state

    state = _load_state()
    user_state, changed = _ensure_user_state(state, user)
    if changed:
        _save_state(state)
    return state, user_state


def _unique(values: list[str] | None) -> list[str]:
    return list(dict.fromkeys(value for value in (values or []) if value))


def _format_datetime_label(value: datetime | None) -> str:
    if value is None:
        return "未同步"
    return value.strftime("%H:%M 今日")


def _slot_for_item(item: ClothingItem) -> str:
    if item.category == "dresses":
        return "dress"
    if item.slot in {"top", "bottom", "outerwear", "shoes", "accessory"}:
        return item.slot
    return "accessory"


def _slot_label(item: ClothingItem) -> str:
    return SLOT_LABELS.get(_slot_for_item(item), "单品")


def _category_label(category: str) -> str:
    return CATEGORY_LABELS.get(category, category)


def _visual_theme(item: ClothingItem) -> str:
    return THEME_CLASSES[(item.id - 1) % len(THEME_CLASSES)]


def _silhouette(item: ClothingItem) -> str:
    return "dress" if item.category == "dresses" else SILHOUETTE_MAP.get(_slot_for_item(item), "bag")


def _emoji(item: ClothingItem) -> str:
    return EMOJI_MAP.get(_slot_for_item(item), "✨")


def _price_for_item(item: ClothingItem) -> int:
    return 380 + item.id * 70


def _extract_days(label: str) -> int:
    match = re.search(r"(\d+)", label)
    if not match:
        return 5
    return max(1, min(14, int(match.group(1))))


def _recognition_chain_badge(config: dict[str, Any]) -> str:
    retries_value = config.get("recognition_retries")
    retries = int(1 if retries_value is None else retries_value)
    retry_copy = f"失败后重试 {retries} 次" if retries else "不额外重试"
    return " → ".join(
        [
            str(config.get("recognition_local_model") or "本地多模态"),
            str(config.get("recognition_openai_model") or "OpenAI"),
            str(config.get("recognition_deepseek_model") or "DeepSeek"),
        ]
    ) + f" · {retry_copy}"


def _wardrobe_source_state(user_state: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return user_state.setdefault("wardrobe", {}).setdefault("source_meta", {})


def _remember_source_meta(user: User, item_id: int, source_meta: dict[str, Any]) -> None:
    state, user_state = _load_user_state(user)
    _wardrobe_source_state(user_state)[str(item_id)] = source_meta
    _save_state(state)


def _smart_preview_state(user_state: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return user_state.setdefault("smart", {}).setdefault("decomposition_previews", {})


def _remember_smart_preview(user: User, preview: dict[str, Any]) -> None:
    state, user_state = _load_user_state(user)
    previews = _smart_preview_state(user_state)
    previews[str(preview["id"])] = preview
    recent_keys = list(previews.keys())[-8:]
    user_state["smart"]["decomposition_previews"] = {key: previews[key] for key in recent_keys}
    user_state["smart"]["last_preview_id"] = preview["id"]
    _save_state(state)


def _require_smart_preview(user: User, preview_id: str) -> dict[str, Any]:
    _, user_state = _load_user_state(user)
    preview = _smart_preview_state(user_state).get(str(preview_id))
    if not preview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="这次单品解构预览已失效，请重新解析。")
    return preview


def _track_recent_smart_items(user: User, item_ids: list[int]) -> None:
    state, user_state = _load_user_state(user)
    existing = [int(item_id) for item_id in user_state["smart"].get("recent_item_ids", [])]
    merged = _unique([*(str(item_id) for item_id in item_ids), *(str(item_id) for item_id in existing)])
    user_state["smart"]["recent_item_ids"] = [int(item_id) for item_id in merged[:18]]
    _save_state(state)


def _source_payload(source_meta: dict[str, Any] | None) -> dict[str, Any] | None:
    if not source_meta:
        return None
    platform = str(source_meta.get("platform") or "外部导入")
    status_label = str(source_meta.get("status") or "未确认")
    return {
        "platform": platform,
        "status": status_label,
        "label": f"{platform} · {status_label}",
        "source_url": source_meta.get("source_url"),
        "title": source_meta.get("title"),
        "description": source_meta.get("description"),
    }


def _normalize_import_url(raw_url: str) -> str:
    candidate = (raw_url or "").strip()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请先提供图片地址或商品链接。")
    if not re.match(r"^[a-z][a-z0-9+.-]*://", candidate, flags=re.IGNORECASE):
        candidate = "https://" + candidate.lstrip("/")
    return candidate


def _looks_like_image_url(url: str, content_type: str | None = None) -> bool:
    suffix = Path(urlparse(url).path.lower()).suffix
    if suffix in DIRECT_IMAGE_SUFFIXES:
        return True
    return bool(content_type and content_type.lower().startswith("image/"))


def _detect_source_platform(url: str, platform_hint: str | None = None) -> str:
    hint = (platform_hint or "").strip()
    if hint:
        return hint
    hostname = (urlparse(url).hostname or "").lower()
    for pattern, label in SOURCE_PLATFORM_LABELS.items():
        if pattern in hostname:
            return label
    return "图片直链" if _looks_like_image_url(url) else "外部导入"


def _extract_meta_content(page: str, key: str, value: str) -> str:
    pattern = rf'<meta[^>]+{key}=["\']{re.escape(value)}["\'][^>]+content=["\']([^"\']+)["\']'
    match = re.search(pattern, page, flags=re.IGNORECASE)
    if match:
        return html.unescape(match.group(1)).strip()
    reverse_pattern = rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+{key}=["\']{re.escape(value)}["\']'
    reverse_match = re.search(reverse_pattern, page, flags=re.IGNORECASE)
    return html.unescape(reverse_match.group(1)).strip() if reverse_match else ""


def _json_ld_candidates(page: str) -> list[dict[str, Any]]:
    matches = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
        page,
        flags=re.IGNORECASE,
    )
    candidates: list[dict[str, Any]] = []
    for block in matches:
        try:
            parsed = json.loads(html.unescape(block.strip()))
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, list):
            candidates.extend(entry for entry in parsed if isinstance(entry, dict))
        elif isinstance(parsed, dict):
            candidates.append(parsed)
    return candidates


def _upgrade_candidate_image_url(image_url: str, platform: str) -> str:
    upgraded = image_url.strip()
    if not upgraded:
        return upgraded
    if platform in {"淘宝", "天猫"}:
        upgraded = re.sub(r"_[0-9]+x[0-9]+(?=\.)", "", upgraded)
        upgraded = re.sub(r"\.avif(_\d+x\d+)?", ".jpg", upgraded, flags=re.IGNORECASE)
    if platform == "京东":
        upgraded = re.sub(r"!q[0-9]+", "", upgraded)
    if platform == "小红书":
        upgraded = upgraded.split("?")[0]
    return upgraded


def _score_candidate_image(image_url: str, platform: str, title: str = "") -> int:
    normalized = image_url.lower()
    score = 40
    if any(keyword in normalized for keyword in ("main", "cover", "primary", "detail", "sku")):
        score += 12
    if any(keyword in normalized for keyword in ("white", "wb", "background", "bkg")):
        score += 14
    if any(keyword in normalized for keyword in ("origin", "large", "1080", "1242", "hd")):
        score += 10
    if platform in {"淘宝", "天猫", "京东"} and any(keyword in normalized for keyword in ("sku", "item", "goods")):
        score += 6
    if platform == "小红书" and any(keyword in normalized for keyword in ("imageview2", "format", "note")):
        score += 8
    if title and any(keyword in title.lower() for keyword in ("dress", "外套", "卫衣", "裤", "鞋", "包")):
        score += 4
    return score


def _candidate_images_from_html(page: str, final_url: str, platform: str) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []

    def add_candidate(raw_url: str, label: str) -> None:
        normalized = urljoin(final_url, raw_url.strip())
        upgraded = _upgrade_candidate_image_url(normalized, platform)
        if not upgraded or not _looks_like_image_url(upgraded):
            return
        if any(entry["url"] == upgraded for entry in candidates):
            return
        candidates.append(
            {
                "url": upgraded,
                "label": label,
                "score": _score_candidate_image(upgraded, platform, label),
            }
        )

    for entry in _json_ld_candidates(page):
        raw_image = entry.get("image")
        if isinstance(raw_image, list):
            for index, item in enumerate(raw_image[:4], start=1):
                if isinstance(item, str):
                    add_candidate(item, str(entry.get("name") or f"jsonld-{index}"))
                elif isinstance(item, dict) and item.get("url"):
                    add_candidate(str(item.get("url")), str(entry.get("name") or f"jsonld-{index}"))
        elif isinstance(raw_image, dict) and raw_image.get("url"):
            add_candidate(str(raw_image.get("url")), str(entry.get("name") or "jsonld"))
        elif isinstance(raw_image, str):
            add_candidate(raw_image, str(entry.get("name") or "jsonld"))

    for meta_name in (("property", "og:image"), ("name", "twitter:image"), ("name", "thumbnail")):
        image_url = _extract_meta_content(page, meta_name[0], meta_name[1])
        if image_url:
            add_candidate(image_url, meta_name[1])

    for match in re.findall(r'<img[^>]+(?:data-src|src)=["\']([^"\']+)["\']', page, flags=re.IGNORECASE):
        add_candidate(match, "img")

    return sorted(candidates, key=lambda entry: entry["score"], reverse=True)


def _build_source_bundle(payload: ExperienceImportUrlPayload) -> dict[str, Any]:
    raw_source = payload.source_url or payload.image_url
    source_url = _normalize_import_url(raw_source)
    platform = _detect_source_platform(source_url, payload.platform_hint)
    if _looks_like_image_url(source_url):
        upgraded = _upgrade_candidate_image_url(source_url, platform)
        return {
            "primary_image_url": upgraded,
            "image_candidates": [{"url": upgraded, "label": "direct-image", "score": 100}],
            "title": payload.name or f"{platform}导入单品",
            "description": "通过图片直链导入，等待进一步确认和整理。",
            "platform": platform,
            "status": "未确认",
            "source_url": source_url,
            "category": payload.category,
            "slot": payload.slot,
            "color": payload.color,
            "name": payload.name or f"{platform}导入单品",
        }

    try:
        response = httpx.get(
            source_url,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
                )
            },
            timeout=12.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"这个链接暂时无法自动提取，请换一个商品详情页或直接粘贴图片链接。{error.__class__.__name__}",
        ) from error

    final_url = str(response.url)
    content_type = response.headers.get("content-type", "")
    platform = _detect_source_platform(final_url, payload.platform_hint)
    if _looks_like_image_url(final_url, content_type):
        upgraded = _upgrade_candidate_image_url(final_url, platform)
        return {
            "primary_image_url": upgraded,
            "image_candidates": [{"url": upgraded, "label": "redirect-image", "score": 100}],
            "title": payload.name or f"{platform}导入单品",
            "description": "通过外部图片链接导入到衣橱。",
            "platform": platform,
            "status": "未确认",
            "source_url": final_url,
            "category": payload.category,
            "slot": payload.slot,
            "color": payload.color,
            "name": payload.name or f"{platform}导入单品",
        }

    page = response.text
    title = _extract_meta_content(page, "property", "og:title") or _extract_meta_content(page, "name", "twitter:title")
    description = _extract_meta_content(page, "property", "og:description") or _extract_meta_content(page, "name", "description")
    candidates = _candidate_images_from_html(page, final_url, platform)
    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="这个商品链接里没有解析到主图，请换一个详情页，或者直接粘贴商品图片地址。",
        )
    merged_text = " ".join(filter(None, [title, description]))
    category, slot = _guess_category_from_text(merged_text, payload.category, payload.slot)
    primary = candidates[0]
    return {
        "primary_image_url": primary["url"],
        "image_candidates": candidates,
        "title": title or payload.name or f"{platform}导入单品",
        "description": description or "已从商品详情页提取候选主图和文案，请确认信息后再进入整理。",
        "platform": platform,
        "status": "未确认",
        "source_url": final_url,
        "category": category,
        "slot": slot,
        "color": _guess_color_from_text(merged_text, payload.color),
        "name": payload.name or title or f"{platform}导入单品",
    }


def _guess_color_from_text(text: str, fallback: str) -> str:
    normalized = text.lower()
    for color in COLOR_HEX:
        if color.lower() in normalized:
            return color
    return fallback


def _guess_category_from_text(text: str, fallback_category: str, fallback_slot: str) -> tuple[str, str]:
    normalized = text.lower()
    mapping = [
        (("半裙", "裙", "skirt"), ("bottoms", "bottom")),
        (("连衣裙", "dress"), ("dresses", "top")),
        (("风衣", "大衣", "外套", "coat", "jacket", "blazer"), ("outerwear", "outerwear")),
        (("鞋", "loafer", "sneaker", "boot", "heel"), ("shoes", "shoes")),
        (("包", "bag", "帽", "hat", "配饰", "项链"), ("accessories", "accessory")),
        (("裤", "jean", "trouser", "pants", "shorts"), ("bottoms", "bottom")),
        (("衬衫", "t恤", "tee", "knit", "针织", "上衣", "shirt"), ("tops", "top")),
    ]
    for keywords, target in mapping:
        if any(keyword in normalized for keyword in keywords):
            return target
    return fallback_category, fallback_slot


def _build_import_source_bundle(payload: ExperienceImportUrlPayload) -> dict[str, Any]:
    bundle = _build_source_bundle(payload)
    return {
        "image_url": bundle["primary_image_url"],
        "name": bundle["name"],
        "description": bundle["description"],
        "platform": bundle["platform"],
        "status": bundle["status"],
        "source_url": bundle["source_url"],
        "category": bundle["category"],
        "slot": bundle["slot"],
        "color": bundle["color"],
        "title": bundle["title"],
    }


def _get_item_status(item: ClothingItem, state: dict[str, Any]) -> dict[str, Any]:
    item_state = state["smart"]["item_status"].get(str(item.id), {})
    services = _normalize_smart_services(state["smart"].get("services"))
    name = item.name

    if "status" not in item_state:
        if "processed" in (item.tags or []) or item.processed_image_url:
            item_state["status"] = "done"
        elif name in {"草绿针织衫"}:
            item_state["status"] = "running"
        elif name in {"天蓝条纹衬衫"}:
            item_state["status"] = "error"
        elif name in {"焦糖色风衣"}:
            item_state["status"] = "fallback"
        elif name in {"紫调百褶裙", "玫粉吊带裙"}:
            item_state["status"] = "waiting"
        else:
            item_state["status"] = "raw"

    status = item_state["status"]
    tone_map = {
        "done": "done",
        "running": "run",
        "waiting": "wait",
        "error": "err",
        "fallback": "fallback",
        "raw": "raw",
    }
    label_map = {
        "done": "处理完成",
        "running": "处理中",
        "waiting": "队列等待",
        "error": "处理失败",
        "fallback": "本地完成",
        "raw": "待接入",
    }
    progress_map = {
        "done": 100,
        "fallback": 100,
        "running": 68,
        "waiting": 24,
        "error": 100,
        "raw": 0,
    }

    return {
        "status": status,
        "tone": tone_map[status],
        "label": label_map[status],
        "progress": progress_map[status],
        "provider": item_state.get("provider")
        or ("本地白底预览" if status == "fallback" else services["primary_service"] if status != "raw" else "待上传原图"),
        "confirmed": bool(item_state.get("confirmed")),
        "priority": bool(item_state.get("priority")),
    }


def _ensure_demo_items(db: Session, user: User) -> None:
    has_items = db.scalar(select(ClothingItem.id).where(ClothingItem.user_id == user.id).limit(1))
    if has_items is not None:
        return

    seeded_items = [
        ClothingItem(user_id=user.id, name="奶油白衬衫", category="tops", slot="top", color="米白", brand="Wenwen Archive", tags=["上衣", "白色", "春夏", "processed"], occasions=["日常通勤", "商务休闲"], style_notes="柔软利落，适合作为通勤衣橱的稳定开场。", created_at=datetime(2025, 9, 12)),
        ClothingItem(user_id=user.id, name="薄荷连衣裙", category="dresses", slot="top", color="薄荷绿", brand="Wenwen Archive", tags=["连衣裙", "绿色", "度假", "processed"], occasions=["周末出行", "海边", "约会"], style_notes="轻盈的少女感单品，适合天气明亮的日子。", created_at=datetime(2025, 10, 4)),
        ClothingItem(user_id=user.id, name="驼色大衣", category="outerwear", slot="outerwear", color="驼色", brand="Wenwen Archive", tags=["外套", "秋冬", "processed"], occasions=["都市通勤", "商务"], style_notes="秋冬里最像主角的一层，拍照和正式场景都很稳。", created_at=datetime(2025, 1, 15)),
        ClothingItem(user_id=user.id, name="紫调百褶裙", category="bottoms", slot="bottom", color="薰衣草紫", brand="Wenwen Archive", tags=["下装", "紫色"], occasions=["咖啡店", "周末"], style_notes="带一点温柔文艺感，适合用来打破基础色的平静。", created_at=datetime(2025, 12, 22)),
        ClothingItem(user_id=user.id, name="天蓝条纹衬衫", category="tops", slot="top", color="天蓝", brand="Wenwen Archive", tags=["上衣", "蓝色"], occasions=["通勤", "city"], style_notes="适合作为轻商务的变化项，目前还在等待更完整的标签识别。", created_at=datetime(2025, 11, 5)),
        ClothingItem(user_id=user.id, name="焦糖色风衣", category="outerwear", slot="outerwear", color="焦糖", brand="Wenwen Archive", tags=["外套", "秋冬", "processed", "cleanup-fallback"], occasions=["通勤", "旅行"], style_notes="本地 fallback 处理过，适合过渡季作为轻量外套。", created_at=datetime(2025, 2, 18)),
        ClothingItem(user_id=user.id, name="草绿针织衫", category="tops", slot="top", color="草绿", brand="Wenwen Archive", tags=["上衣", "未标签"], occasions=["周末"], style_notes="颜色很出挑，但还没完全补全识别信息。", created_at=datetime(2026, 3, 28)),
        ClothingItem(user_id=user.id, name="玫粉吊带裙", category="dresses", slot="top", color="玫粉", brand="Wenwen Archive", tags=["连衣裙", "粉色", "夏"], occasions=["约会", "下午茶"], style_notes="适合高光时刻的一件裙子，常被留作拍照 look。", created_at=datetime(2026, 3, 30)),
        ClothingItem(user_id=user.id, name="香草奶白半裙", category="bottoms", slot="bottom", color="奶白", brand="Wenwen Archive", tags=["下装", "米色", "春", "processed"], occasions=["通勤", "约会"], style_notes="非常百搭的下装锚点，能把柔和色系都串起来。", created_at=datetime(2026, 3, 26)),
        ClothingItem(user_id=user.id, name="深蓝直筒牛仔裤", category="bottoms", slot="bottom", color="深蓝", brand="Wenwen Archive", tags=["下装", "牛仔", "processed"], occasions=["日常", "周末", "city"], style_notes="衣橱里最稳定的高频单品之一。", created_at=datetime(2025, 8, 20)),
        ClothingItem(user_id=user.id, name="白色帆布鞋", category="shoes", slot="shoes", color="白色", brand="Wenwen Archive", tags=["鞋子", "休闲", "processed"], occasions=["周末", "旅行"], style_notes="最轻松的收尾方式，但穿得太频繁时会显旧。", created_at=datetime(2025, 7, 9)),
        ClothingItem(user_id=user.id, name="棕色切尔西靴", category="shoes", slot="shoes", color="棕色", brand="Wenwen Archive", tags=["鞋子", "秋冬"], occasions=["商务", "秋冬通勤"], style_notes="正式感很强，但近期利用率还不够高。", created_at=datetime(2025, 6, 12)),
        ClothingItem(user_id=user.id, name="通勤气质包", category="accessories", slot="accessory", color="裸粉", brand="Wenwen Archive", tags=["配饰", "通勤", "processed"], occasions=["通勤", "约会"], style_notes="一只就能把整体 look 温柔地收起来。", created_at=datetime(2025, 11, 28)),
    ]
    db.add_all(seeded_items)
    db.commit()

    items = list(db.scalars(select(ClothingItem).where(ClothingItem.user_id == user.id)).all())
    assistant_service.attach_memory_cards(db, items, user.id)

    for item in items:
        card = item.memory_card
        if card is None:
            continue
        if item.name == "深蓝直筒牛仔裤":
            card.care_status = "needs-laundry"
            card.care_note = "本月已经连续高频出场，建议冷水清洗后再安排下一轮。"
        if item.name == "白色帆布鞋":
            card.care_status = "needs-cleaning"
            card.care_note = "鞋头有轻微灰痕，适合在下次周末前顺手擦一遍。"
        if item.name == "驼色大衣":
            card.season_tags = ["autumn", "winter"]
        if item.name == "薄荷连衣裙":
            card.season_tags = ["spring", "summer"]
    db.commit()


def _ensure_demo_outfits_and_logs(db: Session, user: User) -> None:
    existing_log = db.scalar(select(WearLog.id).where(WearLog.user_id == user.id).limit(1))
    if existing_log is not None:
        return

    items = list(db.scalars(select(ClothingItem).where(ClothingItem.user_id == user.id)).all())
    items_by_name = {item.name: item for item in items}

    outfit_specs = [
        ("奶油通勤风", "通勤", "简约经典", ["奶油白衬衫", "深蓝直筒牛仔裤", "白色帆布鞋"], "上班日的稳妥组合，轻松但不松散。"),
        ("Sage 约会日", "约会", "清新自然", ["薄荷连衣裙", "白色帆布鞋", "通勤气质包"], "颜色很轻，整个人也会看起来更柔和。"),
        ("城市层次感", "商务", "都市通勤", ["驼色大衣", "奶油白衬衫", "香草奶白半裙", "棕色切尔西靴"], "外套负责气场，内层保持温柔。"),
        ("周末咖啡店", "周末", "松弛感", ["草绿针织衫", "深蓝直筒牛仔裤", "白色帆布鞋"], "低压力但不随意的周末 look。"),
        ("高光约会 look", "约会", "柔和浪漫", ["玫粉吊带裙", "通勤气质包"], "适合拍照和被记住的一套。"),
    ]

    for name, occasion, style, item_names, reasoning in outfit_specs:
        ids = [items_by_name[item_name].id for item_name in item_names if item_name in items_by_name]
        db.add(Outfit(user_id=user.id, name=name, occasion=occasion, style=style, item_ids=ids, reasoning=reasoning, ai_generated=True))
    db.commit()

    created_outfits = list(db.scalars(select(Outfit).where(Outfit.user_id == user.id).order_by(Outfit.id)).all())
    days = [2, 5, 8, 12, 18, 22, 25, 28]
    notes = [
        "今天穿得很舒服，通勤也没有负担。",
        "约会的时候被夸温柔，好感度很高。",
        "周末出门随手抓的一套，但意外很完整。",
        "颜色很轻，整个人状态也显得更松弛。",
        "正式场合里依然保留了自己的温柔感。",
        "经典法式的思路，很耐看的一天。",
        "驼色外套一出场，整个人都有被撑住。",
        "今天想要更有记忆点，所以选了玫粉色。",
    ]
    for index, day in enumerate(days):
        outfit = created_outfits[index % len(created_outfits)]
        db.add(
            WearLog(
                user_id=user.id,
                outfit_id=outfit.id,
                outfit_name=outfit.name,
                item_ids=outfit.item_ids,
                occasion=outfit.occasion,
                period="all-day",
                location_label="文文的衣橱",
                feedback_note=notes[index],
                worn_on=datetime(DEFAULT_YEAR, DEFAULT_MONTH, day, 9, 30),
            )
        )
    for outfit in created_outfits[:3]:
        db.add(
            RecommendationSignal(
                user_id=user.id,
                prompt=outfit.reasoning,
                scene=outfit.occasion,
                action="saved",
                item_ids=outfit.item_ids,
                feedback_note=outfit.reasoning,
                metadata_json={"outfit_name": outfit.name},
            )
        )
    db.commit()
    assistant_service.get_style_profile(db, user)


def ensure_public_demo_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    if user is None:
        user = User(email=DEMO_USER_EMAIL, display_name=DEMO_USER_NAME, auth_provider="guest-preview", password_hash="guest-preview")
        db.add(user)
        db.commit()
        db.refresh(user)

    _ensure_demo_items(db, user)
    _ensure_demo_outfits_and_logs(db, user)
    return user


def _all_user_items(db: Session, user: User) -> list[ClothingItem]:
    items = list(db.scalars(select(ClothingItem).where(ClothingItem.user_id == user.id).order_by(ClothingItem.created_at.desc())).all())
    return assistant_service.attach_memory_cards(db, items, user.id)


def _apply_item_filters(
    items: list[ClothingItem],
    *,
    category: str | None = None,
    query: str | None = None,
    season: str | None = None,
    color: str | None = None,
) -> list[ClothingItem]:
    filtered = items
    if category and category != "all":
        filtered = [item for item in filtered if item.category == category]
    if season and season != "all":
        filtered = [
            item
            for item in filtered
            if item.memory_card
            and (
                (season == "spring-summer" and any(tag in {"spring", "summer"} for tag in item.memory_card.season_tags))
                or (season == "autumn-winter" and any(tag in {"autumn", "winter"} for tag in item.memory_card.season_tags))
            )
        ]
    if color:
        filtered = [item for item in filtered if item.color == color]
    if query:
        query_lower = query.lower()
        filtered = [
            item
            for item in filtered
            if query_lower in item.name.lower()
            or query_lower in (item.style_notes or "").lower()
            or any(query_lower in tag.lower() for tag in item.tags or [])
        ]
    return filtered


def _map_wardrobe_item(item: ClothingItem, source_meta: dict[str, Any] | None = None) -> dict[str, Any]:
    tags = _unique([_slot_label(item), item.color, *(_unique(item.tags)[:3])])
    badge_label = "AI 已识别" if "processed" in (item.tags or []) or item.processed_image_url else "新增" if item.created_at >= _now() - timedelta(days=21) else "待识别"
    badge_tone = "bai" if badge_label == "AI 已识别" else "bnew" if badge_label == "新增" else "bwarn"
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "category_label": _category_label(item.category),
        "slot_label": _slot_label(item),
        "color": item.color,
        "brand": item.brand,
        "tags": tags,
        "occasions": item.occasions or [],
        "note": item.style_notes,
        "visual_theme": _visual_theme(item),
        "silhouette": _silhouette(item),
        "badge_label": badge_label,
        "badge_tone": badge_tone,
        "image_url": item.image_url,
        "processed_image_url": item.processed_image_url,
        "source": _source_payload(source_meta),
    }


def get_wardrobe_management_overview(
    db: Session,
    user: User,
    *,
    category: str | None = None,
    query: str | None = None,
    season: str | None = None,
    color: str | None = None,
) -> dict[str, Any]:
    _, user_state = _load_user_state(user)
    source_meta = _wardrobe_source_state(user_state)
    items = _all_user_items(db, user)
    filtered_items = _apply_item_filters(items, category=category, query=query, season=season, color=color)
    colors = Counter(item.color for item in items)
    category_counts = Counter(item.category for item in items)
    processed_count = sum(1 for item in items if "processed" in (item.tags or []) or item.processed_image_url)
    untagged_count = sum(1 for item in items if not item.tags or any(tag in {"未标签"} for tag in item.tags))
    latest_sync = max((item.last_synced_at for item in items if item.last_synced_at), default=None)

    return {
        "mode": "preview" if user.email == DEMO_USER_EMAIL else "account",
        "stats": {
            "total_items": len(items),
            "ai_processed": processed_count,
            "untagged": untagged_count,
            "last_sync": _format_datetime_label(latest_sync),
        },
        "sidebar": {
            "categories": [
                {"key": "all", "label": "全部", "count": len(items)},
                {"key": "tops", "label": "上衣", "count": category_counts.get("tops", 0)},
                {"key": "bottoms", "label": "下装", "count": category_counts.get("bottoms", 0)},
                {"key": "outerwear", "label": "外套", "count": category_counts.get("outerwear", 0)},
                {"key": "dresses", "label": "连衣裙", "count": category_counts.get("dresses", 0)},
                {"key": "shoes", "label": "鞋子", "count": category_counts.get("shoes", 0)},
                {"key": "accessories", "label": "配饰", "count": category_counts.get("accessories", 0)},
            ],
            "season_counts": {
                "spring-summer": sum(1 for item in items if item.memory_card and any(tag in {"spring", "summer"} for tag in item.memory_card.season_tags)),
                "autumn-winter": sum(1 for item in items if item.memory_card and any(tag in {"autumn", "winter"} for tag in item.memory_card.season_tags)),
            },
            "colors": [{"name": name, "hex": COLOR_HEX.get(name, "#d4c8bf")} for name, _ in colors.most_common(9)],
        },
        "items": [_map_wardrobe_item(item, source_meta.get(str(item.id))) for item in filtered_items],
    }


def create_wardrobe_item_from_experience(db: Session, user: User, payload: ExperienceWardrobeItemPayload) -> dict[str, Any]:
    item = wardrobe_service.create_item(
        db,
        ClothingItemCreate(
            name=payload.name,
            category=payload.category,
            slot=payload.slot,
            color=payload.color,
            brand=payload.brand,
            image_url=payload.image_url,
            processed_image_url=None,
            tags=_unique(payload.tags),
            occasions=_unique(payload.occasions),
            style_notes=payload.style_notes,
        ),
        user,
    )
    return {"status": "created", "item": _map_wardrobe_item(item)}


def update_wardrobe_item_from_experience(db: Session, user: User, item_id: int, payload: ExperienceWardrobeItemPayload) -> dict[str, Any]:
    item = wardrobe_service.update_item(
        db,
        item_id,
        ClothingItemUpdate(
            name=payload.name,
            category=payload.category,
            slot=payload.slot,
            color=payload.color,
            brand=payload.brand,
            image_url=payload.image_url,
            tags=_unique(payload.tags),
            occasions=_unique(payload.occasions),
            style_notes=payload.style_notes,
        ),
        user,
    )
    return {"status": "updated", "item": _map_wardrobe_item(item)}


def prepare_wardrobe_item_image_upload(
    db: Session,
    user: User,
    item_id: int,
    payload: ImageUploadPrepareRequest,
) -> dict[str, Any]:
    prepared = wardrobe_service.prepare_item_image_upload(db, item_id, payload.filename, payload.content_type, user)
    return {
        "upload_url": prepared.upload_url,
        "public_url": prepared.public_url,
        "method": prepared.method,
        "headers": prepared.headers,
    }


def confirm_wardrobe_item_image_upload(
    db: Session,
    user: User,
    item_id: int,
    payload: ImageUploadFinalizeRequest,
) -> dict[str, Any]:
    item = wardrobe_service.finalize_item_image_upload(db, item_id, payload.public_url, user)
    return {"status": "updated", "item": _map_wardrobe_item(item)}


def upload_wardrobe_item_image(db: Session, user: User, item_id: int, upload_file: UploadFile) -> dict[str, Any]:
    item = wardrobe_service.attach_item_image(db, item_id, upload_file, user)
    return {"status": "updated", "item": _map_wardrobe_item(item)}


def import_item_from_url(db: Session, user: User, payload: ExperienceImportUrlPayload) -> dict[str, Any]:
    name = payload.name or f"URL 导入单品 {datetime.utcnow().strftime('%H%M%S')}"
    item = wardrobe_service.create_item(
        db,
        ClothingItemCreate(
            name=name,
            category=payload.category,
            slot=payload.slot,
            color=payload.color,
            brand="URL Import",
            image_url=payload.image_url,
            processed_image_url=None,
            tags=["source-image", "URL导入"],
            occasions=[],
            style_notes="通过图片 URL 导入，等待进一步整理。",
        ),
        user,
    )
    return {"status": "created", "message": "图片 URL 已导入到衣橱。", "item": _map_wardrobe_item(item)}


def import_item_from_url(db: Session, user: User, payload: ExperienceImportUrlPayload) -> dict[str, Any]:
    source_bundle = _build_import_source_bundle(payload)
    name = source_bundle["name"] or f"URL 导入单品 {datetime.utcnow().strftime('%H%M%S')}"
    item = wardrobe_service.create_item(
        db,
        ClothingItemCreate(
            name=name,
            category=source_bundle["category"],
            slot=source_bundle["slot"],
            color=source_bundle["color"],
            brand=source_bundle["platform"],
            image_url=source_bundle["image_url"],
            processed_image_url=None,
            tags=["source-image", "URL导入", source_bundle["platform"]],
            occasions=[],
            style_notes=source_bundle["description"],
        ),
        user,
    )
    source_meta = {
        "platform": source_bundle["platform"],
        "status": source_bundle["status"],
        "source_url": source_bundle["source_url"],
        "title": source_bundle.get("title") or name,
        "description": source_bundle["description"],
    }
    _remember_source_meta(user, item.id, source_meta)
    return {
        "status": "created",
        "message": f"{source_bundle['platform']} 链接已自动提取主图和文案，并放进你的衣橱等待确认。",
        "item": _map_wardrobe_item(item, source_meta),
    }


def _create_item_from_decomposition_piece(
    db: Session,
    user: User,
    preview: dict[str, Any],
    piece: dict[str, Any],
    *,
    note_prefix: str = "",
) -> ClothingItem:
    attributes = piece.get("attributes") or {}
    tags = _unique([*(piece.get("tags") or []), "智能衣物", "新增"])
    style_summary = " / ".join(
        value
        for value in [
            str(attributes.get("style") or "").strip(),
            str(attributes.get("material") or "").strip(),
            str(attributes.get("season") or "").strip(),
        ]
        if value
    )
    style_note = " · ".join(
        value
        for value in [
            note_prefix.strip(),
            str(preview.get("description") or "").strip(),
            style_summary.strip(),
            str(piece.get("summary") or "").strip(),
        ]
        if value
    )
    item = wardrobe_service.create_item(
        db,
        ClothingItemCreate(
            name=str(piece.get("name") or "智能解构单品"),
            category=str(piece.get("category") or "tops"),
            slot=str(piece.get("slot") or "top"),
            color=str(attributes.get("color") or piece.get("color") or "米白色"),
            brand=str(preview.get("platform") or "智能解构"),
            image_url=piece.get("preview_image_url") or piece.get("source_image_url"),
            processed_image_url=piece.get("processed_image_url"),
            tags=tags,
            occasions=_unique(piece.get("occasions") or []),
            style_notes=style_note or "由智能衣物页自动解构入库。",
        ),
        user,
    )
    source_meta = {
        "platform": preview.get("platform") or "智能解构",
        "status": "已解构",
        "source_url": preview.get("source_url"),
        "title": preview.get("title") or item.name,
        "description": preview.get("description") or style_note,
        "preview_id": preview.get("id"),
        "piece_id": piece.get("id"),
        "piece_slot": piece.get("slot_label"),
        "piece_summary": piece.get("summary"),
    }
    _remember_source_meta(user, item.id, source_meta)
    _update_smart_item_state(
        user,
        item.id,
        status="done" if item.processed_image_url else "raw",
        provider=str(piece.get("provider") or preview.get("strategy", {}).get("provider_used") or "智能解构"),
        confirmed=True,
        priority=True,
    )
    return item


def _persist_decomposition_preview(
    db: Session,
    user: User,
    preview: dict[str, Any],
    *,
    piece_ids: list[str] | None = None,
    note_prefix: str = "",
) -> list[ClothingItem]:
    selected_ids = set(piece_ids or [])
    pieces = preview.get("pieces") or []
    selected_pieces = [piece for piece in pieces if not selected_ids or str(piece.get("id")) in selected_ids]
    if not selected_pieces:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请至少选择 1 件单品后再确认入库。")
    items = [
        _create_item_from_decomposition_piece(db, user, preview, piece, note_prefix=note_prefix)
        for piece in selected_pieces
    ]
    _track_recent_smart_items(user, [item.id for item in items])
    return items


def preview_smart_decomposition_from_url(
    db: Session,
    user: User,
    payload: ExperienceImportUrlPayload,
) -> dict[str, Any]:
    _, user_state = _load_user_state(user)
    config = _normalize_smart_services(user_state["smart"].get("services"))
    bundle = _build_source_bundle(payload)
    preview = fashion_decomposition_service.generate_decomposition_preview(
        bundle,
        user_id=user.id,
        config=config,
        preview_id=f"smart-{user.id or 0}-{int(_now().timestamp())}",
    )
    _remember_smart_preview(user, preview)
    return {"status": "preview", "preview": preview}


def confirm_smart_decomposition_preview(
    db: Session,
    user: User,
    preview_id: str,
    payload: ExperienceDecomposeConfirmPayload,
) -> dict[str, Any]:
    preview = _require_smart_preview(user, preview_id)
    items = _persist_decomposition_preview(db, user, preview, piece_ids=payload.piece_ids)
    return {
        "status": "saved",
        "message": f"已将 {len(items)} 件解构单品收入衣橱，可直接去试穿。",
        "items": [_map_wardrobe_item(item) for item in items],
        "focus_item_ids": [item.id for item in items],
        "try_on_url": "/try-on",
    }


def delete_wardrobe_item_from_experience(db: Session, user: User, item_id: int) -> dict[str, Any]:
    deleted_id = wardrobe_service.delete_item(db, item_id, user)
    return {"status": "deleted", "id": deleted_id}


def run_wardrobe_bulk_action(db: Session, user: User, payload: ExperienceWardrobeBulkPayload) -> dict[str, Any]:
    items = [wardrobe_service.get_item(db, item_id, user.id) for item_id in payload.item_ids]
    if payload.action == "delete":
        deleted = []
        for item in items:
            deleted.append(wardrobe_service.delete_item(db, item.id, user))
        return {"status": "deleted", "count": len(deleted), "message": f"已删除 {len(deleted)} 件单品。"}

    updated = []
    for item in items:
        patch = ClothingItemUpdate()
        if payload.action == "edit-tags":
            patch.tags = _unique([*(item.tags or []), *payload.tags])
        if payload.action == "move-category":
            patch.category = payload.category or item.category
            patch.slot = payload.slot or item.slot
        if payload.color:
            patch.color = payload.color
        if payload.note:
            patch.style_notes = f"{(item.style_notes or '').strip()} {payload.note}".strip()
        updated.append(wardrobe_service.update_item(db, item.id, patch, user))

    return {"status": "updated", "count": len(updated), "message": f"已完成 {payload.action}，共更新 {len(updated)} 件。"}


def _smart_pipeline_summary(status: str, config: dict[str, Any]) -> str:
    if status == "done":
        return f"已通过 {config['person_detector']}、{config['face_selector']} 与 {config['garment_segmenter']} 输出白底图，并进入标签补全。"
    if status == "fallback":
        return "远端链路未命中，当前回退到本地白底预览；如需多人图里只抓用户身上服饰，请接入远端用户服饰抠图 Worker。"
    if status == "running":
        return f"正在用 {config['person_detector']} 定位人像，并准备锁定当前用户。"
    if status == "waiting":
        return "已进入用户服饰抠图队列，等待执行人像识别与服饰分割。"
    return "等待上传穿搭照或原图，随后会进入“识别人像 -> 锁定用户 -> 抠出服饰 -> 白底图输出”的流程。"


def _smart_item_pipeline(item: ClothingItem, item_status: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    status = item_status["status"]
    if status == "done":
        stages = [
            {"label": "人像定位", "status": "done", "detail": config["person_detector"]},
            {"label": "用户锁定", "status": "done", "detail": config["face_selector"]},
            {"label": "服饰分割", "status": "done", "detail": config["garment_segmenter"]},
            {"label": "白底图输出", "status": "done", "detail": config["primary_service"]},
            {"label": "标签补全", "status": "done" if item.occasions or item.style_notes else "waiting", "detail": config["label_model"]},
            {"label": "本地 fallback", "status": "standby", "detail": config["fallback_strategy"]},
        ]
    elif status == "fallback":
        stages = [
            {"label": "人像定位", "status": "fallback", "detail": "远端链路未返回"},
            {"label": "用户锁定", "status": "fallback", "detail": "未完成用户锁定"},
            {"label": "服饰分割", "status": "fallback", "detail": "改走本地预览"},
            {"label": "白底图输出", "status": "done", "detail": "本地白底预览"},
            {"label": "标签补全", "status": "done" if item.occasions or item.style_notes else "waiting", "detail": config["label_model"]},
            {"label": "本地 fallback", "status": "done", "detail": config["fallback_strategy"]},
        ]
    elif status == "running":
        stages = [
            {"label": "人像定位", "status": "done", "detail": config["person_detector"]},
            {"label": "用户锁定", "status": "running", "detail": config["face_selector"]},
            {"label": "服饰分割", "status": "waiting", "detail": config["garment_segmenter"]},
            {"label": "白底图输出", "status": "waiting", "detail": config["primary_service"]},
            {"label": "标签补全", "status": "waiting", "detail": config["label_model"]},
            {"label": "本地 fallback", "status": "standby", "detail": config["fallback_strategy"]},
        ]
    else:
        stages = [
            {"label": "人像定位", "status": "waiting", "detail": config["person_detector"]},
            {"label": "用户锁定", "status": "waiting", "detail": config["face_selector"]},
            {"label": "服饰分割", "status": "waiting", "detail": config["garment_segmenter"]},
            {"label": "白底图输出", "status": "waiting", "detail": config["primary_service"]},
            {"label": "标签补全", "status": "waiting", "detail": config["label_model"]},
            {"label": "本地 fallback", "status": "standby", "detail": config["fallback_strategy"]},
        ]

    return {
        "summary": _smart_pipeline_summary(status, config),
        "stages": stages,
    }


def _smart_pipeline_overview(queue: dict[str, int], config: dict[str, Any]) -> list[dict[str, str]]:
    running = queue["running"] > 0
    completed = queue["completed"] > 0
    waiting = queue["waiting"] > 0
    failed = queue["failed"] > 0
    return [
        {"label": "人像定位", "status": "run" if running else "done" if completed else "wait", "count": config["person_detector"] if completed or running else "等待"},
        {"label": "用户锁定", "status": "run" if running else "done" if completed else "wait", "count": config["face_selector"] if completed or running else "等待"},
        {"label": "服饰分割", "status": "run" if running else "done" if completed else "wait", "count": config["garment_segmenter"] if completed or running else "队列中" if waiting else "等待"},
        {"label": "白底图输出", "status": "done" if completed else "run" if running else "wait", "count": config["primary_service"] if completed or running else "等待"},
        {"label": "标签补全", "status": "done" if completed else "wait", "count": config["label_model"] if completed else "队列中" if waiting else "等待"},
        {"label": "本地 fallback", "status": "err" if failed else "done", "count": config["fallback_strategy"] if not failed else "已触发"},
    ]


def _smart_services_panel(config: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {"name": "用户识别链路", "status": "on", "badge": f"{config['person_detector']} + {config['face_selector']}"},
        {"name": "服饰分割", "status": "pri", "badge": config["garment_segmenter"]},
        {"name": "白底图输出", "status": "on", "badge": config["primary_service"]},
        {"name": "标签补全", "status": "local" if "规则" in config["label_model"] else "on", "badge": config["label_model"]},
        {"name": "本地 fallback", "status": "local", "badge": config["fallback_strategy"]},
    ]


def _smart_action_models(config: dict[str, Any]) -> dict[str, dict[str, str]]:
    return {
        "background": {
            "label": "批量识别人像服饰",
            "model": f"{config['person_detector']} + {config['face_selector']} + {config['garment_segmenter']}",
        },
        "enrich": {
            "label": "批量补全标签",
            "model": config["label_model"],
        },
    }


def _smart_services_panel(config: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {"name": "用户识别链路", "status": "on", "badge": f"{config['person_detector']} + {config['face_selector']}"},
        {"name": "服饰分割", "status": "pri", "badge": config["garment_segmenter"]},
        {"name": "白底图输出", "status": "on", "badge": config["primary_service"]},
        {"name": "标签识别链", "status": "on", "badge": _recognition_chain_badge(config)},
        {"name": "本地 fallback", "status": "local", "badge": config["fallback_strategy"]},
    ]


def _smart_action_models(config: dict[str, Any]) -> dict[str, dict[str, str]]:
    return {
        "background": {
            "label": "批量识别人像服饰",
            "model": f"{config['person_detector']} + {config['face_selector']} + {config['garment_segmenter']}",
        },
        "enrich": {
            "label": "批量补全标签",
            "model": _recognition_chain_badge(config),
        },
    }


def _smart_result_state(item: ClothingItem, config: dict[str, Any], *, prefer_local: bool = False) -> tuple[str, str]:
    if prefer_local or "cleanup-fallback" in (item.tags or []) or "cleanup-placeholder" in (item.tags or []):
        return "fallback", "本地白底预览"
    if item.processed_image_url or "processed" in (item.tags or []):
        return "done", config["primary_service"]
    return "raw", "待上传原图"


def _process_smart_item_background(
    db: Session,
    user: User,
    item: ClothingItem,
    config: dict[str, Any],
    *,
    prefer_local: bool = False,
    priority: bool | None = None,
) -> ClothingItem:
    if item.image_url:
        item = wardrobe_service.process_item_image(db, item.id, user, prefer_local=prefer_local)
        status, provider = _smart_result_state(item, config, prefer_local=prefer_local)
        _update_smart_item_state(
            user,
            item.id,
            status=status,
            provider=provider,
            priority=priority if priority is not None else False,
        )
        return item

    _update_smart_item_state(user, item.id, status="raw", provider="待上传原图", priority=priority if priority is not None else False)
    return item


def get_smart_wardrobe_overview(db: Session, user: User, *, query: str | None = None, status: str | None = None) -> dict[str, Any]:
    _, user_state = _load_user_state(user)
    config = _normalize_smart_services(user_state["smart"].get("services"))
    items = _all_user_items(db, user)
    if query:
        items = _apply_item_filters(items, query=query)

    processing_cards = []
    enriched_cards = []
    pending_items = []
    status_counter = Counter()

    for item in items:
        item_status = _get_item_status(item, user_state)
        if status and status != "all" and item_status["status"] != status:
            continue
        status_counter[item_status["status"]] += 1
        payload = {
            "id": item.id,
            "name": item.name,
            "visual_theme": _visual_theme(item),
            "silhouette": _silhouette(item),
            "badge": item_status,
            "tags": _unique(item.tags)[:3],
            "occasions": _unique(item.occasions)[:3],
            "note": item.style_notes or "",
            "provider": item_status["provider"],
            "confirmed": item_status["confirmed"],
            "priority": item_status["priority"],
            "pipeline": _smart_item_pipeline(item, item_status, config),
        }
        processing_cards.append(payload)
        if item.occasions or item.style_notes:
            enriched_cards.append(payload)
        if item_status["status"] in {"raw", "waiting", "running"}:
            pending_items.append(payload)

    queue = {
        "progress": min(100, 35 + (status_counter["done"] + status_counter["fallback"]) * 5),
        "running": status_counter["running"],
        "waiting": status_counter["waiting"] + status_counter["raw"],
        "completed": status_counter["done"] + status_counter["fallback"],
        "failed": status_counter["error"],
    }
    return {
        "mode": "preview" if user.email == DEMO_USER_EMAIL else "account",
        "stats": {
            "total": len(items),
            "processed": status_counter["done"] + status_counter["fallback"],
            "running": status_counter["running"],
            "waiting": status_counter["waiting"] + status_counter["raw"],
            "failed": status_counter["error"],
        },
        "queue": queue,
        "pipeline_stages": _smart_pipeline_overview(queue, config),
        "services": _smart_services_panel(config),
        "action_models": _smart_action_models(config),
        "config": config,
        "recent_item_ids": [int(item_id) for item_id in user_state["smart"].get("recent_item_ids", [])[:12]],
        "processing_items": processing_cards[:6],
        "enriched_items": enriched_cards[:6],
        "pending_items": pending_items[:6],
    }


def save_smart_config(user: User, payload: ExperienceSmartConfigPayload) -> dict[str, Any]:
    state, user_state = _load_user_state(user)
    normalized = _normalize_smart_services(payload.model_dump())
    user_state["smart"]["services"] = normalized
    _save_state(state)
    return {"status": "saved", "message": "AI 服务配置已保存。", "config": normalized}


def _update_smart_item_state(user: User, item_id: int, **patch: Any) -> None:
    state, user_state = _load_user_state(user)
    item_state = user_state["smart"]["item_status"].setdefault(str(item_id), {})
    item_state.update(patch)
    user_state["smart"]["last_run_at"] = _now().isoformat()
    _save_state(state)


def run_smart_action(db: Session, user: User, action: str) -> dict[str, Any]:
    items = _all_user_items(db, user)
    _, user_state = _load_user_state(user)
    config = _normalize_smart_services(user_state["smart"].get("services"))

    if action in {"run-all", "run-background"}:
        for item in items:
            item = _process_smart_item_background(db, user, item, config)
            if action == "run-all":
                assistant_service.auto_enrich_item(db, item, user, config)
                current_status, provider = _smart_result_state(item, config)
                _update_smart_item_state(user, item.id, confirmed=True, status=current_status, provider=provider)

    if action in {"run-all", "run-enrich"}:
        for item in items:
            assistant_service.auto_enrich_item(db, item, user, config)
            current_status, provider = _smart_result_state(item, config)
            if not item.image_url and current_status == "raw" and (item.occasions or item.style_notes):
                provider = "标签补全已完成"
            _update_smart_item_state(user, item.id, status=current_status, confirmed=(action == "run-all"), provider=provider)

    return {
        "status": "queued",
        "message": {
            "run-all": "已启动全量识别、白底图与标签补全流程。",
            "run-background": "批量用户服饰抠图任务已提交。",
            "run-enrich": "批量标签补全任务已提交。",
        }[action],
    }


def _smart_category_defaults(default_category: str) -> tuple[str, str]:
    mapping = {
        "上衣": ("tops", "top"),
        "下装": ("bottoms", "bottom"),
        "连衣裙": ("dresses", "top"),
        "外套": ("outerwear", "outerwear"),
        "鞋子": ("shoes", "shoes"),
        "配饰": ("accessories", "accessory"),
    }
    return mapping.get(default_category, ("tops", "top"))


def upload_smart_batch(db: Session, user: User, payload: ExperienceUploadBatchPayload) -> dict[str, Any]:
    created = []
    category, slot = _smart_category_defaults(payload.default_category)
    for filename in payload.filenames:
        clean_name = Path(filename).stem or f"上传单品 {len(created) + 1}"
        item = wardrobe_service.create_item(
            db,
            ClothingItemCreate(
                name=clean_name,
                category=category,
                slot=slot,
                color="米白",
                brand="Batch Upload",
                image_url=None,
                processed_image_url=None,
                tags=["批量上传"],
                occasions=[],
                style_notes=f"{payload.mode} · 等待后续处理",
            ),
            user,
        )
        _update_smart_item_state(user, item.id, status="raw", confirmed=False, priority=False)
        created.append(item)
    state, user_state = _load_user_state(user)
    user_state["smart"]["last_upload_mode"] = {**payload.model_dump(), "count": len(created), "uploaded_at": _now().isoformat()}
    _save_state(state)
    return {"status": "queued", "message": f"已加入 {len(created)} 件单品到智能处理队列。"}


def upload_smart_batch_files(
    db: Session,
    user: User,
    *,
    mode: str,
    default_category: str,
    files: list[UploadFile],
) -> dict[str, Any]:
    created = []
    previews = []
    category, slot = _smart_category_defaults(default_category)
    auto_decompose = "解构" in mode or "抠图" in mode or "识别" in mode
    _, user_state = _load_user_state(user)
    config = _normalize_smart_services(user_state["smart"].get("services"))

    for index, upload in enumerate(files):
        filename = (upload.filename or "").strip() or f"smart-upload-{index + 1}.png"
        if auto_decompose:
            asset = storage_service.save_upload("wardrobe/decomposition-source", upload, user_id=user.id)
            preview = fashion_decomposition_service.generate_decomposition_preview(
                {
                    "primary_image_url": asset.url,
                    "image_candidates": [{"url": asset.url, "label": filename, "score": 100}],
                    "title": Path(filename).stem or f"上传单品 {index + 1}",
                    "description": f"{mode} · 由智能衣物页本地上传。",
                    "platform": "本地上传",
                    "status": "未确认",
                    "source_url": asset.url,
                    "category": category,
                    "slot": slot,
                    "color": "米白色",
                    "name": Path(filename).stem or f"上传单品 {index + 1}",
                },
                user_id=user.id,
                config=config,
                preview_id=f"upload-{user.id or 0}-{index + 1}-{int(_now().timestamp())}",
            )
            _remember_smart_preview(user, preview)
            pieces = _persist_decomposition_preview(
                db,
                user,
                preview,
                note_prefix=f"{mode} · 由智能衣物页本地上传。",
            )
            previews.append(
                {
                    **preview,
                    "saved_item_ids": [item.id for item in pieces],
                }
            )
            created.extend(_map_wardrobe_item(item) for item in pieces)
            continue

        item = wardrobe_service.create_item(
            db,
            ClothingItemCreate(
                name=Path(filename).stem or f"上传单品 {index + 1}",
                category=category,
                slot=slot,
                color="米白",
                brand="Batch Upload",
                image_url=None,
                processed_image_url=None,
                tags=["批量上传", "source-image"],
                occasions=[],
                style_notes=f"{mode} · 由体验页批量上传。",
            ),
            user,
        )
        item = wardrobe_service.attach_item_image(db, item.id, upload, user)
        _update_smart_item_state(user, item.id, status="waiting", provider="等待进入处理队列", confirmed=False, priority=False)
        created.append(_map_wardrobe_item(item))

    state, user_state = _load_user_state(user)
    user_state["smart"]["last_upload_mode"] = {
        "mode": mode,
        "default_category": default_category,
        "filenames": [entry["name"] for entry in created],
        "count": len(created),
        "uploaded_at": _now().isoformat(),
    }
    _save_state(state)
    action_message = (
        f"已完成 {len(created)} 件解构单品的入库。"
        if auto_decompose
        else f"已上传 {len(created)} 张图片并写入智能处理队列。"
    )
    return {
        "status": "queued",
        "message": action_message,
        "items": created,
        "previews": previews,
        "focus_item_ids": [int(item["id"]) for item in created] if auto_decompose else [],
        "try_on_url": "/try-on" if auto_decompose and created else None,
    }


def retry_smart_item(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    _, user_state = _load_user_state(user)
    config = _normalize_smart_services(user_state["smart"].get("services"))
    item = _process_smart_item_background(db, user, item, config)
    assistant_service.auto_enrich_item(db, item, user, config)
    status_value, provider = _smart_result_state(item, config)
    _update_smart_item_state(user, item.id, status=status_value, provider=provider, confirmed=False, priority=False)
    return {"status": "completed", "message": f"{item.name} 已重新处理完成。"}


def fallback_smart_item(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    _, user_state = _load_user_state(user)
    config = _normalize_smart_services(user_state["smart"].get("services"))
    item = wardrobe_service.process_item_image(db, item.id, user, prefer_local=True)
    assistant_service.auto_enrich_item(db, item, user, config)
    _update_smart_item_state(user, item.id, status="fallback", provider="本地白底预览", confirmed=False, priority=False)
    return {"status": "completed", "message": f"{item.name} 已切换到本地 fallback 处理。"}


def confirm_smart_enrich(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    _update_smart_item_state(user, item.id, confirmed=True, status="done")
    return {"status": "saved", "message": f"{item.name} 的 AI 补全信息已确认保存。"}


def update_smart_enrich(db: Session, user: User, item_id: int, payload: ExperienceSmartEditPayload) -> dict[str, Any]:
    item = wardrobe_service.update_item(
        db,
        item_id,
        ClothingItemUpdate(
            name=payload.name,
            color=payload.color,
            tags=_unique(payload.tags) if payload.tags else None,
            occasions=_unique(payload.occasions) if payload.occasions else None,
            style_notes=payload.style_notes,
        ),
        user,
    )
    _update_smart_item_state(user, item.id, confirmed=True, status="done")
    return {"status": "updated", "message": f"{item.name} 的识别信息已更新。"}


def reanalyze_smart_item(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    _, user_state = _load_user_state(user)
    config = _normalize_smart_services(user_state["smart"].get("services"))
    assistant_service.auto_enrich_item(db, item, user, config)
    provider = "本地白底预览" if "cleanup-fallback" in (item.tags or []) else _get_item_status(item, _load_user_state(user)[1])["provider"]
    _update_smart_item_state(user, item.id, status="done" if item.processed_image_url else "raw", confirmed=False, provider=provider)
    return {"status": "completed", "message": f"{item.name} 已重新发起 AI 分析。"}


def prioritize_pending_item(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    _, user_state = _load_user_state(user)
    config = _normalize_smart_services(user_state["smart"].get("services"))
    if item.image_url:
        item = _process_smart_item_background(db, user, item, config, priority=True)
        assistant_service.auto_enrich_item(db, item, user, config)
        return {"status": "completed", "message": f"{item.name} 已优先完成用户服饰识别。"}

    _update_smart_item_state(user, item_id, priority=True, status="running")
    return {"status": "queued", "message": "该单品已提升到优先队列。"}


def _month_logs(logs: list[WearLog], year: int, month: int) -> list[WearLog]:
    return [log for log in logs if log.worn_on.year == year and log.worn_on.month == month]


def _calendar_days(year: int, month: int) -> int:
    if month == 12:
        next_month = datetime(year + 1, 1, 1)
    else:
        next_month = datetime(year, month + 1, 1)
    return (next_month - datetime(year, month, 1)).days


def _map_diary_detail(log: WearLog, items_by_id: dict[int, ClothingItem]) -> dict[str, Any]:
    day_items = [items_by_id[item_id] for item_id in log.item_ids if item_id in items_by_id]
    item_occasions = [occasion for item in day_items for occasion in (item.occasions or [])]
    item_tags = [tag for item in day_items for tag in (item.tags or [])]
    tags = _unique([log.occasion or "", *item_occasions, *item_tags])[:4]
    return {
        "date_label": f"{log.worn_on.month}月{log.worn_on.day}日",
        "outfit_name": log.outfit_name or "今日穿搭",
        "occasion": log.occasion or "日常",
        "item_ids": [item.id for item in day_items],
        "items": [
            {
                "emoji": _emoji(item),
                "color": COLOR_HEX.get(item.color, "#e8ddd0"),
                "name": item.name,
                "detail": f"{item.brand or '文文的衣橱'} · {_slot_label(item)} · {item.color}",
            }
            for item in day_items
        ],
        "tags": [tag for tag in tags if tag],
        "note": log.feedback_note or "这一天没有写下太多备注，但这套穿搭被好好记住了。",
    }


def get_outfit_diary_overview(db: Session, user: User, *, year: int = DEFAULT_YEAR, month: int = DEFAULT_MONTH) -> dict[str, Any]:
    logs = list(db.scalars(select(WearLog).where(WearLog.user_id == user.id).order_by(desc(WearLog.worn_on))).all())
    items = _all_user_items(db, user)
    items_by_id = {item.id: item for item in items}
    month_logs = _month_logs(logs, year, month)
    wear_counts = Counter(item_id for log in month_logs for item_id in log.item_ids)
    favorite_items = sum(1 for _, count in wear_counts.items() if count >= 2)
    new_items = sum(1 for item in items if item.created_at >= datetime(year, month, 1) - timedelta(days=30))
    details = {str(log.worn_on.day): _map_diary_detail(log, items_by_id) for log in month_logs}
    _, user_state = _load_user_state(user)
    diary_state = user_state["diary"]
    suitcase_history = diary_state.get("suitcase_history", [])
    latest_suitcase = suitcase_history[-1] if suitcase_history else {}

    return {
        "stats": {
            "monthly_records": len(month_logs),
            "wear_rate": min(100, round((len(month_logs) / max(1, _calendar_days(year, month))) * 100)),
            "favorite_items": favorite_items,
            "new_items": new_items,
        },
        "calendar": {
            "year": year,
            "month": month,
            "days_in_month": _calendar_days(year, month),
            "logged_days": sorted({log.worn_on.day for log in month_logs}),
            "details": details,
        },
        "suitcase_defaults": {
            "destination": latest_suitcase.get("destination", "东京"),
            "days_label": latest_suitcase.get("days_label", "5天4晚"),
            "scene": latest_suitcase.get("scene", "城市探索"),
        },
    }


def create_or_update_diary_log(db: Session, user: User, payload: ExperienceDiaryLogPayload) -> dict[str, Any]:
    worn_on = datetime(payload.year, payload.month, payload.day, 9, 30)
    existing = db.scalar(select(WearLog).where(WearLog.user_id == user.id, WearLog.worn_on == worn_on))
    fallback_item_ids = [item.id for item in _all_user_items(db, user)[:3]]
    resolved_item_ids = payload.item_ids or fallback_item_ids
    if existing is None:
        log = assistant_service.create_wear_log(
            db,
            user,
            WearLogPayload(
                outfit_name=payload.outfit_name or "今日穿搭",
                item_ids=resolved_item_ids,
                occasion=payload.occasion or "日常",
                period="all-day",
                location_label="文文的衣橱",
                feedback_note=payload.note or "已从穿搭日志记录。",
                worn_on=worn_on,
            ),
        )
    else:
        existing.outfit_name = payload.outfit_name or existing.outfit_name or "今日穿搭"
        existing.item_ids = resolved_item_ids or existing.item_ids
        existing.occasion = payload.occasion or existing.occasion
        existing.feedback_note = payload.note or existing.feedback_note
        db.commit()
        db.refresh(existing)
        log = existing
    return {"status": "saved", "message": f"{payload.month}月{payload.day}日的穿搭已记录。", "log_id": log.id}


def generate_suitcase_plan(db: Session, user: User, payload: ExperienceSuitcasePayload) -> dict[str, Any]:
    days = _extract_days(payload.days_label)
    packing = assistant_service.generate_packing_plan(
        db,
        user,
        PackingRequest(city=payload.destination, days=days, trip_kind=payload.scene, include_commute=False),
    )
    items = _all_user_items(db, user)
    items_by_id = {item.id: item for item in items}
    packed_items = []
    for suggestion in packing.suggestions:
        item = items_by_id.get(suggestion.item_id)
        if item is None:
            continue
        packed_items.append(
            {
                "emoji": _emoji(item),
                "name": item.name,
                "qty": "×2" if _slot_for_item(item) in {"top", "bottom"} and days >= 5 else "×1",
            }
        )

    if not packed_items:
        fallback_items = items[: min(6, len(items))]
        packed_items = [
            {
                "emoji": _emoji(item),
                "name": item.name,
                "qty": "×2" if _slot_for_item(item) in {"top", "bottom"} and days >= 5 else "×1",
            }
            for item in fallback_items
        ]

    day_plans = []
    base_names = [entry["emoji"] + " " + entry["name"] for entry in packed_items]
    for index in range(days):
        rotation = base_names[index % len(base_names) :] + base_names[: index % len(base_names)] if base_names else []
        day_plans.append({"title": f"Day {index + 1} · {payload.destination}", "items": rotation[:3]})

    state, user_state = _load_user_state(user)
    user_state["diary"]["suitcase_history"].append(
        {
            "destination": payload.destination,
            "days_label": payload.days_label,
            "scene": payload.scene,
            "created_at": _now().isoformat(),
        }
    )
    _save_state(state)

    return {
        "status": "generated",
        "message": f"已生成 {payload.destination} 的 {payload.days_label} 行李箱方案。",
        "result": {
            "packed_items": packed_items[:9],
            "day_plans": day_plans,
            "summary": packing.capsule_summary,
        },
    }


def _heatmap_levels(logs: list[WearLog], year: int, month: int) -> list[int]:
    daily_counts = Counter(log.worn_on.day for log in _month_logs(logs, year, month))
    days = _calendar_days(year, month)
    return [min(5, daily_counts.get(day, 0)) for day in range(1, min(days, 28) + 1)]


def _repeat_candidates(logs: list[WearLog], items_by_id: dict[int, ClothingItem]) -> list[dict[str, Any]]:
    counts = Counter(item_id for log in logs for item_id in log.item_ids)
    results = []
    for item_id, count in counts.most_common(5):
        item = items_by_id.get(item_id)
        if item is None:
            continue
        results.append({"id": item.id, "emoji": _emoji(item), "name": item.name, "detail": f"{item.brand or '文文的衣橱'} · 本月已穿 {count} 次", "count": count})
    return results


def _season_snapshot(items: list[ClothingItem], season: str | None) -> dict[str, Any]:
    config_map = {
        "spring": {
            "label": "春",
            "transition": "冬 → 春",
            "summary": "适合把厚重保暖层收进后排，让轻薄针织、衬衫和柔和色系重新回到前台。",
            "store_tags": {"winter"},
            "bring_out_tags": {"spring"},
            "store_fallback_categories": {"outerwear", "shoes"},
            "bring_out_fallback_categories": {"tops", "dresses"},
        },
        "summer": {
            "label": "夏",
            "transition": "春 → 夏",
            "summary": "天气更热了，透气面料和低负担搭配应该成为主角，厚外套可以集中收纳。",
            "store_tags": {"autumn", "winter"},
            "bring_out_tags": {"spring", "summer"},
            "store_fallback_categories": {"outerwear", "shoes"},
            "bring_out_fallback_categories": {"tops", "dresses", "accessories"},
        },
        "autumn": {
            "label": "秋",
            "transition": "夏 → 秋",
            "summary": "可以把盛夏单品慢慢退到后排，让有层次感的外套、长袖和深一点的色系重新上架。",
            "store_tags": {"summer"},
            "bring_out_tags": {"autumn"},
            "store_fallback_categories": {"dresses", "accessories"},
            "bring_out_fallback_categories": {"outerwear", "tops", "shoes"},
        },
        "winter": {
            "label": "冬",
            "transition": "秋 → 冬",
            "summary": "进入更需要保暖和层次的阶段，建议把轻薄单品收起，并给外套和冬季鞋履留出主位置。",
            "store_tags": {"spring", "summer"},
            "bring_out_tags": {"autumn", "winter"},
            "store_fallback_categories": {"dresses", "tops"},
            "bring_out_fallback_categories": {"outerwear", "shoes", "accessories"},
        },
    }
    key = season if season in config_map else "spring"
    config = config_map[key]
    store = [item.name for item in items if item.memory_card and any(tag in config["store_tags"] for tag in item.memory_card.season_tags)][:3]
    bring_out = [item.name for item in items if item.memory_card and any(tag in config["bring_out_tags"] for tag in item.memory_card.season_tags)][:4]
    if not store:
        store = [item.name for item in items if item.category in config["store_fallback_categories"]][:3]
    if not bring_out:
        bring_out = [item.name for item in items if item.category in config["bring_out_fallback_categories"]][:4]
    return {
        "active": key,
        "label": config["label"],
        "transition": config["transition"],
        "summary": config["summary"],
        "store": store,
        "bring_out": bring_out,
    }


def _idle_action_copy(action: str | None) -> dict[str, str | None]:
    mapping = {
        "style": {
            "label": "已加入搭配激活清单",
            "detail": "下次推荐会优先尝试把这件闲置单品重新组合进日常穿搭。",
        },
        "resell": {
            "label": "已加入二手转售清单",
            "detail": "建议补拍细节图并整理尺码、成色和购入信息，方便后续挂售。",
        },
        "donate": {
            "label": "已加入捐赠整理清单",
            "detail": "建议下次整理衣橱时一并完成清洗、打包和去向记录。",
        },
    }
    return mapping.get(action or "", {"label": None, "detail": None})


def get_closet_analysis_overview(db: Session, user: User, *, season: str | None = None) -> dict[str, Any]:
    items = _all_user_items(db, user)
    logs = list(db.scalars(select(WearLog).where(WearLog.user_id == user.id).order_by(desc(WearLog.worn_on))).all())
    reminders = assistant_service.build_reminders(db, user)
    gaps = assistant_service.build_gap_overview(db, user)
    items_by_id = {item.id: item for item in items}
    counts = Counter(item.category for item in items)
    gap_score = round(sum(min(1, counts.get(category, 0) / target) for category, target in WARDROBE_TARGETS.items()) / len(WARDROBE_TARGETS) * 100)

    _, user_state = _load_user_state(user)
    analysis_state = user_state["analysis"]
    care_done_ids = set(analysis_state["care_completed"])
    care_reminder_ids = {int(item_id) for item_id in analysis_state.get("care_reminders", {}).keys()}
    idle_actions = analysis_state.get("idle_actions", {})
    last_worn = {item_id: None for item_id in items_by_id}
    for log in logs:
        for item_id in log.item_ids:
            if last_worn.get(item_id) is None:
                last_worn[item_id] = log.worn_on

    idle_items = []
    wear_counter = Counter(item_id for log in logs for item_id in log.item_ids)
    for item in items:
        last = last_worn.get(item.id)
        idle_days = (datetime(DEFAULT_YEAR, DEFAULT_MONTH, 30) - (last or item.created_at)).days
        if idle_days >= 90:
            action_copy = _idle_action_copy(idle_actions.get(str(item.id), {}).get("action"))
            idle_items.append(
                {
                    "id": item.id,
                    "emoji": _emoji(item),
                    "name": item.name,
                    "detail": f"购入价 ¥{_price_for_item(item)} · 总穿 {wear_counter.get(item.id, 0)} 次",
                    "idle_days": idle_days,
                    "selected_action": idle_actions.get(str(item.id), {}).get("action"),
                    "selected_action_label": action_copy["label"],
                    "selected_action_detail": action_copy["detail"],
                }
            )
    idle_items.sort(key=lambda entry: entry["idle_days"], reverse=True)

    icon_map = {"tops": "👔", "bottoms": "👖", "outerwear": "🧥", "shoes": "👟", "accessories": "👜", "dresses": "👗"}
    color_map = {"tops": "var(--accent)", "bottoms": "var(--info)", "outerwear": "var(--warn)", "shoes": "var(--success)", "accessories": "var(--idle)", "dresses": "var(--accent)"}
    category_gaps = [
        {"icon": icon_map[category], "name": _category_label(category), "count": counts.get(category, 0), "max": target, "pct": round(min(100, counts.get(category, 0) / target * 100)), "color": color_map[category]}
        for category, target in WARDROBE_TARGETS.items()
    ]

    care_cards = []
    for item in items:
        if item.memory_card is None:
            continue
        if item.memory_card.care_status != "fresh" and item.id not in care_done_ids:
            care_cards.append(
                {
                    "id": item.id,
                    "emoji": _emoji(item),
                    "name": item.name,
                    "detail": item.memory_card.care_note or "建议安排一次洗护或保养。",
                    "tone": "urgent" if "laundry" in item.memory_card.care_status or "clean" in item.memory_card.care_status else "normal",
                    "reminder_set": item.id in care_reminder_ids,
                }
            )

    return {
        "gap_score": gap_score,
        "category_gaps": category_gaps,
        "gap_suggestions": [insight.description for insight in gaps.insights],
        "heatmap": _heatmap_levels(logs, DEFAULT_YEAR, DEFAULT_MONTH),
        "repeat_items": _repeat_candidates(logs, items_by_id)[:3],
        "low_use_items": list(reversed(_repeat_candidates(logs, items_by_id)[-2:])),
        "care": {
            "urgent": [entry for entry in care_cards if entry["tone"] == "urgent"][:3],
            "normal": [entry for entry in care_cards if entry["tone"] == "normal"][:3],
            "done": [{"id": item.id, "emoji": _emoji(item), "name": item.name, "detail": "已完成洗护或保养。"} for item in items if item.id in care_done_ids][:3],
        },
        "season": _season_snapshot(items, season),
        "idle_items": idle_items[:4],
        "idle_value": sum(_price_for_item(items_by_id[entry["id"]]) for entry in idle_items[:4]),
        "reminders": reminders.model_dump(),
    }


def mark_care_done(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    if item.memory_card:
        item.memory_card.care_status = "fresh"
        item.memory_card.care_note = "已在体验页中标记为完成洗护。"
    db.commit()
    state, user_state = _load_user_state(user)
    completed = user_state["analysis"].setdefault("care_completed", [])
    user_state["analysis"].setdefault("care_reminders", {}).pop(str(item_id), None)
    if item_id not in completed:
        completed.append(item_id)
    _save_state(state)
    return {"status": "completed", "message": f"{item.name} 已标记为完成洗护。"}


def set_care_reminder(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    state, user_state = _load_user_state(user)
    reminders = user_state["analysis"].setdefault("care_reminders", {})
    reminders[str(item_id)] = {"scheduled_at": _now().isoformat()}
    _save_state(state)
    return {"status": "scheduled", "message": f"{item.name} 已加入保养提醒清单。"}


def record_idle_action(db: Session, user: User, item_id: int, payload: ExperienceIdleActionPayload) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    state, user_state = _load_user_state(user)
    user_state["analysis"].setdefault("idle_actions", {})[str(item_id)] = {"action": payload.action, "updated_at": _now().isoformat()}
    _save_state(state)
    action_copy = _idle_action_copy(payload.action)
    return {
        "status": "recorded",
        "message": f"已记录 {item.name} 的闲置动作：{payload.action}。",
        "action": payload.action,
        "action_label": action_copy["label"],
        "action_detail": action_copy["detail"],
    }


def get_style_profile_overview(db: Session, user: User) -> dict[str, Any]:
    items = _all_user_items(db, user)
    logs = list(db.scalars(select(WearLog).where(WearLog.user_id == user.id)).all())
    profile = assistant_service.get_style_profile(db, user)
    dna_labels = _unique(profile.style_keywords) or ["简约经典", "都市通勤", "文艺雅痞"]
    dna_colors = ["#C08B5C", "#8BA0B5", "#9B8EA0", "#A0B090", "#B0A090"]
    dna_values = [35, 25, 20, 12, 8]
    dna = []
    for index, value in enumerate(dna_values):
        fallback_label = ["户外休闲", "正式商务"]
        label = dna_labels[index] if index < len(dna_labels) else fallback_label[index - len(dna_labels)] if index - len(dna_labels) < len(fallback_label) else f"风格 {index + 1}"
        dna.append({"label": label, "value": value, "color": dna_colors[index]})

    silhouettes = [
        {"name": "H型", "desc": "直筒·利落", "preferred": True, "badge": "常穿"},
        {"name": "V型", "desc": "宽肩·收腰", "preferred": True, "badge": "偏好"},
        {"name": "X型", "desc": "收腰·曲线", "preferred": False, "badge": ""},
        {"name": "宽松廓形", "desc": "Oversize", "preferred": True, "badge": "周末"},
        {"name": "修身", "desc": "贴合身形", "preferred": False, "badge": ""},
        {"name": "A型", "desc": "上紧下宽", "preferred": False, "badge": ""},
    ]

    favorite_colors = [{"name": color, "hex": COLOR_HEX.get(color, "#d4c8bf")} for color in (profile.favorite_colors or ["驼色", "深蓝", "米白", "鼠尾草绿"])]
    avoid_colors = [{"name": color, "hex": COLOR_HEX.get(color, "#ff6b6b")} for color in (profile.avoid_colors or ["正红", "亮粉", "亮黄", "荧光橙"])]
    keywords = [{"label": keyword, "tone": "primary" if index < 2 else "secondary" if index < 6 else "tertiary"} for index, keyword in enumerate(_unique(profile.style_keywords + profile.comfort_priorities + ["高级基本款", "Quiet Luxury", "海洋风", "针织"]))][:12]
    rules = profile.wardrobe_rules or [
        "一进一出原则：每购入一件新品，必须淘汰一件旧品。",
        "新品冷静期：加入购物车后等待 72 小时再决定是否购买。",
        "基础款占比 60%，亮点款 30%，实验款 10%。",
    ]

    return {
        "hero_subtitle": f"基于 {len(items)} 件单品 & {len(logs)} 次穿搭记录生成",
        "dna": dna,
        "favorite_colors": favorite_colors[:8],
        "avoid_colors": avoid_colors[:6],
        "silhouettes": silhouettes,
        "keywords": keywords,
        "rules": rules[:5],
        "personal_note": profile.personal_note or "最近想在保持大地色稳定感的前提下，慢慢试一点更轻的春夏变化。",
        "updated_at_label": (profile.updated_at or _now()).strftime("%Y年%m月%d日 %H:%M"),
        "profile": {
            "favorite_colors": profile.favorite_colors,
            "avoid_colors": profile.avoid_colors,
            "favorite_silhouettes": profile.favorite_silhouettes,
            "avoid_silhouettes": profile.avoid_silhouettes,
            "style_keywords": profile.style_keywords,
            "dislike_keywords": profile.dislike_keywords,
            "commute_profile": profile.commute_profile,
            "comfort_priorities": profile.comfort_priorities,
            "wardrobe_rules": profile.wardrobe_rules,
            "personal_note": profile.personal_note,
        },
    }


def patch_style_profile(db: Session, user: User, payload: ExperienceStyleProfilePatch) -> dict[str, Any]:
    profile = assistant_service.get_style_profile(db, user)
    merged = StyleProfilePayload(
        favorite_colors=payload.favorite_colors if payload.favorite_colors is not None else list(profile.favorite_colors or []),
        avoid_colors=payload.avoid_colors if payload.avoid_colors is not None else list(profile.avoid_colors or []),
        favorite_silhouettes=payload.favorite_silhouettes if payload.favorite_silhouettes is not None else list(profile.favorite_silhouettes or []),
        avoid_silhouettes=payload.avoid_silhouettes if payload.avoid_silhouettes is not None else list(profile.avoid_silhouettes or []),
        style_keywords=payload.style_keywords if payload.style_keywords is not None else list(profile.style_keywords or []),
        dislike_keywords=payload.dislike_keywords if payload.dislike_keywords is not None else list(profile.dislike_keywords or []),
        commute_profile=payload.commute_profile if payload.commute_profile is not None else profile.commute_profile,
        comfort_priorities=payload.comfort_priorities if payload.comfort_priorities is not None else list(profile.comfort_priorities or []),
        wardrobe_rules=payload.wardrobe_rules if payload.wardrobe_rules is not None else list(profile.wardrobe_rules or []),
        personal_note=payload.personal_note if payload.personal_note is not None else profile.personal_note,
    )
    updated = assistant_service.update_style_profile(db, user, merged)
    return {"status": "updated", "message": "风格画像已保存。", "updated_at": updated.updated_at.isoformat() if updated.updated_at else None}


STYLE_AXIS_RULES = {
    "cute": {
        "keywords": ["甜", "粉", "奶", "裙", "蕾丝", "柔", "可爱", "少女", "蝴蝶结"],
        "colors": {"玫粉", "粉色", "柔粉", "奶白", "薰衣草紫", "薄荷绿"},
        "categories": {"dresses", "bottoms"},
        "occasions": {"约会", "下午茶", "拍照", "花园", "咖啡店"},
    },
    "mature": {
        "keywords": ["优雅", "知性", "质感", "大衣", "风衣", "衬衫", "针织", "经典"],
        "colors": {"驼色", "奶白", "米白", "深蓝", "裸粉"},
        "categories": {"tops", "outerwear", "accessories"},
        "occasions": {"商务", "通勤", "会议", "展览"},
    },
    "edgy": {
        "keywords": ["牛仔", "街头", "酷", "廓形", "层次", "机能", "运动", "city", "皮"],
        "colors": {"深蓝", "黑色", "深灰", "紫调"},
        "categories": {"outerwear", "bottoms", "shoes"},
        "occasions": {"周末", "旅行", "city", "夜晚"},
    },
    "commute": {
        "keywords": ["通勤", "商务", "利落", "衬衫", "西装", "简约", "直筒"],
        "colors": {"米白", "深蓝", "驼色", "天蓝", "奶白"},
        "categories": {"tops", "bottoms", "outerwear", "accessories"},
        "occasions": {"通勤", "商务", "会议", "办公室"},
    },
    "sexy": {
        "keywords": ["吊带", "收腰", "曲线", "性感", "贴身", "修身", "约会", "高光"],
        "colors": {"玫粉", "红色", "黑色", "裸粉"},
        "categories": {"dresses", "tops"},
        "occasions": {"约会", "晚餐", "派对", "拍照"},
    },
    "casual": {
        "keywords": ["松弛", "周末", "舒适", "针织", "休闲", "帆布鞋", "旅行", "基础"],
        "colors": {"白色", "草绿", "奶白", "天蓝", "米白"},
        "categories": {"tops", "shoes", "bottoms", "accessories"},
        "occasions": {"周末", "旅行", "日常", "城市探索"},
    },
}

STYLE_AXIS_PROFILE_HINTS = {
    "cute": ["甜美", "可爱", "少女", "柔和", "轻盈"],
    "mature": ["优雅", "知性", "质感", "经典"],
    "edgy": ["街头", "潮酷", "层次", "态度"],
    "commute": ["通勤", "商务", "利落", "办公室"],
    "sexy": ["性感", "曲线", "氛围", "收腰"],
    "casual": ["慵懒", "松弛", "舒适", "不费力"],
}

SILHOUETTE_INFERENCE_RULES = [
    ("宽松廓形", ["oversize", "宽松", "廓形", "大衣", "风衣", "针织", "毛衣"]),
    ("X型", ["收腰", "吊带", "腰线", "裹身", "曲线"]),
    ("A型", ["a字", "a型", "百褶", "半裙", "伞裙", "裙"]),
    ("V型", ["v领", "西装", "blazer", "翻领", "垫肩"]),
    ("修身", ["修身", "紧身", "贴身"]),
    ("H型", ["直筒", "衬衫", "牛仔裤", "西裤", "straight"]),
]


def _preview_image_url(item: ClothingItem) -> str | None:
    return item.processed_image_url or item.image_url or None


def _item_preview_payload(
    item: ClothingItem,
    *,
    detail: str | None = None,
    wear_count: int | None = None,
) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
        "emoji": _emoji(item),
        "color": COLOR_HEX.get(item.color, "#e8ddd0"),
        "color_hex": COLOR_HEX.get(item.color, "#e8ddd0"),
        "detail": detail or f"{item.brand or '文文的衣橱'} · {_slot_label(item)} · {item.color}",
        "thumbnail_url": _preview_image_url(item),
        "image_url": item.image_url,
        "processed_image_url": item.processed_image_url,
        "tags": _unique(item.tags)[:4],
        "occasions": _unique(item.occasions)[:4],
        "wear_count": wear_count or 0,
        "slot_label": _slot_label(item),
        "category_label": _category_label(item.category),
    }


def _rotate_entries(entries: list[dict[str, Any]], start: int, size: int) -> list[dict[str, Any]]:
    if not entries:
        return []
    offset = start % len(entries)
    return (entries[offset:] + entries[:offset])[:size]


def _normalize_percentage_map(scores: dict[str, float], ordered_keys: list[str]) -> dict[str, int]:
    cleaned = {key: max(0.0, float(scores.get(key, 0.0))) for key in ordered_keys}
    total = sum(cleaned.values())
    if total <= 0:
        base = 100 // max(1, len(ordered_keys))
        remainder = 100 - base * len(ordered_keys)
        return {key: base + (1 if index < remainder else 0) for index, key in enumerate(ordered_keys)}

    raw = {key: (cleaned[key] / total) * 100 for key in ordered_keys}
    values = {key: int(raw[key]) for key in ordered_keys}
    remainder = 100 - sum(values.values())
    fractional = sorted(ordered_keys, key=lambda key: raw[key] - values[key], reverse=True)
    for index in range(remainder):
        values[fractional[index % len(fractional)]] += 1
    return values


def _style_text(item: ClothingItem) -> str:
    return " ".join(
        [
            item.name,
            item.category,
            item.slot,
            item.color,
            item.brand or "",
            " ".join(item.tags or []),
            " ".join(item.occasions or []),
            item.style_notes or "",
        ]
    ).lower()


def _infer_item_silhouette(item: ClothingItem) -> str:
    text = _style_text(item)
    for silhouette_name, keywords in SILHOUETTE_INFERENCE_RULES:
        if any(keyword in text for keyword in keywords):
            return silhouette_name
    if item.category == "dresses":
        return "X型"
    if item.category == "outerwear":
        return "宽松廓形"
    if item.category == "bottoms":
        return "H型"
    if item.category == "tops":
        return "V型"
    return "宽松廓形"


def _top_color_names(items: list[ClothingItem], wear_counter: Counter[int], limit: int = 4) -> list[str]:
    color_scores: Counter[str] = Counter()
    for item in items:
        color_scores[item.color] += 1 + max(0, int(wear_counter.get(item.id, 0)))
    return [color for color, _ in color_scores.most_common(limit)]


def _map_diary_detail(log: WearLog, items_by_id: dict[int, ClothingItem]) -> dict[str, Any]:
    day_items = [items_by_id[item_id] for item_id in log.item_ids if item_id in items_by_id]
    item_occasions = [occasion for item in day_items for occasion in (item.occasions or [])]
    item_tags = [tag for item in day_items for tag in (item.tags or [])]
    tags = _unique([log.occasion or "", *item_occasions, *item_tags])[:4]
    return {
        "date_label": f"{log.worn_on.month}月{log.worn_on.day}日",
        "outfit_name": log.outfit_name or "今日穿搭",
        "occasion": log.occasion or "日常",
        "item_ids": [item.id for item in day_items],
        "items": [
            _item_preview_payload(
                item,
                detail=f"{item.brand or '文文的衣橱'} · {_slot_label(item)} · {item.color}",
            )
            for item in day_items
        ],
        "tags": [tag for tag in tags if tag],
        "note": log.feedback_note or "这一天没有写下太多备注，但这套穿搭被好好记住了。",
    }


def generate_suitcase_plan(db: Session, user: User, payload: ExperienceSuitcasePayload) -> dict[str, Any]:
    days = _extract_days(payload.days_label)
    packing = assistant_service.generate_packing_plan(
        db,
        user,
        PackingRequest(city=payload.destination, days=days, trip_kind=payload.scene, include_commute=False),
    )
    items = _all_user_items(db, user)
    items_by_id = {item.id: item for item in items}

    packed_items: list[dict[str, Any]] = []
    for suggestion in packing.suggestions:
        item = items_by_id.get(suggestion.item_id)
        if item is None:
            continue
        packed_items.append(
            {
                **_item_preview_payload(
                    item,
                    detail=f"{item.brand or '文文的衣橱'} · {_slot_label(item)} · {item.color}",
                ),
                "qty": "×2" if _slot_for_item(item) in {"top", "bottom"} and days >= 5 else "×1",
                "reason": suggestion.reason,
            }
        )

    if not packed_items:
        fallback_items = items[: min(6, len(items))]
        packed_items = [
            {
                **_item_preview_payload(
                    item,
                    detail=f"{item.brand or '文文的衣橱'} · {_slot_label(item)} · {item.color}",
                ),
                "qty": "×2" if _slot_for_item(item) in {"top", "bottom"} and days >= 5 else "×1",
                "reason": "作为当前衣橱里最适合旅途复用的基础单品。",
            }
            for item in fallback_items
        ]

    day_plans = []
    for index in range(days):
        plan_items = _rotate_entries(packed_items, index, min(4, len(packed_items)))
        day_plans.append(
            {
                "title": f"Day {index + 1} · {payload.destination}",
                "items": plan_items,
                "note": f"围绕 {payload.scene} 场景安排一套主 look，再留一件机动层应对温差。",
            }
        )

    state, user_state = _load_user_state(user)
    user_state["diary"]["suitcase_history"].append(
        {
            "destination": payload.destination,
            "days_label": payload.days_label,
            "scene": payload.scene,
            "created_at": _now().isoformat(),
        }
    )
    _save_state(state)

    return {
        "status": "generated",
        "message": f"已生成 {payload.destination} 的 {payload.days_label} 行李箱方案。",
        "result": {
            "packed_items": packed_items[:9],
            "day_plans": day_plans,
            "summary": packing.capsule_summary,
        },
    }


def _heatmap_cells(
    logs: list[WearLog],
    items_by_id: dict[int, ClothingItem],
    year: int,
    month: int,
) -> list[dict[str, Any]]:
    wear_counter = Counter(item_id for log in _month_logs(logs, year, month) for item_id in log.item_ids if item_id in items_by_id)
    ranked = [(items_by_id[item_id], count) for item_id, count in wear_counter.most_common(28)]
    max_count = ranked[0][1] if ranked else 1
    cells: list[dict[str, Any]] = []
    for item, count in ranked:
        level = max(1, min(5, round((count / max_count) * 5)))
        cells.append(
            {
                **_item_preview_payload(item, detail=f"本月穿了 {count} 次", wear_count=count),
                "count": count,
                "level": level,
                "title": f"{item.name} · 本月 {count} 次",
            }
        )
    while len(cells) < 28:
        cells.append({"empty": True, "count": 0, "level": 0})
    return cells


def get_closet_analysis_overview(db: Session, user: User, *, season: str | None = None) -> dict[str, Any]:
    items = _all_user_items(db, user)
    logs = list(db.scalars(select(WearLog).where(WearLog.user_id == user.id).order_by(desc(WearLog.worn_on))).all())
    reminders = assistant_service.build_reminders(db, user)
    gaps = assistant_service.build_gap_overview(db, user)
    items_by_id = {item.id: item for item in items}
    counts = Counter(item.category for item in items)
    gap_score = round(sum(min(1, counts.get(category, 0) / target) for category, target in WARDROBE_TARGETS.items()) / len(WARDROBE_TARGETS) * 100)

    _, user_state = _load_user_state(user)
    analysis_state = user_state["analysis"]
    care_done_ids = set(analysis_state["care_completed"])
    care_reminder_ids = {int(item_id) for item_id in analysis_state.get("care_reminders", {}).keys()}
    idle_actions = analysis_state.get("idle_actions", {})
    last_worn = {item_id: None for item_id in items_by_id}
    for log in logs:
        for item_id in log.item_ids:
            if last_worn.get(item_id) is None:
                last_worn[item_id] = log.worn_on

    wear_counter = Counter(item_id for log in logs for item_id in log.item_ids)
    month_wear_counter = Counter(item_id for log in _month_logs(logs, DEFAULT_YEAR, DEFAULT_MONTH) for item_id in log.item_ids)

    idle_items = []
    for item in items:
        last = last_worn.get(item.id)
        idle_days = (datetime(DEFAULT_YEAR, DEFAULT_MONTH, 30) - (last or item.created_at)).days
        if idle_days >= 90:
            action_copy = _idle_action_copy(idle_actions.get(str(item.id), {}).get("action"))
            idle_items.append(
                {
                    **_item_preview_payload(
                        item,
                        detail=f"购入价 ¥{_price_for_item(item)} · 总穿 {wear_counter.get(item.id, 0)} 次",
                        wear_count=wear_counter.get(item.id, 0),
                    ),
                    "idle_days": idle_days,
                    "selected_action": idle_actions.get(str(item.id), {}).get("action"),
                    "selected_action_label": action_copy["label"],
                    "selected_action_detail": action_copy["detail"],
                }
            )
    idle_items.sort(key=lambda entry: entry["idle_days"], reverse=True)

    icon_map = {"tops": "👔", "bottoms": "👖", "outerwear": "🧥", "shoes": "👟", "accessories": "👜", "dresses": "👗"}
    color_map = {"tops": "var(--accent)", "bottoms": "var(--info)", "outerwear": "var(--warn)", "shoes": "var(--success)", "accessories": "var(--idle)", "dresses": "var(--accent)"}
    category_gaps = [
        {"icon": icon_map[category], "name": _category_label(category), "count": counts.get(category, 0), "max": target, "pct": round(min(100, counts.get(category, 0) / target * 100)), "color": color_map[category]}
        for category, target in WARDROBE_TARGETS.items()
    ]

    care_cards = []
    for item in items:
        if item.memory_card is None:
            continue
        if item.memory_card.care_status != "fresh" and item.id not in care_done_ids:
            care_cards.append(
                {
                    **_item_preview_payload(item, detail=item.memory_card.care_note or "建议安排一次洗护或保养。"),
                    "tone": "urgent" if "laundry" in item.memory_card.care_status or "clean" in item.memory_card.care_status else "normal",
                    "reminder_set": item.id in care_reminder_ids,
                }
            )

    high_repeat = []
    for item_id, count in month_wear_counter.most_common():
        item = items_by_id.get(item_id)
        if item is None:
            continue
        high_repeat.append(
            {
                **_item_preview_payload(item, detail=f"{item.brand or '文文的衣橱'} · 本月已穿 {count} 次", wear_count=count),
                "count": count,
            }
        )
    low_use = []
    for item in items:
        count = month_wear_counter.get(item.id, 0)
        if count <= 1:
            low_use.append(
                {
                    **_item_preview_payload(item, detail=f"{item.brand or '文文的衣橱'} · 本月仅穿 {count} 次", wear_count=count),
                    "count": count,
                }
            )
    low_use.sort(key=lambda entry: (entry["count"], entry["name"]))

    return {
        "gap_score": gap_score,
        "category_gaps": category_gaps,
        "gap_suggestions": [insight.description for insight in gaps.insights],
        "heatmap": _heatmap_cells(logs, items_by_id, DEFAULT_YEAR, DEFAULT_MONTH),
        "repeat_items": high_repeat[:3],
        "low_use_items": low_use[:3],
        "care": {
            "urgent": [entry for entry in care_cards if entry["tone"] == "urgent"][:3],
            "normal": [entry for entry in care_cards if entry["tone"] == "normal"][:3],
            "done": [
                {
                    **_item_preview_payload(item, detail="已完成洗护或保养。"),
                }
                for item in items
                if item.id in care_done_ids
            ][:3],
        },
        "season": _season_snapshot(items, season),
        "idle_items": idle_items[:4],
        "idle_value": sum(_price_for_item(items_by_id[entry["id"]]) for entry in idle_items[:4]),
        "reminders": reminders.model_dump(),
    }


def get_style_profile_overview(db: Session, user: User) -> dict[str, Any]:
    items = _all_user_items(db, user)
    logs = list(db.scalars(select(WearLog).where(WearLog.user_id == user.id)).all())
    profile = assistant_service.get_style_profile(db, user)
    wear_counter = Counter(item_id for log in logs for item_id in log.item_ids)
    ordered_axes = [entry["key"] for entry in STYLE_DNA_SEGMENTS]
    axis_scores = {key: 0.0 for key in ordered_axes}

    for item in items:
        text = _style_text(item)
        weight = 1 + min(4, wear_counter.get(item.id, 0))
        occasions = set(item.occasions or [])
        for axis_key, rules in STYLE_AXIS_RULES.items():
            score = 0.0
            if item.category in rules["categories"]:
                score += 1.4
            if item.color in rules["colors"]:
                score += 1.2
            if any(keyword in text for keyword in rules["keywords"]):
                score += 1.8
            if occasions & rules["occasions"]:
                score += 1.4
            axis_scores[axis_key] += score * weight

    profile_text = " ".join(
        [
            " ".join(profile.style_keywords or []),
            " ".join(profile.favorite_colors or []),
            " ".join(profile.favorite_silhouettes or []),
            " ".join(profile.comfort_priorities or []),
            profile.commute_profile or "",
            profile.personal_note or "",
        ]
    ).lower()
    for axis_key, hints in STYLE_AXIS_PROFILE_HINTS.items():
        if any(hint.lower() in profile_text for hint in hints):
            axis_scores[axis_key] += 4.0

    axis_values = _normalize_percentage_map(axis_scores, ordered_axes)
    dna = [
        {
            "label": entry["label"],
            "value": axis_values[entry["key"]],
            "color": entry["color"],
        }
        for entry in STYLE_DNA_SEGMENTS
    ]

    top_colors = _top_color_names(items, wear_counter, limit=4)
    favorite_color_names = _unique([*top_colors, *(profile.favorite_colors or [])])[:5]
    avoid_color_seed = [color for color in (profile.avoid_colors or []) if color not in favorite_color_names]
    if not avoid_color_seed:
        low_rank_colors = [item.color for item in items if item.color not in favorite_color_names]
        avoid_color_seed = _unique(low_rank_colors)[:4]

    favorite_colors = [{"name": color, "hex": COLOR_HEX.get(color, "#d4c8bf")} for color in favorite_color_names]
    avoid_colors = [{"name": color, "hex": COLOR_HEX.get(color, "#ff6b6b")} for color in avoid_color_seed[:4]]

    silhouette_examples: dict[str, list[str]] = {entry["name"]: [] for entry in SILHOUETTE_PRESETS}
    silhouette_stats: dict[str, dict[str, int]] = {
        entry["name"]: {"item_count": 0, "wear_count": 0}
        for entry in SILHOUETTE_PRESETS
    }
    for item in items:
        silhouette_name = _infer_item_silhouette(item)
        stats = silhouette_stats.setdefault(silhouette_name, {"item_count": 0, "wear_count": 0})
        stats["item_count"] += 1
        stats["wear_count"] += wear_counter.get(item.id, 0)
        if len(silhouette_examples.setdefault(silhouette_name, [])) < 2:
            silhouette_examples[silhouette_name].append(item.name)

    ordered_silhouettes = sorted(
        SILHOUETTE_PRESETS,
        key=lambda entry: silhouette_stats.get(entry["name"], {}).get("wear_count", 0),
        reverse=True,
    )
    preferred_names = {entry["name"] for entry in ordered_silhouettes[:3] if silhouette_stats.get(entry["name"], {}).get("item_count", 0) > 0}
    preferred_names.update(profile.favorite_silhouettes or [])
    avoided_names = set(profile.avoid_silhouettes or [])

    total_silhouette_wear = max(1, sum(stat["wear_count"] for stat in silhouette_stats.values()))
    silhouettes = []
    for entry in SILHOUETTE_PRESETS:
        stats = silhouette_stats.get(entry["name"], {"item_count": 0, "wear_count": 0})
        share = round(stats["wear_count"] / total_silhouette_wear * 100) if stats["wear_count"] else 0
        if entry["name"] in preferred_names and stats["wear_count"] > 0:
            badge = "常穿"
        elif entry["name"] in avoided_names:
            badge = "少穿"
        elif stats["item_count"] == 0:
            badge = "待补"
        else:
            badge = f"{share}%"
        silhouettes.append(
            {
                "name": entry["name"],
                "desc": entry["desc"],
                "preferred": entry["name"] in preferred_names and entry["name"] not in avoided_names,
                "badge": badge,
                "item_count": stats["item_count"],
                "wear_count": stats["wear_count"],
                "examples": silhouette_examples.get(entry["name"], [])[:2],
            }
        )

    sorted_dna = sorted(dna, key=lambda entry: entry["value"], reverse=True)
    keyword_pool = [
        *(profile.style_keywords or []),
        *(profile.comfort_priorities or []),
        *(entry["label"] for entry in sorted_dna[:3]),
        *(profile.favorite_colors or []),
    ]
    keywords = [
        {
            "label": keyword,
            "tone": "primary" if index < 2 else "secondary" if index < 6 else "tertiary",
        }
        for index, keyword in enumerate(_unique(keyword_pool))
    ][:12]

    rules = list(profile.wardrobe_rules or [])
    if not rules:
        top_axis_labels = "、".join(entry["label"] for entry in sorted_dna[:2])
        rules = [
            f"当前衣橱更偏向 {top_axis_labels}，新增单品时优先保证这两类风格继续稳定出现。",
            "先保留 2-3 套可直接复用的高频组合，再增加少量有记忆点的变化款。",
            "本月高频单品建议优先安排轮换洗护，避免风格稳定但画面感疲劳。",
        ]

    personal_note = profile.personal_note or (
        f"最近最像你的风格组合，是 {sorted_dna[0]['label']} + {sorted_dna[1]['label']}。"
        f" 高频颜色集中在 {'、'.join(favorite_color_names[:3]) or '柔和中性色'}。"
    )

    return {
        "hero_subtitle": f"基于 {len(items)} 件单品、{len(logs)} 次穿搭记录与已识别标签生成",
        "dna": dna,
        "favorite_colors": favorite_colors[:8],
        "avoid_colors": avoid_colors[:6],
        "silhouettes": silhouettes,
        "keywords": keywords,
        "rules": rules[:5],
        "personal_note": personal_note,
        "updated_at_label": (profile.updated_at or _now()).strftime("%Y年%m月%d日 %H:%M"),
        "profile": {
            "favorite_colors": profile.favorite_colors,
            "avoid_colors": profile.avoid_colors,
            "favorite_silhouettes": profile.favorite_silhouettes,
            "avoid_silhouettes": profile.avoid_silhouettes,
            "style_keywords": profile.style_keywords,
            "dislike_keywords": profile.dislike_keywords,
            "commute_profile": profile.commute_profile,
            "comfort_priorities": profile.comfort_priorities,
            "wardrobe_rules": profile.wardrobe_rules,
            "personal_note": profile.personal_note,
        },
    }
