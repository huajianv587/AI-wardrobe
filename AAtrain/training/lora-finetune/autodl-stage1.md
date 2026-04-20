# AutoDL Stage-1 Start Guide

This is the shortest path to your first real recommendation checkpoint on an AutoDL 5090 machine.

## Goal

Train only one model first:

- `llm-recommender`

Do not block on `image-processor` fine-tuning yet.

## Step 1: Prepare the machine

On AutoDL:

1. create a new RTX 5090 instance
2. clone this repository
3. make sure CUDA PyTorch is available

Example checks:

```bash
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

## Step 2: Install training dependencies

Use the checked-in dependency file:

```bash
pip install -r training/lora-finetune/requirements-autodl.txt
```

## Step 3: Prepare data

Create these two files:

- `model_training/datasets/llm-recommender/train.jsonl`
- `model_training/datasets/llm-recommender/eval.jsonl`

Start by copying:

- `model_training/datasets/llm-recommender/train.template.jsonl`
- `model_training/datasets/llm-recommender/eval.template.jsonl`

Then expand them into your own training rows.

## Step 4: Validate JSONL

Before training, run:

```bash
python training/data-prep/validate_llm_jsonl.py \
  model_training/datasets/llm-recommender/train.jsonl \
  model_training/datasets/llm-recommender/eval.jsonl
```

## Step 5: Download the base model

Yes, `Qwen/Qwen2.5-7B-Instruct` means the base model.
You download it inside the cloud machine, not into git.

When the training script starts, it will automatically download from Hugging Face if the model is not cached yet.

If you prefer to pre-download:

```bash
huggingface-cli download Qwen/Qwen2.5-7B-Instruct --local-dir /root/autodl-tmp/qwen2.5-7b-instruct
```

Then train with:

```bash
python training/lora-finetune/train_llm_recommender.py \
  --model-name /root/autodl-tmp/qwen2.5-7b-instruct \
  --train-file model_training/datasets/llm-recommender/train.jsonl \
  --eval-file model_training/datasets/llm-recommender/eval.jsonl \
  --output-dir model_training/checkpoints/llm-recommender \
  --load-in-4bit \
  --bf16
```

## Step 6: First recommended command

If you do not pre-download the model:

```bash
python training/lora-finetune/train_llm_recommender.py \
  --model-name Qwen/Qwen2.5-7B-Instruct \
  --train-file model_training/datasets/llm-recommender/train.jsonl \
  --eval-file model_training/datasets/llm-recommender/eval.jsonl \
  --output-dir model_training/checkpoints/llm-recommender \
  --load-in-4bit \
  --bf16
```

## Parameters already chosen for Stage 1

The training script defaults already match the checked-in Stage-1 plan:

- quantization: 4-bit
- LoRA rank: 16
- LoRA alpha: 32
- LoRA dropout: 0.05
- batch size: 4
- gradient accumulation: 8
- learning rate: `2e-4`
- epochs: 3
- max sequence length: 2048

You can override them with CLI flags if needed.

## Step 7: Bring the checkpoint back

After training, your output should be in:

- `model_training/checkpoints/llm-recommender/`

Download that checkpoint folder back to your local project machine and keep it under the same path.

## Step 8: What happens next

After the checkpoint exists, the next coding step is:

1. replace the heuristic internals in `ai-services/llm-recommender/main.py`
2. load the trained checkpoint
3. run `docker compose up --build`
4. verify the web recommendation flow
