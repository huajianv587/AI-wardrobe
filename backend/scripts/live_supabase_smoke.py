from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.config import settings  # noqa: E402
from services import auth_service, supabase_service  # noqa: E402


def _step(name: str, ok: bool, detail: str) -> None:
    status = "OK" if ok else "FAIL"
    print(f"[{status}] {name}: {detail}")


def _json(payload: Any) -> str:
    try:
        return json.dumps(payload, ensure_ascii=False)
    except Exception:
        return str(payload)


def _api_base_url(raw: str | None) -> str:
    base = (raw or settings.backend_public_base_url or "").strip().rstrip("/")
    if not base:
        raise SystemExit("Missing API base URL. Fill BACKEND_PUBLIC_BASE_URL or pass --api-base-url.")
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
    return f"live_smoke_{now}@mailinator.com"


def _default_password() -> str:
    stamp = datetime.utcnow().strftime("%H%M%S")
    return f"SmokePass!{stamp}"


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


def _verify_synced_row(item_id: int, owner_supabase_user_id: str | None) -> tuple[bool, str]:
    client = supabase_service.get_client()
    if client is None:
        return False, "Supabase metadata client is unavailable."
    try:
        response = (
            client.table(settings.supabase_sync_table)
            .select("id, owner_supabase_user_id, owner_email, name, synced_at")
            .eq("id", item_id)
            .execute()
        )
    except Exception as exc:
        return False, f"{type(exc).__name__}: {exc}"

    rows = getattr(response, "data", None) or []
    if not rows:
        return False, f"No row was found in {settings.supabase_sync_table} for item id={item_id}."

    row = rows[0]
    actual_owner = row.get("owner_supabase_user_id")
    if owner_supabase_user_id and actual_owner != owner_supabase_user_id:
        return False, f"Expected owner_supabase_user_id={owner_supabase_user_id}, got {actual_owner}."
    return True, _json(row)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a live Supabase auth + cloud sync smoke test.")
    parser.add_argument("--api-base-url", default="", help="Backend base URL or /api/v1 prefix.")
    parser.add_argument("--redirect-to", default="", help="Email confirmation redirect target, usually https://www.aiwardrobes.com/login")
    parser.add_argument("--email", default="", help="Smoke-test email. Defaults to a unique mailinator address.")
    parser.add_argument("--password", default="", help="Smoke-test password. Defaults to a generated strong password.")
    parser.add_argument("--display-name", default="Live Smoke", help="Display name for the smoke-test account.")
    parser.add_argument("--cleanup-item", action="store_true", help="Delete the created wardrobe item at the end.")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    api_base_url = _api_base_url(args.api_base_url)
    redirect_to = _redirect_to(args.redirect_to)
    email = args.email.strip() or _default_email()
    password = args.password.strip() or _default_password()
    display_name = args.display_name.strip() or "Live Smoke"
    created_item_id: int | None = None
    access_token = ""

    failures = 0

    with httpx.Client(base_url=api_base_url, timeout=45.0) as client:
        sign_up_response = client.post(
            "/auth/sign-up",
            json={
                "email": email,
                "password": password,
                "display_name": display_name,
                "redirect_to": redirect_to,
            },
        )
        sign_up_ok = sign_up_response.status_code == 200
        sign_up_payload = sign_up_response.json() if sign_up_response.headers.get("content-type", "").startswith("application/json") else sign_up_response.text
        _step("sign_up", sign_up_ok, _json(sign_up_payload))
        if not sign_up_ok:
            raise SystemExit(1)

        sign_up_json = sign_up_response.json()
        user_payload = sign_up_json.get("user") or {}
        supabase_user_id = user_payload.get("supabase_user_id")

        if sign_up_json.get("requires_email_confirmation"):
            if not supabase_user_id:
                _step("confirm_email", False, "The sign-up response did not include a supabase_user_id.")
                raise SystemExit(1)
            confirmed, detail = _confirm_user(str(supabase_user_id))
            _step("confirm_email", confirmed, detail)
            if not confirmed:
                raise SystemExit(1)

        login_response = client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )
        login_ok = login_response.status_code == 200
        login_payload = login_response.json() if login_ok else login_response.text
        _step("login", login_ok, _json(login_payload))
        if not login_ok:
            raise SystemExit(1)

        login_json = login_response.json()
        access_token = login_json.get("access_token") or ""
        headers = {"Authorization": f"Bearer {access_token}"}

        me_response = client.get("/auth/me", headers=headers)
        me_ok = me_response.status_code == 200
        me_payload = me_response.json() if me_ok else me_response.text
        _step("auth_me", me_ok, _json(me_payload))
        if not me_ok:
            raise SystemExit(1)

        me_json = me_response.json()
        supabase_user_id = me_json.get("supabase_user_id")

        create_item_response = client.post(
            "/wardrobe/items",
            headers=headers,
            json={
                "name": f"Live Smoke Shirt {datetime.utcnow().strftime('%H%M%S')}",
                "category": "tops",
                "slot": "top",
                "color": "Ivory",
                "brand": "SmokeTest",
                "tags": ["smoke"],
                "occasions": ["office"],
                "style_notes": "Live Supabase smoke test item.",
            },
        )
        create_item_ok = create_item_response.status_code == 200
        create_item_payload = create_item_response.json() if create_item_ok else create_item_response.text
        _step("create_item", create_item_ok, _json(create_item_payload))
        if not create_item_ok:
            raise SystemExit(1)

        created_item = create_item_response.json()
        created_item_id = int(created_item["id"])

        sync_status_response = client.get("/sync/status", headers=headers)
        sync_status_ok = sync_status_response.status_code == 200
        sync_status_payload = sync_status_response.json() if sync_status_ok else sync_status_response.text
        _step("sync_status", sync_status_ok, _json(sync_status_payload))
        if not sync_status_ok:
            raise SystemExit(1)

        status_json = sync_status_response.json()
        if not status_json.get("cloud_enabled"):
            _step("cloud_enabled", False, "cloud_enabled is false, so Supabase or R2 is not actually reachable.")
            raise SystemExit(1)

        sync_run_response = client.post("/sync/run", headers=headers)
        sync_run_ok = sync_run_response.status_code == 200
        sync_run_payload = sync_run_response.json() if sync_run_ok else sync_run_response.text
        _step("sync_run", sync_run_ok, _json(sync_run_payload))
        if not sync_run_ok:
            raise SystemExit(1)

        run_json = sync_run_response.json()
        failed_items = int(run_json.get("failed_items") or 0)
        if failed_items != 0:
            _step("sync_run_failed_items", False, f"failed_items={failed_items}")
            failures += 1
        else:
            _step("sync_run_failed_items", True, "All items synced without API-side failures.")

        verified, detail = _verify_synced_row(created_item_id, supabase_user_id)
        _step("supabase_row_check", verified, detail)
        if not verified:
            failures += 1

        if args.cleanup_item and created_item_id is not None and access_token:
            delete_response = client.delete(f"/wardrobe/items/{created_item_id}", headers=headers)
            delete_ok = delete_response.status_code == 200
            delete_payload = delete_response.json() if delete_response.headers.get("content-type", "").startswith("application/json") else delete_response.text
            _step("cleanup_item", delete_ok, _json(delete_payload))

    if failures:
        raise SystemExit(1)

    print("SMOKE_RESULT: PASS")


if __name__ == "__main__":
    main()
