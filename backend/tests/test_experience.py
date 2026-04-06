import io
import re

from core.config import settings
from services import experience_service, r2_storage_service


def test_experience_wardrobe_management_flow(client):
    overview_response = client.get("/api/v1/experience/wardrobe-management")
    overview = overview_response.json()

    assert overview_response.status_code == 200
    assert overview["stats"]["total_items"] >= 1
    assert overview["items"]

    create_response = client.post(
        "/api/v1/experience/wardrobe-management/items",
        json={
            "name": "体验页测试衬衫",
            "category": "tops",
            "slot": "top",
            "color": "米白",
            "brand": "Test",
            "image_url": None,
            "tags": ["测试", "春夏"],
            "occasions": ["通勤"],
            "style_notes": "体验页新增的测试单品。",
        },
    )
    created = create_response.json()["item"]

    assert create_response.status_code == 200
    assert created["name"] == "体验页测试衬衫"

    update_response = client.put(
        f"/api/v1/experience/wardrobe-management/items/{created['id']}",
        json={
            "name": "体验页测试衬衫 2",
            "category": "tops",
            "slot": "top",
            "color": "深蓝",
            "brand": "Test",
            "image_url": None,
            "tags": ["测试", "秋冬"],
            "occasions": ["约会"],
            "style_notes": "体验页更新后的测试单品。",
        },
    )
    updated = update_response.json()["item"]

    assert update_response.status_code == 200
    assert updated["name"] == "体验页测试衬衫 2"
    assert updated["color"] == "深蓝"

    bulk_response = client.post(
        "/api/v1/experience/wardrobe-management/bulk",
        json={
            "action": "edit-tags",
            "item_ids": [created["id"]],
            "tags": ["已批量整理"],
            "note": "批量备注已写入。",
        },
    )

    assert bulk_response.status_code == 200
    assert bulk_response.json()["status"] == "updated"

    import_response = client.post(
        "/api/v1/experience/wardrobe-management/import-url",
        json={
            "image_url": "https://example.com/test-look.png",
            "name": "URL 导入测试",
            "category": "dresses",
            "slot": "top",
            "color": "玫粉",
        },
    )

    assert import_response.status_code == 200
    assert import_response.json()["item"]["name"] == "URL 导入测试"
    assert import_response.json()["item"]["source"]["status"] == "未确认"

    delete_response = client.delete(f"/api/v1/experience/wardrobe-management/items/{created['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"


def test_experience_wardrobe_management_imports_product_link_metadata(client, monkeypatch):
    class DummyResponse:
        def __init__(self):
            self.url = "https://detail.tmall.com/item.htm?id=123456"
            self.headers = {"content-type": "text/html; charset=utf-8"}
            self.text = """
                <html>
                  <head>
                    <meta property="og:title" content="奶油通勤西装外套" />
                    <meta property="og:description" content="适合通勤和约会的驼色西装外套" />
                    <meta property="og:image" content="https://img.example.com/coat-main.jpg" />
                  </head>
                </html>
            """

        def raise_for_status(self):
            return None

    monkeypatch.setattr(experience_service.httpx, "get", lambda *args, **kwargs: DummyResponse())

    response = client.post(
        "/api/v1/experience/wardrobe-management/import-url",
        json={
            "source_url": "https://detail.tmall.com/item.htm?id=123456",
            "category": "tops",
            "slot": "top",
            "color": "米白",
        },
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["item"]["name"] == "奶油通勤西装外套"
    assert payload["item"]["category"] == "outerwear"
    assert payload["item"]["source"]["platform"] == "天猫"
    assert payload["item"]["source"]["source_url"].startswith("https://detail.tmall.com")
    assert payload["item"]["image_url"] == "https://img.example.com/coat-main.jpg"


def test_experience_wardrobe_management_assets_filters_and_bulk_flow(client, monkeypatch):
    first_create = client.post(
        "/api/v1/experience/wardrobe-management/items",
        json={
            "name": "体验页筛选上衣",
            "category": "tops",
            "slot": "top",
            "color": "米白",
            "brand": "Flow Test",
            "image_url": None,
            "tags": ["筛选", "批量"],
            "occasions": ["通勤"],
            "style_notes": "用于体验页筛选和上传测试。",
        },
    )
    second_create = client.post(
        "/api/v1/experience/wardrobe-management/items",
        json={
            "name": "体验页批量外套",
            "category": "outerwear",
            "slot": "outerwear",
            "color": "驼色",
            "brand": "Flow Test",
            "image_url": None,
            "tags": ["筛选", "图片"],
            "occasions": ["通勤"],
            "style_notes": "用于体验页批量移动测试。",
        },
    )

    first_item = first_create.json()["item"]
    second_item = second_create.json()["item"]

    filter_response = client.get("/api/v1/experience/wardrobe-management?category=tops&query=筛选上衣")
    filter_payload = filter_response.json()

    assert filter_response.status_code == 200
    assert [item["id"] for item in filter_payload["items"]] == [first_item["id"]]

    legacy_upload_response = client.post(
        f"/api/v1/experience/wardrobe-management/items/{first_item['id']}/upload-image",
        files={"image": ("experience-top.png", io.BytesIO(b"experience-image"), "image/png")},
    )
    legacy_upload_payload = legacy_upload_response.json()

    assert legacy_upload_response.status_code == 200
    assert re.fullmatch(
        r"/api/v1/assets/wardrobe/source/\d+/[0-9a-f-]+\.png",
        legacy_upload_payload["item"]["image_url"],
    )

    monkeypatch.setattr(settings, "r2_account_id", "cloudflare-account", raising=False)
    monkeypatch.setattr(settings, "r2_bucket", "wardrobe-assets", raising=False)
    monkeypatch.setattr(settings, "r2_access_key_id", "r2-key", raising=False)
    monkeypatch.setattr(settings, "r2_secret_access_key", "r2-secret", raising=False)
    monkeypatch.setattr(settings, "r2_public_base_url", "https://images.example.com", raising=False)
    r2_storage_service.get_client.cache_clear()

    monkeypatch.setattr(r2_storage_service, "is_enabled", lambda: True)
    monkeypatch.setattr(
        r2_storage_service,
        "prepare_presigned_upload",
        lambda asset_path, content_type: r2_storage_service.PreparedUpload(
            upload_url="https://upload.example.com/presigned",
            public_url=f"https://images.example.com/{asset_path}",
            headers={"Content-Type": content_type or "application/octet-stream"},
        ),
    )
    monkeypatch.setattr(r2_storage_service, "object_exists_for_path", lambda asset_path: True)

    prepare_response = client.post(
        f"/api/v1/experience/wardrobe-management/items/{second_item['id']}/prepare-image-upload",
        json={"filename": "experience-coat.png", "content_type": "image/png"},
    )
    prepare_payload = prepare_response.json()

    assert prepare_response.status_code == 200
    assert prepare_payload["upload_url"] == "https://upload.example.com/presigned"
    assert re.fullmatch(
        r"/api/v1/assets/wardrobe/source/\d+/[0-9a-f-]+\.png",
        prepare_payload["public_url"],
    )

    confirm_response = client.post(
        f"/api/v1/experience/wardrobe-management/items/{second_item['id']}/confirm-image-upload",
        json={"public_url": prepare_payload["public_url"]},
    )
    confirm_payload = confirm_response.json()

    assert confirm_response.status_code == 200
    assert confirm_payload["item"]["image_url"] == prepare_payload["public_url"]

    bulk_move_response = client.post(
        "/api/v1/experience/wardrobe-management/bulk",
        json={
            "action": "move-category",
            "item_ids": [first_item["id"], second_item["id"]],
            "category": "outerwear",
            "slot": "outerwear",
            "color": "深灰",
            "note": "批量移动完成。",
        },
    )
    bulk_move_payload = bulk_move_response.json()

    assert bulk_move_response.status_code == 200
    assert bulk_move_payload["status"] == "updated"
    assert bulk_move_payload["count"] == 2

    moved_filter_response = client.get("/api/v1/experience/wardrobe-management?category=outerwear&query=体验页")
    moved_filter_payload = moved_filter_response.json()
    moved_ids = {item["id"] for item in moved_filter_payload["items"]}

    assert moved_filter_response.status_code == 200
    assert first_item["id"] in moved_ids
    assert second_item["id"] in moved_ids
    assert all(item["category"] == "outerwear" for item in moved_filter_payload["items"] if item["id"] in moved_ids)

    bulk_delete_response = client.post(
        "/api/v1/experience/wardrobe-management/bulk",
        json={
            "action": "delete",
            "item_ids": [first_item["id"], second_item["id"]],
        },
    )
    bulk_delete_payload = bulk_delete_response.json()

    assert bulk_delete_response.status_code == 200
    assert bulk_delete_payload["status"] == "deleted"
    assert bulk_delete_payload["count"] == 2


def test_experience_smart_diary_analysis_and_style_flow(client):
    smart_response = client.get("/api/v1/experience/smart-wardrobe")
    smart = smart_response.json()

    assert smart_response.status_code == 200
    assert smart["stats"]["total"] >= 1
    first_processing_item = smart["processing_items"][0]

    config_response = client.post(
        "/api/v1/experience/smart-wardrobe/config",
        json={
            "primary_service": "用户服饰白底图 Worker",
            "remove_bg_key": "rm_demo_key",
            "fallback_strategy": "远端失败后自动切换本地白底预览",
            "person_detector": "人像检测 Worker",
            "face_selector": "用户锁定 Worker",
            "garment_segmenter": "服饰分割 Worker",
            "label_model": "三级识别提取链",
            "recognition_local_model": "Qwen2.5-VL-Local",
            "recognition_openai_model": "gpt-4.1-mini",
            "recognition_deepseek_model": "deepseek-chat",
            "recognition_retries": 1,
            "concurrency": 2,
        },
    )
    assert config_response.status_code == 200
    assert config_response.json()["status"] == "saved"
    assert config_response.json()["config"]["recognition_local_model"] == "Qwen2.5-VL-Local"
    assert config_response.json()["config"]["recognition_openai_model"] == "gpt-4.1-mini"
    assert config_response.json()["config"]["recognition_deepseek_model"] == "deepseek-chat"
    assert config_response.json()["config"]["recognition_retries"] == 1

    upload_response = client.post(
        "/api/v1/experience/smart-wardrobe/upload-batch",
        json={
            "mode": "上传后自动抠图 + 补全标签",
            "default_category": "上衣",
            "filenames": ["batch-a.png", "batch-b.png"],
        },
    )
    assert upload_response.status_code == 200
    assert upload_response.json()["status"] == "queued"

    upload_files_response = client.post(
        "/api/v1/experience/smart-wardrobe/upload-batch-files",
        data={
            "mode": "上传后自动抠图 + 补全标签",
            "default_category": "上衣",
        },
        files=[
            ("files", ("smart-batch-a.png", io.BytesIO(b"smart-a"), "image/png")),
            ("files", ("smart-batch-b.png", io.BytesIO(b"smart-b"), "image/png")),
        ],
    )
    upload_files_payload = upload_files_response.json()

    assert upload_files_response.status_code == 200
    assert upload_files_payload["status"] == "queued"
    assert len(upload_files_payload["items"]) == 2
    assert all(item["image_url"] for item in upload_files_payload["items"])

    retry_response = client.post(f"/api/v1/experience/smart-wardrobe/items/{first_processing_item['id']}/retry")
    assert retry_response.status_code == 200
    assert retry_response.json()["status"] == "completed"

    confirm_response = client.post(f"/api/v1/experience/smart-wardrobe/items/{first_processing_item['id']}/confirm")
    assert confirm_response.status_code == 200
    assert confirm_response.json()["status"] == "saved"

    if smart["pending_items"]:
        prioritize_response = client.post(f"/api/v1/experience/smart-wardrobe/pending/{smart['pending_items'][0]['id']}/prioritize")
        assert prioritize_response.status_code == 200
        assert prioritize_response.json()["status"] == "queued"

    diary_response = client.get("/api/v1/experience/outfit-diary?year=2026&month=4")
    diary = diary_response.json()

    assert diary_response.status_code == 200
    assert diary["calendar"]["days_in_month"] == 30

    log_response = client.post(
        "/api/v1/experience/outfit-diary/logs",
        json={
            "day": 9,
            "year": 2026,
            "month": 4,
            "outfit_name": "体验页日志测试",
            "occasion": "通勤",
            "item_ids": [first_processing_item["id"]],
            "note": "测试日志写入。",
        },
    )
    assert log_response.status_code == 200
    assert log_response.json()["status"] == "saved"

    fallback_log_response = client.post(
        "/api/v1/experience/outfit-diary/logs",
        json={
            "day": 11,
            "year": 2026,
            "month": 4,
            "outfit_name": "体验页空单品回填测试",
            "occasion": "周末",
            "item_ids": [],
            "note": "测试空 item_ids 时自动回填。",
        },
    )
    assert fallback_log_response.status_code == 200
    assert fallback_log_response.json()["status"] == "saved"

    suitcase_response = client.post(
        "/api/v1/experience/outfit-diary/suitcase",
        json={
            "destination": "东京",
            "days_label": "5天4晚",
            "scene": "城市探索",
        },
    )
    suitcase = suitcase_response.json()

    assert suitcase_response.status_code == 200
    assert suitcase["status"] == "generated"
    assert suitcase["result"]["packed_items"]
    assert suitcase["result"]["packed_items"][0]["name"]
    assert "qty" in suitcase["result"]["packed_items"][0]
    assert suitcase["result"]["day_plans"][0]["items"]
    assert isinstance(suitcase["result"]["day_plans"][0]["items"][0], dict)

    refreshed_diary_response = client.get("/api/v1/experience/outfit-diary?year=2026&month=4")
    refreshed_diary = refreshed_diary_response.json()
    assert refreshed_diary_response.status_code == 200
    assert refreshed_diary["calendar"]["details"]["11"]["items"]
    assert refreshed_diary["calendar"]["details"]["11"]["item_ids"]
    assert refreshed_diary["suitcase_defaults"]["destination"] == "东京"
    assert refreshed_diary["suitcase_defaults"]["days_label"] == "5天4晚"
    assert refreshed_diary["suitcase_defaults"]["scene"] == "城市探索"

    analysis_response = client.get("/api/v1/experience/closet-analysis?season=summer")
    analysis = analysis_response.json()

    assert analysis_response.status_code == 200
    assert "gap_score" in analysis
    assert analysis["season"]["active"] == "summer"
    assert analysis["heatmap"]
    assert isinstance(analysis["heatmap"][0], dict)
    assert "level" in analysis["heatmap"][0]

    if analysis["care"]["urgent"]:
        care_id = analysis["care"]["urgent"][0]["id"]
        mark_done_response = client.post(f"/api/v1/experience/closet-analysis/care/{care_id}/mark-done")
        assert mark_done_response.status_code == 200
        assert mark_done_response.json()["status"] == "completed"

    if analysis["care"]["normal"]:
        remind_id = analysis["care"]["normal"][0]["id"]
        remind_response = client.post(f"/api/v1/experience/closet-analysis/care/{remind_id}/remind")
        assert remind_response.status_code == 200
        assert remind_response.json()["status"] == "scheduled"

    if analysis["idle_items"]:
        idle_id = analysis["idle_items"][0]["id"]
        idle_action_response = client.post(
            f"/api/v1/experience/closet-analysis/idle/{idle_id}/action",
            json={"action": "resell"},
        )
        assert idle_action_response.status_code == 200
        assert idle_action_response.json()["status"] == "recorded"
        refreshed_analysis = client.get("/api/v1/experience/closet-analysis?season=summer").json()
        refreshed_idle = next(item for item in refreshed_analysis["idle_items"] if item["id"] == idle_id)
        assert refreshed_idle["selected_action"] == "resell"
        assert refreshed_idle["selected_action_label"]

    style_response = client.get("/api/v1/experience/style-profile")
    style = style_response.json()

    assert style_response.status_code == 200
    assert style["hero_subtitle"]
    assert len(style["dna"]) == 6
    assert "item_count" in style["silhouettes"][0]
    assert "wear_count" in style["silhouettes"][0]

    patch_response = client.put(
        "/api/v1/experience/style-profile",
        json={
            "favorite_colors": ["驼色", "深蓝", "米白"],
            "style_keywords": ["简约经典", "都市通勤", "柔和层次"],
            "personal_note": "测试更新后的风格备注。",
        },
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["status"] == "updated"


def test_experience_state_isolated_per_account(client):
    first_sign_up = client.post(
        "/api/v1/auth/sign-up",
        json={"email": "first-user@ai-wardrobe.dev", "password": "secret-123456"},
    )
    second_sign_up = client.post(
        "/api/v1/auth/sign-up",
        json={"email": "second-user@ai-wardrobe.dev", "password": "secret-123456"},
    )

    assert first_sign_up.status_code == 200
    assert second_sign_up.status_code == 200

    first_headers = {"Authorization": f"Bearer {first_sign_up.json()['access_token']}"}
    second_headers = {"Authorization": f"Bearer {second_sign_up.json()['access_token']}"}

    config_response = client.post(
        "/api/v1/experience/smart-wardrobe/config",
        headers=first_headers,
        json={
            "primary_service": "本地 rembg",
            "remove_bg_key": "",
            "fallback_strategy": "仅使用本地",
            "person_detector": "手动确认用户",
            "face_selector": "Face Embedding Match",
            "garment_segmenter": "本地 rembg",
            "label_model": "三级识别提取链",
            "recognition_local_model": "本地试衣模型",
            "recognition_openai_model": "gpt-4.1-mini",
            "recognition_deepseek_model": "deepseek-chat",
            "recognition_retries": 0,
            "concurrency": 1,
        },
    )
    seed_item_response = client.post(
        "/api/v1/experience/wardrobe-management/items",
        headers=first_headers,
        json={
            "name": "首尔行李箱测试上衣",
            "category": "tops",
            "slot": "top",
            "color": "米白",
            "brand": "Isolation Test",
            "image_url": None,
            "tags": ["测试"],
            "occasions": ["城市探索"],
            "style_notes": "用于验证不同账号的行李箱默认值隔离。",
        },
    )
    suitcase_response = client.post(
        "/api/v1/experience/outfit-diary/suitcase",
        headers=first_headers,
        json={
            "destination": "Seoul",
            "days_label": "3天2晚",
            "scene": "城市探索",
        },
    )

    assert config_response.status_code == 200
    assert seed_item_response.status_code == 200
    assert suitcase_response.status_code == 200

    first_smart = client.get("/api/v1/experience/smart-wardrobe", headers=first_headers).json()
    second_smart = client.get("/api/v1/experience/smart-wardrobe", headers=second_headers).json()
    first_diary = client.get("/api/v1/experience/outfit-diary?year=2026&month=4", headers=first_headers).json()
    second_diary = client.get("/api/v1/experience/outfit-diary?year=2026&month=4", headers=second_headers).json()

    assert first_smart["config"]["primary_service"] == "本地 rembg"
    assert first_smart["config"]["fallback_strategy"] == "仅使用本地"
    assert first_smart["config"]["recognition_local_model"] == "本地试衣模型"
    assert first_smart["config"]["recognition_retries"] == 0
    assert second_smart["config"]["primary_service"] == "R2 解构资产输出"
    assert second_smart["config"]["fallback_strategy"] == "本地失败后切换 OpenAI / DeepSeek"
    assert second_smart["config"]["garment_segmenter"] == "SAM 2.1 / SCHP / 本地抠图"
    assert second_smart["config"]["recognition_local_model"] == "FashionCLIP + 本地视觉解构"
    assert first_diary["suitcase_defaults"]["destination"] == "Seoul"
    assert second_diary["suitcase_defaults"]["destination"] == "东京"
