#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
QWEN_VL_FINETUNE_ROOT="${QWEN_VL_FINETUNE_ROOT:-/root/autodl-tmp/qwen-vl-finetune}"
IDM_VTON_ROOT="${IDM_VTON_ROOT:-/root/autodl-tmp/IDM-VTON}"
PYTHON_BIN="${PYTHON_BIN:-python}"
LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/logs/5090-serial}"
WARN_FREE_GB="${WARN_FREE_GB:-80}"
MIN_FREE_GB="${MIN_FREE_GB:-50}"
HF_HOME="${HF_HOME:-${PROJECT_ROOT}/model_training/cache/hf}"
TORCH_HOME="${TORCH_HOME:-${PROJECT_ROOT}/model_training/cache/torch}"
LLM_OUTPUT_DIR="${LLM_OUTPUT_DIR:-${PROJECT_ROOT}/model_training/checkpoints/llm-recommender}"
LLM_MERGED_DIR="${LLM_MERGED_DIR:-${PROJECT_ROOT}/model_training/checkpoints/llm-recommender-merged}"
MULTIMODAL_OUTPUT_DIR="${MULTIMODAL_OUTPUT_DIR:-${PROJECT_ROOT}/model_training/checkpoints/multimodal-reader}"
IDM_VTON_OUTPUT_DIR="${IDM_VTON_OUTPUT_DIR:-${PROJECT_ROOT}/model_training/checkpoints/virtual-tryon/idm-vton}"
IDM_VTON_DATA_DIR="${IDM_VTON_DATA_DIR:-${PROJECT_ROOT}/model_training/raw-sources/tryon/viton-hd/extracted}"
IDM_VTON_NUM_TRAIN_EPOCHS="${IDM_VTON_NUM_TRAIN_EPOCHS:-10}"
IMAGE_PROCESSOR_PORT="${IMAGE_PROCESSOR_PORT:-9002}"
IMAGE_PROCESSOR_HEALTH_URL="${IMAGE_PROCESSOR_HEALTH_URL:-http://127.0.0.1:${IMAGE_PROCESSOR_PORT}/health}"
SERVICE_COMMANDS_FILE="${SERVICE_COMMANDS_FILE:-${LOG_DIR}/stage5-service-commands.generated.txt}"

RUN_LLM_TRAIN="${RUN_LLM_TRAIN:-1}"
RUN_LLM_MERGE="${RUN_LLM_MERGE:-1}"
RUN_MULTIMODAL_TRAIN="${RUN_MULTIMODAL_TRAIN:-1}"
PREP_VIRTUAL_TRYON_DATA="${PREP_VIRTUAL_TRYON_DATA:-1}"
RUN_IDM_VTON_TRAIN="${RUN_IDM_VTON_TRAIN:-1}"
PREP_OOT_RUNTIME="${PREP_OOT_RUNTIME:-1}"
PREP_IMAGE_PROCESSOR="${PREP_IMAGE_PROCESSOR:-1}"

cd "${PROJECT_ROOT}"
mkdir -p "${LOG_DIR}" "${HF_HOME}" "${TORCH_HOME}"
export HF_HOME
export TORCH_HOME

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

print_disk_report() {
  "${PYTHON_BIN}" - "${PROJECT_ROOT}" <<'PY'
import shutil
import sys

path = sys.argv[1]
usage = shutil.disk_usage(path)

def fmt(value: int) -> str:
    return f"{value / (1024 ** 3):.1f} GB"

print(f"[disk] target={path}")
print(f"[disk] used={fmt(usage.used)} free={fmt(usage.free)} total={fmt(usage.total)}")
PY
}

free_disk_gb() {
  "${PYTHON_BIN}" - "${PROJECT_ROOT}" <<'PY'
import shutil
import sys

print(shutil.disk_usage(sys.argv[1]).free // (1024 ** 3))
PY
}

enforce_free_space() {
  local label="${1:-checkpoint}"
  local free_gb
  free_gb="$(free_disk_gb)"
  echo "[$(timestamp)] [disk] ${label}: free=${free_gb}GB warn<${WARN_FREE_GB}GB stop<${MIN_FREE_GB}GB"
  if (( free_gb < WARN_FREE_GB )); then
    echo "[$(timestamp)] [warn] free space is below ${WARN_FREE_GB}GB. Watch checkpoints and cache growth."
  fi
  if (( free_gb < MIN_FREE_GB )); then
    echo "[$(timestamp)] [error] free space is below ${MIN_FREE_GB}GB. Stop before entering the next stage."
    return 1
  fi
}

run_stage() {
  local stage_name="$1"
  local next_stage="$2"
  local stage_fn="$3"
  local log_file="${LOG_DIR}/${stage_name}.log"
  : > "${log_file}"
  echo "[$(timestamp)] [stage] ${stage_name} started" | tee -a "${log_file}"
  print_disk_report | tee -a "${log_file}"
  if ! enforce_free_space "before ${stage_name}" 2>&1 | tee -a "${log_file}"; then
    return 1
  fi

  set +e
  {
    "${stage_fn}"
  } 2>&1 | tee -a "${log_file}"
  local status=${PIPESTATUS[0]}
  set -e

  print_disk_report | tee -a "${log_file}"
  if (( status != 0 )); then
    echo "[$(timestamp)] [error] ${stage_name} failed with exit code ${status}" | tee -a "${log_file}"
    return "${status}"
  fi

  if ! enforce_free_space "after ${stage_name}" 2>&1 | tee -a "${log_file}"; then
    return 1
  fi

  echo "[$(timestamp)] [ok] ${stage_name} completed" | tee -a "${log_file}"
  if [[ -n "${next_stage}" ]]; then
    echo "[$(timestamp)] [next] ${next_stage}" | tee -a "${log_file}"
  fi
}

cleanup_checkpoint_dirs() {
  local root_dir="$1"
  if [[ ! -d "${root_dir}" ]]; then
    return 0
  fi
  mapfile -t checkpoint_dirs < <(find "${root_dir}" -maxdepth 1 -mindepth 1 -type d -name 'checkpoint-*' | sort)
  if (( ${#checkpoint_dirs[@]} == 0 )); then
    echo "[$(timestamp)] [cleanup] no checkpoint-* directories under ${root_dir}"
    return 0
  fi
  echo "[$(timestamp)] [cleanup] removing intermediate checkpoints under ${root_dir}"
  for checkpoint_dir in "${checkpoint_dirs[@]}"; do
    echo "[$(timestamp)] [cleanup] rm -rf ${checkpoint_dir}"
    rm -rf "${checkpoint_dir}"
  done
}

stage1_llm() {
  echo "[$(timestamp)] [stage1] bootstrap Python environment"
  "${PYTHON_BIN}" -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
  pip install -U pip setuptools wheel
  pip install -r training/lora-finetune/requirements-autodl.txt
  pip install -r ai-services/image-processor/requirements.txt
  pip install -r ai-services/multimodal-reader/requirements.txt
  pip install fastapi uvicorn[standard] httpx pillow requests

  echo "[$(timestamp)] [stage1] validate llm-recommender dataset"
  "${PYTHON_BIN}" training/data-prep/validate_llm_jsonl.py \
    model_training/datasets/llm-recommender/train.jsonl \
    model_training/datasets/llm-recommender/eval.jsonl
  "${PYTHON_BIN}" training/data-prep/audit_curated_llm_dataset.py \
    model_training/datasets/llm-recommender/train.jsonl \
    model_training/datasets/llm-recommender/eval.jsonl

  if [[ "${RUN_LLM_TRAIN}" != "1" ]]; then
    echo "[$(timestamp)] [skip] RUN_LLM_TRAIN=${RUN_LLM_TRAIN}"
    return 0
  fi

  echo "[$(timestamp)] [stage1] train llm-recommender"
  "${PYTHON_BIN}" training/lora-finetune/train_llm_recommender.py \
    --model-name Qwen/Qwen2.5-7B-Instruct \
    --train-file model_training/datasets/llm-recommender/train.jsonl \
    --eval-file model_training/datasets/llm-recommender/eval.jsonl \
    --output-dir "${LLM_OUTPUT_DIR}" \
    --quantization none \
    --dtype bf16 \
    --per-device-train-batch-size 1 \
    --per-device-eval-batch-size 1 \
    --gradient-accumulation-steps 16

  if [[ "${RUN_LLM_MERGE}" == "1" ]]; then
    echo "[$(timestamp)] [stage1] merge llm-recommender adapter"
    "${PYTHON_BIN}" training/lora-finetune/merge_llm_recommender_lora.py \
      --adapter-dir "${LLM_OUTPUT_DIR}" \
      --output-dir "${LLM_MERGED_DIR}" \
      --dtype bf16
  else
    echo "[$(timestamp)] [skip] RUN_LLM_MERGE=${RUN_LLM_MERGE}"
  fi

  cleanup_checkpoint_dirs "${LLM_OUTPUT_DIR}"
}

stage2_multimodal() {
  if [[ "${RUN_MULTIMODAL_TRAIN}" != "1" ]]; then
    echo "[$(timestamp)] [skip] RUN_MULTIMODAL_TRAIN=${RUN_MULTIMODAL_TRAIN}"
    return 0
  fi

  if [[ ! -d "${QWEN_VL_FINETUNE_ROOT}/.git" ]]; then
    git clone https://github.com/QwenLM/Qwen2.5-VL.git "${QWEN_VL_FINETUNE_ROOT}"
  else
    echo "[$(timestamp)] [stage2] reusing ${QWEN_VL_FINETUNE_ROOT}"
  fi

  pip install -r "${QWEN_VL_FINETUNE_ROOT}/requirements.txt"
  "${PYTHON_BIN}" training/data-prep/export_multimodal_reader_for_qwen.py \
    --dataset-dir model_training/datasets/multimodal-reader \
    --export-dir model_training/exports/multimodal-reader-qwen \
    --dataset-name ai_wardrobe_multimodal
  "${PYTHON_BIN}" training/lora-finetune/register_qwen_vl_dataset.py \
    --qwen-vl-finetune-root "${QWEN_VL_FINETUNE_ROOT}" \
    --dataset-name ai_wardrobe_multimodal \
    --annotation-path "${PROJECT_ROOT}/model_training/exports/multimodal-reader-qwen/annotations/train.json" \
    --data-path "${PROJECT_ROOT}/model_training/datasets/multimodal-reader"

  echo "[$(timestamp)] [stage2] train multimodal-reader"
  QWEN_VL_FINETUNE_ROOT="${QWEN_VL_FINETUNE_ROOT}" \
  MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct \
  OUTPUT_DIR="${MULTIMODAL_OUTPUT_DIR}" \
  NPROC_PER_NODE=1 \
  TRAIN_BATCH_SIZE=1 \
  EVAL_BATCH_SIZE=1 \
  GRAD_ACCUM_STEPS=8 \
  NUM_EPOCHS=2 \
  bash training/lora-finetune/run-multimodal-reader.sh

  cleanup_checkpoint_dirs "${MULTIMODAL_OUTPUT_DIR}"
}

stage3_virtual_tryon() {
  if [[ "${PREP_VIRTUAL_TRYON_DATA}" == "1" ]]; then
    echo "[$(timestamp)] [stage3] build IDM-VTON bootstrap annotations"
    "${PYTHON_BIN}" training/data-prep/build_idm_vton_tagged_json.py --force
  else
    echo "[$(timestamp)] [skip] PREP_VIRTUAL_TRYON_DATA=${PREP_VIRTUAL_TRYON_DATA}"
  fi

  if [[ "${RUN_IDM_VTON_TRAIN}" == "1" ]]; then
    if [[ ! -d "${IDM_VTON_ROOT}/.git" ]]; then
      git clone https://github.com/yisol/IDM-VTON.git "${IDM_VTON_ROOT}"
    else
      echo "[$(timestamp)] [stage3] reusing ${IDM_VTON_ROOT}"
    fi

    pushd "${IDM_VTON_ROOT}" >/dev/null
    pip install -r requirements.txt
    accelerate launch train_xl.py \
      --pretrained_model_name_or_path yisol/IDM-VTON \
      --output_dir "${IDM_VTON_OUTPUT_DIR}" \
      --data_dir "${IDM_VTON_DATA_DIR}" \
      --train_batch_size 1 \
      --gradient_accumulation_steps 8 \
      --mixed_precision bf16 \
      --num_train_epochs "${IDM_VTON_NUM_TRAIN_EPOCHS}"
    popd >/dev/null
  else
    echo "[$(timestamp)] [skip] RUN_IDM_VTON_TRAIN=${RUN_IDM_VTON_TRAIN}"
  fi

  if [[ "${PREP_OOT_RUNTIME}" == "1" ]]; then
    echo "[$(timestamp)] [stage3] prepare OOTDiffusion runtime directory"
    if [[ ! -d "${PROJECT_ROOT}/model_training/checkpoints/virtual-tryon/ootdiffusion/.git" ]]; then
      git clone https://github.com/levihsu/OOTDiffusion.git \
        "${PROJECT_ROOT}/model_training/checkpoints/virtual-tryon/ootdiffusion"
    else
      echo "[$(timestamp)] [stage3] reusing OOTDiffusion runtime clone"
    fi
    pip install -r "${PROJECT_ROOT}/model_training/checkpoints/virtual-tryon/ootdiffusion/requirements.txt"
    echo "[$(timestamp)] [note] place official OOTDiffusion checkpoints into ${PROJECT_ROOT}/model_training/checkpoints/virtual-tryon/ootdiffusion/checkpoints before runtime deployment"
  else
    echo "[$(timestamp)] [skip] PREP_OOT_RUNTIME=${PREP_OOT_RUNTIME}"
  fi
}

stage4_image_processor() {
  if [[ "${PREP_IMAGE_PROCESSOR}" != "1" ]]; then
    echo "[$(timestamp)] [skip] PREP_IMAGE_PROCESSOR=${PREP_IMAGE_PROCESSOR}"
    return 0
  fi

  echo "[$(timestamp)] [stage4] image-processor bootstrap sources"
  cat model_training/datasets/image-processor/public-bootstrap.generated.json
  "${PYTHON_BIN}" backend/scripts/download_fashion_models.py

  echo "[$(timestamp)] [stage4] smoke test image-processor worker"
  pushd ai-services/image-processor >/dev/null
  IMAGE_PROCESSOR_RUN_MODE=passthrough \
  IMAGE_PROCESSOR_MODEL_PATH="${PROJECT_ROOT}/model_training/checkpoints/image-processor" \
  uvicorn main:app --host 127.0.0.1 --port "${IMAGE_PROCESSOR_PORT}" > "${LOG_DIR}/stage4-image-processor-worker.runtime.log" 2>&1 &
  local worker_pid=$!
  popd >/dev/null

  cleanup_worker() {
    if kill -0 "${worker_pid}" 2>/dev/null; then
      kill "${worker_pid}" 2>/dev/null || true
      wait "${worker_pid}" 2>/dev/null || true
    fi
  }

  trap cleanup_worker RETURN
  "${PYTHON_BIN}" - "${IMAGE_PROCESSOR_HEALTH_URL}" <<'PY'
import json
import sys
import time
import urllib.request

url = sys.argv[1]
deadline = time.time() + 60
last_error = None
while time.time() < deadline:
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            payload = json.load(response)
            print("[stage4] image-processor /health:", json.dumps(payload, ensure_ascii=False))
            sys.exit(0)
    except Exception as exc:  # pragma: no cover - runtime probe only
        last_error = exc
        time.sleep(2)

raise SystemExit(f"[stage4] image-processor smoke test failed: {last_error}")
PY
  trap - RETURN
  cleanup_worker
}

stage5_deploy_prep() {
  cat > "${SERVICE_COMMANDS_FILE}" <<EOF
Run each block below in its own shell or tmux pane.

[1] recommender
vllm serve "${LLM_MERGED_DIR}" \\
  --host 0.0.0.0 \\
  --port 8001 \\
  --served-model-name Qwen/Qwen2.5-7B-Instruct \\
  --dtype bfloat16 \\
  --max-model-len 4096 \\
  --gpu-memory-utilization 0.90 \\
  --generation-config vllm

[2] multimodal model
vllm serve "${MULTIMODAL_OUTPUT_DIR}" \\
  --host 0.0.0.0 \\
  --port 8002 \\
  --served-model-name Qwen/Qwen2.5-VL-7B-Instruct \\
  --dtype bfloat16 \\
  --max-model-len 8192 \\
  --gpu-memory-utilization 0.88 \\
  --limit-mm-per-prompt image=1 \\
  --generation-config vllm

[3] image-processor worker
cd "${PROJECT_ROOT}/ai-services/image-processor"
IMAGE_PROCESSOR_RUN_MODE=passthrough \\
IMAGE_PROCESSOR_MODEL_PATH="${PROJECT_ROOT}/model_training/checkpoints/image-processor" \\
uvicorn main:app --host 0.0.0.0 --port ${IMAGE_PROCESSOR_PORT}

[4] multimodal-reader worker
cd "${PROJECT_ROOT}/ai-services/multimodal-reader"
MULTIMODAL_READER_UPSTREAM_URL=http://127.0.0.1:8002/v1 \\
MULTIMODAL_READER_MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct \\
uvicorn main:app --host 0.0.0.0 --port 9004

[5] virtual-tryon worker
cd "${PROJECT_ROOT}/ai-services/virtual-tryon"
uvicorn main:app --host 0.0.0.0 --port 9005
EOF
  echo "[$(timestamp)] [stage5] deployment commands generated at ${SERVICE_COMMANDS_FILE}"
  cat "${SERVICE_COMMANDS_FILE}"
}

run_stage "stage1-llm" "stage2-multimodal" stage1_llm
run_stage "stage2-multimodal" "stage3-tryon" stage2_multimodal
run_stage "stage3-tryon" "stage4-image-processor" stage3_virtual_tryon
run_stage "stage4-image-processor" "stage5-deploy-prep" stage4_image_processor
run_stage "stage5-deploy-prep" "" stage5_deploy_prep
