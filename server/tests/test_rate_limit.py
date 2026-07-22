from collections.abc import AsyncIterator

from app.core.auth import AuthenticatedSubject, authenticated_subject
from app.core.database import get_session
from app.core.errors import RateLimitExceededError
from app.core.rate_limit import SlidingWindowRateLimiter, route_family
from app.main import app, protected_rate_limiter, settings
from app.modules.phases.fixtures import LAUNCH_RELOCATION
from app.modules.phases.orm_models import Base
from app.modules.phases.repository import PhaseModuleRepository
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


async def override_rate_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await PhaseModuleRepository(session).publish(LAUNCH_RELOCATION, version=1)
        yield session
    await engine.dispose()


def test_sliding_window_allows_configured_requests_then_rejects_until_expiry() -> None:
    now = [100.0]
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=10, clock=lambda: now[0])

    assert limiter.allow("network-a") is True
    assert limiter.allow("network-a") is True
    assert limiter.allow("network-a") is False

    now[0] = 110.01
    assert limiter.allow("network-a") is True


def test_sliding_window_removes_expired_scope_state() -> None:
    now = [100.0]
    limiter = SlidingWindowRateLimiter(
        max_requests=1, window_seconds=10, clock=lambda: now[0]
    )

    assert limiter.allow("ephemeral-network") is True
    assert "ephemeral-network" in limiter._requests

    now[0] = 110.01
    assert limiter.allow("other-network") is True
    assert "ephemeral-network" not in limiter._requests


def test_sliding_window_isolates_network_scopes_without_retaining_raw_identity() -> None:
    limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=10, clock=lambda: 100.0)

    assert limiter.allow("network-a") is True
    assert limiter.allow("network-b") is True
    assert limiter.allow("network-a") is False


def test_route_family_uses_only_safe_route_categories() -> None:
    assert route_family("/roadmap/private-user/relocation") == "roadmap"
    assert route_family("/ask/private-user/relocation") == "ask"
    assert route_family("/enrollment/private-user/relocation") == "enrollment"
    assert route_family("/editorial/phases/relocation/versions") == "editorial"
    assert route_family("/phases/relocation") is None


def test_rate_limit_error_has_stable_safe_contract() -> None:
    error = RateLimitExceededError()

    assert error.status_code == 429
    assert error.code == "rate_limited"
    assert "private-user" not in error.message


def test_production_protected_route_returns_retryable_rate_limit_response() -> None:
    original_env = settings.app_env
    original_limiter = protected_rate_limiter
    app_module = __import__("app.main", fromlist=["protected_rate_limiter"])
    app_module.protected_rate_limiter = SlidingWindowRateLimiter(
        max_requests=1, window_seconds=60, clock=lambda: 100.0
    )
    settings.app_env = "production"

    async def authenticated_test_subject() -> AuthenticatedSubject:
        return AuthenticatedSubject(subject_id="rate-user", source="configured_provider")

    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[authenticated_subject] = authenticated_test_subject
    app.dependency_overrides[get_session] = override_rate_session
    try:
        with TestClient(app) as client:
            client.get(
                "/roadmap/rate-user/relocation",
                headers={"X-User-ID": "rate-user"},
            )
            response = client.get(
                "/roadmap/rate-user/relocation",
                headers={"X-User-ID": "rate-user"},
            )
    finally:
        settings.app_env = original_env
        app_module.protected_rate_limiter = original_limiter
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)

    assert response.status_code == 429
    assert response.headers["Retry-After"] == "1"
    assert response.json()["error"]["code"] == "rate_limited"
    assert "rate-user" not in response.text
