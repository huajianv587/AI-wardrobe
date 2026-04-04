from services import ai_demo_service


def test_ai_demo_workflows_endpoint(client):
    response = client.get("/api/v1/ai-demo/workflows")
    payload = response.json()

    assert response.status_code == 200
    assert len(payload) >= 8
    assert payload[0]["api_route"] == "/api/v1/ai-demo/run"
    assert "service_slot" in payload[0]


def test_ai_demo_status_endpoint(client):
    response = client.get("/api/v1/ai-demo/status")
    payload = response.json()

    assert response.status_code == 200
    assert len(payload) >= 8
    assert payload[0]["mode"] == "demo-fallback"
    assert payload[0]["configured"] is False


def test_ai_demo_run_endpoint(client):
    response = client.post(
        "/api/v1/ai-demo/run",
        json={
            "workflow_id": "qwen-outfit-recommendation",
            "prompt": "Weekend coffee, soft but polished",
            "garment_name": "Cream Knit Cardigan",
        },
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["workflow_id"] == "qwen-outfit-recommendation"
    assert payload["status"] == "ready"
    assert payload["artifacts"]


def test_ai_demo_run_endpoint_uses_external_adapter_when_worker_configured(client, monkeypatch):
    settings = ai_demo_service.settings
    original_url = settings.llm_recommender_api_url

    def fake_json_request(url, method, payload=None):
        if method == "GET":
            return {"status": "ok", "mode": "stub"}

        return {
            "status": "stub",
            "message": "External recommender reached",
            "payload_echo": payload,
        }

    settings.llm_recommender_api_url = "http://worker.local"
    monkeypatch.setattr(ai_demo_service, "_json_request", fake_json_request)

    try:
        response = client.post(
            "/api/v1/ai-demo/run",
            json={
                "workflow_id": "qwen-outfit-recommendation",
                "prompt": "Office meeting tomorrow, soft but professional",
            },
        )
        payload = response.json()

        assert response.status_code == 200
        assert payload["provider_mode"] == "external-adapter"
        assert payload["status"] == "proxied"
        assert payload["artifacts"][0]["value"] == "http://worker.local"
    finally:
        settings.llm_recommender_api_url = original_url


def test_mini_program_home_endpoint(client):
    response = client.get("/api/v1/mini-program/home")
    payload = response.json()

    assert response.status_code == 200
    assert payload["user_email"] == "tester@ai-wardrobe.dev"
    assert payload["shortcuts"]
    assert payload["workflow_preview"]


def test_mini_program_wardrobe_endpoint(client):
    create_response = client.post(
        "/api/v1/wardrobe/items",
        json={
            "name": "Mini Wardrobe Coat",
            "category": "outerwear",
            "slot": "outerwear",
            "color": "Oat",
            "brand": "Mini",
            "image_url": "https://example.com/coat.png",
            "processed_image_url": None,
            "tags": ["soft", "layering"],
            "occasions": ["weekend"],
            "style_notes": "Used for mini program cards.",
        },
    )
    assert create_response.status_code == 200

    response = client.get("/api/v1/mini-program/wardrobe")
    payload = response.json()

    assert response.status_code == 200
    assert payload["items_total"] >= 1
    assert payload["cards"][0]["name"]


def test_mini_program_account_endpoint(client):
    response = client.get("/api/v1/mini-program/account")
    payload = response.json()

    assert response.status_code == 200
    assert payload["user_email"] == "tester@ai-wardrobe.dev"
    assert payload["mode"] == "local filesystem + metadata-local-only"


def test_client_bootstrap_endpoint(client):
    response = client.get("/api/v1/client/bootstrap")
    payload = response.json()

    assert response.status_code == 200
    assert payload["user_email"] == "tester@ai-wardrobe.dev"
    assert payload["shortcuts"]
