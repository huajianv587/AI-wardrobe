# Model Serving Stack

This is the production reference for serving the trained recommendation model and the optional multimodal model with:

- vLLM
- Docker Compose
- Nginx
- `.env.production`

## Recommended Production Shape

For a single RTX 5090 server:

1. serve the recommendation model first
2. keep multimodal serving optional
3. only enable both at the same time after you confirm memory headroom

This is why the Compose file uses separate profiles.

## Files

- Compose: [`../infra/docker/docker-compose.model-serving.yml`](../infra/docker/docker-compose.model-serving.yml)
- Nginx: [`../infra/nginx/nginx.model-serving.conf`](../infra/nginx/nginx.model-serving.conf)
- Production env template: [`../.env.production.example`](../.env.production.example)

## Recommended `.env.production` Values

If the backend reaches model services through public domains:

```env
LLM_RECOMMENDER_API_URL=https://llm.aiwardrobes.com/v1
LLM_RECOMMENDER_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct

VLLM_BASE_URL=https://vlm.aiwardrobes.com/v1
QWEN_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
MULTIMODAL_READER_API_URL=https://multimodal-worker.aiwardrobes.com/infer
MULTIMODAL_READER_UPSTREAM_URL=https://vlm.aiwardrobes.com/v1
MULTIMODAL_READER_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
```

If the backend reaches model services inside the same Docker network:

```env
LLM_RECOMMENDER_API_URL=http://vllm-recommender:8000/v1
LLM_RECOMMENDER_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct

VLLM_BASE_URL=http://vllm-multimodal:8000/v1
QWEN_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
MULTIMODAL_READER_API_URL=http://multimodal-reader:9004/infer
MULTIMODAL_READER_UPSTREAM_URL=http://vllm-multimodal:8000/v1
MULTIMODAL_READER_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
```

Important:

- `LLM_RECOMMENDER_API_URL` is what the recommendation backend path actually uses.
- `VLLM_BASE_URL` is what the multimodal recognition path uses.
- `MULTIMODAL_READER_API_URL` is optional and only needed if you also run the standalone multimodal worker.

## Deployment Execution Checklist

1. Put the trained recommender checkpoint under `model_training/checkpoints/llm-recommender/`.
2. Copy `.env.production.example` to `.env.production` and fill:
   - `HF_TOKEN`
   - `LLM_RECOMMENDER_API_URL`
   - `LLM_RECOMMENDER_MODEL_NAME`
   - `VLLM_BASE_URL` if you will also serve the multimodal model
   - `MULTIMODAL_READER_API_URL` and `MULTIMODAL_READER_UPSTREAM_URL` if you will also run the standalone worker
3. If the backend and vLLM are on the same Docker network, use:

```env
LLM_RECOMMENDER_API_URL=http://vllm-recommender:8000/v1
LLM_RECOMMENDER_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
VLLM_BASE_URL=http://vllm-multimodal:8000/v1
QWEN_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
MULTIMODAL_READER_API_URL=http://multimodal-reader:9004/infer
MULTIMODAL_READER_UPSTREAM_URL=http://vllm-multimodal:8000/v1
MULTIMODAL_READER_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
```

4. Start the recommender profile first:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.model-serving.yml --profile recommender up -d
```

5. If you want a public reverse proxy on the same host, add the gateway profile:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.model-serving.yml --profile recommender --profile gateway up -d
```

6. Verify the model endpoint before wiring the product backend to it:

```bash
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/v1/models
curl -X POST http://127.0.0.1:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen2.5-7B-Instruct","messages":[{"role":"user","content":"Return valid JSON with one outfit idea."}],"temperature":0.2}'
```

7. Point the backend to the validated endpoint and restart the application stack.
8. Only after the recommender is stable should you add the `multimodal` profile.

## Start The Recommender Only

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.model-serving.yml --profile recommender up -d
```

## Start Recommender + Multimodal

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.model-serving.yml --profile recommender --profile multimodal up -d
```

## Health Checks

After startup:

```bash
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/v1/models
```

If the Nginx gateway is in front:

```bash
curl https://llm.aiwardrobes.com/health
curl https://llm.aiwardrobes.com/v1/models
```

## GPU Advice For 5090

For a 7B recommender on a 5090:

- `dtype`: `bfloat16`
- `gpu-memory-utilization`: `0.90` to `0.94`
- `max-model-len`: start at `4096`

For the multimodal 7B model:

- `max-model-len`: start at `8192`
- run it on the same card only after testing memory pressure
- keep `limit-mm-per-prompt` at `image=1` for the first deployment
- use `generation-config=vllm` if you want runtime params to be controlled by the server config instead of the model repo defaults

## Routing Notes

The backend recommendation flow already supports OpenAI-compatible endpoints:

- [`../backend/services/recommendation_service.py`](../backend/services/recommendation_service.py)

The multimodal flow already supports OpenAI-compatible local vLLM:

- [`local-vllm.md`](local-vllm.md)
- [`multimodal-reader-cloud-runbook.md`](multimodal-reader-cloud-runbook.md)

## Deployment Rule

For your first strong production release:

1. train the recommender
2. deploy the recommender
3. verify recommendation quality in the product
4. only then add the multimodal model
