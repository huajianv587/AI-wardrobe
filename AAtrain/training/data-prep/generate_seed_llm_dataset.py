from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Scenario:
    prompt: str
    weather: str
    scene: str
    style: str
    title_seed: str
    rationale_focus: str
    badges: list[str]
    charm_seed: str
    include_outerwear: bool = True
    include_accessory: bool = False


@dataclass(frozen=True)
class Palette:
    name: str
    top_name: str
    top_category: str
    top_color: str
    top_tags: list[str]
    bottom_name: str
    bottom_category: str
    bottom_color: str
    bottom_tags: list[str]
    shoes_name: str
    shoes_category: str
    shoes_color: str
    shoes_tags: list[str]
    outerwear_name: str
    outerwear_category: str
    outerwear_color: str
    outerwear_tags: list[str]
    accessory_name: str
    accessory_category: str
    accessory_color: str
    accessory_tags: list[str]


SCENARIOS: list[Scenario] = [
    Scenario(
        prompt="明天要去办公室开会，希望温柔但专业一点，不要太生硬。",
        weather="26C, cloudy, indoor AC",
        scene="office meeting",
        style="soft formal",
        title_seed="温柔会面通勤装",
        rationale_focus="用柔和颜色去缓冲正式感，再保留一件结构化单品稳住专业度。",
        badges=["soft formal", "office ready", "aircon friendly"],
        charm_seed="这套会让你看起来认真，但不会太硬。",
        include_outerwear=True,
    ),
    Scenario(
        prompt="明天下午想出门喝咖啡，不想费脑，但想显得干净一点。",
        weather="29C, sunny",
        scene="coffee",
        style="easy casual",
        title_seed="轻松咖啡出门装",
        rationale_focus="基础款配色更省心，留一个柔和亮点就足够耐看。",
        badges=["easy casual", "clean palette"],
        charm_seed="像没费多少力气，但还是会让人觉得你很会穿。",
        include_accessory=True,
    ),
    Scenario(
        prompt="明天要下雨还得上班，想要好走路，也别太沉闷。",
        weather="22C, rain",
        scene="office commute",
        style="practical soft",
        title_seed="雨天通勤稳妥装",
        rationale_focus="优先保证通勤耐走和防雨，再用颜色把整体变轻一点。",
        badges=["rain ready", "commute safe", "soft touch"],
        charm_seed="雨天也能看起来是有在好好照顾自己的。",
        include_outerwear=True,
    ),
    Scenario(
        prompt="周末想和朋友逛街拍照，希望轻松一点，但也要有点上镜。",
        weather="27C, bright sun",
        scene="weekend shopping",
        style="photo friendly casual",
        title_seed="周末逛街上镜装",
        rationale_focus="用轻盈轮廓和干净配色提升照片表现，再留一个柔和重点。",
        badges=["photo ready", "weekend soft", "easy walk"],
        charm_seed="这套会让你看起来像随便穿穿，却很会挑重点。",
        include_accessory=True,
    ),
    Scenario(
        prompt="明晚去吃饭，想温柔一点，不要太隆重，也别太像上班。",
        weather="24C, evening breeze",
        scene="date dinner",
        style="soft elegant",
        title_seed="温柔晚餐轻精致",
        rationale_focus="先把气质放柔，再用一件稳重单品把整体拉回精致感。",
        badges=["date ready", "soft elegant", "not overdressed"],
        charm_seed="认真准备过，但不会显得刻意。",
        include_outerwear=True,
    ),
    Scenario(
        prompt="明天要坐高铁出去玩，希望舒服、好走，但照片别太随便。",
        weather="25C, mixed indoor outdoor",
        scene="travel day",
        style="comfortable neat",
        title_seed="旅行出发舒服装",
        rationale_focus="旅行装先考虑舒适和走路，再留一点整洁感给照片。",
        badges=["travel easy", "walkable", "photo neat"],
        charm_seed="会让出发这天轻松很多，也不会显得乱。",
        include_outerwear=True,
    ),
    Scenario(
        prompt="明天只是出门买咖啡和办点小事，不想想太多，给我一套稳的。",
        weather="28C, sunny",
        scene="errands",
        style="no-brainer",
        title_seed="少思考出门稳妥装",
        rationale_focus="基础单品搭起来最不费脑，重点是清爽和比例别乱。",
        badges=["no-brainer", "daily easy", "clean look"],
        charm_seed="这套像你今天不想想太多时，最可靠的那种顺手好看。",
        include_accessory=True,
    ),
    Scenario(
        prompt="最近早晚温差大，明天要上班，希望看起来清爽一点。",
        weather="18C morning, 27C noon",
        scene="office",
        style="clean layering",
        title_seed="早春温差通勤装",
        rationale_focus="把层次做轻，既能应对温差，也不会显得厚重。",
        badges=["temperature swing", "clean layers", "office"],
        charm_seed="看起来是轻的，但细节又是有顾到的。",
        include_outerwear=True,
    ),
    Scenario(
        prompt="周末想去公园散步拍照，希望显得温柔、自然一点。",
        weather="23C, mild sun",
        scene="park walk",
        style="soft natural",
        title_seed="公园散步温柔装",
        rationale_focus="让颜色和材质都放柔，照片会更自然舒服。",
        badges=["soft natural", "photo soft", "weekend"],
        charm_seed="有种轻轻松松就很温柔的感觉。",
        include_outerwear=True,
    ),
    Scenario(
        prompt="明天有几个线上会议，主要拍上半身，希望精神一点但别太硬。",
        weather="indoor, AC",
        scene="video meeting",
        style="polished top focus",
        title_seed="线上会议精神装",
        rationale_focus="把上半身做得更有气色和层次，下半身保持稳定就够了。",
        badges=["video ready", "top focus", "soft polished"],
        charm_seed="镜头里会更有精神，但不会给人压迫感。",
        include_outerwear=True,
        include_accessory=True,
    ),
    Scenario(
        prompt="外面很热，但办公室空调很强，想穿得凉快又不怕冷。",
        weather="31C outdoor, strong AC indoor",
        scene="office summer",
        style="balanced summer office",
        title_seed="冷气房夏日平衡装",
        rationale_focus="主体保持夏天的轻薄感，再留一件可调节的层次单品。",
        badges=["summer office", "AC ready", "balanced"],
        charm_seed="外面不会热得难受，进屋也不会马上觉得冷。",
        include_outerwear=True,
    ),
    Scenario(
        prompt="明天还是上班，但不想和前两天太像，想换一个主角单品。",
        weather="25C, cloudy",
        scene="office refresh",
        style="repeat-friendly refresh",
        title_seed="换一套通勤刷新装",
        rationale_focus="保留稳定通勤结构，只换一个视觉主角，最容易显新鲜。",
        badges=["refresh", "office repeat", "hero piece"],
        charm_seed="像你熟悉的自己，但又比前几天更新一点。",
        include_outerwear=True,
    ),
    Scenario(
        prompt="周末想在城市里散步看展，希望舒服一点，但别太普通。",
        weather="23C, cloudy",
        scene="museum walk",
        style="casual thoughtful",
        title_seed="看展散步有想法装",
        rationale_focus="基础单品先稳住，再用一点质感和配色提升完整度。",
        badges=["museum walk", "casual thoughtful", "city neat"],
        charm_seed="轻松里有一点自己的审美，很适合慢慢逛。",
        include_accessory=True,
    ),
    Scenario(
        prompt="周末和朋友吃早午餐，希望看起来轻松、明亮一点。",
        weather="26C, sunny brunch",
        scene="brunch",
        style="light cheerful",
        title_seed="早午餐明亮轻松装",
        rationale_focus="用明亮干净的颜色让气色更好，再留一个柔和点缀。",
        badges=["brunch", "light cheerful", "soft color"],
        charm_seed="整个人会显得很轻盈，很适合慢慢吃饭聊天。",
        include_accessory=True,
    ),
    Scenario(
        prompt="晚上和朋友吃饭聊天，希望好看一点，但不要用力过猛。",
        weather="24C, evening city",
        scene="friends dinner",
        style="easy refined",
        title_seed="朋友晚餐轻精致装",
        rationale_focus="把精致感做在细节和颜色里，比全身都强调更自然。",
        badges=["easy refined", "friends dinner", "not too much"],
        charm_seed="看起来有认真准备，但还是你很自然的那种好看。",
        include_outerwear=True,
    ),
]


PALETTES: list[Palette] = [
    Palette(
        name="cream-gray",
        top_name="奶油白针织上衣",
        top_category="knit top",
        top_color="cream",
        top_tags=["soft", "clean", "layering"],
        bottom_name="浅灰直筒裤",
        bottom_category="trousers",
        bottom_color="light gray",
        bottom_tags=["clean", "repeat-friendly"],
        shoes_name="米色单鞋",
        shoes_category="flats",
        shoes_color="beige",
        shoes_tags=["light", "daily"],
        outerwear_name="燕麦色开衫",
        outerwear_category="cardigan",
        outerwear_color="oat",
        outerwear_tags=["soft", "layering"],
        accessory_name="珍珠耳钉",
        accessory_category="jewelry",
        accessory_color="pearl white",
        accessory_tags=["small accent", "gentle"],
    ),
    Palette(
        name="blue-charcoal",
        top_name="雾蓝衬衫",
        top_category="shirt",
        top_color="dusty blue",
        top_tags=["office", "clean", "soft"],
        bottom_name="深灰西裤",
        bottom_category="trousers",
        bottom_color="charcoal",
        bottom_tags=["office", "formal", "stable"],
        shoes_name="黑色乐福鞋",
        shoes_category="loafers",
        shoes_color="black",
        shoes_tags=["office", "commute"],
        outerwear_name="浅驼短西装",
        outerwear_category="blazer",
        outerwear_color="camel",
        outerwear_tags=["smart", "office", "hero piece"],
        accessory_name="焦糖色托特包",
        accessory_category="bag",
        accessory_color="caramel",
        accessory_tags=["city", "warm accent"],
    ),
    Palette(
        name="pink-navy",
        top_name="藕粉衬衫",
        top_category="blouse",
        top_color="dusty pink",
        top_tags=["soft", "date", "gentle"],
        bottom_name="深蓝半裙",
        bottom_category="skirt",
        bottom_color="navy",
        bottom_tags=["balanced", "elegant"],
        shoes_name="杏色低跟鞋",
        shoes_category="heels",
        shoes_color="apricot",
        shoes_tags=["comfortable", "soft"],
        outerwear_name="米白薄针织开衫",
        outerwear_category="cardigan",
        outerwear_color="ivory",
        outerwear_tags=["light", "gentle"],
        accessory_name="奶油色小挎包",
        accessory_category="bag",
        accessory_color="cream",
        accessory_tags=["soft accent", "date"],
    ),
    Palette(
        name="white-khaki",
        top_name="米白落肩T恤",
        top_category="tee",
        top_color="ivory",
        top_tags=["easy", "basic", "clean"],
        bottom_name="浅卡其直筒裤",
        bottom_category="pants",
        bottom_color="khaki",
        bottom_tags=["daily", "clean", "comfortable"],
        shoes_name="白色运动鞋",
        shoes_category="sneakers",
        shoes_color="white",
        shoes_tags=["walkable", "easy"],
        outerwear_name="浅蓝牛仔外套",
        outerwear_category="jacket",
        outerwear_color="light blue",
        outerwear_tags=["weekend", "travel"],
        accessory_name="深棕帆布包",
        accessory_category="bag",
        accessory_color="brown",
        accessory_tags=["daily", "easy"],
    ),
    Palette(
        name="mint-white",
        top_name="浅杏色针织背心",
        top_category="vest",
        top_color="apricot",
        top_tags=["soft", "photo", "light"],
        bottom_name="白色长裙",
        bottom_category="maxi skirt",
        bottom_color="white",
        bottom_tags=["flowy", "soft"],
        shoes_name="奶油色凉鞋",
        shoes_category="sandals",
        shoes_color="cream",
        shoes_tags=["weekend", "light"],
        outerwear_name="薄荷绿衬衫外搭",
        outerwear_category="shirt jacket",
        outerwear_color="mint",
        outerwear_tags=["photo", "layering", "fresh"],
        accessory_name="白色发箍",
        accessory_category="hair accessory",
        accessory_color="white",
        accessory_tags=["soft", "photo"],
    ),
    Palette(
        name="rose-brown",
        top_name="雾粉色短袖针织",
        top_category="short sleeve knit",
        top_color="rose",
        top_tags=["soft", "gentle", "photo"],
        bottom_name="深咖直筒裤",
        bottom_category="trousers",
        bottom_color="dark brown",
        bottom_tags=["stable", "repeat-friendly"],
        shoes_name="奶茶色乐福鞋",
        shoes_category="loafers",
        shoes_color="milk tea",
        shoes_tags=["city", "easy"],
        outerwear_name="米色风衣",
        outerwear_category="trench",
        outerwear_color="beige",
        outerwear_tags=["commute", "rain-friendly"],
        accessory_name="金色细耳环",
        accessory_category="jewelry",
        accessory_color="gold",
        accessory_tags=["small shine", "refined"],
    ),
    Palette(
        name="gray-white",
        top_name="浅灰短袖针织",
        top_category="knit top",
        top_color="light gray",
        top_tags=["clean", "soft", "minimal"],
        bottom_name="白色直筒裤",
        bottom_category="pants",
        bottom_color="white",
        bottom_tags=["clean", "bright"],
        shoes_name="灰白板鞋",
        shoes_category="sneakers",
        shoes_color="gray white",
        shoes_tags=["walkable", "city"],
        outerwear_name="深灰薄西装",
        outerwear_category="blazer",
        outerwear_color="graphite",
        outerwear_tags=["office", "structured"],
        accessory_name="深棕小挎包",
        accessory_category="bag",
        accessory_color="brown",
        accessory_tags=["city", "grounding"],
    ),
    Palette(
        name="navy-cream",
        top_name="海军蓝细针织",
        top_category="knit top",
        top_color="navy",
        top_tags=["stable", "office", "neat"],
        bottom_name="奶油白阔腿裤",
        bottom_category="wide-leg pants",
        bottom_color="cream",
        bottom_tags=["light", "balance"],
        shoes_name="浅驼尖头平底鞋",
        shoes_category="flats",
        shoes_color="camel",
        shoes_tags=["office", "light"],
        outerwear_name="米杏短开衫",
        outerwear_category="cardigan",
        outerwear_color="beige",
        outerwear_tags=["soft", "layering"],
        accessory_name="细皮带腕表",
        accessory_category="watch",
        accessory_color="brown",
        accessory_tags=["polished", "small detail"],
    ),
]


CONFIDENCE_LABELS = ["很懂你", "相当稳", "轻松好看", "温柔稳妥"]


def build_wardrobe_items(sample_index: int, scenario: Scenario, palette: Palette) -> tuple[list[dict], list[int]]:
    base_id = sample_index * 10 + 1000
    items = [
        {
            "id": base_id + 1,
            "name": palette.top_name,
            "slot": "top",
            "category": palette.top_category,
            "color": palette.top_color,
            "tags": palette.top_tags,
        },
        {
            "id": base_id + 2,
            "name": palette.bottom_name,
            "slot": "bottom",
            "category": palette.bottom_category,
            "color": palette.bottom_color,
            "tags": palette.bottom_tags,
        },
        {
            "id": base_id + 3,
            "name": palette.shoes_name,
            "slot": "shoes",
            "category": palette.shoes_category,
            "color": palette.shoes_color,
            "tags": palette.shoes_tags,
        },
    ]
    chosen_ids = [base_id + 1, base_id + 2, base_id + 3]

    if scenario.include_outerwear:
        items.append(
            {
                "id": base_id + 4,
                "name": palette.outerwear_name,
                "slot": "outerwear",
                "category": palette.outerwear_category,
                "color": palette.outerwear_color,
                "tags": palette.outerwear_tags,
            }
        )
        chosen_ids.insert(0, base_id + 4)

    if scenario.include_accessory:
        items.append(
            {
                "id": base_id + 5,
                "name": palette.accessory_name,
                "slot": "accessory",
                "category": palette.accessory_category,
                "color": palette.accessory_color,
                "tags": palette.accessory_tags,
            }
        )
        chosen_ids.append(base_id + 5)

    return items, chosen_ids


def build_sample(sample_index: int, scenario: Scenario, palette: Palette) -> dict:
    wardrobe_items, chosen_ids = build_wardrobe_items(sample_index, scenario, palette)
    confidence_label = CONFIDENCE_LABELS[sample_index % len(CONFIDENCE_LABELS)]
    title = f"{palette.name.replace('-', ' ').title()} {scenario.title_seed}"
    rationale = (
        f"{scenario.rationale_focus}"
        f" 这套里用 {palette.top_color} 和 {palette.bottom_color} 做基础平衡，"
        f"再让 {wardrobe_items[0]['name']} 把场景感拉出来。"
    )
    charm_copy = (
        f"✨ {scenario.charm_seed}"
        f" 如果你明天不想多想，这套会是很顺手的一种稳妥答案。"
    )
    return {
        "instruction": "你是 AI Wardrobe 的穿搭推荐助手。请根据用户需求、天气和衣橱信息，生成一套合适的搭配。",
        "input": {
            "prompt": scenario.prompt,
            "weather": scenario.weather,
            "scene": scenario.scene,
            "style": scenario.style,
            "wardrobe_items": wardrobe_items,
        },
        "output": {
            "title": title,
            "rationale": rationale,
            "item_ids": chosen_ids,
            "confidence_label": confidence_label,
            "reason_badges": scenario.badges,
            "charm_copy": charm_copy,
        },
    }


def generate_rows(count: int, offset: int = 0) -> list[dict]:
    rows: list[dict] = []
    for index in range(count):
        scenario = SCENARIOS[(index + offset) % len(SCENARIOS)]
        palette = PALETTES[(index * 3 + offset) % len(PALETTES)]
        rows.append(build_sample(index + offset, scenario, palette))
    return rows


def write_rows(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    root = Path("model_training/datasets/llm-recommender")
    train_rows = generate_rows(100, offset=0)
    eval_rows = generate_rows(30, offset=1000)

    write_rows(root / "train.jsonl", train_rows)
    write_rows(root / "eval.jsonl", eval_rows)
    print("Generated 100 train rows and 30 eval rows.")


if __name__ == "__main__":
    main()
