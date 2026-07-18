from app.main import app
from fastapi.testclient import TestClient


def test_live_health_returns_service_status_and_request_id() -> None:
    client = TestClient(app)

    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "lifecurriculum-api"}
    assert response.headers["X-Request-ID"]


def test_metrics_endpoint_exposes_http_request_metric() -> None:
    client = TestClient(app)

    client.get("/health/live")
    response = client.get("/metrics")

    assert response.status_code == 200
    assert "lifecurriculum_http_requests_total" in response.text
