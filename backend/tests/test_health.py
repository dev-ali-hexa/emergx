from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_returns_200_and_expected_payload():
    """
    Phase 0 Verification:
    Verify that GET /health returns HTTP 200 with the exact expected health status payload.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "emergex-backend",
    }


def test_root_endpoint_returns_200_and_discovery_payload():
    """
    Verify that GET / returns HTTP 200 with service information and docs/health paths.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "emergex-backend"
    assert data["status"] == "online"
    assert data["health"] == "/health"
    assert data["docs"] == "/docs"
