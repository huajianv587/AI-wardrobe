from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
import logging
from typing import Any

from app.models.wardrobe import ClothingItem
from core.config import settings
from supabase import Client, create_client

logger = logging.getLogger(__name__)

_bucket_ready = False


def is_enabled() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_role_key)


@lru_cache(maxsize=1)
def get_client() -> Client | None:
    if not is_enabled():
        return None

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _asset_path_from_local_url(asset_url: str | None) -> str | None:
    if not asset_url or not asset_url.startswith("/api/v1/assets/"):
        return None

    return asset_url.removeprefix("/api/v1/assets/").lstrip("/")


def describe_mode() -> str:
    return f"Supabase metadata sync({settings.supabase_sync_table})" if is_enabled() else "metadata-local-only"


def ensure_bucket() -> bool:
    global _bucket_ready

    if _bucket_ready:
        return True

    client = get_client()
    if client is None:
        return False

    try:
        client.storage.get_bucket(settings.supabase_storage_bucket)
    except Exception:
        try:
            client.storage.create_bucket(
                settings.supabase_storage_bucket,
                options={"public": True},
            )
        except Exception as exc:
            logger.warning("Supabase bucket setup failed: %s", exc)
            return False

    _bucket_ready = True
    return True


def public_url_for_asset_path(asset_path: str | None) -> str | None:
    if not asset_path:
        return None

    client = get_client()
    if client is None or not ensure_bucket():
        return None

    try:
        return client.storage.from_(settings.supabase_storage_bucket).get_public_url(asset_path)
    except Exception as exc:
        logger.warning("Supabase public URL build failed for %s: %s", asset_path, exc)
        return None


def public_url_for_local_asset(asset_url: str | None) -> str | None:
    return public_url_for_asset_path(_asset_path_from_local_url(asset_url))


def upload_bytes(asset_path: str, payload: bytes, content_type: str) -> str | None:
    client = get_client()
    if client is None or not ensure_bucket():
        return None

    try:
        client.storage.from_(settings.supabase_storage_bucket).upload(
            asset_path,
            payload,
            {"content-type": content_type, "upsert": "true"},
        )
    except Exception as exc:
        logger.warning("Supabase asset upload failed for %s: %s", asset_path, exc)
        return None

    return public_url_for_asset_path(asset_path)


def delete_asset(asset_url: str | None) -> None:
    asset_path = _asset_path_from_local_url(asset_url)
    client = get_client()

    if client is None or not asset_path or not ensure_bucket():
        return

    try:
        client.storage.from_(settings.supabase_storage_bucket).remove([asset_path])
    except Exception as exc:
        logger.warning("Supabase asset removal failed for %s: %s", asset_path, exc)


def _clothing_item_payload(
    item: ClothingItem,
    *,
    owner_supabase_user_id: str | None = None,
    owner_email: str | None = None,
    image_backup_url: str | None = None,
    processed_backup_url: str | None = None,
) -> dict[str, Any]:
    return {
        "id": item.id,
        "user_id": item.user_id,
        "owner_supabase_user_id": owner_supabase_user_id,
        "owner_email": owner_email,
        "name": item.name,
        "category": item.category,
        "slot": item.slot,
        "color": item.color,
        "brand": item.brand,
        "image_url": item.image_url,
        "processed_image_url": item.processed_image_url,
        "image_backup_url": image_backup_url or (item.image_url if item.image_url and item.image_url.startswith(("http://", "https://")) else public_url_for_local_asset(item.image_url)),
        "processed_image_backup_url": processed_backup_url or (item.processed_image_url if item.processed_image_url and item.processed_image_url.startswith(("http://", "https://")) else public_url_for_local_asset(item.processed_image_url)),
        "tags": item.tags,
        "occasions": item.occasions,
        "style_notes": item.style_notes,
        "created_at": item.created_at.isoformat(),
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


def sync_clothing_item(
    item: ClothingItem,
    *,
    owner_supabase_user_id: str | None = None,
    owner_email: str | None = None,
    image_backup_url: str | None = None,
    processed_backup_url: str | None = None,
) -> bool:
    client = get_client()
    if client is None:
        return False

    payload = _clothing_item_payload(
        item,
        owner_supabase_user_id=owner_supabase_user_id,
        owner_email=owner_email,
        image_backup_url=image_backup_url,
        processed_backup_url=processed_backup_url,
    )

    try:
        client.table(settings.supabase_sync_table).upsert(payload, on_conflict="id").execute()
    except Exception as exc:
        logger.warning("Supabase clothing item sync failed for item %s: %s", item.id, exc)
        return False

    return True


def delete_clothing_item(item_id: int) -> bool:
    client = get_client()
    if client is None:
        return False

    try:
        client.table(settings.supabase_sync_table).delete().eq("id", item_id).execute()
    except Exception as exc:
        logger.warning("Supabase clothing item delete sync failed for item %s: %s", item_id, exc)
        return False

    return True
