from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Wardrobe Avatar Builder")


class InferRequest(BaseModel):
    source_images: list[str]


@app.get("/health")
def health():
    return {"status": "ok", "service": "avatar-builder", "mode": "stub"}


@app.post("/infer")
def infer(payload: InferRequest):
    return {
        "status": "stub",
        "source_images": payload.source_images,
        "message": "Replace this stub with 2.5D prep, TripoSR, or InstantMesh pipeline logic."
    }
