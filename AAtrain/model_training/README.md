# Model Training Assets

This `AAtrain/model_training/` directory is the canonical training asset root for cloud handoff and 5090 execution.

It intentionally contains the real datasets, raw-source payloads, exports, and supporting notes needed for serial training.

## Active areas

- `datasets/`
- `raw-sources/`
- `exports/`
- `checkpoints/` for any outputs you intentionally keep in the handoff

## Supporting references

- Source provenance table: `training/data-prep/dataset-sources.md`
- Cloud runbook: `docs/cloud-5090-full-train-deploy.generated.md`
- Serial training entrypoint: `training/lora-finetune/run-5090-full-stack.generated.sh`

## Rule

Treat this directory as the source of truth for training assets that travel to the cloud box.
The root repo `model_training/` directory outside `AAtrain/` may contain notes and local checkpoints only.
