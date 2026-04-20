# Stage 1 Local Model Loop

This document is the practical runbook for Stage 1:

- local checkpoints
- FastAPI workers
- Docker Compose
- web product closure

## Goal

Stage 1 only needs two workers to make the web loop feel real:

1. `llm-recommender`
2. `image-processor`

Once these two services are live, the core web flow becomes:

1. user logs in on web
2. user uploads a wardrobe image
3. backend calls `image-processor`
4. processed asset is stored and synced
5. recommendation page calls `llm-recommender`
6. user gets a real worker-backed recommendation result

## Recommended Repository Roles

- `frontend/`: web UI
- `backend/`: product API, auth, storage, sync, recommendation orchestration
- `ai-services/`: model workers with FastAPI
- `training/`: configs, data prep, launch notes
- `model_training/`: local datasets, checkpoints, outputs

## Stage 1 Worker Contract

Each worker should expose:

- `GET /health`
- `POST /infer`

The main backend does not need to know your training framework.
It only needs stable HTTP contracts.

## Worker 1: LLM Recommender

### Suggested base model

- `Qwen/Qwen2.5-7B-Instruct`

### Suggested fine-tune style

- QLoRA or LoRA
- instruction-style JSONL

### Expected dataset path

- `model_training/datasets/llm-recommender/train.jsonl`
- `model_training/datasets/llm-recommender/eval.jsonl`

### Expected checkpoint path

- `model_training/checkpoints/llm-recommender/`

### Worker URL

- host direct run: `http://127.0.0.1:9001`
- Docker Compose internal URL: `http://llm-recommender:9001`

## Worker 2: Image Processor

### Suggested first model setup

- primary cutout model: `briaai/RMBG-2.0`
- optional upscaler: `xinntao/Real-ESRGAN`

### Stage 1 advice

Do not block Stage 1 on image-model fine-tuning.
Ship the first loop with strong pretrained inference first.

### Expected checkpoint path

- `model_training/checkpoints/image-processor/`

### Worker URL

- host direct run: `http://127.0.0.1:9002`
- Docker Compose internal URL: `http://image-processor:9002`

## What To Prepare Before Training

### LLM recommender

Prepare instruction pairs in JSONL. Each row should teach the model how to:

- read prompt + context
- choose clothing items
- explain why
- provide alternates

Use the sample files already checked in under:

- `model_training/datasets/llm-recommender/train.template.jsonl`
- `model_training/datasets/llm-recommender/eval.template.jsonl`

### Image processor

For Stage 1 you can start without training.

Only prepare:

- a small private benchmark image set
- before/after notes
- optional mask labels if you later decide to fine-tune

## Training Source References

See:

- `training/data-prep/dataset-sources.md`
- `training/configs/llm-recommender.stage1.yaml`
- `training/configs/image-processor.stage1.yaml`

## Start Order

### Option A: quickest first pass

1. keep `image-processor` in pretrained / passthrough mode
2. keep `llm-recommender` in heuristic mode
3. bring up Compose
4. verify the full web loop
5. then replace internals with your checkpoints

### Option B: immediate local-model integration

1. prepare `train.jsonl` and `eval.jsonl`
2. fine-tune `Qwen/Qwen2.5-7B-Instruct`
3. export checkpoint into `model_training/checkpoints/llm-recommender/`
4. replace the worker inference internals
5. start Compose and verify web recommendations hit the worker

## Environment Variables That Matter For Stage 1

- `LLM_RECOMMENDER_API_URL`
- `AI_CLEANUP_API_URL`
- `LLM_RECOMMENDER_MODEL_NAME`
- `LLM_RECOMMENDER_MODEL_PATH`
- `LLM_RECOMMENDER_DATASET_DIR`
- `IMAGE_PROCESSOR_PRIMARY_MODEL`
- `IMAGE_PROCESSOR_UPSCALER_MODEL`
- `IMAGE_PROCESSOR_MODEL_PATH`

## Docker Compose Flow

Stage 1 Compose now wires:

- `frontend`
- `backend`
- `llm-recommender`
- `image-processor`
- `redis`
- `minio`

If you use Compose, the backend automatically prefers these internal worker URLs:

- `http://llm-recommender:9001`
- `http://image-processor:9002`

## Manual Bring-Up Checklist

1. Fill `.env`
2. Ensure Supabase keys are already valid
3. Place dataset files into `model_training/datasets/llm-recommender/`
4. Place checkpoints into `model_training/checkpoints/llm-recommender/` when ready
5. Run `docker compose up --build`
6. Check:
   - `http://127.0.0.1:9001/health`
   - `http://127.0.0.1:9002/health`
   - `http://127.0.0.1:8000/api/v1/health`
   - `http://127.0.0.1:3000`

## Tomorrow Morning Practical Priority

If you only do three things next:

1. prepare `train.jsonl` and `eval.jsonl`
2. run the first `llm-recommender` training pass
3. bring the stack up with Compose and verify the web recommendation flow
