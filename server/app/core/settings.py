from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    otel_exporter_otlp_endpoint: AnyHttpUrl | None = None
    allowed_origins: tuple[str, ...] = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    )
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/lifecurriculum"
    )
    metrics_access_token: str | None = None
    identity_provider: Literal["clerk", "firebase"] | None = None
    identity_issuer: AnyHttpUrl | None = None
    identity_audience: str | None = None
    identity_jwks_url: AnyHttpUrl | None = None
    approved_source_provider_url: AnyHttpUrl | None = None
    approved_source_provider_token: str | None = None
    approved_source_provider_timeout_seconds: float = 2.0
    notification_provider_url: AnyHttpUrl | None = None
    notification_provider_token: str | None = None
    notification_provider_timeout_seconds: float = 2.0
    protected_rate_limit_requests: int = 60
    protected_rate_limit_window_seconds: int = 60
    protected_rate_limit_redis_url: str | None = None
    protected_rate_limit_redis_fail_open: bool = False
    readiness_cache_seconds: float = 5.0
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
