from dataclasses import dataclass
import time
from typing import Any, Awaitable, Literal, Protocol

import httpx
import jwt

from fastapi import Depends, Header

from app.core.errors import AuthenticationRequiredError, ForbiddenError
from app.core.settings import get_settings


@dataclass(frozen=True)
class AuthenticatedSubject:
    """The only identity value protected handlers may use."""

    subject_id: str
    source: Literal["local_header", "configured_provider"]


class IdentityProvider(Protocol):
    """Provider-neutral seam for validating an Authorization credential.

    Implementations own token parsing, signature checks, and claim validation.
    The API layer only receives a safe subject identifier.
    """

    def resolve(self, authorization: str) -> Awaitable[AuthenticatedSubject | None]: ...


_identity_provider: IdentityProvider | None = None


class JWKSIdentityProvider:
    """Validate Clerk/Firebase RS256 bearer tokens using configured JWKS."""

    def __init__(self, *, issuer: str, audience: str, jwks_url: str) -> None:
        self.issuer = issuer
        self.audience = audience
        self.jwks_url = jwks_url
        self._keys: dict[str, dict[str, Any]] = {}
        self._expires_at = 0.0

    async def _load_keys(self) -> dict[str, dict[str, Any]]:
        if self._keys and time.monotonic() < self._expires_at:
            return self._keys
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(self.jwks_url)
            response.raise_for_status()
            payload = response.json()
        keys = payload.get("keys", [])
        if not isinstance(keys, list):
            raise ValueError("invalid JWKS response")
        self._keys = {str(key["kid"]): key for key in keys if "kid" in key}
        self._expires_at = time.monotonic() + 300
        return self._keys

    async def resolve(self, authorization: str) -> AuthenticatedSubject | None:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return None
        header = jwt.get_unverified_header(token)
        if header.get("alg") != "RS256" or not header.get("kid"):
            return None
        key = (await self._load_keys()).get(str(header["kid"]))
        if key is None:
            return None
        signing_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=self.audience,
            issuer=self.issuer,
            options={"require": ["sub", "iss", "aud", "exp"]},
        )
        subject_id = claims.get("sub")
        if not isinstance(subject_id, str) or not subject_id:
            return None
        return AuthenticatedSubject(subject_id=subject_id, source="configured_provider")


def configure_identity_provider(provider: IdentityProvider | None) -> None:
    """Install the production identity adapter at application composition time."""

    global _identity_provider
    _identity_provider = provider


def configure_identity_provider_from_settings() -> None:
    settings = get_settings()
    if (
        settings.identity_provider
        and settings.identity_issuer
        and settings.identity_audience
        and settings.identity_jwks_url
    ):
        configure_identity_provider(
            JWKSIdentityProvider(
                issuer=str(settings.identity_issuer),
                audience=settings.identity_audience,
                jwks_url=str(settings.identity_jwks_url),
            )
        )


@dataclass(frozen=True)
class EditorialSubject:
    subject: AuthenticatedSubject
    role: Literal["editor", "publisher", "admin"]


async def authenticated_subject(
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> AuthenticatedSubject:
    """Resolve a subject through an explicit environment-scoped adapter.

    The header adapter exists only for local development and tests. A real
    provider adapter must be added before production authentication is enabled.
    """

    settings = get_settings()
    if settings.app_env in {"development", "test"} and x_user_id:
        return AuthenticatedSubject(subject_id=x_user_id, source="local_header")
    if settings.app_env == "production" and _identity_provider and authorization:
        try:
            subject = await _identity_provider.resolve(authorization)
        except Exception:
            # Provider failures must not leak token/parser details to callers.
            subject = None
        if subject is not None:
            if subject.source != "configured_provider":
                return AuthenticatedSubject(
                    subject_id=subject.subject_id, source="configured_provider"
                )
            return subject
    raise AuthenticationRequiredError()


async def editorial_subject(
    subject: AuthenticatedSubject = Depends(authenticated_subject),
    x_user_role: str | None = Header(default=None, alias="X-User-Role"),
) -> EditorialSubject:
    """Resolve an editorial role through the local adapter until provider claims exist."""

    settings = get_settings()
    if settings.app_env not in {"development", "test"}:
        raise AuthenticationRequiredError()
    if x_user_role not in {"editor", "publisher", "admin"}:
        raise ForbiddenError("editorial role required")
    return EditorialSubject(subject=subject, role=x_user_role)


async def editorial_publisher(
    editorial: EditorialSubject = Depends(editorial_subject),
) -> EditorialSubject:
    if editorial.role not in {"publisher", "admin"}:
        raise ForbiddenError("publisher role required")
    return editorial


async def editorial_admin(
    editorial: EditorialSubject = Depends(editorial_subject),
) -> EditorialSubject:
    if editorial.role != "admin":
        raise ForbiddenError("admin role required")
    return editorial


def authorize_subject_scope(
    subject: AuthenticatedSubject, resource_subject_id: str
) -> str:
    """Authorize access to a user-owned resource without exposing identity data."""

    if not resource_subject_id or subject.subject_id != resource_subject_id:
        raise ForbiddenError("user scope mismatch")
    return subject.subject_id
