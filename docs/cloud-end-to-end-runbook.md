# Cloud End-to-End Runbook

This is the single checklist for turning a finished training run into a live product stack.

It assumes the first production release uses the hybrid deployment shape locked in for this repo:

- app host: `frontend + backend + redis + backend-worker + gateway`
- GPU model host: `vllm-recommender + vllm-multimodal + model-gateway`
- virtual try-on: keep the current remote worker or fallback path for the first release

## 1. Place The Checkpoints

Copy the trained artifacts into the repo layout expected by the serving stack:

- recommender checkpoint: `model_training/checkpoints/llm-recommender/`
- multimodal checkpoint or exported model: `model_training/checkpoints/multimodal-reader/`
- optional Hugging Face cache: `model_training/cache/hf/`

Do not block the release on a self-hosted try-on checkpoint in the first rollout.

## 2. Bring Up The GPU Model Host

Fill `.env.production` on the GPU host with the serving values from [../.env.production.example](../.env.production.example).

Recommended first boot order:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.model-serving.yml --profile recommender up -d
docker compose --env-file .env.production -f infra/docker/docker-compose.model-serving.yml --profile recommender --profile multimodal up -d
```

If you want a public reverse proxy on the GPU host too:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.model-serving.yml --profile recommender --profile multimodal --profile gateway up -d
```

## 3. Verify The Model Endpoints Before Wiring The App

Check the recommender:

```bash
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/v1/models
```

Check the multimodal endpoint if enabled:

```bash
curl http://127.0.0.1:8002/health
curl http://127.0.0.1:8002/v1/models
```

If the gateway profile is enabled, validate the public URLs instead of the localhost ports.

## 4. Point The App Host To The Model Host

On the app host, fill `.env.production` with:

- `NEXT_PUBLIC_API_BASE_URL`
- `BACKEND_PUBLIC_BASE_URL`
- `DATABASE_URL`
- `SUPABASE_*`
- `REDIS_URL=redis://redis:6379/0`
- `TASK_QUEUE_ENABLED=true`
- `TASK_QUEUE_EAGER=false`
- `LLM_RECOMMENDER_API_URL`
- `LLM_RECOMMENDER_MODEL_NAME`
- `VLLM_BASE_URL`
- `QWEN_MODEL_NAME`
- `MULTIMODAL_READER_API_URL` only if you run the standalone reader worker
- `VIRTUAL_TRYON_API_URL` and fallback keys for the first hybrid release

Keep `MODEL_USE_LOCAL_VIRTUAL_TRYON=false` for the first release unless you have already validated a self-hosted try-on worker.

## 5. Start The Application Stack

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml up -d --build
```

The production stack now includes:

- `frontend`
- `backend`
- `backend-worker`
- `redis`
- `gateway`

## 6. Run Release Verification

Use the built-in probe once the stack is up:

```bash
python backend/scripts/deployment_health_probe.py --base-url https://api.yourdomain.com
```

The deployment is only considered healthy when:

- `/health/live` passes
- `/health/ready` passes
- `/health/dependencies` passes
- Redis is reachable
- the task queue reports at least one active worker when `TASK_QUEUE_EAGER=false`

## 7. Real Queue Validation

For a local or staging dry-run of the worker path:

```bash
backend/.venv/Scripts/python.exe backend/scripts/smoke_queue_validation.py --redis-url redis://127.0.0.1:6379/0
```

This validates:

- image cleanup task enqueue
- smart wardrobe task enqueue
- Redis-backed worker consumption
- `queued -> completed` task flow through `AssistantTask`

## 8. Frontend / Mini Program / Mobile Contract

Keep all clients pointed at the same backend contract:

- web: `NEXT_PUBLIC_API_BASE_URL`
- mini-program: `TARO_APP_API_BASE_URL`
- Expo shell: `EXPO_PUBLIC_API_BASE_URL`

Do not point any client directly at the model-serving host. The backend remains the single contract boundary.

## 9. Related Reference Docs

- model serving: [model-serving-stack.md](model-serving-stack.md)
- release flow: [release-runbook.md](release-runbook.md)
- multimodal reader notes: [multimodal-reader-cloud-runbook.md](multimodal-reader-cloud-runbook.md)
- optimization backlog: [optimization-audit.md](optimization-audit.md)
