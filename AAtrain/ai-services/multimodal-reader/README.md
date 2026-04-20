# Multimodal Reader

FastAPI worker for garment attribute understanding.

Current modes:

- `heuristic`: returns a stable local fallback payload
- `proxy`: forwards the request to an OpenAI-compatible multimodal endpoint such as vLLM

Recommended env:

```env
MULTIMODAL_READER_RUN_MODE=proxy
MULTIMODAL_READER_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
MULTIMODAL_READER_UPSTREAM_URL=http://127.0.0.1:8002/v1
MULTIMODAL_READER_API_KEY=
```

Request contract:

- `POST /infer`
- supports either:
  - `image_url + prompt + garment_name`
  - `mode + item.image_url + item metadata`

Response contract:

- top-level `tags`, `occasions`, `style_notes`
- attribute fields such as `color_family`, `fabric_guess`, `silhouette`, `season`, `mood`, `category`
- `attributes` mirror for downstream compatibility
