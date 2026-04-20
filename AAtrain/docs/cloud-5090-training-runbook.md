# 5090 Cloud Training Runbook

This is the practical runbook for training deployable models for AI Wardrobe on a cloud RTX 5090 machine.

## Recommended Path

If your goal is "high quality and deployable" rather than "train everything at once", use this order:

1. `llm-recommender`: highest product value and lowest deployment risk
2. `multimodal-reader`: improves attribute extraction and auto-enrich quality
3. `virtual-tryon`: highest wow factor, but also the highest data, runtime, and licensing risk

Do not spend your first week fine-tuning every vision model in the stack.
The local image cleanup chain can already start from pretrained assets.

## Product-Ready Recommendation

For a strong Stage 1 and Stage 2 rollout:

1. Train `Qwen/Qwen2.5-7B-Instruct` with LoRA / QLoRA for recommendation.
2. Deploy that checkpoint behind an OpenAI-compatible endpoint such as vLLM.
3. Add `Qwen/Qwen2.5-VL-7B-Instruct` later for attribute understanding and structured garment extraction.
4. Keep image cleanup on pretrained `SAM2 + SCHP + YOLO + FashionCLIP` or a licensed remote cleanup service first.
5. Treat virtual try-on as a separate R&D lane unless you have already cleared licensing and inference cost.

## Important Commercial Notes

Before you invest time and money, check the license boundary:

- `Qwen/Qwen2.5-7B-Instruct`: Apache 2.0 according to the model card. Suitable for commercial use with normal compliance.
  Source: <https://huggingface.co/Qwen/Qwen2.5-7B-Instruct>
- `Qwen/Qwen2.5-VL-7B-Instruct`: Apache 2.0 according to the model card.
  Source: <https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct>
- `briaai/RMBG-2.0`: the model card states `cc-by-nc-4.0`, with commercial use routed to Bria licensing. Do not assume it is commercial-safe by default.
  Source: <https://huggingface.co/briaai/RMBG-2.0>
- `yisol/IDM-VTON`: the model card states `CC-BY-NC-SA-4.0`. This is research-friendly, not a clean default for commercial deployment.
  Source: <https://huggingface.co/yisol/IDM-VTON>
- `Dress Code`: the repository README states the dataset is not released to private companies.
  Source: <https://github.com/aimagelab/dress-code>
- `VITON-HD`: the repository is research-oriented. Treat it as an R&D benchmark unless your legal review clears it.
  Source: <https://github.com/shadow2496/VITON-HD>
- `OOTDiffusion`: use as a research baseline first, not as an automatically cleared production asset.
  Source: <https://github.com/levihsu/OOTDiffusion>

## What To Train

### 1. LLM Recommender

Base model:

- `Qwen/Qwen2.5-7B-Instruct`

Why this first:

- directly improves recommendation quality
- easiest to evaluate offline
- easiest to deploy behind vLLM
- lowest legal and runtime risk in the current stack

Target repo paths:

- dataset: `model_training/datasets/llm-recommender/`
- checkpoint: `model_training/checkpoints/llm-recommender/`
- training config: [`../training/configs/llm-recommender.stage1.yaml`](../training/configs/llm-recommender.stage1.yaml)

Recommended data mix:

1. 60-80% your own product-style labeled wardrobe prompts
2. 10-20% outfit compatibility structure from Polyvore-like sources
3. 10-20% text-image fashion retrieval phrasing from FashionIQ-like sources

For top accuracy, your private labeled data matters more than adding endless public fashion rows.

### 2. Multimodal Reader

Base model:

- `Qwen/Qwen2.5-VL-7B-Instruct`

Use it for:

- color
- fabric
- style
- mood
- scene fit
- garment attribute QA

Target repo paths:

- dataset: `model_training/datasets/multimodal-reader/`
- checkpoint: `model_training/checkpoints/multimodal-reader/`
- training config: [`../training/configs/multimodal-reader.stage2.yaml`](../training/configs/multimodal-reader.stage2.yaml)

Do this after the recommender is stable.

### 3. Virtual Try-On

Research bases:

- `IDM-VTON`
- `OOTDiffusion`
- `VITON-HD`

Target repo paths:

- dataset: `model_training/datasets/virtual-tryon/`
- checkpoint: `model_training/checkpoints/virtual-tryon/`
- training config: [`../training/configs/virtual-tryon.stage2.yaml`](../training/configs/virtual-tryon.stage2.yaml)

This lane is expensive and legally sensitive.
Use it only after:

1. legal review passes
2. you have paired person-garment data
3. you are ready to operate a dedicated GPU inference service

## Public Source Matrix

### Recommender sources

- FashionIQ
  Official page: <https://fashion-iq.github.io/>
  Repo: <https://github.com/XiaoxiaoGuo/fashion-iq>
  Use for text phrasing and retrieval-style description patterns.

- Polyvore Outfits
  Repo: <https://github.com/xthan/polyvore-dataset>
  Use for outfit composition structure and compatibility patterns.

- DeepFashion2
  Repo: <https://github.com/switchablenorms/DeepFashion2>
  Use for garment categories, landmarks, and attribute structure.

### Multimodal / cleanup sources

- Qwen2.5-VL-7B-Instruct
  <https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct>

- Fashion cleanup assets
  use the repo bootstrap scripts first:
  - [`../backend/scripts/download_fashion_models.py`](../backend/scripts/download_fashion_models.py)

### Try-on sources

- IDM-VTON
  <https://huggingface.co/yisol/IDM-VTON>

- OOTDiffusion
  <https://github.com/levihsu/OOTDiffusion>

- Dress Code
  <https://github.com/aimagelab/dress-code>

- VITON-HD
  <https://github.com/shadow2496/VITON-HD>

## Day-0 Cloud Checklist

Use Ubuntu on the cloud machine.

1. Confirm the GPU:

```bash
nvidia-smi
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

2. Clone the repo:

```bash
git clone <your-repo-url>
cd AI-wardrobe-clean-0418
```

3. Create the workspace, generate the final 5200/600 corpus with the premium refinement overlay, and pull public metadata:

```bash
python training/data-prep/bootstrap_stage1_workspace.py --generate-seed-llm --train-size 5200 --eval-size 600 --download-public-sources
```

4. Review the annotation contract before extending the dataset:

- [`../training/data-prep/high-quality-annotation-spec.md`](../training/data-prep/high-quality-annotation-spec.md)

5. Install the LoRA training dependencies:

```bash
pip install -r training/lora-finetune/requirements-autodl.txt
```

6. Log in to Hugging Face if you will pull model weights there:

```bash
hf auth login
```

7. Pre-download the Qwen base model if you want explicit cache control:

```bash
hf download Qwen/Qwen2.5-7B-Instruct --local-dir /workspace/models/qwen2.5-7b-instruct
```

8. Download local cleanup assets if you want the segmentation chain ready:

```bash
python backend/scripts/download_fashion_models.py
```

9. Download a try-on base snapshot only if you are intentionally entering the try-on lane:

```bash
python backend/scripts/download_virtual_tryon_models.py --repo-id yisol/IDM-VTON --full
```

10. Build the multimodal-reader seed set if you are entering Stage 2:

```bash
python training/data-prep/build_multimodal_reader_dataset.py --train-size 2400 --eval-size 300
python training/data-prep/validate_multimodal_reader_jsonl.py model_training/datasets/multimodal-reader/train.jsonl model_training/datasets/multimodal-reader/eval.jsonl
python training/data-prep/audit_multimodal_reader_dataset.py model_training/datasets/multimodal-reader/train.jsonl model_training/datasets/multimodal-reader/eval.jsonl
```

10a. If you already have private catalog images, import them and train on the mixed set:

```bash
python training/data-prep/import_multimodal_private_catalog.py \
  --catalog training/data-prep/private-multimodal-catalog.template.csv
python training/data-prep/export_multimodal_reader_for_qwen.py \
  --dataset-dir model_training/datasets/multimodal-reader \
  --export-dir model_training/exports/multimodal-reader-qwen
```

11. Bootstrap the try-on paired-data workspace before you collect private data:

```bash
python training/data-prep/bootstrap_virtual_tryon_workspace.py
```

## Day-1 Recommender Training Checklist

1. Start from the seed files:

- `model_training/datasets/llm-recommender/train.jsonl`
- `model_training/datasets/llm-recommender/eval.jsonl`

2. Replace and expand them with your own labeled data.

3. Validate JSONL:

```bash
python training/data-prep/validate_llm_jsonl.py \
  model_training/datasets/llm-recommender/train.jsonl \
  model_training/datasets/llm-recommender/eval.jsonl
```

4. Run the heuristic quality audit:

```bash
python training/data-prep/audit_curated_llm_dataset.py \
  model_training/datasets/llm-recommender/train.jsonl \
  model_training/datasets/llm-recommender/eval.jsonl
```

5. Run the first QLoRA pass:

```bash
python training/lora-finetune/train_llm_recommender.py \
  --model-name Qwen/Qwen2.5-7B-Instruct \
  --train-file model_training/datasets/llm-recommender/train.jsonl \
  --eval-file model_training/datasets/llm-recommender/eval.jsonl \
  --output-dir model_training/checkpoints/llm-recommender \
  --load-in-4bit \
  --bf16
```

6. Save your evaluation notes in `training/eval/`.

## Accuracy Upgrade Rules

If you want "top tier" quality instead of a merely working checkpoint:

1. Prefer 1,000-5,000 carefully labeled product-style rows over 50,000 weak rows.
2. Keep your JSON output schema stable during labeling.
3. Add hard negatives:
   - wrong weather
   - wrong occasion
   - wrong silhouette
   - repeated overused hero pieces
4. Score on human preference, not only loss.
5. Track JSON validity rate, item-id correctness rate, and style-match pass rate.

Recommended minimum acceptance gates for the recommender:

- JSON validity: `>= 99%`
- chosen `item_ids` all exist in the provided wardrobe snapshot: `100%`
- human preference win rate vs baseline heuristic: `>= 70%`
- "would ship this answer" reviewer pass rate: `>= 80%`

## Deployment Path

For a deployable model, prefer an OpenAI-compatible serving path.

### Option A: vLLM

Recommended for the recommender and later the multimodal reader.

Example:

```bash
python -m vllm.entrypoints.openai.api_server \
  --host 0.0.0.0 \
  --port 8001 \
  --model /workspace/AI-wardrobe-clean-0418/model_training/checkpoints/llm-recommender
```

Then set:

```env
LLM_RECOMMENDER_API_URL=http://127.0.0.1:8001/v1
LLM_RECOMMENDER_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
MODEL_USE_LOCAL_LLM_RECOMMENDER=false
```

The backend already understands OpenAI-compatible endpoints in the recommendation flow:
[`../backend/services/recommendation_service.py`](../backend/services/recommendation_service.py)

For the full containerized serving path, use:
[`model-serving-stack.md`](model-serving-stack.md)

For the multimodal private-data import, Qwen finetune handoff, and deployment path, use:
[`multimodal-reader-cloud-runbook.md`](multimodal-reader-cloud-runbook.md)

### Option B: Dedicated worker

Use the worker contract:

- `GET /health`
- `POST /infer`

Reference:
- [`ai-workers.md`](ai-workers.md)

## Production Env Values To Fill

At minimum:

```env
LLM_RECOMMENDER_API_URL=http://your-llm-endpoint/v1
LLM_RECOMMENDER_MODEL_NAME=Qwen/Qwen2.5-7B-Instruct
MULTIMODAL_READER_API_URL=http://your-vl-endpoint/v1
VIRTUAL_TRYON_API_URL=http://your-tryon-worker/infer
```

If you are serving the recommender through vLLM directly, do not point it at the heuristic worker.

## What I Recommend You Actually Do Next

If you want the strongest practical path from this repo:

1. Train and deploy `Qwen/Qwen2.5-7B-Instruct` first.
2. Use your own labeled wardrobe data as the main signal.
3. Bring up vLLM and route `LLM_RECOMMENDER_API_URL` to it.
4. Add `Qwen/Qwen2.5-VL-7B-Instruct` next.
5. Delay try-on until licensing and paired data are truly ready.

For the try-on collection and QA plan, use:
[`virtual-tryon-data-plan.md`](../training/data-prep/virtual-tryon-data-plan.md)
[`virtual-tryon-execution-checklist.md`](virtual-tryon-execution-checklist.md)

That path is much more likely to give you a real production win than trying to perfect try-on first.
