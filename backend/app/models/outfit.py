from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    occasion: Mapped[str | None] = mapped_column(String(120), nullable=True)
    style: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=True)
    item_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OutfitRecommendation(Base):
    __tablename__ = "outfit_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    prompt: Mapped[str] = mapped_column(Text)
    result_outfit_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)