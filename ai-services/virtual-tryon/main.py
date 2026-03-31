from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Wardrobe Virtual Try-On")


class InferRequest(BaseModel):
    person_image_url: str
    garment_image_url: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "virtual-tryon", "mode": "stub"}


@app.post("/infer")
def infer(payload: InferRequest):
    return {
        "status": "stub",
        "person_image_url": payload.person_image_url,
        "garment_image_url": payload.garment_image_url,
        "message": "Replace this stub with OOTDiffusion / VITON inference."
    }
