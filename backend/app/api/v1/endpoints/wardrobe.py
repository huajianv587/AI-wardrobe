from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.wardrobe import ClothingItemCreate, ClothingItemRead, ClothingItemUpdate, DeleteResponse
from services import wardrobe_service

router = APIRouter(prefix="/wardrobe", tags=["wardrobe"])


@router.get("/items", response_model=list[ClothingItemRead])
def get_items(
    category: str | None = Query(default=None),
    query: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClothingItemRead]:
    return wardrobe_service.list_items(db, current_user.id, category=category, query=query)


@router.get("/items/{item_id}", response_model=ClothingItemRead)
def get_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.get_item(db, item_id, current_user.id)


@router.post("/items", response_model=ClothingItemRead)
def create_item(payload: ClothingItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.create_item(db, payload, current_user.id)


@router.put("/items/{item_id}", response_model=ClothingItemRead)
def update_item(item_id: int, payload: ClothingItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.update_item(db, item_id, payload, current_user.id)


@router.post("/items/{item_id}/upload-image", response_model=ClothingItemRead)
def upload_item_image(item_id: int, image: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.attach_item_image(db, item_id, image, current_user.id)


@router.post("/items/{item_id}/process-image", response_model=ClothingItemRead)
def process_item_image(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ClothingItemRead:
    return wardrobe_service.process_item_image(db, item_id, current_user.id)


@router.delete("/items/{item_id}", response_model=DeleteResponse)
def delete_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> DeleteResponse:
    deleted_id = wardrobe_service.delete_item(db, item_id, current_user.id)
    return DeleteResponse(status="deleted", id=deleted_id)
