from __future__ import annotations

import base64
from dataclasses import dataclass
import mimetypes
from pathlib import Path
import re
from urllib.parse import unquote, urlparse
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from core.config import settings
from services import r2_storage_service

ASSET_API_PREFIX = "/api/v1/assets"
ASSET_RESOLVE_API_PREFIX = f"{ASSET_API_PREFIX}/resolve"
USER_ASSET_PATH_RE = re.compile(r"(?:^|/)(?:user-)?(\d+)(?:/|$)")


@dataclass
class StoredAsset:
    relative_path: str
    url: str
    backup_url: str | None


@dataclass
class LoadedAsset:
    payload: bytes
    content_type: str
    filename: str
    source: str


def _root() -> Path:
    root = Path(settings.local_storage_root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _assert_inside_root(candidate: Path) -> Path:
    root = _root()
    resolved = candidate.resolve()

    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid asset path.") from exc

    return resolved


def _ensure_directory(relative_directory: str) -> Path:
    directory = _assert_inside_root(_root() / relative_directory)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _normalized_asset_directory(relative_directory: str) -> str:
    return relative_directory.replace("\\", "/").strip("/")


def _local_asset_url(asset_path: str) -> str:
    return f"{ASSET_API_PREFIX}/{asset_path.strip('/')}"


def _public_local_asset_url(asset_path: str) -> str:
    return f"{settings.backend_public_base_url.rstrip('/')}{_local_asset_url(asset_path)}"


def safe_suffix_from_filename(filename: str | None) -> str:
    return Path(filename or "asset.bin").suffix.lower() or ".bin"


def _safe_filename(filename: str) -> str:
    cleaned = "".join(character for character in filename if character.isalnum() or character in {"-", "_", "."}).strip(".")
    return cleaned or f"{uuid4().hex}.bin"


def _guess_content_type(filename: str, fallback: str | None = None) -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or fallback or "application/octet-stream"


def asset_path_from_url(asset_url: str | None) -> str | None:
    if not asset_url:
        return None

    parsed = urlparse(asset_url)
    path = parsed.path if parsed.scheme or parsed.netloc else asset_url

    if not path.startswith(ASSET_API_PREFIX):
        return None
    if path == ASSET_RESOLVE_API_PREFIX:
        return None

    return path.removeprefix(ASSET_API_PREFIX).lstrip("/")


def managed_asset_path_from_url(asset_url: str | None) -> str | None:
    asset_path = asset_path_from_url(asset_url)
    if asset_path:
        return asset_path
    return r2_storage_service.asset_path_from_public_url(asset_url)


def owner_user_id_from_asset_path(asset_path: str | None) -> int | None:
    if not asset_path:
        return None
    match = USER_ASSET_PATH_RE.search(asset_path.replace("\\", "/"))
    if not match:
        return None
    return int(match.group(1))


def public_backup_url_for_asset(asset_url: str | None) -> str | None:
    if not asset_url:
        return None

    asset_path = managed_asset_path_from_url(asset_url)
    if asset_path:
        return _public_local_asset_url(asset_path)

    parsed = urlparse(asset_url)
    if parsed.scheme in {"http", "https"}:
        return asset_url

    return None


def resolve_asset_path(asset_path: str) -> Path:
    decoded_path = unquote(asset_path).replace("\\", "/")
    file_path = _assert_inside_root(_root() / decoded_path)

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found.")

    return file_path


def try_resolve_local_asset(asset_url: str | None) -> Path | None:
    relative_path = asset_path_from_url(asset_url)
    if not relative_path:
        return None

    file_path = _assert_inside_root(_root() / relative_path)
    return file_path if file_path.exists() and file_path.is_file() else None


def load_asset_bytes(asset_url: str) -> LoadedAsset:
    local_path = try_resolve_local_asset(asset_url)
    if local_path:
        return LoadedAsset(
            payload=local_path.read_bytes(),
            content_type=_guess_content_type(local_path.name),
            filename=local_path.name,
            source="local",
        )

    managed_asset_path = managed_asset_path_from_url(asset_url)
    if managed_asset_path and r2_storage_service.is_enabled():
        loaded = r2_storage_service.load_bytes(managed_asset_path)
        if loaded is not None:
            payload, content_type, filename = loaded
            return LoadedAsset(
                payload=payload,
                content_type=content_type,
                filename=filename,
                source="r2",
            )

    if asset_url.startswith("data:"):
        header, _, encoded = asset_url.partition(",")
        if not encoded:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data URL.")

        mime_part = header.removeprefix("data:").split(";")[0].strip() or "application/octet-stream"
        try:
            payload = base64.b64decode(encoded) if ";base64" in header else unquote(encoded).encode("utf-8")
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data URL payload.") from exc

        guessed_extension = mimetypes.guess_extension(mime_part) or ".bin"
        return LoadedAsset(
            payload=payload,
            content_type=mime_part,
            filename=f"inline-upload{guessed_extension}",
            source="inline-data",
        )

    parsed = urlparse(asset_url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image source.")

    try:
        response = httpx.get(asset_url, timeout=settings.ai_cleanup_timeout_seconds)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not load the remote source image.") from exc

    filename = Path(parsed.path).name or f"{uuid4().hex}.bin"
    content_type = response.headers.get("content-type") or _guess_content_type(filename)
    return LoadedAsset(payload=response.content, content_type=content_type, filename=filename, source="remote")


def build_upload_path(relative_directory: str, filename: str, *, user_id: int | None = None, item_id: int | None = None) -> str:
    normalized_directory = _normalized_asset_directory(relative_directory)
    suffix = safe_suffix_from_filename(filename)
    parts = [normalized_directory]
    if user_id is not None:
        parts.append(str(user_id))
    parts.append(f"{uuid4()}{suffix}")
    return "/".join(part.strip("/") for part in parts if part)


def prepare_client_upload(
    relative_directory: str,
    filename: str,
    content_type: str | None = None,
    *,
    user_id: int | None = None,
    item_id: int | None = None,
) -> r2_storage_service.PreparedUpload:
    if not r2_storage_service.is_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudflare R2 direct uploads are not configured.",
        )

    asset_path = build_upload_path(relative_directory, filename, user_id=user_id, item_id=item_id)
    prepared = r2_storage_service.prepare_presigned_upload(asset_path, content_type or _guess_content_type(filename))
    if prepared is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not prepare the Cloudflare R2 upload.",
        )

    prepared.public_url = _local_asset_url(asset_path)
    return prepared


def ensure_managed_upload(asset_url: str) -> str:
    asset_path = managed_asset_path_from_url(asset_url)
    if not asset_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded asset URL is not managed by AI Wardrobe storage.")

    local_path = _assert_inside_root(_root() / asset_path)
    if local_path.exists() and local_path.is_file():
        return _local_asset_url(asset_path)

    if r2_storage_service.object_exists_for_path(asset_path):
        return _local_asset_url(asset_path)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uploaded asset was not found in managed storage.")


def generate_presigned_url(asset_reference: str, expires_seconds: int | None = None) -> str | None:
    asset_path = managed_asset_path_from_url(asset_reference)
    if not asset_path:
        parsed = urlparse(asset_reference)
        if not parsed.scheme and not parsed.netloc:
            asset_path = asset_reference.replace("\\", "/").strip("/")

    if not asset_path:
        return None

    return r2_storage_service.generate_presigned_url(asset_path, expires_seconds=expires_seconds)


def save_bytes(asset_path: str, payload: bytes, content_type: str) -> StoredAsset:
    normalized_path = asset_path.replace("\\", "/").strip("/")
    if r2_storage_service.is_enabled():
        stored_url = r2_storage_service.upload_bytes(normalized_path, payload, content_type)
        if not stored_url:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not store the asset in Cloudflare R2.")
        return StoredAsset(
            relative_path=normalized_path,
            url=_local_asset_url(normalized_path),
            backup_url=_public_local_asset_url(normalized_path),
        )

    destination = _assert_inside_root(_root() / normalized_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(payload)
    return StoredAsset(
        relative_path=normalized_path,
        url=_local_asset_url(normalized_path),
        backup_url=_public_local_asset_url(normalized_path),
    )


def save_upload(relative_directory: str, upload_file: UploadFile, *, user_id: int | None = None, item_id: int | None = None) -> StoredAsset:
    filename = build_upload_path(relative_directory, upload_file.filename or "asset.bin", user_id=user_id, item_id=item_id)
    payload = upload_file.file.read()
    content_type = upload_file.content_type or _guess_content_type(upload_file.filename or filename)
    return save_bytes(filename, payload, content_type)


def save_generated_asset(relative_directory: str, filename: str, payload: bytes, content_type: str) -> StoredAsset:
    generated_path = build_upload_path(relative_directory, filename)
    return save_bytes(generated_path, payload, content_type)


def delete_asset(asset_url: str | None) -> None:
    local_path = try_resolve_local_asset(asset_url)
    if local_path and local_path.exists():
        local_path.unlink(missing_ok=True)
        return

    r2_storage_service.delete_asset_path(managed_asset_path_from_url(asset_url))
