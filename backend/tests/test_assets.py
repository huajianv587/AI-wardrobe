from pathlib import Path

from app.models.user import User
from services import auth_service, experience_service, r2_storage_service, storage_service


def test_assets_resolve_requires_owner_for_private_user_assets(client, monkeypatch):
    with client.testing_session_local() as db:
        owner = User(email="asset-owner@ai-wardrobe.dev", password_hash="local-managed")
        stranger = User(email="asset-stranger@ai-wardrobe.dev", password_hash="local-managed")
        db.add(owner)
        db.add(stranger)
        db.commit()
        db.refresh(owner)
        db.refresh(stranger)

    asset_relative_path = f"wardrobe/source/{owner.id}/private-image.png"

    from core.config import settings

    destination = Path(settings.local_storage_root) / asset_relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(b"private-image")

    owner_token = "owner-token"
    stranger_token = "stranger-token"

    def fake_get_current_user_from_token(db, access_token):
        if access_token == owner_token:
            return owner
        if access_token == stranger_token:
            return stranger
        raise ValueError("invalid token")

    monkeypatch.setattr(auth_service, "get_current_user_from_token", fake_get_current_user_from_token)

    owner_response = client.get(
        "/api/v1/assets/resolve",
        params={"asset_url": f"/api/v1/assets/{asset_relative_path}", "access_token": owner_token},
    )
    assert owner_response.status_code == 200
    assert owner_response.content == b"private-image"

    stranger_response = client.get(
        "/api/v1/assets/resolve",
        params={"asset_url": f"/api/v1/assets/{asset_relative_path}", "access_token": stranger_token},
    )
    assert stranger_response.status_code == 403


def test_assets_resolve_allows_public_demo_assets_without_auth(client):
    with client.testing_session_local() as db:
        demo_user_id = experience_service.ensure_public_demo_user(db).id

    from core.config import settings

    asset_relative_path = f"wardrobe/source/{demo_user_id}/demo-image.png"
    destination = Path(settings.local_storage_root) / asset_relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(b"demo-image")

    response = client.get("/api/v1/assets/resolve", params={"asset_url": f"/api/v1/assets/{asset_relative_path}"})
    assert response.status_code == 200
    assert response.content == b"demo-image"


def test_owner_user_id_from_asset_path_supports_numeric_and_legacy_segments():
    assert storage_service.owner_user_id_from_asset_path("wardrobe/source/42/private-image.png") == 42
    assert storage_service.owner_user_id_from_asset_path("wardrobe/source/user-42/item-8/private-image.png") == 42


def test_storage_service_generate_presigned_url_uses_managed_asset_path(monkeypatch):
    captured: dict[str, object] = {}

    def fake_generate(asset_path: str, expires_seconds: int | None = None) -> str:
        captured["asset_path"] = asset_path
        captured["expires_seconds"] = expires_seconds
        return "https://signed.example.com/private-image.png?sig=abc123"

    monkeypatch.setattr(r2_storage_service, "generate_presigned_url", fake_generate)

    signed_url = storage_service.generate_presigned_url(
        "/api/v1/assets/wardrobe/source/42/private-image.png",
        expires_seconds=120,
    )

    assert signed_url == "https://signed.example.com/private-image.png?sig=abc123"
    assert captured == {
        "asset_path": "wardrobe/source/42/private-image.png",
        "expires_seconds": 120,
    }
