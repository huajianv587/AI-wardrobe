from __future__ import annotations

import contextvars
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

from core.config import settings

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")
request_path_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_path", default="-")
request_method_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_method", default="-")
client_ip_var: contextvars.ContextVar[str] = contextvars.ContextVar("client_ip", default="-")

SENSITIVE_KEYWORDS = {
    "authorization",
    "api_key",
    "apikey",
    "token",
    "refresh_token",
    "access_token",
    "password",
    "secret",
    "cookie",
    "set-cookie",
    "service_role",
}
SENSITIVE_VALUE_FIELDS = (
    "openai_api_key",
    "deepseek_api_key",
    "llm_recommender_api_key",
    "llm_recommender_fallback_api_key",
    "virtual_tryon_api_key",
    "virtual_tryon_fallback_api_key",
    "supabase_anon_key",
    "supabase_service_role_key",
    "smtp_password",
    "r2_secret_access_key",
    "r2_access_key_id",
)

_TOKEN_PATTERNS = [
    re.compile(r"(?i)(bearer\s+)([a-z0-9._\-]+)"),
    re.compile(r"(?i)(\"?(?:api_?key|access_?token|refresh_?token|password|secret|authorization)\"?\s*[:=]\s*\"?)([^\",\\s]+)"),
]


def _configured_secret_values() -> list[str]:
    values: list[str] = []
    for field_name in SENSITIVE_VALUE_FIELDS:
        value = str(getattr(settings, field_name, "") or "").strip()
        if value:
            values.append(value)
    return values


def redact_text(value: str) -> str:
    redacted = str(value)
    for secret in _configured_secret_values():
        if secret:
            redacted = redacted.replace(secret, "<redacted>")
    for pattern in _TOKEN_PATTERNS:
        redacted = pattern.sub(r"\1<redacted>", redacted)
    return redacted


def sanitize_for_logging(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized: dict[Any, Any] = {}
        for key, item in value.items():
            normalized_key = str(key).strip().lower()
            if any(keyword in normalized_key for keyword in SENSITIVE_KEYWORDS):
                sanitized[key] = "<redacted>"
            else:
                sanitized[key] = sanitize_for_logging(item)
        return sanitized
    if isinstance(value, (list, tuple, set)):
        container = [sanitize_for_logging(item) for item in value]
        if isinstance(value, tuple):
            return tuple(container)
        if isinstance(value, set):
            return set(container)
        return container
    if isinstance(value, str):
        return redact_text(value)
    return value


class SecretRedactionFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = sanitize_for_logging(record.msg)
        if isinstance(record.args, dict):
            record.args = sanitize_for_logging(record.args)
        elif isinstance(record.args, tuple):
            record.args = tuple(sanitize_for_logging(arg) for arg in record.args)
        elif record.args:
            record.args = sanitize_for_logging(record.args)
        return True


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        record.request_path = request_path_var.get()
        record.request_method = request_method_var.get()
        record.client_ip = client_ip_var.get()
        return True


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "request_method": getattr(record, "request_method", "-"),
            "request_path": getattr(record, "request_path", "-"),
            "client_ip": getattr(record, "client_ip", "-"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.addFilter(SecretRedactionFilter())
    handler.addFilter(RequestContextFilter())
    if settings.log_json:
        handler.setFormatter(JsonLogFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s [%(name)s] [request_id=%(request_id)s method=%(request_method)s path=%(request_path)s client=%(client_ip)s] %(message)s"
            )
        )

    logging.basicConfig(level=settings.log_level, handlers=[handler], force=True)
    logging.captureWarnings(True)
    logging.getLogger("torch.distributed.elastic.multiprocessing.redirects").setLevel(logging.ERROR)


def set_request_context(*, request_id: str, path: str, method: str, client_ip: str) -> list[contextvars.Token[Any]]:
    return [
        request_id_var.set(request_id),
        request_path_var.set(path),
        request_method_var.set(method),
        client_ip_var.set(client_ip),
    ]


def reset_request_context(tokens: list[contextvars.Token[Any]]) -> None:
    for variable, token in zip((request_id_var, request_path_var, request_method_var, client_ip_var), tokens):
        variable.reset(token)
