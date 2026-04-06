from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Wardrobe Virtual Try-On")


class InferRequest(BaseModel):
    person_image_url: str | None = None
    garment_image_url: str | None = None
    garment_image_urls: list[str] = []
    prompt: str | None = None
    scene: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "virtual-tryon", "mode": "stub"}


@app.post("/infer")
def infer(payload: InferRequest):
    garment_urls = payload.garment_image_urls or ([payload.garment_image_url] if payload.garment_image_url else [])
    preview_source = payload.person_image_url or (garment_urls[0] if garment_urls else None)
    return {
        "status": "stub",
        "person_image_url": payload.person_image_url,
        "garment_image_url": payload.garment_image_url,
        "garment_image_urls": garment_urls,
        "image_url": preview_source,
        "provider": "virtual-tryon-stub",
        "message": "Replace this stub with OOTDiffusion / VITON inference."
    }
