import io

from services import assistant_service, weather_service


def _seed_closet(client):
    payloads = [
        {
            "name": "Warm Ivory Shirt",
            "category": "tops",
            "slot": "top",
            "color": "Ivory",
            "brand": "Studio Calm",
            "image_url": None,
            "processed_image_url": None,
            "tags": ["soft"],
            "occasions": ["office"],
            "style_notes": "Works for weekday polish.",
        },
        {
            "name": "Navy Easy Trouser",
            "category": "bottoms",
            "slot": "bottom",
            "color": "Navy",
            "brand": "Studio Calm",
            "image_url": None,
            "processed_image_url": None,
            "tags": ["minimal"],
            "occasions": ["office"],
            "style_notes": "Dependable anchor piece.",
        },
        {
            "name": "White Breeze Sneaker",
            "category": "shoes",
            "slot": "shoes",
            "color": "White",
            "brand": "Studio Calm",
            "image_url": None,
            "processed_image_url": None,
            "tags": ["casual"],
            "occasions": ["coffee"],
            "style_notes": "Easy repeat sneaker.",
        },
    ]

    created = []
    for payload in payloads:
        response = client.post("/api/v1/wardrobe/items", json=payload)
        assert response.status_code == 200
        created.append(response.json())

    return created


def test_assistant_overview_and_tomorrow_flow(client, monkeypatch):
    _seed_closet(client)

    monkeypatch.setattr(
        weather_service,
        "search_locations",
        lambda query: [
            weather_service.LocationResult(
                name="Shanghai",
                country="China",
                admin1="Shanghai",
                latitude=31.23,
                longitude=121.47,
                timezone="Asia/Shanghai",
            )
        ],
    )
    monkeypatch.setattr(
        weather_service,
        "fetch_daily_forecast",
        lambda **kwargs: weather_service.DailyForecast(
            location_name=kwargs["location_name"],
            timezone="Asia/Shanghai",
            date="2026-04-01",
            weather_code=2,
            condition_label="Partly cloudy",
            temperature_max=25,
            temperature_min=16,
            precipitation_probability_max=18,
        ),
    )

    overview_response = client.get("/api/v1/assistant/overview")
    overview = overview_response.json()

    assert overview_response.status_code == 200
    assert overview["style_profile"]["user_id"] is not None
    assert overview["tomorrow"]["weather"]["location_name"]
    assert "summary" in overview["gaps"]

    tomorrow_response = client.post(
        "/api/v1/assistant/tomorrow",
        json={
            "location_query": "Shanghai",
            "schedule": "明天正常上班，晚上和朋友吃饭",
            "has_commute": True,
        },
    )
    tomorrow = tomorrow_response.json()

    assert tomorrow_response.status_code == 200
    assert tomorrow["weather"]["condition_label"] == "Partly cloudy"
    assert tomorrow["morning"]["recommendation"]["outfits"][0]["confidence"] is not None
    assert tomorrow["evening"]["recommendation"]["profile_summary"]


def test_assistant_feedback_save_wear_and_packing(client, monkeypatch):
    items = _seed_closet(client)

    monkeypatch.setattr(
        weather_service,
        "search_locations",
        lambda query: [
            weather_service.LocationResult(
                name="Tokyo",
                country="Japan",
                admin1="Tokyo",
                latitude=35.68,
                longitude=139.69,
                timezone="Asia/Tokyo",
            )
        ],
    )
    monkeypatch.setattr(
        weather_service,
        "fetch_daily_forecast",
        lambda **kwargs: weather_service.DailyForecast(
            location_name=kwargs["location_name"],
            timezone="Asia/Tokyo",
            date="2026-04-01",
            weather_code=61,
            condition_label="Light rain",
            temperature_max=19,
            temperature_min=11,
            precipitation_probability_max=55,
        ),
    )

    feedback_response = client.post(
        "/api/v1/assistant/feedback",
        json={
            "prompt": "Need a low-thought office look",
            "scene": "assistant-test",
            "action": "liked",
            "item_ids": [items[0]["id"], items[1]["id"]],
            "feedback_note": "This feels like me.",
            "metadata_json": {"channel": "test"},
        },
    )
    assert feedback_response.status_code == 200

    save_response = client.post(
        "/api/v1/assistant/outfits",
        json={
            "name": "Rainy city set",
            "occasion": "travel",
            "style": "soft-functional",
            "item_ids": [items[0]["id"], items[1]["id"], items[2]["id"]],
            "reasoning": "Packed for repeat-friendly travel days.",
        },
    )
    saved = save_response.json()
    assert save_response.status_code == 200
    assert saved["name"] == "Rainy city set"

    wear_response = client.post(
        "/api/v1/assistant/wear-log",
        json={
            "outfit_id": saved["id"],
            "outfit_name": saved["name"],
            "item_ids": saved["item_ids"],
            "occasion": "travel",
            "period": "all-day",
            "location_label": "Tokyo",
            "feedback_note": "Stayed comfortable all day.",
        },
    )
    assert wear_response.status_code == 200

    packing_response = client.post(
        "/api/v1/assistant/packing",
        json={
            "city": "Tokyo",
            "days": 4,
            "trip_kind": "city break",
            "include_commute": False,
        },
    )
    packing = packing_response.json()

    assert packing_response.status_code == 200
    assert packing["city"] == "Tokyo"
    assert len(packing["suggestions"]) >= 3

    outfits_response = client.get("/api/v1/assistant/outfits")
    wear_logs_response = client.get("/api/v1/assistant/wear-log")
    wear_logs = wear_logs_response.json()

    assert outfits_response.status_code == 200
    assert wear_logs_response.status_code == 200
    assert outfits_response.json()[0]["name"] == "Rainy city set"
    assert any(entry["outfit_name"] == "Rainy city set" for entry in wear_logs)


def test_recommendation_survives_assistant_sidecar_failures(client, monkeypatch):
    _seed_closet(client)

    monkeypatch.setattr(
        assistant_service,
        "attach_memory_cards",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("memory card table missing")),
    )
    monkeypatch.setattr(
        assistant_service,
        "_load_recent_signals",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("recommendation signal table missing")),
    )
    monkeypatch.setattr(
        assistant_service,
        "_build_reminder_response",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("reminder sidecar missing")),
    )

    response = client.post(
        "/api/v1/outfits/recommend",
        json={
            "prompt": "Tomorrow office commute, soft but polished.",
            "scene": "fallback-test",
            "style": "gentle-practical",
        },
    )
    payload = response.json()

    assert response.status_code == 200
    assert payload["outfits"]
    assert payload["profile_summary"]
    assert payload["reminder_flags"] == []


def test_assistant_overview_survives_style_profile_sidecar_failure(client, monkeypatch):
    _seed_closet(client)

    monkeypatch.setattr(
        assistant_service,
        "_ensure_style_profile",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("style profile table missing")),
    )
    monkeypatch.setattr(
        assistant_service,
        "_build_reminder_response",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("reminder sidecar missing")),
    )
    monkeypatch.setattr(
        weather_service,
        "search_locations",
        lambda query: [
            weather_service.LocationResult(
                name="Shanghai",
                country="China",
                admin1="Shanghai",
                latitude=31.23,
                longitude=121.47,
                timezone="Asia/Shanghai",
            )
        ],
    )
    monkeypatch.setattr(
        weather_service,
        "fetch_daily_forecast",
        lambda **kwargs: weather_service.DailyForecast(
            location_name=kwargs["location_name"],
            timezone="Asia/Shanghai",
            date="2026-04-01",
            weather_code=2,
            condition_label="Partly cloudy",
            temperature_max=25,
            temperature_min=16,
            precipitation_probability_max=18,
        ),
    )

    overview_response = client.get("/api/v1/assistant/overview")
    overview = overview_response.json()

    assert overview_response.status_code == 200
    assert overview["style_profile"]["user_id"] is not None
    assert overview["reminders"]["repeat_warning"] == []


def test_memory_card_and_async_cleanup_task(client):
    create_response = client.post(
        "/api/v1/wardrobe/items",
        json={
            "name": "Cream Wrap Coat",
            "category": "outerwear",
            "slot": "outerwear",
            "color": "Cream",
            "brand": "Soft Layer",
            "image_url": None,
            "processed_image_url": None,
            "tags": [],
            "occasions": [],
            "style_notes": "Hero coat for cooler days.",
        },
    )
    created = create_response.json()

    memory_response = client.get(f"/api/v1/assistant/items/{created['id']}/memory-card")
    memory_payload = memory_response.json()

    assert memory_response.status_code == 200
    assert memory_payload["card"]["highlights"]

    update_memory_response = client.put(
        f"/api/v1/assistant/items/{created['id']}/memory-card",
        json={
            "highlights": ["显气色", "适合拍照"],
            "avoid_contexts": ["下雨别穿"],
            "care_status": "needs-laundry",
            "care_note": "拍完照记得送洗。",
            "season_tags": ["spring", "autumn"],
        },
    )
    assert update_memory_response.status_code == 200
    assert update_memory_response.json()["card"]["care_status"] == "needs-laundry"

    upload_response = client.post(
        f"/api/v1/wardrobe/items/{created['id']}/upload-image",
        files={"image": ("coat.png", io.BytesIO(b"fake-image-content"), "image/png")},
    )
    assert upload_response.status_code == 200

    task_response = client.post(f"/api/v1/wardrobe/items/{created['id']}/process-image-async")
    task = task_response.json()

    assert task_response.status_code == 200
    assert task["task_type"] == "image-cleanup"

    task_status_response = client.get(f"/api/v1/assistant/tasks/{task['id']}")
    task_status = task_status_response.json()
    item_response = client.get(f"/api/v1/wardrobe/items/{created['id']}")
    item_payload = item_response.json()

    assert task_status_response.status_code == 200
    assert task_status["status"] == "completed"
    assert item_response.status_code == 200
    assert item_payload["processed_image_url"]
    assert item_payload["memory_card"]["care_status"] == "needs-laundry"
