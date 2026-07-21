from dataclasses import dataclass
from typing import Literal

from fastapi import Depends, Header

from app.core.errors import AuthenticationRequiredError, ForbiddenError
from app.core.settings import get_settings


@dataclass(frozen=True)
class AuthenticatedSubject:
    """The only identity value protected handlers may use."""

    subject_id: str
    source: Literal["local_header", "configured_provider"]


@dataclass(frozen=True)
class EditorialSubject:
    subject: AuthenticatedSubject
    role: Literal["editor", "publisher", "admin"]


async def authenticated_subject(
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
) -> AuthenticatedSubject:
    """Resolve a subject through an explicit environment-scoped adapter.

    The header adapter exists only for local development and tests. A real
    provider adapter must be added before production authentication is enabled.
    """

    settings = get_settings()
    if settings.app_env in {"development", "test"} and x_user_id:
        return AuthenticatedSubject(subject_id=x_user_id, source="local_header")
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


def authorize_subject_scope(
    subject: AuthenticatedSubject, resource_subject_id: str
) -> str:
    """Authorize access to a user-owned resource without exposing identity data."""

    if not resource_subject_id or subject.subject_id != resource_subject_id:
        raise ForbiddenError("user scope mismatch")
    return subject.subject_id
