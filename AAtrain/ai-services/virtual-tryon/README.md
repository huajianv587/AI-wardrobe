# Virtual Try-On

Current state:

- `main.py` now serves a real FastAPI worker contract for local try-on.
- If the machine has the required OOTDiffusion dependencies plus CUDA, `/infer` will run local OOTDiffusion.
- If the machine is missing runtime pieces, `/infer` will fall back to a local composite preview and `/health` will report the exact missing packages or checkpoints.

Request contract:

- `POST /infer`
- JSON fields: `person_image_url`, `garment_image_urls`, `prompt`, `scene`, optional `category`, `model_type`, `num_samples`, `num_steps`, `guidance_scale`, `seed`

Response contract:

- JSON fields: `status`, `provider_mode`, `provider`, `image_base64`, `content_type`, `warnings`

Recommended setup for full local generative mode:

- Install the official OOTDiffusion runtime dependencies from `model_training/checkpoints/virtual-tryon/ootdiffusion/requirements.txt`
- Run on a Linux machine with CUDA available
- Keep `model_training/checkpoints/virtual-tryon/ootdiffusion/checkpoints` populated with the downloaded weights
