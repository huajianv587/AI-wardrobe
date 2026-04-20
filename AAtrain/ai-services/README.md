# AI Services

This directory is the worker layer of the project:

1. `backend/` keeps the product API stable
2. `ai-services/` hosts model-facing FastAPI workers
3. `training/` stores training and data-prep plans
4. `model_training/` stores local datasets, checkpoints, and exported outputs

## Stage Plan

### Stage 1: Web Closure

Build only these two workers first:

- `llm-recommender`
- `image-processor`

These two are enough to close the most important web loop:

- upload garment
- clean image / white background
- store wardrobe item
- generate outfit recommendation

### Stage 2: Mini Program Closure

Reuse the same backend and the same workers from Stage 1.

### Stage 3: App

Not the focus yet. Reuse the same service stack later.

## Worker Contract

Every worker should expose:

- `GET /health`
- `POST /infer`

The main backend already speaks this contract.

## Current Stage-1 Workers

### `llm-recommender`

- role: outfit recommendation and rationale
- default base model: `Qwen/Qwen2.5-7B-Instruct`
- training strategy: LoRA / QLoRA
- priority: highest

### `image-processor`

- role: cutout / white background / optional upscale
- default pretrained stack:
  - `briaai/RMBG-2.0`
  - `xinntao/Real-ESRGAN`
- training priority: low for Stage 1
- recommendation: start with pretrained inference, do not block the web closure on fine-tuning

## Launch Recommendation

For the first useful local stack:

1. fill `.env`
2. put datasets and checkpoints under `model_training/`
3. run `docker compose up --build`
4. let `backend` call the worker service names inside the compose network
