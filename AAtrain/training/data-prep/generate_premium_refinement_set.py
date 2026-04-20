from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass
from pathlib import Path

from generate_curated_llm_dataset import (
    ACCESSORY_PATTERNS,
    BOTTOM_PATTERNS,
    OUTERWEAR_PATTERNS,
    ROOT,
    SHOE_PATTERNS,
    TOP_PATTERNS,
    audit_example,
    build_item,
    ensure_directory,
)


@dataclass(frozen=True)
class PremiumRecipe:
    slug: str
    scene: str
    style: str
    weather_options: tuple[str, ...]
    prompt_templates: tuple[str, ...]
    title_templates: tuple[str, ...]
    rationale_templates: tuple[str, ...]
    alternate_rationale_templates: tuple[str, ...]
    charm_templates: tuple[str, ...]
    badges: tuple[str, ...]
    primary_blueprint: dict[str, str]
    alternate_blueprint: dict[str, str]
    distractor_blueprint: dict[str, str]
    palettes: tuple[dict[str, str], ...]
    profile_summary: str
    closet_gaps: tuple[str, ...]
    reminder_flags: tuple[str, ...]
    include_primary_accessory: bool = True
    include_alternate_accessory: bool = False


PATTERN_INDEX = {
    "top": {pattern.category: pattern for pattern in TOP_PATTERNS},
    "bottom": {pattern.category: pattern for pattern in BOTTOM_PATTERNS},
    "outerwear": {pattern.category: pattern for pattern in OUTERWEAR_PATTERNS},
    "shoes": {pattern.category: pattern for pattern in SHOE_PATTERNS},
    "accessory": {pattern.category: pattern for pattern in ACCESSORY_PATTERNS},
}


PREMIUM_RECIPES: tuple[PremiumRecipe, ...] = (
    PremiumRecipe(
        slug="presentation-soft-authority",
        scene="client presentation",
        style="sharp calm",
        weather_options=("21C, neutral office temperature", "24C, mild workday", "19C, cool meeting room"),
        prompt_templates=(
            "I need a client-facing look that feels assured and expensive, but not intimidating.",
            "Build a presentation outfit that looks composed on arrival and still reads warm in conversation.",
            "I want a sharper work look for a high-visibility meeting, but I do not want it to feel armored.",
            "Give me a client-presentation outfit that looks steady, clean, and easy to trust.",
        ),
        title_templates=("Soft Authority", "Client-Facing, Without The Armor", "Calm Presentation Polish"),
        rationale_templates=(
            "The shell-and-trouser base keeps the look composed, while the cropped structure adds authority without turning the whole outfit severe.",
            "This lands well for a client-facing room because the line is precise, but the styling still feels open and human.",
            "The outfit reads prepared and expensive in a quiet way, which is exactly what keeps the focus on you instead of the clothes.",
            "It keeps the visual message steady: sharp enough for the room, but soft enough to stay conversational.",
        ),
        alternate_rationale_templates=(
            "The alternate keeps the same professional temperature, but swaps in a cleaner trench-led silhouette for a calmer first impression.",
            "This version shifts the focal point from structured polish to cleaner ease, which is useful when the room needs less edge and more clarity.",
            "It still reads presentation-ready, but the trench-and-knit direction softens the visual pressure without dropping credibility.",
            "The alternate holds onto the same authority, just with a more fluid rhythm through the layers.",
        ),
        charm_templates=(
            "It looks like you prepared, just without making the outfit louder than the work.",
            "Quietly authoritative is doing the heavy lifting here.",
            "Sharp enough for the room, human enough for the conversation.",
            "It carries the meeting without trying to become the headline.",
        ),
        badges=("presentation ready", "clean authority", "high-visibility polish"),
        primary_blueprint={"top": "shell top", "bottom": "wide-leg trousers", "outerwear": "cropped blazer", "shoes": "slingbacks", "accessory": "watch"},
        alternate_blueprint={"top": "polo knit", "bottom": "fluid trousers", "outerwear": "trench", "shoes": "loafers", "accessory": "watch"},
        distractor_blueprint={"top": "tee", "bottom": "relaxed denim", "outerwear": "overshirt", "shoes": "sneakers", "accessory": "necklace"},
        palettes=(
            {"top": "ivory", "bottom": "charcoal", "outerwear": "taupe", "shoes": "slate", "accessory": "cream"},
            {"top": "oat", "bottom": "ink", "outerwear": "stone", "shoes": "cocoa", "accessory": "ivory"},
            {"top": "cream", "bottom": "slate", "outerwear": "soft olive", "shoes": "rosewood", "accessory": "stone"},
            {"top": "beige", "bottom": "charcoal", "outerwear": "dusty blue", "shoes": "taupe", "accessory": "oat"},
        ),
        profile_summary="Your best presentation looks balance clarity, control, and one softer signal that keeps the outfit approachable.",
        closet_gaps=("A cleaner presentation shoe option would improve high-stakes work outfits.",),
        reminder_flags=("Keep one strongest presentation blazer reserved for high-visibility meetings.",),
        include_primary_accessory=True,
        include_alternate_accessory=True,
    ),
    PremiumRecipe(
        slug="presentation-tailored-trust",
        scene="client presentation",
        style="sharp calm",
        weather_options=("20C, bright office day", "22C, indoor AC and short commute", "18C, crisp client-site morning"),
        prompt_templates=(
            "I need to look expensive and reliable for a client day, but still like myself.",
            "Build a tailored presentation look that feels calm rather than aggressive.",
            "I want something for a client-facing day that reads polished from across the room.",
            "Give me a presentation outfit that feels thoughtful, strong, and easy to repeat.",
        ),
        title_templates=("Tailored Trust", "Prepared, Not Defensive", "Quiet Client-Day Precision"),
        rationale_templates=(
            "The shirt-and-trouser structure gives the outfit immediate credibility, and the blazer keeps the line resolved without feeling hard.",
            "This works because every piece is disciplined, but the palette keeps the look from turning cold or over-managed.",
            "It signals reliability through repetition-friendly tailoring instead of novelty, which is exactly right for a client-facing day.",
            "The outfit is clean enough to feel decisive, but it still leaves room for warmth in the styling.",
        ),
        alternate_rationale_templates=(
            "The alternate keeps the same trust signal, but the knit-and-fluid-trouser mix relaxes the silhouette for a softer client read.",
            "This version keeps the credibility, just with less visual edge and a slightly more conversational rhythm.",
            "It still feels deliberate and client-ready, but the texture mix makes the outfit easier and less rigid.",
            "The alternate trims some of the tailoring pressure without losing the room-ready finish.",
        ),
        charm_templates=(
            "It feels like the sort of look people instinctively trust.",
            "Steady, clean, and very hard to argue with.",
            "It lets the preparation show without making a speech about it.",
            "This one knows how to enter the room quietly and still stay memorable.",
        ),
        badges=("client trust", "tailored calm", "repeat-friendly"),
        primary_blueprint={"top": "shirt", "bottom": "trousers", "outerwear": "blazer", "shoes": "loafers", "accessory": "watch"},
        alternate_blueprint={"top": "knit top", "bottom": "fluid trousers", "outerwear": "trench", "shoes": "flats", "accessory": "watch"},
        distractor_blueprint={"top": "rib tee", "bottom": "relaxed denim", "outerwear": "jacket", "shoes": "trainers", "accessory": "necklace"},
        palettes=(
            {"top": "ivory", "bottom": "ink", "outerwear": "charcoal", "shoes": "stone", "accessory": "cream"},
            {"top": "oat", "bottom": "slate", "outerwear": "taupe", "shoes": "cocoa", "accessory": "ivory"},
            {"top": "cream", "bottom": "charcoal", "outerwear": "dusty blue", "shoes": "sage", "accessory": "stone"},
            {"top": "beige", "bottom": "ink", "outerwear": "soft olive", "shoes": "taupe", "accessory": "oat"},
        ),
        profile_summary="The strongest presentation outfits in your closet are the ones that feel stable, not showy.",
        closet_gaps=("A sharper repeatable belt or watch would lift client-day outfits without adding noise.",),
        reminder_flags=("Repeat your strongest client-day silhouette with different tops before buying more statement pieces.",),
        include_primary_accessory=True,
        include_alternate_accessory=True,
    ),
    PremiumRecipe(
        slug="network-modern-social",
        scene="networking event",
        style="elevated modern",
        weather_options=("24C, warm evening", "20C, cool city night", "22C, indoor social event"),
        prompt_templates=(
            "I need a networking-event look that feels polished and current, but still social.",
            "Build me something for a city work-social event that looks sharp without drifting back into office mode.",
            "I want to look interesting at a networking event, but not like I am trying to win best dressed.",
            "Give me an outfit for introductions, conversations, and standing around that still looks intentional in photos.",
        ),
        title_templates=("Modern Event Polish", "Sharp, But Still Social", "Evening Network Edit"),
        rationale_templates=(
            "The shell-and-trouser combination feels modern and social, while the cropped structure keeps enough edge to register in the room.",
            "This works because the outfit is sharp in shape, but it still reads like a person going out rather than a person staying at work late.",
            "The line is polished enough to hold the room, and the styling keeps it from turning into corporate cosplay.",
            "It lands in the useful middle: refined enough to be noticed, easy enough to keep talking in.",
        ),
        alternate_rationale_templates=(
            "The alternate leans a little softer through the blouse and wider leg, which makes the same event feel slightly more fluid and conversational.",
            "This version keeps the city polish, but the wider silhouette makes it feel less structured and more social.",
            "It still looks event-ready, just with a little less edge and a little more ease through movement.",
            "The alternate shifts the emphasis from sharpness to sophistication without losing the room entirely.",
        ),
        charm_templates=(
            "It feels current without asking for applause.",
            "Polished enough to be noticed, relaxed enough to keep talking in.",
            "It gives the room something to remember, just without trying too hard.",
            "This is what social polish looks like when it still belongs to a real person.",
        ),
        badges=("social polish", "city sharp", "after-hours ready"),
        primary_blueprint={"top": "shell top", "bottom": "trousers", "outerwear": "cropped blazer", "shoes": "flats", "accessory": "necklace"},
        alternate_blueprint={"top": "blouse", "bottom": "wide-leg trousers", "outerwear": "blazer", "shoes": "slingbacks", "accessory": "necklace"},
        distractor_blueprint={"top": "tee", "bottom": "jeans", "outerwear": "cardigan", "shoes": "sneakers", "accessory": "watch"},
        palettes=(
            {"top": "ivory", "bottom": "ink", "outerwear": "charcoal", "shoes": "taupe", "accessory": "stone"},
            {"top": "beige", "bottom": "slate", "outerwear": "rosewood", "shoes": "cream", "accessory": "ivory"},
            {"top": "oat", "bottom": "charcoal", "outerwear": "soft olive", "shoes": "sage", "accessory": "cream"},
            {"top": "cream", "bottom": "cocoa", "outerwear": "dusty blue", "shoes": "stone", "accessory": "oat"},
        ),
        profile_summary="Your strongest networking looks feel modern and a little sharp, but never too office-bound.",
        closet_gaps=("A more refined evening accessory would broaden work-social outfit range.",),
        reminder_flags=("Keep one strongest city-evening layer ready for invites that happen after a workday.",),
    ),
    PremiumRecipe(
        slug="network-column-signal",
        scene="networking event",
        style="elevated modern",
        weather_options=("21C, evening event", "19C, gallery-adjacent night", "25C, warm indoor social"),
        prompt_templates=(
            "Build a networking-event look that feels confident, creative, and very clean.",
            "I want something a little sharper for a city event, but I still need to move and talk in it.",
            "Give me a social work-event outfit that feels expensive and modern without becoming stiff.",
            "I need a room-ready look for a networking night that still feels like me.",
        ),
        title_templates=("Column Of Confidence", "Clean City Signal", "Social, But Still Precise"),
        rationale_templates=(
            "The column-skirt shape gives the outfit a stronger city signal, while the knit and cropped layer keep it approachable.",
            "This lands because the silhouette feels distinctive enough for the event, but the pieces are still wearable and low-drama.",
            "The outfit has a stronger line than a normal evening look, which helps it read intentional without becoming loud.",
            "It feels more specific to the room than a generic work outfit, but the restraint is what keeps it elegant.",
        ),
        alternate_rationale_templates=(
            "The alternate relaxes the line through the trouser shape, which makes the same outfit idea easier and slightly less editorial.",
            "This version keeps the same polish, but it softens the city edge with a looser silhouette and a steadier rhythm.",
            "It still feels event-aware, just with less architectural pressure and more conversational ease.",
            "The alternate holds onto the refined finish while dialing the structure down a touch.",
        ),
        charm_templates=(
            "It looks like you understood the room and still kept your own taste intact.",
            "More city-night confidence, less performance.",
            "It carries a little more edge, but never loses the human part.",
            "This one feels crisp in the mirror and calm in the room.",
        ),
        badges=("city confidence", "modern line", "room aware"),
        primary_blueprint={"top": "polo knit", "bottom": "column skirt", "outerwear": "cropped blazer", "shoes": "slingbacks", "accessory": "necklace"},
        alternate_blueprint={"top": "shell top", "bottom": "wide-leg trousers", "outerwear": "blazer", "shoes": "flats", "accessory": "necklace"},
        distractor_blueprint={"top": "tee", "bottom": "tailored shorts", "outerwear": "overshirt", "shoes": "sandals", "accessory": "watch"},
        palettes=(
            {"top": "stone", "bottom": "charcoal", "outerwear": "taupe", "shoes": "ivory", "accessory": "cream"},
            {"top": "oat", "bottom": "ink", "outerwear": "rosewood", "shoes": "sage", "accessory": "stone"},
            {"top": "cream", "bottom": "cocoa", "outerwear": "dusty blue", "shoes": "taupe", "accessory": "ivory"},
            {"top": "beige", "bottom": "slate", "outerwear": "soft olive", "shoes": "rosewood", "accessory": "oat"},
        ),
        profile_summary="The best city-event looks in your closet sharpen the line a little, then stop before they become costume.",
        closet_gaps=("A cleaner low evening shoe would make column-skirt styling easier to repeat.",),
        reminder_flags=("Keep one strongest event-ready necklace or earring pairing separate from work basics.",),
    ),
    PremiumRecipe(
        slug="summer-commute-breathable-polish",
        scene="summer office commute",
        style="breezy polished",
        weather_options=("31C, humid commute, cold office AC", "29C, bright heat", "30C, sticky city morning"),
        prompt_templates=(
            "I need a genuinely hot-weather office outfit that still looks polished at the desk.",
            "Build a summer commute look that survives humidity but still feels elegant indoors.",
            "Give me something for a hot workday that does not collapse into survival dressing.",
            "I want to stay presentable through a humid commute and aggressive office AC.",
        ),
        title_templates=("Heatwave Work Polish", "Lightweight Office Control", "Hot Day, Still Composed"),
        rationale_templates=(
            "The poplin-and-fluid-trouser mix stays breathable for the commute, while the blazer keeps the whole look anchored once you are indoors.",
            "This works because the outfit is light through the fabric and line, but it still finishes like officewear instead of weekendwear.",
            "The look respects the heat without giving away all the structure that keeps it polished on arrival.",
            "It feels considered in the mirror and survivable on the sidewalk, which is the real win on a day like this.",
        ),
        alternate_rationale_templates=(
            "The alternate shifts the balance toward softer ease, which helps when the heat is the main event and the office finish can be carried by cleaner accessories.",
            "This version is a little less tailored up top, but it still lands as work-ready because the shape stays clean and intentional.",
            "It keeps the same polished temperature, but the cardigan-led route makes the overall look lighter and easier.",
            "The alternate prioritizes comfort slightly more, while still staying too composed to read casual.",
        ),
        charm_templates=(
            "It respects the weather without resigning the day to survival mode.",
            "Light enough for the commute, finished enough for the office.",
            "Polish is harder to fake in heat. This one earns it.",
            "It lets you look collected before the elevator even closes.",
        ),
        badges=("heat aware", "office light", "humidity proof"),
        primary_blueprint={"top": "poplin shirt", "bottom": "fluid trousers", "outerwear": "blazer", "shoes": "flats", "accessory": "watch"},
        alternate_blueprint={"top": "shell top", "bottom": "wide-leg trousers", "outerwear": "cardigan", "shoes": "sandals", "accessory": "watch"},
        distractor_blueprint={"top": "sweater", "bottom": "column skirt", "outerwear": "coat", "shoes": "ankle boots", "accessory": "necklace"},
        palettes=(
            {"top": "ivory", "bottom": "taupe", "outerwear": "soft olive", "shoes": "stone", "accessory": "cream"},
            {"top": "oat", "bottom": "slate", "outerwear": "beige", "shoes": "sage", "accessory": "ivory"},
            {"top": "cream", "bottom": "dusty blue", "outerwear": "taupe", "shoes": "oat", "accessory": "stone"},
            {"top": "beige", "bottom": "charcoal", "outerwear": "ivory", "shoes": "taupe", "accessory": "oat"},
        ),
        profile_summary="Your strongest hot-weather work outfits stay airy in the commute and clean once the day becomes indoor-facing.",
        closet_gaps=("A lighter summer office layer would make heatwave dressing easier to repeat.",),
        reminder_flags=("Keep one warm-weather office shoe aside so heat does not push the whole look casual.",),
        include_primary_accessory=True,
        include_alternate_accessory=False,
    ),
    PremiumRecipe(
        slug="summer-commute-city-clean",
        scene="summer office commute",
        style="breezy polished",
        weather_options=("32C, sharp sun, cold office", "30C, humid city morning", "28C, bright commute"),
        prompt_templates=(
            "Build a summer office commute look that feels city-clean instead of flimsy.",
            "I need a hot-day work outfit that still looks like I meant it.",
            "Give me a polished warm-weather office look that can handle walking and still read sharp indoors.",
            "I want something lighter for work, but I do not want to lose the smart edge entirely.",
        ),
        title_templates=("City Heat, Office Stillness", "Warm-Weather Work Edit", "Summer Commute, Properly Finished"),
        rationale_templates=(
            "The shell-and-trouser line makes the look lighter without losing the discipline that keeps it office-ready.",
            "This works because the pieces are clearly summer-weight, but the overall silhouette is still deliberate and clean.",
            "It feels breathable in motion, then composed again the moment the day turns indoor and formal.",
            "The outfit solves the weather first, but it never looks like the weather won.",
        ),
        alternate_rationale_templates=(
            "The alternate adds back a little more crispness up top, which is useful when the day leans more office than commute.",
            "This version is a touch cleaner and more classic, which helps if the dress expectation rises once you arrive.",
            "It keeps the same summer logic, but the shirt-led route reads slightly more traditional and more boardroom-safe.",
            "The alternate sharpens the line again without asking you to carry unnecessary heat.",
        ),
        charm_templates=(
            "It still looks like officewear, just with the weather finally accounted for.",
            "Clean enough for the building, light enough for the sidewalk.",
            "It has summer logic without summer chaos.",
            "This is the version of polished that still survives the train platform.",
        ),
        badges=("summer office", "city clean", "commute tested"),
        primary_blueprint={"top": "shell top", "bottom": "wide-leg trousers", "outerwear": "cardigan", "shoes": "sandals", "accessory": "watch"},
        alternate_blueprint={"top": "shirt", "bottom": "trousers", "outerwear": "trench", "shoes": "loafers", "accessory": "watch"},
        distractor_blueprint={"top": "sweater", "bottom": "jeans", "outerwear": "coat", "shoes": "ankle boots", "accessory": "necklace"},
        palettes=(
            {"top": "cream", "bottom": "slate", "outerwear": "taupe", "shoes": "beige", "accessory": "ivory"},
            {"top": "oat", "bottom": "charcoal", "outerwear": "soft olive", "shoes": "stone", "accessory": "cream"},
            {"top": "ivory", "bottom": "dusty blue", "outerwear": "sage", "shoes": "taupe", "accessory": "oat"},
            {"top": "beige", "bottom": "ink", "outerwear": "cream", "shoes": "rosewood", "accessory": "stone"},
        ),
        profile_summary="When your warm-weather office outfits work, they keep their city polish even after the heat makes everything harder.",
        closet_gaps=("A stronger breathable work shoe would add range to summer office rotation.",),
        reminder_flags=("Rotate your lightest work layers so humid-weather outfits do not all start to blur together.",),
        include_primary_accessory=True,
        include_alternate_accessory=True,
    ),
    PremiumRecipe(
        slug="shoot-clean-hero",
        scene="content shoot",
        style="photo ready",
        weather_options=("25C, mixed indoor and outdoor shoot", "22C, daylight studio", "20C, city shoot day"),
        prompt_templates=(
            "I need a content-shoot look that has a clear focal point but still feels wearable off camera.",
            "Build a photo-day outfit that looks intentional in frame without drifting into costume.",
            "Give me something for a content-heavy day that still feels like real clothes, just sharper.",
            "I want the outfit to have presence in photos, but I still need to move around in it all day.",
        ),
        title_templates=("Photo-Ready, Still Real", "Clean Hero Look", "Frame-Worthy Without Costume Energy"),
        rationale_templates=(
            "The overshirt and denim base keep the outfit grounded, while the cleaner shell and sharper shoe make it hold up in the frame.",
            "This works because it gives the camera one clear story, but the outfit still behaves like something you can live in all day.",
            "The silhouette is more intentional than normal daywear, but it stops before it becomes performance dressing.",
            "It gives the photo something to lock onto without sacrificing movement or credibility off set.",
        ),
        alternate_rationale_templates=(
            "The alternate pushes the styling slightly further through the jacket and trouser line, which is useful when the frame needs a cleaner read.",
            "This version keeps the same photo logic, but it looks a touch more editorial and a touch less everyday.",
            "It still feels grounded, but the alternate sharpens the silhouette so the outfit holds a little more presence under the lens.",
            "The second option adds refinement without falling into costume territory.",
        ),
        charm_templates=(
            "It photographs like a plan, not a panic.",
            "Strong enough for the frame, easy enough for the whole day.",
            "You can keep the camera on without turning into a costume rack.",
            "It gives the lens something to love and the body room to keep going.",
        ),
        badges=("photo ready", "hero piece", "wearable off set"),
        primary_blueprint={"top": "shell top", "bottom": "relaxed denim", "outerwear": "overshirt", "shoes": "trainers", "accessory": "necklace"},
        alternate_blueprint={"top": "blouse", "bottom": "wide-leg trousers", "outerwear": "jacket", "shoes": "slingbacks", "accessory": "necklace"},
        distractor_blueprint={"top": "tee", "bottom": "tailored shorts", "outerwear": "cardigan", "shoes": "sandals", "accessory": "watch"},
        palettes=(
            {"top": "ivory", "bottom": "soft olive", "outerwear": "oat", "shoes": "beige", "accessory": "stone"},
            {"top": "beige", "bottom": "taupe", "outerwear": "slate", "shoes": "cream", "accessory": "ivory"},
            {"top": "oat", "bottom": "sage", "outerwear": "taupe", "shoes": "stone", "accessory": "cream"},
            {"top": "cream", "bottom": "rosewood", "outerwear": "dusty blue", "shoes": "taupe", "accessory": "oat"},
        ),
        profile_summary="Your strongest photo-day outfits stay grounded in reality, then add one clean signal that reads beautifully on camera.",
        closet_gaps=("A stronger visual hero accessory would add range to photo-day styling without forcing bigger clothes.",),
        reminder_flags=("Keep one most reliable camera-friendly layer reserved for days with a full content schedule.",),
        include_primary_accessory=True,
        include_alternate_accessory=True,
    ),
    PremiumRecipe(
        slug="shoot-column-frame",
        scene="content shoot",
        style="photo ready",
        weather_options=("21C, bright daylight", "23C, mixed studio and street", "19C, cool creative workday"),
        prompt_templates=(
            "Build a content-shoot outfit that looks clean and memorable in frame, but still like something I would actually wear.",
            "I need an outfit for a creative day with cameras around that still feels grounded in real dressing.",
            "Give me something for a photo-heavy workday that feels current and not over-styled.",
            "I want a stronger look for a shoot day, but I do not want to feel dressed up as a concept.",
        ),
        title_templates=("Frame First, Still Honest", "Creative-Day Precision", "Stronger Line, Same Person"),
        rationale_templates=(
            "The column-and-blazer structure gives the frame a cleaner shape, while the rib layer keeps it from feeling too staged.",
            "This lands because the silhouette is clear and memorable, but the materials still feel like real clothes instead of costume pieces.",
            "The outfit is intentionally more directional, yet it still feels believable on a working creative day.",
            "It gives the image more shape and authority without making the styling too loud to live in.",
        ),
        alternate_rationale_templates=(
            "The alternate softens the structure through a looser jacket route, which makes the same idea feel more casual and less built.",
            "This version keeps the strong visual read, but the more relaxed mix makes it easier for a full day of movement.",
            "It still works in frame, just with more ease and less sharpness through the body line.",
            "The second option keeps the photo discipline but gives you a slightly easier day inside it.",
        ),
        charm_templates=(
            "It gives the frame a point of view without giving you a costume to carry.",
            "The line is stronger, but the person is still fully visible.",
            "Clean enough for the lens, grounded enough for the whole day.",
            "This one feels styled, not manufactured.",
        ),
        badges=("frame ready", "clean line", "creative polish"),
        primary_blueprint={"top": "rib tee", "bottom": "column skirt", "outerwear": "cropped blazer", "shoes": "trainers", "accessory": "necklace"},
        alternate_blueprint={"top": "shell top", "bottom": "relaxed denim", "outerwear": "overshirt", "shoes": "trainers", "accessory": "necklace"},
        distractor_blueprint={"top": "tee", "bottom": "jeans", "outerwear": "coat", "shoes": "ankle boots", "accessory": "watch"},
        palettes=(
            {"top": "stone", "bottom": "charcoal", "outerwear": "taupe", "shoes": "ivory", "accessory": "cream"},
            {"top": "oat", "bottom": "ink", "outerwear": "rosewood", "shoes": "sage", "accessory": "ivory"},
            {"top": "cream", "bottom": "cocoa", "outerwear": "dusty blue", "shoes": "taupe", "accessory": "oat"},
            {"top": "beige", "bottom": "slate", "outerwear": "soft olive", "shoes": "stone", "accessory": "cream"},
        ),
        profile_summary="When the frame matters, your best outfits sharpen the line without stepping outside your actual taste.",
        closet_gaps=("A stronger photo-day jacket would expand styling range without forcing bigger wardrobe changes.",),
        reminder_flags=("Keep one most reliable camera-sharp silhouette aside for important creative shoots.",),
        include_primary_accessory=True,
        include_alternate_accessory=False,
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a premium hand-polished refinement set for high-value llm-recommender scenes.")
    parser.add_argument("--train-variants-per-recipe", type=int, default=24)
    parser.add_argument("--eval-variants-per-recipe", type=int, default=6)
    parser.add_argument("--seed", type=int, default=20260411)
    parser.add_argument("--output-dir", default=str(ROOT))
    return parser.parse_args()


def build_slot_item(item_id: int, slot: str, category: str, color: str) -> dict:
    pattern = PATTERN_INDEX[slot][category]
    return build_item(item_id, pattern, color)


def make_look(start_id: int, blueprint: dict[str, str], palette: dict[str, str]) -> dict[str, dict]:
    return {
        "top": build_slot_item(start_id + 1, "top", blueprint["top"], palette["top"]),
        "bottom": build_slot_item(start_id + 2, "bottom", blueprint["bottom"], palette["bottom"]),
        "outerwear": build_slot_item(start_id + 3, "outerwear", blueprint["outerwear"], palette["outerwear"]),
        "shoes": build_slot_item(start_id + 4, "shoes", blueprint["shoes"], palette["shoes"]),
        "accessory": build_slot_item(start_id + 5, "accessory", blueprint["accessory"], palette["accessory"]),
    }


def build_distractors(start_id: int, recipe: PremiumRecipe) -> list[dict]:
    loud_palette = {"top": "bright red", "bottom": "neon green", "outerwear": "metallic silver", "shoes": "hot pink", "accessory": "sharp orange"}
    return [
        build_slot_item(start_id + 1, "top", recipe.distractor_blueprint["top"], loud_palette["top"]),
        build_slot_item(start_id + 2, "bottom", recipe.distractor_blueprint["bottom"], loud_palette["bottom"]),
        build_slot_item(start_id + 3, "outerwear", recipe.distractor_blueprint["outerwear"], loud_palette["outerwear"]),
        build_slot_item(start_id + 4, "shoes", recipe.distractor_blueprint["shoes"], loud_palette["shoes"]),
        build_slot_item(start_id + 5, "accessory", recipe.distractor_blueprint["accessory"], loud_palette["accessory"]),
    ]


def select_text(values: tuple[str, ...], index: int) -> str:
    return values[index % len(values)]


def build_recipe_row(sample_id: int, recipe: PremiumRecipe, variant_index: int, rng: random.Random) -> dict:
    primary_palette = recipe.palettes[variant_index % len(recipe.palettes)]
    alternate_palette = recipe.palettes[(variant_index + 1) % len(recipe.palettes)]

    primary = make_look(sample_id * 100, recipe.primary_blueprint, primary_palette)
    alternate = make_look(sample_id * 100 + 10, recipe.alternate_blueprint, alternate_palette)
    distractors = build_distractors(sample_id * 100 + 20, recipe)
    weather = select_text(recipe.weather_options, variant_index)
    prompt = select_text(recipe.prompt_templates, variant_index)

    wardrobe_items = [*primary.values(), *alternate.values(), *distractors]

    primary_ids = [
        primary["outerwear"]["id"],
        primary["top"]["id"],
        primary["bottom"]["id"],
        primary["shoes"]["id"],
    ]
    if recipe.include_primary_accessory:
        primary_ids.append(primary["accessory"]["id"])

    alternate_ids = [
        alternate["outerwear"]["id"],
        alternate["top"]["id"],
        alternate["bottom"]["id"],
        alternate["shoes"]["id"],
    ]
    if recipe.include_alternate_accessory:
        alternate_ids.append(alternate["accessory"]["id"])

    row = {
        "instruction": "You are AI Wardrobe's outfit recommendation assistant. Return grounded JSON only and use only wardrobe item ids that exist in the input.",
        "input": {
            "prompt": prompt,
            "weather": weather,
            "scene": recipe.scene,
            "style": recipe.style,
            "wardrobe_items": wardrobe_items,
        },
        "output": {
            "source": "premium-handcrafted",
            "outfits": [
                {
                    "title": select_text(recipe.title_templates, variant_index),
                    "rationale": select_text(recipe.rationale_templates, variant_index),
                    "item_ids": primary_ids,
                    "confidence": round(rng.uniform(0.89, 0.97), 2),
                    "confidence_label": "high fit",
                    "key_item_id": primary["outerwear"]["id"],
                    "substitute_item_ids": [alternate["outerwear"]["id"], alternate["top"]["id"]],
                    "reason_badges": list(recipe.badges),
                    "charm_copy": select_text(recipe.charm_templates, variant_index),
                    "mood_emoji": "sparkles",
                },
                {
                    "title": "Change Another Look",
                    "rationale": select_text(recipe.alternate_rationale_templates, variant_index),
                    "item_ids": alternate_ids,
                    "confidence": round(rng.uniform(0.79, 0.90), 2),
                    "confidence_label": "strong alternate",
                    "key_item_id": alternate["outerwear"]["id"],
                    "substitute_item_ids": [primary["top"]["id"], primary["bottom"]["id"]],
                    "reason_badges": ["alternate hero", "same scene", "editorial restraint"],
                    "charm_copy": "This is the cleaner switch when you want the same signal with a different emphasis.",
                    "mood_emoji": "sparkles",
                },
            ],
            "agent_trace": [
                {"node": "Router Agent", "summary": f"Detected a high-value {recipe.scene} moment with a {recipe.style} direction."},
                {"node": "Retriever Agent", "summary": "Ranked wardrobe items for polish, relevance, repeat value, and distractor risk."},
                {"node": "Stylist Agent", "summary": "Built a primary hero look and a second option that shifts the silhouette without breaking scene fit."},
                {"node": "Verifier Agent", "summary": "Checked weather fit, tone consistency, and product-ready language before returning the result."},
            ],
            "profile_summary": recipe.profile_summary,
            "closet_gaps": list(recipe.closet_gaps),
            "reminder_flags": list(recipe.reminder_flags),
        },
    }

    errors = audit_example(row)
    if errors:
        raise ValueError(f"Premium sample {sample_id} failed audit: {errors}")
    return row


def generate_premium_rows(train_variants_per_recipe: int, eval_variants_per_recipe: int, seed: int) -> tuple[list[dict], list[dict]]:
    train_rows: list[dict] = []
    eval_rows: list[dict] = []
    sample_id = 800000

    for recipe_index, recipe in enumerate(PREMIUM_RECIPES):
        for variant_index in range(train_variants_per_recipe):
            rng = random.Random(seed + recipe_index * 1000 + variant_index)
            train_rows.append(build_recipe_row(sample_id, recipe, variant_index, rng))
            sample_id += 1

        for variant_index in range(eval_variants_per_recipe):
            rng = random.Random(seed + 900000 + recipe_index * 1000 + variant_index)
            eval_rows.append(build_recipe_row(sample_id, recipe, variant_index + 100, rng))
            sample_id += 1

    return train_rows, eval_rows


def write_rows(path: Path, rows: list[dict]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir).expanduser().resolve()
    ensure_directory(output_dir)

    train_rows, eval_rows = generate_premium_rows(args.train_variants_per_recipe, args.eval_variants_per_recipe, args.seed)
    write_rows(output_dir / "train.premium.jsonl", train_rows)
    write_rows(output_dir / "eval.premium.jsonl", eval_rows)

    print(f"Wrote {len(train_rows)} premium train rows to {output_dir / 'train.premium.jsonl'}")
    print(f"Wrote {len(eval_rows)} premium eval rows to {output_dir / 'eval.premium.jsonl'}")


if __name__ == "__main__":
    main()
