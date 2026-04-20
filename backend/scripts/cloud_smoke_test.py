from __future__ import annotations

import json
import sys
import time
from datetime import datetime
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image
from supabase import create_client

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.wardrobe import ClothingItem
from app.schemas.recommendation import RecommendationRequest
from core.config import settings
from services import email_service, r2_storage_service
from services import recommendation_service


def _now_stamp() -> str:
    return datetime.utcnow().strftime("%Y%m%d%H%M%S")


def _avatar_bytes() -> bytes:
    return (REPO_ROOT / "frontend" / "public" / "avatar.jpg").read_bytes()


def _garment_crop_bytes() -> bytes:
    source = REPO_ROOT / "frontend" / "public" / "avatar.jpg"
    with Image.open(source) as image:
        width, height = image.size
        crop = image.crop(
            (
                int(width * 0.24),
                int(height * 0.18),
                int(width * 0.78),
                int(height * 0.92),
            )
        )
        output = BytesIO()
        crop.save(output, format="PNG")
        return output.getvalue()


def _smoke_items() -> list[ClothingItem]:
    return [
        ClothingItem(
            id=101,
            user_id=None,
            name="Cream Office Blouse",
            category="top",
            slot="top",
            color="cream",
            brand=None,
            image_url=None,
            processed_image_url=None,
            tags=["office", "soft-formal", "minimal"],
            occasions=["office", "meeting"],
            style_notes="Soft office blouse",
        ),
        ClothingItem(
            id=102,
            user_id=None,
            name="Charcoal Trousers",
            category="bottom",
            slot="bottom",
            color="charcoal",
            brand=None,
            image_url=None,
            processed_image_url=None,
            tags=["office", "structured"],
            occasions=["office"],
            style_notes="Tailored trousers",
        ),
        ClothingItem(
            id=103,
            user_id=None,
            name="Light Blazer",
            category="outerwear",
            slot="outerwear",
            color="beige",
            brand=None,
            image_url=None,
            processed_image_url=None,
            tags=["office", "soft-formal", "elegant"],
            occasions=["office", "commute"],
            style_notes="Light layering blazer",
        ),
        ClothingItem(
            id=104,
            user_id=None,
            name="Low Heels",
            category="shoes",
            slot="shoes",
            color="ivory",
            brand=None,
            image_url=None,
            processed_image_url=None,
            tags=["office", "elegant"],
            occasions=["office", "date"],
            style_notes="Comfortable low heels",
        ),
    ]


def run_smtp_smoke() -> dict:
    target = settings.smtp_from_email.strip()
    email_service.send_email(
        to_email=target,
        subject=f"[AI Wardrobe Smoke] SMTP {_now_stamp()}",
        text_body="SMTP smoke test from AI Wardrobe backend.",
        html_body="<p>SMTP smoke test from <strong>AI Wardrobe</strong> backend.</p>",
    )
    return {"ok": True, "to": target}


def run_supabase_smoke() -> dict:
    temp_email = f"cloud-smoke-{_now_stamp()}@example.com"
    temp_password = f"Cloud!{_now_stamp()[-6:]}"
    service_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    anon_client = create_client(settings.supabase_url, settings.supabase_anon_key)
    created_user_id: str | None = None

    try:
        created = service_client.auth.admin.create_user(
            {"email": temp_email, "password": temp_password, "email_confirm": True}
        )
        if created.user is None:
            raise RuntimeError("Supabase admin.create_user did not return a user.")
        created_user_id = created.user.id
        signed_in = anon_client.auth.sign_in_with_password(
            {"email": temp_email, "password": temp_password}
        )
        if signed_in.session is None or signed_in.user is None:
            raise RuntimeError("Supabase sign_in_with_password did not return a live session.")
        return {"ok": True, "email": temp_email, "user_id": created_user_id}
    finally:
        if created_user_id:
            service_client.auth.admin.delete_user(created_user_id)


def run_r2_smoke() -> dict:
    stamp = _now_stamp()
    person_path = f"smoke-tests/{stamp}/person.jpg"
    garment_path = f"smoke-tests/{stamp}/garment.png"
    person_url = r2_storage_service.upload_bytes(person_path, _avatar_bytes(), "image/jpeg")
    if not person_url:
        raise RuntimeError("R2 person image upload failed.")
    garment_url = r2_storage_service.upload_bytes(garment_path, _garment_crop_bytes(), "image/png")
    if not garment_url:
        raise RuntimeError("R2 garment image upload failed.")

    person_loaded = r2_storage_service.load_bytes(person_path)
    garment_loaded = r2_storage_service.load_bytes(garment_path)
    if person_loaded is None or garment_loaded is None:
        raise RuntimeError("R2 uploaded assets could not be loaded back.")

    return {
        "ok": True,
        "person_url": person_url,
        "garment_url": garment_url,
        "person_exists": r2_storage_service.object_exists_for_path(person_path),
        "garment_exists": r2_storage_service.object_exists_for_path(garment_path),
        "cleanup_paths": [person_path, garment_path],
    }


def run_deepseek_direct_smoke() -> dict:
    response = httpx.post(
        f"{settings.deepseek_base_url.rstrip('/')}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.deepseek_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.deepseek_multimodal_model.strip() or "deepseek-chat",
            "temperature": 0,
            "max_tokens": 32,
            "messages": [
                {"role": "system", "content": "Reply in one short sentence only."},
                {"role": "user", "content": "Say: deepseek smoke ok"},
            ],
        },
        timeout=30.0,
    )
    response.raise_for_status()
    payload = response.json()
    content = (
        payload.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    if not str(content).strip():
        raise RuntimeError("DeepSeek chat/completions returned an empty message.")
    return {"ok": True, "content_preview": str(content).strip()[:120]}


def run_recommender_wrapper_smoke() -> dict:
    result = recommendation_service.generate_recommendations(
        RecommendationRequest(
            prompt="Build a gentle office outfit for tomorrow morning.",
            weather="Overcast 16-22C",
            scene="cloud-smoke-test",
            style="soft-formal",
        ),
        _smoke_items(),
    )
    return {
        "ok": True,
        "source": result.source,
        "outfit_count": len(result.outfits),
        "uses_remote_result": result.source not in {"local-model", "remote-fallback-local-model"},
    }


def _render_replicate_input(person_url: str, garment_url: str) -> dict:
    template = json.loads(settings.virtual_tryon_replicate_input_template)
    rendered = {}
    for key, value in template.items():
        if not isinstance(value, str):
            rendered[key] = value
            continue
        rendered[key] = (
            value.replace("{{person_image_url}}", person_url)
            .replace("{{primary_garment_url}}", garment_url)
            .replace("{{prompt_or_scene}}", "soft pink dress smoke test")
        )
    return rendered


def run_replicate_smoke(person_url: str, garment_url: str) -> dict:
    headers = {
        "Authorization": f"Bearer {settings.virtual_tryon_api_key}",
        "Content-Type": "application/json",
        "Prefer": "wait",
    }
    response = httpx.post(
        settings.virtual_tryon_api_url,
        headers=headers,
        json={
            "version": settings.virtual_tryon_replicate_version,
            "input": _render_replicate_input(person_url, garment_url),
        },
        timeout=60.0,
    )
    response.raise_for_status()
    prediction = response.json()
    prediction_id = prediction.get("id")
    status = prediction.get("status")
    poll_url = prediction.get("urls", {}).get("get")

    started_at = time.time()
    while status in {"starting", "processing"} and poll_url and time.time() - started_at < 180:
        time.sleep(settings.virtual_tryon_poll_interval_seconds)
        poll_response = httpx.get(
            poll_url,
            headers={"Authorization": f"Bearer {settings.virtual_tryon_api_key}"},
            timeout=30.0,
        )
        poll_response.raise_for_status()
        prediction = poll_response.json()
        status = prediction.get("status")

    if status != "succeeded":
        raise RuntimeError(f"Replicate prediction ended with status={status}, error={prediction.get('error')}")

    output = prediction.get("output")
    output_url = output[0] if isinstance(output, list) and output else output
    if not output_url:
        raise RuntimeError("Replicate prediction succeeded but did not return an output URL.")
    return {"ok": True, "prediction_id": prediction_id, "output_url": output_url}


def main() -> int:
    summary: dict[str, dict] = {}
    failures: list[str] = []
    cleanup_paths: list[str] = []

    checks = [
        ("smtp", run_smtp_smoke),
        ("supabase", run_supabase_smoke),
        ("deepseek_direct", run_deepseek_direct_smoke),
        ("recommender_wrapper", run_recommender_wrapper_smoke),
    ]

    r2_result: dict | None = None

    for name, runner in checks:
        try:
            summary[name] = runner()
        except Exception as exc:
            summary[name] = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
            failures.append(name)

    try:
        r2_result = run_r2_smoke()
        summary["r2"] = {key: value for key, value in r2_result.items() if key != "cleanup_paths"}
        cleanup_paths.extend(r2_result.get("cleanup_paths", []))
    except Exception as exc:
        summary["r2"] = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
        failures.append("r2")

    if r2_result and r2_result.get("person_url") and r2_result.get("garment_url"):
        try:
            summary["replicate_tryon"] = run_replicate_smoke(
                r2_result["person_url"],
                r2_result["garment_url"],
            )
        except Exception as exc:
            summary["replicate_tryon"] = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
            failures.append("replicate_tryon")

    for asset_path in cleanup_paths:
        r2_storage_service.delete_asset_path(asset_path)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
