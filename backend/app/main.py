from contextlib import asynccontextmanager
import logging
import traceback

logging.getLogger("torch.distributed.elastic.multiprocessing.redirects").disabled = True

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.observability import configure_logging

configure_logging()
logger = logging.getLogger(__name__)

from app.api.router import api_router
from app.middleware import RateLimitMiddleware, RequestAuditMiddleware
from db.init_db import init_db
from services import alerting_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan, summary="AI Wardrobe backend")

app.add_middleware(RequestAuditMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request.state.status_code = 422
    logger.warning("request.validation_failed errors=%s", exc.errors())
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request.state.status_code = exc.status_code
    if exc.status_code >= 500:
        logger.error("request.http_exception status=%s detail=%s", exc.status_code, exc.detail)
    elif exc.status_code >= 400:
        logger.warning("request.http_exception status=%s detail=%s", exc.status_code, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "request_id": getattr(request.state, "request_id", None),
        },
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request.state.status_code = 500
    request_id = getattr(request.state, "request_id", None)
    logger.exception("request.unhandled_exception request_id=%s", request_id)
    if settings.alert_on_uncaught_exceptions:
        alerting_service.notify_ops(
            title="Unhandled backend exception",
            message=(
                f"request_id={request_id}\n"
                f"method={request.method}\n"
                f"path={request.url.path}\n"
                f"error={type(exc).__name__}: {exc}\n\n"
                f"{''.join(traceback.format_exception(type(exc), exc, exc.__traceback__))}"
            ),
            severity="critical",
            dedupe_key=f"exception:{request.url.path}:{type(exc).__name__}",
        )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error.",
            "request_id": request_id,
        },
    )
