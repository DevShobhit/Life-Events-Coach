from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from app.core.settings import Settings


def configure_tracing(settings: Settings) -> None:
    """Install a service-level tracer provider without exposing request content."""
    provider = TracerProvider(
        resource=Resource.create(
            {
                "service.name": "lifecurriculum-api",
                "deployment.environment.name": settings.app_env,
            }
        )
    )
    if settings.otel_exporter_otlp_endpoint:
        endpoint = f"{str(settings.otel_exporter_otlp_endpoint).rstrip('/')}/v1/traces"
        exporter = OTLPSpanExporter(endpoint=endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))
    else:
        provider.add_span_processor(SimpleSpanProcessor(InMemorySpanExporter()))
    trace.set_tracer_provider(provider)


def instrument_fastapi(app: FastAPI) -> None:
    FastAPIInstrumentor.instrument_app(
        app, excluded_urls="health/live,health/ready,metrics"
    )
