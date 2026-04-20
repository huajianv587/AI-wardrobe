# AAtrain Staged AutoDL Upload

Upload this folder as part of `AAtrain`. Extract each stage TAR on AutoDL only when that training stage needs it.

## Files

| Stage | TAR | Size (GB) | Purpose |
|---|---:|---:|---|
| `stage1-multimodal-reader` | `stage1-multimodal-reader.tar` | 0.08 | Multimodal-reader JSONL/images and Qwen export files. |
| `stage2-virtual-tryon` | `stage2-virtual-tryon.tar` | 6.06 | VITON-HD raw extracted data plus organized virtual try-on manifests. |
| `stage3-image-public` | `stage3-image-public.tar` | 70.18 | Fashionpedia, DeepFashion2, DeepFashion-MultiModal, and image-processor bootstrap data. |
| `stage4-shift15m` | `stage4-shift15m.tar` | 101.10 | SHIFT15M raw assets and organized records. |

## AutoDL Extract Pattern

```bash
cd /root/autodl-tmp/AAtrain
bash training/lora-finetune/run-530g-autodl-pipeline.sh prepare-stage1
```

LLM data stays expanded. Stage TAR files are authoritative copies for later-stage datasets.
