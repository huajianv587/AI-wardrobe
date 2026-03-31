from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class StyleProfile(Base):
    __tablename__ = "style_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, unique=True)
    favorite_colors: Mapped[list[str]] = mapped_column(JSON, default=list)
    avoid_colors: Mapped[list[str]] = mapped_column(JSON, default=list)
    favorite_silhouettes: Mapped[list[str]] = mapped_column(JSON, default=list)
    avoid_silhouettes: Mapped[list[str]] = mapped_column(JSON, default=list)
    style_keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    dislike_keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    commute_profile: Mapped[str | None] = mapped_column(String(120), nullable=True)
    comfort_priorities: Mapped[list[str]] = mapped_column(JSON, default=list)
    wardrobe_rules: Mapped[list[str]] = mapped_column(JSON, default=list)
    personal_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClothingMemoryCard(Base):
    __tablename__ = "clothing_memory_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("clothing_items.id"), index=True, unique=True)
    highlights: Mapped[list[str]] = mapped_column(JSON, default=list)
    avoid_contexts: Mapped[list[str]] = mapped_column(JSON, default=list)
    care_status: Mapped[str] = mapped_column(String(64), default="fresh")
    care_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    season_tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WearLog(Base):
    __tablename__ = "wear_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    outfit_id: Mapped[int | None] = mapped_column(ForeignKey("outfits.id"), nullable=True)
    outfit_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    item_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    occasion: Mapped[str | None] = mapped_column(String(120), nullable=True)
    period: Mapped[str] = mapped_column(String(32), default="all-day")
    location_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    feedback_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    worn_on: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class RecommendationSignal(Base):
    __tablename__ = "recommendation_signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    scene: Mapped[str | None] = mapped_column(String(120), nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    item_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    feedback_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class AssistantTask(Base):
    __tablename__ = "assistant_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    task_type: Mapped[str] = mapped_column(String(120), index=True)
    status: Mapped[str] = mapped_column(String(64), default="queued", index=True)
    input_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    result_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
