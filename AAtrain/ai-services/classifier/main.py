from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Wardrobe Classifier")


class InferRequest(BaseModel):
    image_url: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "classifier", "mode": "stub"}


@app.post("/infer")
def infer(payload: InferRequest):
    return {
        "status": "stub",
        "image_url": payload.image_url,
        "labels": ["minimal", "city", "layering"],
        "message": "Replace this stub with CLIP or multimodal classification logic."
    }
