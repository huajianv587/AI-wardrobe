from __future__ import annotations

import argparse
import base64
import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import httpx


PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAk0lEQVR4nO3ZsQ3CYAwF4cuJ"
    "MWAJKlagYFoKVqBiCSLRpkrNBBS/KKJDfK2tZ0suPa3LizKJkziJkziJkziJ230q7I+noaDD"
    "5Tw6+3m9DfXPj/sPXkDiJE7iJE7iJE7iJE7iJE7iJE7iJE7iJE7iJE7iJE7iJE7iJE7iJE7i"
    "JE7iJE7ipv+je2MSJ3ESJ3FuvcC33i+sC/s0cZsBAAAAAElFTkSuQmCC"
)


class StepError(RuntimeError):
    pass


@dataclass
class StepResult:
    name: str
    ok: bool
    status_code: int | None = None
    detail: str | None = None
    elapsed_ms: int | None = None
    data: dict[str, Any] = field(default_factory=dict)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run production API smoke tests for the Expo iOS app path.")
    parser.add_argument("--base-url", default="https://api.aiwardrobes.com", help="Production API base URL.")
    parser.add_argument("--email", help="Specific email to use for the temporary smoke account.")
    parser.add_argument("--password", default="SmokePass!2026", help="Password for the temporary smoke account.")
    parser.add_argument("--timeout", type=float, default=30.0, help="HTTP timeout in seconds.")
    parser.add_argument("--allow-insecure", action="store_true", help="Disable TLS verification for diagnosis only. This is never App Store-ready.")
    parser.add_argument("--json-out", help="Optional path to write the JSON report.")
    return parser.parse_args()


class ProductionMobileSmoke:
    def __init__(self, args: argparse.Namespace) -> None:
        self.base_url = args.base_url.rstrip("/")
        self.email = args.email or f"appstore-smoke-{int(time.time())}@example.com"
        self.password = args.password
        self.results: list[StepResult] = []
        self.session: dict[str, Any] | None = None
        self.item_id: int | None = None
        self.allow_insecure = bool(args.allow_insecure)
        self.client = httpx.Client(base_url=self.base_url, timeout=args.timeout, verify=not args.allow_insecure)

    def close(self) -> None:
        self.client.close()

    def add(self, result: StepResult) -> None:
        self.results.append(result)

    def token(self) -> str:
        if not self.session or not self.session.get("access_token"):
            raise StepError("No access token is available.")
        return str(self.session["access_token"])

    def request_json(
        self,
        name: str,
        method: str,
        path: str,
        *,
        token: str | None = None,
        expected: tuple[int, ...] = (200,),
        **kwargs: Any,
    ) -> Any:
        headers = kwargs.pop("headers", {})
        if token:
            headers["Authorization"] = f"Bearer {token}"

        started = time.perf_counter()
        try:
            response = self.client.request(method, path, headers=headers, **kwargs)
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            payload = self._payload(response)
            ok = response.status_code in expected
            self.add(
                StepResult(
                    name=name,
                    ok=ok,
                    status_code=response.status_code,
                    elapsed_ms=elapsed_ms,
                    detail=None if ok else self._detail(payload),
                    data=self._preview(payload),
                )
            )
            if not ok:
                raise StepError(f"{name} returned {response.status_code}: {self._detail(payload)}")
            return payload
        except Exception as exc:
            if isinstance(exc, StepError):
                raise
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            self.add(StepResult(name=name, ok=False, elapsed_ms=elapsed_ms, detail=f"{type(exc).__name__}: {exc}"))
            raise StepError(f"{name} failed: {type(exc).__name__}: {exc}") from exc

    @staticmethod
    def _payload(response: httpx.Response) -> Any:
        try:
            return response.json()
        except ValueError:
            return {"text": response.text[:500]}

    @staticmethod
    def _detail(payload: Any) -> str:
        if isinstance(payload, dict):
            detail = payload.get("detail") or payload.get("message") or payload.get("text")
            if detail:
                return str(detail)[:500]
        return str(payload)[:500]

    @staticmethod
    def _preview(payload: Any) -> dict[str, Any]:
        if not isinstance(payload, dict):
            return {"value": str(payload)[:200]}
        preview: dict[str, Any] = {}
        for key, value in payload.items():
            if key in {"access_token", "refresh_token"}:
                preview[key] = "***"
            elif isinstance(value, (str, int, float, bool)) or value is None:
                preview[key] = value
            elif isinstance(value, list):
                preview[key] = f"list[{len(value)}]"
            elif isinstance(value, dict):
                preview[key] = f"dict[{len(value)}]"
        return preview

    def run(self) -> None:
        self.check_health()
        self.check_public_session()
        self.check_auth()
        self.check_wardrobe_upload_and_processing()
        self.check_assistant_experience_and_tryon()
        self.delete_account_and_verify_token()

    def check_health(self) -> None:
        self.request_json("health.live", "GET", "/api/v1/health/live")
        self.request_json("health.ready", "GET", "/api/v1/health/ready")
        dependencies = self.request_json("health.dependencies", "GET", "/api/v1/health/dependencies")
        deps = dependencies.get("dependencies", {}) if isinstance(dependencies, dict) else {}
        failed = []
        for name in ("database", "storage", "task_queue"):
            value = deps.get(name)
            if isinstance(value, dict) and value.get("ok") is False:
                failed.append(name)
        self.add(StepResult(name="health.dependencies.validate", ok=not failed, detail=", ".join(failed) if failed else None))
        if failed:
            raise StepError(f"Critical dependencies are not ok: {', '.join(failed)}")
        self.validate_task_queue(deps)

    def validate_task_queue(self, deps: dict[str, Any]) -> None:
        task_queue = deps.get("task_queue")
        if not isinstance(task_queue, dict):
            raise StepError("health.dependencies did not include task_queue details.")

        runtime = task_queue.get("runtime")
        runtime = runtime if isinstance(runtime, dict) else {}
        enabled = bool(runtime.get("enabled"))
        eager = bool(runtime.get("eager"))
        connection_ok = bool(runtime.get("connection_ok"))
        active_workers = int(runtime.get("active_workers") or 0)
        queues = runtime.get("queues") if isinstance(runtime.get("queues"), dict) else {}

        ok = (
            not enabled
            or eager
            or (connection_ok and active_workers > 0 and bool(queues))
        )
        detail = None
        if not ok:
            detail = (
                f"enabled={enabled}, eager={eager}, "
                f"connection_ok={connection_ok}, active_workers={active_workers}"
            )
        self.add(
            StepResult(
                name="health.task_queue.worker",
                ok=ok,
                detail=detail,
                data={
                    "enabled": enabled,
                    "eager": eager,
                    "connection_ok": connection_ok,
                    "active_workers": active_workers,
                    "queues": list(queues.keys()),
                },
            )
        )
        if not ok:
            raise StepError(f"Task queue is enabled but no Redis worker is ready: {detail}")

    def check_public_session(self) -> None:
        payload = self.request_json("auth.public_session", "POST", "/api/v1/auth/public-session")
        if not payload.get("access_token"):
            raise StepError("Public preview session did not return an access token.")
        self.request_json("auth.public_session.me", "GET", "/api/v1/auth/me", token=str(payload["access_token"]))

    def check_auth(self) -> None:
        self.session = self.request_json(
            "auth.sign_up",
            "POST",
            "/api/v1/auth/sign-up",
            json={"email": self.email, "password": self.password, "display_name": "App Store Smoke"},
        )
        self.session = self.request_json(
            "auth.login",
            "POST",
            "/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
        )
        self.request_json("auth.me", "GET", "/api/v1/auth/me", token=self.token())
        self.session = self.request_json(
            "auth.refresh",
            "POST",
            "/api/v1/auth/refresh",
            json={"refresh_token": self.session.get("refresh_token"), "access_token": self.session.get("access_token")},
        )
        self.request_json(
            "auth.logout",
            "POST",
            "/api/v1/auth/logout",
            token=self.token(),
            json={"refresh_token": self.session.get("refresh_token")},
        )
        self.session = self.request_json(
            "auth.login_after_logout",
            "POST",
            "/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
        )

    def check_wardrobe_upload_and_processing(self) -> None:
        item = self.request_json(
            "wardrobe.create_item",
            "POST",
            "/api/v1/wardrobe/items",
            token=self.token(),
            json={
                "name": "Smoke Black Blazer",
                "category": "outerwear",
                "slot": "outerwear",
                "color": "black",
                "brand": "AI Wardrobe Smoke",
                "tags": ["smoke", "ios", "review"],
                "occasions": ["work"],
                "style_notes": "Temporary production smoke item.",
            },
        )
        self.item_id = int(item["id"])
        self.request_json("wardrobe.list_items", "GET", "/api/v1/wardrobe/items", token=self.token())
        uploaded = self.request_json(
            "wardrobe.upload_image",
            "POST",
            f"/api/v1/wardrobe/items/{self.item_id}/upload-image",
            token=self.token(),
            files={"image": ("appstore-smoke.png", PNG_BYTES, "image/png")},
            expected=(200,),
        )
        if not uploaded.get("image_url"):
            raise StepError("Uploaded wardrobe item has no image_url.")

        task = self.request_json(
            "wardrobe.process_image_async",
            "POST",
            f"/api/v1/wardrobe/items/{self.item_id}/process-image-async",
            token=self.token(),
        )
        task_id = int(task["id"])
        terminal = self.poll_task(task_id)
        if terminal.get("status") != "completed":
            raise StepError(f"Image processing finished with status={terminal.get('status')}: {terminal.get('error_message')}")

    def poll_task(self, task_id: int) -> dict[str, Any]:
        terminal: dict[str, Any] = {}
        for attempt in range(30):
            payload = self.request_json(
                f"assistant.task_poll.{attempt + 1}",
                "GET",
                f"/api/v1/assistant/tasks/{task_id}",
                token=self.token(),
            )
            terminal = payload
            if payload.get("status") in {"completed", "failed"}:
                return payload
            time.sleep(2)
        return terminal

    def check_assistant_experience_and_tryon(self) -> None:
        self.request_json("assistant.overview", "GET", "/api/v1/assistant/overview", token=self.token())
        self.request_json("assistant.quick_mode", "POST", "/api/v1/assistant/quick-mode", token=self.token(), json={"mode": "workday"})
        self.request_json(
            "assistant.tomorrow",
            "POST",
            "/api/v1/assistant/tomorrow",
            token=self.token(),
            json={"location_query": "Singapore", "schedule": "Workday with normal commute", "has_commute": True},
        )
        self.request_json(
            "assistant.packing",
            "POST",
            "/api/v1/assistant/packing",
            token=self.token(),
            json={"city": "Singapore", "days": 3, "trip_kind": "city break", "include_commute": True},
        )
        self.request_json("assistant.style_profile.get", "GET", "/api/v1/assistant/style-profile", token=self.token())
        self.request_json(
            "assistant.style_profile.put",
            "PUT",
            "/api/v1/assistant/style-profile",
            token=self.token(),
            json={"favorite_colors": ["black"], "avoid_colors": [], "style_keywords": ["tailored"], "commute_profile": "public transit"},
        )
        self.request_json("experience.smart_wardrobe", "GET", "/api/v1/experience/smart-wardrobe", token=self.token())
        self.request_json("experience.closet_analysis", "GET", "/api/v1/experience/closet-analysis", token=self.token())
        self.request_json("experience.outfit_diary", "GET", "/api/v1/experience/outfit-diary", token=self.token())
        self.request_json(
            "tryon.empty",
            "POST",
            "/api/v1/try-on/render",
            token=self.token(),
            expected=(400,),
            json={"item_ids": [], "prompt": "Empty fallback smoke", "scene": "production-smoke"},
        )
        self.request_json("tryon.valid_item", "POST", "/api/v1/try-on/render", token=self.token(), json={"item_ids": [self.item_id], "prompt": "Black blazer office outfit", "scene": "production-smoke"})

    def delete_account_and_verify_token(self) -> None:
        old_token = self.token()
        self.request_json("auth.delete_account", "DELETE", "/api/v1/auth/me", token=old_token)
        try:
            self.request_json("auth.old_token_rejected", "GET", "/api/v1/auth/me", token=old_token, expected=(401, 403, 404))
        finally:
            self.session = None

    def best_effort_cleanup(self) -> None:
        if not self.session or not self.session.get("access_token"):
            return
        try:
            self.request_json("cleanup.delete_account", "DELETE", "/api/v1/auth/me", token=self.token(), expected=(200, 401, 403, 404))
        except StepError:
            pass

    def report(self) -> dict[str, Any]:
        passed = all(result.ok for result in self.results)
        return {
            "base_url": self.base_url,
            "email": self.email,
            "allow_insecure_tls": self.allow_insecure,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "go_no_go": {
                "production_api_ready_for_testflight": passed and not self.allow_insecure,
                "reason": None if passed and not self.allow_insecure else "One or more required smoke checks failed, or TLS verification was disabled.",
            },
            "summary": {
                "total": len(self.results),
                "passed": sum(1 for result in self.results if result.ok),
                "failed": sum(1 for result in self.results if not result.ok),
            },
            "results": [result.__dict__ for result in self.results],
        }


def main() -> int:
    args = parse_args()
    smoke = ProductionMobileSmoke(args)
    exit_code = 0
    try:
        smoke.run()
    except StepError:
        exit_code = 1
        smoke.best_effort_cleanup()
    finally:
        report = smoke.report()
        smoke.close()

    output = json.dumps(report, ensure_ascii=False, indent=2)
    print(output)
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as handle:
            handle.write(output + "\n")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
