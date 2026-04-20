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


def test_recommendations_short_circuit_to_empty_closet_setup_when_no_items(monkeypatch):
    monkeypatch.setattr(recommendation_service.local_model, "should_use_local_model", lambda feature: False)

    called = {"count": 0}

    def fake_post(*args, **kwargs):
        called["count"] += 1
        raise AssertionError("Remote recommender should not be called for an empty wardrobe.")

    monkeypatch.setattr(recommendation_service.httpx, "post", fake_post)

    response = recommendation_service.generate_recommendations(
        RecommendationRequest(prompt="Office commute tomorrow"),
        [],
    )

    assert response.source == "local-empty-closet"
    assert response.outfits[0].item_ids == []
    assert called["count"] == 0


def test_recommendations_support_openai_compatible_endpoint(monkeypatch):
    monkeypatch.setattr(recommendation_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(
        recommendation_service.local_model,
        "get_remote_worker_url",
        lambda feature: "https://api.deepseek.com/v1/chat/completions",
    )
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_api_key", "")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_model_name", "")
    monkeypatch.setattr(recommendation_service.settings, "deepseek_api_key", "deepseek-secret")
    monkeypatch.setattr(recommendation_service.settings, "deepseek_multimodal_model", "deepseek-chat")

    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": (
                                '{"source":"deepseek-direct","outfits":[{"title":"Soft Office Edit",'
                                '"rationale":"Direct from a compatible endpoint.","item_ids":[1,2,3],'
                                '"confidence":0.89,"confidence_label":"很懂你"}],'
                                '"agent_trace":[{"node":"DeepSeek","summary":"Compatible chat completions path."}]}'
                            )
                        }
                    }
                ]
            }

    captured = {}

    def fake_post(url, headers, json, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["payload"] = json
        captured["timeout"] = timeout
        return DummyResponse()

    monkeypatch.setattr(recommendation_service.httpx, "post", fake_post)

    response = recommendation_service.generate_recommendations(
        RecommendationRequest(prompt="Office commute tomorrow"),
        _items(),
    )

    assert response.source == "deepseek-direct"
    assert response.outfits[0].title == "Soft Office Edit"
    assert captured["url"] == "https://api.deepseek.com/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer deepseek-secret"
    assert captured["payload"]["model"] == "deepseek-chat"
    assert captured["payload"]["messages"][0]["role"] == "system"


def test_recommendations_retry_long_openai_payload_when_first_response_is_truncated(monkeypatch):
    monkeypatch.setattr(recommendation_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(
        recommendation_service.local_model,
        "get_remote_worker_url",
        lambda feature: "https://api.deepseek.com/v1/chat/completions",
    )
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_api_key", "")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_model_name", "")
    monkeypatch.setattr(recommendation_service.settings, "deepseek_api_key", "deepseek-secret")
    monkeypatch.setattr(recommendation_service.settings, "deepseek_multimodal_model", "deepseek-chat")

    captured_max_tokens: list[int] = []

    class DummyResponse:
        def __init__(self, payload: dict):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    def fake_post(url, headers, json, timeout):
        captured_max_tokens.append(json["max_tokens"])
        if len(captured_max_tokens) == 1:
            return DummyResponse(
                {
                    "choices": [
                        {
                            "finish_reason": "length",
                            "message": {"content": '{"source":"remote-model","outfits":[{"title":"Truncated"}'},
                        }
                    ]
                }
            )
        return DummyResponse(
            {
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {
                            "content": (
                                '{"source":"deepseek-direct","outfits":[{"title":"Soft Office Edit",'
                                '"rationale":"Recovered after retry.","item_ids":[1,2,3],"confidence":0.89}],'
                                '"agent_trace":[{"node":"DeepSeek","summary":"Compatible chat completions path."}]}'
                            )
                        },
                    }
                ]
            }
        )

    monkeypatch.setattr(recommendation_service.httpx, "post", fake_post)

    response = recommendation_service.generate_recommendations(
        RecommendationRequest(prompt="Office commute tomorrow"),
        _items(),
    )

    assert response.source == "deepseek-direct"
    assert captured_max_tokens == [900, 1300]


def test_recommendations_match_remote_item_names_with_partial_name_variants(monkeypatch):
    monkeypatch.setattr(recommendation_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(
        recommendation_service.local_model,
        "get_remote_worker_url",
        lambda feature: "https://api.deepseek.com/v1/chat/completions",
    )
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_api_key", "")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_model_name", "")
    monkeypatch.setattr(recommendation_service.settings, "deepseek_api_key", "deepseek-secret")
    monkeypatch.setattr(recommendation_service.settings, "deepseek_multimodal_model", "deepseek-chat")

    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "finish_reason": "stop",
                        "message": {
                            "content": (
                                '{"source":"deepseek-direct","outfits":[{"title":"Soft Office Edit",'
                                '"rationale":"Matched by names.","item_names":["Ivory Shirt","Anchor Trouser","White Sneaker"]}],'
                                '"agent_trace":[{"node":"DeepSeek","summary":"Matched fuzzy names."}]}'
                            )
                        },
                    }
                ]
            }

    monkeypatch.setattr(recommendation_service.httpx, "post", lambda *args, **kwargs: DummyResponse())

    response = recommendation_service.generate_recommendations(
        RecommendationRequest(prompt="Office commute tomorrow"),
        _items(),
    )

    assert response.source == "deepseek-direct"
    assert response.outfits[0].item_ids == [1, 2, 3]


def test_recommendations_fall_back_to_local_when_remote_fails(monkeypatch):
    monkeypatch.setattr(recommendation_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(recommendation_service.local_model, "get_remote_worker_url", lambda feature: "https://llm-worker.example.com")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_fallback_api_url", "")

    def fake_post(url, json, timeout):
        raise RuntimeError("worker offline")

    monkeypatch.setattr(recommendation_service.httpx, "post", fake_post)

    response = recommendation_service.generate_recommendations(
        RecommendationRequest(prompt="Weekend coffee, soft but polished"),
        _items(),
    )

    assert response.source == "remote-fallback-local-model"
    assert response.agent_trace[0].node == "Failover Router"
    assert len(response.outfits) >= 1


def test_recommendations_fail_over_to_secondary_qwen_worker(monkeypatch):
    monkeypatch.setattr(recommendation_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(
        recommendation_service.local_model,
        "get_remote_worker_url",
        lambda feature: "https://api.deepseek.com/v1/chat/completions",
    )
    monkeypatch.setattr(recommendation_service.settings, "deepseek_api_key", "deepseek-secret")
    monkeypatch.setattr(recommendation_service.settings, "deepseek_multimodal_model", "deepseek-chat")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_api_key", "")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_model_name", "")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_fallback_api_url", "http://127.0.0.1:8011")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_fallback_api_key", "")
    monkeypatch.setattr(recommendation_service.settings, "llm_recommender_fallback_model_name", "Qwen/Qwen2.5-7B-Instruct")

    captured = {"urls": []}

    class DummyResponse:
        def __init__(self, payload: dict):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    def fake_post(url, **kwargs):
        captured["urls"].append(url)
        if url == "https://api.deepseek.com/v1/chat/completions":
            raise RuntimeError("deepseek unavailable")
        if url == "http://127.0.0.1:8011/infer":
            return DummyResponse(
                {
                    "source": "qwen-lora-worker",
                    "outfits": [
                        {
                            "title": "Local Qwen Look",
                            "rationale": "Recovered through the fallback worker.",
                            "item_ids": [1, 2, 3],
                            "confidence": 0.87,
                        }
                    ],
                    "agent_trace": [{"node": "Qwen Worker", "summary": "Fallback worker handled the request."}],
                }
            )
        raise AssertionError(f"Unexpected URL: {url}")

    monkeypatch.setattr(recommendation_service.httpx, "post", fake_post)

    response = recommendation_service.generate_recommendations(
        RecommendationRequest(prompt="Office commute tomorrow"),
        _items(),
    )

    assert response.source == "qwen-lora-worker"
    assert response.agent_trace[0].node == "Failover Router"
    assert "secondary Qwen LoRA worker" in response.agent_trace[0].summary
    assert captured["urls"] == [
        "https://api.deepseek.com/v1/chat/completions",
        "http://127.0.0.1:8011/infer",
    ]
