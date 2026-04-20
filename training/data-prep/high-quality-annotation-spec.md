# High-Quality Annotation Spec

Use this guide to build a recommender dataset that is actually worth training on.

## Goal

The target is not "more rows at any cost".
The target is a dataset that teaches the model to:

1. use only the wardrobe items that exist in the input
2. compose one coherent main look and one sensible alternate
3. explain the choice in product-ready language
4. stay stable in JSON format
5. avoid hallucinating missing garments

## Required Output Contract

Each training row should keep the same top-level structure:

```json
{
  "instruction": "You are AI Wardrobe's outfit recommendation assistant. Return grounded JSON only.",
  "input": {
    "prompt": "I need an office look for a mild rainy commute.",
    "weather": "18C, light rain, indoor AC",
    "scene": "office commute",
    "style": "soft formal",
    "wardrobe_items": []
  },
  "output": {
    "source": "curated-train",
    "outfits": [
      {
        "title": "Rain-Ready Soft Tailoring",
        "rationale": "The shirt and trouser base stays office-appropriate, while the weatherproof outer layer keeps the look practical for a damp commute.",
        "item_ids": [101, 205, 309, 412],
        "confidence": 0.91,
        "confidence_label": "high fit",
        "key_item_id": 309,
        "substitute_item_ids": [310],
        "reason_badges": ["office ready", "rain aware", "soft structure"],
        "charm_copy": "This one keeps the day calm, polished, and easy to move through.",
        "mood_emoji": "sparkles"
      }
    ],
    "agent_trace": [],
    "profile_summary": "Your strongest outfits tend to pair clean structure with one softer layer.",
    "closet_gaps": [],
    "reminder_flags": []
  }
}
```

## Non-Negotiable Label Rules

1. `item_ids` must exist in `input.wardrobe_items`.
2. The chosen look must match the scene and weather.
3. The rationale must explain fit, color, comfort, silhouette, or practicality.
4. The model must not invent a garment that is not present.
5. `reason_badges` should be short and useful, usually 2 to 4.
6. `charm_copy` should sound warm and product-ready, not generic model prose.
7. If the closet is too sparse, the row should teach a grounded fallback rather than hallucinate a full outfit.

## What Makes A Row High Quality

High-quality rows have all of these:

- clear user goal
- enough wardrobe choices to force a real decision
- at least one tempting but wrong distractor
- a believable main look
- a believable alternate look
- concise rationale
- no schema drift

Low-quality rows usually have one or more of these:

- only one possible item per slot
- no distractors
- vague prompt like "pick something nice"
- rationale that just repeats the prompt
- repeated canned phrasing across too many rows
- outputs that ignore weather or scene

## Preferred Scene Mix

For launch-quality coverage, bias toward the scenes users actually need:

| Scene bucket | Recommended share |
| --- | --- |
| Office / commute | 25% |
| Everyday casual / errands / coffee | 20% |
| Date / dinner / social | 12% |
| Travel / packing / long-wear comfort | 12% |
| Weather-specific cases | 12% |
| Video call / creator / photo-friendly | 8% |
| Event / smart casual / museum / brunch | 11% |

## Hard Negative Coverage

At least 8-12% of rows should include strong distractors:

- beautiful but wrong-for-weather pieces
- visually strong but over-formal pieces
- repeated hero pieces that should be rotated out
- color clashes
- wrong comfort level for the scene
- wrong silhouette for the stated goal

## Phase Mix Table

These totals refer to curated supervised rows, not raw public-source metadata.

### 500-row phase

| Bucket | Count | Why |
| --- | ---: | --- |
| Private product-style core rows | 320 | Teaches your real product voice and output schema |
| Public-source adapted rewrites | 70 | Expands wording and garment vocabulary |
| Hard negatives | 45 | Prevents naive selection behavior |
| Sparse-closet / setup rows | 20 | Teaches safe fallback behavior |
| Long-tail scene rows | 45 | Covers tricky but important scenarios |

Recommended split:

- train: 420
- eval: 80

### 1000-row phase

| Bucket | Count | Why |
| --- | ---: | --- |
| Private product-style core rows | 680 | Still the main quality driver |
| Public-source adapted rewrites | 120 | More lexical and category breadth |
| Hard negatives | 90 | Improves ranking precision |
| Sparse-closet / setup rows | 30 | Keeps edge behavior stable |
| Long-tail scene rows | 80 | Adds weather and silhouette edge cases |

Recommended split:

- train: 850
- eval: 150

### 3000-row phase

| Bucket | Count | Why |
| --- | ---: | --- |
| Private product-style core rows | 2100 | This is where quality really compounds |
| Public-source adapted rewrites | 300 | Broadens fashion wording without dominating the corpus |
| Hard negatives | 270 | Improves robustness and reduces flashy mistakes |
| Sparse-closet / setup rows | 90 | Keeps empty-closet behavior reliable |
| Long-tail scene rows | 240 | Adds rainy, travel, temperature-swing, and formal edge cases |

Recommended split:

- train: 2550
- eval: 450

### 5000+-row strong-launch target

If you want a stronger first production candidate, a practical next step is:

- train: `5200`
- eval: `600`

Keep the same proportions as the 3000-row phase, but expand these buckets first:

- office / commute
- casual / errands
- weather-specific cases
- hard negatives
- sparse-closet fallbacks

## Review Checklist

Every row should pass this checklist before it reaches train or eval:

- JSON parses successfully
- `instruction`, `input`, and `output` all exist
- every selected `item_id` exists in the input
- the primary look covers the key slots for the scene
- the alternate look is meaningfully different
- the rationale mentions a real decision factor
- the style sounds like your product, not a benchmark artifact
- there is no mojibake or encoding corruption

## Recommended Acceptance Gates

Do not call the model "ready" unless the eval set meets at least these:

- JSON validity: `>= 99%`
- grounded `item_id` accuracy: `100%`
- scene-fit reviewer pass rate: `>= 85%`
- weather-fit reviewer pass rate: `>= 85%`
- alternate-look usefulness pass rate: `>= 75%`
- overall human preference win rate vs heuristic baseline: `>= 70%`

## Best Practical Advice

If you only have time for one thing, do this:

- write more private product-style rows

That will improve the deployed recommender faster than adding another large public benchmark dump.
