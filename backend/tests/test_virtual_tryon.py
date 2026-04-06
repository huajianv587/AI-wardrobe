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
