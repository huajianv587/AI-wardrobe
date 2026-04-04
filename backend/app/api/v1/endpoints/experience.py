from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_or_demo_user, get_db
from app.models.user import User
from app.schemas.experience import (
    ExperienceDiaryLogPayload,
    ExperienceIdleActionPayload,
    ExperienceImportUrlPayload,
    ExperienceSmartConfigPayload,
    ExperienceSmartEditPayload,
    ExperienceStyleProfilePatch,
    ExperienceSuitcasePayload,
    ExperienceUploadBatchPayload,
    ExperienceWardrobeBulkPayload,
    ExperienceWardrobeItemPayload,
)
from app.schemas.wardrobe import ImageUploadFinalizeRequest, ImageUploadPlan, ImageUploadPrepareRequest
from services import experience_service

router = APIRouter(prefix="/experience", tags=["experience"])


@router.get("/wardrobe-management")
def wardrobe_management(
    category: str | None = Query(default=None),
    query: str | None = Query(default=None),
    season: str | None = Query(default=None),
    color: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.get_wardrobe_management_overview(
        db,
        current_user,
        category=category,
        query=query,
        season=season,
        color=color,
    )


@router.post("/wardrobe-management/items")
def create_wardrobe_item(
    payload: ExperienceWardrobeItemPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.create_wardrobe_item_from_experience(db, current_user, payload)


@router.put("/wardrobe-management/items/{item_id}")
def update_wardrobe_item(
    item_id: int,
    payload: ExperienceWardrobeItemPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.update_wardrobe_item_from_experience(db, current_user, item_id, payload)


@router.post("/wardrobe-management/items/{item_id}/prepare-image-upload", response_model=ImageUploadPlan)
def prepare_wardrobe_item_image_upload(
    item_id: int,
    payload: ImageUploadPrepareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.prepare_wardrobe_item_image_upload(db, current_user, item_id, payload)


@router.post("/wardrobe-management/items/{item_id}/confirm-image-upload")
def confirm_wardrobe_item_image_upload(
    item_id: int,
    payload: ImageUploadFinalizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.confirm_wardrobe_item_image_upload(db, current_user, item_id, payload)


@router.post("/wardrobe-management/items/{item_id}/upload-image")
def upload_wardrobe_item_image(
    item_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.upload_wardrobe_item_image(db, current_user, item_id, image)


@router.delete("/wardrobe-management/items/{item_id}")
def delete_wardrobe_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.delete_wardrobe_item_from_experience(db, current_user, item_id)


@router.post("/wardrobe-management/import-url")
def import_url_item(
    payload: ExperienceImportUrlPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.import_item_from_url(db, current_user, payload)


@router.post("/wardrobe-management/bulk")
def wardrobe_bulk_action(
    payload: ExperienceWardrobeBulkPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.run_wardrobe_bulk_action(db, current_user, payload)


@router.get("/smart-wardrobe")
def smart_wardrobe(
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.get_smart_wardrobe_overview(db, current_user, query=query, status=status)


@router.post("/smart-wardrobe/config")
def save_smart_config(payload: ExperienceSmartConfigPayload):
    return experience_service.save_smart_config(payload)


@router.post("/smart-wardrobe/actions/{action}")
def run_smart_action(
    action: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.run_smart_action(db, current_user, action)


@router.post("/smart-wardrobe/upload-batch")
def upload_smart_batch(
    payload: ExperienceUploadBatchPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.upload_smart_batch(db, current_user, payload)


@router.post("/smart-wardrobe/items/{item_id}/retry")
def retry_smart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.retry_smart_item(db, current_user, item_id)


@router.post("/smart-wardrobe/items/{item_id}/fallback")
def fallback_smart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.fallback_smart_item(db, current_user, item_id)


@router.post("/smart-wardrobe/items/{item_id}/confirm")
def confirm_smart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.confirm_smart_enrich(db, current_user, item_id)


@router.put("/smart-wardrobe/items/{item_id}/enrich")
def update_smart_item(
    item_id: int,
    payload: ExperienceSmartEditPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.update_smart_enrich(db, current_user, item_id, payload)


@router.post("/smart-wardrobe/items/{item_id}/reanalyze")
def reanalyze_smart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.reanalyze_smart_item(db, current_user, item_id)


@router.post("/smart-wardrobe/pending/{item_id}/prioritize")
def prioritize_pending_item(item_id: int):
    return experience_service.prioritize_pending_item(item_id)


@router.get("/outfit-diary")
def outfit_diary(
    year: int = Query(default=2026),
    month: int = Query(default=4),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.get_outfit_diary_overview(db, current_user, year=year, month=month)


@router.post("/outfit-diary/logs")
def create_or_update_diary_log(
    payload: ExperienceDiaryLogPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.create_or_update_diary_log(db, current_user, payload)


@router.post("/outfit-diary/suitcase")
def generate_suitcase(
    payload: ExperienceSuitcasePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.generate_suitcase_plan(db, current_user, payload)


@router.get("/closet-analysis")
def closet_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.get_closet_analysis_overview(db, current_user)


@router.post("/closet-analysis/care/{item_id}/mark-done")
def mark_care_done(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.mark_care_done(db, current_user, item_id)


@router.post("/closet-analysis/care/{item_id}/remind")
def set_care_reminder(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.set_care_reminder(db, current_user, item_id)


@router.post("/closet-analysis/idle/{item_id}/action")
def record_idle_action(item_id: int, payload: ExperienceIdleActionPayload):
    return experience_service.record_idle_action(item_id, payload)


@router.get("/style-profile")
def style_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.get_style_profile_overview(db, current_user)


@router.put("/style-profile")
def patch_style_profile(
    payload: ExperienceStyleProfilePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
):
    return experience_service.patch_style_profile(db, current_user, payload)
