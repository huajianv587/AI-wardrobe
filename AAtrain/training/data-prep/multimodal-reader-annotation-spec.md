# Multimodal Reader Annotation Spec

Use this guide to build a multimodal garment-attribute dataset that is worth fine-tuning on.

## Goal

The multimodal reader should learn to look at a single garment image and return stable wardrobe metadata that the product can actually use:

1. short `tags`
2. plausible `occasions`
3. one clear `style_notes` sentence
4. stable attribute slots such as `color_family`, `fabric_guess`, `silhouette`, `season`, `mood`, and `category`

## Required Output Contract

Each row should keep the same output keys:

```json
{
  "tags": ["blazer", "camel", "earth", "tailored", "wool-blend"],
  "occasions": ["office", "meeting"],
  "style_notes": "这件驼色西装外套质感挺括，线条利落，适合通勤和见人场景穿着。",
  "color_family": "earth",
  "dominant_color": "camel",
  "fabric_guess": "wool-blend",
  "silhouette": "structured layer",
  "season": "autumn-winter",
  "mood": "sharp polished",
  "category": "blazer"
}
```

## High-Quality Row Rules

1. The image should show one clear hero garment.
2. Background clutter should be low enough that the garment reads immediately.
3. `tags` should be useful retrieval tags, not vague adjectives.
4. `occasions` should stay short, usually 2 items.
5. `style_notes` should sound product-ready, not benchmark-style.
6. `fabric_guess` can be a best-effort guess, but it should stay believable.
7. Do not overclaim invisible details.

## Recommended Split

For a strong first seed set:

- train: `2400`
- eval: `300`

Keep category balance roughly across:

- tops
- outerwear
- bottoms
- dresses
- shoes
- bags

## Review Checklist

Every row should pass:

- image exists on disk
- JSON parses successfully
- required keys are present
- tags are non-empty and grounded
- occasions are plausible for the garment
- style_notes is concise and readable
- no mojibake

## Acceptance Gates

Do not call the multimodal reader ready unless the eval set reaches:

- JSON validity: `>= 99%`
- image-path validity: `100%`
- reviewer pass rate for category and color: `>= 90%`
- reviewer pass rate for occasion fit: `>= 80%`
- reviewer pass rate for style note usefulness: `>= 80%`
