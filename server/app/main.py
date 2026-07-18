from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.logging import configure_logging
from app.core.settings import get_settings
from app.core.telemetry import configure_tracing, instrument_fastapi

logger = structlog.get_logger()
http_requests = Counter(
    "lifecurriculum_http_requests_total",
    "Total HTTP requests handled by the API.",
    ["method", "route", "status_code"],
)
http_duration = Histogram(
    "lifecurriculum_http_request_duration_seconds",
    "HTTP request duration in seconds.",
    ["method", "route"],
)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        started_at = perf_counter()
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        try:
            response = await call_next(request)
        finally:
            structlog.contextvars.clear_contextvars()
        route = request.scope.get("route")
        route_path = getattr(route, "path", "unmatched")
        elapsed = perf_counter() - started_at
        response.headers["X-Request-ID"] = request_id
        http_requests.labels(request.method, route_path, response.status_code).inc()
        http_duration.labels(request.method, route_path).observe(elapsed)
        logger.info(
            "http.request.completed",
            method=request.method,
            route=route_path,
            status_code=response.status_code,
            duration_seconds=round(elapsed, 6),
        )
        return response


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.log_level)
    configure_tracing(settings)
    logger.info("application.started", environment=settings.app_env)
    yield
    logger.info("application.stopped")


settings = get_settings()
app = FastAPI(title="LifeCurriculum API", version="0.1.0", lifespan=lifespan)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["X-Request-ID", "Content-Type"],
)
instrument_fastapi(app)


@app.get("/health/live", tags=["operational"])
async def live_health() -> dict[str, str]:
    return {"status": "ok", "service": "lifecurriculum-api"}


@app.get("/health/ready", tags=["operational"])
async def ready_health() -> dict[str, str]:
    return {"status": "ok", "service": "lifecurriculum-api"}


@app.get("/metrics", include_in_schema=False)
async def metrics() -> PlainTextResponse:
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)
