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

    delete_response = client.delete(f"/api/v1/experience/wardrobe-management/items/{created['id']}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"


def test_experience_smart_diary_analysis_and_style_flow(client):
    smart_response = client.get("/api/v1/experience/smart-wardrobe")
    smart = smart_response.json()

    assert smart_response.status_code == 200
    assert smart["stats"]["total"] >= 1
    first_processing_item = smart["processing_items"][0]

    config_response = client.post(
        "/api/v1/experience/smart-wardrobe/config",
        json={
            "primary_service": "Remove.bg API",
            "remove_bg_key": "rm_demo_key",
            "fallback_strategy": "自动切换本地 rembg",
            "label_model": "GPT-4o Vision",
            "concurrency": 2,
        },
    )
    assert config_response.status_code == 200
    assert config_response.json()["status"] == "saved"

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

    retry_response = client.post(f"/api/v1/experience/smart-wardrobe/items/{first_processing_item['id']}/retry")
    assert retry_response.status_code == 200
    assert retry_response.json()["status"] == "completed"

    confirm_response = client.post(f"/api/v1/experience/smart-wardrobe/items/{first_processing_item['id']}/confirm")
    assert confirm_response.status_code == 200
    assert confirm_response.json()["status"] == "saved"

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

    refreshed_diary_response = client.get("/api/v1/experience/outfit-diary?year=2026&month=4")
    refreshed_diary = refreshed_diary_response.json()
    assert refreshed_diary_response.status_code == 200
    assert refreshed_diary["calendar"]["details"]["11"]["items"]
    assert refreshed_diary["suitcase_defaults"]["destination"] == "东京"
    assert refreshed_diary["suitcase_defaults"]["days_label"] == "5天4晚"
    assert refreshed_diary["suitcase_defaults"]["scene"] == "城市探索"

    analysis_response = client.get("/api/v1/experience/closet-analysis")
    analysis = analysis_response.json()

    assert analysis_response.status_code == 200
    assert "gap_score" in analysis

    if analysis["care"]["urgent"]:
        care_id = analysis["care"]["urgent"][0]["id"]
        mark_done_response = client.post(f"/api/v1/experience/closet-analysis/care/{care_id}/mark-done")
        assert mark_done_response.status_code == 200
        assert mark_done_response.json()["status"] == "completed"

    if analysis["idle_items"]:
        idle_id = analysis["idle_items"][0]["id"]
        idle_action_response = client.post(
            f"/api/v1/experience/closet-analysis/idle/{idle_id}/action",
            json={"action": "resell"},
        )
        assert idle_action_response.status_code == 200
        assert idle_action_response.json()["status"] == "recorded"

    style_response = client.get("/api/v1/experience/style-profile")
    style = style_response.json()

    assert style_response.status_code == 200
    assert style["hero_subtitle"]

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
