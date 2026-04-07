from __future__ import annotations

import argparse
import io
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageDraw

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.config import settings  # noqa: E402
from services import auth_service  # noqa: E402


def _step(name: str, ok: bool, detail: str) -> None:
    status = "OK" if ok else "FAIL"
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    safe_detail = detail.encode(encoding, errors="replace").decode(encoding, errors="replace")
    print(f"[{status}] {name}: {safe_detail}")


def _dump(payload: Any) -> str:
    try:
        return json.dumps(payload, ensure_ascii=False)
    except Exception:
        return str(payload)


def _api_base_url(raw: str | None) -> str:
    base = (raw or settings.backend_public_base_url or "").strip().rstrip("/")
    if not base:
        raise SystemExit("Missing API base URL. Pass --api-base-url or fill BACKEND_PUBLIC_BASE_URL.")
    if base.endswith("/api/v1"):
        return base
    return f"{base}/api/v1"


def _redirect_to(raw: str | None) -> str:
    candidate = (raw or "").strip()
    if candidate:
        return candidate
    app_base = settings.next_public_app_url.strip().rstrip("/")
    return f"{app_base}/login" if app_base else "https://www.aiwardrobes.com/login"


def _default_email() -> str:
    now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"ai_chain_{now}@mailinator.com"


def _default_password() -> str:
    stamp = datetime.utcnow().strftime("%H%M%S")
    return f"AuditPass!{stamp}"


def _confirm_user(supabase_user_id: str) -> tuple[bool, str]:
    client = auth_service._service_client()
    if client is None:
        return False, "Supabase service role client is unavailable."
    admin = client.auth.admin
    if not hasattr(admin, "update_user_by_id"):
        return False, "Supabase admin update_user_by_id is unavailable."
    try:
        admin.update_user_by_id(supabase_user_id, {"email_confirm": True})
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"
    return True, "Email confirmed through the Supabase admin client."


def _admin_create_user(email: str, password: str, display_name: str) -> tuple[bool, str]:
    client = auth_service._service_client()
    if client is None:
        return False, "Supabase service role client is unavailable."
    admin = client.auth.admin
    if not hasattr(admin, "create_user"):
        return False, "Supabase admin create_user is unavailable."
    try:
        admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": display_name},
            }
        )
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"
    return True, "User created and confirmed through the Supabase admin client."


def _make_png() -> bytes:
    canvas = Image.new("RGB", (512, 640), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((140, 120, 372, 500), radius=48, fill=(235, 179, 196))
    draw.rounded_rectangle((188, 86, 324, 154), radius=22, fill=(250, 215, 226))
    draw.rounded_rectangle((98, 168, 160, 420), radius=30, fill=(242, 193, 208))
    draw.rounded_rectangle((352, 168, 414, 420), radius=30, fill=(242, 193, 208))
    output = io.BytesIO()
    canvas.save(output, format="PNG")
    return output.getvalue()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a live production audit for remove.bg, recommendation, and try-on fallback chains.")
    parser.add_argument("--api-base-url", default="https://api.aiwardrobes.com", help="Backend base URL or /api/v1 prefix.")
    parser.add_argument("--redirect-to", default="", help="Email confirmation redirect target.")
    parser.add_argument("--email", default="", help="Smoke-test email.")
    parser.add_argument("--password", default="", help="Smoke-test password.")
    parser.add_argument("--display-name", default="AI Chain Audit", help="Display name for the smoke-test account.")
    parser.add_argument("--cleanup-items", action="store_true", help="Delete created wardrobe items at the end.")
    return parser.parse_args()


def _create_item(client: httpx.Client, headers: dict[str, str], payload: dict[str, Any]) -> dict[str, Any]:
    response = client.post("/wardrobe/items", headers=headers, json=payload)
    if response.status_code != 200:
        raise RuntimeError(f"create_item failed: {response.status_code} {response.text}")
    return response.json()


def main() -> None:
    args = _parse_args()
    api_base_url = _api_base_url(args.api_base_url)
    redirect_to = _redirect_to(args.redirect_to)
    email = args.email.strip() or _default_email()
    password = args.password.strip() or _default_password()
    display_name = args.display_name.strip() or "AI Chain Audit"
    png_bytes = _make_png()
    created_item_ids: list[int] = []
    audit_failed = False

    with httpx.Client(base_url=api_base_url, timeout=60.0) as client:
        headers: dict[str, str] = {}
        try:
            sign_up_response = client.post(
                "/auth/sign-up",
                json={
                    "email": email,
                    "password": password,
                    "display_name": display_name,
                    "redirect_to": redirect_to,
                },
            )
            if sign_up_response.status_code != 200:
                body_text = sign_up_response.text.lower()
                if "rate limit" in body_text:
                    created, detail = _admin_create_user(email, password, display_name)
                    _step("sign_up_admin_fallback", created, detail)
                    if not created:
                        raise SystemExit(1)
                    sign_up_json = {"requires_email_confirmation": False}
                else:
                    _step("sign_up", False, sign_up_response.text)
                    raise SystemExit(1)
            else:
                sign_up_json = sign_up_response.json()
                _step("sign_up", True, _dump(sign_up_json))

            if sign_up_json.get("requires_email_confirmation"):
                supabase_user_id = str((sign_up_json.get("user") or {}).get("supabase_user_id") or "")
                confirmed, detail = _confirm_user(supabase_user_id)
                _step("confirm_email", confirmed, detail)
                if not confirmed:
                    raise SystemExit(1)

            login_response = client.post("/auth/login", json={"email": email, "password": password})
            login_ok = login_response.status_code == 200
            _step("login", login_ok, _dump(login_response.json() if login_ok else login_response.text))
            if not login_ok:
                raise SystemExit(1)

            access_token = login_response.json().get("access_token") or ""
            headers = {"Authorization": f"Bearer {access_token}"}

            top_item = _create_item(
                client,
                headers,
                {
                    "name": "Audit Blush Top",
                    "category": "tops",
                    "slot": "top",
                    "color": "Pink",
                    "brand": "Audit",
                    "tags": ["soft"],
                    "occasions": ["office"],
                    "style_notes": "AI chain audit top.",
                },
            )
            created_item_ids.append(int(top_item["id"]))
            bottom_item = _create_item(
                client,
                headers,
                {
                    "name": "Audit Ivory Trouser",
                    "category": "bottoms",
                    "slot": "bottom",
                    "color": "Ivory",
                    "brand": "Audit",
                    "tags": ["clean"],
                    "occasions": ["office"],
                    "style_notes": "AI chain audit bottom.",
                },
            )
            created_item_ids.append(int(bottom_item["id"]))
            shoes_item = _create_item(
                client,
                headers,
                {
                    "name": "Audit White Sneaker",
                    "category": "shoes",
                    "slot": "shoes",
                    "color": "White",
                    "brand": "Audit",
                    "tags": ["casual"],
                    "occasions": ["travel"],
                    "style_notes": "AI chain audit shoes.",
                },
            )
            created_item_ids.append(int(shoes_item["id"]))
            _step("create_items", True, f"item_ids={created_item_ids}")

            upload_response = client.post(
                f"/wardrobe/items/{top_item['id']}/upload-image",
                headers=headers,
                files={"image": ("audit-top.png", png_bytes, "image/png")},
            )
            upload_ok = upload_response.status_code == 200
            upload_payload = upload_response.json() if upload_ok else upload_response.text
            _step("upload_top_image", upload_ok, _dump(upload_payload))
            if not upload_ok:
                raise SystemExit(1)

            process_response = client.post(f"/wardrobe/items/{top_item['id']}/process-image", headers=headers)
            process_ok = process_response.status_code == 200
            process_payload = process_response.json() if process_ok else process_response.text
            _step("process_image", process_ok, _dump(process_payload))
            if not process_ok:
                raise SystemExit(1)

            processed_item = process_response.json()
            processed_tags = processed_item.get("tags", [])
            if "cleanup-remote" in processed_tags:
                _step("remove_bg_chain", True, f"remote cleanup active, tags={processed_tags}")
            else:
                audit_failed = True
                _step("remove_bg_chain", False, f"remote cleanup not active, tags={processed_tags}")

            style_profile_response = client.get("/assistant/style-profile", headers=headers)
            style_profile_ok = style_profile_response.status_code == 200
            _step("style_profile_probe", style_profile_ok, _dump(style_profile_response.json() if style_profile_ok else style_profile_response.text))

            wear_log_response = client.get("/assistant/wear-log", headers=headers)
            wear_log_ok = wear_log_response.status_code == 200
            _step("wear_log_probe", wear_log_ok, _dump(wear_log_response.json() if wear_log_ok else wear_log_response.text))

            recommend_response = client.post(
                "/outfits/recommend",
                headers=headers,
                json={
                    "prompt": "Tomorrow office commute, soft but polished.",
                    "scene": "audit",
                    "style": "gentle-practical",
                },
            )
            recommend_ok = recommend_response.status_code == 200
            recommend_payload = recommend_response.json() if recommend_ok else recommend_response.text
            _step("recommend", recommend_ok, _dump(recommend_payload))
            if recommend_ok:
                recommendation = recommend_response.json()
                recommendation_source = recommendation.get("source")
                trace = recommendation.get("agent_trace", [])
                first_trace = trace[0] if trace else {}
                if recommendation_source == "fallback-worker-model":
                    _step("recommendation_fallback", True, f"secondary worker handled the request: {first_trace}")
                elif recommendation_source == "remote-fallback-local-model":
                    audit_failed = True
                    _step("recommendation_fallback", False, f"secondary worker did not catch the failure, final local fallback was used: {first_trace}")
                else:
                    _step(
                        "recommendation_fallback",
                        True,
                        f"primary chain responded normally with source={recommendation_source}; fallback path was not triggered in this live run.",
                    )
            else:
                audit_failed = True
                _step("recommendation_fallback", False, "Recommendation endpoint returned 500, so the fallback chain could not be verified online.")

            tryon_response = client.post(
                "/try-on/render",
                headers=headers,
                json={
                    "item_ids": [top_item["id"]],
                    "prompt": "Fallback audit",
                    "scene": "audit",
                },
            )
            tryon_ok = tryon_response.status_code == 200
            tryon_payload = tryon_response.json() if tryon_ok else tryon_response.text
            _step("try_on_fallback_probe", tryon_ok, _dump(tryon_payload))
            if tryon_ok:
                tryon = tryon_response.json()
                provider_mode = str(tryon.get("provider_mode") or "")
                provider = str(tryon.get("provider") or "")
                if provider_mode == "remote-fallback-worker":
                    _step("try_on_fallback", True, f"cloud API failed over to worker provider={provider}")
                elif provider_mode == "remote-fallback-local":
                    audit_failed = True
                    _step("try_on_fallback", False, f"cloud API fell straight to local composite, worker fallback is not active. provider={provider}")
                elif provider_mode in {"remote-fallback-worker-fallback-local", "local-worker-fallback-local"}:
                    audit_failed = True
                    _step("try_on_fallback", False, f"worker fallback path exists but degraded to local composite. provider_mode={provider_mode} provider={provider}")
                else:
                    _step("try_on_fallback", True, f"unexpected but non-failing mode={provider_mode}, provider={provider}")
            else:
                audit_failed = True
                _step("try_on_fallback", False, f"Try-on endpoint returned {tryon_response.status_code}, so the fallback chain could not be verified online.")
        finally:
            if args.cleanup_items and headers:
                for item_id in created_item_ids:
                    delete_response = client.delete(f"/wardrobe/items/{item_id}", headers=headers)
                    _step(
                        f"cleanup_item_{item_id}",
                        delete_response.status_code == 200,
                        _dump(delete_response.json() if delete_response.headers.get("content-type", "").startswith("application/json") else delete_response.text),
                    )

    if audit_failed:
        print("AI_CHAIN_AUDIT: FAIL")
        raise SystemExit(1)

    print("AI_CHAIN_AUDIT: PASS")


if __name__ == "__main__":
    main()
