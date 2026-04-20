# Root Placeholder: exports

This root directory intentionally no longer stores real exported training handoff bundles.

## Real location

Use the real exports under:

- `AAtrain/model_training/exports/`

## What used to live here

- exported multimodal handoff bundles such as `multimodal-reader-qwen`
- cloud-side dataset registration inputs and generated handoff metadata

## If you need to regenerate exports

- Multimodal export for Qwen finetuning: `training/data-prep/export_multimodal_reader_for_qwen.py`
- Cloud registration helper: `training/lora-finetune/register_qwen_vl_dataset.py`
- Full handoff bundle assembly: `training/data-prep/prepare_AAtrain_bundle.py`

## Source notes

- Canonical provenance table: `training/data-prep/dataset-sources.md`
- Canonical runnable copy: `AAtrain/`
