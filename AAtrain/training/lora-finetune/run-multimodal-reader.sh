#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
QWEN_VL_FINETUNE_ROOT="${QWEN_VL_FINETUNE_ROOT:-/workspace/qwen-vl-finetune}"
MODEL_NAME="${MODEL_NAME:-Qwen/Qwen2.5-VL-7B-Instruct}"
DATASET_DIR="${DATASET_DIR:-${PROJECT_ROOT}/model_training/datasets/multimodal-reader}"
EXPORT_ROOT="${EXPORT_ROOT:-${PROJECT_ROOT}/model_training/exports/multimodal-reader-qwen}"
DATASET_NAME="${DATASET_NAME:-ai_wardrobe_multimodal}"
OUTPUT_DIR="${OUTPUT_DIR:-${PROJECT_ROOT}/model_training/checkpoints/multimodal-reader}"
NPROC_PER_NODE="${NPROC_PER_NODE:-1}"
TRAIN_BATCH_SIZE="${TRAIN_BATCH_SIZE:-1}"
EVAL_BATCH_SIZE="${EVAL_BATCH_SIZE:-1}"
GRAD_ACCUM_STEPS="${GRAD_ACCUM_STEPS:-8}"
NUM_EPOCHS="${NUM_EPOCHS:-2}"
LEARNING_RATE="${LEARNING_RATE:-2e-7}"

python "${PROJECT_ROOT}/training/data-prep/export_multimodal_reader_for_qwen.py" \
  --dataset-dir "${DATASET_DIR}" \
  --export-dir "${EXPORT_ROOT}" \
  --dataset-name "${DATASET_NAME}"

python "${PROJECT_ROOT}/training/lora-finetune/register_qwen_vl_dataset.py" \
  --qwen-vl-finetune-root "${QWEN_VL_FINETUNE_ROOT}" \
  --dataset-name "${DATASET_NAME}" \
  --annotation-path "${EXPORT_ROOT}/annotations/train.json" \
  --data-path "${DATASET_DIR}"

torchrun --nproc_per_node="${NPROC_PER_NODE}" \
  "${QWEN_VL_FINETUNE_ROOT}/qwenvl/train/train_qwen.py" \
  --deepspeed "${QWEN_VL_FINETUNE_ROOT}/scripts/zero3.json" \
  --model_name_or_path "${MODEL_NAME}" \
  --data_path "${DATASET_DIR}" \
  --dataset_use "${DATASET_NAME}%100" \
  --bf16 True \
  --fix_vit False \
  --fix_llm False \
  --tune_merger True \
  --freeze_merger False \
  --tune_mm_mlp_adapter True \
  --freeze_mm_mlp_adapter False \
  --lora_enable True \
  --vision_lr 2e-6 \
  --num_train_epochs "${NUM_EPOCHS}" \
  --per_device_train_batch_size "${TRAIN_BATCH_SIZE}" \
  --per_device_eval_batch_size "${EVAL_BATCH_SIZE}" \
  --gradient_accumulation_steps "${GRAD_ACCUM_STEPS}" \
  --evaluation_strategy "steps" \
  --eval_steps 100 \
  --save_strategy "steps" \
  --save_steps 100 \
  --save_total_limit 2 \
  --learning_rate "${LEARNING_RATE}" \
  --weight_decay 0.1 \
  --warmup_ratio 0.03 \
  --lr_scheduler_type "cosine" \
  --logging_steps 10 \
  --tf32 True \
  --max_pixels 50176 \
  --model_max_length 4096 \
  --gradient_checkpointing True \
  --lazy_preprocess True \
  --report_to none \
  --output_dir "${OUTPUT_DIR}"
