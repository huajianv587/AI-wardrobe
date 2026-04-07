from services import r2_storage_service, storage_service


def test_public_backup_url_for_asset_prefers_r2_public_url(monkeypatch):
    asset_url = "/api/v1/assets/wardrobe/processed/user-1/item-1/test.png"
    asset_path = "wardrobe/processed/user-1/item-1/test.png"

    monkeypatch.setattr(storage_service, "managed_asset_path_from_url", lambda url: asset_path if url == asset_url else None)
    monkeypatch.setattr(
        r2_storage_service,
        "public_url_for_asset_path",
        lambda path: f"https://storage.aiwardrobes.com/{path}" if path == asset_path else None,
    )

    assert storage_service.public_backup_url_for_asset(asset_url) == "https://storage.aiwardrobes.com/wardrobe/processed/user-1/item-1/test.png"


def test_public_backup_url_for_asset_falls_back_to_backend_asset_url(monkeypatch):
    asset_url = "/api/v1/assets/wardrobe/processed/user-1/item-1/test.png"
    asset_path = "wardrobe/processed/user-1/item-1/test.png"

    monkeypatch.setattr(storage_service, "managed_asset_path_from_url", lambda url: asset_path if url == asset_url else None)
    monkeypatch.setattr(r2_storage_service, "public_url_for_asset_path", lambda path: None)
    monkeypatch.setattr(storage_service.settings, "backend_public_base_url", "https://api.aiwardrobes.com")

    assert storage_service.public_backup_url_for_asset(asset_url) == "https://api.aiwardrobes.com/api/v1/assets/wardrobe/processed/user-1/item-1/test.png"
