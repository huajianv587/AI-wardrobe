from app.models.wardrobe import ClothingItem
from app.schemas.recommendation import RecommendationRequest
from services import recommendation_service


def _items() -> list[ClothingItem]:
    return [
        ClothingItem(
            id=1,
            user_id=1,
            name="Soft Ivory Shirt",
            category="tops",
            slot="top",
            color="Ivory",
            brand="Studio Calm",
            tags=["soft", "minimal"],
            occasions=["office", "coffee"],
            style_notes="Easy polished top.",
        ),
        ClothingItem(
            id=2,
            user_id=1,
            name="Navy Anchor Trouser",
            category="bottoms",
            slot="bottom",
            color="Navy",
            brand="Studio Calm",
            tags=["minimal"],
            occasions=["office"],
            style_notes="Dependable bottom.",
        ),
        ClothingItem(
            id=3,
            user_id=1,
            name="Cloud White Sneaker",
            category="shoes",
            slot="shoes",
            color="White",
            brand="Studio Calm",
            tags=["casual"],
            occasions=["coffee", "travel"],
            style_notes="Repeat-friendly shoe.",
        ),
    ]


def test_recommendations_use_remote_worker_when_enabled(monkeypatch):
    monkeypatch.setattr(recommendation_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(recommendation_service.local_model, "get_remote_worker_url", lambda feature: "https://llm-worker.example.com")

    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "source": "remote-model",
                "outfits": [
                    {
                        "title": "Remote Look",
                        "rationale": "Generated remotely.",
                        "item_ids": [1, 2, 3],
                        "confidence": 0.92,
                    }
                ],
                "agent_trace": [{"node": "Remote Router", "summary": "Remote worker handled the request."}],
            }

    captured = {}

    def fake_post(url, json, timeout):
        captured["url"] = url
        captured["payload"] = json
        captured["timeout"] = timeout
        return DummyResponse()

    monkeypatch.setattr(recommendation_service.httpx, "post", fake_post)

    response = recommendation_service.generate_recommendations(
        RecommendationRequest(prompt="Office commute tomorrow"),
        _items(),
    )

    assert response.source == "remote-model"
    assert response.outfits[0].title == "Remote Look"
    assert captured["url"] == "https://llm-worker.example.com/infer"
    assert captured["payload"]["wardrobe_items"][0]["name"] == "Soft Ivory Shirt"


def test_recommendations_fall_back_to_local_when_remote_fails(monkeypatch):
    monkeypatch.setattr(recommendation_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(recommendation_service.local_model, "get_remote_worker_url", lambda feature: "https://llm-worker.example.com")

    def fake_post(url, json, timeout):
        raise RuntimeError("worker offline")

    monkeypatch.setattr(recommendation_service.httpx, "post", fake_post)

    response = recommendation_service.generate_recommendations(
        RecommendationRequest(prompt="Weekend coffee, soft but polished"),
        _items(),
    )

    assert response.source == "remote-fallback-local-model"
    assert response.agent_trace[0].node == "Remote Adapter"
    assert len(response.outfits) >= 1
