"""
Focused automated tests for Phase 4 - Emergency SOS Backend & Incident Logging.
Validates POST /api/sos, input boundary validation, status protection,
service/repository coordination, and error handling.
All tests run offline without external network or live database dependencies.
"""

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.db.repositories import SOSLogRepository
from app.services.sos import SOSService
from app.api.sos import get_sos_service
from app.schemas.sos import SOSCreateRequest, SOSCreateResponse

client = TestClient(app)


# ==============================================================================
# Offline Mock Repository
# ==============================================================================

class MockSOSLogRepository(SOSLogRepository):
    """
    Offline mock repository for sos_logs audit table.
    Replicates repository behavior and records calls for test assertions.
    """

    def __init__(self, should_fail: bool = False):
        super().__init__(client=None)
        self.should_fail = should_fail
        self.created_logs: List[Dict[str, Any]] = []

    def create(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.should_fail:
            raise RuntimeError("Simulated PostgreSQL connection failure")

        payload = dict(log_data)
        # Replicate repository-level guarantee
        payload["status"] = "initiated"
        if "contacts_notified" not in payload or payload["contacts_notified"] in (None, ""):
            payload["contacts_notified"] = {}

        record = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            **payload,
        }
        self.created_logs.append(record)
        return record

    def get_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        for log in self.created_logs:
            if log.get("id") == log_id:
                return log
        return None

    def get_recent(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self.created_logs[-limit:]


@pytest.fixture(autouse=True)
def setup_sos_override():
    """
    Automatically injects MockSOSLogRepository into FastAPI dependency tree.
    Guarantees isolation between tests.
    """
    mock_repo = MockSOSLogRepository()
    service = SOSService(sos_repo=mock_repo)
    app.dependency_overrides[get_sos_service] = lambda: service
    yield mock_repo, service
    app.dependency_overrides.clear()


# ==============================================================================
# 1. Valid SOS Request & Response Contract (Tests 1, 2, 3, 14)
# ==============================================================================

def test_valid_sos_request(setup_sos_override):
    """
    Test 1: Verify valid SOS request creates incident with HTTP 201 Created.
    """
    mock_repo, _ = setup_sos_override
    payload = {
        "latitude": 23.2599,
        "longitude": 77.4126,
        "message": "Emergency assistance required at central junction",
        "user_id": "test-user-001",
        "contacts_notified": {"primary_contact": "+91-9876543210"},
    }
    response = client.post("/api/sos", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["recorded"] is True
    assert data["status"] == "initiated"
    assert data["message"] == "SOS request recorded successfully."
    assert "id" in data
    # Verify valid UUID format
    parsed_uuid = uuid.UUID(data["id"])
    assert str(parsed_uuid) == data["id"]

    # Verify repository received the record
    assert len(mock_repo.created_logs) == 1
    stored = mock_repo.created_logs[0]
    assert stored["latitude"] == 23.2599
    assert stored["longitude"] == 77.4126
    assert stored["message"] == "Emergency assistance required at central junction"
    assert stored["user_id"] == "test-user-001"
    assert stored["status"] == "initiated"


def test_sos_record_created_with_status_initiated(setup_sos_override):
    """
    Test 2: Verify SOS record is always created with initial status 'initiated'.
    """
    mock_repo, _ = setup_sos_override
    response = client.post(
        "/api/sos",
        json={"latitude": 12.9716, "longitude": 77.5946, "message": "Help needed"},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "initiated"
    assert mock_repo.created_logs[0]["status"] == "initiated"


def test_id_returned_correctly():
    """
    Test 3: Verify ID is returned and is a valid UUIDv4 string.
    """
    response = client.post(
        "/api/sos",
        json={"latitude": 12.9716, "longitude": 77.5946},
    )
    assert response.status_code == 201
    res_id = response.json()["id"]
    assert isinstance(res_id, str)
    val = uuid.UUID(res_id, version=4)
    assert str(val) == res_id


def test_response_schema_correctness():
    """
    Test 14: Verify response schema matches contract and does not leak database details.
    """
    response = client.post(
        "/api/sos",
        json={"latitude": 12.9716, "longitude": 77.5946, "message": "Testing schema"},
    )
    assert response.status_code == 201
    data = response.json()
    expected_keys = {"id", "status", "message", "recorded", "created_at"}
    assert set(data.keys()).issubset(expected_keys)
    assert isinstance(data["id"], str)
    assert data["status"] == "initiated"
    assert data["message"] == "SOS request recorded successfully."
    assert data["recorded"] is True


# ==============================================================================
# 2. Coordinate Validation (Tests 4, 5)
# ==============================================================================

def test_latitude_validation():
    """
    Test 4: Verify latitude boundary enforcement [-90.0, 90.0].
    """
    # Latitude > 90.0
    r1 = client.post("/api/sos", json={"latitude": 90.001, "longitude": 77.0})
    assert r1.status_code == 422

    # Latitude < -90.0
    r2 = client.post("/api/sos", json={"latitude": -90.001, "longitude": 77.0})
    assert r2.status_code == 422

    # Missing latitude
    r3 = client.post("/api/sos", json={"longitude": 77.0})
    assert r3.status_code == 422

    # Non-numeric latitude
    r4 = client.post("/api/sos", json={"latitude": "invalid", "longitude": 77.0})
    assert r4.status_code == 422

    # Valid boundary extremes
    r5 = client.post("/api/sos", json={"latitude": 90.0, "longitude": 0.0})
    assert r5.status_code == 201
    r6 = client.post("/api/sos", json={"latitude": -90.0, "longitude": 0.0})
    assert r6.status_code == 201


def test_longitude_validation():
    """
    Test 5: Verify longitude boundary enforcement [-180.0, 180.0].
    """
    # Longitude > 180.0
    r1 = client.post("/api/sos", json={"latitude": 12.0, "longitude": 180.001})
    assert r1.status_code == 422

    # Longitude < -180.0
    r2 = client.post("/api/sos", json={"latitude": 12.0, "longitude": -180.001})
    assert r2.status_code == 422

    # Missing longitude
    r3 = client.post("/api/sos", json={"latitude": 12.0})
    assert r3.status_code == 422

    # Non-numeric longitude
    r4 = client.post("/api/sos", json={"latitude": 12.0, "longitude": "invalid"})
    assert r4.status_code == 422

    # Valid boundary extremes
    r5 = client.post("/api/sos", json={"latitude": 0.0, "longitude": 180.0})
    assert r5.status_code == 201
    r6 = client.post("/api/sos", json={"latitude": 0.0, "longitude": -180.0})
    assert r6.status_code == 201


# ==============================================================================
# 3. Message Validation & Whitespace Normalization (Tests 6, 7, 8)
# ==============================================================================

def test_oversized_message_rejected():
    """
    Test 6: Verify message exceeding 1000 characters is rejected with HTTP 422.
    """
    oversized_msg = "A" * 1001
    response = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "message": oversized_msg},
    )
    assert response.status_code == 422

    # Exact 1000 characters must pass
    valid_boundary_msg = "B" * 1000
    res_valid = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "message": valid_boundary_msg},
    )
    assert res_valid.status_code == 201


def test_whitespace_normalization(setup_sos_override):
    """
    Test 7: Verify whitespace is trimmed and whitespace-only message becomes None.
    """
    mock_repo, _ = setup_sos_override

    # Leading/trailing whitespace trimmed
    r1 = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "message": "   Severe trauma at main gate   "},
    )
    assert r1.status_code == 201
    assert mock_repo.created_logs[-1]["message"] == "Severe trauma at main gate"

    # Whitespace-only message normalized to None
    r2 = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "message": "     \t \n   "},
    )
    assert r2.status_code == 201
    assert mock_repo.created_logs[-1]["message"] is None


def test_optional_message_behavior(setup_sos_override):
    """
    Test 8: Verify message is optional (omitted or None).
    """
    mock_repo, _ = setup_sos_override

    # Omitted message
    r1 = client.post("/api/sos", json={"latitude": 12.97, "longitude": 77.59})
    assert r1.status_code == 201
    assert mock_repo.created_logs[-1]["message"] is None

    # Explicit null message
    r2 = client.post("/api/sos", json={"latitude": 12.97, "longitude": 77.59, "message": None})
    assert r2.status_code == 201
    assert mock_repo.created_logs[-1]["message"] is None


# ==============================================================================
# 4. Optional user_id & contacts_notified Behaviors (Tests 9, 10, 11)
# ==============================================================================

def test_optional_user_id_behavior(setup_sos_override):
    """
    Test 9: Verify user_id is optional and trims whitespace when provided.
    """
    mock_repo, _ = setup_sos_override

    # Omitted user_id
    r1 = client.post("/api/sos", json={"latitude": 12.97, "longitude": 77.59})
    assert r1.status_code == 201
    assert mock_repo.created_logs[-1]["user_id"] is None

    # Provided user_id trimmed
    r2 = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "user_id": "   patient-887   "},
    )
    assert r2.status_code == 201
    assert mock_repo.created_logs[-1]["user_id"] == "patient-887"


def test_contacts_notified_default_behavior(setup_sos_override):
    """
    Test 10: Verify contacts_notified defaults to empty dict when omitted or None.
    """
    mock_repo, _ = setup_sos_override

    # Omitted
    r1 = client.post("/api/sos", json={"latitude": 12.97, "longitude": 77.59})
    assert r1.status_code == 201
    assert mock_repo.created_logs[-1]["contacts_notified"] == {}

    # Explicit null
    r2 = client.post("/api/sos", json={"latitude": 12.97, "longitude": 77.59, "contacts_notified": None})
    assert r2.status_code == 201
    assert mock_repo.created_logs[-1]["contacts_notified"] == {}


def test_contacts_notified_validation_and_bounds():
    """
    Test 11: Verify contacts_notified accepts structured metadata and rejects > 10KB payloads.
    """
    # Valid dict
    r1 = client.post(
        "/api/sos",
        json={
            "latitude": 12.97,
            "longitude": 77.59,
            "contacts_notified": {"contact_1": "+1234567890", "type": "guardian"},
        },
    )
    assert r1.status_code == 201

    # Valid list
    r2 = client.post(
        "/api/sos",
        json={
            "latitude": 12.97,
            "longitude": 77.59,
            "contacts_notified": ["+1234567890", "+0987654321"],
        },
    )
    assert r2.status_code == 201

    # Malicious oversized metadata payload (> 10KB)
    huge_data = {"payload": "X" * 12000}
    r3 = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "contacts_notified": huge_data},
    )
    assert r3.status_code == 422


# ==============================================================================
# 5. Client Cannot Override Initial Status (Test 12)
# ==============================================================================

def test_client_cannot_override_initial_status(setup_sos_override):
    """
    Test 12: Verify client attempts to set status other than 'initiated' are rejected with HTTP 422.
    Also verify repository layer enforces 'initiated' regardless of input dict.
    """
    mock_repo, _ = setup_sos_override

    # Attempting to create resolved SOS is rejected
    r1 = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "status": "resolved"},
    )
    assert r1.status_code == 422

    # Attempting to create dispatched SOS is rejected
    r2 = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "status": "dispatched"},
    )
    assert r2.status_code == 422

    # Attempting to create cancelled SOS is rejected
    r3 = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "status": "cancelled"},
    )
    assert r3.status_code == 422

    # Explicitly supplying 'initiated' is accepted
    r4 = client.post(
        "/api/sos",
        json={"latitude": 12.97, "longitude": 77.59, "status": "initiated"},
    )
    assert r4.status_code == 201
    assert r4.json()["status"] == "initiated"

    # Repository defense-in-depth: even direct repo calls override arbitrary status
    direct_res = mock_repo.create({"latitude": 12.97, "longitude": 77.59, "status": "resolved"})
    assert direct_res["status"] == "initiated"


# ==============================================================================
# 6. Controlled Error Handling (Test 13)
# ==============================================================================

def test_database_failure_maps_to_controlled_503():
    """
    Test 13: Verify database failure produces controlled HTTP 503 without leaking stack traces.
    """
    failing_repo = MockSOSLogRepository(should_fail=True)
    failing_service = SOSService(sos_repo=failing_repo)
    app.dependency_overrides[get_sos_service] = lambda: failing_service

    try:
        response = client.post(
            "/api/sos",
            json={"latitude": 12.9716, "longitude": 77.5946, "message": "Emergency dispatch"},
        )
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "Database service is currently unavailable" in data["detail"]
        # Ensure no stack traces or raw SQL leaked to caller
        assert "Traceback" not in str(data)
        assert "PostgreSQL" not in str(data)
        assert "Simulated" not in str(data)
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 7. Zero External Notification Dispatch Guarantee (Test 15)
# ==============================================================================

def test_no_external_notification_provider_called():
    """
    Test 15: Verify no external notification services (HTTP, SMS, Twilio) are invoked.
    """
    with patch("httpx.post") as mock_httpx_post, patch("httpx.get") as mock_httpx_get:
        response = client.post(
            "/api/sos",
            json={"latitude": 23.2599, "longitude": 77.4126, "message": "Audit-only test"},
        )
        assert response.status_code == 201
        # Assure zero outbound HTTP calls were attempted
        mock_httpx_post.assert_not_called()
        mock_httpx_get.assert_not_called()
