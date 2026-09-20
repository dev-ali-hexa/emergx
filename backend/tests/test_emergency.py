"""
Focused automated tests for Phase 5 - Emergency Orchestration & Integration.
Validates POST /api/emergency, location + triage parameter validation,
urgency-driven facility filtering, service reuse, and error handling.
All tests run offline with zero external network, AI provider, or live DB dependencies.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.db.repositories import HospitalRepository, SOSLogRepository
from app.services.facility import FacilityService
from app.services.emergency import EmergencyService
from app.api.emergency import get_emergency_service
from app.schemas.emergency import EMERGENCY_DISCLAIMER

client = TestClient(app)


# ==============================================================================
# Synthetic Test Fixtures & Mock Repositories
# ==============================================================================

MOCK_HOSPITALS = [
    {
        "id": "a0000000-0000-0000-0000-000000000001",
        "name": "Central Emergency Care [DEMO]",
        "address": "100 MG Road",
        "phone": "+91-80-5550-0101",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "distance_km": 1.45,
        "specialties": ["Cardiology", "Trauma", "ICU"],
        "emergency_available": True,
        "beds_available": 18,
        "is_active": True,
    },
    {
        "id": "a0000000-0000-0000-0000-000000000002",
        "name": "South Pediatric & Trauma Center [DEMO]",
        "address": "45 Jayanagar",
        "phone": "+91-80-5550-0102",
        "latitude": 12.9279,
        "longitude": 77.5837,
        "distance_km": 3.80,
        "specialties": ["Pediatrics", "Trauma"],
        "emergency_available": True,
        "beds_available": 12,
        "is_active": True,
    },
    {
        "id": "a0000000-0000-0000-0000-000000000003",
        "name": "Community General Clinic [DEMO]",
        "address": "24 Domlur",
        "phone": "+91-80-5550-0105",
        "latitude": 12.9611,
        "longitude": 77.6387,
        "distance_km": 6.20,
        "specialties": ["General Medicine", "Outpatient"],
        "emergency_available": False,  # Non-emergency clinic
        "beds_available": 0,
        "is_active": True,
    },
]


class MockHospitalRepository(HospitalRepository):
    """
    Offline mock repository replicating PostGIS ST_DWithin and ST_Distance filtering.
    """
    def __init__(self, records=None, should_fail=False):
        super().__init__(client=None)
        self.records = records if records is not None else MOCK_HOSPITALS
        self.should_fail = should_fail
        self.call_history: List[Dict[str, Any]] = []

    def get_nearby_hospitals(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        specialty: Optional[str] = None,
        emergency_only: bool = False,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        if self.should_fail:
            raise RuntimeError("Simulated PostGIS database connection failure")

        self.call_history.append({
            "latitude": latitude,
            "longitude": longitude,
            "radius_km": radius_km,
            "specialty": specialty,
            "emergency_only": emergency_only,
            "limit": limit,
        })

        results = []
        for h in self.records:
            if not h.get("is_active", True):
                continue
            if h["distance_km"] > radius_km:
                continue
            if emergency_only and not h.get("emergency_available", True):
                continue
            if specialty and specialty.lower() not in [s.lower() for s in h.get("specialties", [])]:
                continue
            results.append(h)

        results.sort(key=lambda x: x["distance_km"])
        return results[:limit]


@pytest.fixture(autouse=True)
def setup_emergency_override():
    """
    Injects EmergencyService backed by MockHospitalRepository into dependency tree.
    """
    mock_repo = MockHospitalRepository()
    facility_svc = FacilityService(hospital_repo=mock_repo)
    emergency_svc = EmergencyService(facility_service=facility_svc)
    app.dependency_overrides[get_emergency_service] = lambda: emergency_svc
    yield mock_repo, facility_svc, emergency_svc
    app.dependency_overrides.clear()


# ==============================================================================
# 1. Valid Requests & Urgency Handling (Tests 1, 2, 3, 16)
# ==============================================================================

def test_valid_critical_emergency_request(setup_emergency_override):
    """
    Test 1: Valid critical emergency request returns HTTP 200 with matching facilities.
    """
    mock_repo, _, _ = setup_emergency_override
    payload = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "urgency": "critical",
        "specialty": "Cardiology",
        "radius_km": 10.0,
        "limit": 3,
    }
    response = client.post("/api/emergency", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["urgency"] == "critical"
    assert data["specialty"] == "Cardiology"
    assert data["disclaimer"] == EMERGENCY_DISCLAIMER
    assert len(data["facilities"]) >= 1
    first_facility = data["facilities"][0]
    assert first_facility["name"] == "Central Emergency Care [DEMO]"
    assert first_facility["emergency_capable"] is True

    # Verify repository received emergency_only=True defaulted from critical urgency
    assert len(mock_repo.call_history) == 1
    assert mock_repo.call_history[0]["emergency_only"] is True


def test_valid_high_urgency_request(setup_emergency_override):
    """
    Test 2: Valid high urgency request returns HTTP 200 and defaults emergency_only=True.
    """
    mock_repo, _, _ = setup_emergency_override
    payload = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "urgency": "high",
        "specialty": "Trauma",
    }
    response = client.post("/api/emergency", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "high"
    assert mock_repo.call_history[0]["emergency_only"] is True


def test_valid_moderate_urgency_request(setup_emergency_override):
    """
    Test 3: Valid moderate urgency request defaults emergency_only=False allowing clinics.
    """
    mock_repo, _, _ = setup_emergency_override
    payload = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "urgency": "moderate",
        "specialty": "General Medicine",
    }
    response = client.post("/api/emergency", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "moderate"
    # Community clinic (non-emergency) is included
    assert mock_repo.call_history[0]["emergency_only"] is False
    assert any(f["name"] == "Community General Clinic [DEMO]" for f in data["facilities"])


def test_response_schema_correctness():
    """
    Test 16: Verify response schema strictly matches contract.
    """
    response = client.post(
        "/api/emergency",
        json={"latitude": 12.9716, "longitude": 77.5946, "urgency": "critical"},
    )
    assert response.status_code == 200
    data = response.json()
    expected_top_keys = {"urgency", "specialty", "facilities", "disclaimer"}
    assert set(data.keys()) == expected_top_keys
    for f in data["facilities"]:
        expected_facility_keys = {
            "id", "name", "address", "phone", "latitude", "longitude",
            "distance_km", "specialties", "emergency_capable", "available_beds",
        }
        assert set(f.keys()) == expected_facility_keys


# ==============================================================================
# 2. Validation Failures (Tests 4, 5, 6, 7, 8, 9)
# ==============================================================================

def test_invalid_urgency_rejected():
    """
    Test 4: Urgency outside ['critical', 'high', 'moderate'] is rejected with HTTP 422.
    """
    for bad_urgency in ["low", "emergency", "urgent", "mild", ""]:
        res = client.post(
            "/api/emergency",
            json={"latitude": 12.97, "longitude": 77.59, "urgency": bad_urgency},
        )
        assert res.status_code == 422


def test_invalid_latitude_rejected():
    """
    Test 5: Latitude outside [-90.0, 90.0] or non-numeric is rejected with HTTP 422.
    """
    assert client.post("/api/emergency", json={"latitude": 90.1, "longitude": 77.0, "urgency": "critical"}).status_code == 422
    assert client.post("/api/emergency", json={"latitude": -90.1, "longitude": 77.0, "urgency": "critical"}).status_code == 422
    assert client.post("/api/emergency", json={"latitude": "abc", "longitude": 77.0, "urgency": "critical"}).status_code == 422
    assert client.post("/api/emergency", json={"longitude": 77.0, "urgency": "critical"}).status_code == 422


def test_invalid_longitude_rejected():
    """
    Test 6: Longitude outside [-180.0, 180.0] or non-numeric is rejected with HTTP 422.
    """
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": 180.1, "urgency": "critical"}).status_code == 422
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": -180.1, "urgency": "critical"}).status_code == 422
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": "xyz", "urgency": "critical"}).status_code == 422
    assert client.post("/api/emergency", json={"latitude": 12.0, "urgency": "critical"}).status_code == 422


def test_invalid_radius_rejected():
    """
    Test 7: Radius <= 0 is rejected with HTTP 422.
    """
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "radius_km": 0.0}).status_code == 422
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "radius_km": -5.0}).status_code == 422


def test_excessive_radius_rejected():
    """
    Test 8: Radius > 100.0 km is rejected with HTTP 422.
    """
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "radius_km": 100.1}).status_code == 422


def test_invalid_limit_rejected():
    """
    Test 9: Limit <= 0 or > 50 is rejected with HTTP 422.
    """
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "limit": 0}).status_code == 422
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "limit": -1}).status_code == 422
    assert client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "limit": 51}).status_code == 422


# ==============================================================================
# 3. Specialty Normalization & Urgency-Driven Filtering (Tests 10, 11)
# ==============================================================================

def test_specialty_normalization(setup_emergency_override):
    """
    Test 10: Specialty whitespace is trimmed, and empty/whitespace becomes null.
    """
    mock_repo, _, _ = setup_emergency_override

    # Whitespace trimmed
    r1 = client.post(
        "/api/emergency",
        json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "specialty": "   Cardiology   "},
    )
    assert r1.status_code == 200
    assert r1.json()["specialty"] == "Cardiology"
    assert mock_repo.call_history[-1]["specialty"] == "Cardiology"

    # Whitespace-only converted to null
    r2 = client.post(
        "/api/emergency",
        json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "specialty": "    "},
    )
    assert r2.status_code == 200
    assert r2.json()["specialty"] is None
    assert mock_repo.call_history[-1]["specialty"] is None


def test_urgency_and_explicit_emergency_only_filtering(setup_emergency_override):
    """
    Test 11: Validates emergency_only defaults per urgency, and verifies explicit override.
    """
    mock_repo, _, _ = setup_emergency_override

    # Critical defaults to emergency_only = True
    client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical"})
    assert mock_repo.call_history[-1]["emergency_only"] is True

    # High defaults to emergency_only = True
    client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "high"})
    assert mock_repo.call_history[-1]["emergency_only"] is True

    # Moderate defaults to emergency_only = False
    client.post("/api/emergency", json={"latitude": 12.0, "longitude": 77.0, "urgency": "moderate"})
    assert mock_repo.call_history[-1]["emergency_only"] is False

    # Explicit override: critical with emergency_only = False
    client.post(
        "/api/emergency",
        json={"latitude": 12.0, "longitude": 77.0, "urgency": "critical", "emergency_only": False},
    )
    assert mock_repo.call_history[-1]["emergency_only"] is False

    # Explicit override: moderate with emergency_only = True
    client.post(
        "/api/emergency",
        json={"latitude": 12.0, "longitude": 77.0, "urgency": "moderate", "emergency_only": True},
    )
    assert mock_repo.call_history[-1]["emergency_only"] is True


# ==============================================================================
# 4. Service Reuse & Ordering (Tests 12, 13, 14, 15)
# ==============================================================================

def test_facility_service_is_reused_without_duplicated_logic(setup_emergency_override):
    """
    Test 12: Verify EmergencyService delegates directly to FacilityService.
    """
    _, facility_svc, _ = setup_emergency_override
    with patch.object(facility_svc, "discover_nearby_facilities", wraps=facility_svc.discover_nearby_facilities) as spy:
        response = client.post(
            "/api/emergency",
            json={
                "latitude": 12.9716,
                "longitude": 77.5946,
                "urgency": "critical",
                "specialty": "Trauma",
                "radius_km": 15.0,
                "limit": 5,
            },
        )
        assert response.status_code == 200
        spy.assert_called_once_with(
            latitude=12.9716,
            longitude=77.5946,
            radius_km=15.0,
            specialty="Trauma",
            emergency_only=True,
            limit=5,
        )


def test_facilities_are_returned_nearest_first():
    """
    Test 13: Returned facilities must be sorted ascending by distance_km.
    """
    response = client.post(
        "/api/emergency",
        json={"latitude": 12.9716, "longitude": 77.5946, "urgency": "moderate", "radius_km": 50.0},
    )
    assert response.status_code == 200
    facilities = response.json()["facilities"]
    assert len(facilities) >= 2
    distances = [f["distance_km"] for f in facilities]
    assert distances == sorted(distances)


def test_no_facilities_found_returns_200_empty_list():
    """
    Test 14: When no matching facilities are found, return HTTP 200 with empty list.
    """
    response = client.post(
        "/api/emergency",
        json={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "urgency": "critical",
            "specialty": "NonExistentSpecialty12345",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["facilities"] == []
    assert data["urgency"] == "critical"
    assert data["disclaimer"] == EMERGENCY_DISCLAIMER


def test_database_failure_returns_controlled_503():
    """
    Test 15: PostGIS database failure maps to controlled HTTP 503 without leaking stack traces.
    """
    failing_repo = MockHospitalRepository(should_fail=True)
    failing_facility_svc = FacilityService(hospital_repo=failing_repo)
    failing_emergency_svc = EmergencyService(facility_service=failing_facility_svc)
    app.dependency_overrides[get_emergency_service] = lambda: failing_emergency_svc

    try:
        response = client.post(
            "/api/emergency",
            json={"latitude": 12.9716, "longitude": 77.5946, "urgency": "critical"},
        )
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "Database service is currently unavailable" in data["detail"]
        assert "Traceback" not in str(data)
        assert "PostGIS" not in str(data)
    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 5. Isolation Boundaries (Tests 17, 18)
# ==============================================================================

def test_no_sos_record_created_by_emergency_endpoint():
    """
    Test 17: Verify POST /api/emergency does NOT create an SOS log entry.
    """
    with patch.object(SOSLogRepository, "create", MagicMock()) as mock_sos_create:
        response = client.post(
            "/api/emergency",
            json={"latitude": 12.9716, "longitude": 77.5946, "urgency": "critical"},
        )
        assert response.status_code == 200
        mock_sos_create.assert_not_called()


def test_no_ai_provider_or_network_call_made():
    """
    Test 18: Verify POST /api/emergency does NOT make outbound HTTP or AI provider calls.
    """
    with patch("httpx.post") as mock_http_post, patch("httpx.get") as mock_http_get:
        response = client.post(
            "/api/emergency",
            json={"latitude": 12.9716, "longitude": 77.5946, "urgency": "critical"},
        )
        assert response.status_code == 200
        mock_http_post.assert_not_called()
        mock_http_get.assert_not_called()
