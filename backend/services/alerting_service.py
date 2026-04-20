from __future__ import annotations

import logging
import threading
import time

import httpx

from core.config import settings
from services import email_service

logger = logging.getLogger(__name__)

_alert_lock = threading.Lock()
_last_alert_sent_at: dict[str, float] = {}


def _should_send(dedupe_key: str) -> bool:
    now = time.monotonic()
    with _alert_lock:
        last_sent_at = _last_alert_sent_at.get(dedupe_key)
        if last_sent_at is not None and now - last_sent_at < settings.alert_dedupe_window_seconds:
            return False
        _last_alert_sent_at[dedupe_key] = now
        return True


def is_enabled() -> bool:
    return bool(settings.alert_webhook_url.strip() or settings.alert_email_to.strip())


def notify_ops(
    *,
    title: str,
    message: str,
    severity: str = "error",
    dedupe_key: str | None = None,
) -> None:
    if not is_enabled():
        return

    key = dedupe_key or f"{severity}:{title}"
    if not _should_send(key):
        logger.info("ops.alert.skipped_deduped title=%s severity=%s", title, severity)
        return

    payload = {
        "severity": severity,
        "title": title,
        "message": message,
        "environment": settings.app_env,
        "service": settings.app_name,
    }

    if settings.alert_webhook_url.strip():
        try:
            response = httpx.post(
                settings.alert_webhook_url.strip(),
                json=payload,
                timeout=settings.health_probe_timeout_seconds,
            )
            response.raise_for_status()
        except Exception as exc:
            logger.warning("ops.alert.webhook_failed title=%s error=%s", title, exc)

    if settings.alert_email_to.strip():
        try:
            email_service.send_email(
                to_email=settings.alert_email_to.strip(),
                subject=f"{settings.alert_email_subject_prefix} {title}",
                text_body=message,
                html_body=f"<pre>{message}</pre>",
            )
        except Exception as exc:
            logger.warning("ops.alert.email_failed title=%s error=%s", title, exc)
