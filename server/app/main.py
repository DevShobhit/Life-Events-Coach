import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import date
from time import perf_counter
from uuid import uuid4

import structlog
from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from opentelemetry import trace
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.database import get_session
from app.core.errors import (
    AppError,
    BadRequestError,
    ForbiddenError,
    GatewayTimeoutError,
    NotFoundError,
    app_error_handler,
    http_error_handler,
    unexpected_error_handler,
    validation_error_handler,
)
from app.core.logging import configure_logging
from app.core.settings import get_settings
from app.core.telemetry import configure_tracing, instrument_fastapi
from app.modules.phases.ask_api import (
    AskResponse,
    RoadmapFoldRequest,
    answer_question,
)
from app.modules.phases.catalog import (
    PublishedPhaseModule,
    get_module,
    get_persisted_module,
    list_catalog,
)
from app.modules.phases.enrollment_repository import EnrollmentRepository
from app.modules.phases.enrollment import validate_enrollment
from app.modules.phases.freshness import FreshnessReport, freshness_report
from app.modules.phases.grounding import GroundingTimeout
from app.modules.phases.lifecycle import CardAction
from app.modules.phases.roadmap import (
    RoadmapResponse,
    apply_persistent_action,
    persistent_roadmap,
)
from app.modules.phases.schemas import Enrollment

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
        response: Response | None = None
        try:
            response = await call_next(request)
            return response
        finally:
            route = request.scope.get("route")
            route_path = getattr(route, "path", "unmatched")
            elapsed = perf_counter() - started_at
            span_context = trace.get_current_span().get_span_context()
            trace_id = (
                format(span_context.trace_id, "032x") if span_context.is_valid else None
            )
            span_id = (
                format(span_context.span_id, "016x") if span_context.is_valid else None
            )
            status_code = response.status_code if response is not None else 500
            if response is not None:
                response.headers["X-Request-ID"] = request_id
                if trace_id:
                    response.headers["X-Trace-ID"] = trace_id
            http_requests.labels(request.method, route_path, status_code).inc()
            http_duration.labels(request.method, route_path).observe(elapsed)
            logger.info(
                "http.request.completed",
                method=request.method,
                route=route_path,
                status_code=status_code,
                duration_seconds=round(elapsed, 6),
                trace_id=trace_id,
                span_id=span_id,
            )
            structlog.contextvars.clear_contextvars()


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
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unexpected_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_origin_regex=(
        r"^https?://[^/]+$" if settings.app_env == "development" else None
    ),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["X-Request-ID", "X-User-ID", "Content-Type"],
)
instrument_fastapi(app)


async def request_user(x_user_id: str = Header(..., alias="X-User-ID")) -> str:
    return x_user_id


@app.get("/health/live", tags=["operational"])
async def live_health() -> dict[str, str]:
    return {"status": "ok", "service": "lifecurriculum-api"}


@app.get("/health/ready", tags=["operational"])
async def ready_health(
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Response:
    """Check database reachability with a bounded probe before accepting traffic."""
    try:
        await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=1.0)
    except Exception:
        logger.warning("application.readiness.failed", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={"status": "unready", "service": "lifecurriculum-api"},
        )
    return JSONResponse(
        status_code=200,
        content={"status": "ok", "service": "lifecurriculum-api"},
    )


@app.get("/phases", response_model=list[PublishedPhaseModule], tags=["phases"])
async def phase_catalog() -> list[PublishedPhaseModule]:
    return list_catalog()


@app.get("/phases/{phase_id}", response_model=PublishedPhaseModule, tags=["phases"])
async def phase_module(phase_id: str) -> PublishedPhaseModule:
    module = get_module(phase_id)
    if module is None:
        raise NotFoundError("phase")
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
        raise ForbiddenError("user scope mismatch")
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
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


class EnrollmentRequest(BaseModel):
    context: dict[str, str] = Field(default_factory=dict)
    progress_anchor: date = Field(default_factory=date.today)


@app.get(
    "/enrollment/{user_id}/{phase_id}",
    response_model=Enrollment,
    tags=["enrollment"],
)
async def enrollment(
    user_id: str,
    phase_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    authenticated_user: str = Depends(request_user),  # noqa: B008
) -> Enrollment:
    if authenticated_user != user_id:
        raise ForbiddenError("user scope mismatch")
    enrollment_record = await EnrollmentRepository(session).get(user_id, phase_id)
    if enrollment_record is None:
        raise NotFoundError("enrollment")
    return enrollment_record


@app.put(
    "/enrollment/{user_id}/{phase_id}",
    response_model=Enrollment,
    tags=["enrollment"],
)
async def save_enrollment(
    user_id: str,
    phase_id: str,
    request: EnrollmentRequest,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    authenticated_user: str = Depends(request_user),  # noqa: B008
) -> Enrollment:
    if authenticated_user != user_id:
        raise ForbiddenError("user scope mismatch")
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
    try:
        enrollment_value = validate_enrollment(
            published.module,
            user_id=user_id,
            phase_id=phase_id,
            context=request.context,
            progress_anchor=request.progress_anchor,
        )
    except ValueError as error:
        raise BadRequestError(str(error)) from error
    await EnrollmentRepository(session).save(enrollment_value)
    saved = await EnrollmentRepository(session).get(user_id, phase_id)
    if saved is None:
        raise NotFoundError("enrollment")
    return saved


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


@app.post("/ask/{user_id}/{phase_id}", response_model=AskResponse, tags=["ask"])
async def ask(
    user_id: str,
    phase_id: str,
    request: AskRequest,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    authenticated_user: str = Depends(request_user),  # noqa: B008
) -> AskResponse:
    if authenticated_user != user_id:
        raise ForbiddenError("user scope mismatch")
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
    try:
        return await answer_question(
            published.module, version=published.version, question=request.question
        )
    except GroundingTimeout as error:
        raise GatewayTimeoutError() from error


@app.post(
    "/ask/{user_id}/{phase_id}/roadmap-folds/{concern_id}",
    response_model=RoadmapResponse,
    tags=["ask"],
)
async def confirm_roadmap_fold(
    user_id: str,
    phase_id: str,
    concern_id: str,
    request: RoadmapFoldRequest,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    authenticated_user: str = Depends(request_user),  # noqa: B008
) -> RoadmapResponse:
    if authenticated_user != user_id:
        raise ForbiddenError("user scope mismatch")
    if not request.confirm:
        raise BadRequestError("confirm must be true to fold a concern into the roadmap")
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
    try:
        return await apply_persistent_action(
            session,
            published.module,
            version=published.version,
            user_id=user_id,
            concern_id=concern_id,
            action=CardAction.RELEVANT,
            stage=request.stage,
            idempotency_key=request.idempotency_key,
            today=date.today(),
        )
    except ValueError as error:
        raise BadRequestError(str(error)) from error


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
        raise ForbiddenError("user scope mismatch")
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
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
        raise BadRequestError(str(error)) from error


@app.get("/metrics", include_in_schema=False)
async def metrics(metrics_token: str | None = Header(None, alias="X-Metrics-Token")) -> Response:
    configured_token = settings.metrics_access_token
    if settings.app_env == "production" and not configured_token:
        return Response(status_code=404)
    if configured_token and metrics_token != configured_token:
        return Response(status_code=403)
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get(
    "/editorial/freshness/{phase_id}",
    response_model=FreshnessReport,
    tags=["editorial"],
)
async def editorial_freshness(
    phase_id: str,
    as_of: date | None = None,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> FreshnessReport:
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
    return freshness_report(
        published.module,
        version=published.version,
        as_of=as_of or date.today(),
    )
