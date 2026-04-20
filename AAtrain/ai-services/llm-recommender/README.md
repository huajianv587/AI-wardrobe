## LLM Recommender Worker

Stage 1 target:

- service name: `llm-recommender`
- port: `9001`
- backend env: `LLM_RECOMMENDER_API_URL`

### Default base model

- `Qwen/Qwen2.5-7B-Instruct`

### Recommended fine-tune mode

- LoRA / QLoRA

### Expected checkpoint location

- `model_training/checkpoints/llm-recommender/`

### Expected dataset location

- `model_training/datasets/llm-recommender/`

### Worker contract

- `GET /health`
- `POST /infer`

### Stage 1 behavior

This worker intentionally starts in a stable local mode:

- if your real checkpoint is not ready yet, it still returns the same response contract
- once your local checkpoint runner is ready, keep the API unchanged and replace only the internal generation logic

### Suggested datasets

- FashionIQ
- Polyvore Outfits
- your own wardrobe prompt-response pairs

### Suggested environment values

- `LLM_RECOMMENDER_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct`
- `LLM_RECOMMENDER_MODEL_PATH=/app/model_training/checkpoints/llm-recommender`
- `LLM_RECOMMENDER_DATASET_DIR=/app/model_training/datasets/llm-recommender`
- `LLM_RECOMMENDER_RUN_MODE=heuristic`
