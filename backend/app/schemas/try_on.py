from datetime import datetime

from pydantic import BaseModel, Field


class TryOnRenderRequest(BaseModel):
    item_ids: list[int] = Field(default_factory=list)
    person_image_url: str | None = None
    garment_image_urls: list[str] = Field(default_factory=list)
    prompt: str | None = None
    scene: str | None = None


class TryOnLookItem(BaseModel):
    item_id: int | None = None
    name: str
    slot: str
    image_url: str | None = None


class TryOnRenderResponse(BaseModel):
    status: str
    provider_mode: str
    provider: str
    preview_url: str
    item_ids: list[int] = Field(default_factory=list)
    items: list[TryOnLookItem] = Field(default_factory=list)
    message: str
    remote_error_detail: str | None = None
    debug_trace: list[str] = Field(default_factory=list)
    prompt: str | None = None
    scene: str | None = None
    created_at: datetime
