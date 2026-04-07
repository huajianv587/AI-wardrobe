import io

from PIL import Image

from services import image_pipeline_service, storage_service


def _png_bytes(color: tuple[int, int, int]) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (24, 24), color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_process_item_image_supports_remove_bg_api(monkeypatch):
    captured: dict[str, object] = {}

    monkeypatch.setattr(image_pipeline_service.settings, "ai_cleanup_api_url", "https://api.remove.bg/v1.0/removebg")
    monkeypatch.setattr(image_pipeline_service.settings, "ai_cleanup_api_key", "remove-bg-secret")
    monkeypatch.setattr(image_pipeline_service.settings, "ai_cleanup_timeout_seconds", 19)
    monkeypatch.setattr(image_pipeline_service.local_model, "should_use_local_model", lambda feature: False)
    monkeypatch.setattr(
        storage_service,
        "load_asset_bytes",
        lambda _url: storage_service.LoadedAsset(
            payload=_png_bytes((248, 240, 232)),
            content_type="image/png",
            filename="look.png",
            source="remote",
        ),
    )

    class DummyResponse:
        def __init__(self):
            self.status_code = 200
            self.headers = {"content-type": "image/png"}
            self.content = _png_bytes((255, 255, 255))

        def json(self):
            return {}

    def fake_post(url, files=None, data=None, headers=None, timeout=None):
        captured["url"] = url
        captured["files"] = files
        captured["data"] = data
        captured["headers"] = headers
        captured["timeout"] = timeout
        return DummyResponse()

    monkeypatch.setattr(image_pipeline_service.httpx, "post", fake_post)

    result = image_pipeline_service.process_item_image(12, "https://assets.example.com/look.png")

    assert captured["url"] == "https://api.remove.bg/v1.0/removebg"
    assert captured["files"]["image_file"][0] == "look.png"
    assert captured["data"] == {"size": "auto", "format": "png", "bg_color": "FFFFFF"}
    assert captured["headers"] == {"X-Api-Key": "remove-bg-secret"}
    assert captured["timeout"] == 19
    assert result.mode == "remote"
    assert result.provider == "remove.bg"
    assert result.content_type == "image/png"
