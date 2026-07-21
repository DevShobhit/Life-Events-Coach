import json
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from app.core.auth import (
    AuthenticatedSubject,
    authenticated_subject,
    authorize_subject_scope,
    configure_identity_provider,
    JWKSIdentityProvider,
)
from app.core.errors import AuthenticationRequiredError, ForbiddenError
from app.core.settings import get_settings
from app.main import app
from fastapi.testclient import TestClient


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


@pytest.mark.anyio
async def test_configured_provider_resolves_authorization_without_exposing_token() -> None:
    class FakeProvider:
        async def resolve(self, authorization: str) -> AuthenticatedSubject:
            assert authorization == "Bearer opaque-token"
            return AuthenticatedSubject("provider-user", "local_header")

    settings = get_settings()
    original_env = settings.app_env
    configure_identity_provider(FakeProvider())
    settings.app_env = "production"
    try:
        subject = await authenticated_subject(None, "Bearer opaque-token")
    finally:
        settings.app_env = original_env
        configure_identity_provider(None)

    assert subject == AuthenticatedSubject("provider-user", "configured_provider")


@pytest.mark.anyio
async def test_provider_failure_fails_closed_with_stable_error() -> None:
    class FailingProvider:
        async def resolve(self, authorization: str) -> None:
            raise RuntimeError("token parser details")

    settings = get_settings()
    original_env = settings.app_env
    configure_identity_provider(FailingProvider())
    settings.app_env = "production"
    try:
        with pytest.raises(AuthenticationRequiredError) as error:
            await authenticated_subject(None, "Bearer invalid")
    finally:
        settings.app_env = original_env
        configure_identity_provider(None)

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


def test_authorize_subject_scope_accepts_only_the_matching_resource_subject() -> None:
    subject = AuthenticatedSubject(subject_id="local-user", source="local_header")

    assert authorize_subject_scope(subject, "local-user") == "local-user"

    with pytest.raises(ForbiddenError) as error:
        authorize_subject_scope(subject, "other-user")

    assert error.value.code == "forbidden"


def test_authorize_subject_scope_rejects_empty_resource_subject() -> None:
    subject = AuthenticatedSubject(subject_id="local-user", source="local_header")

    with pytest.raises(ForbiddenError):
        authorize_subject_scope(subject, "")


def test_identity_provider_settings_support_clerk_and_firebase() -> None:
    settings = get_settings()
    original = (settings.identity_provider, settings.identity_issuer, settings.identity_audience)
    try:
        settings.identity_provider = "clerk"
        settings.identity_audience = "api"
        assert settings.identity_provider == "clerk"
        settings.identity_provider = "firebase"
        assert settings.identity_provider == "firebase"
    finally:
        settings.identity_provider, settings.identity_issuer, settings.identity_audience = original


@pytest.mark.anyio
async def test_jwks_provider_validates_signature_and_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key())
    provider = JWKSIdentityProvider(
        issuer="https://issuer.example",
        audience="api",
        jwks_url="https://issuer.example/.well-known/jwks.json",
    )
    monkeypatch.setattr(
        provider,
        "_load_keys",
        lambda: _async_value({"key-1": {**json.loads(public_jwk), "kid": "key-1"}}),
    )
    token = jwt.encode(
        {"sub": "user-123", "iss": "https://issuer.example", "aud": "api", "exp": datetime.now(UTC) + timedelta(minutes=5)},
        private_key,
        algorithm="RS256",
        headers={"kid": "key-1"},
    )

    subject = await provider.resolve(f"Bearer {token}")

    assert subject == AuthenticatedSubject("user-123", "configured_provider")


@pytest.mark.anyio
async def test_jwks_provider_rejects_unknown_key(monkeypatch: pytest.MonkeyPatch) -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    provider = JWKSIdentityProvider(issuer="issuer", audience="api", jwks_url="unused")
    monkeypatch.setattr(
        provider,
        "_load_keys",
        lambda: _async_value({"known": {**public_jwk, "kid": "known"}}),
    )
    token = jwt.encode(
        {"sub": "user-123", "iss": "wrong", "aud": "api", "exp": datetime.now(UTC) + timedelta(minutes=5)},
        private_key,
        algorithm="RS256",
        headers={"kid": "unknown"},
    )

    assert await provider.resolve(f"Bearer {token}") is None


async def _async_value(value):
    return value
