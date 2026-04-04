from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ClothingMemoryCardBase(BaseModel):
    highlights: list[str] = Field(default_factory=list)
    avoid_contexts: list[str] = Field(default_factory=list)
    care_status: str = "fresh"
    care_note: str | None = None
    season_tags: list[str] = Field(default_factory=list)


class ClothingMemoryCardCreate(ClothingMemoryCardBase):
    pass


class ClothingMemoryCardRead(ClothingMemoryCardBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    item_id: int
    updated_at: datetime


class ClothingItemBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    category: str
    slot: str
    color: str
    brand: str | None = None
    image_url: str | None = None
    processed_image_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    occasions: list[str] = Field(default_factory=list)
    style_notes: str | None = None


class ClothingItemCreate(ClothingItemBase):
    user_id: int | None = None


class ClothingItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    category: str | None = None
    slot: str | None = None
    color: str | None = None
    brand: str | None = None
    image_url: str | None = None
    processed_image_url: str | None = None
    tags: list[str] | None = None
    occasions: list[str] | None = None
    style_notes: str | None = None


class ImageUploadPrepareRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str | None = None


class ImageUploadPlan(BaseModel):
    upload_url: str
    public_url: str
    method: str = "PUT"
    headers: dict[str, str] = Field(default_factory=dict)


class ImageUploadFinalizeRequest(BaseModel):
    public_url: str = Field(min_length=1, max_length=1000)


class ClothingItemRead(ClothingItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    created_at: datetime
    last_synced_at: datetime | None = None
    memory_card: ClothingMemoryCardRead | None = None


class DeleteResponse(BaseModel):
    status: str
    id: int
