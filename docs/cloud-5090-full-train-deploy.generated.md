# 5090 Full Train + Deploy Runbook

Generated: 2026-04-14

## Scope

- `AAtrain` now includes the full local training assets that exist in this repo, including `llm-recommender`, `multimodal-reader`, `virtual-tryon` bootstrap data, `image-processor` public bootstrap metadata, `DeepFashion-MultiModal`, `DeepFashion2`, `SHIFT15M`, and the related scripts/docs.
- In-repo fine-tune lanes that are ready now:
  - `llm-recommender`
  - `multimodal-reader`
- Official external fine-tune lane that is now prepared inside `AAtrain`:
  - `virtual-tryon` via the official `IDM-VTON` training repo, using the packaged `VITON-HD` bootstrap dataset
- Runtime-ready but still `pretrained-inference-first` in this repo:
  - `image-processor`
- Important license note:
  - `VITON-HD` is marked by the official repo as research-only / non-commercial.
  - `OOTDiffusion` is used here as the local worker runtime route, while the official repo currently exposes inference/checkpoints rather than a fully documented training path.

## 1. Upload And Extract

Put the whole `AAtrain-upload-20gb` folder onto your Aliyun disk or AutoDL cloud disk first, then run:

```bash
cd /mnt/external-disk/AAtrain-upload-20gb
sha256sum -c sha256sums.generated.txt
mkdir -p /mnt/external-disk
for part in $(ls AAtrain-full.tar.part* | sort); do
  tar -xf "$part" -C /mnt/external-disk
done
cd /mnt/external-disk/AAtrain
```

Each `.partNNN` file is a standalone TAR archive.
Extract them one by one in filename order.

Recommended storage layout:

- keep the upload pack on your cloud disk
- extract the working `AAtrain` directory onto a `400GB` local/external SSD mount
- do not keep the upload pack duplicated on the same training disk if space is tight

## 2. Base Environment

Use the GPU Python that already sees CUDA on the 5090 box:

```bash
cd /mnt/external-disk/AAtrain
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
pip install -U pip setuptools wheel
pip install -r training/lora-finetune/requirements-autodl.txt
pip install -r ai-services/image-processor/requirements.txt
pip install -r ai-services/multimodal-reader/requirements.txt
pip install fastapi uvicorn[standard] httpx pillow requests
```

If you want direct local vLLM serving instead of Docker, make sure `vllm` is already installed according to the official docs before you run the serving commands below.

## 2.5. Manual One-Command Serial Launch

The recommended first-run mode is manual one-command launch after the external disk is mounted:

```bash
cd /mnt/external-disk/AAtrain
chmod +x training/lora-finetune/run-5090-full-stack.generated.sh
PROJECT_ROOT=/mnt/external-disk/AAtrain \
WARN_FREE_GB=80 \
MIN_FREE_GB=50 \
bash training/lora-finetune/run-5090-full-stack.generated.sh
```

The controller script will:

- run the stages sequentially
- stop on the first non-zero exit
- write per-stage logs into `logs/5090-serial/`
- print disk usage before and after every stage
- block entry into the next stage if free space falls below the configured minimum

## 3. LLM Recommender: Train, Merge, Serve

Validate:

```bash
python training/data-prep/validate_llm_jsonl.py \
  model_training/datasets/llm-recommender/train.jsonl \
  model_training/datasets/llm-recommender/eval.jsonl
python training/data-prep/audit_curated_llm_dataset.py \
  model_training/datasets/llm-recommender/train.jsonl \
  model_training/datasets/llm-recommender/eval.jsonl
```

Train with mergeable full-precision LoRA on the 5090:

```bash
python training/lora-finetune/train_llm_recommender.py \
  --model-name Qwen/Qwen2.5-7B-Instruct \
  --train-file model_training/datasets/llm-recommender/train.jsonl \
  --eval-file model_training/datasets/llm-recommender/eval.jsonl \
  --output-dir model_training/checkpoints/llm-recommender \
  --quantization none \
  --dtype bf16 \
  --per-device-train-batch-size 1 \
  --per-device-eval-batch-size 1 \
  --gradient-accumulation-steps 16
```

Merge the adapter into a standalone deployable checkpoint:

```bash
python training/lora-finetune/merge_llm_recommender_lora.py \
  --adapter-dir model_training/checkpoints/llm-recommender \
  --output-dir model_training/checkpoints/llm-recommender-merged \
  --dtype bf16
```

Serve it:

```bash
vllm serve model_training/checkpoints/llm-recommender-merged \
  --host 0.0.0.0 \
  --port 8001 \
  --served-model-name Qwen/Qwen2.5-7B-Instruct \
  --dtype bfloat16 \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.90 \
  --generation-config vllm
```

## 4. Multimodal Reader: Train, Then Serve

Export and register the dataset on the cloud box:

```bash
python training/data-prep/export_multimodal_reader_for_qwen.py \
  --dataset-dir model_training/datasets/multimodal-reader \
  --export-dir model_training/exports/multimodal-reader-qwen \
  --dataset-name ai_wardrobe_multimodal
```

Clone the official Qwen VL finetune repo and install its dependencies:

```bash
git clone https://github.com/QwenLM/Qwen2.5-VL.git /root/autodl-tmp/qwen-vl-finetune
pip install -r /root/autodl-tmp/qwen-vl-finetune/requirements.txt
python training/lora-finetune/register_qwen_vl_dataset.py \
  --qwen-vl-finetune-root /root/autodl-tmp/qwen-vl-finetune \
  --dataset-name ai_wardrobe_multimodal \
  --annotation-path /mnt/external-disk/AAtrain/model_training/exports/multimodal-reader-qwen/annotations/train.json \
  --data-path /mnt/external-disk/AAtrain/model_training/datasets/multimodal-reader
```

Train:

```bash
QWEN_VL_FINETUNE_ROOT=/root/autodl-tmp/qwen-vl-finetune \
MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct \
OUTPUT_DIR=/mnt/external-disk/AAtrain/model_training/checkpoints/multimodal-reader \
NPROC_PER_NODE=1 \
TRAIN_BATCH_SIZE=1 \
EVAL_BATCH_SIZE=1 \
GRAD_ACCUM_STEPS=8 \
NUM_EPOCHS=2 \
bash training/lora-finetune/run-multimodal-reader.sh
```

Serve the merged/exported checkpoint if your Qwen finetune workflow produced a standalone HF model directory. If you only kept the adapter, follow the official Qwen deployment path for that repo first, then point the standalone worker upstream to the resulting endpoint:

```bash
vllm serve /root/autodl-tmp/AAtrain/model_training/checkpoints/multimodal-reader \
  --host 0.0.0.0 \
  --port 8002 \
  --served-model-name Qwen/Qwen2.5-VL-7B-Instruct \
  --dtype bfloat16 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.88 \
  --limit-mm-per-prompt image=1 \
  --generation-config vllm
```

Standalone worker:

```bash
cd ai-services/multimodal-reader
MULTIMODAL_READER_UPSTREAM_URL=http://127.0.0.1:8002/v1 \
MULTIMODAL_READER_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct \
uvicorn main:app --host 0.0.0.0 --port 9004
```

## 5. Virtual Try-On: Official Training Route + Local Worker Deploy Route

Build the bootstrap annotation JSON files that `IDM-VTON` expects:

```bash
python training/data-prep/build_idm_vton_tagged_json.py --force
```

Train with the official `IDM-VTON` repo against the packaged `VITON-HD` bootstrap dataset:

```bash
git clone https://github.com/yisol/IDM-VTON.git /root/autodl-tmp/IDM-VTON
cd /root/autodl-tmp/IDM-VTON
pip install -r requirements.txt
accelerate launch train_xl.py \
  --pretrained_model_name_or_path yisol/IDM-VTON \
  --output_dir /mnt/external-disk/AAtrain/model_training/checkpoints/virtual-tryon/idm-vton \
  --data_dir /mnt/external-disk/AAtrain/model_training/raw-sources/tryon/viton-hd/extracted \
  --train_batch_size 1 \
  --gradient_accumulation_steps 8 \
  --mixed_precision bf16 \
  --num_train_epochs 10
```

For the current repo's local worker deployment path, use `OOTDiffusion` runtime assets:

```bash
git clone https://github.com/levihsu/OOTDiffusion.git \
  /mnt/external-disk/AAtrain/model_training/checkpoints/virtual-tryon/ootdiffusion
pip install -r /mnt/external-disk/AAtrain/model_training/checkpoints/virtual-tryon/ootdiffusion/requirements.txt
```

Then place the official OOTDiffusion checkpoints into:

```bash
/mnt/external-disk/AAtrain/model_training/checkpoints/virtual-tryon/ootdiffusion/checkpoints
```

Start the local worker:

```bash
cd /mnt/external-disk/AAtrain/ai-services/virtual-tryon
uvicorn main:app --host 0.0.0.0 --port 9005
```

## 6. Image Processor: Bootstrap Data + Pretrained Worker

The current repo marks this lane as `pretrained-inference-first`. The packaged public bootstrap sources are ready here:

```bash
cat model_training/datasets/image-processor/public-bootstrap.generated.json
```

Download the packaged pretrained support models:

```bash
python backend/scripts/download_fashion_models.py
```

Start the worker:

```bash
cd ai-services/image-processor
IMAGE_PROCESSOR_RUN_MODE=passthrough \
IMAGE_PROCESSOR_MODEL_PATH=/mnt/external-disk/AAtrain/model_training/checkpoints/image-processor \
uvicorn main:app --host 0.0.0.0 --port 9002
```

## 7. Backend Wiring

Use these env values on the 5090 server:

```bash
export LLM_RECOMMENDER_API_URL=http://127.0.0.1:8001/v1
export LLM_RECOMMENDER_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
export VLLM_BASE_URL=http://127.0.0.1:8002/v1
export QWEN_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct
export MULTIMODAL_READER_API_URL=http://127.0.0.1:9004/infer
export MULTIMODAL_READER_UPSTREAM_URL=http://127.0.0.1:8002/v1
export AI_CLEANUP_API_URL=http://127.0.0.1:9002/infer
export VIRTUAL_TRYON_API_URL=http://127.0.0.1:9005/infer
```

## 8. Important Notes

- `llm-recommender` must be trained in mergeable LoRA mode if you want a standalone vLLM-served checkpoint. Pure QLoRA adapters are lighter, but not the deployment-friendly route here.
- `multimodal-reader` training is ready, but whether you can serve the output directory directly depends on the exact artifact produced by the official Qwen finetune repo you use on the cloud box.
- `virtual-tryon` training and deployment are intentionally split:
  - training path: `IDM-VTON`
  - current in-repo worker runtime path: `OOTDiffusion`
- `image-processor` data is ready, but this repo still does not ship a native full fine-tune launcher for that lane.
- The serial controller uses `50GB` as the hard minimum free-space guard and warns once free space drops below `80GB`.
