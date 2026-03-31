from fastapi import APIRouter
from fastapi.responses import FileResponse

from services.storage_service import resolve_asset_path

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/{asset_path:path}")
def get_asset(asset_path: str) -> FileResponse:
    return FileResponse(resolve_asset_path(asset_path))