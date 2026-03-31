from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


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


class ClothingItemRead(ClothingItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    created_at: datetime


class DeleteResponse(BaseModel):
    status: str
    id: int