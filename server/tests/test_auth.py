import pytest
from fastapi.testclient import TestClient
from app.core.auth import authenticated_subject
from app.core.errors import AuthenticationRequiredError
from app.core.settings import get_settings
from app.main import app


@pytest.mark.anyio
async def test_development_header_resolves_to_an_explicit_subject() -> None:
    settings = get_settings()
    original_env = settings.app_env
    settings.app_env = "development"
    try:
        subject = await authenticated_subject("local-user")
    finally:
        settings.app_env = original_env

    assert subject.subject_id == "local-user"
    assert subject.source == "local_header"


@pytest.mark.anyio
async def test_missing_subject_returns_stable_authentication_error() -> None:
    with pytest.raises(AuthenticationRequiredError) as error:
        await authenticated_subject(None)

    assert error.value.code == "authentication_required"


@pytest.mark.anyio
async def test_production_rejects_development_header_adapter() -> None:
    settings = get_settings()
    original_env = settings.app_env
    settings.app_env = "production"
    try:
        with pytest.raises(AuthenticationRequiredError) as error:
            await authenticated_subject("local-user")
    finally:
        settings.app_env = original_env

    assert error.value.code == "authentication_required"


def test_protected_route_returns_authentication_error_without_subject() -> None:
    with TestClient(app) as client:
        response = client.get("/roadmap/local-dev-user/relocation")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"
    assert response.json()["error"]["message"] == "authentication required"


def test_subject_dependency_is_the_only_protected_route_boundary() -> None:
    route_paths = {
        route.path
        for route in app.routes
        if route.path.startswith(("/roadmap/", "/enrollment/", "/ask/"))
    }

    assert route_paths
    for route in app.routes:
        if route.path in route_paths:
            dependency_names = {
                getattr(dependency.call, "__name__", "")
                for dependency in route.dependant.dependencies
            }
            assert "authenticated_subject" in dependency_names
