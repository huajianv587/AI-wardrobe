# Multimodal Reader Cloud Runbook

This is the practical runbook for extending, training, and deploying the multimodal-reader on your cloud RTX 5090 machine.

## What you already have in this repo

- public seed dataset:
  - [`../model_training/datasets/multimodal-reader/train.jsonl`](../model_training/datasets/multimodal-reader/train.jsonl)
  - [`../model_training/datasets/multimodal-reader/eval.jsonl`](../model_training/datasets/multimodal-reader/eval.jsonl)
- private catalog template:
  - [`../training/data-prep/private-multimodal-catalog.template.csv`](../training/data-prep/private-multimodal-catalog.template.csv)
- private import script:
  - [`../training/data-prep/import_multimodal_private_catalog.py`](../training/data-prep/import_multimodal_private_catalog.py)
- Qwen export script:
  - [`../training/data-prep/export_multimodal_reader_for_qwen.py`](../training/data-prep/export_multimodal_reader_for_qwen.py)
- Qwen registry helper:
  - [`../training/lora-finetune/register_qwen_vl_dataset.py`](../training/lora-finetune/register_qwen_vl_dataset.py)
- launch script:
  - [`../training/lora-finetune/run-multimodal-reader.sh`](../training/lora-finetune/run-multimodal-reader.sh)

## 1. Extend the dataset with your own product images

1. Copy the catalog template and fill it with your private cleared garment images.
2. Run:

```bash
python training/data-prep/import_multimodal_private_catalog.py \
  --catalog training/data-prep/private-multimodal-catalog.template.csv
```

This writes:

- `train.private.jsonl`
- `eval.private.jsonl`
- `train.mixed.jsonl`
- `eval.mixed.jsonl`

The mixed files are the ones you should train on first.

## 2. Export to the official Qwen VL finetune format

```bash
python training/data-prep/export_multimodal_reader_for_qwen.py \
  --dataset-dir model_training/datasets/multimodal-reader \
  --export-dir model_training/exports/multimodal-reader-qwen \
  --dataset-name ai_wardrobe_multimodal
```

This writes:

- `annotations/train.json`
- `annotations/eval.json`
- `dataset_registry.snippet.py`
- `README.generated.md`

## 3. Clone the official Qwen finetune repo

```bash
git clone https://github.com/QwenLM/Qwen2.5-VL /workspace/qwen-vl-finetune
cd /workspace/qwen-vl-finetune/qwen-vl-finetune
pip install -r requirements.txt
```

## 4. Register your dataset in the official repo

```bash
python /workspace/AI-wardrobe-clean-0418/training/lora-finetune/register_qwen_vl_dataset.py \
  --qwen-vl-finetune-root /workspace/qwen-vl-finetune/qwen-vl-finetune \
  --dataset-name ai_wardrobe_multimodal \
  --annotation-path /workspace/AI-wardrobe-clean-0418/model_training/exports/multimodal-reader-qwen/annotations/train.json \
  --data-path /workspace/AI-wardrobe-clean-0418/model_training/datasets/multimodal-reader
```

## 5. Launch training on the 5090

```bash
chmod +x training/lora-finetune/run-multimodal-reader.sh
QWEN_VL_FINETUNE_ROOT=/workspace/qwen-vl-finetune/qwen-vl-finetune \
MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct \
OUTPUT_DIR=/workspace/AI-wardrobe-clean-0418/model_training/checkpoints/multimodal-reader \
bash training/lora-finetune/run-multimodal-reader.sh
```

Recommended first pass:

- `NPROC_PER_NODE=1`
- `TRAIN_BATCH_SIZE=1`
- `EVAL_BATCH_SIZE=1`
- `GRAD_ACCUM_STEPS=8`
- `NUM_EPOCHS=2`

## 6. Deploy behind vLLM

For the first production candidate, either:

1. point `VLLM_MULTIMODAL_MODEL_PATH` at your exported full checkpoint
2. or serve the base model plus your validated adapter strategy

The repo deployment references are:

- [`model-serving-stack.md`](model-serving-stack.md)
- [`local-vllm.md`](local-vllm.md)
- [`../infra/docker/docker-compose.model-serving.yml`](../infra/docker/docker-compose.model-serving.yml)

## 7. Wire the backend

For assistant-style multimodal enrichment:

```env
VLLM_BASE_URL=http://vllm-multimodal:8000/v1
QWEN_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
```

If you also want the standalone worker:

```env
MULTIMODAL_READER_API_URL=http://multimodal-reader:9004/infer
MULTIMODAL_READER_UPSTREAM_URL=http://vllm-multimodal:8000/v1
MULTIMODAL_READER_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
```

## Official references

- Qwen model card:
  - <https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct>
- Qwen official finetune repo:
  - <https://github.com/QwenLM/Qwen2.5-VL>
- vLLM OpenAI-compatible server:
  - <https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html>
