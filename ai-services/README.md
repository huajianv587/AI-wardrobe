# AI Services

These folders now contain microservice stubs for the future self-hosted model workers.

Recommended flow:

1. Keep the web app and backend talking to stable API contracts
2. Swap each demo adapter to a dedicated worker here
3. Load your own checkpoints from `model_training/` or mounted volumes
4. Expose a lightweight `/health` and `/infer` route per service

Planned workers:

- `image-processor`: cutout / white-background / product cleanup
- `llm-recommender`: Qwen-based outfit generation
- `avatar-builder`: 2.5D or lightweight 3D prep
- `virtual-tryon`: OOTDiffusion / VITON style generation
- `classifier`: CLIP or multimodal garment understanding
- `multimodal-reader`: Qwen-VL style attribute reading
- `product-renderer`: ControlNet / SD style product hero renders

Suggested API-to-worker mapping:

- `qwen-outfit-recommendation` -> `llm-recommender`
- `birefnet-background-removal` -> `image-processor`
- `clip-wardrobe-classifier` -> `classifier`
- `qwen-vl-attribute-understanding` -> `multimodal-reader`
- `ootdiffusion-virtual-tryon` -> `virtual-tryon`
- `realesrgan-upscale` -> `image-processor`
- `controlnet-product-shot` -> `product-renderer`
- `triposr-avatar-rebuild` -> `avatar-builder`
