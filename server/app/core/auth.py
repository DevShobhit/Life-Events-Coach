from dataclasses import dataclass
from typing import Literal

from fastapi import Header

from app.core.errors import AuthenticationRequiredError
from app.core.settings import get_settings


@dataclass(frozen=True)
class AuthenticatedSubject:
    """The only identity value protected handlers may use."""

    subject_id: str
    source: Literal["local_header", "configured_provider"]


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
