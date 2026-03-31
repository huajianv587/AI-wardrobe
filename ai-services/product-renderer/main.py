from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Wardrobe Product Renderer")


class InferRequest(BaseModel):
    image_url: str
    prompt: str = ""
    garment_name: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "product-renderer", "mode": "stub"}


@app.post("/infer")
def infer(payload: InferRequest):
    return {
        "status": "stub",
        "image_url": payload.image_url,
        "prompt": payload.prompt,
        "garment_name": payload.garment_name,
        "scene": "soft editorial product shot",
        "message": "Replace this stub with your ControlNet / SD product image pipeline.",
    }
