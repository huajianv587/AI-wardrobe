from __future__ import annotations

import importlib
import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from core.config import settings

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional in some local environments
    from redis import Redis
except Exception:  # pragma: no cover
    Redis = None

try:  # pragma: no cover - optional in some local environments
    from rq import Queue, SimpleWorker, Worker
except Exception:  # pragma: no cover
    Queue = None
    SimpleWorker = None
    Worker = None


@dataclass(slots=True)
class EnqueueResult:
    queue_name: str
    backend: str
    executed_inline: bool
    reused_existing: bool = False


def reset_queue_clients() -> None:
    clear_cache = getattr(get_queue_connection, "cache_clear", None)
    if callable(clear_cache):
        clear_cache()


def full_queue_name(queue_name: str) -> str:
    return f"{settings.task_queue_queue_prefix}:{queue_name}"


def configured_queue_names() -> list[str]:
    return [
        settings.task_queue_image_cleanup_name,
        settings.task_queue_smart_priority_name,
        settings.task_queue_smart_default_name,
    ]


def selected_worker_class():
    if os.name == "nt" and SimpleWorker is not None:
        return SimpleWorker
    return Worker


@lru_cache(maxsize=1)
def get_queue_connection():
    if Redis is None or not settings.redis_url.strip():
        return None
    return Redis.from_url(
        settings.redis_url.strip(),
        decode_responses=False,
        socket_connect_timeout=settings.health_probe_timeout_seconds,
        socket_timeout=settings.health_probe_timeout_seconds,
    )


def get_queue(queue_name: str):
    connection = get_queue_connection()
    if connection is None or Queue is None:
        return None
    return Queue(
        name=full_queue_name(queue_name),
        connection=connection,
        default_timeout=settings.task_queue_default_timeout_seconds,
    )


def describe_runtime() -> dict[str, Any]:
    queue_names = configured_queue_names()
    payload: dict[str, Any] = {
        "enabled": settings.task_queue_enabled,
        "eager": settings.task_queue_eager,
        "redis_configured": bool(settings.redis_url.strip()),
        "redis_library_installed": Redis is not None,
        "rq_installed": Queue is not None and selected_worker_class() is not None,
        "worker_class": getattr(selected_worker_class(), "__name__", None),
        "connection_ok": False,
        "active_workers": 0,
        "worker_names": [],
        "queues": {
            name: {
                "name": full_queue_name(name),
                "queued_jobs": None,
            }
            for name in queue_names
        },
        "error": None,
    }

    connection = get_queue_connection()
    if connection is None:
        payload["error"] = _connection_unavailable_reason()
        return payload

    try:
        connection.ping()
    except Exception as exc:  # pragma: no cover - depends on local redis runtime
        payload["error"] = f"{type(exc).__name__}: {exc}"
        return payload

    payload["connection_ok"] = True

    if Queue is not None:
        for name in queue_names:
            queue = Queue(name=full_queue_name(name), connection=connection)
            payload["queues"][name]["queued_jobs"] = queue.count

    if Worker is not None:
        workers = Worker.all(connection=connection)
        payload["active_workers"] = len(workers)
        payload["worker_names"] = [worker.name for worker in workers[:5]]

    return payload


def start_worker(queue_names: list[str] | None = None) -> None:
    normalized_names = queue_names or configured_queue_names()
    worker_class = selected_worker_class()
    if worker_class is None or Queue is None:
        raise RuntimeError("rq is not installed, so the backend worker cannot start.")

    connection = get_queue_connection()
    if connection is None:
        raise RuntimeError("Redis is not configured, so the backend worker cannot start.")

    queues = [Queue(name=full_queue_name(queue_name), connection=connection) for queue_name in normalized_names]
    worker_class(queues=queues, connection=connection).work()


def enqueue_call(
    callable_path: str,
    *args: Any,
    queue_name: str,
    job_id: str,
    timeout: int | None = None,
    result_ttl: int | None = None,
    reused_existing: bool = False,
) -> EnqueueResult:
    if reused_existing:
        logger.info("task_queue.reused_existing queue=%s job_id=%s", queue_name, job_id)
        return EnqueueResult(
            queue_name=queue_name,
            backend="existing",
            executed_inline=False,
            reused_existing=True,
        )

    should_run_inline = (
        not settings.task_queue_enabled
        or settings.task_queue_eager
        or Queue is None
        or get_queue_connection() is None
    )

    if should_run_inline:
        logger.info(
            "task_queue.inline_execution queue=%s job_id=%s reason=%s",
            queue_name,
            job_id,
            _inline_reason(),
        )
        _resolve_callable(callable_path)(*args)
        return EnqueueResult(
            queue_name=queue_name,
            backend="inline",
            executed_inline=True,
            reused_existing=reused_existing,
        )

    queue = get_queue(queue_name)
    if queue is None:
        logger.warning("task_queue.queue_unavailable_inline_fallback queue=%s job_id=%s", queue_name, job_id)
        _resolve_callable(callable_path)(*args)
        return EnqueueResult(
            queue_name=queue_name,
            backend="inline-fallback",
            executed_inline=True,
            reused_existing=reused_existing,
        )

    queue.enqueue(
        callable_path,
        *args,
        job_id=job_id,
        job_timeout=timeout or settings.task_queue_default_timeout_seconds,
        result_ttl=result_ttl or settings.task_queue_result_ttl_seconds,
    )
    return EnqueueResult(
        queue_name=queue_name,
        backend="rq",
        executed_inline=False,
        reused_existing=reused_existing,
    )


def _resolve_callable(callable_path: str):
    module_name, _, attr_name = callable_path.rpartition(".")
    if not module_name or not attr_name:
        raise ValueError(f"Invalid callable path: {callable_path}")
    module = importlib.import_module(module_name)
    return getattr(module, attr_name)


def _inline_reason() -> str:
    if not settings.task_queue_enabled:
        return "task_queue_disabled"
    if settings.task_queue_eager:
        return "task_queue_eager"
    if Queue is None or selected_worker_class() is None:
        return "rq_missing"
    if get_queue_connection() is None:
        return "redis_unavailable"
    return "unspecified"


def _connection_unavailable_reason() -> str:
    if not settings.redis_url.strip():
        return "redis_not_configured"
    if Redis is None:
        return "redis_library_missing"
    if Queue is None or Worker is None:
        return "rq_missing"
    return "redis_unavailable"
