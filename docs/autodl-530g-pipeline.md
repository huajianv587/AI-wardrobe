# 530G AutoDL Staged Training Pipeline

This runbook replaces the old split-volume upload flow. Use staged uncompressed TAR files inside `AAtrain`, not ZIP and not `.partNNN` volumes.

## Local Packaging

Build in-place staged TAR files from the project root. This keeps code and LLM data expanded, writes later-stage TAR files to `AAtrain/staged-tars`, and deletes the corresponding expanded later-stage data after each TAR is verified:

```powershell
python training\data-prep\package_AAtrain_staged_for_autodl.py --source-dir AAtrain --in-place-prune --fresh --overwrite
```

Preview sizes without writing TAR files:

```powershell
python training\data-prep\package_AAtrain_staged_for_autodl.py --source-dir AAtrain --dry-run
```

The output folder is `AAtrain/staged-tars`:

- `stage1-multimodal-reader.tar`
- `stage2-virtual-tryon.tar`
- `stage3-image-public.tar`
- `stage4-shift15m.tar`
- `sha256sums.generated.txt`
- `manifest.generated.json`
- `README.generated.md`

Upload the whole `AAtrain` folder to Aliyun Drive. Do not upload a separate `AAtrain-staged-upload` folder.

The in-place command syncs this runbook, the staged packager, and `run-530g-autodl-pipeline.sh` into the `AAtrain` tree before packaging.

## AutoDL Layout

Stage TAR files live inside the uploaded folder:

```bash
/root/autodl-tmp/AAtrain/staged-tars
```

Extracted working tree:

```bash
/root/autodl-tmp/AAtrain
```

All caches must stay on the data disk:

```bash
export HF_HOME=/root/autodl-tmp/cache/hf
export TORCH_HOME=/root/autodl-tmp/cache/torch
export PIP_CACHE_DIR=/root/autodl-tmp/cache/pip
mkdir -p "$HF_HOME" "$TORCH_HOME" "$PIP_CACHE_DIR"
```

## Stage Flow

1. Download/upload the whole `AAtrain` folder to `/root/autodl-tmp/AAtrain`.
2. Enter the expanded project:

```bash
cd /root/autodl-tmp/AAtrain
```

3. Install base dependencies, validate LLM data, and prefetch Qwen2.5-7B:

```bash
WARN_FREE_GB=150 MIN_FREE_GB=100 \
bash training/lora-finetune/run-530g-autodl-pipeline.sh setup-after-stage0
```

4. Start LLM training:

```bash
WARN_FREE_GB=150 MIN_FREE_GB=100 \
bash training/lora-finetune/run-530g-autodl-pipeline.sh train-llm
```

While LLM trains, download `stage1-multimodal-reader.tar`, `stage2-virtual-tryon.tar`, and any needed model assets through AutoPanel.

5. Prepare and train multimodal reader:

```bash
WARN_FREE_GB=150 MIN_FREE_GB=100 \
bash training/lora-finetune/run-530g-autodl-pipeline.sh prepare-stage1

WARN_FREE_GB=150 MIN_FREE_GB=100 \
bash training/lora-finetune/run-530g-autodl-pipeline.sh train-multimodal
```

While multimodal training runs, prepare the try-on assets.

6. Prepare and train virtual try-on:

```bash
WARN_FREE_GB=150 MIN_FREE_GB=100 \
bash training/lora-finetune/run-530g-autodl-pipeline.sh prepare-stage2

WARN_FREE_GB=150 MIN_FREE_GB=100 \
bash training/lora-finetune/run-530g-autodl-pipeline.sh train-tryon
```

7. Download `stage3-image-public.tar` and `stage4-shift15m.tar` only when needed. They are intentionally not blockers for the first three training lanes.

## Disk Rules

- Keep free space above `100GB`.
- Delete every TAR immediately after extraction.
- Keep only final artifacts and the latest checkpoints.
- Do not extract `stage3-image-public.tar` and `stage4-shift15m.tar` at the same time unless disk usage has been checked.

Useful checks:

```bash
df -h /root/autodl-tmp
du -sh /root/autodl-tmp/AAtrain
du -sh /root/autodl-tmp/cache
```

## Known First-Run Notes

- `stage0-code-llm` is enough to start LLM training after the Qwen2.5-7B base model is cached.
- `stage1-multimodal-reader` is needed only before multimodal training.
- `stage2-virtual-tryon` is needed only before IDM-VTON training.
- The image-processor lane should remain non-blocking on the first run. Use `PREP_IMAGE_PROCESSOR=0` for older full-stack scripts.
- IDM-VTON may downgrade Python packages from the Qwen environment. Treat the try-on stage as the last training stage in the shared environment.
