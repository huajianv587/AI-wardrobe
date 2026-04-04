import io

import httpx

from app.api.deps import get_current_user
from app.main import app
from app.models.user import User
from app.models.wardrobe import ClothingItem
from core.config import settings
from services import r2_storage_service


def test_wardrobe_requires_auth_header(client):
    override = app.dependency_overrides.pop(get_current_user, None)

    try:
        response = client.get("/api/v1/wardrobe/items")
        payload = response.json()

        assert response.status_code == 401
        assert payload["detail"] == "Authentication is required."
    finally:
        if override is not None:
            app.dependency_overrides[get_current_user] = override


def test_wardrobe_crud_and_asset_flow(client):
    list_response = client.get("/api/v1/wardrobe/items")
    assert list_response.status_code == 200
    assert list_response.json() == []

    create_response = client.post(
        "/api/v1/wardrobe/items",
        json={
            "name": "Graphite Cropped Jacket",
            "category": "outerwear",
            "slot": "outerwear",
            "color": "Graphite",
            "brand": "Atelier Local",
            "image_url": None,
            "processed_image_url": None,
            "tags": ["minimal", "city"],
            "occasions": ["office", "weekend"],
            "style_notes": "A sharp layer for cool weather.",
        },
    )

    created = create_response.json()
    assert create_response.status_code == 200
    assert created["name"] == "Graphite Cropped Jacket"
    assert created["user_id"] is not None

    upload_response = client.post(
        f"/api/v1/wardrobe/items/{created['id']}/upload-image",
        files={"image": ("jacket.png", io.BytesIO(b"fake-image-content"), "image/png")},
    )

    uploaded = upload_response.json()
    assert upload_response.status_code == 200
    assert uploaded["image_url"].startswith("/api/v1/assets/wardrobe/source/user-")
    assert "source-image" in uploaded["tags"]

    source_asset_response = client.get(uploaded["image_url"])
    assert source_asset_response.status_code == 200
    assert source_asset_response.content == b"fake-image-content"

    update_response = client.put(
        f"/api/v1/wardrobe/items/{created['id']}",
        json={
            "brand": "Atelier Updated",
            "tags": ["minimal", "office-ready"],
            "style_notes": "Updated note for recommendation tests.",
        },
    )

    updated = update_response.json()
    assert update_response.status_code == 200
    assert updated["brand"] == "Atelier Updated"
    assert updated["tags"] == ["minimal", "office-ready"]

    process_response = client.post(f"/api/v1/wardrobe/items/{created['id']}/process-image")
    processed = process_response.json()

    assert process_response.status_code == 200
    assert processed["processed_image_url"].startswith("/api/v1/assets/wardrobe/processed/user-")
    assert processed["processed_image_url"].endswith(f"/item-{created['id']}-processed.png")
    assert "processed" in processed["tags"]
    assert "white-background" in processed["tags"]
    assert "cleanup-placeholder" in processed["tags"]
    assert "AI cleanup placeholder completed locally." in processed["style_notes"]

    processed_asset_response = client.get(processed["processed_image_url"])
    assert processed_asset_response.status_code == 200
    assert processed_asset_response.content == b"fake-image-content"

    delete_response = client.delete(f"/api/v1/wardrobe/items/{created['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"

    missing_response = client.get(f"/api/v1/wardrobe/items/{created['id']}")
    assert missing_response.status_code == 404


def test_wardrobe_isolation_hides_other_users_items(client):
    with client.testing_session_local() as db:
        other_user = User(
            email="other-user@ai-wardrobe.dev",
            supabase_user_id="supabase-user-test-999",
            password_hash="supabase-managed",
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        hidden_item = ClothingItem(
            user_id=other_user.id,
            name="Private User Coat",
            category="outerwear",
            slot="outerwear",
            color="Black",
            brand="Isolation Test",
            image_url=None,
            processed_image_url=None,
            tags=["private"],
            occasions=["city"],
            style_notes="Only visible to the authenticated owner.",
        )
        db.add(hidden_item)
        db.commit()
        db.refresh(hidden_item)
        hidden_item_id = hidden_item.id

    list_response = client.get("/api/v1/wardrobe/items")
    assert list_response.status_code == 200
    assert all(item["id"] != hidden_item_id for item in list_response.json())

    detail_response = client.get(f"/api/v1/wardrobe/items/{hidden_item_id}")
    assert detail_response.status_code == 404


def test_remote_ai_cleanup_path(client, monkeypatch):
    settings.ai_cleanup_api_url = "https://cleanup.example/api"
    settings.ai_cleanup_api_key = "secret-key"
    requests = []

    def fake_post(url, files, headers, timeout):
        requests.append({"url": url, "headers": headers, "timeout": timeout, "filename": files["image"][0]})
        return httpx.Response(
            200,
            content=b"processed-image-content",
            headers={"content-type": "image/png"},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    create_response = client.post(
        "/api/v1/wardrobe/items",
        json={
            "name": "Soft Blue Shirt",
            "category": "tops",
            "slot": "top",
            "color": "Blue",
            "brand": "Remote Test",
            "image_url": None,
            "processed_image_url": None,
            "tags": ["casual"],
            "occasions": ["weekend"],
            "style_notes": "Remote cleanup integration test.",
        },
    )
    created = create_response.json()

    upload_response = client.post(
        f"/api/v1/wardrobe/items/{created['id']}/upload-image",
        files={"image": ("shirt.png", io.BytesIO(b"raw-image-content"), "image/png")},
    )
    assert upload_response.status_code == 200

    process_response = client.post(f"/api/v1/wardrobe/items/{created['id']}/process-image")
    processed = process_response.json()

    assert process_response.status_code == 200
    assert "cleanup-remote" in processed["tags"]
    assert "AI cleanup completed via the configured external service." in processed["style_notes"]

    processed_asset_response = client.get(processed["processed_image_url"])
    assert processed_asset_response.status_code == 200
    assert processed_asset_response.content == b"processed-image-content"

    assert requests
    assert requests[0]["url"] == settings.ai_cleanup_api_url
    assert requests[0]["headers"]["Authorization"] == f"Bearer {settings.ai_cleanup_api_key}"
    assert requests[0]["headers"]["X-API-Key"] == settings.ai_cleanup_api_key
    assert requests[0]["filename"].endswith(".png")


def test_r2_prepare_and_confirm_upload_flow(client, monkeypatch):
    settings.r2_account_id = "cloudflare-account"
    settings.r2_bucket = "wardrobe-assets"
    settings.r2_access_key_id = "r2-key"
    settings.r2_secret_access_key = "r2-secret"
    settings.r2_public_base_url = "https://images.example.com"
    r2_storage_service.get_client.cache_clear()

    monkeypatch.setattr(r2_storage_service, "is_enabled", lambda: True)
    def fake_prepare(asset_path, content_type):
        return r2_storage_service.PreparedUpload(
            upload_url="https://upload.example.com/presigned",
            public_url=f"https://images.example.com/{asset_path}",
            headers={"Content-Type": content_type or "application/octet-stream"},
        )

    monkeypatch.setattr(r2_storage_service, "prepare_presigned_upload", fake_prepare)
    monkeypatch.setattr(r2_storage_service, "object_exists", lambda asset_url: True)

    create_response = client.post(
        "/api/v1/wardrobe/items",
        json={
            "name": "R2 Upload Coat",
            "category": "outerwear",
            "slot": "outerwear",
            "color": "Camel",
            "brand": "R2 Test",
            "image_url": None,
            "processed_image_url": None,
            "tags": ["cloud"],
            "occasions": ["city"],
            "style_notes": "Prepared upload integration test.",
        },
    )
    created = create_response.json()

    prepare_response = client.post(
        f"/api/v1/wardrobe/items/{created['id']}/prepare-image-upload",
        json={"filename": "coat.png", "content_type": "image/png"},
    )
    prepared = prepare_response.json()

    assert prepare_response.status_code == 200
    assert prepared["upload_url"] == "https://upload.example.com/presigned"
    assert prepared["public_url"].startswith("https://images.example.com/wardrobe/source/user-")

    confirm_response = client.post(
        f"/api/v1/wardrobe/items/{created['id']}/confirm-image-upload",
        json={"public_url": prepared["public_url"]},
    )
    confirmed = confirm_response.json()

    assert confirm_response.status_code == 200
    assert confirmed["image_url"] == prepared["public_url"]
    assert "source-image" in confirmed["tags"]
