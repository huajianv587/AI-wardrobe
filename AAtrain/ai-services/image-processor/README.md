## Image Processor Worker

Stage 1 target:

- service name: `image-processor`
- port: `9002`
- backend env: `AI_CLEANUP_API_URL`

### Default pretrained models

- `briaai/RMBG-2.0`
- `xinntao/Real-ESRGAN`

### Stage 1 advice

Do not block the product on fine-tuning this worker.

For the first web closure:

1. use pretrained cutout / white-background inference
2. optional: add Real-ESRGAN upscale later
3. only fine-tune if your own garment photography domain differs a lot from public pretrained behavior

### Expected checkpoint location

- `model_training/checkpoints/image-processor/`

### Expected dataset location

- `model_training/datasets/image-processor/`

### Worker contract

- `GET /health`
- `POST /infer`

This worker supports:

- multipart file input from the wardrobe cleanup route
- JSON `image_url` input from the AI demo adapter

### Suggested environment values

- `IMAGE_PROCESSOR_PRIMARY_MODEL=briaai/RMBG-2.0`
- `IMAGE_PROCESSOR_UPSCALER_MODEL=xinntao/Real-ESRGAN`
- `IMAGE_PROCESSOR_MODEL_PATH=/app/model_training/checkpoints/image-processor`
- `IMAGE_PROCESSOR_RUN_MODE=passthrough`
