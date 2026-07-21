import asyncio
import hashlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import date
from time import monotonic, perf_counter
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

from app.core.auth import (
    AuthenticatedSubject,
    authenticated_subject,
    authorize_subject_scope,
    configure_identity_provider_from_settings,
    editorial_admin,
    editorial_publisher,
    editorial_subject,
)
from app.core.database import get_session
from app.core.errors import (
    AppError,
    BadRequestError,
    ConflictError,
    GatewayTimeoutError,
    NotFoundError,
    RateLimitExceededError,
    app_error_handler,
    http_error_handler,
    unexpected_error_handler,
    validation_error_handler,
)
from app.core.logging import configure_logging
from app.core.rate_limit import SlidingWindowRateLimiter, route_family
from app.core.settings import get_settings
from app.core.telemetry import configure_tracing, instrument_fastapi
from app.modules.account.data_lifecycle import (
    AccountDataExport,
    AccountDeleteRequest,
    delete_account_data,
    export_account_data,
)
from app.modules.notifications.preferences import (
    NotificationPreference,
    NotificationPreferenceRepository,
    NotificationPreferenceUpdate,
)
from app.modules.phases.ask_api import (
    AskResponse,
    RoadmapFoldRequest,
    answer_question,
)
from app.modules.phases.cache import active_phase_module_cache
from app.modules.phases.catalog import (
    PublishedPhaseModule,
    get_persisted_module,
    list_persisted_modules,
)
from app.modules.phases.editorial import (
    active_version,
    active_version_for_update,
    create_draft,
    get_draft,
    get_publication_replay,
    list_drafts,
    next_version,
    record_audit,
    update_draft,
    validate_draft,
)
from app.modules.phases.enrollment import validate_enrollment
from app.modules.phases.enrollment_repository import EnrollmentRepository
from app.modules.phases.freshness import FreshnessReport, freshness_report
from app.modules.phases.grounding import (
    GroundingTimeout,
    HttpGroundingProvider,
    InProcessGroundingProvider,
    ResilientGroundingProvider,
)
from app.modules.phases.lifecycle import CardAction
from app.modules.phases.orm_models import PhaseModuleActive, PhaseModuleVersion
from app.modules.phases.publication import (
    PhaseModuleCache,
    PhaseModulePublisher,
    PublicationError,
)
from app.modules.phases.repository import PhaseModuleRepository
from app.modules.phases.roadmap import (
    RoadmapResponse,
    apply_persistent_action,
    persistent_roadmap,
)
from app.modules.phases.schemas import Enrollment, EnrollmentLifecycleEvent, PhaseModule

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
    configure_identity_provider_from_settings()
    configure_logging(settings.log_level)
    configure_tracing(settings)
    logger.info("application.started", environment=settings.app_env)
    yield
    logger.info("application.stopped")


settings = get_settings()
protected_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.protected_rate_limit_requests,
    window_seconds=settings.protected_rate_limit_window_seconds,
)
_readiness_lock = asyncio.Lock()
_readiness_cache: dict[type, float] = {}
_local_grounding = InProcessGroundingProvider()
grounding_provider = ResilientGroundingProvider(
    primary=(
        HttpGroundingProvider(
            str(settings.approved_source_provider_url),
            timeout_seconds=settings.approved_source_provider_timeout_seconds,
        )
        if settings.approved_source_provider_url
        else _local_grounding
    ),
    fallback=_local_grounding,
    timeout_seconds=settings.approved_source_provider_timeout_seconds,
)
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
    allow_methods=["DELETE", "GET", "PATCH", "POST", "PUT"],
    allow_headers=["X-Request-ID", "X-User-ID", "X-User-Role", "Content-Type"],
)
instrument_fastapi(app)


async def enforce_protected_rate_limit(request: Request) -> None:
    if settings.app_env != "production":
        return
    family = route_family(request.url.path)
    if family is None:
        return
    client_host = request.client.host if request.client else "unknown"
    scope = hashlib.sha256(f"{client_host}:{family}".encode()).hexdigest()[:16]
    if not protected_rate_limiter.allow(scope):
        logger.warning(
            "abuse.rate_limited",
            route_family=family,
            method=request.method,
        )
        raise RateLimitExceededError()


class EditorialPublishRequest(BaseModel):
    version: int = Field(ge=1)
    module: PhaseModule
    production: bool = False


class EditorialDraftRequest(BaseModel):
    module: PhaseModule


class EditorialDraftUpdateRequest(EditorialDraftRequest):
    expected_revision: int = Field(ge=1)


class EditorialDraftPublishRequest(BaseModel):
    expected_active_version: int | None = Field(default=None, ge=0)
    idempotency_key: str = Field(min_length=1, max_length=150)


class EditorialVersionTransitionRequest(BaseModel):
    expected_active_version: int | None = Field(default=None, ge=0)


def _draft_response(draft: object) -> dict[str, object]:
    return {
        "draft_id": draft.draft_id,
        "phase_id": draft.phase_id,
        "base_version": draft.base_version,
        "status": draft.status,
        "revision": draft.revision,
        "module": draft.content,
        "validation_report": draft.validation_report,
        "published_version": draft.published_version,
    }


@app.get("/editorial/phases/{phase_id}/versions", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_versions(
    phase_id: str,
    _: object = Depends(editorial_subject),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, object]]:
    versions = await PhaseModuleRepository(session).list_versions(phase_id)
    return [
        {"phase_id": phase_id, "version": version, "status": status, "module": module}
        for version, status, module in versions
    ]


@app.post("/editorial/phases/{phase_id}/publish", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_publish(
    phase_id: str,
    payload: EditorialPublishRequest,
    _: object = Depends(editorial_publisher),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    if payload.module.phase_id != phase_id:
        raise BadRequestError("module phase does not match route phase")
    existing_versions = await PhaseModuleRepository(session).list_versions(phase_id)
    if any(version == payload.version for version, _, _ in existing_versions):
        raise ConflictError("publication version already exists")
    try:
        module = await PhaseModulePublisher(
            PhaseModuleRepository(session), PhaseModuleCache()
        ).publish(
            payload.module.model_dump(mode="json"),
            version=payload.version,
            production=payload.production,
        )
    except PublicationError as error:
        raise BadRequestError(
            "phase module publication validation failed", details=error.field_errors
        ) from error
    return {"phase_id": phase_id, "version": payload.version, "status": "published", "module": module}


@app.get("/editorial/phases/{phase_id}/drafts", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_drafts(
    phase_id: str,
    _: object = Depends(editorial_subject),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, object]]:
    return [_draft_response(draft) for draft in await list_drafts(session, phase_id)]


@app.post("/editorial/phases/{phase_id}/drafts", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_create_draft(
    phase_id: str,
    payload: EditorialDraftRequest,
    editorial: object = Depends(editorial_subject),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    if payload.module.phase_id != phase_id:
        raise BadRequestError("module phase does not match route phase")
    try:
        draft = await create_draft(
            session, phase_id=phase_id, content=payload.module.model_dump(mode="json"),
            actor_id=editorial.subject.subject_id,
        )
    except ValueError as error:
        raise BadRequestError("draft content is invalid") from error
    await record_audit(
        session, phase_id=phase_id, draft_id=draft.draft_id,
        actor_id=editorial.subject.subject_id, actor_role=editorial.role, event="draft.created",
    )
    await session.commit()
    return _draft_response(draft)


@app.get("/editorial/phases/{phase_id}/drafts/{draft_id}", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_get_draft(
    phase_id: str,
    draft_id: str,
    _: object = Depends(editorial_subject),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    draft = await get_draft(session, draft_id)
    if draft is None or draft.phase_id != phase_id:
        raise NotFoundError("draft")
    return _draft_response(draft)


@app.patch("/editorial/phases/{phase_id}/drafts/{draft_id}", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_update_draft(
    phase_id: str,
    draft_id: str,
    payload: EditorialDraftUpdateRequest,
    editorial: object = Depends(editorial_subject),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    draft = await get_draft(session, draft_id)
    if draft is None or draft.phase_id != phase_id:
        raise NotFoundError("draft")
    if payload.module.phase_id != phase_id:
        raise BadRequestError("module phase does not match route phase")
    try:
        draft = await update_draft(
            session, draft, content=payload.module.model_dump(mode="json"),
            actor_id=editorial.subject.subject_id, expected_revision=payload.expected_revision,
        )
    except RuntimeError as error:
        raise ConflictError("draft revision is stale") from error
    except ValueError as error:
        raise BadRequestError("draft content is invalid") from error
    await record_audit(
        session, phase_id=phase_id, draft_id=draft_id,
        actor_id=editorial.subject.subject_id, actor_role=editorial.role, event="draft.updated",
    )
    await session.commit()
    return _draft_response(draft)


@app.post("/editorial/phases/{phase_id}/drafts/{draft_id}/validate", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_validate_draft(
    phase_id: str,
    draft_id: str,
    _: object = Depends(editorial_subject),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    draft = await get_draft(session, draft_id)
    if draft is None or draft.phase_id != phase_id:
        raise NotFoundError("draft")
    report = await validate_draft(session, draft, production=get_settings().app_env == "production")
    await session.commit()
    return {"draft_id": draft_id, "valid": not report, "validation_report": report}


@app.get("/editorial/phases/{phase_id}/drafts/{draft_id}/preview", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_preview_draft(
    phase_id: str,
    draft_id: str,
    _: object = Depends(editorial_subject),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    draft = await get_draft(session, draft_id)
    if draft is None or draft.phase_id != phase_id:
        raise NotFoundError("draft")
    return {"phase_id": phase_id, "draft_id": draft_id, "version": draft.base_version, "module": draft.content}


@app.post("/editorial/phases/{phase_id}/drafts/{draft_id}/publish", dependencies=[Depends(enforce_protected_rate_limit)])
async def editorial_publish_draft(
    phase_id: str,
    draft_id: str,
    payload: EditorialDraftPublishRequest,
    editorial: object = Depends(editorial_publisher),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    draft = await get_draft(session, draft_id)
    if draft is None or draft.phase_id != phase_id:
        raise NotFoundError("draft")
    replay = await get_publication_replay(session, payload.idempotency_key)
    if replay is not None:
        if replay.phase_id != phase_id or replay.draft_id != draft_id:
            raise ConflictError("idempotency key is already used for another publication")
        return replay.response
    current_active = await active_version_for_update(session, phase_id)
    if payload.expected_active_version is not None and payload.expected_active_version != (current_active or 0):
        raise ConflictError("active phase version is stale")
    report = await validate_draft(session, draft, production=get_settings().app_env == "production")
    if report:
        raise BadRequestError("draft validation failed", details=report)
    version = await next_version(session, phase_id)
    try:
        module = await PhaseModulePublisher(
            PhaseModuleRepository(session), PhaseModuleCache()
        ).publish(draft.content, version=version, production=get_settings().app_env == "production")
    except PublicationError as error:
        raise BadRequestError("draft publication validation failed", details=error.field_errors) from error
    response = {
        "phase_id": phase_id,
        "draft_id": draft_id,
        "version": version,
        "status": "published",
        "module": module.model_dump(mode="json"),
    }
    draft.status = "published"
    draft.published_version = version
    await record_audit(
        session, phase_id=phase_id, draft_id=draft_id, version=version,
        actor_id=editorial.subject.subject_id, actor_role=editorial.role, event="draft.published",
    )
    from app.modules.phases.orm_models import EditorialPublicationIdempotencyRecord

    session.add(
        EditorialPublicationIdempotencyRecord(
            idempotency_key=payload.idempotency_key,
            phase_id=phase_id,
            draft_id=draft_id,
            version=version,
            response=response,
        )
    )
    await session.commit()
    return response


@app.post(
    "/editorial/phases/{phase_id}/versions/{version}/deprecate",
    dependencies=[Depends(enforce_protected_rate_limit)],
)
async def editorial_deprecate_version(
    phase_id: str,
    version: int,
    payload: EditorialVersionTransitionRequest,
    _: object = Depends(editorial_publisher),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    record = await session.get(
        PhaseModuleVersion, {"phase_id": phase_id, "version": version}
    )
    if record is None:
        raise NotFoundError("phase version")
    current_active = await active_version(session, phase_id)
    if payload.expected_active_version is not None and payload.expected_active_version != (current_active or 0):
        raise ConflictError("active phase version is stale")
    if current_active == version:
        raise ConflictError("active phase version cannot be deprecated")
    record.status = "deprecated"
    await session.commit()
    active_phase_module_cache.invalidate(phase_id)
    return {"phase_id": phase_id, "version": version, "status": "deprecated"}


@app.post(
    "/editorial/phases/{phase_id}/versions/{version}/activate",
    dependencies=[Depends(enforce_protected_rate_limit)],
)
async def editorial_activate_version(
    phase_id: str,
    version: int,
    payload: EditorialVersionTransitionRequest,
    _: object = Depends(editorial_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    record = await session.get(
        PhaseModuleVersion, {"phase_id": phase_id, "version": version}
    )
    if record is None:
        raise NotFoundError("phase version")
    current_active = await active_version(session, phase_id)
    if payload.expected_active_version is not None and payload.expected_active_version != (current_active or 0):
        raise ConflictError("active phase version is stale")
    active = await session.get(PhaseModuleActive, phase_id)
    if active is None:
        session.add(PhaseModuleActive(phase_id=phase_id, version=version))
    else:
        active.version = version
    record.status = "published"
    await session.commit()
    active_phase_module_cache.invalidate(phase_id)
    return {"phase_id": phase_id, "version": version, "status": "published"}


@app.post(
    "/editorial/phases/{phase_id}/versions/{version}/rollback",
    dependencies=[Depends(enforce_protected_rate_limit)],
)
async def editorial_rollback_version(
    phase_id: str,
    version: int,
    payload: EditorialVersionTransitionRequest,
    editorial: object = Depends(editorial_admin),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    target = await session.get(
        PhaseModuleVersion, {"phase_id": phase_id, "version": version}
    )
    if target is None:
        raise NotFoundError("phase version")
    current_active = await active_version(session, phase_id)
    if current_active == version:
        raise ConflictError("phase version is already active")
    if payload.expected_active_version is not None and payload.expected_active_version != (current_active or 0):
        raise ConflictError("active phase version is stale")
    previous = (
        await session.get(PhaseModuleVersion, {"phase_id": phase_id, "version": current_active})
        if current_active is not None
        else None
    )
    active = await session.get(PhaseModuleActive, phase_id)
    if active is None:
        session.add(PhaseModuleActive(phase_id=phase_id, version=version))
    else:
        active.version = version
    if previous is not None:
        previous.status = "deprecated"
    target.status = "published"
    await record_audit(
        session,
        phase_id=phase_id,
        version=version,
        actor_id=editorial.subject.subject_id,
        actor_role=editorial.role,
        event="version.rollback",
    )
    await session.commit()
    active_phase_module_cache.invalidate(phase_id)
    return {
        "phase_id": phase_id,
        "version": version,
        "previous_version": current_active,
        "status": "published",
    }


@app.get("/account/{user_id}/export", response_model=AccountDataExport, dependencies=[Depends(enforce_protected_rate_limit)])
async def export_account(
    user_id: str,
    subject: AuthenticatedSubject = Depends(authenticated_subject),
    session: AsyncSession = Depends(get_session),
) -> AccountDataExport:
    owner_id = authorize_subject_scope(subject, user_id)
    return await export_account_data(session, owner_id)


@app.delete("/account/{user_id}/data", dependencies=[Depends(enforce_protected_rate_limit)])
async def delete_account(
    user_id: str,
    payload: AccountDeleteRequest,
    subject: AuthenticatedSubject = Depends(authenticated_subject),
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    owner_id = authorize_subject_scope(subject, user_id)
    if not payload.confirm:
        raise BadRequestError("Deletion requires explicit confirmation.")
    await delete_account_data(session, owner_id)
    return {"deleted": True}


@app.get("/health/live", tags=["operational"])
async def live_health() -> dict[str, str]:
    return {"status": "ok", "service": "lifecurriculum-api"}


@app.get("/health/ready", tags=["operational"])
async def ready_health(
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Response:
    """Check database reachability with a bounded probe before accepting traffic."""
    session_type = type(session)
    async with _readiness_lock:
        if _readiness_cache.get(session_type, 0) > monotonic():
            return JSONResponse(
                status_code=200,
                content={"status": "ok", "service": "lifecurriculum-api"},
            )
        try:
            await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=1.0)
        except Exception:
            logger.warning("application.readiness.failed", exc_info=True)
            return JSONResponse(
                status_code=503,
                content={"status": "unready", "service": "lifecurriculum-api"},
            )
        _readiness_cache[session_type] = monotonic() + settings.readiness_cache_seconds
    if settings.approved_source_provider_url and not await grounding_provider.healthcheck():
        logger.warning("application.readiness.grounding_provider_failed")
        return JSONResponse(
            status_code=503,
            content={"status": "unready", "service": "lifecurriculum-api"},
        )
    return JSONResponse(
        status_code=200,
        content={"status": "ok", "service": "lifecurriculum-api"},
    )


@app.get("/phases", response_model=list[PublishedPhaseModule], tags=["phases"])
async def phase_catalog(
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> list[PublishedPhaseModule]:
    return await list_persisted_modules(session)


@app.get("/phases/{phase_id}", response_model=PublishedPhaseModule, tags=["phases"])
async def phase_module(
    phase_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> PublishedPhaseModule:
    module = await get_persisted_module(session, phase_id)
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
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> RoadmapResponse:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
    return await persistent_roadmap(
        session,
        published.module,
        version=published.version,
        user_id=authorized_user_id,
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
    "/notifications/preferences/{user_id}",
    response_model=NotificationPreference,
    tags=["notifications"],
)
async def notification_preferences(
    user_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> NotificationPreference:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    preference = await NotificationPreferenceRepository(session).get(authorized_user_id)
    return preference or NotificationPreference(user_id=authorized_user_id)


@app.put(
    "/notifications/preferences/{user_id}",
    response_model=NotificationPreference,
    tags=["notifications"],
)
async def save_notification_preferences(
    user_id: str,
    request: NotificationPreferenceUpdate,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> NotificationPreference:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    return await NotificationPreferenceRepository(session).upsert(
        authorized_user_id, request
    )


@app.get(
    "/enrollment/{user_id}",
    response_model=list[Enrollment],
    tags=["enrollment"],
)
async def active_enrollments(
    user_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> list[Enrollment]:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    return await EnrollmentRepository(session).active(authorized_user_id)


@app.get(
    "/enrollment/{user_id}/history",
    response_model=list[EnrollmentLifecycleEvent],
    tags=["enrollment"],
)
async def enrollment_history(
    user_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> list[EnrollmentLifecycleEvent]:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    return await EnrollmentRepository(session).history(authorized_user_id)


@app.get(
    "/enrollment/{user_id}/{phase_id}",
    response_model=Enrollment,
    tags=["enrollment"],
)
async def enrollment(
    user_id: str,
    phase_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> Enrollment:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    enrollment_record = await EnrollmentRepository(session).get(
        authorized_user_id, phase_id
    )
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
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> Enrollment:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
    try:
        enrollment_value = validate_enrollment(
            published.module,
            user_id=authorized_user_id,
            phase_id=phase_id,
            context=request.context,
            progress_anchor=request.progress_anchor,
        )
    except ValueError as error:
        raise BadRequestError(str(error)) from error
    await EnrollmentRepository(session).save(enrollment_value)
    saved = await EnrollmentRepository(session).get(authorized_user_id, phase_id)
    if saved is None:
        raise NotFoundError("enrollment")
    return saved


async def _transition_enrollment(
    user_id: str,
    phase_id: str,
    event: str,
    session: AsyncSession,
    subject: AuthenticatedSubject,
) -> Enrollment:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    try:
        return await EnrollmentRepository(session).transition(
            authorized_user_id, phase_id, event
        )
    except ValueError as error:
        raise ConflictError(str(error)) from error


@app.post(
    "/enrollment/{user_id}/{phase_id}/complete",
    response_model=Enrollment,
    tags=["enrollment"],
)
async def complete_enrollment(
    user_id: str,
    phase_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> Enrollment:
    return await _transition_enrollment(user_id, phase_id, "completed", session, subject)


@app.post(
    "/enrollment/{user_id}/{phase_id}/archive",
    response_model=Enrollment,
    tags=["enrollment"],
)
async def archive_enrollment(
    user_id: str,
    phase_id: str,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> Enrollment:
    return await _transition_enrollment(user_id, phase_id, "archived", session, subject)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


@app.post("/ask/{user_id}/{phase_id}", response_model=AskResponse, tags=["ask"])
async def ask(
    user_id: str,
    phase_id: str,
    request: AskRequest,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> AskResponse:
    authorize_subject_scope(subject, user_id)
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
    try:
        return await answer_question(
            published.module,
            version=published.version,
            question=request.question,
            provider=grounding_provider,
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
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> RoadmapResponse:
    authorized_user_id = authorize_subject_scope(subject, user_id)
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
            user_id=authorized_user_id,
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
    subject: AuthenticatedSubject = Depends(authenticated_subject),  # noqa: B008
    _rate_limit: None = Depends(enforce_protected_rate_limit),  # noqa: B008
) -> RoadmapResponse:
    authorized_user_id = authorize_subject_scope(subject, user_id)
    published = await get_persisted_module(session, phase_id)
    if published is None:
        raise NotFoundError("phase")
    try:
        return await apply_persistent_action(
            session,
            published.module,
            version=published.version,
            user_id=authorized_user_id,
            concern_id=request.concern_id,
            action=request.action,
            stage=request.stage,
            idempotency_key=request.idempotency_key,
            today=date.today(),
        )
    except ValueError as error:
        raise BadRequestError(str(error)) from error


@app.get("/metrics", include_in_schema=False)
async def metrics(
    metrics_token: str | None = Header(None, alias="X-Metrics-Token")
) -> Response:
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
