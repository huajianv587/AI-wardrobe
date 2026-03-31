from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Wardrobe Multimodal Reader")


class InferRequest(BaseModel):
    image_url: str
    prompt: str = ""
    garment_name: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "multimodal-reader", "mode": "stub"}


@app.post("/infer")
def infer(payload: InferRequest):
    return {
        "status": "stub",
        "image_url": payload.image_url,
        "prompt": payload.prompt,
        "garment_name": payload.garment_name,
        "attributes": {
            "color_family": "warm neutral",
            "fabric_guess": "cotton blend",
            "mood": "gentle polished",
        },
        "message": "Replace this stub with Qwen-VL or another multimodal attribute worker.",
    }
