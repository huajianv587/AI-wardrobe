from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
import json
import re
from pathlib import Path
from typing import Any
from fastapi import UploadFile

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.assistant import RecommendationSignal, WearLog
from app.models.outfit import Outfit
from app.models.user import User
from app.models.wardrobe import ClothingItem
from app.schemas.assistant import PackingRequest, StyleProfilePayload, WearLogPayload
from app.schemas.experience import (
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
from services import assistant_service, wardrobe_service

DEMO_USER_EMAIL = "guest@wenwen-wardrobe.local"
DEMO_USER_NAME = "文文的衣橱 · 公开体验"
DEFAULT_YEAR = 2026
DEFAULT_MONTH = 4

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


def _now() -> datetime:
    return datetime.utcnow()


def _state_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "experience_state.json"


def _default_state() -> dict[str, Any]:
    return {
        "smart": {
            "services": {
                "primary_service": "Remove.bg API",
                "remove_bg_key": "",
                "fallback_strategy": "自动切换本地 rembg",
                "label_model": "GPT-4o Vision",
                "concurrency": 3,
            },
            "item_status": {},
            "last_run_at": None,
            "last_upload_mode": None,
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
    for key, value in loaded.items():
        if isinstance(value, dict) and isinstance(state.get(key), dict):
            state[key].update(value)
        else:
            state[key] = value
    return state


def _save_state(state: dict[str, Any]) -> None:
    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


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


def _get_item_status(item: ClothingItem, state: dict[str, Any]) -> dict[str, Any]:
    item_state = state["smart"]["item_status"].get(str(item.id), {})
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
        or ("本地 rembg" if status == "fallback" else "Remove.bg API" if status != "raw" else "待上传原图"),
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


def _map_wardrobe_item(item: ClothingItem) -> dict[str, Any]:
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
        "items": [_map_wardrobe_item(item) for item in filtered_items],
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


def get_smart_wardrobe_overview(db: Session, user: User, *, query: str | None = None, status: str | None = None) -> dict[str, Any]:
    state = _load_state()
    items = _all_user_items(db, user)
    if query:
        items = _apply_item_filters(items, query=query)

    processing_cards = []
    enriched_cards = []
    pending_items = []
    status_counter = Counter()

    for item in items:
        item_status = _get_item_status(item, state)
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
        }
        processing_cards.append(payload)
        if item.occasions or item.style_notes:
            enriched_cards.append(payload)
        if item_status["status"] in {"raw", "waiting", "running"}:
            pending_items.append(payload)

    config = state["smart"]["services"]
    return {
        "mode": "preview" if user.email == DEMO_USER_EMAIL else "account",
        "stats": {
            "total": len(items),
            "processed": status_counter["done"] + status_counter["fallback"],
            "running": status_counter["running"],
            "waiting": status_counter["waiting"] + status_counter["raw"],
            "failed": status_counter["error"],
        },
        "queue": {
            "progress": min(100, 35 + (status_counter["done"] + status_counter["fallback"]) * 5),
            "running": status_counter["running"],
            "waiting": status_counter["waiting"] + status_counter["raw"],
            "completed": status_counter["done"] + status_counter["fallback"],
            "failed": status_counter["error"],
        },
        "services": [
            {"name": "主抠图服务", "status": "on", "badge": config["primary_service"]},
            {"name": "本地 fallback", "status": "local", "badge": config["fallback_strategy"]},
            {"name": "标签补全模型", "status": "pri", "badge": config["label_model"]},
            {"name": "队列并发", "status": "on", "badge": f"{config['concurrency']} workers"},
        ],
        "config": config,
        "processing_items": processing_cards[:6],
        "enriched_items": enriched_cards[:6],
        "pending_items": pending_items[:6],
    }


def save_smart_config(payload: ExperienceSmartConfigPayload) -> dict[str, Any]:
    state = _load_state()
    state["smart"]["services"] = payload.model_dump()
    _save_state(state)
    return {"status": "saved", "message": "AI 服务配置已保存。", "config": payload.model_dump()}


def _update_smart_item_state(item_id: int, **patch: Any) -> None:
    state = _load_state()
    item_state = state["smart"]["item_status"].setdefault(str(item_id), {})
    item_state.update(patch)
    state["smart"]["last_run_at"] = _now().isoformat()
    _save_state(state)


def run_smart_action(db: Session, user: User, action: str) -> dict[str, Any]:
    items = _all_user_items(db, user)
    if action in {"run-all", "run-enrich"}:
        for item in items:
            assistant_service.auto_enrich_item(db, item, user)
            _update_smart_item_state(item.id, status="done", confirmed=(action == "run-all"))
    if action in {"run-all", "run-background"}:
        for item in items[: max(3, len(items) // 3)]:
            _update_smart_item_state(item.id, status="done" if action == "run-all" else "running")
    return {"status": "queued", "message": {"run-all": "已启动全量处理队列。", "run-background": "批量抠图任务已提交。", "run-enrich": "标签自动补全任务已提交。"}[action]}


def upload_smart_batch(db: Session, user: User, payload: ExperienceUploadBatchPayload) -> dict[str, Any]:
    created = []
    for filename in payload.filenames:
        clean_name = Path(filename).stem or f"上传单品 {len(created) + 1}"
        created.append(
            wardrobe_service.create_item(
                db,
                ClothingItemCreate(
                    name=clean_name,
                    category={"上衣": "tops", "下装": "bottoms", "连衣裙": "dresses", "外套": "outerwear", "鞋子": "shoes", "配饰": "accessories"}.get(payload.default_category, "tops"),
                    slot={"上衣": "top", "下装": "bottom", "连衣裙": "top", "外套": "outerwear", "鞋子": "shoes", "配饰": "accessory"}.get(payload.default_category, "top"),
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
        )
    state = _load_state()
    state["smart"]["last_upload_mode"] = payload.model_dump()
    _save_state(state)
    return {"status": "queued", "message": f"已加入 {len(created)} 件单品到智能处理队列。"}


def retry_smart_item(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    assistant_service.auto_enrich_item(db, item, user)
    _update_smart_item_state(item.id, status="done", provider="Remove.bg API")
    return {"status": "completed", "message": f"{item.name} 已重新处理完成。"}


def fallback_smart_item(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    patch_tags = _unique([*(item.tags or []), "cleanup-fallback", "processed"])
    wardrobe_service.update_item(db, item.id, ClothingItemUpdate(tags=patch_tags), user)
    _update_smart_item_state(item.id, status="fallback", provider="本地 rembg")
    return {"status": "completed", "message": f"{item.name} 已切换到本地 fallback 处理。"}


def confirm_smart_enrich(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    _update_smart_item_state(item.id, confirmed=True, status="done")
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
    _update_smart_item_state(item.id, confirmed=True, status="done")
    return {"status": "updated", "message": f"{item.name} 的识别信息已更新。"}


def reanalyze_smart_item(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    assistant_service.auto_enrich_item(db, item, user)
    _update_smart_item_state(item.id, status="done", confirmed=False)
    return {"status": "completed", "message": f"{item.name} 已重新发起 AI 分析。"}


def prioritize_pending_item(item_id: int) -> dict[str, Any]:
    _update_smart_item_state(item_id, priority=True, status="running")
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
    diary_state = _load_state().get("diary", {})
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

    state = _load_state()
    state["diary"]["suitcase_history"].append(
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


def get_closet_analysis_overview(db: Session, user: User) -> dict[str, Any]:
    items = _all_user_items(db, user)
    logs = list(db.scalars(select(WearLog).where(WearLog.user_id == user.id).order_by(desc(WearLog.worn_on))).all())
    reminders = assistant_service.build_reminders(db, user)
    gaps = assistant_service.build_gap_overview(db, user)
    items_by_id = {item.id: item for item in items}
    counts = Counter(item.category for item in items)
    gap_score = round(sum(min(1, counts.get(category, 0) / target) for category, target in WARDROBE_TARGETS.items()) / len(WARDROBE_TARGETS) * 100)

    analysis_state = _load_state()["analysis"]
    care_done_ids = set(analysis_state["care_completed"])
    care_reminder_ids = {int(item_id) for item_id in analysis_state.get("care_reminders", {}).keys()}
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
            idle_items.append(
                {
                    "id": item.id,
                    "emoji": _emoji(item),
                    "name": item.name,
                    "detail": f"购入价 ¥{_price_for_item(item)} · 总穿 {wear_counter.get(item.id, 0)} 次",
                    "idle_days": idle_days,
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
        "season": {
            "transition": "春 → 夏",
            "summary": "天气正在变热，厚重层次可以收一部分，轻薄和透气感应该逐步走到前台。",
            "store": [item.name for item in items if item.memory_card and any(tag in {"autumn", "winter"} for tag in item.memory_card.season_tags)][:3],
            "bring_out": [item.name for item in items if item.memory_card and any(tag in {"spring", "summer"} for tag in item.memory_card.season_tags)][:4],
        },
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
    state = _load_state()
    completed = state["analysis"].setdefault("care_completed", [])
    state["analysis"].setdefault("care_reminders", {}).pop(str(item_id), None)
    if item_id not in completed:
        completed.append(item_id)
    _save_state(state)
    return {"status": "completed", "message": f"{item.name} 已标记为完成洗护。"}


def set_care_reminder(db: Session, user: User, item_id: int) -> dict[str, Any]:
    item = wardrobe_service.get_item(db, item_id, user.id)
    state = _load_state()
    reminders = state["analysis"].setdefault("care_reminders", {})
    reminders[str(item_id)] = {"scheduled_at": _now().isoformat()}
    _save_state(state)
    return {"status": "scheduled", "message": f"{item.name} 已加入保养提醒清单。"}


def record_idle_action(item_id: int, payload: ExperienceIdleActionPayload) -> dict[str, Any]:
    state = _load_state()
    state["analysis"].setdefault("idle_actions", {})[str(item_id)] = {"action": payload.action, "updated_at": _now().isoformat()}
    _save_state(state)
    return {"status": "recorded", "message": f"已记录闲置单品动作：{payload.action}。"}


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
