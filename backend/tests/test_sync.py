from sqlalchemy import select

from app.models.user import User
from app.schemas.wardrobe import ClothingItemCreate
from services import supabase_service, wardrobe_service


def test_sync_status_endpoint(client):
    response = client.get("/api/v1/sync/status")
    payload = response.json()

    assert response.status_code == 200
    assert payload["mode"] == "local filesystem + metadata-local-only"
    assert payload["cloud_enabled"] is False
    assert payload["user_id"] == 1
    assert payload["items_total"] == 0


def test_manual_sync_endpoint_when_cloud_disabled(client):
    response = client.post("/api/v1/sync/wardrobe")
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "skipped"
    assert payload["attempted_items"] == 0
    assert "not configured" in payload["message"]


def test_manual_sync_run_alias_when_cloud_disabled(client):
    response = client.post("/api/v1/sync/run")
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "skipped"
    assert payload["attempted_items"] == 0
    assert "not configured" in payload["message"]


def test_manual_sync_endpoint_pushes_items_when_cloud_enabled(client, monkeypatch):
    settings = supabase_service.settings
    original_url = settings.supabase_url
    original_service_role = settings.supabase_service_role_key

    settings.supabase_url = "https://project.supabase.co"
    settings.supabase_service_role_key = "service-role-key"

    synced_payloads = []

    def fake_sync(item, **kwargs):
        synced_payloads.append({"id": item.id, **kwargs})
        return True

    monkeypatch.setattr(supabase_service, "sync_clothing_item", fake_sync)

    with client.testing_session_local() as db:
        user = db.scalar(select(User).where(User.email == "tester@ai-wardrobe.dev"))
        assert user is not None
        wardrobe_service.create_item(
            db,
            ClothingItemCreate(
                name="Synced Skirt",
                category="bottoms",
                slot="bottom",
                color="Ivory",
                brand="Cloud Test",
                image_url=None,
                processed_image_url=None,
                tags=["sync"],
                occasions=["office"],
                style_notes="Created before manual cloud sync.",
            ),
            user,
        )

    try:
        response = client.post("/api/v1/sync/wardrobe")
        payload = response.json()

        assert response.status_code == 200
        assert payload["status"] == "completed"
        assert payload["synced_items"] >= 1
        assert synced_payloads
        assert synced_payloads[0]["owner_supabase_user_id"] == "supabase-user-test-001"
        assert synced_payloads[0]["owner_email"] == "tester@ai-wardrobe.dev"
    finally:
        settings.supabase_url = original_url
        settings.supabase_service_role_key = original_service_role
