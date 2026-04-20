from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter
from io import BytesIO
from pathlib import Path

from datasets import load_dataset
from PIL import Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "model_training" / "datasets" / "multimodal-reader"
DEFAULT_TRAIN_SIZE = 2400
DEFAULT_EVAL_SIZE = 300
DATASET_NAME = "Marqo/polyvore"
DATASET_SPLIT = "data"
SYSTEM_PROMPT = (
    "You extract wardrobe metadata from a single garment image. "
    "Return strict JSON with keys tags, occasions, style_notes, color_family, "
    "dominant_color, fabric_guess, silhouette, season, mood, and category."
)
USER_PROMPT = "Describe the garment for wardrobe enrichment and return JSON only."

ALLOWED_CATEGORY_RULES = (
    (("trench",), ("outerwear", "trench coat", "风衣")),
    (("blazer",), ("outerwear", "blazer", "西装外套")),
    (("coat",), ("outerwear", "coat", "大衣")),
    (("jacket",), ("outerwear", "jacket", "夹克")),
    (("cardigan",), ("outerwear", "cardigan", "开衫")),
    (("vest",), ("outerwear", "vest", "马甲")),
    (("hoodie", "sweatshirt"), ("top", "hoodie", "卫衣")),
    (("t-shirt", "tee"), ("top", "t-shirt", "T恤")),
    (("shirt",), ("top", "shirt", "衬衫")),
    (("blouse",), ("top", "blouse", "罩衫")),
    (("tank", "camisole", "cami"), ("top", "camisole", "吊带上衣")),
    (("sweater", "knit"), ("top", "knit top", "针织上衣")),
    (("top",), ("top", "top", "上衣")),
    (("skinny jean", "jeans", "jean"), ("bottom", "jeans", "牛仔裤")),
    (("trousers", "trouser", "pants", "pant"), ("bottom", "trousers", "长裤")),
    (("shorts",), ("bottom", "shorts", "短裤")),
    (("skirt",), ("bottom", "skirt", "半裙")),
    (("leggings",), ("bottom", "leggings", "打底裤")),
    (("jumpsuit", "romper"), ("dress", "jumpsuit", "连体裤")),
    (("dress", "gown"), ("dress", "dress", "连衣裙")),
    (("over-the-knee boot", "knee-high boot", "boots", "boot"), ("shoes", "boots", "靴子")),
    (("sneakers", "sneaker"), ("shoes", "sneakers", "运动鞋")),
    (("loafers", "loafer"), ("shoes", "loafers", "乐福鞋")),
    (("heels", "heel", "pumps", "pump"), ("shoes", "heels", "高跟鞋")),
    (("sandals", "sandal"), ("shoes", "sandals", "凉鞋")),
    (("flats", "flat"), ("shoes", "flats", "平底鞋")),
    (("crossbody",), ("bag", "crossbody bag", "斜挎包")),
    (("backpack",), ("bag", "backpack", "双肩包")),
    (("tote",), ("bag", "tote bag", "托特包")),
    (("duffel", "satchel", "handbag"), ("bag", "handbag", "手提包")),
    (("clutch",), ("bag", "clutch", "手拿包")),
    (("bag",), ("bag", "bag", "包袋")),
)

COLOR_RULES = (
    ("off white", ("off-white", "light-neutral", "米白")),
    ("ivory", ("ivory", "light-neutral", "象牙白")),
    ("cream", ("cream", "light-neutral", "奶油色")),
    ("white", ("white", "light-neutral", "白色")),
    ("black", ("black", "dark-neutral", "黑色")),
    ("charcoal", ("charcoal", "dark-neutral", "炭灰")),
    ("grey", ("grey", "dark-neutral", "灰色")),
    ("gray", ("grey", "dark-neutral", "灰色")),
    ("silver", ("silver", "metallic", "银色")),
    ("navy", ("navy", "dark-neutral", "海军蓝")),
    ("indigo", ("indigo", "blue", "靛蓝")),
    ("denim", ("denim blue", "blue", "丹宁蓝")),
    ("blue", ("blue", "blue", "蓝色")),
    ("camel", ("camel", "earth", "驼色")),
    ("khaki", ("khaki", "earth", "卡其")),
    ("beige", ("beige", "light-neutral", "米色")),
    ("tan", ("tan", "earth", "浅棕")),
    ("taupe", ("taupe", "earth", "灰褐")),
    ("brown", ("brown", "earth", "棕色")),
    ("cognac", ("cognac", "earth", "干邑棕")),
    ("green", ("green", "color", "绿色")),
    ("olive", ("olive", "earth", "橄榄绿")),
    ("sage", ("sage", "color", "鼠尾草绿")),
    ("mint", ("mint", "color", "薄荷绿")),
    ("pink", ("pink", "color", "粉色")),
    ("blush", ("blush", "color", "裸粉")),
    ("rose", ("rose", "color", "玫瑰粉")),
    ("red", ("red", "color", "红色")),
    ("burgundy", ("burgundy", "color", "酒红")),
    ("wine", ("burgundy", "color", "酒红")),
    ("yellow", ("yellow", "color", "黄色")),
    ("mustard", ("mustard", "color", "姜黄")),
    ("orange", ("orange", "color", "橙色")),
    ("purple", ("purple", "color", "紫色")),
    ("lilac", ("lilac", "color", "丁香紫")),
    ("lavender", ("lavender", "color", "薰衣草紫")),
    ("gold", ("gold", "metallic", "金色")),
    ("metallic", ("metallic", "metallic", "金属色")),
)

FABRIC_RULES = (
    ("cashmere", ("cashmere", "羊绒")),
    ("wool", ("wool", "羊毛")),
    ("tweed", ("tweed", "粗花呢")),
    ("boucle", ("boucle", "圈圈呢")),
    ("knit", ("knit", "针织")),
    ("cotton", ("cotton", "棉质")),
    ("denim", ("denim", "丹宁")),
    ("linen", ("linen", "亚麻")),
    ("silk", ("silk", "丝质")),
    ("satin", ("satin", "缎面")),
    ("chiffon", ("chiffon", "雪纺")),
    ("velvet", ("velvet", "丝绒")),
    ("suede", ("suede", "麂皮")),
    ("leather", ("leather", "皮革")),
    ("canvas", ("canvas", "帆布")),
    ("jersey", ("jersey", "针织平纹")),
    ("fleece", ("fleece", "抓绒")),
    ("nylon", ("nylon", "尼龙")),
    ("polyester", ("polyester", "聚酯")),
)

SILHOUETTE_RULES = (
    ("over-the-knee", ("over-the-knee", "过膝")),
    ("knee-high", ("knee-high", "及膝")),
    ("wide leg", ("wide-leg", "阔腿")),
    ("straight", ("straight", "直筒")),
    ("skinny", ("skinny", "紧身")),
    ("slim", ("slim", "修身")),
    ("oversized", ("oversized", "宽松")),
    ("oversize", ("oversized", "宽松")),
    ("cropped", ("cropped", "短款")),
    ("midi", ("midi", "中长款")),
    ("mini", ("mini", "短款")),
    ("maxi", ("maxi", "长款")),
    ("pleated", ("pleated", "百褶")),
    ("fit and flare", ("fit-and-flare", "收腰摆开")),
    ("a-line", ("a-line", "A字")),
    ("structured", ("structured", "利落结构")),
    ("pointed toe", ("pointed-toe", "尖头")),
)

STYLE_KEYWORDS = {
    "tailored": {"tailored", "blazer", "trouser", "coat", "structured", "pumps", "loafer"},
    "relaxed": {"hoodie", "sweatshirt", "sneaker", "tote", "easy", "soft"},
    "minimal": {"minimal", "clean", "simple", "sleek", "classic"},
    "romantic": {"lace", "floral", "silk", "satin", "dress", "blush", "rose"},
    "street": {"oversized", "hoodie", "sneaker", "denim", "graphic"},
    "polished": {"leather", "blazer", "coat", "heel", "loafer", "structured"},
}

COLOR_SWATCHES = {
    "black": (36, 34, 35),
    "grey": (129, 130, 133),
    "white": (244, 242, 239),
    "ivory": (239, 235, 225),
    "beige": (216, 196, 167),
    "camel": (177, 142, 97),
    "brown": (115, 78, 51),
    "navy": (46, 68, 104),
    "blue": (80, 121, 178),
    "green": (101, 135, 94),
    "olive": (118, 118, 73),
    "pink": (213, 164, 173),
    "red": (171, 71, 68),
    "yellow": (212, 177, 76),
    "purple": (144, 122, 175),
    "metallic": (181, 176, 167),
}

CATEGORY_SHARES = {
    "top": 0.24,
    "outerwear": 0.16,
    "bottom": 0.18,
    "dress": 0.16,
    "shoes": 0.14,
    "bag": 0.12,
}

STYLE_TRANSLATIONS = {
    "tailored": "利落通勤",
    "relaxed": "轻松休闲",
    "minimal": "干净极简",
    "romantic": "柔和优雅",
    "street": "都市街感",
    "polished": "精致有型",
}

MOOD_MAP = {
    "tailored": "sharp polished",
    "relaxed": "easy clean",
    "minimal": "calm refined",
    "romantic": "soft feminine",
    "street": "confident casual",
    "polished": "elevated modern",
}

OCCASION_TRANSLATIONS = {
    "office": "通勤",
    "meeting": "见人",
    "weekend": "周末",
    "date-night": "约会",
    "travel": "出行",
    "errand": "日常出门",
    "dinner": "晚间场合",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a high-quality multimodal-reader seed dataset from public fashion product photos.")
    parser.add_argument("--train-size", type=int, default=DEFAULT_TRAIN_SIZE)
    parser.add_argument("--eval-size", type=int, default=DEFAULT_EVAL_SIZE)
    parser.add_argument("--seed", type=int, default=20260411)
    parser.add_argument("--shuffle-buffer", type=int, default=1500)
    parser.add_argument("--quality-threshold", type=float, default=0.62)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def normalize_text(*values: str | None) -> str:
    text = " ".join(str(value or "") for value in values).lower()
    text = text.replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def compute_quotas(total: int) -> dict[str, int]:
    quotas = {key: int(math.floor(total * share)) for key, share in CATEGORY_SHARES.items()}
    remainder = total - sum(quotas.values())
    for key in sorted(CATEGORY_SHARES, key=CATEGORY_SHARES.get, reverse=True):
        if remainder <= 0:
            break
        quotas[key] += 1
        remainder -= 1
    return quotas


def first_match(text: str, rules: tuple) -> tuple[str, ...] | None:
    for pattern_group, payload in rules:
        patterns = (pattern_group,) if isinstance(pattern_group, str) else pattern_group
        if any(pattern in text for pattern in patterns):
            return payload
    return None


def white_background_ratio(image: Image.Image) -> float:
    sample = image.resize((64, 64)).convert("RGB")
    loader = sample.load()
    pixels = [loader[x, y] for y in range(sample.height) for x in range(sample.width)]
    if not pixels:
        return 0.0
    white_pixels = sum(1 for red, green, blue in pixels if red >= 242 and green >= 242 and blue >= 242)
    return white_pixels / len(pixels)


def dominant_color_from_image(image: Image.Image) -> tuple[str, str, str]:
    sample = image.resize((64, 64)).convert("RGB")
    loader = sample.load()
    filtered = [
        value
        for y in range(sample.height)
        for x in range(sample.width)
        for value in [loader[x, y]]
        if not (value[0] >= 242 and value[1] >= 242 and value[2] >= 242)
    ]
    pixels = filtered or [loader[x, y] for y in range(sample.height) for x in range(sample.width)]
    if not pixels:
        return ("ivory", "light-neutral", "象牙白")
    avg = tuple(sum(channel) / len(pixels) for channel in zip(*pixels))
    best_name = "ivory"
    best_distance = float("inf")
    for name, rgb in COLOR_SWATCHES.items():
        distance = sum((avg[index] - rgb[index]) ** 2 for index in range(3))
        if distance < best_distance:
            best_distance = distance
            best_name = name
    for _, payload in COLOR_RULES:
        if payload[0] == best_name:
            return payload
    return ("ivory", "light-neutral", "象牙白")


def infer_category(category_text: str) -> tuple[str, str, str] | None:
    return first_match(category_text, ALLOWED_CATEGORY_RULES)


def infer_color(category_text: str, image: Image.Image) -> tuple[str, str, str]:
    rule_match = first_match(category_text, tuple((rule[0], rule[1]) for rule in COLOR_RULES))
    if rule_match:
        return rule_match
    return dominant_color_from_image(image)


def infer_fabric(category_text: str, broad_category: str, subcategory: str) -> tuple[str, str]:
    rule_match = first_match(category_text, tuple((rule[0], rule[1]) for rule in FABRIC_RULES))
    if rule_match:
        return rule_match[0], rule_match[1]
    defaults = {
        "top": ("cotton", "棉质"),
        "outerwear": ("wool-blend", "羊毛混纺"),
        "bottom": ("denim" if "jeans" in subcategory else "woven blend", "丹宁" if "jeans" in subcategory else "梭织混纺"),
        "dress": ("woven blend", "梭织混纺"),
        "shoes": ("leather", "皮革"),
        "bag": ("leather", "皮革"),
    }
    return defaults[broad_category]


def infer_silhouette(category_text: str, broad_category: str, subcategory: str) -> tuple[str, str]:
    rule_match = first_match(category_text, tuple((rule[0], rule[1]) for rule in SILHOUETTE_RULES))
    if rule_match:
        return rule_match[0], rule_match[1]
    defaults = {
        "top": ("clean regular", "利落常规版"),
        "outerwear": ("structured layer", "利落叠穿线条"),
        "bottom": ("straight" if subcategory == "trousers" else "clean leg line", "直筒" if subcategory == "trousers" else "干净裤型"),
        "dress": ("soft drape", "柔和垂坠"),
        "shoes": ("refined shape", "利落鞋型"),
        "bag": ("structured carry", "有结构感"),
    }
    return defaults[broad_category]


def infer_style(category_text: str, broad_category: str, subcategory: str) -> str:
    tokens = set(category_text.split())
    scores = Counter()
    for style, keywords in STYLE_KEYWORDS.items():
        scores[style] += len(tokens.intersection(keywords))
    if broad_category in {"outerwear", "bag"}:
        scores["polished"] += 1
    if broad_category == "dress":
        scores["romantic"] += 1
    if subcategory in {"hoodie", "sneakers", "jeans"}:
        scores["relaxed"] += 2
    if subcategory in {"blazer", "trousers", "loafers"}:
        scores["tailored"] += 2
    if not scores:
        return "minimal"
    return scores.most_common(1)[0][0]


def infer_occasions(broad_category: str, style: str, subcategory: str) -> list[str]:
    if subcategory in {"sneakers", "hoodie", "jeans", "shorts", "backpack"} or style == "street":
        return ["weekend", "travel"]
    if subcategory in {"clutch", "heels", "dress", "camisole"} or style == "romantic":
        return ["date-night", "dinner"]
    if subcategory in {"tote bag"}:
        return ["errand", "travel"]
    if subcategory in {"handbag", "crossbody bag", "bag"}:
        return ["errand", "office"]
    if subcategory in {"blazer", "shirt", "blouse", "trousers", "coat", "loafers", "vest"} or style == "tailored":
        return ["office", "meeting"]
    if subcategory in {"boots", "skirt", "knit top", "cardigan", "jacket"}:
        return ["weekend", "errand"]
    if broad_category == "bag" or style == "polished":
        return ["errand", "office"]
    return ["weekend", "errand"]


def infer_season(broad_category: str, subcategory: str, fabric: str) -> str:
    if fabric in {"wool", "cashmere", "wool-blend", "suede", "leather"} or broad_category == "outerwear":
        return "autumn-winter"
    if subcategory in {"sandals", "shorts", "camisole"} or fabric in {"linen", "chiffon"}:
        return "spring-summer"
    if broad_category == "bag":
        return "all-season"
    return "trans-seasonal"


def quality_score(text: str, image: Image.Image, signal_count: int) -> float:
    white_ratio = white_background_ratio(image)
    text_tokens = len(text.split())
    min_side = min(image.size)
    score = 0.0
    score += min(0.25, text_tokens / 24)
    score += 0.2 if 0.14 <= white_ratio <= 0.94 else max(0.0, 0.2 - abs(white_ratio - 0.54) * 0.35)
    score += min(0.3, signal_count * 0.07)
    score += min(0.15, min_side / 800)
    score += 0.1 if text_tokens >= 3 else 0.04
    return round(min(1.0, score), 3)


def garment_name(color_zh: str, category_zh: str) -> str:
    return f"{color_zh}{category_zh}"


def style_note(
    *,
    color_zh: str,
    category_zh: str,
    fabric_zh: str,
    silhouette_zh: str,
    style: str,
    occasions: list[str],
) -> str:
    occasion_text = "、".join(OCCASION_TRANSLATIONS.get(entry, entry) for entry in occasions[:2])
    style_text = STYLE_TRANSLATIONS.get(style, "干净好搭")
    return f"这件{color_zh}{category_zh}以{fabric_zh}质感为主，版型偏{silhouette_zh}，整体气质{style_text}，适合{occasion_text}穿着。"


def build_output_payload(
    *,
    broad_category: str,
    subcategory: str,
    category_zh: str,
    color_data: tuple[str, str, str],
    fabric_data: tuple[str, str],
    silhouette_data: tuple[str, str],
    style: str,
    occasions: list[str],
    season: str,
) -> dict[str, object]:
    dominant_color, color_family, color_zh = color_data
    fabric_guess, fabric_zh = fabric_data
    silhouette, silhouette_zh = silhouette_data
    mood = MOOD_MAP.get(style, "calm refined")
    tags = list(
        dict.fromkeys(
            [
                broad_category,
                subcategory,
                dominant_color,
                color_family,
                fabric_guess,
                style,
                silhouette,
            ]
        )
    )[:8]
    return {
        "source": "multimodal-curated",
        "tags": tags,
        "occasions": occasions,
        "style_notes": style_note(
            color_zh=color_zh,
            category_zh=category_zh,
            fabric_zh=fabric_zh,
            silhouette_zh=silhouette_zh,
            style=style,
            occasions=occasions,
        ),
        "color_family": color_family,
        "dominant_color": dominant_color,
        "fabric_guess": fabric_guess,
        "silhouette": silhouette,
        "season": season,
        "mood": mood,
        "category": subcategory,
    }


def save_image(image: Image.Image, path: Path) -> None:
    ensure_directory(path.parent)
    processed = ImageOps.exif_transpose(image).convert("RGB")
    buffer = BytesIO()
    processed.save(buffer, format="JPEG", quality=92)
    path.write_bytes(buffer.getvalue())


def write_jsonl(path: Path, rows: list[dict[str, object]]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def analyze_row(row: dict[str, object], *, output_dir: Path, split: str) -> dict[str, object] | None:
    raw_category = str(row.get("category") or "")
    raw_text = str(row.get("text") or "")
    item_id = str(row.get("item_ID") or "").strip()
    image = row.get("image")
    if not item_id or image is None:
        return None

    category_text = normalize_text(raw_category, raw_text)
    category_match = infer_category(category_text)
    if category_match is None:
        return None
    if min(image.size) < 140:
        return None

    broad_category, subcategory, category_zh = category_match
    color_data = infer_color(category_text, image)
    fabric_data = infer_fabric(category_text, broad_category, subcategory)
    silhouette_data = infer_silhouette(category_text, broad_category, subcategory)
    style = infer_style(category_text, broad_category, subcategory)
    occasions = infer_occasions(broad_category, style, subcategory)
    season = infer_season(broad_category, subcategory, fabric_data[0])
    signal_count = sum(1 for value in [color_data[0], fabric_data[0], silhouette_data[0], style, season] if value)
    score = quality_score(category_text, image, signal_count)

    image_relative_path = Path("images") / split / broad_category / f"{slugify(item_id)}.jpg"
    save_image(image, output_dir / image_relative_path)
    garment = garment_name(color_data[2], category_zh)
    output = build_output_payload(
        broad_category=broad_category,
        subcategory=subcategory,
        category_zh=category_zh,
        color_data=color_data,
        fabric_data=fabric_data,
        silhouette_data=silhouette_data,
        style=style,
        occasions=occasions,
        season=season,
    )

    return {
        "id": f"polyvore-{item_id}",
        "source": "polyvore-curated",
        "task": "garment-attribute-understanding",
        "image_path": str(image_relative_path).replace("\\", "/"),
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT},
            {"role": "assistant", "content": json.dumps(output, ensure_ascii=False, sort_keys=True)},
        ],
        "input": {
            "prompt": USER_PROMPT,
            "garment_name": garment,
            "image_path": str(image_relative_path).replace("\\", "/"),
        },
        "output": output,
        "source_meta": {
            "dataset": DATASET_NAME,
            "item_id": item_id,
            "polyvore_category": raw_category,
            "polyvore_text": raw_text,
            "quality_score": score,
        },
    }


def assign_split(
    category: str,
    *,
    train_counts: Counter[str],
    eval_counts: Counter[str],
    train_quota: dict[str, int],
    eval_quota: dict[str, int],
    train_target: int,
    eval_target: int,
) -> str | None:
    if sum(train_counts.values()) < train_target and train_counts[category] < train_quota[category]:
        return "train"
    if sum(eval_counts.values()) < eval_target and eval_counts[category] < eval_quota[category]:
        return "eval"
    if sum(train_counts.values()) < train_target:
        return "train"
    if sum(eval_counts.values()) < eval_target:
        return "eval"
    return None


def build_dataset(args: argparse.Namespace) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    train_quota = compute_quotas(args.train_size)
    eval_quota = compute_quotas(args.eval_size)
    train_counts: Counter[str] = Counter()
    eval_counts: Counter[str] = Counter()
    train_rows: list[dict[str, object]] = []
    eval_rows: list[dict[str, object]] = []
    seen_ids: set[str] = set()

    dataset = load_dataset(DATASET_NAME, split=DATASET_SPLIT, streaming=True).shuffle(seed=args.seed, buffer_size=args.shuffle_buffer)

    for row in dataset:
        if len(train_rows) >= args.train_size and len(eval_rows) >= args.eval_size:
            break

        item_id = str(row.get("item_ID") or "").strip()
        if not item_id or item_id in seen_ids:
            continue

        category_text = normalize_text(str(row.get("category") or ""), str(row.get("text") or ""))
        category_match = infer_category(category_text)
        if category_match is None:
            continue

        split = assign_split(
            category_match[0],
            train_counts=train_counts,
            eval_counts=eval_counts,
            train_quota=train_quota,
            eval_quota=eval_quota,
            train_target=args.train_size,
            eval_target=args.eval_size,
        )
        if split is None:
            continue

        analyzed = analyze_row(row, output_dir=args.output_dir, split=split)
        if analyzed is None:
            continue

        score = float(((analyzed.get("source_meta") or {}).get("quality_score")) or 0.0)
        if score < args.quality_threshold:
            image_path = args.output_dir / Path(str(analyzed["image_path"]))
            if image_path.exists():
                image_path.unlink()
            continue

        seen_ids.add(item_id)
        if split == "train":
            train_rows.append(analyzed)
            train_counts[category_match[0]] += 1
        else:
            eval_rows.append(analyzed)
            eval_counts[category_match[0]] += 1

        accepted = len(train_rows) + len(eval_rows)
        if accepted and accepted % 25 == 0:
            print(
                f"[progress] accepted={accepted} "
                f"train={len(train_rows)}/{args.train_size} "
                f"eval={len(eval_rows)}/{args.eval_size}"
            )

    if len(train_rows) < args.train_size or len(eval_rows) < args.eval_size:
        raise RuntimeError(
            f"Dataset build incomplete: train={len(train_rows)}/{args.train_size}, eval={len(eval_rows)}/{args.eval_size}. "
            "Loosen the quality threshold or increase the scan volume."
        )

    return train_rows, eval_rows


def write_templates(output_dir: Path) -> None:
    template_output = {
        "tags": ["top", "ivory", "light-neutral", "cotton", "minimal"],
        "occasions": ["office", "weekend"],
        "style_notes": "这件象牙白上衣质感柔和，轮廓干净，适合通勤和周末叠穿。",
        "color_family": "light-neutral",
        "dominant_color": "ivory",
        "fabric_guess": "cotton",
        "silhouette": "clean regular",
        "season": "trans-seasonal",
        "mood": "calm refined",
        "category": "top",
    }
    template = {
        "id": "multimodal-template-001",
        "source": "template",
        "task": "garment-attribute-understanding",
        "image_path": "images/train/top/sample.jpg",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT},
            {"role": "assistant", "content": json.dumps(template_output, ensure_ascii=False, sort_keys=True)},
        ],
        "input": {"prompt": USER_PROMPT, "garment_name": "象牙白上衣", "image_path": "images/train/top/sample.jpg"},
        "output": template_output,
        "source_meta": {"dataset": "template"},
    }
    write_jsonl(output_dir / "train.template.jsonl", [template])
    write_jsonl(output_dir / "eval.template.jsonl", [template])


def main() -> None:
    args = parse_args()
    ensure_directory(args.output_dir)
    train_rows, eval_rows = build_dataset(args)
    write_jsonl(args.output_dir / "train.jsonl", train_rows)
    write_jsonl(args.output_dir / "eval.jsonl", eval_rows)
    write_templates(args.output_dir)

    train_distribution = Counter(row["output"]["category"] for row in train_rows)
    eval_distribution = Counter(row["output"]["category"] for row in eval_rows)
    print(f"[done] train rows: {len(train_rows)}")
    print(f"[done] eval rows: {len(eval_rows)}")
    print("[train-category-distribution]")
    for key, value in train_distribution.most_common():
        print(f"  {key}: {value}")
    print("[eval-category-distribution]")
    for key, value in eval_distribution.most_common():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
