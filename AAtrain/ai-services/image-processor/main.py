from __future__ import annotations

import base64
import os
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.datastructures import UploadFile
from pydantic import BaseModel

DEFAULT_PRIMARY_MODEL = "briaai/RMBG-2.0"
DEFAULT_UPSCALER_MODEL = "xinntao/Real-ESRGAN"
DEFAULT_MODEL_PATH = "/app/model_training/checkpoints/image-processor"


class WorkerSettings(BaseModel):
    service_name: str = "image-processor"
    run_mode: str = os.getenv("IMAGE_PROCESSOR_RUN_MODE", "passthrough")
    primary_model: str = os.getenv("IMAGE_PROCESSOR_PRIMARY_MODEL", DEFAULT_PRIMARY_MODEL)
    upscaler_model: str = os.getenv("IMAGE_PROCESSOR_UPSCALER_MODEL", DEFAULT_UPSCALER_MODEL)
    model_path: str = os.getenv("IMAGE_PROCESSOR_MODEL_PATH", DEFAULT_MODEL_PATH)

    @property
    def checkpoint_present(self) -> bool:
        return Path(self.model_path).exists()


settings = WorkerSettings()
app = FastAPI(title="AI Wardrobe Image Processor", version="0.1.0")


class JsonInferRequest(BaseModel):
    image_url: str = ""
    task: str = "cutout"


def _passthrough_response(payload: bytes, content_type: str, task: str, note: str) -> dict:
    return {
        "status": "ok",
        "task": task,
        "content_type": content_type,
        "image_base64": base64.b64encode(payload).decode("utf-8"),
        "mode": settings.run_mode,
        "note": note,
        "primary_model": settings.primary_model,
        "upscaler_model": settings.upscaler_model,
    }


async def _fetch_remote_image(image_url: str) -> tuple[bytes, str]:
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.get(image_url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not fetch image_url from upstream source: {exc}") from exc

    return response.content, response.headers.get("content-type", "image/png")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": settings.service_name,
        "mode": settings.run_mode,
        "primary_model": settings.primary_model,
        "upscaler_model": settings.upscaler_model,
        "model_path": settings.model_path,
        "checkpoint_present": settings.checkpoint_present,
        "note": "Stage-1 worker is ready for passthrough cleanup. Replace internals with RMBG / BiRefNet / Real-ESRGAN inference later.",
    }


@app.post("/infer")
async def infer(request: Request) -> dict:
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("application/json"):
        payload = JsonInferRequest.model_validate(await request.json())
        if not payload.image_url:
            raise HTTPException(status_code=400, detail="image_url is required for JSON requests.")
        raw_bytes, remote_type = await _fetch_remote_image(payload.image_url)
        return _passthrough_response(
            raw_bytes,
            remote_type,
            payload.task,
            "Remote image fetched successfully. Replace passthrough mode with real RMBG / Real-ESRGAN inference when ready.",
        )

    form = await request.form()
    task = str(form.get("task") or "cutout")
    upload = form.get("image")
    if not isinstance(upload, UploadFile):
        raise HTTPException(status_code=400, detail="Multipart requests must include an `image` file.")

    payload = await upload.read()
    output_type = upload.content_type or "image/png"
    return _passthrough_response(
        payload,
        output_type,
        task,
        "Multipart image received successfully. Replace passthrough mode with real background removal or upscale inference when ready.",
    )
