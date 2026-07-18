import logging
import sys

import structlog


def configure_logging(log_level: str) -> None:
    """Configure newline-delimited JSON logging for the application process."""
    logging.basicConfig(format="%(message)s", level=log_level, stream=sys.stdout)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.EventRenamer("event"),
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
