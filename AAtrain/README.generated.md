# AAtrain Bundle

This folder is the portable training handoff for the 5090 machine.

## Included

- training scripts and configs
- docs and runbooks
- ai-services used by the training/deployment flow
- organized dataset manifests
- completed raw-source downloads mirrored from this repo

## Dataset Status

- LLM recommender: ready (5200 train / 600 eval)
- Multimodal reader: ready (2400 train / 300 eval)
- Image processor: public-bootstrap-ready (Fashionpedia 45623 train images / DeepFashion2 191961 train)
- DeepFashion-MultiModal: ready
- DeepFashion2: ready
- SHIFT15M: ready
- Virtual try-on paired data: research-bootstrap-ready (11647 train / 2032 eval)

## Cloud Notes

- Re-run `training/lora-finetune/register_qwen_vl_dataset.py` on the 5090 machine so dataset paths match that machine.
- `virtual-tryon` now includes a VITON-HD research bootstrap, but the upstream license remains non-commercial.
- `image-processor` includes a public bootstrap index that points to Fashionpedia and DeepFashion2.
- `deepfashion2` is already extracted and ready in this bundle.
- Archive passwords are never written into the bundle. Use `training/data-prep/dataset-sources.md` for the documented environment variable names when rebuilding sources elsewhere.
- Large raw research assets are included only when you build with `--full-research-assets`.
