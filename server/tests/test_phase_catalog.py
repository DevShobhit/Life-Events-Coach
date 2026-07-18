from app.main import app
from fastapi.testclient import TestClient


def test_catalog_exposes_only_the_launch_relocation_module() -> None:
    response = TestClient(app).get("/phases")

    assert response.status_code == 200
    assert [entry["module"]["phase_id"] for entry in response.json()] == ["relocation"]


def test_phase_read_includes_version_and_citations() -> None:
    response = TestClient(app).get("/phases/relocation")

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == 1
    assert all("citation" in concern for concern in body["module"]["concerns"])


def test_unknown_phase_is_not_exposed_by_the_catalog() -> None:
    response = TestClient(app).get("/phases/new_parent")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "phase not found",
            "request_id": None,
        }
    }
