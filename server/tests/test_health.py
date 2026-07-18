from app.main import app
from fastapi.testclient import TestClient


def test_live_health_returns_service_status_and_request_id() -> None:
    client = TestClient(app)

    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "lifecurriculum-api"}
    assert response.headers["X-Request-ID"]


def test_request_id_is_preserved_and_trace_header_is_safe() -> None:
    with TestClient(app) as client:
        response = client.get("/phases", headers={"X-Request-ID": "test-request"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "test-request"
    assert "X-Trace-ID" in response.headers
    assert len(response.headers["X-Trace-ID"]) in {0, 32}


def test_metrics_endpoint_exposes_http_request_metric() -> None:
    client = TestClient(app)

    client.get("/health/live")
    response = client.get("/metrics")

    assert response.status_code == 200
    assert "lifecurriculum_http_requests_total" in response.text


def test_validation_errors_have_stable_code_and_safe_details() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/roadmap/user/relocation/actions",
            json={"concern_id": "x", "action": "invalid", "stage": "arrived"},
            headers={"X-User-ID": "user"},
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert response.json()["error"]["message"] == "request validation failed"
    assert response.json()["error"]["details"]
