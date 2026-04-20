from core.config import settings
from services import task_queue_service


def test_enqueue_call_executes_inline_when_eager(monkeypatch):
    received: list[tuple[int, int]] = []

    def fake_resolve(_: str):
        return lambda left, right: received.append((left, right))

    monkeypatch.setattr(settings, "task_queue_enabled", True)
    monkeypatch.setattr(settings, "task_queue_eager", True)
    monkeypatch.setattr(settings, "redis_url", "")
    task_queue_service.reset_queue_clients()
    monkeypatch.setattr(task_queue_service, "_resolve_callable", fake_resolve)

    result = task_queue_service.enqueue_call(
        "tests.fake.callable",
        3,
        7,
        queue_name="smart_default",
        job_id="job-inline",
    )

    assert result.executed_inline is True
    assert result.backend == "inline"
    assert received == [(3, 7)]


def test_enqueue_call_skips_reused_existing_jobs(monkeypatch):
    def fail_resolve(_: str):
        raise AssertionError("existing tasks should not be re-enqueued")

    monkeypatch.setattr(settings, "task_queue_enabled", True)
    monkeypatch.setattr(settings, "task_queue_eager", False)
    monkeypatch.setattr(settings, "redis_url", "")
    task_queue_service.reset_queue_clients()
    monkeypatch.setattr(task_queue_service, "_resolve_callable", fail_resolve)

    result = task_queue_service.enqueue_call(
        "tests.fake.callable",
        queue_name="smart_default",
        job_id="job-existing",
        reused_existing=True,
    )

    assert result.executed_inline is False
    assert result.reused_existing is True
    assert result.backend == "existing"
