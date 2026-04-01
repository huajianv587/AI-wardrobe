# LoRA Fine-Tune Launch Notes

For Stage 1 you only need one real training lane:

- `llm-recommender`

`image-processor` can start with pretrained inference and does not need to block web closure.

## Suggested local sequence

1. prepare JSONL under `model_training/datasets/llm-recommender/`
2. fill `training/configs/llm-recommender.stage1.yaml`
3. validate JSONL with:
   - `python training/data-prep/validate_llm_jsonl.py ...`
4. run your preferred trainer:
   - `python training/lora-finetune/train_llm_recommender.py ...`
   - or LLaMA-Factory
4. export the checkpoint into:
   - `model_training/checkpoints/llm-recommender/`
5. point the worker to that path

## AutoDL quick start

See:

- `training/lora-finetune/autodl-stage1.md`
- `training/lora-finetune/requirements-autodl.txt`
- `training/lora-finetune/train_llm_recommender.py`

## Output rule

Keep the final worker contract stable:

- `GET /health`
- `POST /infer`

The product should not need UI changes when you replace heuristic mode with your trained checkpoint.
