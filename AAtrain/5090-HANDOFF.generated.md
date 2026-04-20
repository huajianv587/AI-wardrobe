# 5090 Handoff Notes

Generated: 2026-04-13T22:54:30+0800

## Ready To Train

- `llm-recommender`: 5200 train / 600 eval
- `multimodal-reader`: 2400 train / 300 eval
- `virtual-tryon`: research-bootstrap-ready (11647 train / 2032 eval)
- `image-processor`: public-bootstrap-ready (Fashionpedia 45623 train images)

## Research Assets Included

- `deepfashion-multimodal`: ready
- `deepfashion2`: ready
- `shift15m`: ready

## Current Blockers

- `virtual-tryon` is trainable with VITON-HD bootstrap, but that source remains research-only / non-commercial.
- `image-processor` has a public bootstrap index, but private garment photography is still the best source for production-grade cutout tuning.
- No extraction blocker remains for `deepfashion2` in this bundle.

## Bundle Mode

- `bundle_mode`: full-research-assets
- `cloud-lean` keeps training-ready corpora and export files only.
- Use `--full-research-assets` only when you explicitly need the raw DeepFashion or SHIFT15M payloads on the cloud box.

## On The 5090 Machine

1. Place the bundle at your project root.
2. Install `training/lora-finetune/requirements-autodl.txt`.
3. Re-run `training/lora-finetune/register_qwen_vl_dataset.py` with the cloud machine paths.
4. Training order recommendation: `llm-recommender` -> `multimodal-reader` -> `virtual-tryon` -> `image-processor`.