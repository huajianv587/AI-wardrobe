import io

from PIL import Image

from app.models.user import User
from app.models.wardrobe import ClothingItem
from app.schemas.try_on import TryOnRenderRequest
from services import storage_service, virtual_tryon_service


def _png_bytes(color: tuple[int, int, int]) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (32, 32), color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_virtual_tryon_supports_replicate_async_predictions(monkeypatch):
    garment_item = ClothingItem(
        id=11,
        user_id=1,
        name="Cream Knit Cardigan",
        category="tops",
        slot="top",
        color="Cream",
        brand="AI Wardrobe",
        image_url="https://assets.example.com/garment.png",
        processed_image_url=None,
        tags=["soft"],
        occasions=["office"],
        style_notes="Soft layer.",
    )

    monkeypatch.setattr(virtual_tryon_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(virtual_tryon_service, "_look_items_from_ids", lambda db, user, item_ids: [garment_item])
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_api_url", "https://api.replicate.com/v1/predictions")
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_api_key", "replicate-secret")
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_replicate_version", "owner/model:123456")
    monkeypatch.setattr(
        virtual_tryon_service.settings,
        "virtual_tryon_replicate_input_template",
        '{"person_image":"{{person_image_url}}","garment_image":"{{primary_garment_url}}","prompt":"{{prompt_or_scene}}"}',
    )
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_poll_interval_seconds", 0.0)
    monkeypatch.setattr(virtual_tryon_service.time, "sleep", lambda seconds: None)

    uploaded_preview = storage_service.StoredAsset(
        relative_path="tryon/user-1/preview.png",
        url="https://assets.example.com/tryon-preview.png",
        backup_url="https://assets.example.com/tryon-preview.png",
    )
    monkeypatch.setattr(storage_service, "save_generated_asset", lambda *args, **kwargs: uploaded_preview)
    monkeypatch.setattr(
        storage_service,
        "load_asset_bytes",
        lambda url: storage_service.LoadedAsset(
            payload=_png_bytes((235, 220, 210)),
            content_type="image/png",
            filename="result.png",
            source="remote",
        ),
    )

    captured = {}

    class DummyResponse:
        def __init__(self, payload: dict):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    def fake_post(url, json, headers, timeout):
        captured["create_url"] = url
        captured["create_payload"] = json
        captured["create_headers"] = headers
        captured["create_timeout"] = timeout
        return DummyResponse(
            {
                "id": "pred-123",
                "status": "starting",
                "urls": {"get": "https://api.replicate.com/v1/predictions/pred-123"},
            }
        )

    def fake_get(url, headers, timeout):
        captured["poll_url"] = url
        captured["poll_headers"] = headers
        captured["poll_timeout"] = timeout
        return DummyResponse(
            {
                "id": "pred-123",
                "status": "succeeded",
                "output": "https://replicate.delivery/result.png",
            }
        )

    monkeypatch.setattr(virtual_tryon_service.httpx, "post", fake_post)
    monkeypatch.setattr(virtual_tryon_service.httpx, "get", fake_get)

    response = virtual_tryon_service.render_try_on(
        db=None,
        user=User(id=1, email="tester@ai-wardrobe.dev", password_hash="supabase-managed"),
        payload=TryOnRenderRequest(
            item_ids=[11],
            person_image_url="https://assets.example.com/person.png",
            prompt="Gentle office look",
            scene="studio",
        ),
    )

    assert response.provider_mode == "remote"
    assert response.provider.startswith("Replicate")
    assert response.preview_url == uploaded_preview.url
    assert captured["create_url"] == "https://api.replicate.com/v1/predictions"
    assert captured["create_headers"]["Authorization"] == "Bearer replicate-secret"
    assert captured["create_payload"]["version"] == "owner/model:123456"
    assert captured["create_payload"]["input"]["person_image"] == "https://assets.example.com/person.png"
    assert captured["create_payload"]["input"]["garment_image"] == "https://assets.example.com/garment.png"
    assert captured["poll_url"] == "https://api.replicate.com/v1/predictions/pred-123"


def test_virtual_tryon_falls_back_to_local_oot_worker_when_cloud_api_fails(monkeypatch):
    garment_item = ClothingItem(
        id=31,
        user_id=1,
        name="Warm Camel Coat",
        category="outerwear",
        slot="outerwear",
        color="Camel",
        brand="AI Wardrobe",
        image_url="https://assets.example.com/coat.png",
        processed_image_url=None,
        tags=["coat"],
        occasions=["travel"],
        style_notes="Fallback worker test.",
    )

    monkeypatch.setattr(virtual_tryon_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(virtual_tryon_service, "_look_items_from_ids", lambda db, user, item_ids: [garment_item])
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_api_url", "https://api.replicate.com/v1/predictions")
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_api_key", "replicate-secret")
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_fallback_api_url", "http://127.0.0.1:9002/infer")
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_fallback_api_key", "")

    uploaded_preview = storage_service.StoredAsset(
        relative_path="tryon/user-1/preview.png",
        url="https://assets.example.com/fallback-preview.png",
        backup_url="https://assets.example.com/fallback-preview.png",
    )
    monkeypatch.setattr(storage_service, "save_generated_asset", lambda *args, **kwargs: uploaded_preview)

    fallback_png = _png_bytes((210, 198, 188))

    class DummyResponse:
        def __init__(self, payload: dict):
            self._payload = payload
            self.headers = {"content-type": "application/json"}

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    captured = {"urls": []}

    def fake_post(url, **kwargs):
        captured["urls"].append(url)
        if url == "https://api.replicate.com/v1/predictions":
            raise RuntimeError("replicate unavailable")
        if url == "http://127.0.0.1:9002/infer":
            return DummyResponse(
                {
                    "image_base64": __import__("base64").b64encode(fallback_png).decode("ascii"),
                    "content_type": "image/png",
                    "provider": "OOTDiffusion local",
                }
            )
        raise AssertionError(f"Unexpected URL: {url}")

    monkeypatch.setattr(virtual_tryon_service.httpx, "post", fake_post)

    response = virtual_tryon_service.render_try_on(
        db=None,
        user=User(id=1, email="tester@ai-wardrobe.dev", password_hash="supabase-managed"),
        payload=TryOnRenderRequest(
            item_ids=[31],
            person_image_url="https://assets.example.com/person.png",
            prompt="Travel look",
            scene="studio",
        ),
    )

    assert response.provider_mode == "remote-fallback-worker"
    assert response.provider == "OOTDiffusion local"
    assert response.preview_url == uploaded_preview.url
    assert captured["urls"] == [
        "https://api.replicate.com/v1/predictions",
        "http://127.0.0.1:9002/infer",
    ]


def test_virtual_tryon_default_replicate_template_infers_category(monkeypatch):
    dress_item = ClothingItem(
        id=21,
        user_id=1,
        name="Soft Pink Dress",
        category="dresses",
        slot="top",
        color="Pink",
        brand="AI Wardrobe",
        image_url="https://assets.example.com/dress.png",
        processed_image_url=None,
        tags=["dress"],
        occasions=["date"],
        style_notes="Dress test.",
    )

    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_replicate_input_template", "")

    payload = virtual_tryon_service._replicate_input_payload(
        TryOnRenderRequest(
            item_ids=[21],
            person_image_url="https://assets.example.com/person.png",
            prompt="Date night dress look",
            scene="studio",
        ),
        [dress_item],
    )

    assert payload["human_img"] == "https://assets.example.com/person.png"
    assert payload["garm_img"] == "https://assets.example.com/dress.png"
    assert payload["category"] == "dresses"
    assert payload["crop"] is False
    assert payload["force_dc"] is True


def test_virtual_tryon_replicate_uses_public_backup_urls_for_managed_assets(monkeypatch):
    garment_item = ClothingItem(
        id=77,
        user_id=1,
        name="Soft Pink Shirt",
        category="tops",
        slot="top",
        color="Pink",
        brand="AI Wardrobe",
        image_url="/api/v1/assets/wardrobe/source/1/test-shirt.png",
        processed_image_url=None,
        tags=["soft"],
        occasions=["office"],
        style_notes="Managed asset test.",
    )

    monkeypatch.setattr(
        storage_service,
        "public_backup_url_for_asset",
        lambda asset_url: "https://api.aiwardrobes.com/api/v1/assets/wardrobe/source/1/test-shirt.png"
        if asset_url == garment_item.image_url
        else None,
    )

    payload = virtual_tryon_service._replicate_input_payload(
        TryOnRenderRequest(
            item_ids=[77],
            person_image_url="https://assets.example.com/person.png",
            prompt="Soft office look",
            scene="studio",
        ),
        [garment_item],
    )

    assert payload["human_img"] == "https://assets.example.com/person.png"
    assert payload["garm_img"] == "https://api.aiwardrobes.com/api/v1/assets/wardrobe/source/1/test-shirt.png"


def test_virtual_tryon_skips_replicate_without_person_image(monkeypatch):
    garment_item = ClothingItem(
        id=52,
        user_id=1,
        name="Ivory Shell Top",
        category="tops",
        slot="top",
        color="Ivory",
        brand="AI Wardrobe",
        image_url="https://assets.example.com/top.png",
        processed_image_url=None,
        tags=["minimal"],
        occasions=["office"],
        style_notes="No person image gate test.",
    )

    monkeypatch.setattr(virtual_tryon_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(virtual_tryon_service, "_look_items_from_ids", lambda db, user, item_ids: [garment_item])
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_api_url", "https://api.replicate.com/v1/predictions")
    monkeypatch.setattr(virtual_tryon_service.settings, "virtual_tryon_api_key", "replicate-secret")
    monkeypatch.setattr(
        storage_service,
        "load_asset_bytes",
        lambda url: storage_service.LoadedAsset(
            payload=_png_bytes((240, 226, 214)),
            content_type="image/png",
            filename="top.png",
            source="remote",
        ),
    )
    monkeypatch.setattr(storage_service, "save_generated_asset", lambda *args, **kwargs: storage_service.StoredAsset(
        relative_path="tryon/user-1/local-preview.png",
        url="https://assets.example.com/local-preview.png",
        backup_url="https://assets.example.com/local-preview.png",
    ))
    monkeypatch.setattr(virtual_tryon_service.httpx, "post", lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("Replicate should be skipped when person_image_url is missing")))

    response = virtual_tryon_service.render_try_on(
        db=None,
        user=User(id=1, email="tester@ai-wardrobe.dev", password_hash="supabase-managed"),
        payload=TryOnRenderRequest(
            item_ids=[52],
            prompt="Studio preview",
            scene="studio",
        ),
    )

    assert response.provider_mode == "local"
    assert response.provider == "本地试衣合成"
    assert "上传全身照后会自动切到 Replicate 云端试衣" in response.message
