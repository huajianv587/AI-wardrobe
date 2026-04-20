from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.config import settings
from services import alerting_service


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run live/ready/dependencies checks against an AI Wardrobe backend.")
    parser.add_argument("--base-url", help="Override the backend base URL for this probe run.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    configured_base_url = (args.base_url or settings.backend_public_base_url).rstrip("/")
    base_url = configured_base_url or "http://127.0.0.1:8000"
    targets = [
        ("live", f"{base_url}/api/v1/health/live"),
        ("ready", f"{base_url}/api/v1/health/ready"),
        ("dependencies", f"{base_url}/api/v1/health/dependencies"),
    ]

    results: dict[str, dict] = {}
    failed: list[str] = []

    for name, url in targets:
        last_error: str | None = None
        for attempt in range(4):
            try:
                response = httpx.get(url, timeout=settings.health_probe_timeout_seconds)
                payload = response.json()
                results[name] = {
                    "status_code": response.status_code,
                    "payload": payload,
                }
                if response.status_code >= 400:
                    failed.append(name)
                last_error = None
                break
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                if attempt < 3:
                    time.sleep(2)
        if last_error is not None:
            results[name] = {
                "status_code": 0,
                "error": last_error,
            }
            failed.append(name)

    failed.extend(_post_validate(results))
    failed = list(dict.fromkeys(failed))

    print(json.dumps(results, ensure_ascii=False, indent=2))

    if failed:
        alerting_service.notify_ops(
            title="Deployment health probe failed",
            message=json.dumps({"failed": failed, "results": results}, ensure_ascii=False, indent=2),
            severity="critical",
            dedupe_key="deployment-health-probe-failed",
        )
        return 1
    return 0


def _post_validate(results: dict[str, dict]) -> list[str]:
    dependencies_payload = results.get("dependencies", {}).get("payload", {})
    dependencies = dependencies_payload.get("dependencies", {}) if isinstance(dependencies_payload, dict) else {}
    task_queue = dependencies.get("task_queue", {}) if isinstance(dependencies, dict) else {}
    runtime = task_queue.get("runtime", {}) if isinstance(task_queue, dict) else {}
    queue_enabled = bool(runtime.get("enabled"))
    queue_eager = bool(runtime.get("eager"))
    queue_workers = int(runtime.get("active_workers") or 0)

    failures: list[str] = []
    if isinstance(task_queue, dict) and not bool(task_queue.get("ok", True)):
        failures.append("task_queue")
    elif queue_enabled and not queue_eager and queue_workers < 1:
        failures.append("task_queue_workers")
    return failures


if __name__ == "__main__":
    raise SystemExit(main())
