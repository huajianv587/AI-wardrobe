# Dataset Sources

This file is the single provenance reference for the training assets used by this project.

The real datasets, raw-source payloads, and exports live under `AAtrain/model_training/...`.
The root `model_training/` directory keeps lightweight notes only.

## Canonical layout

- Canonical training asset root: `AAtrain/model_training/`
- Canonical cloud handoff source: `AAtrain/`
- Canonical 20GB upload pack: `AAtrain-upload-20gb/`

## Password policy

If a source requires archive extraction credentials, record only the acquisition path and the environment variable name.

- `DeepFashion`: `DEEPFASHION_UNZIP_PASSWORD`
- `DeepFashion2`: `DEEPFASHION2_UNZIP_PASSWORD`
- Do not write plaintext passwords into repo docs or generated handoff notes.

## LLM recommender sources

### FashionIQ

- Model lines: `llm-recommender`, retrieval-style supervision, prompt grounding
- Official page: <https://fashion-iq.github.io/>
- Repository: <https://github.com/XiaoxiaoGuo/fashion-iq>
- Notes: benchmark-style data, useful for text-plus-item understanding
- Password required: no

### Polyvore Outfits

- Model lines: `llm-recommender`, outfit compatibility, set composition
- Repository: <https://github.com/xthan/polyvore-dataset>
- Notes: useful for outfit-level recommendation structure
- Password required: no

### Private wardrobe labeling

- Model lines: `llm-recommender`
- Source: your own product-aligned annotation work
- Notes: highest-value source for product voice, JSON schema alignment, and recommendation tone
- Password required: n/a

## Multimodal reader and general garment understanding sources

### DeepFashion

- Model lines: `multimodal-reader`, `image-processor` bootstrap, garment understanding
- Official page: <https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html>
- Notes: official release may involve agreement-gated downloads and encrypted archives depending on split
- Password required: sometimes
- Password acquisition: follow the official download instructions and export `DEEPFASHION_UNZIP_PASSWORD` before extraction if needed
- Owning script: `training/data-prep/download_internal_research_datasets.py`

### DeepFashion-MultiModal

- Model lines: `multimodal-reader`, `image-processor`
- Repository: <https://github.com/yumingj/DeepFashion-MultiModal>
- Notes: research-style internal-use asset with images, labels, parsing, densepose, keypoints, and text
- Password required: no in current scripted flow
- Owning script: `training/data-prep/download_internal_research_datasets.py`

### DeepFashion2

- Model lines: `multimodal-reader`, `image-processor`
- Repository: <https://github.com/switchablenorms/DeepFashion2>
- Official download path: Google Drive links referenced from the official repo README
- Notes: the repo page is not the dataset itself; use the official dataset links from the README or linked project page
- Password required: yes for encrypted archives in the current workflow
- Password acquisition: official Google Form / official download flow, then export `DEEPFASHION2_UNZIP_PASSWORD`
- Owning scripts: `training/data-prep/download_internal_research_datasets.py`, `training/data-prep/prepare_AAtrain_bundle.py`

### SHIFT15M

- Model lines: `multimodal-reader`, outfit-level research assets
- Repository: <https://github.com/st-tech/zozo-shift15m>
- Notes: official release focuses on outfit metadata, task labels, and VGG16 feature shards rather than a raw image dump
- Password required: no
- Owning script: `training/data-prep/download_internal_research_datasets.py`

### Qwen2.5-VL-7B-Instruct

- Model lines: `multimodal-reader`
- Model page: <https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct>
- Notes: base model for the current multimodal finetune flow; dataset export happens locally and dataset registration happens on the cloud box
- Password required: no
- Owning scripts: `training/data-prep/export_multimodal_reader_for_qwen.py`, `training/lora-finetune/register_qwen_vl_dataset.py`

## Virtual try-on sources

### VITON-HD

- Model lines: `virtual-tryon`
- Repository: <https://github.com/shadow2496/VITON-HD>
- Dataset mirror used in bootstrap flow: `zhengchong/VITON-HD` on Hugging Face
- Notes: public bootstrap for try-on training, imported into the project pair schema
- License/use note: research-only / non-commercial bootstrap
- Password required: no
- Owning scripts: `training/data-prep/download_vision_bootstrap_datasets.py`, `training/data-prep/import_viton_hd_to_virtual_tryon.py`, `training/data-prep/build_idm_vton_tagged_json.py`

### IDM-VTON

- Model lines: `virtual-tryon`
- Repository: official IDM-VTON upstream used by the serial 5090 training flow
- Notes: training path only; runtime serving in this repo still targets the OOTDiffusion-compatible worker layout
- Password required: no
- Owning entrypoint: `AAtrain/training/lora-finetune/run-5090-full-stack.generated.sh`

### OOTDiffusion

- Model lines: `virtual-tryon` deployment/runtime
- Repository: <https://github.com/levihsu/OOTDiffusion>
- Notes: runtime/deployment reference for the current service worker, not the primary training upstream
- Password required: no

## Image processor sources

### Fashionpedia

- Model lines: `image-processor`
- Official page: <https://fashionpedia.github.io/home/Fashionpedia_download.html>
- Notes: strong public bootstrap for apparel segmentation and localized attributes
- Password required: no
- Owning script: `training/data-prep/download_vision_bootstrap_datasets.py`

### DeepFashion2 and DeepFashion-MultiModal

- Model lines: `image-processor`
- Notes: used as public bootstrap complements for garment structure, masks, and broader clothing coverage
- Password required: see their dedicated entries above
- Owning script: `training/data-prep/build_image_processor_bootstrap_index.py`

### RMBG-2.0 / BiRefNet

- Model lines: `image-processor`
- Model page: <https://huggingface.co/briaai/RMBG-2.0>
- Notes: primary pretrained background-removal baseline for the current `pretrained-inference-first` setup
- Password required: no

### Real-ESRGAN

- Model lines: `image-processor`
- Repository: <https://github.com/xinntao/Real-ESRGAN>
- Notes: optional upscaler after cutout quality is stable
- Password required: no

### Private product photography

- Model lines: `image-processor`
- Source: your own product and wardrobe photos
- Notes: best benchmark for deciding whether public bootstrap is enough or a private fine-tune is worth the cost
- Password required: n/a

## Scripts that own data movement

- Public metadata and starter references: `training/data-prep/download_public_sources.py`
- Large research assets: `training/data-prep/download_internal_research_datasets.py`
- Vision bootstrap assets: `training/data-prep/download_vision_bootstrap_datasets.py`
- VITON-HD import into project schema: `training/data-prep/import_viton_hd_to_virtual_tryon.py`
- IDM-VTON bootstrap tags: `training/data-prep/build_idm_vton_tagged_json.py`
- Image-processor bootstrap summary: `training/data-prep/build_image_processor_bootstrap_index.py`
- Multimodal export for Qwen: `training/data-prep/export_multimodal_reader_for_qwen.py`
- AAtrain assembly: `training/data-prep/prepare_AAtrain_bundle.py`
- Cloud upload pack split: `training/data-prep/package_AAtrain_for_cloud.py`

## Compliance note

- Do not assume a project repository page contains the actual dataset payload.
- Keep source provenance for any public or scraped fashion references.
- Avoid storing copyrighted raw image dumps in git.
- When a source is marked research-only or non-commercial, keep that restriction in deployment and weight-sharing decisions.
