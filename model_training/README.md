# Model Training Assets

The root `model_training/` directory is now a lightweight note-and-checkpoint area.

Real datasets, raw-source payloads, and exported cloud-training assets now live only under:

- `AAtrain/model_training/datasets/`
- `AAtrain/model_training/raw-sources/`
- `AAtrain/model_training/exports/`

## What stays here

- `checkpoints/` when you intentionally keep local training outputs
- small README and provenance notes

## What no longer stays here

- real dataset trees
- raw-source payload dumps
- exported multimodal handoff bundles

## Source of truth

- Training asset root: `AAtrain/model_training/`
- Source provenance table: `training/data-prep/dataset-sources.md`
- Cloud upload pack: `AAtrain-upload-20gb/`

## Cloud workflow

1. Keep `AAtrain/` as the only full local training handoff.
2. Generate or refresh `AAtrain-upload-20gb/` from `AAtrain/`.
3. Upload the split pack to Aliyun Drive or AutoDL cloud storage.
4. Pull the split pack onto the 5090 external disk.
5. Validate `sha256`, extract `AAtrain`, and run the serial training script from that extracted bundle.

## Note on disk usage

Many historical files between the root tree and `AAtrain/` were mirrored with NTFS hardlinks.
Removing the root copies improves path clarity and reduces mistakes, but it does not necessarily free large amounts of disk space by itself.
