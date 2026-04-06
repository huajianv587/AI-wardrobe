from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import create_engine
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker

from app.models.user import User
from app.models.wardrobe import ClothingItem
from app.schemas.wardrobe import ClothingItemCreate, ClothingItemUpdate
from services import image_pipeline_service, storage_service, supabase_service

CLEANUP_TAGS = {"processed", "white-background", "cleanup-placeholder", "cleanup-fallback", "cleanup-remote", "cleanup-local"}


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
    db: Session,
    item: ClothingItem,
    *,
    owner_supabase_user_id: str | None = None,
    owner_email: str | None = None,
    image_backup_url: str | None = None,
    processed_backup_url: str | None = None,
) -> None:
    synced = supabase_service.sync_clothing_item(
        item,
        owner_supabase_user_id=owner_supabase_user_id,
        owner_email=owner_email,
        image_backup_url=image_backup_url or storage_service.public_backup_url_for_asset(item.image_url),
        processed_backup_url=processed_backup_url or storage_service.public_backup_url_for_asset(item.processed_image_url),
    )

    if synced:
        item.last_synced_at = datetime.utcnow()
        db.commit()
        db.refresh(item)


def _attach_memory_cards(db: Session, items: list[ClothingItem], user_id: int) -> list[ClothingItem]:
    if not items:
        return items

    from services import assistant_service

    return assistant_service.attach_memory_cards(db, items, user_id)


def _attach_memory_card(db: Session, item: ClothingItem, user_id: int) -> ClothingItem:
    from services import assistant_service

    return assistant_service.attach_memory_card(db, item, user_id)


def _auto_enrich(db: Session, item: ClothingItem, user: User) -> ClothingItem:
    from services import assistant_service

    return assistant_service.auto_enrich_item(db, item, user)


def _serialize_item(item: ClothingItem) -> dict:
    return {
        "id": item.id,
        "user_id": item.user_id,
        "name": item.name,
        "category": item.category,
        "slot": item.slot,
        "color": item.color,
        "brand": item.brand,
        "image_url": item.image_url,
        "processed_image_url": item.processed_image_url,
        "tags": list(item.tags or []),
        "occasions": list(item.occasions or []),
        "style_notes": item.style_notes,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "last_synced_at": item.last_synced_at.isoformat() if item.last_synced_at else None,
    }


def _apply_source_image(
    db: Session,
    item: ClothingItem,
    user: User,
    image_url: str,
    *,
    image_backup_url: str | None = None,
) -> ClothingItem:
    previous_image_url = item.image_url if item.image_url != image_url else None
    previous_processed_image_url = item.processed_image_url

    item.image_url = image_url
    item.processed_image_url = None
    item.tags = _dedupe_tokens([*_without_tags(item.tags, CLEANUP_TAGS), "source-image"])
    item.style_notes = _append_note(item.style_notes, "Source image uploaded for cleanup and recommendation preview.")
    db.commit()
    db.refresh(item)
    item = _auto_enrich(db, item, user)
    _sync_item(
        db,
        item,
        owner_supabase_user_id=user.supabase_user_id,
        owner_email=user.email,
        image_backup_url=image_backup_url or storage_service.public_backup_url_for_asset(image_url),
    )
    storage_service.delete_asset(previous_image_url)
    storage_service.delete_asset(previous_processed_image_url)
    return _attach_memory_card(db, item, user.id)


def _apply_processed_image(
    db: Session,
    item: ClothingItem,
    user: User,
    processed_image_url: str,
    *,
    processed_backup_url: str | None = None,
    cleanup_note: str,
    cleanup_tag: str,
) -> ClothingItem:
    previous_processed_image_url = item.processed_image_url if item.processed_image_url != processed_image_url else None

    item.processed_image_url = processed_image_url
    item.tags = _dedupe_tokens([*_without_tags(item.tags, CLEANUP_TAGS), "processed", "white-background", cleanup_tag])
    item.style_notes = _append_note(item.style_notes, cleanup_note)
    db.commit()
    db.refresh(item)
    item = _auto_enrich(db, item, user)
    _sync_item(
        db,
        item,
        owner_supabase_user_id=user.supabase_user_id,
        owner_email=user.email,
        processed_backup_url=processed_backup_url or storage_service.public_backup_url_for_asset(processed_image_url),
    )
    storage_service.delete_asset(previous_processed_image_url)
    return _attach_memory_card(db, item, user.id)


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

    items = list(db.scalars(statement).all())
    return _attach_memory_cards(db, items, user_id)


def get_item(db: Session, item_id: int, user_id: int) -> ClothingItem:
    item = db.get(ClothingItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wardrobe item not found.")
    return _attach_memory_card(db, item, user_id)


def create_item(db: Session, payload: ClothingItemCreate, user: User) -> ClothingItem:
    user_id = user.id
    item = ClothingItem(**payload.model_dump(exclude={"user_id"}), user_id=user_id)
    item.tags = _dedupe_tokens(item.tags)
    item.occasions = _dedupe_tokens(item.occasions)
    db.add(item)
    db.commit()
    db.refresh(item)
    item = _auto_enrich(db, item, user)
    _sync_item(db, item, owner_supabase_user_id=user.supabase_user_id, owner_email=user.email)
    return _attach_memory_card(db, item, user_id)


def update_item(db: Session, item_id: int, payload: ClothingItemUpdate, user: User) -> ClothingItem:
    item = get_item(db, item_id, user.id)
    previous_image_url = item.image_url
    previous_processed_image_url = item.processed_image_url
    image_url_changed = False

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in {"tags", "occasions"} and value is not None:
            setattr(item, field, _dedupe_tokens(value))
            continue

        if field == "image_url":
            image_url_changed = value != item.image_url

        setattr(item, field, value)

    if image_url_changed:
        item.processed_image_url = None
        refreshed_tags = _without_tags(item.tags, CLEANUP_TAGS)
        item.tags = _dedupe_tokens([*refreshed_tags, "source-image"] if item.image_url else refreshed_tags)
        if item.image_url:
            item.style_notes = _append_note(item.style_notes, "Source image uploaded for cleanup and recommendation preview.")

    db.commit()
    db.refresh(item)
    item = _auto_enrich(db, item, user)
    _sync_item(db, item, owner_supabase_user_id=user.supabase_user_id, owner_email=user.email)
    if image_url_changed:
        storage_service.delete_asset(previous_image_url)
        storage_service.delete_asset(previous_processed_image_url)
    return _attach_memory_card(db, item, user.id)


def prepare_item_image_upload(db: Session, item_id: int, filename: str, content_type: str | None, user: User):
    item = get_item(db, item_id, user.id)
    return storage_service.prepare_client_upload(
        "wardrobe/source",
        filename,
        content_type,
        user_id=user.id,
        item_id=item.id,
    )


def finalize_item_image_upload(db: Session, item_id: int, public_url: str, user: User) -> ClothingItem:
    item = get_item(db, item_id, user.id)
    image_url = storage_service.ensure_managed_upload(public_url)
    return _apply_source_image(db, item, user, image_url, image_backup_url=image_url)


def attach_item_image(db: Session, item_id: int, upload_file: UploadFile, user: User) -> ClothingItem:
    item = get_item(db, item_id, user.id)
    asset = storage_service.save_upload("wardrobe/source", upload_file, user_id=user.id, item_id=item.id)
    return _apply_source_image(db, item, user, asset.url, image_backup_url=asset.backup_url)


def process_item_image(db: Session, item_id: int, user: User, *, prefer_local: bool = False) -> ClothingItem:
    item = get_item(db, item_id, user.id)

    if item.image_url:
        cleanup = image_pipeline_service.process_item_image(item.id, item.image_url, prefer_local=prefer_local)
        processed_asset = storage_service.save_generated_asset(
            f"wardrobe/processed/user-{user.id}/item-{item.id}",
            cleanup.filename,
            cleanup.payload,
            cleanup.content_type,
        )
        return _apply_processed_image(
            db,
            item,
            user,
            processed_asset.url,
            processed_backup_url=processed_asset.backup_url,
            cleanup_note=cleanup.note,
            cleanup_tag=cleanup.tag,
        )

    item.style_notes = _append_note(item.style_notes, "Upload an image before running the cleanup pipeline.")
    db.commit()
    db.refresh(item)
    _sync_item(db, item, owner_supabase_user_id=user.supabase_user_id, owner_email=user.email)
    return _attach_memory_card(db, item, user.id)


def queue_image_processing_task(db: Session, item_id: int, user: User):
    item = get_item(db, item_id, user.id)
    from services import assistant_service

    return assistant_service.create_task(
        db,
        user,
        "image-cleanup",
        {"item_id": item.id, "item_name": item.name},
    )


def run_image_processing_task(task_id: int, item_id: int, user_id: int, database_url: str) -> None:
    from services import assistant_service

    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    engine = create_engine(database_url, connect_args=connect_args, future=True)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    db = session_local()
    try:
        task = assistant_service.mark_task_running(db, task_id)
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for assistant task.")

        item = process_item_image(db, item_id, user)
        assistant_service.complete_task(
            db,
            task.id,
            {"item": _serialize_item(item), "message": f"Processed {item.name} successfully."},
        )
    except Exception as exc:  # pragma: no cover - background task failure path
        assistant_service.fail_task(db, task_id, str(exc))
    finally:
        db.close()
        engine.dispose()


def enrich_item_metadata(db: Session, item_id: int, user: User) -> ClothingItem:
    item = get_item(db, item_id, user.id)
    return _auto_enrich(db, item, user)


def delete_item(db: Session, item_id: int, user: User) -> int:
    item = get_item(db, item_id, user.id)
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
