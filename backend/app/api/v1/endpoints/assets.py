from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_user
from app.models.user import User
from services import auth_service, experience_service, r2_storage_service, storage_service

router = APIRouter(prefix="/assets", tags=["assets"])


def _request_user(
    *,
    access_token: str | None,
    current_user: User | None,
    db: Session,
) -> User | None:
    if current_user is not None:
        return current_user
    if not access_token:
        return None
    try:
        return auth_service.get_current_user_from_token(db, access_token)
    except Exception:
        return None


def _authorize_asset(asset_path: str, current_user: User | None, db: Session) -> None:
    owner_user_id = storage_service.owner_user_id_from_asset_path(asset_path)
    if owner_user_id is None:
        return

    demo_user = experience_service.ensure_public_demo_user(db)
    if owner_user_id == demo_user.id:
        return

    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required to view this asset.",
        )
    if current_user.id != owner_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this asset.")


def _serve_managed_asset(asset_path: str):
    local_path = storage_service.try_resolve_local_asset(storage_service._local_asset_url(asset_path))
    if local_path is not None:
        return FileResponse(local_path)

    if r2_storage_service.object_exists_for_path(asset_path):
        signed_url = storage_service.generate_presigned_url(asset_path)
        if not signed_url:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not generate a signed asset URL.")
        return RedirectResponse(url=signed_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")


def _resolve_and_serve(asset_url: str, access_token: str | None, current_user: User | None, db: Session):
    asset_path = storage_service.managed_asset_path_from_url(asset_url)
    if asset_path:
        resolved_user = _request_user(access_token=access_token, current_user=current_user, db=db)
        _authorize_asset(asset_path, resolved_user, db)
        return _serve_managed_asset(asset_path)

    if asset_url.startswith("http://") or asset_url.startswith("https://"):
        return RedirectResponse(url=asset_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")


@router.get("/resolve")
def resolve_asset(
    asset_url: str = Query(min_length=1, max_length=4000),
    access_token: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    return _resolve_and_serve(asset_url, access_token, current_user, db)


@router.get("/{asset_path:path}")
def get_asset(
    asset_path: str,
    access_token: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    return _resolve_and_serve(storage_service._local_asset_url(asset_path), access_token, current_user, db)
