from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_or_demo_user, get_current_user, get_db
from app.models.user import User
from app.schemas.assistant import AssistantTaskResponse
from app.schemas.wardrobe import (
    ClothingItemCreate,
    ClothingItemRead,
    ClothingItemUpdate,
    DeleteResponse,
    ImageUploadFinalizeRequest,
    ImageUploadPlan,
    ImageUploadPrepareRequest,
)
from services import wardrobe_service

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])


@router.get("/items", response_model=list[ClothingItemRead])
def get_items(
    category: str | None = Query(default=None),
    query: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
) -> list[ClothingItemRead]:
    return wardrobe_service.list_items(db, current_user.id, category=category, query=query)


@router.get("/items/{item_id}", response_model=ClothingItemRead)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_or_demo_user),
) -> ClothingItemRead:
    return wardrobe_service.get_item(db, item_id, current_user.id)


@router.post("/items", response_model=ClothingItemRead)
def create_item(payload: ClothingItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.create_item(db, payload, current_user)


@router.put("/items/{item_id}", response_model=ClothingItemRead)
def update_item(item_id: int, payload: ClothingItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.update_item(db, item_id, payload, current_user)


@router.post("/items/{item_id}/prepare-image-upload", response_model=ImageUploadPlan)
def prepare_item_image_upload(
    item_id: int,
    payload: ImageUploadPrepareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImageUploadPlan:
    prepared = wardrobe_service.prepare_item_image_upload(db, item_id, payload.filename, payload.content_type, current_user)
    return ImageUploadPlan(
        upload_url=prepared.upload_url,
        public_url=prepared.public_url,
        method=prepared.method,
        headers=prepared.headers,
    )


@router.post("/items/{item_id}/confirm-image-upload", response_model=ClothingItemRead)
def confirm_item_image_upload(
    item_id: int,
    payload: ImageUploadFinalizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClothingItemRead:
    return wardrobe_service.finalize_item_image_upload(db, item_id, payload.public_url, current_user)


@router.post("/items/{item_id}/upload-image", response_model=ClothingItemRead)
def upload_item_image(item_id: int, image: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.attach_item_image(db, item_id, image, current_user)


@router.post("/items/{item_id}/process-image", response_model=ClothingItemRead)
def process_item_image(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.process_item_image(db, item_id, current_user)


@router.post("/items/{item_id}/process-image-async", response_model=AssistantTaskResponse)
def process_item_image_async(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssistantTaskResponse:
    task, _ = wardrobe_service.queue_image_processing_task(db, item_id, current_user)
    return task


@router.post("/items/{item_id}/auto-enrich", response_model=ClothingItemRead)
def auto_enrich_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.enrich_item_metadata(db, item_id, current_user)


@router.delete("/items/{item_id}", response_model=DeleteResponse)
def delete_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> DeleteResponse:
    deleted_id = wardrobe_service.delete_item(db, item_id, current_user)
    return DeleteResponse(status="deleted", id=deleted_id)
