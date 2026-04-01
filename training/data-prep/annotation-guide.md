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
- `confidence_label`: for example `很懂你`, `相当稳`
- `reason_badges`: 2 to 4 short tags
- `charm_copy`: one cute product-style line

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

## Good first target

Before training, aim for:

- train: 100 to 300 rows
- eval: 20 to 50 rows

That is enough for your first Stage-1 test run.
