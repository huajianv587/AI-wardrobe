# Data Preparation

## 530G AutoDL staged upload

For the 530G AutoDL workflow, do not use split volumes or ZIP. Keep code and LLM data expanded, and turn later-stage data into staged uncompressed TAR files inside `AAtrain/staged-tars`:

```powershell
python training\data-prep\package_AAtrain_staged_for_autodl.py --source-dir AAtrain --in-place-prune --fresh --overwrite
```

Then upload the whole `AAtrain` folder. See `docs/autodl-530g-pipeline.md` for the AutoDL extraction and training sequence.

Use this folder for turning raw datasets into service-ready corpora.

## Stage 1 datasets to care about first

### LLM Recommender

- FashionIQ
- Polyvore Outfits
- your own labeled wardrobe prompts
- `high-quality-annotation-spec.md` for the labeling contract
- `generate_curated_llm_dataset.py` for a clean starter corpus
- `download_public_sources.py` for public metadata exports and source references
- `download_internal_research_datasets.py` for large internal-use research datasets such as DeepFashion and SHIFT15M
- `watch_internal_research_downloads.py` for writing ongoing progress snapshots while long downloads are running
- `prepare_AAtrain_bundle.py` for assembling a portable `AAtrain/` handoff for the 5090 box

Target output format:

- JSONL
- one instruction-style sample per line

Recommended schema:

```json
{
  "instruction": "You are AI Wardrobe's outfit recommendation assistant. Return grounded JSON only.",
  "input": {
    "prompt": "I need an office look for a mild rainy commute.",
    "weather": "18C, light rain, indoor AC",
    "scene": "office commute",
    "style": "soft formal",
    "wardrobe_items": [
      {"id": 101, "name": "Ivory Fluid Shirt", "slot": "top", "color": "Ivory", "tags": ["soft", "clean"]},
      {"id": 205, "name": "Charcoal Wide Trouser", "slot": "bottom", "color": "Charcoal", "tags": ["minimal", "formal"]}
    ]
  },
  "output": {
    "source": "curated-train",
    "outfits": [
      {
        "title": "Rain-Ready Soft Tailoring",
        "item_ids": [101, 205],
        "rationale": "The grounded palette keeps the look office-ready while the fabric mix stays comfortable for a damp commute.",
        "confidence": 0.91,
        "confidence_label": "high fit"
      }
    ],
    "agent_trace": [],
    "profile_summary": "Your strongest looks tend to pair clean structure with one softer layer.",
    "closet_gaps": [],
    "reminder_flags": []
  }
}
```

Recommended build order:

1. Build the final corpus with `build_llm_recommender_corpus.py`
2. Validate it with `validate_llm_jsonl.py`
3. Audit it with `audit_curated_llm_dataset.py`
4. Export public metadata with `download_public_sources.py`
5. Rewrite public-source inspiration into product-style supervised rows

For internal research-only datasets:

1. Review the source terms and official download notes in `dataset-sources.md`
2. Run `download_internal_research_datasets.py`
3. If DeepFashion or DeepFashion2 archives are encrypted, provide
   `DEEPFASHION_UNZIP_PASSWORD` or `DEEPFASHION2_UNZIP_PASSWORD`
4. Check `model_training/raw-sources/internal-research-download-report.generated.json`

### Image Processor

Stage 1 does not require full fine-tuning.

Prepare instead:

- test images
- before/after validation pairs
- private product photography samples

This is enough to benchmark RMBG / BiRefNet before you decide whether fine-tuning is worth the cost.

## Stage 2 datasets

### Multimodal Reader

- `multimodal-reader-annotation-spec.md` for the label contract
- `build_multimodal_reader_dataset.py` to build a ready-to-train image + JSONL seed set
- `private-multimodal-catalog.template.csv` for your own garment manifest
- `import_multimodal_private_catalog.py` to turn your private garment images into dataset rows
- `export_multimodal_reader_for_qwen.py` to hand the mixed dataset to the official Qwen VL finetune repo
- `validate_multimodal_reader_jsonl.py` to verify image paths and required keys
- `audit_multimodal_reader_dataset.py` to inspect category / color / occasion balance

Recommended build order:

1. Build the dataset with `build_multimodal_reader_dataset.py`
2. Validate it with `validate_multimodal_reader_jsonl.py`
3. Audit it with `audit_multimodal_reader_dataset.py`
4. Replace or extend the public seed with your own cleaned garment photos via `import_multimodal_private_catalog.py`
5. Export the mixed dataset with `export_multimodal_reader_for_qwen.py`

### Virtual Try-On

- `virtual-tryon-data-plan.md` for dataset scope and pair schema
- `bootstrap_virtual_tryon_workspace.py` to create the working directories and pair templates

Recommended build order:

1. Bootstrap the workspace with `bootstrap_virtual_tryon_workspace.py`
2. Fill the pair manifests with private cleared data
3. Keep a separate human-review holdout split before full training

## Internal Research Datasets

For non-commercial internal experimentation, the repo now includes
`download_internal_research_datasets.py` to pull the official releases for:

- DeepFashion
- DeepFashion-MultiModal
- DeepFashion2
- SHIFT15M

Example:

```bash
python training/data-prep/download_internal_research_datasets.py ^
  --datasets deepfashion deepfashion-multimodal deepfashion2 shift15m
```

Monitor the long-running downloads:

```bash
python training/data-prep/watch_internal_research_downloads.py --interval-seconds 60
```

Assemble the portable training bundle:

```bash
python training/data-prep/prepare_AAtrain_bundle.py
```

Notes:

- DeepFashion and DeepFashion2 use official Google Drive folders and may still
  require passwords for archive extraction.
- SHIFT15M's official release includes outfit metadata, benchmark labels, and
  VGG16 feature shards rather than a raw product-image dump.
