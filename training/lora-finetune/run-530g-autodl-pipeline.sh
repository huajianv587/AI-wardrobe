#!/usr/bin/env bash
set -euo pipefail

WORK_ROOT="${WORK_ROOT:-/root/autodl-tmp}"
PROJECT_ROOT="${PROJECT_ROOT:-${WORK_ROOT}/AAtrain}"
if [[ -z "${STAGE_TAR_DIR:-}" ]]; then
  if [[ -d "${PROJECT_ROOT}/staged-tars" ]]; then
    STAGE_TAR_DIR="${PROJECT_ROOT}/staged-tars"
  else
    STAGE_TAR_DIR="${WORK_ROOT}/staged-tars"
  fi
fi
PYTHON_BIN="${PYTHON_BIN:-python}"
LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/logs/530g-pipeline}"
WARN_FREE_GB="${WARN_FREE_GB:-150}"
MIN_FREE_GB="${MIN_FREE_GB:-100}"
DELETE_TARS_AFTER_EXTRACT="${DELETE_TARS_AFTER_EXTRACT:-1}"

HF_HOME="${HF_HOME:-${WORK_ROOT}/cache/hf}"
TORCH_HOME="${TORCH_HOME:-${WORK_ROOT}/cache/torch}"
PIP_CACHE_DIR="${PIP_CACHE_DIR:-${WORK_ROOT}/cache/pip}"
QWEN_VL_REPO_ROOT="${QWEN_VL_REPO_ROOT:-${WORK_ROOT}/qwen-vl-finetune-repo}"
IDM_VTON_ROOT="${IDM_VTON_ROOT:-${WORK_ROOT}/IDM-VTON}"
IP_ADAPTER_ROOT="${IP_ADAPTER_ROOT:-${WORK_ROOT}/IP-Adapter}"

LLM_OUTPUT_DIR="${LLM_OUTPUT_DIR:-${PROJECT_ROOT}/model_training/checkpoints/llm-recommender}"
LLM_MERGED_DIR="${LLM_MERGED_DIR:-${PROJECT_ROOT}/model_training/checkpoints/llm-recommender-merged}"
MULTIMODAL_OUTPUT_DIR="${MULTIMODAL_OUTPUT_DIR:-${PROJECT_ROOT}/model_training/checkpoints/multimodal-reader}"
IDM_VTON_OUTPUT_DIR="${IDM_VTON_OUTPUT_DIR:-${PROJECT_ROOT}/model_training/checkpoints/virtual-tryon/idm-vton}"
IDM_VTON_DATA_DIR="${IDM_VTON_DATA_DIR:-${PROJECT_ROOT}/model_training/raw-sources/tryon/viton-hd/extracted}"

export HF_HOME TORCH_HOME PIP_CACHE_DIR

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  echo "[$(timestamp)] $*"
}

mkdir -p "${LOG_DIR}" "${HF_HOME}" "${TORCH_HOME}" "${PIP_CACHE_DIR}" "${STAGE_TAR_DIR}"

disk_report() {
  df -h "${WORK_ROOT}" || true
  if [[ -d "${PROJECT_ROOT}" ]]; then
    du -sh "${PROJECT_ROOT}" || true
  fi
  du -sh "${WORK_ROOT}/cache" 2>/dev/null || true
}

free_disk_gb() {
  "${PYTHON_BIN}" - "${WORK_ROOT}" <<'PY'
import shutil
import sys

print(shutil.disk_usage(sys.argv[1]).free // (1024 ** 3))
PY
}

require_free_space() {
  local label="${1:-checkpoint}"
  local free_gb
  free_gb="$(free_disk_gb)"
  log "[disk] ${label}: free=${free_gb}GB warn<${WARN_FREE_GB}GB stop<${MIN_FREE_GB}GB"
  if (( free_gb < WARN_FREE_GB )); then
    log "[warn] free space below ${WARN_FREE_GB}GB"
  fi
  if (( free_gb < MIN_FREE_GB )); then
    log "[error] free space below ${MIN_FREE_GB}GB; stop before the next stage"
    return 1
  fi
}

run_logged() {
  local name="$1"
  shift
  mkdir -p "${LOG_DIR}"
  log "[run] ${name}"
  set +e
  "$@" 2>&1 | tee "${LOG_DIR}/${name}.log"
  local status=${PIPESTATUS[0]}
  set -e
  if (( status != 0 )); then
    log "[error] ${name} failed with exit code ${status}"
    return "${status}"
  fi
}

verify_stage_tar() {
  local tar_name="$1"
  local tar_path="${STAGE_TAR_DIR}/${tar_name}"
  if [[ ! -f "${tar_path}" ]]; then
    log "[error] missing ${tar_path}"
    return 1
  fi
  if [[ -f "${STAGE_TAR_DIR}/sha256sums.generated.txt" ]]; then
    (cd "${STAGE_TAR_DIR}" && sha256sum --ignore-missing -c sha256sums.generated.txt)
  else
    log "[warn] no sha256sums.generated.txt beside staged tars; skipping checksum verification"
  fi
}

extract_stage() {
  local stage_name="$1"
  local tar_name="${stage_name}.tar"
  local tar_path="${STAGE_TAR_DIR}/${tar_name}"
  require_free_space "before extracting ${stage_name}"
  verify_stage_tar "${tar_name}"
  log "[extract] ${tar_path} -> ${WORK_ROOT}"
  tar -xf "${tar_path}" -C "${WORK_ROOT}"
  if [[ "${DELETE_TARS_AFTER_EXTRACT}" == "1" ]]; then
    log "[cleanup] rm ${tar_path}"
    rm -f "${tar_path}"
  fi
  require_free_space "after extracting ${stage_name}"
}

install_base_requirements() {
  cd "${PROJECT_ROOT}"
  require_free_space "before pip install"
  "${PYTHON_BIN}" -m pip install -U pip setuptools wheel
  "${PYTHON_BIN}" -m pip install -r training/lora-finetune/requirements-autodl.txt
  "${PYTHON_BIN}" -m pip install -r ai-services/image-processor/requirements.txt
  "${PYTHON_BIN}" -m pip install -r ai-services/multimodal-reader/requirements.txt
  "${PYTHON_BIN}" -m pip install fastapi 'uvicorn[standard]' httpx pillow requests huggingface_hub
}

prefetch_hf_model() {
  local model_id="$1"
  log "[prefetch] ${model_id}"
  "${PYTHON_BIN}" - "${model_id}" <<'PY'
import sys
from huggingface_hub import snapshot_download

model_id = sys.argv[1]
snapshot_download(model_id)
print(f"[ok] cached {model_id}")
PY
}

clone_or_update() {
  local url="$1"
  local target="$2"
  if [[ -d "${target}/.git" ]]; then
    log "[git] reusing ${target}"
  else
    log "[git] clone ${url} -> ${target}"
    git clone --depth 1 "${url}" "${target}"
  fi
}

qwen_vl_finetune_root() {
  if [[ -f "${QWEN_VL_REPO_ROOT}/qwenvl/train/train_qwen.py" ]]; then
    echo "${QWEN_VL_REPO_ROOT}"
    return 0
  fi
  if [[ -f "${QWEN_VL_REPO_ROOT}/qwen-vl-finetune/qwenvl/train/train_qwen.py" ]]; then
    echo "${QWEN_VL_REPO_ROOT}/qwen-vl-finetune"
    return 0
  fi
  log "[error] cannot find qwenvl/train/train_qwen.py under ${QWEN_VL_REPO_ROOT}"
  return 1
}

cleanup_checkpoint_dirs() {
  local root_dir="$1"
  if [[ ! -d "${root_dir}" ]]; then
    return 0
  fi
  find "${root_dir}" -maxdepth 1 -mindepth 1 -type d -name 'checkpoint-*' -print -exec rm -rf {} +
}

validate_stage0_data() {
  cd "${PROJECT_ROOT}"
  "${PYTHON_BIN}" training/data-prep/validate_llm_jsonl.py \
    model_training/datasets/llm-recommender/train.jsonl \
    model_training/datasets/llm-recommender/eval.jsonl
  "${PYTHON_BIN}" training/data-prep/audit_curated_llm_dataset.py \
    model_training/datasets/llm-recommender/train.jsonl \
    model_training/datasets/llm-recommender/eval.jsonl
}

validate_stage1_data() {
  cd "${PROJECT_ROOT}"
  "${PYTHON_BIN}" training/data-prep/validate_multimodal_reader_jsonl.py \
    model_training/datasets/multimodal-reader/train.jsonl \
    model_training/datasets/multimodal-reader/eval.jsonl
}

train_llm() {
  cd "${PROJECT_ROOT}"
  require_free_space "before llm training"
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

  "${PYTHON_BIN}" training/lora-finetune/merge_llm_recommender_lora.py \
    --adapter-dir "${LLM_OUTPUT_DIR}" \
    --output-dir "${LLM_MERGED_DIR}" \
    --dtype bf16
  cleanup_checkpoint_dirs "${LLM_OUTPUT_DIR}"
  require_free_space "after llm training"
}

setup_after_stage0() {
  install_base_requirements
  validate_stage0_data
  prefetch_hf_model Qwen/Qwen2.5-7B-Instruct
  disk_report
}

prepare_qwen_vl() {
  prefetch_hf_model Qwen/Qwen2.5-VL-7B-Instruct
  clone_or_update https://github.com/QwenLM/Qwen2.5-VL.git "${QWEN_VL_REPO_ROOT}"
  local finetune_root
  finetune_root="$(qwen_vl_finetune_root)"
  if [[ -f "${finetune_root}/requirements.txt" ]]; then
    "${PYTHON_BIN}" -m pip install -r "${finetune_root}/requirements.txt"
  fi
}

train_multimodal() {
  cd "${PROJECT_ROOT}"
  local finetune_root
  finetune_root="$(qwen_vl_finetune_root)"
  validate_stage1_data
  QWEN_VL_FINETUNE_ROOT="${finetune_root}" \
  MODEL_NAME=Qwen/Qwen2.5-VL-7B-Instruct \
  OUTPUT_DIR="${MULTIMODAL_OUTPUT_DIR}" \
  NPROC_PER_NODE=1 \
  TRAIN_BATCH_SIZE=1 \
  EVAL_BATCH_SIZE=1 \
  GRAD_ACCUM_STEPS=8 \
  NUM_EPOCHS=2 \
  bash training/lora-finetune/run-multimodal-reader.sh
  cleanup_checkpoint_dirs "${MULTIMODAL_OUTPUT_DIR}"
  require_free_space "after multimodal training"
}

prepare_tryon_assets() {
  clone_or_update https://github.com/yisol/IDM-VTON.git "${IDM_VTON_ROOT}"
  clone_or_update https://huggingface.co/h94/IP-Adapter "${IP_ADAPTER_ROOT}"
  clone_or_update https://github.com/levihsu/OOTDiffusion.git \
    "${PROJECT_ROOT}/model_training/checkpoints/virtual-tryon/ootdiffusion"

  mkdir -p "${IDM_VTON_ROOT}/ckpt"
  if [[ -d "${IP_ADAPTER_ROOT}/sdxl_models" ]]; then
    ln -sfn "${IP_ADAPTER_ROOT}/sdxl_models" "${IDM_VTON_ROOT}/ckpt/ip_adapter"
  fi
  if [[ -d "${IP_ADAPTER_ROOT}/models/image_encoder" ]]; then
    ln -sfn "${IP_ADAPTER_ROOT}/models/image_encoder" "${IDM_VTON_ROOT}/ckpt/image_encoder"
  fi

  prefetch_hf_model yisol/IDM-VTON
}

install_idm_runtime_requirements() {
  if [[ -f "${IDM_VTON_ROOT}/requirements.txt" ]]; then
    "${PYTHON_BIN}" -m pip install -r "${IDM_VTON_ROOT}/requirements.txt"
    return 0
  fi

  log "[warn] IDM-VTON has no requirements.txt; installing pip deps from its environment.yaml"
  "${PYTHON_BIN}" -m pip install \
    accelerate==0.25.0 torchmetrics==1.2.1 tqdm==4.66.1 transformers==4.36.2 \
    diffusers==0.25.0 einops==0.7.0 bitsandbytes==0.39.0 scipy==1.11.1 \
    opencv-python gradio==4.24.0 fvcore cloudpickle omegaconf pycocotools \
    basicsr av onnxruntime==1.16.2
}

train_tryon() {
  cd "${PROJECT_ROOT}"
  require_free_space "before try-on training"
  "${PYTHON_BIN}" training/data-prep/build_idm_vton_tagged_json.py --force
  install_idm_runtime_requirements
  pushd "${IDM_VTON_ROOT}" >/dev/null
  accelerate launch train_xl.py \
    --pretrained_model_name_or_path yisol/IDM-VTON \
    --output_dir "${IDM_VTON_OUTPUT_DIR}" \
    --data_dir "${IDM_VTON_DATA_DIR}" \
    --train_batch_size 1 \
    --gradient_accumulation_steps 8 \
    --mixed_precision bf16 \
    --num_train_epochs "${IDM_VTON_NUM_TRAIN_EPOCHS:-10}"
  popd >/dev/null
  require_free_space "after try-on training"
}

help_text() {
  cat <<'EOF'
530G AutoDL staged pipeline

Expected staged tar directory:
  /root/autodl-tmp/AAtrain/staged-tars

Fallback staged tar directory:
  /root/autodl-tmp/staged-tars

Manual/AutoPanel flow:
  1. Upload and download the AAtrain folder.
  2. Run: bash training/lora-finetune/run-530g-autodl-pipeline.sh setup-after-stage0
  3. Start LLM training.
  4. Before multimodal training, run prepare-stage1 to extract stage1 from AAtrain/staged-tars.
  5. Before try-on training, run prepare-stage2 to extract stage2 from AAtrain/staged-tars.

Commands:
  disk              Print disk usage.
  extract STAGE     Extract one stage tar, then delete it when DELETE_TARS_AFTER_EXTRACT=1.
  setup-stage0      Extract stage0, install base deps, validate LLM data, prefetch Qwen2.5-7B.
  setup-after-stage0
                    Run setup after stage0 has already been manually extracted.
  train-llm         Train and merge llm-recommender.
  prepare-stage1    Extract stage1, validate multimodal data, prefetch Qwen2.5-VL, clone Qwen repo.
  train-multimodal  Train multimodal-reader.
  prepare-stage2    Extract stage2, clone/prefetch IDM-VTON, IP-Adapter, OOTDiffusion.
  train-tryon       Train IDM-VTON on packaged VITON-HD.

Recommended guards:
  WARN_FREE_GB=150 MIN_FREE_GB=100
EOF
}

command="${1:-help}"
case "${command}" in
  disk)
    disk_report
    ;;
  extract)
    extract_stage "${2:?stage name required, e.g. stage1-multimodal-reader}"
    ;;
  setup-stage0)
    extract_stage stage0-code-llm
    setup_after_stage0
    ;;
  setup-after-stage0)
    setup_after_stage0
    ;;
  train-llm)
    run_logged train-llm train_llm
    ;;
  prepare-stage1)
    extract_stage stage1-multimodal-reader
    validate_stage1_data
    prepare_qwen_vl
    disk_report
    ;;
  train-multimodal)
    run_logged train-multimodal train_multimodal
    ;;
  prepare-stage2)
    extract_stage stage2-virtual-tryon
    prepare_tryon_assets
    disk_report
    ;;
  train-tryon)
    run_logged train-tryon train_tryon
    ;;
  help|--help|-h)
    help_text
    ;;
  *)
    log "[error] unknown command: ${command}"
    help_text
    exit 2
    ;;
esac
