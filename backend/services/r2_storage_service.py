from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
import logging
from urllib.parse import urlparse

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ModuleNotFoundError:  # pragma: no cover - handled by is_enabled()
    boto3 = None

    class BotoCoreError(Exception):
        pass

    class ClientError(Exception):
        pass

from core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PreparedUpload:
    upload_url: str
    public_url: str
    method: str = "PUT"
    headers: dict[str, str] = field(default_factory=dict)


def _endpoint_url() -> str | None:
    if settings.r2_endpoint_url:
        return settings.r2_endpoint_url.rstrip("/")

    if settings.r2_account_id:
        return f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"

    return None


def public_base_url() -> str | None:
    if not settings.r2_public_base_url:
        return None

    return settings.r2_public_base_url.rstrip("/") or None


def configured_bucket() -> str | None:
    return settings.r2_bucket or None


def is_enabled() -> bool:
    return bool(
        boto3
        and configured_bucket()
        and settings.r2_access_key_id
        and settings.r2_secret_access_key
        and _endpoint_url()
    )


def describe_mode() -> str:
    return f"R2({settings.r2_bucket})" if is_enabled() else "local filesystem"


@lru_cache(maxsize=1)
def get_client():
    if not is_enabled():
        return None

    return boto3.client(
        "s3",
        region_name=settings.r2_region or "auto",
        endpoint_url=_endpoint_url(),
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )


def build_public_url(asset_path: str) -> str:
    base = public_base_url()
    if not base:
        raise RuntimeError("R2 public base URL is not configured.")

    return f"{base}/{asset_path.strip('/')}"


def asset_path_from_public_url(asset_url: str | None) -> str | None:
    base = public_base_url()
    if not asset_url or not base:
        return None

    parsed_asset = urlparse(asset_url)
    parsed_base = urlparse(base)
    if parsed_asset.scheme != parsed_base.scheme or parsed_asset.netloc != parsed_base.netloc:
        return None

    base_path = parsed_base.path.rstrip("/")
    asset_path = parsed_asset.path

    if base_path:
        if asset_path == base_path:
            return None
        if not asset_path.startswith(f"{base_path}/"):
            return None
        asset_path = asset_path[len(base_path) :]

    normalized = asset_path.lstrip("/")
    return normalized or None


def is_managed_asset_url(asset_url: str | None) -> bool:
    return asset_path_from_public_url(asset_url) is not None


def public_url_for_asset_path(asset_path: str | None) -> str | None:
    if not asset_path or not is_enabled():
        return None

    return build_public_url(asset_path)


def prepare_presigned_upload(asset_path: str, content_type: str | None = None) -> PreparedUpload | None:
    client = get_client()
    bucket = configured_bucket()
    if client is None or not bucket:
        return None

    params: dict[str, str] = {
        "Bucket": bucket,
        "Key": asset_path.strip("/"),
    }
    headers: dict[str, str] = {}
    if content_type:
        params["ContentType"] = content_type
        headers["Content-Type"] = content_type

    try:
        upload_url = client.generate_presigned_url(
            ClientMethod="put_object",
            Params=params,
            ExpiresIn=max(1, min(settings.r2_presign_expires_seconds, 604800)),
            HttpMethod="PUT",
        )
    except (ClientError, BotoCoreError, ValueError) as exc:
        logger.warning("R2 presigned upload generation failed for %s: %s", asset_path, exc)
        return None

    return PreparedUpload(
        upload_url=upload_url,
        public_url=build_public_url(asset_path) if public_base_url() else asset_path.strip("/"),
        headers=headers,
    )


def generate_presigned_url(asset_path: str, expires_seconds: int | None = None) -> str | None:
    client = get_client()
    bucket = configured_bucket()
    if client is None or not bucket:
        return None

    normalized_path = asset_path.strip("/")
    ttl = expires_seconds if expires_seconds is not None else settings.r2_presign_expires_seconds

    try:
        return client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": bucket, "Key": normalized_path},
            ExpiresIn=max(1, min(int(ttl), 604800)),
            HttpMethod="GET",
        )
    except (ClientError, BotoCoreError, ValueError) as exc:
        logger.warning("R2 presigned download generation failed for %s: %s", normalized_path, exc)
        return None


def upload_bytes(asset_path: str, payload: bytes, content_type: str) -> str | None:
    client = get_client()
    bucket = configured_bucket()
    if client is None or not bucket:
        return None

    normalized_path = asset_path.strip("/")
    try:
        client.put_object(Bucket=bucket, Key=normalized_path, Body=payload, ContentType=content_type)
    except (ClientError, BotoCoreError, ValueError) as exc:
        logger.warning("R2 upload failed for %s: %s", normalized_path, exc)
        return None

    return build_public_url(normalized_path) if public_base_url() else normalized_path


def load_bytes(asset_path: str) -> tuple[bytes, str, str] | None:
    client = get_client()
    bucket = configured_bucket()
    normalized_path = asset_path.strip("/")
    if client is None or not bucket or not normalized_path:
        return None

    try:
        response = client.get_object(Bucket=bucket, Key=normalized_path)
        payload = response["Body"].read()
        content_type = str(response.get("ContentType") or "application/octet-stream")
        filename = normalized_path.rsplit("/", 1)[-1] or "asset.bin"
    except (ClientError, BotoCoreError, ValueError) as exc:
        logger.warning("R2 asset GET failed for %s: %s", normalized_path, exc)
        return None

    return payload, content_type, filename


def object_exists_for_path(asset_path: str | None) -> bool:
    client = get_client()
    bucket = configured_bucket()
    normalized_path = (asset_path or "").strip("/")
    if client is None or not bucket or not normalized_path:
        return False

    try:
        client.head_object(Bucket=bucket, Key=normalized_path)
    except ClientError as exc:
        logger.warning("R2 asset HEAD failed for %s: %s", normalized_path, exc)
        return False
    except (BotoCoreError, ValueError) as exc:
        logger.warning("R2 asset HEAD failed for %s: %s", normalized_path, exc)
        return False

    return True


def object_exists(asset_url: str) -> bool:
    return object_exists_for_path(asset_path_from_public_url(asset_url))


def delete_asset_path(asset_path: str | None) -> None:
    client = get_client()
    bucket = configured_bucket()
    normalized_path = (asset_path or "").strip("/")
    if client is None or not bucket or not normalized_path:
        return

    try:
        client.delete_object(Bucket=bucket, Key=normalized_path)
    except (ClientError, BotoCoreError, ValueError) as exc:
        logger.warning("R2 asset deletion failed for %s: %s", normalized_path, exc)


def delete_asset(asset_url: str | None) -> None:
    delete_asset_path(asset_path_from_public_url(asset_url))
