from app.middleware import reset_rate_limit_store
from core.config import settings


def test_health_exposes_runtime_modes(client):
    response = client.get("/api/v1/health")
    payload = response.json()

    assert response.status_code == 200
    assert "runtime_modes" in payload
    assert payload["runtime_modes"]["llm_recommender"] in {"local-forced", "remote-preferred", "local-fallback"}
    assert payload["runtime_modes"]["image_cleanup"] in {"local-forced", "remote-preferred", "local-fallback"}
    assert payload["runtime_modes"]["virtual_tryon"] in {"local-forced", "remote-preferred", "local-fallback"}
    assert "dependencies" in payload
    assert "task_queue" in payload
    assert payload["task_queue"]["enabled"] is True
    assert payload["task_queue"]["eager"] is True
    assert "task_queue" in payload["dependencies"]


def test_health_ready_reports_ready_in_test_fixture(client):
    response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_health_live_sets_request_id_header(client):
    response = client.get("/api/v1/health/live")

    assert response.status_code == 200
    assert response.headers.get("X-Request-ID")


def test_rate_limit_middleware_returns_429_when_limit_is_exceeded(client):
    original_limit = settings.rate_limit_default_requests
    original_window = settings.rate_limit_default_window_seconds
    reset_rate_limit_store()
    settings.rate_limit_default_requests = 1
    settings.rate_limit_default_window_seconds = 60

    try:
        first = client.get("/api/v1/auth/me")
        second = client.get("/api/v1/auth/me")
    finally:
        settings.rate_limit_default_requests = original_limit
        settings.rate_limit_default_window_seconds = original_window
        reset_rate_limit_store()

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"] == "Rate limit exceeded. Please wait a moment and try again."
