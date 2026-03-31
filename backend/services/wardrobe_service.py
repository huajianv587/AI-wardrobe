from __future__ import annotations

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.wardrobe import ClothingItem
from app.schemas.wardrobe import ClothingItemCreate, ClothingItemUpdate
from services import image_pipeline_service, storage_service, supabase_service

CLEANUP_TAGS = {"processed", "white-background", "cleanup-placeholder", "cleanup-fallback", "cleanup-remote"}


def _dedupe_tokens(values: list[str] | None) -> list[str]:
    tokens = values or []
    return list(dict.fromkeys(token for token in tokens if token))


def _append_note(existing: str | None, addition: str) -> str:
    current = (existing or "").strip()
    if addition in current:
        return current
    if not current:
        return addition
    return f"{current} {addition}"


def _without_tags(values: list[str], removed: set[str]) -> list[str]:
    return [value for value in values if value not in removed]


def _sync_item(
    item: ClothingItem,
    *,
    image_backup_url: str | None = None,
    processed_backup_url: str | None = None,
) -> None:
    supabase_service.sync_clothing_item(
        item,
        image_backup_url=image_backup_url,
        processed_backup_url=processed_backup_url,
    )


def list_items(db: Session, user_id: int, category: str | None = None, query: str | None = None) -> list[ClothingItem]:
    statement = select(ClothingItem).order_by(ClothingItem.created_at.desc())
    statement = statement.where(ClothingItem.user_id == user_id)

    if category and category != "all":
        statement = statement.where(ClothingItem.category == category)

    if query:
        like_query = f"%{query}%"
        statement = statement.where(
            or_(
                ClothingItem.name.ilike(like_query),
                ClothingItem.brand.ilike(like_query),
                ClothingItem.style_notes.ilike(like_query),
            )
        )

    return list(db.scalars(statement).all())


def get_item(db: Session, item_id: int, user_id: int) -> ClothingItem:
    item = db.get(ClothingItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wardrobe item not found.")
    return item


def create_item(db: Session, payload: ClothingItemCreate, user_id: int) -> ClothingItem:
    item = ClothingItem(**payload.model_dump(exclude={"user_id"}), user_id=user_id)
    item.tags = _dedupe_tokens(item.tags)
    item.occasions = _dedupe_tokens(item.occasions)
    db.add(item)
    db.commit()
    db.refresh(item)
    _sync_item(item)
    return item


def update_item(db: Session, item_id: int, payload: ClothingItemUpdate, user_id: int) -> ClothingItem:
    item = get_item(db, item_id, user_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in {"tags", "occasions"} and value is not None:
            setattr(item, field, _dedupe_tokens(value))
            continue

        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    _sync_item(item)
    return item


def attach_item_image(db: Session, item_id: int, upload_file: UploadFile, user_id: int) -> ClothingItem:
    item = get_item(db, item_id, user_id)
    asset = storage_service.save_upload("wardrobe/source", upload_file)

    item.image_url = asset.local_url
    item.processed_image_url = None
    item.tags = _dedupe_tokens([*_without_tags(item.tags, CLEANUP_TAGS), "source-image"])
    item.style_notes = _append_note(item.style_notes, "Source image uploaded for cleanup and recommendation preview.")
    db.commit()
    db.refresh(item)
    _sync_item(item, image_backup_url=asset.backup_url)
    return item


def process_item_image(db: Session, item_id: int, user_id: int) -> ClothingItem:
    item = get_item(db, item_id, user_id)

    if item.image_url:
        cleanup = image_pipeline_service.process_item_image(item.id, item.image_url)
        processed_asset = storage_service.save_generated_asset(
            "wardrobe/processed",
            cleanup.filename,
            cleanup.payload,
            cleanup.content_type,
        )
        item.processed_image_url = processed_asset.local_url
        item.tags = _dedupe_tokens([*_without_tags(item.tags, CLEANUP_TAGS), "processed", "white-background", cleanup.tag])
        item.style_notes = _append_note(item.style_notes, cleanup.note)
        db.commit()
        db.refresh(item)
        _sync_item(item, processed_backup_url=processed_asset.backup_url)
        return item

    item.style_notes = _append_note(item.style_notes, "Upload an image before running the cleanup pipeline.")
    db.commit()
    db.refresh(item)
    _sync_item(item)
    return item


def delete_item(db: Session, item_id: int, user_id: int) -> int:
    item = get_item(db, item_id, user_id)
    image_url = item.image_url
    processed_image_url = item.processed_image_url

    db.delete(item)
    db.commit()

    storage_service.delete_asset(image_url)
    storage_service.delete_asset(processed_image_url)
    supabase_service.delete_clothing_item(item_id)
    return item_id


def seed_demo_data(db: Session) -> None:
    existing = db.scalar(select(ClothingItem.id).limit(1))
    if existing:
        return

    items = [
        ClothingItem(name="Ivory Fluid Shirt", category="tops", slot="top", color="Ivory", brand="Aerial", tags=["clean", "soft-formal", "layering"], occasions=["office", "meeting", "date"], style_notes="Gentle drape that works for polished weekday looks."),
        ClothingItem(name="Mint Cloud Knit", category="tops", slot="top", color="Mint", brand="Morning Dew", tags=["soft", "cozy", "weekend"], occasions=["weekend", "travel", "coffee"], style_notes="A soft knit for relaxed layering and spring color balance."),
        ClothingItem(name="Charcoal Wide Trouser", category="bottoms", slot="bottom", color="Charcoal", brand="Mode Form", tags=["formal", "minimal", "versatile"], occasions=["office", "meeting", "city"], style_notes="Anchors recommendation sets with a stable professional shape."),
        ClothingItem(name="Cream Pleated Skirt", category="bottoms", slot="bottom", color="Cream", brand="Lune", tags=["feminine", "airy", "date"], occasions=["date", "weekend", "gallery"], style_notes="Adds movement and a softer silhouette for warm scenes."),
        ClothingItem(name="Dusty Rose Wrap Coat", category="outerwear", slot="outerwear", color="Dusty Rose", brand="Cocoon", tags=["hero", "elegant", "city"], occasions=["date", "dinner", "meeting"], style_notes="Works as the hero layer in photo-friendly looks."),
        ClothingItem(name="Navy Soft Blazer", category="outerwear", slot="outerwear", color="Navy", brand="Shift", tags=["smart", "office", "structured"], occasions=["office", "meeting", "travel"], style_notes="Creates soft-formal balance without feeling too rigid."),
        ClothingItem(name="Ivory Line Loafer", category="shoes", slot="shoes", color="Ivory", brand="Halo", tags=["clean", "office", "smart-casual"], occasions=["office", "meeting", "city"], style_notes="Keeps office looks light and elegant."),
        ClothingItem(name="White Breeze Sneaker", category="shoes", slot="shoes", color="White", brand="Pulse", tags=["casual", "travel", "weekend"], occasions=["weekend", "travel", "errands"], style_notes="Easy fallback for relaxed daily styling."),
        ClothingItem(name="Pearl Mini Bucket Bag", category="accessories", slot="accessory", color="Pearl", brand="Muse", tags=["accent", "date", "soft"], occasions=["date", "gallery", "dinner"], style_notes="Softens recommendations and adds a refined finish."),
    ]

    db.add_all(items)
    db.commit()
