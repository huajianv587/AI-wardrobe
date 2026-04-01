# Training Workspace

This directory is where you prepare and launch model work for the product.

## What belongs here

- dataset notes and conversion steps
- LoRA / fine-tune configs
- evaluation plans
- launch scripts

## Stage 1 priority

Only train or prepare the pieces that help the web product close first:

1. `llm-recommender`
2. `image-processor`

## Recommended workflow

1. download datasets into `model_training/datasets/<worker-name>/`
2. export cleaned training pairs from `training/data-prep/`
3. fine-tune or prepare checkpoints using `training/configs/`
4. save checkpoints into `model_training/checkpoints/<worker-name>/`
5. let `ai-services/<worker-name>/` load them through FastAPI + Docker

## Important split

- `training/` = scripts, plans, configs
- `model_training/` = actual datasets, checkpoints, outputs

Keep large datasets and checkpoints out of git.
