from __future__ import annotations

from datetime import datetime
from io import BytesIO
import json
from typing import Any
from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient
import httpx
from PIL import Image

from app.main import app
from core.config import settings
from services import auth_service


def _print_step(name: str, ok: bool, detail: str) -> None:
    status = "OK" if ok else "FAIL"
    print(f"[{status}] {name}: {detail}")


def _make_png() -> bytes:
    canvas = Image.new("RGB", (96, 128), (244, 214, 221))
    accent = Image.new("RGB", (44, 44), (121, 172, 196))
    canvas.paste(accent, (26, 36))
    output = BytesIO()
    canvas.save(output, format="PNG")
    return output.getvalue()


def _json_detail(payload: Any) -> str:
    try:
        return json.dumps(payload, ensure_ascii=False)
    except Exception:
        return str(payload)


def _admin_confirm_email(user_id: str) -> tuple[bool, str]:
    client = auth_service._service_client()
    if client is None:
        return False, "service role client unavailable"

    admin = client.auth.admin
    if not hasattr(admin, "update_user_by_id"):
        return False, "admin update_user_by_id not available"

    try:
        admin.update_user_by_id(user_id, {"email_confirm": True})
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"
    return True, "email confirmed through admin client"


def _admin_create_user(email: str, password: str, display_name: str) -> tuple[bool, str]:
    client = auth_service._service_client()
    if client is None:
        return False, "service role client unavailable"

    admin = client.auth.admin
    if not hasattr(admin, "create_user"):
        return False, "admin create_user not available"

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
    return True, "user created through admin client"


def _admin_generate_recovery_access_token(email: str) -> tuple[str | None, str]:
    client = auth_service._service_client()
    if client is None:
        return None, "service role client unavailable"

    admin = client.auth.admin
    if not hasattr(admin, "generate_link"):
        return None, "admin generate_link not available"

    try:
        response = admin.generate_link(
            {
                "type": "recovery",
                "email": email,
                "options": {"redirect_to": f"{settings.next_public_app_url.rstrip('/')}/reset-password"},
            }
        )
    except Exception as exc:
        return None, f"{type(exc).__name__}: {exc}"

    payload = response.model_dump() if hasattr(response, "model_dump") else response
    properties = payload.get("properties", {}) if isinstance(payload, dict) else {}
    action_link = properties.get("action_link") or payload.get("action_link") if isinstance(payload, dict) else None
    if not action_link:
        return None, f"generate_link returned without action_link: {_json_detail(payload)}"

    query = parse_qs(urlsplit(action_link).fragment or urlsplit(action_link).query)
    access_token = (query.get("access_token") or [None])[0]
    if access_token:
        return access_token, "recovery access token generated directly"

    try:
        response = httpx.get(action_link, follow_redirects=False, timeout=15.0)
        redirected_to = response.headers.get("location") or ""
        redirected_query = parse_qs(urlsplit(redirected_to).fragment or urlsplit(redirected_to).query)
        redirected_access_token = (redirected_query.get("access_token") or [None])[0]
        if redirected_access_token:
            return redirected_access_token, "recovery access token generated from verify redirect"
    except Exception as exc:
        return None, f"verify redirect fetch failed: {type(exc).__name__}: {exc}"

    return None, f"recovery link returned without access_token: {_json_detail(payload)}"


def main() -> None:
    now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    email = f"smoke_{now}@mailinator.com"
    password = f"SmokePass!{now[-6:]}"
    new_password = f"ResetPass!{now[-6:]}"
    display_name = f"smoke-{now}"
    png_bytes = _make_png()
    created_item_id: int | None = None

    required_failures = 0

    with TestClient(app) as client:
        sign_up_response = client.post(
            "/api/v1/auth/sign-up",
            json={
                "email": email,
                "password": password,
                "display_name": display_name,
            },
        )
        sign_up_ok = sign_up_response.status_code == 200
        sign_up_payload = sign_up_response.json() if sign_up_response.headers.get("content-type", "").startswith("application/json") else sign_up_response.text
        _print_step("sign_up", sign_up_ok, _json_detail(sign_up_payload))
        if not sign_up_ok:
            body_text = sign_up_response.text.lower()
            if "rate limit" in body_text:
                created_via_admin, detail = _admin_create_user(email, password, display_name)
                _print_step("admin_create_user_after_rate_limit", created_via_admin, detail)
                if not created_via_admin:
                    required_failures += 1
                    print(f"SMOKE_RESULT: FAIL ({required_failures} required step(s) failed)")
                    raise SystemExit(1)
                sign_up_json = {}
                access_token = None
            else:
                required_failures += 1
                print(f"SMOKE_RESULT: FAIL ({required_failures} required step(s) failed)")
                raise SystemExit(1)
        else:
            sign_up_json = sign_up_response.json()
            access_token = sign_up_json.get("access_token")

            if not access_token and sign_up_json.get("requires_email_confirmation"):
                user_id = (sign_up_json.get("user") or {}).get("supabase_user_id")
                confirmed, detail = _admin_confirm_email(user_id) if user_id else (False, "sign_up response did not include supabase user id")
                _print_step("admin_confirm_email", confirmed, detail)

        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": email,
                "password": password,
            },
        )
        login_ok = login_response.status_code == 200
        login_payload = login_response.json() if login_ok else login_response.text
        _print_step("login", login_ok, _json_detail(login_payload))
        if not login_ok:
            required_failures += 1
            print(f"SMOKE_RESULT: FAIL ({required_failures} required step(s) failed)")
            raise SystemExit(1)

        login_json = login_response.json()
        access_token = login_json.get("access_token")
        headers = {"Authorization": f"Bearer {access_token}"}

        me_response = client.get("/api/v1/auth/me", headers=headers)
        me_ok = me_response.status_code == 200
        _print_step("auth_me", me_ok, _json_detail(me_response.json() if me_ok else me_response.text))
        if not me_ok:
            required_failures += 1

        create_item_response = client.post(
            "/api/v1/wardrobe/items",
            headers=headers,
            json={
                "name": f"Smoke Shirt {now[-4:]}",
                "category": "tops",
                "slot": "top",
                "color": "Ivory",
                "brand": "SmokeTest",
                "tags": [],
                "occasions": [],
                "style_notes": "Smoke validation item",
            },
        )
        create_item_ok = create_item_response.status_code == 200
        create_item_payload = create_item_response.json() if create_item_ok else create_item_response.text
        _print_step("wardrobe_create_item", create_item_ok, _json_detail(create_item_payload))
        if not create_item_ok:
            required_failures += 1
            print(f"SMOKE_RESULT: FAIL ({required_failures} required step(s) failed)")
            raise SystemExit(1)

        created_item = create_item_response.json()
        created_item_id = created_item["id"]

        upload_response = client.post(
            f"/api/v1/wardrobe/items/{created_item_id}/upload-image",
            headers=headers,
            files={"image": ("smoke-shirt.png", png_bytes, "image/png")},
        )
        upload_ok = upload_response.status_code == 200
        upload_payload = upload_response.json() if upload_ok else upload_response.text
        _print_step("wardrobe_upload_image", upload_ok, _json_detail(upload_payload))
        if not upload_ok:
            required_failures += 1
            print(f"SMOKE_RESULT: FAIL ({required_failures} required step(s) failed)")
            raise SystemExit(1)

        process_response = client.post(
            f"/api/v1/wardrobe/items/{created_item_id}/process-image",
            headers=headers,
        )
        process_ok = process_response.status_code == 200
        process_payload = process_response.json() if process_ok else process_response.text
        _print_step("wardrobe_process_image", process_ok, _json_detail(process_payload))
        if not process_ok:
            required_failures += 1
            print(f"SMOKE_RESULT: FAIL ({required_failures} required step(s) failed)")
            raise SystemExit(1)

        process_item = process_response.json()
        cleanup_tags = [tag for tag in process_item.get("tags", []) if str(tag).startswith("cleanup-")]
        cleanup_mode_ok = bool(process_item.get("processed_image_url")) and bool(cleanup_tags)
        _print_step(
            "wardrobe_cleanup_result",
            cleanup_mode_ok,
            f"processed_image_url={'yes' if process_item.get('processed_image_url') else 'no'}, cleanup_tags={cleanup_tags}",
        )
        if not cleanup_mode_ok:
            required_failures += 1

        enrich_response = client.post(
            f"/api/v1/wardrobe/items/{created_item_id}/auto-enrich",
            headers=headers,
        )
        enrich_ok = enrich_response.status_code == 200
        enrich_payload = enrich_response.json() if enrich_ok else enrich_response.text
        _print_step("wardrobe_auto_enrich", enrich_ok, _json_detail(enrich_payload))
        if not enrich_ok:
            required_failures += 1
        else:
            enrich_item = enrich_response.json()
            enrich_quality_ok = bool(enrich_item.get("tags")) or bool(enrich_item.get("occasions")) or bool(enrich_item.get("style_notes"))
            _print_step(
                "wardrobe_enrich_result",
                enrich_quality_ok,
                f"tags={enrich_item.get('tags', [])}, occasions={enrich_item.get('occasions', [])}, style_notes={'yes' if enrich_item.get('style_notes') else 'no'}",
            )
            if not enrich_quality_ok:
                required_failures += 1

        password_reset_response = client.post(
            "/api/v1/auth/password-reset",
            json={"email": email},
        )
        password_reset_ok = password_reset_response.status_code == 200
        password_reset_payload = password_reset_response.json() if password_reset_ok else password_reset_response.text
        _print_step("password_reset_request", password_reset_ok, _json_detail(password_reset_payload))
        if not password_reset_ok:
            required_failures += 1
        else:
            recovery_access_token, recovery_detail = _admin_generate_recovery_access_token(email)
            _print_step("password_reset_admin_recovery", recovery_access_token is not None, recovery_detail)
            if recovery_access_token:
                confirm_response = client.post(
                    "/api/v1/auth/password-reset/confirm",
                    json={"access_token": recovery_access_token, "new_password": new_password},
                )
                confirm_ok = confirm_response.status_code == 200
                _print_step("password_reset_confirm", confirm_ok, _json_detail(confirm_response.json() if confirm_ok else confirm_response.text))
                if confirm_ok:
                    relogin_response = client.post(
                        "/api/v1/auth/login",
                        json={"email": email, "password": new_password},
                    )
                    relogin_ok = relogin_response.status_code == 200
                    _print_step("login_after_reset", relogin_ok, _json_detail(relogin_response.json() if relogin_ok else relogin_response.text))
                    if not relogin_ok:
                        required_failures += 1
                    else:
                        access_token = relogin_response.json().get("access_token")
                        headers = {"Authorization": f"Bearer {access_token}"}
                else:
                    required_failures += 1
            else:
                _print_step("password_reset_confirm", False, "could not obtain recovery access token programmatically")
                required_failures += 1

        if created_item_id is not None and access_token:
            delete_response = client.delete(f"/api/v1/wardrobe/items/{created_item_id}", headers=headers)
            _print_step("wardrobe_delete_item", delete_response.status_code == 200, _json_detail(delete_response.json() if delete_response.headers.get("content-type", "").startswith("application/json") else delete_response.text))

    if required_failures:
        print(f"SMOKE_RESULT: FAIL ({required_failures} required step(s) failed)")
        raise SystemExit(1)

    print("SMOKE_RESULT: PASS")


if __name__ == "__main__":
    main()
