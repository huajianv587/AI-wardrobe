# Training Workspace

This directory is where you prepare and launch model work for the product.

## What belongs here

- dataset notes and conversion steps
- LoRA / fine-tune configs
- evaluation plans
- launch scripts

## Stage 1 priority

Only train or prepare the pieces that help the web product close first:

1. `llm-recommender`
2. `image-processor`

## Stage 2 priority

Once the recommendation loop is stable, move next to:

1. `multimodal-reader`
2. `virtual-tryon`

## Recommended workflow

1. download datasets into `model_training/datasets/<worker-name>/`
2. export cleaned training pairs from `training/data-prep/`
3. fine-tune or prepare checkpoints using `training/configs/`
4. save checkpoints into `model_training/checkpoints/<worker-name>/`
5. let `ai-services/<worker-name>/` load them through FastAPI + Docker

## Fast bootstrap

To create the recommended workspace layout, generate the final 5200/600 corpus with a premium refinement overlay, and pull public metadata sources:

```bash
python training/data-prep/bootstrap_stage1_workspace.py --generate-seed-llm --train-size 5200 --eval-size 600 --download-public-sources
```

If you only want the curated JSONL without fetching public-source metadata:

```bash
python training/data-prep/bootstrap_stage1_workspace.py --generate-seed-llm --train-size 5200 --eval-size 600
```

The final build now writes:

- `train.base.jsonl` / `eval.base.jsonl`
- `train.premium.jsonl` / `eval.premium.jsonl`
- merged `train.jsonl` / `eval.jsonl`

Before training, run:

```bash
python training/data-prep/validate_llm_jsonl.py model_training/datasets/llm-recommender/train.jsonl model_training/datasets/llm-recommender/eval.jsonl
python training/data-prep/audit_curated_llm_dataset.py model_training/datasets/llm-recommender/train.jsonl model_training/datasets/llm-recommender/eval.jsonl
```

## Multimodal reader bootstrap

To build the multimodal seed set:

```bash
python training/data-prep/build_multimodal_reader_dataset.py --train-size 2400 --eval-size 300
python training/data-prep/validate_multimodal_reader_jsonl.py model_training/datasets/multimodal-reader/train.jsonl model_training/datasets/multimodal-reader/eval.jsonl
python training/data-prep/audit_multimodal_reader_dataset.py model_training/datasets/multimodal-reader/train.jsonl model_training/datasets/multimodal-reader/eval.jsonl
```

To extend it with your own cleared garment photos:

```bash
python training/data-prep/import_multimodal_private_catalog.py \
  --catalog training/data-prep/private-multimodal-catalog.template.csv
```

To prepare the mixed dataset for the official Qwen VL finetune repo:

```bash
python training/data-prep/export_multimodal_reader_for_qwen.py \
  --dataset-dir model_training/datasets/multimodal-reader \
  --export-dir model_training/exports/multimodal-reader-qwen
```

## Virtual try-on bootstrap

To scaffold the paired-data workspace:

```bash
python training/data-prep/bootstrap_virtual_tryon_workspace.py
```

## Important split

- `training/` = scripts, plans, configs
- `model_training/` = actual datasets, checkpoints, outputs

Keep large datasets and checkpoints out of git.
