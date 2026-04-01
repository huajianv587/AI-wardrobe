# LoRA Fine-Tune Launch Notes

For Stage 1 you only need one real training lane:

- `llm-recommender`

`image-processor` can start with pretrained inference and does not need to block web closure.

## Suggested local sequence

1. prepare JSONL under `model_training/datasets/llm-recommender/`
2. fill `training/configs/llm-recommender.stage1.yaml`
3. run your preferred trainer:
   - LLaMA-Factory
   - Transformers + PEFT
4. export the checkpoint into:
   - `model_training/checkpoints/llm-recommender/`
5. point the worker to that path

## Output rule

Keep the final worker contract stable:

- `GET /health`
- `POST /infer`

The product should not need UI changes when you replace heuristic mode with your trained checkpoint.
