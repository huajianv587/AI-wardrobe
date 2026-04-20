from __future__ import annotations

import hashlib
import logging
import time
import uuid
from collections.abc import Callable

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

from core.config import settings
from core.observability import reset_request_context, set_request_context
from services import rate_limit_service

logger = logging.getLogger(__name__)


def reset_rate_limit_store() -> None:
    rate_limit_service.reset_rate_limit_store()


class RequestAuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        client_ip = _client_ip(request)
        tokens = set_request_context(
            request_id=request_id,
            path=request.url.path,
            method=request.method,
            client_ip=client_ip,
        )
        request.state.request_id = request_id

        started_at = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            status_code = getattr(getattr(request, "state", object()), "status_code", None)
            if status_code is None and "response" in locals():
                status_code = response.status_code
            log_method = logger.info
            if isinstance(status_code, int) and status_code >= 500:
                log_method = logger.error
            elif isinstance(status_code, int) and status_code >= 400:
                log_method = logger.warning
            log_method(
                "request.completed status=%s duration_ms=%s user_agent=%s",
                status_code or "-",
                duration_ms,
                request.headers.get("user-agent", "-"),
            )
            reset_request_context(tokens)

        response.headers["X-Request-ID"] = request_id
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not settings.rate_limit_enabled:
            return await call_next(request)

        rule = _matching_rule(request.method.upper(), request.url.path)
        if rule is None:
            return await call_next(request)

        limit, window_seconds = rule
        key = _rate_limit_key(request)
        bucket_key = f"{request.method.upper()}:{request.url.path}:{key}"
        allowed, retry_after, backend = await rate_limit_service.consume_rate_limit(bucket_key, limit, window_seconds)
        if not allowed:
            logger.warning(
                "request.rate_limited limit=%s window_seconds=%s retry_after=%s backend=%s",
                limit,
                window_seconds,
                retry_after,
                backend,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please wait a moment and try again.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for.strip():
        return forwarded_for.split(",")[0].strip()
    client = request.client.host if request.client else ""
    return client or "unknown"


def _rate_limit_key(request: Request) -> str:
    auth_header = request.headers.get("authorization", "").strip()
    if auth_header:
        return hashlib.sha256(auth_header.encode("utf-8")).hexdigest()[:16]
    return _client_ip(request)


def _matching_rule(method: str, path: str) -> tuple[int, int] | None:
    auth_paths = {
        "/api/v1/auth/sign-up",
        "/api/v1/auth/login",
        "/api/v1/auth/password-reset",
        "/api/v1/auth/password-reset/confirm",
        "/api/v1/auth/refresh",
    }
    heavy_paths = {
        "/api/v1/outfits/recommend",
        "/api/v1/assistant/tomorrow",
        "/api/v1/assistant/quick-mode",
        "/api/v1/assistant/packing",
        "/api/v1/try-on/render",
        "/api/v1/ai-demo/run",
    }

    if method == "OPTIONS" or path.startswith("/api/v1/health"):
        return None
    if path in auth_paths:
        return settings.rate_limit_auth_requests, settings.rate_limit_auth_window_seconds
    if path in heavy_paths:
        return settings.rate_limit_heavy_requests, settings.rate_limit_heavy_window_seconds
    if path.startswith("/api/v1/"):
        return settings.rate_limit_default_requests, settings.rate_limit_default_window_seconds
    return None
