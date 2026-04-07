def test_health_exposes_runtime_modes(client):
    response = client.get("/api/v1/health")
    payload = response.json()

    assert response.status_code == 200
    assert "runtime_modes" in payload
    assert payload["runtime_modes"]["llm_recommender"] in {"local-forced", "remote-preferred", "local-fallback"}
    assert payload["runtime_modes"]["image_cleanup"] in {"local-forced", "remote-preferred", "local-fallback"}
    assert payload["runtime_modes"]["virtual_tryon"] in {"local-forced", "remote-preferred", "local-fallback"}
