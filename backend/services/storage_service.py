from __future__ import annotations

from dataclasses import dataclass
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlparse
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status

from core.config import settings
from services import supabase_service

ASSET_API_PREFIX = "/api/v1/assets"


@dataclass
class StoredAsset:
    relative_path: str
    local_url: str
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

    return path.removeprefix(ASSET_API_PREFIX).lstrip("/")


def public_backup_url_for_asset(asset_url: str | None) -> str | None:
    return supabase_service.public_url_for_asset_path(asset_path_from_url(asset_url))


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


def save_bytes(asset_path: str, payload: bytes, content_type: str) -> StoredAsset:
    normalized_path = asset_path.replace("\\", "/").strip("/")
    destination = _assert_inside_root(_root() / normalized_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(payload)

    backup_url = supabase_service.upload_bytes(normalized_path, payload, content_type)
    return StoredAsset(
        relative_path=normalized_path,
        local_url=_local_asset_url(normalized_path),
        backup_url=backup_url,
    )


def save_upload(relative_directory: str, upload_file: UploadFile) -> StoredAsset:
    normalized_directory = _normalized_asset_directory(relative_directory)
    suffix = safe_suffix_from_filename(upload_file.filename)
    filename = f"{uuid4().hex}{suffix}"
    payload = upload_file.file.read()
    content_type = upload_file.content_type or _guess_content_type(filename)
    return save_bytes(f"{normalized_directory}/{filename}", payload, content_type)


def save_generated_asset(relative_directory: str, filename: str, payload: bytes, content_type: str) -> StoredAsset:
    normalized_directory = _normalized_asset_directory(relative_directory)
    safe_name = _safe_filename(filename)
    return save_bytes(f"{normalized_directory}/{safe_name}", payload, content_type)


def delete_asset(asset_url: str | None) -> None:
    local_path = try_resolve_local_asset(asset_url)
    if local_path and local_path.exists():
        local_path.unlink(missing_ok=True)

    supabase_service.delete_asset(asset_url)
