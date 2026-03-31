from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.wardrobe import ClothingItem
from app.schemas.sync import SyncRunResponse, SyncStatusResponse
from core.config import settings
from services import supabase_service


def _user_items(db: Session, user: User) -> list[ClothingItem]:
    statement = select(ClothingItem).where(ClothingItem.user_id == user.id).order_by(ClothingItem.created_at.desc())
    return list(db.scalars(statement).all())


def build_sync_status(db: Session, user: User) -> SyncStatusResponse:
    items = _user_items(db, user)

    latest_item_created_at = max((item.created_at for item in items), default=None)
    latest_cloud_sync_at = max((item.last_synced_at for item in items if item.last_synced_at is not None), default=None)

    return SyncStatusResponse(
        mode=supabase_service.describe_mode(),
        cloud_enabled=supabase_service.is_enabled(),
        storage_bucket=settings.supabase_storage_bucket if supabase_service.is_enabled() else None,
        sync_table=settings.supabase_sync_table if supabase_service.is_enabled() else None,
        user_id=user.id,
        supabase_user_id=user.supabase_user_id,
        items_total=len(items),
        items_with_source_image=sum(1 for item in items if item.image_url),
        items_with_processed_image=sum(1 for item in items if item.processed_image_url),
        items_synced_to_cloud=sum(1 for item in items if item.last_synced_at is not None),
        latest_item_created_at=latest_item_created_at,
        latest_cloud_sync_at=latest_cloud_sync_at,
    )


def sync_user_wardrobe(db: Session, user: User) -> SyncRunResponse:
    items = _user_items(db, user)

    if not supabase_service.is_enabled():
        return SyncRunResponse(
            status="skipped",
            synced_items=0,
            failed_items=0,
            attempted_items=len(items),
            latest_cloud_sync_at=max((item.last_synced_at for item in items if item.last_synced_at is not None), default=None),
            message="Supabase sync is not configured in .env, so only local-first storage is active.",
        )

    synced_items = 0
    failed_items = 0

    for item in items:
        synced = supabase_service.sync_clothing_item(
            item,
            owner_supabase_user_id=user.supabase_user_id,
            owner_email=user.email,
        )

        if synced:
            item.last_synced_at = datetime.utcnow()
            synced_items += 1
        else:
            failed_items += 1

    db.commit()

    refreshed_items = _user_items(db, user)
    latest_cloud_sync_at = max((item.last_synced_at for item in refreshed_items if item.last_synced_at is not None), default=None)

    return SyncRunResponse(
        status="completed" if failed_items == 0 else "partial",
        synced_items=synced_items,
        failed_items=failed_items,
        attempted_items=len(items),
        latest_cloud_sync_at=latest_cloud_sync_at,
        message="Wardrobe metadata was pushed to Supabase." if failed_items == 0 else "Some wardrobe items could not be pushed to Supabase.",
    )
