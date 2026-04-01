# Dataset Sources

This file records practical source targets for Stage 1 and future stages.

## Stage 1: LLM Recommender

### Recommended first sources

1. FashionIQ
   - type: fashion retrieval / description benchmark
   - why: useful for text + item understanding
   - source:
     - https://fashion-iq.github.io/
     - https://github.com/XiaoxiaoGuo/fashion-iq

2. Polyvore Outfits
   - type: outfit compatibility / set composition
   - why: useful for outfit-level matching and recommendation structure
   - source:
     - https://github.com/xthan/polyvore-dataset

3. DeepFashion2
   - type: garment detection / category / segmentation / landmarks
   - why: useful for clothing understanding and image-side metadata prep
   - source:
     - https://github.com/switchablenorms/DeepFashion2
   - note: the GitHub repository is mainly the project page and tooling notes. Use the official dataset download instructions from its README / linked project resources, not just the repo ZIP itself.

4. Your own private wardrobe labeling
   - type: product-aligned instruction pairs
   - why: highest value for your own app voice, style, and recommendation format

## Stage 1: Image Processor

### Recommended first sources

1. RMBG / BiRefNet pretrained models
   - source:
     - https://huggingface.co/briaai/RMBG-2.0
   - note: strong enough to start inference without fine-tuning

2. Real-ESRGAN pretrained
   - source:
     - https://github.com/xinntao/Real-ESRGAN
   - note: use as optional upscaler after cutout is stable

3. Private garment photography set
   - type: your actual user-upload style images
   - why: best benchmark for deciding whether you need extra fine-tuning

## Future Stages

### Multimodal Reader

- candidate base:
  - https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct

### Classifier

- candidate base:
  - https://github.com/openai/CLIP

### Virtual Try-On

- candidate page:
  - https://github.com/levihsu/OOTDiffusion

## Compliance Note

If you use scraped fashion inspiration data:

- keep only samples you are legally allowed to use
- store source provenance
- avoid pushing raw copyrighted image dumps into git or public repos

## Important Download Note

Do not assume that every GitHub repository page contains the actual dataset files.

- Some links are project repositories only
- Some datasets require registration or separate download links
- In Stage 1, you can still move forward by first creating your own high-quality JSONL training pairs from a smaller internal wardrobe set
