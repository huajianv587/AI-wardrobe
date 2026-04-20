# Annotation Guide For Stage-1 LLM Recommender

Use this guide when filling `train.jsonl` and `eval.jsonl`.

## What you are labeling

You are not labeling raw images here.

You are labeling:

- user need
- closet candidates
- best outfit choice
- short explanation
- product-style output tone

## How to fill `output`

Each row should produce:

- `title`: short outfit name
- `rationale`: 1-2 sentence reason
- `item_ids`: ids chosen from `wardrobe_items`
- `confidence_label`: for example `high fit` or `strong alternate`
- `reason_badges`: 2 to 4 short tags
- `charm_copy`: one warm product-style line

## Labeling rules

1. `item_ids` must come from the row's `wardrobe_items`
2. Prefer one complete look:
   - top
   - bottom
   - shoes
   - optional outerwear or accessory
3. `rationale` should explain scene fit, color, comfort, or silhouette
4. `charm_copy` should sound like the app understands the user
5. Keep output style stable across samples

## Quality target

For a stronger product-ready training run, aim for:

- train: `5200+` rows
- eval: `600+` rows

Use `validate_llm_jsonl.py` for schema checks and `audit_curated_llm_dataset.py` for higher-level quality checks before training.
