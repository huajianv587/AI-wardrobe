from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.miniprogram import (
    MiniProgramAccountResponse,
    MiniProgramHomeResponse,
    MiniProgramShortcut,
    MiniProgramWardrobeCard,
    MiniProgramWardrobeResponse,
    MiniProgramWorkflowPreview,
)
from services import ai_demo_service, sync_service, wardrobe_service


def build_home_payload(db: Session, user: User) -> MiniProgramHomeResponse:
    sync_status = sync_service.build_sync_status(db, user)
    workflows = ai_demo_service.list_workflows()[:4]

    return MiniProgramHomeResponse(
        greeting="Welcome back to your wardrobe pocket assistant.",
        user_email=user.email,
        wardrobe_count=sync_status.items_total,
        synced_count=sync_status.items_synced_to_cloud,
        recommended_prompt="Weekend coffee, soft but polished, and easy to repeat next month.",
        shortcuts=[
            MiniProgramShortcut(id="wardrobe", title="Wardrobe", subtitle="Browse and search personal items", route="/pages/wardrobe/index", badge=f"{sync_status.items_total} items"),
            MiniProgramShortcut(id="assistant", title="Assistant", subtitle="Tomorrow planner and low-thought modes", route="/pages/assistant/index", badge="Smart"),
            MiniProgramShortcut(id="recommend", title="AI Looks", subtitle="Call the API-first recommendation flow", route="/pages/recommend/index", badge="API"),
            MiniProgramShortcut(id="tryon", title="Try-On", subtitle="2.5D preview and future generated try-on", route="/pages/try-on/index", badge="2.5D"),
            MiniProgramShortcut(id="account", title="Sync", subtitle="Check cloud status and account session", route="/pages/account/index", badge="R2"),
        ],
        workflow_preview=[
            MiniProgramWorkflowPreview(id=workflow.id, title=workflow.title, priority=workflow.priority, stage=workflow.stage)
            for workflow in workflows
        ],
    )


def build_wardrobe_payload(db: Session, user: User) -> MiniProgramWardrobeResponse:
    items = wardrobe_service.list_items(db, user.id)

    return MiniProgramWardrobeResponse(
        title="Mini wardrobe cards",
        items_total=len(items),
        cards=[
            MiniProgramWardrobeCard(
                id=item.id,
                name=item.name,
                category=item.category,
                color=item.color,
                preview_url=item.processed_image_url or item.image_url,
                tags=item.tags or [],
            )
            for item in items[:24]
        ],
    )


def build_account_payload(db: Session, user: User) -> MiniProgramAccountResponse:
    sync_status = sync_service.build_sync_status(db, user)
    return MiniProgramAccountResponse(
        user_email=user.email,
        mode=sync_status.mode,
        cloud_enabled=sync_status.cloud_enabled,
        items_total=sync_status.items_total,
        synced_count=sync_status.items_synced_to_cloud,
        latest_cloud_sync_at=sync_status.latest_cloud_sync_at,
    )
