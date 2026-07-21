from dataclasses import dataclass
from typing import Any, cast

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


@dataclass(frozen=True)
class AppError(Exception):
    status_code: int
    code: str
    message: str
    details: Any | None = None

    def __post_init__(self) -> None:
        Exception.__init__(self, self.message)


class BadRequestError(AppError):
    def __init__(self, message: str, details: Any | None = None) -> None:
        super().__init__(400, "bad_request", message, details)


class ForbiddenError(AppError):
    def __init__(self, message: str = "access denied") -> None:
        super().__init__(403, "forbidden", message)


class AuthenticationRequiredError(AppError):
    def __init__(self) -> None:
        super().__init__(401, "authentication_required", "authentication required")


class RateLimitExceededError(AppError):
    def __init__(self) -> None:
        super().__init__(429, "rate_limited", "too many requests; please retry later")


class NotFoundError(AppError):
    def __init__(self, resource: str) -> None:
        super().__init__(404, "not_found", f"{resource} not found")


class GatewayTimeoutError(AppError):
    def __init__(self, message: str = "approved source retrieval timed out") -> None:
        super().__init__(504, "gateway_timeout", message)


class DependencyUnavailableError(AppError):
    def __init__(
        self, message: str = "phase content is temporarily unavailable"
    ) -> None:
        super().__init__(503, "dependency_unavailable", message)


def _request_id(request: Request) -> str | None:
    return request.headers.get("X-Request-ID")


def _error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: Any | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "request_id": _request_id(request),
        }
    }
    if details is not None:
        body["error"]["details"] = details
    headers = {"Retry-After": "1"} if code == "rate_limited" else None
    return JSONResponse(status_code=status_code, content=body, headers=headers)


async def app_error_handler(request: Request, error: Exception) -> JSONResponse:
    app_error = cast(AppError, error)
    return _error_response(
        request,
        status_code=app_error.status_code,
        code=app_error.code,
        message=app_error.message,
        details=app_error.details,
    )


async def validation_error_handler(request: Request, error: Exception) -> JSONResponse:
    validation_error = cast(RequestValidationError, error)
    details = [
        {"location": list(item["loc"]), "message": item["msg"]}
        for item in validation_error.errors()
    ]
    return _error_response(
        request,
        status_code=422,
        code="validation_error",
        message="request validation failed",
        details=details,
    )


async def http_error_handler(request: Request, error: Exception) -> JSONResponse:
    http_error = cast(StarletteHTTPException, error)
    return _error_response(
        request,
        status_code=http_error.status_code,
        code="http_error",
        message=str(http_error.detail),
    )


async def unexpected_error_handler(request: Request, _: Exception) -> JSONResponse:
    return _error_response(
        request,
        status_code=500,
        code="internal_error",
        message="an unexpected error occurred",
    )
