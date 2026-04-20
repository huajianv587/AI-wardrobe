from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate the real Redis -> RQ -> worker task flow with a temporary local backend database.")
    parser.add_argument("--redis-url", default="redis://127.0.0.1:6379/0", help="Redis URL used by the smoke queue validation.")
    parser.add_argument("--timeout-seconds", type=int, default=90, help="Maximum seconds to wait for a queued task to complete.")
    parser.add_argument("--worker-wait-seconds", type=int, default=25, help="Maximum seconds to wait for a worker to register itself in Redis.")
    return parser.parse_args()


def configure_runtime(temp_root: Path, redis_url: str) -> None:
    os.environ["APP_ENV"] = "test"
    os.environ["DATABASE_URL"] = f"sqlite:///{(temp_root / 'queue-smoke.db').as_posix()}"
    os.environ["LOCAL_STORAGE_ROOT"] = str((temp_root / "assets").resolve())
    os.environ["REDIS_URL"] = redis_url
    os.environ["TASK_QUEUE_ENABLED"] = "true"
    os.environ["TASK_QUEUE_EAGER"] = "false"
    os.environ["TASK_QUEUE_RESULT_TTL_SECONDS"] = "300"
    os.environ["TASK_QUEUE_DEFAULT_TIMEOUT_SECONDS"] = "120"
    os.environ["TASK_QUEUE_IMAGE_CLEANUP_TIMEOUT_SECONDS"] = "120"
    os.environ["TASK_QUEUE_SMART_TIMEOUT_SECONDS"] = "120"
    os.environ["SUPABASE_URL"] = ""
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = ""
    os.environ["SUPABASE_ANON_KEY"] = ""
    os.environ["AI_CLEANUP_API_URL"] = ""
    os.environ["AI_CLEANUP_API_KEY"] = ""
    os.environ["LLM_RECOMMENDER_API_URL"] = ""
    os.environ["IMAGE_PROCESSOR_API_URL"] = ""
    os.environ["CLASSIFIER_API_URL"] = ""
    os.environ["MULTIMODAL_READER_API_URL"] = ""
    os.environ["VIRTUAL_TRYON_API_URL"] = ""
    os.environ["PRODUCT_RENDERER_API_URL"] = ""
    os.environ["AVATAR_BUILDER_API_URL"] = ""
    os.environ["R2_ACCOUNT_ID"] = ""
    os.environ["R2_BUCKET"] = ""
    os.environ["R2_ACCESS_KEY_ID"] = ""
    os.environ["R2_SECRET_ACCESS_KEY"] = ""
    os.environ["R2_ENDPOINT_URL"] = ""
    os.environ["R2_PUBLIC_BASE_URL"] = ""


def wait_for_worker(task_queue_service, timeout_seconds: int) -> dict:
    deadline = time.time() + timeout_seconds
    latest = task_queue_service.describe_runtime()
    while time.time() < deadline:
        latest = task_queue_service.describe_runtime()
        if latest.get("connection_ok") and int(latest.get("active_workers") or 0) > 0:
            return latest
        time.sleep(1)
    raise RuntimeError(f"RQ worker did not register in Redis within {timeout_seconds}s: {latest}")


def poll_task(client, task_id: int, timeout_seconds: int) -> dict:
    deadline = time.time() + timeout_seconds
    last_payload: dict | None = None
    while time.time() < deadline:
        response = client.get(f"/api/v1/assistant/tasks/{task_id}")
        response.raise_for_status()
        payload = response.json()
        last_payload = payload
        if payload.get("status") in {"completed", "failed"}:
            return payload
        time.sleep(0.75)
    raise RuntimeError(f"Task {task_id} did not finish within {timeout_seconds}s. Last payload: {last_payload}")


def main() -> int:
    args = parse_args()
    temp_dir = tempfile.TemporaryDirectory(prefix="ai-wardrobe-queue-smoke-")
    temp_root = Path(temp_dir.name)
    configure_runtime(temp_root, args.redis_url)

    if str(BACKEND_ROOT) not in sys.path:
        sys.path.insert(0, str(BACKEND_ROOT))

    from fastapi.testclient import TestClient
    from sqlalchemy import select

    from app.api.deps import get_current_user, get_db, get_optional_user
    from app.main import app
    from app.models.user import User
    from app.schemas.wardrobe import ClothingItemCreate
    from db.init_db import init_db
    from db.session import SessionLocal, engine
    from services import experience_service, r2_storage_service, supabase_service, task_queue_service, wardrobe_service

    experience_state_path = temp_root / "experience_state.json"
    original_state_path = experience_service._state_path
    experience_service._state_path = lambda: experience_state_path

    supabase_service.get_client.cache_clear()
    supabase_service._bucket_ready = False
    r2_storage_service.get_client.cache_clear()
    task_queue_service.reset_queue_clients()

    init_db()

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "queue-smoke@ai-wardrobe.dev"))
        if user is None:
            user = User(
                email="queue-smoke@ai-wardrobe.dev",
                supabase_user_id="queue-smoke-user",
                password_hash="supabase-managed",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        image_item = wardrobe_service.create_item(
            db,
            ClothingItemCreate(
                name="Queue Smoke Cleanup",
                category="tops",
                slot="top",
                color="米白",
                brand="Smoke",
                image_url=None,
                processed_image_url=None,
                tags=["queue-smoke"],
                occasions=[],
                style_notes="Real queue smoke test for image cleanup.",
            ),
            user,
        )
        smart_item = wardrobe_service.create_item(
            db,
            ClothingItemCreate(
                name="Queue Smoke Reanalyze",
                category="tops",
                slot="top",
                color="米白",
                brand="Smoke",
                image_url=None,
                processed_image_url=None,
                tags=["queue-smoke"],
                occasions=[],
                style_notes="Real queue smoke test for smart wardrobe.",
            ),
            user,
        )
        image_item_id = int(image_item.id)
        smart_item_id = int(smart_item.id)

    worker_env = os.environ.copy()
    worker_env["PYTHONPATH"] = str(BACKEND_ROOT)
    worker = subprocess.Popen(
        [sys.executable, "worker.py"],
        cwd=str(BACKEND_ROOT),
        env=worker_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def override_get_current_user():
        db = SessionLocal()
        try:
            current_user = db.scalar(select(User).where(User.email == "queue-smoke@ai-wardrobe.dev"))
            assert current_user is not None
            return current_user
        finally:
            db.close()

    def override_get_optional_user():
        return override_get_current_user()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_optional_user] = override_get_optional_user

    success = False
    try:
        runtime = wait_for_worker(task_queue_service, args.worker_wait_seconds)

        with TestClient(app) as client:
            image_response = client.post(f"/api/v1/wardrobe/items/{image_item_id}/process-image-async")
            image_response.raise_for_status()
            image_task = image_response.json()

            smart_response = client.post(f"/api/v1/experience/smart-wardrobe/items/{smart_item_id}/reanalyze")
            smart_response.raise_for_status()
            smart_task = smart_response.json()

            final_image_task = poll_task(client, int(image_task["id"]), args.timeout_seconds)
            final_smart_task = poll_task(client, int(smart_task["task_id"]), args.timeout_seconds)

        summary = {
            "runtime": runtime,
            "image_cleanup_task": final_image_task,
            "smart_reanalyze_task": final_smart_task,
        }

        if final_image_task.get("status") != "completed":
            raise RuntimeError(f"Image cleanup task did not complete successfully: {final_image_task}")
        if final_smart_task.get("status") != "completed":
            raise RuntimeError(f"Smart wardrobe task did not complete successfully: {final_smart_task}")

        print(json.dumps(summary, ensure_ascii=False, indent=2))
        success = True
        return 0
    finally:
        app.dependency_overrides.clear()
        experience_service._state_path = original_state_path
        task_queue_service.reset_queue_clients()
        supabase_service.get_client.cache_clear()
        supabase_service._bucket_ready = False
        r2_storage_service.get_client.cache_clear()
        engine.dispose()

        if worker.poll() is None:
            worker.terminate()
            try:
                worker.wait(timeout=5)
            except subprocess.TimeoutExpired:
                worker.kill()
                worker.wait(timeout=5)

        output = ""
        if worker.stdout is not None:
            try:
                output = worker.stdout.read()
            except Exception:
                output = ""
        if not success and worker.returncode not in {0, None} and output:
            print(output, file=sys.stderr)

        temp_dir.cleanup()


if __name__ == "__main__":
    raise SystemExit(main())
