from datetime import datetime
from pydantic import BaseModel


class SyncStatusResponse(BaseModel):
    mode: str
    cloud_enabled: bool
    storage_bucket: str | None = None
    sync_table: str | None = None
    user_id: int
    supabase_user_id: str | None = None
    items_total: int
    items_with_source_image: int
    items_with_processed_image: int
    items_synced_to_cloud: int
    latest_item_created_at: datetime | None = None
    latest_cloud_sync_at: datetime | None = None


class SyncRunResponse(BaseModel):
    status: str
    synced_items: int
    failed_items: int
    attempted_items: int
    latest_cloud_sync_at: datetime | None = None
    message: str
