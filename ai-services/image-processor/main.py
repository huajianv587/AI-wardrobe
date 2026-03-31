from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Wardrobe Image Processor")


class InferRequest(BaseModel):
    image_url: str
    task: str = "cutout"


@app.get("/health")
def health():
    return {"status": "ok", "service": "image-processor", "mode": "stub"}


@app.post("/infer")
def infer(payload: InferRequest):
    return {
        "status": "stub",
        "task": payload.task,
        "image_url": payload.image_url,
        "message": "Replace this stub with BiRefNet / RMBG / Real-ESRGAN worker logic."
    }
