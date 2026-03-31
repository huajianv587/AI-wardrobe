from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Wardrobe LLM Recommender")


class InferRequest(BaseModel):
    prompt: str
    wardrobe_count: int = 0


@app.get("/health")
def health():
    return {"status": "ok", "service": "llm-recommender", "mode": "stub"}


@app.post("/infer")
def infer(payload: InferRequest):
    return {
        "status": "stub",
        "prompt": payload.prompt,
        "wardrobe_count": payload.wardrobe_count,
        "message": "Replace this stub with your Qwen2.5 LoRA generation worker."
    }
