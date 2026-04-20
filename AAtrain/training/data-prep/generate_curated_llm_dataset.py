from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "model_training" / "datasets" / "llm-recommender"
DEFAULT_TRAIN_SIZE = 5200
DEFAULT_EVAL_SIZE = 600


@dataclass(frozen=True)
class Scenario:
    slug: str
    scene: str
    style: str
    weather_options: tuple[str, ...]
    prompt_templates: tuple[str, ...]
    required_badges: tuple[str, ...]
    preferred_tags: tuple[str, ...]
    title_templates: tuple[str, ...]
    rationale_templates: tuple[str, ...]
    charm_templates: tuple[str, ...]
    reminder_flags: tuple[str, ...]
    closet_gaps: tuple[str, ...]


@dataclass(frozen=True)
class ItemPattern:
    slot: str
    category: str
    template: str
    tags: tuple[str, ...]
    occasions: tuple[str, ...]
    style_notes: str


SCENARIOS: tuple[Scenario, ...] = (
    Scenario(
        slug="office-meeting",
        scene="office meeting",
        style="soft formal",
        weather_options=("22C, cloudy, indoor AC", "18C, light rain, indoor AC", "25C, bright but mild"),
        prompt_templates=(
            "I need an office look for a meeting and want to look polished without feeling severe.",
            "Build a calm office outfit that still reads credible in a meeting room.",
            "I want a gentle but professional work outfit for a presentation-heavy day.",
        ),
        required_badges=("office ready", "soft structure"),
        preferred_tags=("office", "smart", "clean", "repeat-friendly", "layering"),
        title_templates=("Soft Formal Balance", "Meeting-Day Soft Tailoring", "Polished Without The Hard Edge"),
        rationale_templates=(
            "The look stays work-appropriate through structured basics, then softens the overall tone with a lighter hero piece.",
            "This combination keeps the silhouette neat for a meeting while the palette prevents the outfit from feeling too sharp.",
            "The outfit reads professional first, but the textures and softer color story make it easier to wear all day.",
        ),
        charm_templates=(
            "This one does the serious part without making you disappear inside the outfit.",
            "It feels like the kind of look that can carry a long meeting day without getting stiff.",
            "Polished, calm, and still recognizably you.",
        ),
        reminder_flags=("Rotate hero blazers after two or three wears to keep the workweek fresh.",),
        closet_gaps=("A dependable dark trouser will make office rotation easier.",),
    ),
    Scenario(
        slug="coffee-errands",
        scene="coffee run",
        style="clean casual",
        weather_options=("26C, sunny", "24C, mild sun", "20C, breezy morning"),
        prompt_templates=(
            "I want a clean casual look for coffee and errands that still feels put together.",
            "Give me an easy outfit for a small day out, but not something flat or forgettable.",
            "Build a no-brainer casual look that still looks intentional in photos.",
        ),
        required_badges=("easy casual", "clean palette"),
        preferred_tags=("casual", "clean", "weekend", "easy", "walkable"),
        title_templates=("Clean Day-Off Uniform", "Coffee Run With Intention", "Easy But Still Collected"),
        rationale_templates=(
            "The outfit is built from easy pieces, but the palette and proportions keep it from feeling accidental.",
            "This keeps movement and comfort high while still giving you one visible focal piece.",
            "The combination stays low-effort, but the overall shape still feels edited rather than random.",
        ),
        charm_templates=(
            "This is the kind of look that makes a simple day feel a little more composed.",
            "Relaxed enough for errands, tidy enough to keep your mood up.",
            "Low effort on purpose, not by accident.",
        ),
        reminder_flags=("Keep one brighter casual top in rotation so easy outfits do not all blur together.",),
        closet_gaps=("A light everyday sneaker will increase casual outfit flexibility.",),
    ),
    Scenario(
        slug="date-dinner",
        scene="date dinner",
        style="soft elegant",
        weather_options=("24C, evening breeze", "20C, clear night", "27C, warm evening"),
        prompt_templates=(
            "I want a date-night look that feels soft and elegant without looking overworked.",
            "Build a dinner outfit that feels attractive but still natural.",
            "Give me a refined evening outfit that does not feel too formal.",
        ),
        required_badges=("date ready", "soft elegance"),
        preferred_tags=("date", "elegant", "soft", "evening", "refined"),
        title_templates=("Soft Evening Edit", "Gentle Dinner Polish", "Refined Without Trying Too Hard"),
        rationale_templates=(
            "The look uses a softer palette and a more refined focal piece, which makes it feel intentional without tipping into overdressed.",
            "This pairing stays flattering through shape and texture rather than relying on anything too loud.",
            "The outfit reads cared-for and romantic, but still close to an everyday version of you.",
        ),
        charm_templates=(
            "It feels like you tried, but not in a way that starts talking before you do.",
            "Refined enough for the evening, easy enough to still feel like yourself.",
            "Soft focus, not costume.",
        ),
        reminder_flags=("Save your strongest date-night shoe option for evenings when the outfit needs a lift.",),
        closet_gaps=("A refined small bag would unlock more evening combinations.",),
    ),
    Scenario(
        slug="travel-day",
        scene="travel day",
        style="comfortable neat",
        weather_options=("23C, mixed indoor and outdoor", "19C, airport AC and mild outdoors", "27C, bright travel day"),
        prompt_templates=(
            "Build a travel outfit that feels comfortable and walkable but still looks neat.",
            "I need something for a long train or airport day that does not collapse into sloppy.",
            "Give me a travel look that balances comfort, movement, and photo readiness.",
        ),
        required_badges=("travel easy", "walkable"),
        preferred_tags=("travel", "comfortable", "walkable", "layering", "clean"),
        title_templates=("Travel-Day Ease", "Comfort First, Still Sharp", "Easy Movement Edit"),
        rationale_templates=(
            "The outfit prioritizes movement and comfort first, then keeps the overall line clean enough to still look prepared.",
            "This combination travels well because the layers are practical and the hero piece stays visually controlled.",
            "The look is built to move, sit, and transition through changing temperatures without losing structure.",
        ),
        charm_templates=(
            "A good travel outfit should make the day feel shorter. This one does.",
            "Comfort carries the day here, but the outfit still keeps its shape.",
            "Flexible enough for the journey, neat enough for the photos after.",
        ),
        reminder_flags=("Keep one lightweight travel layer within reach for airport or train AC.",),
        closet_gaps=("A packable outer layer would improve long travel days.",),
    ),
    Scenario(
        slug="rainy-commute",
        scene="office commute",
        style="practical soft",
        weather_options=("17C, light rain, wind", "20C, steady drizzle", "14C, rainy and chilly"),
        prompt_templates=(
            "I need a rainy commute outfit that stays practical without feeling dull.",
            "Build something for a wet office commute that is easy to walk in but still presentable.",
            "Give me a rain-aware work look that does not lose all personality.",
        ),
        required_badges=("rain aware", "commute safe"),
        preferred_tags=("rain", "commute", "practical", "office", "walkable"),
        title_templates=("Rain-Ready Soft Tailoring", "Wet Weather, Calm Lines", "Commuter Practical With A Soft Finish"),
        rationale_templates=(
            "The outfit protects the commute first, then keeps the palette light enough that the whole look does not turn heavy.",
            "This combination balances walkability, weather awareness, and a work-appropriate finish.",
            "The practical pieces do the hard work here, while the softer styling choices keep the look human.",
        ),
        charm_templates=(
            "Rain is already enough drama. The outfit does not need to add more.",
            "It stays grounded in the weather without giving up all the good parts.",
            "Practical first, but still kind to your reflection.",
        ),
        reminder_flags=("Rotate weatherproof shoes so one rainy day does not dominate the whole week.",),
        closet_gaps=("A cleaner rain-friendly outer layer would make wet-day dressing easier.",),
    ),
    Scenario(
        slug="video-meeting",
        scene="video meeting",
        style="polished top focus",
        weather_options=("indoor AC, neutral temperature", "indoor AC, cool room", "work-from-home mild day"),
        prompt_templates=(
            "I need a video-call outfit where the top half matters more than the full look.",
            "Build a polished remote-work outfit that reads well on camera without becoming stiff.",
            "I want a camera-friendly work look that still feels relaxed off camera.",
        ),
        required_badges=("video ready", "top focus"),
        preferred_tags=("video", "office", "polished", "top-focus", "clean"),
        title_templates=("Camera-Ready Soft Polish", "Top-Half Hero Look", "Remote Work, Better Framed"),
        rationale_templates=(
            "The upper half gets the visual attention here, so the recommendation focuses on clean framing and color around the face.",
            "This look reads sharper on camera because the neckline and top layer carry the structure.",
            "The outfit is intentionally top-led, which makes it perform better in a cropped video frame.",
        ),
        charm_templates=(
            "It works for the call, then still works once the laptop closes.",
            "A little more presence where the camera can actually see it.",
            "The framing does half the work, and the outfit takes care of the rest.",
        ),
        reminder_flags=("Keep at least one camera-friendly top aside for high-visibility meeting days.",),
        closet_gaps=("A brighter face-framing top would strengthen video-call outfits.",),
    ),
    Scenario(
        slug="museum-brunch",
        scene="museum day",
        style="casual thoughtful",
        weather_options=("23C, cloudy", "21C, mild sun", "18C, breezy afternoon"),
        prompt_templates=(
            "Build a smart-casual outfit for a museum or brunch day that still feels easy to wear.",
            "I want something relaxed for a cultural day out, but not ordinary.",
            "Give me a casual thoughtful outfit that looks nice in daylight and still feels comfortable.",
        ),
        required_badges=("smart casual", "easy walk"),
        preferred_tags=("museum", "brunch", "city", "casual", "clean"),
        title_templates=("Casual, But Considered", "Museum-Day Soft Structure", "Daylight Smart Casual"),
        rationale_templates=(
            "The outfit keeps a relaxed base, then adds enough structure to feel intentional in a more visual setting.",
            "This works because the pieces are easy to walk in, but still create a more thoughtful overall line.",
            "The look stays friendly and wearable while giving the day a little more shape than a default casual outfit.",
        ),
        charm_templates=(
            "This is what 'I threw it on' looks like after taste has been quietly helping.",
            "Relaxed enough for the whole day, considered enough for the photos.",
            "It feels easy, but not forgettable.",
        ),
        reminder_flags=("Keep one city-day bag in rotation for museum or brunch plans.",),
        closet_gaps=("A more versatile smart-casual shoe would strengthen city-day outfits.",),
    ),
    Scenario(
        slug="client-presentation",
        scene="client presentation",
        style="sharp calm",
        weather_options=("21C, neutral office temperature", "19C, cool meeting room", "24C, mild workday"),
        prompt_templates=(
            "I need something presentation-ready that looks assured but not harsh.",
            "Build a client-facing outfit that feels clean and credible without overdoing it.",
            "I want to look sharp for a presentation, but still warm and approachable.",
        ),
        required_badges=("presentation ready", "clean authority"),
        preferred_tags=("office", "smart", "hero", "clean", "tailored"),
        title_templates=("Calm Presentation Polish", "Client-Facing, Without The Armor", "Soft Authority"),
        rationale_templates=(
            "The structure does the credibility work here, while the softer styling keeps the outfit from feeling over-defensive.",
            "This look holds up in a client-facing room because it is sharp in line but still relaxed in tone.",
            "The result feels intentional and trustworthy, without becoming too severe for a people-heavy day.",
        ),
        charm_templates=(
            "It looks like you prepared, just without making the outfit louder than the work.",
            "Quietly authoritative is doing the heavy lifting here.",
            "Sharp enough for the room, human enough for the conversation.",
        ),
        reminder_flags=("Keep one strongest presentation blazer reserved for high-visibility meetings.",),
        closet_gaps=("A cleaner presentation shoe option would improve high-stakes work outfits.",),
    ),
    Scenario(
        slug="conference-day",
        scene="conference day",
        style="polished comfortable",
        weather_options=("20C, venue AC, lots of walking", "23C, mixed indoor and outdoor", "18C, cool convention hall"),
        prompt_templates=(
            "Build a conference-day look that stays polished but survives a lot of walking.",
            "I need an event outfit that looks credible all day without getting stiff.",
            "Give me something for a long conference schedule that still feels presentable in photos.",
        ),
        required_badges=("event ready", "all-day wear"),
        preferred_tags=("office", "walkable", "clean", "layering", "smart"),
        title_templates=("Conference-Day Control", "Long Day, Still Put Together", "Walkable Professional"),
        rationale_templates=(
            "This combination keeps the overall line smart enough for the venue, while the practical pieces make the long day much easier to carry.",
            "The look works because it balances event polish with real movement and temperature changes.",
            "You still read prepared in a room full of people, but the outfit is built for actual stamina.",
        ),
        charm_templates=(
            "You can wear this through the keynote, the coffee line, and the dinner after.",
            "A lot of conference looks only work while standing still. This one does more than that.",
            "It keeps its shape even after the day stops being gentle.",
        ),
        reminder_flags=("Keep one reliable event tote ready for conference or workshop days.",),
        closet_gaps=("A smarter walkable shoe would strengthen conference-day rotation.",),
    ),
    Scenario(
        slug="weekend-market",
        scene="city errands",
        style="relaxed city",
        weather_options=("25C, mild sun", "18C, light breeze", "28C, bright city afternoon"),
        prompt_templates=(
            "Build a city-errands outfit that looks easy but still a little sharp.",
            "I want a relaxed outfit for walking around town that does not feel careless.",
            "Give me something for a full casual city day that still photographs well.",
        ),
        required_badges=("city easy", "walkable"),
        preferred_tags=("casual", "city", "clean", "walkable", "easy"),
        title_templates=("Casual City Control", "Walkable, Not Washed Out", "Weekend City Ease"),
        rationale_templates=(
            "The look stays comfortable enough for a long city day, but still gives the eye one or two controlled focal points.",
            "This works because the pieces move well together without drifting into full laziness.",
            "It feels casual first, but the cleaner structure keeps it visually awake.",
        ),
        charm_templates=(
            "Easy enough for the walking, clean enough for the mirror checks along the way.",
            "City casual can go flat fast. This one keeps a pulse.",
            "It has enough shape to keep the whole day feeling deliberate.",
        ),
        reminder_flags=("Keep one reliable city-day bag ready so casual plans stay easy to pack for.",),
        closet_gaps=("A crisp city jacket would unlock more weekend outfit variation.",),
    ),
    Scenario(
        slug="heatwave-commute",
        scene="summer office commute",
        style="breezy polished",
        weather_options=("31C, humid commute, cold office AC", "29C, bright heat", "33C, sticky city morning"),
        prompt_templates=(
            "I need a hot-weather office commute look that still feels polished.",
            "Build me something for a humid workday that does not look wilted by noon.",
            "Give me an office outfit for real heat, but keep it elegant.",
        ),
        required_badges=("heat aware", "office light"),
        preferred_tags=("office", "light", "clean", "summer", "commute"),
        title_templates=("Heatwave Work Polish", "Lightweight Office Control", "Hot Day, Still Composed"),
        rationale_templates=(
            "The outfit stays breathable enough for the commute, then keeps enough structure to still read office-ready once you arrive.",
            "This look handles heat by leaning lighter in fabrication and line, not by giving up all polish.",
            "The result stays clean and work-appropriate, but the pieces are easier to survive in on a real hot day.",
        ),
        charm_templates=(
            "It respects the weather without resigning the day to survival mode.",
            "Polish is harder to fake in heat. This one earns it.",
            "Light enough for the commute, finished enough for the office.",
        ),
        reminder_flags=("Keep one warm-weather office shoe ready so heat does not force the whole look casual.",),
        closet_gaps=("A lighter summer office layer would improve hot-day dressing.",),
    ),
    Scenario(
        slug="networking-evening",
        scene="networking event",
        style="elevated modern",
        weather_options=("22C, indoor event", "25C, warm evening", "19C, cool city night"),
        prompt_templates=(
            "Build a networking-event outfit that looks modern and polished, not too corporate.",
            "I need something for a social work event that feels sharp without turning stiff.",
            "Give me a city-evening outfit that can handle introductions, photos, and standing around.",
        ),
        required_badges=("social polish", "city sharp"),
        preferred_tags=("smart", "city", "refined", "clean", "evening"),
        title_templates=("Modern Event Polish", "Sharp, But Still Social", "Evening Network Edit"),
        rationale_templates=(
            "The outfit reads polished enough for the room, but the styling avoids tipping into full office mode.",
            "This combination works because it still feels social and modern, even while staying controlled.",
            "You get the event-ready finish without losing the ease that makes the whole thing approachable.",
        ),
        charm_templates=(
            "It gives the room something to remember, just without trying too hard.",
            "Polished enough to be noticed, relaxed enough to keep talking in.",
            "It feels current without asking for applause.",
        ),
        reminder_flags=("Keep one strongest city-evening layer ready for last-minute event invites.",),
        closet_gaps=("A sharper evening shoe would strengthen networking-event outfits.",),
    ),
    Scenario(
        slug="creator-shoot",
        scene="content shoot",
        style="photo ready",
        weather_options=("22C, daylight studio", "25C, mixed indoor and outdoor shoot", "20C, bright city light"),
        prompt_templates=(
            "I need a content-shoot look that reads strong in photos without becoming costume.",
            "Build an outfit for a photo-heavy day that still feels wearable off set.",
            "Give me a look with enough presence for content, but keep it grounded in real clothes.",
        ),
        required_badges=("photo ready", "hero piece"),
        preferred_tags=("city", "hero", "clean", "refined", "creative"),
        title_templates=("Photo-Ready, Still Real", "Clean Hero Look", "Content Day Without Costume Energy"),
        rationale_templates=(
            "The hero piece gives the outfit enough visual memory for photos, while the rest of the styling keeps it wearable.",
            "This works because there is one clear focal point, but the supporting pieces still feel believable in real life.",
            "The outfit is more visually intentional than everyday dressing, but it still avoids performance-for-performance's-sake.",
        ),
        charm_templates=(
            "It photographs like a plan, not a panic.",
            "Strong enough for the frame, easy enough for the whole day.",
            "You can keep the camera on without turning into a costume rack.",
        ),
        reminder_flags=("Reserve one reliable photo-friendly layer for content-heavy days.",),
        closet_gaps=("A stronger visual hero piece would add range to content-day outfits.",),
    ),
)


TOP_PATTERNS: tuple[ItemPattern, ...] = (
    ItemPattern("top", "shirt", "{color} fluid shirt", ("office", "clean", "smart", "layering"), ("office meeting", "office commute", "video meeting"), "Fluid and polished without feeling rigid."),
    ItemPattern("top", "knit top", "{color} fine-knit top", ("soft", "office", "clean", "layering"), ("office meeting", "video meeting", "museum day"), "A calm layer with a softer line."),
    ItemPattern("top", "blouse", "{color} draped blouse", ("soft", "date", "elegant", "clean"), ("date dinner", "museum day"), "Adds polish through drape rather than strict structure."),
    ItemPattern("top", "tee", "{color} heavyweight tee", ("casual", "clean", "weekend", "easy"), ("coffee run", "travel day"), "Easy base layer with cleaner structure than a flimsy tee."),
    ItemPattern("top", "oxford shirt", "{color} relaxed oxford shirt", ("casual", "clean", "travel", "layering"), ("travel day", "coffee run", "museum day"), "Slightly borrowed shape that still keeps the outfit tidy."),
    ItemPattern("top", "sweater", "{color} merino sweater", ("office", "clean", "warm", "soft"), ("office meeting", "office commute", "video meeting"), "Good for mild cold days and office AC."),
    ItemPattern("top", "polo knit", "{color} polo knit", ("office", "clean", "smart", "refined"), ("client presentation", "conference day", "networking event"), "Sits between relaxed and tailored in a useful way."),
    ItemPattern("top", "shell top", "{color} sleeveless shell", ("office", "light", "clean", "summer"), ("summer office commute", "client presentation", "networking event"), "Lighter warm-weather layer that still reads polished."),
    ItemPattern("top", "rib tee", "{color} rib tee", ("casual", "city", "clean", "easy"), ("city errands", "content shoot", "coffee run"), "Simple but more shaped than a basic tee."),
    ItemPattern("top", "poplin shirt", "{color} poplin shirt", ("office", "clean", "light", "summer"), ("summer office commute", "conference day", "office meeting"), "Crisp without feeling heavy in warmer weather."),
)

BOTTOM_PATTERNS: tuple[ItemPattern, ...] = (
    ItemPattern("bottom", "trousers", "{color} straight trouser", ("office", "smart", "repeat-friendly", "clean"), ("office meeting", "office commute", "video meeting"), "Reliable structure that anchors the outfit."),
    ItemPattern("bottom", "wide-leg trousers", "{color} wide-leg trouser", ("office", "soft", "smart", "clean"), ("office meeting", "museum day", "date dinner"), "Softens the line while still looking intentional."),
    ItemPattern("bottom", "jeans", "{color} straight jeans", ("casual", "clean", "weekend", "walkable"), ("coffee run", "travel day", "museum day"), "Casual but still controlled enough for polished daywear."),
    ItemPattern("bottom", "skirt", "{color} midi skirt", ("soft", "date", "elegant", "movement"), ("date dinner", "museum day"), "Moves easily and adds a softer visual rhythm."),
    ItemPattern("bottom", "tailored shorts", "{color} tailored shorts", ("summer", "clean", "casual", "city"), ("coffee run", "museum day"), "Warmer-weather option that still looks composed."),
    ItemPattern("bottom", "column skirt", "{color} column skirt", ("refined", "city", "clean", "evening"), ("networking event", "content shoot", "museum day"), "A cleaner longer line for sharper day-to-night dressing."),
    ItemPattern("bottom", "fluid trousers", "{color} fluid trouser", ("office", "light", "clean", "summer"), ("summer office commute", "client presentation", "conference day"), "Lighter and easier through the leg while staying polished."),
    ItemPattern("bottom", "relaxed denim", "{color} relaxed denim", ("casual", "city", "easy", "weekend"), ("city errands", "travel day", "content shoot"), "Looser casual option that still holds a shape."),
)

OUTERWEAR_PATTERNS: tuple[ItemPattern, ...] = (
    ItemPattern("outerwear", "blazer", "{color} relaxed blazer", ("office", "smart", "hero", "layering"), ("office meeting", "video meeting"), "Adds instant structure without going too sharp."),
    ItemPattern("outerwear", "cardigan", "{color} soft cardigan", ("soft", "layering", "office", "casual"), ("office meeting", "coffee run", "travel day"), "Useful softening layer for long wear."),
    ItemPattern("outerwear", "coat", "{color} weatherproof coat", ("rain", "commute", "practical", "outer"), ("office commute", "travel day"), "Protective layer for wet or uncertain weather."),
    ItemPattern("outerwear", "jacket", "{color} cropped jacket", ("city", "casual", "clean", "hero"), ("museum day", "coffee run", "travel day"), "Shorter layer that keeps the silhouette crisp."),
    ItemPattern("outerwear", "trench", "{color} lightweight trench", ("office", "city", "commute", "clean"), ("office commute", "client presentation", "conference day"), "Useful city layer that sharpens the line without too much bulk."),
    ItemPattern("outerwear", "overshirt", "{color} lightweight overshirt", ("casual", "travel", "layering", "easy"), ("travel day", "city errands", "content shoot"), "An easy top layer when you want structure without formality."),
    ItemPattern("outerwear", "cropped blazer", "{color} cropped blazer", ("city", "smart", "hero", "refined"), ("networking event", "content shoot", "date dinner"), "A sharper hero layer for polished but modern looks."),
)

SHOE_PATTERNS: tuple[ItemPattern, ...] = (
    ItemPattern("shoes", "loafers", "{color} leather loafers", ("office", "smart", "walkable", "clean"), ("office meeting", "office commute", "video meeting"), "Grounded and easy to repeat."),
    ItemPattern("shoes", "sneakers", "{color} everyday sneakers", ("casual", "walkable", "travel", "easy"), ("coffee run", "travel day", "museum day"), "Comfort-first option with enough polish for all-day wear."),
    ItemPattern("shoes", "ankle boots", "{color} weatherproof ankle boots", ("rain", "commute", "walkable", "practical"), ("office commute", "travel day"), "Useful when weather and walking both matter."),
    ItemPattern("shoes", "flats", "{color} refined flats", ("soft", "date", "office", "light"), ("date dinner", "office meeting", "museum day"), "Lighter visual finish for softer outfits."),
    ItemPattern("shoes", "slingbacks", "{color} low slingbacks", ("refined", "city", "evening", "light"), ("networking event", "date dinner", "content shoot"), "A cleaner evening-leaning finish without losing ease."),
    ItemPattern("shoes", "trainers", "{color} clean trainers", ("city", "walkable", "casual", "clean"), ("conference day", "content shoot", "city errands"), "Sharper casual shoe for long modern city days."),
    ItemPattern("shoes", "sandals", "{color} polished sandals", ("summer", "light", "refined", "city"), ("summer office commute", "date dinner", "networking event"), "Warm-weather option that still feels intentional."),
)

ACCESSORY_PATTERNS: tuple[ItemPattern, ...] = (
    ItemPattern("accessory", "bag", "{color} structured shoulder bag", ("office", "clean", "city", "hero"), ("office meeting", "museum day", "date dinner"), "Quietly sharpens the outfit."),
    ItemPattern("accessory", "bag", "{color} compact crossbody bag", ("casual", "travel", "city", "easy"), ("coffee run", "travel day", "museum day"), "Keeps the outfit light and practical."),
    ItemPattern("accessory", "jewelry", "{color} minimal earrings", ("soft", "elegant", "light", "refined"), ("date dinner", "video meeting", "office meeting"), "Small finish that lifts the upper half."),
    ItemPattern("accessory", "scarf", "{color} lightweight scarf", ("rain", "travel", "layering", "soft"), ("office commute", "travel day"), "Adds warmth and a gentle frame when needed."),
    ItemPattern("accessory", "tote", "{color} leather tote", ("office", "event", "clean", "city"), ("conference day", "client presentation", "office meeting"), "A practical structured carry piece for longer days."),
    ItemPattern("accessory", "necklace", "{color} pendant necklace", ("refined", "evening", "soft", "light"), ("networking event", "date dinner", "content shoot"), "A small finishing detail that lifts cleaner looks."),
    ItemPattern("accessory", "watch", "{color} slim watch", ("office", "clean", "smart", "repeat-friendly"), ("client presentation", "conference day", "office meeting"), "Adds a steadier more finished feel without shouting."),
)


MATCH_COLORS = ("ivory", "oat", "stone", "cream", "beige", "charcoal", "slate", "ink", "sage", "dusty blue", "rosewood", "soft olive", "cocoa", "taupe")
DISTRACTOR_COLORS = ("bright red", "neon green", "metallic silver", "hot pink", "sharp orange")

SCENARIO_WEIGHTS = {
    "office-meeting": 1.25,
    "coffee-errands": 1.00,
    "date-dinner": 0.82,
    "travel-day": 0.88,
    "rainy-commute": 0.80,
    "video-meeting": 0.58,
    "museum-brunch": 0.76,
    "client-presentation": 0.92,
    "conference-day": 0.84,
    "weekend-market": 0.82,
    "heatwave-commute": 0.62,
    "networking-evening": 0.60,
    "creator-shoot": 0.48,
}

LONG_TAIL_SCENARIOS = {"networking-evening", "creator-shoot", "heatwave-commute"}
ROW_PROFILE_WEIGHTS = {
    "core": 0.68,
    "adapted": 0.10,
    "hard_negative": 0.10,
    "sparse": 0.05,
    "long_tail": 0.07,
}

SCENE_CATEGORY_PREFERENCES: dict[str, dict[str, tuple[str, ...]]] = {
    "office meeting": {
        "top": ("shirt", "knit top", "sweater", "blouse", "polo knit", "poplin shirt"),
        "bottom": ("trousers", "wide-leg trousers", "fluid trousers"),
        "outerwear": ("blazer", "cardigan", "trench"),
        "shoes": ("loafers", "flats"),
    },
    "client presentation": {
        "top": ("shirt", "polo knit", "knit top", "poplin shirt", "shell top"),
        "bottom": ("trousers", "fluid trousers", "wide-leg trousers"),
        "outerwear": ("blazer", "trench", "cropped blazer"),
        "shoes": ("loafers", "flats", "slingbacks"),
    },
    "conference day": {
        "top": ("shirt", "polo knit", "knit top", "poplin shirt", "sweater"),
        "bottom": ("trousers", "fluid trousers", "wide-leg trousers", "jeans"),
        "outerwear": ("blazer", "cardigan", "trench", "overshirt"),
        "shoes": ("loafers", "trainers", "sneakers"),
    },
    "coffee run": {
        "top": ("tee", "rib tee", "oxford shirt", "knit top"),
        "bottom": ("jeans", "tailored shorts", "relaxed denim", "wide-leg trousers"),
        "outerwear": ("jacket", "cardigan", "overshirt"),
        "shoes": ("sneakers", "trainers", "ankle boots"),
    },
    "city errands": {
        "top": ("tee", "rib tee", "oxford shirt", "knit top"),
        "bottom": ("jeans", "relaxed denim", "tailored shorts", "wide-leg trousers"),
        "outerwear": ("jacket", "overshirt", "cardigan"),
        "shoes": ("sneakers", "trainers", "ankle boots"),
    },
    "museum day": {
        "top": ("oxford shirt", "knit top", "blouse", "shirt", "rib tee"),
        "bottom": ("jeans", "wide-leg trousers", "skirt", "column skirt"),
        "outerwear": ("jacket", "cardigan", "cropped blazer"),
        "shoes": ("sneakers", "flats", "trainers"),
    },
    "date dinner": {
        "top": ("blouse", "knit top", "shirt", "shell top"),
        "bottom": ("skirt", "wide-leg trousers", "column skirt"),
        "outerwear": ("cropped blazer", "cardigan", "blazer"),
        "shoes": ("flats", "slingbacks", "sandals"),
    },
    "travel day": {
        "top": ("tee", "rib tee", "oxford shirt", "sweater", "knit top"),
        "bottom": ("jeans", "relaxed denim", "trousers", "wide-leg trousers"),
        "outerwear": ("cardigan", "overshirt", "jacket", "coat"),
        "shoes": ("sneakers", "trainers", "ankle boots"),
    },
    "office commute": {
        "top": ("shirt", "sweater", "knit top", "poplin shirt"),
        "bottom": ("trousers", "wide-leg trousers", "fluid trousers"),
        "outerwear": ("coat", "trench", "blazer", "cardigan"),
        "shoes": ("ankle boots", "loafers", "flats"),
    },
    "summer office commute": {
        "top": ("shell top", "poplin shirt", "shirt", "blouse"),
        "bottom": ("fluid trousers", "trousers", "tailored shorts", "wide-leg trousers"),
        "outerwear": ("blazer", "trench", "cardigan"),
        "shoes": ("flats", "sandals", "loafers"),
    },
    "video meeting": {
        "top": ("shirt", "knit top", "blouse", "sweater", "polo knit"),
        "bottom": ("trousers", "wide-leg trousers"),
        "outerwear": ("blazer", "cardigan"),
        "shoes": ("loafers", "flats"),
    },
    "networking event": {
        "top": ("blouse", "polo knit", "knit top", "shell top"),
        "bottom": ("wide-leg trousers", "column skirt", "trousers"),
        "outerwear": ("cropped blazer", "blazer", "trench"),
        "shoes": ("slingbacks", "flats", "loafers"),
    },
    "content shoot": {
        "top": ("rib tee", "blouse", "shell top", "polo knit", "shirt"),
        "bottom": ("wide-leg trousers", "column skirt", "relaxed denim", "skirt"),
        "outerwear": ("cropped blazer", "jacket", "overshirt"),
        "shoes": ("trainers", "slingbacks", "flats"),
    },
}

SCENE_BLUEPRINTS: dict[str, tuple[dict[str, str], ...]] = {
    "office meeting": (
        {"top": "shirt", "bottom": "trousers", "outerwear": "blazer", "shoes": "loafers"},
        {"top": "knit top", "bottom": "wide-leg trousers", "outerwear": "blazer", "shoes": "flats"},
        {"top": "sweater", "bottom": "trousers", "outerwear": "cardigan", "shoes": "loafers"},
    ),
    "client presentation": (
        {"top": "polo knit", "bottom": "fluid trousers", "outerwear": "trench", "shoes": "loafers"},
        {"top": "shirt", "bottom": "trousers", "outerwear": "blazer", "shoes": "loafers"},
        {"top": "shell top", "bottom": "wide-leg trousers", "outerwear": "cropped blazer", "shoes": "slingbacks"},
    ),
    "conference day": (
        {"top": "polo knit", "bottom": "fluid trousers", "outerwear": "trench", "shoes": "trainers"},
        {"top": "poplin shirt", "bottom": "trousers", "outerwear": "blazer", "shoes": "loafers"},
        {"top": "knit top", "bottom": "jeans", "outerwear": "cardigan", "shoes": "trainers"},
    ),
    "coffee run": (
        {"top": "tee", "bottom": "jeans", "outerwear": "jacket", "shoes": "sneakers"},
        {"top": "rib tee", "bottom": "relaxed denim", "outerwear": "overshirt", "shoes": "trainers"},
        {"top": "oxford shirt", "bottom": "wide-leg trousers", "outerwear": "cardigan", "shoes": "sneakers"},
    ),
    "city errands": (
        {"top": "rib tee", "bottom": "relaxed denim", "outerwear": "overshirt", "shoes": "trainers"},
        {"top": "tee", "bottom": "jeans", "outerwear": "jacket", "shoes": "sneakers"},
        {"top": "knit top", "bottom": "wide-leg trousers", "outerwear": "cardigan", "shoes": "trainers"},
    ),
    "museum day": (
        {"top": "oxford shirt", "bottom": "jeans", "outerwear": "jacket", "shoes": "sneakers"},
        {"top": "blouse", "bottom": "column skirt", "outerwear": "cropped blazer", "shoes": "flats"},
        {"top": "knit top", "bottom": "wide-leg trousers", "outerwear": "cardigan", "shoes": "trainers"},
    ),
    "date dinner": (
        {"top": "blouse", "bottom": "skirt", "outerwear": "cropped blazer", "shoes": "slingbacks"},
        {"top": "shell top", "bottom": "column skirt", "outerwear": "cardigan", "shoes": "sandals"},
        {"top": "knit top", "bottom": "wide-leg trousers", "outerwear": "cropped blazer", "shoes": "flats"},
    ),
    "travel day": (
        {"top": "oxford shirt", "bottom": "jeans", "outerwear": "overshirt", "shoes": "sneakers"},
        {"top": "tee", "bottom": "relaxed denim", "outerwear": "jacket", "shoes": "trainers"},
        {"top": "sweater", "bottom": "trousers", "outerwear": "cardigan", "shoes": "ankle boots"},
    ),
    "office commute": (
        {"top": "sweater", "bottom": "trousers", "outerwear": "trench", "shoes": "ankle boots"},
        {"top": "shirt", "bottom": "wide-leg trousers", "outerwear": "coat", "shoes": "loafers"},
        {"top": "knit top", "bottom": "fluid trousers", "outerwear": "cardigan", "shoes": "ankle boots"},
    ),
    "summer office commute": (
        {"top": "poplin shirt", "bottom": "fluid trousers", "outerwear": "blazer", "shoes": "flats"},
        {"top": "shell top", "bottom": "wide-leg trousers", "outerwear": "cardigan", "shoes": "sandals"},
        {"top": "shirt", "bottom": "trousers", "outerwear": "trench", "shoes": "loafers"},
    ),
    "video meeting": (
        {"top": "blouse", "bottom": "trousers", "outerwear": "blazer", "shoes": "loafers"},
        {"top": "knit top", "bottom": "wide-leg trousers", "outerwear": "cardigan", "shoes": "flats"},
        {"top": "shirt", "bottom": "trousers", "outerwear": "blazer", "shoes": "flats"},
    ),
    "networking event": (
        {"top": "polo knit", "bottom": "column skirt", "outerwear": "cropped blazer", "shoes": "slingbacks"},
        {"top": "blouse", "bottom": "wide-leg trousers", "outerwear": "blazer", "shoes": "slingbacks"},
        {"top": "shell top", "bottom": "trousers", "outerwear": "cropped blazer", "shoes": "flats"},
    ),
    "content shoot": (
        {"top": "rib tee", "bottom": "column skirt", "outerwear": "cropped blazer", "shoes": "trainers"},
        {"top": "blouse", "bottom": "wide-leg trousers", "outerwear": "jacket", "shoes": "slingbacks"},
        {"top": "shell top", "bottom": "relaxed denim", "outerwear": "overshirt", "shoes": "trainers"},
    ),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a clean, curated Stage-1 llm-recommender dataset.")
    parser.add_argument("--train-size", type=int, default=DEFAULT_TRAIN_SIZE)
    parser.add_argument("--eval-size", type=int, default=DEFAULT_EVAL_SIZE)
    parser.add_argument("--seed", type=int, default=20260411)
    parser.add_argument("--output-dir", default=str(ROOT))
    return parser.parse_args()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def choose(rng: random.Random, values: tuple[str, ...] | list[str]) -> str:
    return values[rng.randrange(len(values))]


def build_item(item_id: int, pattern: ItemPattern, color: str) -> dict:
    return {
        "id": item_id,
        "name": pattern.template.format(color=color),
        "slot": pattern.slot,
        "category": pattern.category,
        "color": color,
        "brand": "AI Wardrobe Curated",
        "tags": list(pattern.tags),
        "occasions": list(pattern.occasions),
        "style_notes": pattern.style_notes,
    }


def tokenize(text: str) -> set[str]:
    return {token for token in text.replace("/", " ").replace("-", " ").split() if token}


def weighted_choice(rng: random.Random, values: list[str], weights: list[float]) -> str:
    return rng.choices(values, weights=weights, k=1)[0]


def weather_bonus(pattern: ItemPattern, weather: str) -> int:
    lowered = weather.lower()
    score = 0
    tags = set(pattern.tags)

    if any(token in lowered for token in ("rain", "drizzle", "wet")):
        if "rain" in tags or "practical" in tags or pattern.category in {"coat", "ankle boots", "trench"}:
            score += 3
        if pattern.category in {"tailored shorts", "sandals"}:
            score -= 3

    if any(token in lowered for token in ("hot", "humid", "summer", "warm")):
        if "light" in tags or "summer" in tags or pattern.category in {"shell top", "tailored shorts", "sandals", "fluid trousers", "poplin shirt"}:
            score += 2
        if pattern.category in {"sweater", "coat", "ankle boots"} or "warm" in tags:
            score -= 2

    if any(token in lowered for token in ("cold", "chilly", "wind", "cool", "ac")):
        if "layering" in tags or "warm" in tags or pattern.category in {"sweater", "cardigan", "coat", "trench", "ankle boots"}:
            score += 2

    if any(token in lowered for token in ("evening", "night")):
        if "refined" in tags or "elegant" in tags or pattern.category in {"blouse", "skirt", "column skirt", "slingbacks", "necklace"}:
            score += 1

    return score


def pattern_score(pattern: ItemPattern, scenario: Scenario, weather: str) -> int:
    score = 0
    scenario_tokens = tokenize(scenario.scene) | tokenize(scenario.style)
    pattern_tokens = set(pattern.tags)
    preferred_categories = SCENE_CATEGORY_PREFERENCES.get(scenario.scene, {}).get(pattern.slot, ())

    if scenario.scene in pattern.occasions:
        score += 4

    for occasion in pattern.occasions:
        overlap = tokenize(occasion) & tokenize(scenario.scene)
        if overlap:
            score += 2

    score += len(pattern_tokens & set(scenario.preferred_tags))
    score += len(pattern_tokens & scenario_tokens)
    score += weather_bonus(pattern, weather)

    if preferred_categories:
        if pattern.category in preferred_categories:
            score += 3
        else:
            score -= 1

    return score


def choose_pattern(rng: random.Random, patterns: tuple[ItemPattern, ...], scenario: Scenario, weather: str, *, match: bool) -> ItemPattern:
    scored = [(pattern, pattern_score(pattern, scenario, weather)) for pattern in patterns]
    if match:
        max_score = max(score for _, score in scored)
        candidates = [pattern for pattern, score in scored if score >= max(4, max_score - 1)]
        if not candidates:
            candidates = [pattern for pattern, score in scored if score == max_score]
    else:
        candidates = [pattern for pattern, score in scored if score <= 1]
        if not candidates:
            min_score = min(score for _, score in scored)
            candidates = [pattern for pattern, score in scored if score == min_score]
    return candidates[rng.randrange(len(candidates))]


def choose_color(rng: random.Random, *, match: bool) -> str:
    pool = MATCH_COLORS if match else DISTRACTOR_COLORS
    return pool[rng.randrange(len(pool))]


def choose_blueprint(rng: random.Random, scene: str, exclude: dict[str, str] | None = None) -> dict[str, str] | None:
    blueprints = list(SCENE_BLUEPRINTS.get(scene, ()))
    if exclude is not None:
        blueprints = [blueprint for blueprint in blueprints if blueprint != exclude]
    if not blueprints:
        return None
    return dict(blueprints[rng.randrange(len(blueprints))])


def choose_pattern_for_category(
    rng: random.Random,
    patterns: tuple[ItemPattern, ...],
    scenario: Scenario,
    weather: str,
    category: str | None,
    *,
    match: bool,
) -> ItemPattern:
    if category:
        filtered = tuple(pattern for pattern in patterns if pattern.category == category)
        if filtered:
            return choose_pattern(rng, filtered, scenario, weather, match=match)
    return choose_pattern(rng, patterns, scenario, weather, match=match)


def build_profile(rng: random.Random) -> str:
    keys = list(ROW_PROFILE_WEIGHTS.keys())
    weights = [ROW_PROFILE_WEIGHTS[key] for key in keys]
    return weighted_choice(rng, keys, weights)


def choose_scenario(rng: random.Random, profile: str) -> Scenario:
    if profile == "long_tail":
        candidates = [scenario for scenario in SCENARIOS if scenario.slug in LONG_TAIL_SCENARIOS]
    else:
        candidates = list(SCENARIOS)
    weights = [SCENARIO_WEIGHTS.get(scenario.slug, 1.0) for scenario in candidates]
    return rng.choices(candidates, weights=weights, k=1)[0]


def adapt_prompt(base_prompt: str, scenario: Scenario, profile: str, rng: random.Random) -> str:
    if profile == "adapted":
        options = (
            f"Give me the polished energy of a strong {scenario.scene} look, but keep it grounded in what I actually own. {base_prompt}",
            f"I want a cleaner, more product-ready version of this idea for {scenario.scene}. {base_prompt}",
            f"Keep the look stylish, but do not drift into editorial styling. {base_prompt}",
        )
        return choose(rng, options)

    if profile == "hard_negative":
        options = (
            f"There are a few tempting but wrong choices in this closet, so keep the answer disciplined. {base_prompt}",
            f"Please avoid flashy mistakes and keep the look grounded for {scenario.scene}. {base_prompt}",
        )
        return choose(rng, options)

    if profile == "sparse":
        options = (
            f"My closet is still a little thin, so keep the answer grounded and practical. {base_prompt}",
            f"I do not have a huge wardrobe yet. Please work with what is here. {base_prompt}",
        )
        return choose(rng, options)

    if profile == "long_tail":
        options = (
            f"Make this feel specific to the setting rather than like a generic outfit. {base_prompt}",
            f"I need this to still feel like me, but noticeably right for {scenario.scene}. {base_prompt}",
        )
        return choose(rng, options)

    return base_prompt


def compose_primary_rationale(base_rationale: str, profile: str) -> str:
    if profile == "hard_negative":
        return f"{base_rationale} It wins because it stays aligned with the scene instead of chasing louder but less useful pieces."
    if profile == "sparse":
        return f"{base_rationale} The choice also stays realistic for a closet that is still early in its build."
    if profile == "adapted":
        return f"{base_rationale} The final styling keeps the language and silhouette refined enough for a product-ready recommendation."
    return base_rationale


def compose_alternate_rationale(profile: str) -> str:
    if profile == "sparse":
        return "Keep the same reliable base, then rotate just one visible layer so the alternate still feels believable for a smaller closet."
    if profile == "hard_negative":
        return "This keeps the scene fit intact, but softens the focal point so the outfit stays controlled instead of chasing the louder distractors."
    if profile == "adapted":
        return "This version keeps the same overall mood, but slightly changes the styling emphasis so the recommendation feels less one-note."
    return "Keep the same scene fit, but rotate one visible hero piece so the outfit feels fresher without losing coherence."


def audit_example(example: dict) -> list[str]:
    errors: list[str] = []
    wardrobe_items = example.get("input", {}).get("wardrobe_items", [])
    outfits = example.get("output", {}).get("outfits", [])
    item_by_id = {item["id"]: item for item in wardrobe_items if isinstance(item, dict) and "id" in item}

    if len(wardrobe_items) < 8:
        errors.append("wardrobe too small")

    if len(outfits) != 2:
        errors.append("must contain exactly two outfits")
        return errors

    primary_ids = outfits[0].get("item_ids", [])
    alternate_ids = outfits[1].get("item_ids", [])
    all_ids = set(primary_ids) | set(alternate_ids)

    for item_id in all_ids:
        if item_id not in item_by_id:
            errors.append(f"missing item id {item_id}")

    primary_slots = {item_by_id[item_id]["slot"] for item_id in primary_ids if item_id in item_by_id}
    if not {"top", "bottom", "shoes"}.issubset(primary_slots):
        errors.append("primary outfit missing core slots")

    if len(set(primary_ids) ^ set(alternate_ids)) < 2:
        errors.append("alternate outfit not meaningfully different")

    scene = example.get("input", {}).get("scene", "")
    preferences = SCENE_CATEGORY_PREFERENCES.get(scene, {})
    for slot in ("top", "bottom", "shoes"):
        selected_categories = [item_by_id[item_id]["category"] for item_id in primary_ids if item_id in item_by_id and item_by_id[item_id]["slot"] == slot]
        if selected_categories and preferences.get(slot) and selected_categories[0] not in preferences[slot]:
            errors.append(f"scene mismatch for {slot}: {selected_categories[0]}")

    non_selected = [item for item in wardrobe_items if item.get("id") not in all_ids]
    if not any(item.get("color") in DISTRACTOR_COLORS for item in non_selected):
        errors.append("missing strong distractor")

    if not 2 <= len(outfits[0].get("reason_badges", [])) <= 4:
        errors.append("primary badges out of range")

    if len(outfits[0].get("rationale", "").split()) < 8:
        errors.append("primary rationale too short")

    if len(outfits[0].get("charm_copy", "").split()) < 4:
        errors.append("primary charm_copy too short")

    return errors


def build_wardrobe(sample_id: int, scenario: Scenario, weather: str, rng: random.Random, profile: str) -> tuple[list[dict], list[int], list[int]]:
    items: list[dict] = []
    next_id = sample_id * 100

    primary_blueprint = choose_blueprint(rng, scenario.scene)
    alternate_blueprint = choose_blueprint(rng, scenario.scene, exclude=primary_blueprint)

    primary_top = build_item(
        next_id + 1,
        choose_pattern_for_category(rng, TOP_PATTERNS, scenario, weather, primary_blueprint["top"] if primary_blueprint else None, match=True),
        choose_color(rng, match=True),
    )
    primary_bottom = build_item(
        next_id + 2,
        choose_pattern_for_category(rng, BOTTOM_PATTERNS, scenario, weather, primary_blueprint["bottom"] if primary_blueprint else None, match=True),
        choose_color(rng, match=True),
    )
    primary_outer = build_item(
        next_id + 3,
        choose_pattern_for_category(rng, OUTERWEAR_PATTERNS, scenario, weather, primary_blueprint["outerwear"] if primary_blueprint else None, match=True),
        choose_color(rng, match=True),
    )
    primary_shoes = build_item(
        next_id + 4,
        choose_pattern_for_category(rng, SHOE_PATTERNS, scenario, weather, primary_blueprint["shoes"] if primary_blueprint else None, match=True),
        choose_color(rng, match=True),
    )
    primary_accessory = build_item(next_id + 5, choose_pattern(rng, ACCESSORY_PATTERNS, scenario, weather, match=True), choose_color(rng, match=True))

    alt_top = build_item(
        next_id + 6,
        choose_pattern_for_category(rng, TOP_PATTERNS, scenario, weather, alternate_blueprint["top"] if alternate_blueprint else None, match=True),
        choose_color(rng, match=True),
    )
    alt_bottom = build_item(
        next_id + 7,
        choose_pattern_for_category(rng, BOTTOM_PATTERNS, scenario, weather, alternate_blueprint["bottom"] if alternate_blueprint else None, match=True),
        choose_color(rng, match=True),
    )
    alt_outer = build_item(
        next_id + 8,
        choose_pattern_for_category(rng, OUTERWEAR_PATTERNS, scenario, weather, alternate_blueprint["outerwear"] if alternate_blueprint else None, match=True),
        choose_color(rng, match=True),
    )
    alt_shoes = build_item(
        next_id + 9,
        choose_pattern_for_category(rng, SHOE_PATTERNS, scenario, weather, alternate_blueprint["shoes"] if alternate_blueprint else None, match=True),
        choose_color(rng, match=True),
    )
    distractor_top = build_item(next_id + 10, choose_pattern(rng, TOP_PATTERNS, scenario, weather, match=False), choose_color(rng, match=False))
    distractor_accessory = build_item(next_id + 11, choose_pattern(rng, ACCESSORY_PATTERNS, scenario, weather, match=False), choose_color(rng, match=False))

    items.extend(
        [
            primary_top,
            primary_bottom,
            primary_outer,
            primary_shoes,
            primary_accessory,
            alt_top,
            alt_bottom,
            alt_outer,
            alt_shoes,
            distractor_top,
            distractor_accessory,
        ]
    )

    if profile == "hard_negative":
        distractor_bottom = build_item(next_id + 12, choose_pattern(rng, BOTTOM_PATTERNS, scenario, weather, match=False), choose_color(rng, match=False))
        distractor_shoes = build_item(next_id + 13, choose_pattern(rng, SHOE_PATTERNS, scenario, weather, match=False), choose_color(rng, match=False))
        items.extend([distractor_bottom, distractor_shoes])

    primary_ids = [primary_outer["id"], primary_top["id"], primary_bottom["id"], primary_shoes["id"]]
    alternate_ids = [alt_outer["id"], alt_top["id"], alt_bottom["id"], alt_shoes["id"]]
    if profile == "sparse":
        items = [
            primary_top,
            primary_bottom,
            primary_outer,
            primary_shoes,
            primary_accessory,
            alt_top,
            alt_outer,
            distractor_top,
        ]
        alternate_ids = [alt_outer["id"], alt_top["id"], primary_bottom["id"], primary_shoes["id"]]
    return items, primary_ids, alternate_ids


def build_example(sample_id: int, scenario: Scenario, profile: str, rng: random.Random) -> dict:
    weather = choose(rng, list(scenario.weather_options))
    prompt = adapt_prompt(choose(rng, list(scenario.prompt_templates)), scenario, profile, rng)
    items, primary_ids, alternate_ids = build_wardrobe(sample_id, scenario, weather, rng, profile)
    primary_badges = list(dict.fromkeys([*scenario.required_badges, choose(rng, list(scenario.preferred_tags))]))[:4]
    closet_gaps = list(scenario.closet_gaps)
    reminder_flags = list(scenario.reminder_flags)

    if profile == "sparse":
        closet_gaps.append("A second reliable shoe option would make outfit rotation easier.")
        reminder_flags.append("As the closet grows, prioritize one versatile bottom before novelty pieces.")

    example = {
        "instruction": "You are AI Wardrobe's outfit recommendation assistant. Return grounded JSON only and use only wardrobe item ids that exist in the input.",
        "input": {
            "prompt": prompt,
            "weather": weather,
            "scene": scenario.scene,
            "style": scenario.style,
            "wardrobe_items": items,
        },
        "output": {
            "source": "curated-train",
            "outfits": [
                {
                    "title": choose(rng, list(scenario.title_templates)),
                    "rationale": compose_primary_rationale(choose(rng, list(scenario.rationale_templates)), profile),
                    "item_ids": primary_ids,
                    "confidence": round(rng.uniform(0.85, 0.96), 2) if profile != "sparse" else round(rng.uniform(0.80, 0.91), 2),
                    "confidence_label": "high fit",
                    "key_item_id": primary_ids[0],
                    "substitute_item_ids": [alternate_ids[0], alternate_ids[1]],
                    "reason_badges": primary_badges,
                    "charm_copy": choose(rng, list(scenario.charm_templates)),
                    "mood_emoji": "sparkles",
                },
                {
                    "title": "Change Another Look",
                    "rationale": compose_alternate_rationale(profile),
                    "item_ids": alternate_ids,
                    "confidence": round(rng.uniform(0.73, 0.87), 2),
                    "confidence_label": "strong alternate",
                    "key_item_id": alternate_ids[0],
                    "substitute_item_ids": [items[1]["id"], items[4]["id"]],
                    "reason_badges": ["alternate hero", "same scene", "lighter switch"],
                    "charm_copy": "This is the safer switch when you want the same mood with a different focal point.",
                    "mood_emoji": "sparkles",
                },
            ],
            "agent_trace": [
                {"node": "Router Agent", "summary": f"Parsed the main goal as {scenario.scene} with a {scenario.style} direction."},
                {"node": "Retriever Agent", "summary": "Ranked wardrobe items by slot, weather fit, scene relevance, and distractor risk."},
                {"node": "Stylist Agent", "summary": "Composed one primary look and one grounded alternate using only the provided wardrobe items."},
                {"node": "Verifier Agent", "summary": "Checked that the output remained weather-aware, scene-appropriate, and schema-stable."},
            ],
            "profile_summary": f"The strongest looks in this pattern usually combine {scenario.style} styling with one visible focal layer.",
            "closet_gaps": closet_gaps,
            "reminder_flags": reminder_flags,
        },
    }

    errors = audit_example(example)
    if errors:
        raise ValueError(f"Sample {sample_id} failed audit: {errors}")
    return example


def generate_rows(count: int, seed: int) -> list[dict]:
    rows: list[dict] = []
    for index in range(count):
        rng = random.Random(seed + index * 37)
        profile = build_profile(rng)
        scenario = choose_scenario(rng, profile)
        rows.append(build_example(index + 1, scenario, profile, rng))
    return rows


def write_rows(path: Path, rows: list[dict]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir).expanduser().resolve()
    ensure_directory(output_dir)

    train_rows = generate_rows(args.train_size, args.seed)
    eval_rows = generate_rows(args.eval_size, args.seed + 900000)

    write_rows(output_dir / "train.jsonl", train_rows)
    write_rows(output_dir / "eval.jsonl", eval_rows)

    print(f"Wrote {len(train_rows)} train rows to {output_dir / 'train.jsonl'}")
    print(f"Wrote {len(eval_rows)} eval rows to {output_dir / 'eval.jsonl'}")


if __name__ == "__main__":
    main()
