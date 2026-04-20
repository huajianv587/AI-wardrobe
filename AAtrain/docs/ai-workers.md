# AI Worker Adapter Map

The product now works in an API-first way:

1. Web and mini-program clients call FastAPI routes under `/api/v1/ai-demo/*`
2. FastAPI returns a stable demo contract even when no worker is configured
3. When a worker URL is configured in `.env`, FastAPI proxies to that worker's `/infer`
4. If the worker is down, FastAPI falls back to the local demo response instead of breaking the UI

## Environment Variables

- `LLM_RECOMMENDER_API_URL`
- `IMAGE_PROCESSOR_API_URL`
- `CLASSIFIER_API_URL`
- `MULTIMODAL_READER_API_URL`
- `VIRTUAL_TRYON_API_URL`
- `PRODUCT_RENDERER_API_URL`
- `AVATAR_BUILDER_API_URL`

## Workflow Map

- `qwen-outfit-recommendation` -> `LLM_RECOMMENDER_API_URL`
- `birefnet-background-removal` -> `IMAGE_PROCESSOR_API_URL`
- `clip-wardrobe-classifier` -> `CLASSIFIER_API_URL`
- `qwen-vl-attribute-understanding` -> `MULTIMODAL_READER_API_URL`
- `ootdiffusion-virtual-tryon` -> `VIRTUAL_TRYON_API_URL`
- `realesrgan-upscale` -> `IMAGE_PROCESSOR_API_URL`
- `controlnet-product-shot` -> `PRODUCT_RENDERER_API_URL`
- `triposr-avatar-rebuild` -> `AVATAR_BUILDER_API_URL`

## Current Demo Contract

- `GET /api/v1/ai-demo/workflows`: list workflow cards and configured worker URLs
- `GET /api/v1/ai-demo/status`: inspect adapter readiness and worker health
- `POST /api/v1/ai-demo/run`: run one workflow through either the external worker or the local demo fallback

This lets you train and deploy each model separately later without forcing the UI or mini-program contracts to change.
