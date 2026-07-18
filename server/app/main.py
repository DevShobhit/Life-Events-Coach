from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import date
from time import perf_counter
from uuid import uuid4

import structlog
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.database import get_session
from app.core.logging import configure_logging
from app.core.settings import get_settings
from app.core.telemetry import configure_tracing, instrument_fastapi
from app.modules.phases.catalog import (
    PublishedPhaseModule,
    get_module,
    get_persisted_module,
    list_catalog,
)
from app.modules.phases.lifecycle import CardAction
from app.modules.phases.roadmap import (
    RoadmapResponse,
    apply_persistent_action,
    persistent_roadmap,
)

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
    allow_methods=["GET", "POST"],
    allow_headers=["X-Request-ID", "Content-Type"],
)
instrument_fastapi(app)


async def request_user(x_user_id: str = Header(..., alias="X-User-ID")) -> str:
    return x_user_id


@app.get("/health/live", tags=["operational"])
async def live_health() -> dict[str, str]:
    return {"status": "ok", "service": "lifecurriculum-api"}


@app.get("/health/ready", tags=["operational"])
async def ready_health() -> dict[str, str]:
    return {"status": "ok", "service": "lifecurriculum-api"}


@app.get("/phases", response_model=list[PublishedPhaseModule], tags=["phases"])
async def phase_catalog() -> list[PublishedPhaseModule]:
    return list_catalog()


@app.get("/phases/{phase_id}", response_model=PublishedPhaseModule, tags=["phases"])
async def phase_module(phase_id: str) -> PublishedPhaseModule:
    module = get_module(phase_id)
    if module is None:
        raise HTTPException(status_code=404, detail="phase not found")
    return module


@app.get(
    "/roadmap/{user_id}/{phase_id}",
    response_model=RoadmapResponse,
    tags=["roadmap"],
)
async def roadmap(
    user_id: str,
    phase_id: str,
    stage: str = "arrived",
    session: AsyncSession = Depends(get_session),  # noqa: B008
    authenticated_user: str = Depends(request_user),  # noqa: B008
) -> RoadmapResponse:
    if authenticated_user != user_id:
        raise HTTPException(status_code=403, detail="user scope mismatch")
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise HTTPException(status_code=404, detail="phase not found")
    return await persistent_roadmap(
        session,
        published.module,
        version=published.version,
        user_id=user_id,
        stage=stage,
        today=date.today(),
    )


class RoadmapActionRequest(BaseModel):
    concern_id: str
    action: CardAction
    stage: str = "arrived"
    idempotency_key: str


@app.post(
    "/roadmap/{user_id}/{phase_id}/actions",
    response_model=RoadmapResponse,
    tags=["roadmap"],
)
async def roadmap_action(
    user_id: str,
    phase_id: str,
    request: RoadmapActionRequest,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    authenticated_user: str = Depends(request_user),  # noqa: B008
) -> RoadmapResponse:
    if authenticated_user != user_id:
        raise HTTPException(status_code=403, detail="user scope mismatch")
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise HTTPException(status_code=404, detail="phase not found")
    try:
        return await apply_persistent_action(
            session,
            published.module,
            version=published.version,
            user_id=user_id,
            concern_id=request.concern_id,
            action=request.action,
            stage=request.stage,
            idempotency_key=request.idempotency_key,
            today=date.today(),
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/metrics", include_in_schema=False)
async def metrics() -> PlainTextResponse:
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)
