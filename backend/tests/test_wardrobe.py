import io

import httpx

from core.config import settings


def test_demo_login(client):
    response = client.post("/api/v1/auth/demo-login")
    payload = response.json()

    assert response.status_code == 200
    assert payload["user"]["email"] == "demo@ai-wardrobe.dev"


def test_wardrobe_crud_and_asset_flow(client):
    list_response = client.get("/api/v1/wardrobe/items")
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1

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

    upload_response = client.post(
        f"/api/v1/wardrobe/items/{created['id']}/upload-image",
        files={"image": ("jacket.png", io.BytesIO(b"fake-image-content"), "image/png")},
    )

    uploaded = upload_response.json()
    assert upload_response.status_code == 200
    assert uploaded["image_url"].startswith("/api/v1/assets/wardrobe/source/")
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
    assert processed["processed_image_url"] == f"/api/v1/assets/wardrobe/processed/item-{created['id']}-processed.png"
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
