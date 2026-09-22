"""
Focused automated tests for Phase 3 - Geospatial Facility Discovery.
All tests run offline with zero external network or live database dependencies.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.db.repositories import HospitalRepository
from app.services.facility import FacilityService
from app.services.exceptions import DatabaseServiceError
from app.api.facilities import get_facility_service

client = TestClient(app)


# ==============================================================================
# Synthetic Test Fixtures & Mock Repository
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
        "emergency_available": False,
        "beds_available": 0,
        "is_active": True,
    },
    {
        "id": "a0000000-0000-0000-0000-000000000004",
        "name": "Northside Stroke Institute [DEMO]",
        "address": "5 Bellary Rd",
        "phone": "+91-80-5550-0107",
        "latitude": 13.0358,
        "longitude": 77.5970,
        "distance_km": 14.50,
        "specialties": ["Neurology", "Cardiology"],
        "emergency_available": True,
        "beds_available": 6,
        "is_active": True,
    },
    {
        "id": "a0000000-0000-0000-0000-000000000005",
        "name": "Decommissioned Medical Center [INACTIVE]",
        "address": "99 Old Airport Rd",
        "phone": "+91-80-5550-0999",
        "latitude": 12.9600,
        "longitude": 77.6300,
        "distance_km": 2.10,
        "specialties": ["Cardiology"],
        "emergency_available": True,
        "beds_available": 5,
        "is_active": False,  # Inactive hospital must be excluded
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
            raise RuntimeError("Simulated database connection failure")

        results = []
        for h in self.records:
            # 1. Inactive hospitals are strictly excluded
            if not h.get("is_active", True):
                continue

            # 2. Radius filter
            if h["distance_km"] > radius_km:
                continue

            # 3. Emergency-only filter
            if emergency_only and not h.get("emergency_available", False):
                continue

            # 4. Specialty filter (case-insensitive)
            if specialty:
                clean_spec = specialty.strip().lower()
                hospital_specs = [s.lower() for s in h.get("specialties", [])]
                if clean_spec not in hospital_specs:
                    continue

            results.append(h)

        # 5. Nearest-first ordering
        results.sort(key=lambda x: x["distance_km"])

        # 6. Result limit
        return results[:limit]


# ==============================================================================
# Phase 3 Test Cases
# ==============================================================================

def test_valid_facility_discovery_request():
    """1. Valid facility request returns 200 OK and expected facilities list."""
    mock_service = FacilityService(hospital_repo=MockHospitalRepository())
    app.dependency_overrides[get_facility_service] = lambda: mock_service

    try:
        response = client.get("/api/facilities?latitude=12.9716&longitude=77.5946")
        assert response.status_code == 200
        data = response.json()
        assert "facilities" in data
        assert isinstance(data["facilities"], list)
        assert len(data["facilities"]) > 0
    finally:
        app.dependency_overrides.clear()


def test_invalid_latitude_rejected():
    """2. Invalid latitude (< -90 or > 90) returns 422."""
    resp_high = client.get("/api/facilities?latitude=91.5&longitude=77.59")
    assert resp_high.status_code == 422

    resp_low = client.get("/api/facilities?latitude=-90.1&longitude=77.59")
    assert resp_low.status_code == 422


def test_invalid_longitude_rejected():
    """3. Invalid longitude (< -180 or > 180) returns 422."""
    resp_high = client.get("/api/facilities?latitude=12.97&longitude=180.5")
    assert resp_high.status_code == 422

    resp_low = client.get("/api/facilities?latitude=12.97&longitude=-181.0")
    assert resp_low.status_code == 422


def test_invalid_radius_rejected():
    """4. Invalid radius (<= 0) returns 422."""
    resp_zero = client.get("/api/facilities?latitude=12.97&longitude=77.59&radius_km=0")
    assert resp_zero.status_code == 422

    resp_neg = client.get("/api/facilities?latitude=12.97&longitude=77.59&radius_km=-5.0")
    assert resp_neg.status_code == 422


def test_excessive_radius_rejected():
    """5. Excessive radius (> 100 km) returns 422."""
    resp = client.get("/api/facilities?latitude=12.97&longitude=77.59&radius_km=100.1")
    assert resp.status_code == 422


def test_invalid_limit_rejected():
    """6. Invalid limit (<= 0) returns 422."""
    resp_zero = client.get("/api/facilities?latitude=12.97&longitude=77.59&limit=0")
    assert resp_zero.status_code == 422

    resp_neg = client.get("/api/facilities?latitude=12.97&longitude=77.59&limit=-10")
    assert resp_neg.status_code == 422


def test_excessive_limit_rejected():
    """7. Excessive limit (> 50) returns 422."""
    resp = client.get("/api/facilities?latitude=12.97&longitude=77.59&limit=51")
    assert resp.status_code == 422


def test_specialty_filtering():
    """8. Specialty filter returns only facilities offering the requested specialty."""
    mock_service = FacilityService(hospital_repo=MockHospitalRepository())
    app.dependency_overrides[get_facility_service] = lambda: mock_service

    try:
        response = client.get(
            "/api/facilities?latitude=12.97&longitude=77.59&radius_km=20&specialty=Pediatrics"
        )
        assert response.status_code == 200
        facilities = response.json()["facilities"]
        assert len(facilities) == 1
        assert "Pediatrics" in facilities[0]["specialties"]
    finally:
        app.dependency_overrides.clear()


def test_emergency_only_filtering():
    """9. emergency_only=true returns only emergency-capable facilities."""
    mock_service = FacilityService(hospital_repo=MockHospitalRepository())
    app.dependency_overrides[get_facility_service] = lambda: mock_service

    try:
        response = client.get(
            "/api/facilities?latitude=12.97&longitude=77.59&radius_km=10&emergency_only=true"
        )
        assert response.status_code == 200
        facilities = response.json()["facilities"]
        for f in facilities:
            assert f["emergency_capable"] is True
    finally:
        app.dependency_overrides.clear()


def test_inactive_hospitals_are_excluded():
    """10. Inactive hospitals are never returned, even if nearby."""
    mock_service = FacilityService(hospital_repo=MockHospitalRepository())
    app.dependency_overrides[get_facility_service] = lambda: mock_service

    try:
        response = client.get("/api/facilities?latitude=12.97&longitude=77.59&radius_km=20")
        assert response.status_code == 200
        names = [f["name"] for f in response.json()["facilities"]]
        assert "Decommissioned Medical Center [INACTIVE]" not in names
    finally:
        app.dependency_overrides.clear()


def test_radius_filtering():
    """11. Facilities outside the specified radius are excluded."""
    mock_service = FacilityService(hospital_repo=MockHospitalRepository())
    app.dependency_overrides[get_facility_service] = lambda: mock_service

    try:
        # Search radius of 5.0 km should exclude hospitals at 6.20 km and 14.50 km
        response = client.get("/api/facilities?latitude=12.97&longitude=77.59&radius_km=5.0")
        assert response.status_code == 200
        facilities = response.json()["facilities"]
        for f in facilities:
            assert f["distance_km"] <= 5.0
    finally:
        app.dependency_overrides.clear()


def test_nearest_first_ordering():
    """12. Facilities are strictly ordered nearest-first (ascending distance)."""
    mock_service = FacilityService(hospital_repo=MockHospitalRepository())
    app.dependency_overrides[get_facility_service] = lambda: mock_service

    try:
        response = client.get("/api/facilities?latitude=12.97&longitude=77.59&radius_km=20")
        assert response.status_code == 200
        distances = [f["distance_km"] for f in response.json()["facilities"]]
        assert distances == sorted(distances)
    finally:
        app.dependency_overrides.clear()


def test_distance_km_is_returned_and_numeric():
    """13. Each facility includes numeric distance_km."""
    mock_service = FacilityService(hospital_repo=MockHospitalRepository())
    app.dependency_overrides[get_facility_service] = lambda: mock_service

    try:
        response = client.get("/api/facilities?latitude=12.97&longitude=77.59")
        assert response.status_code == 200
        first = response.json()["facilities"][0]
        assert "distance_km" in first
        assert isinstance(first["distance_km"], (int, float))
        assert first["distance_km"] >= 0.0
    finally:
        app.dependency_overrides.clear()


def test_no_result_returns_200_empty_list():
    """14. If no facilities match, returns HTTP 200 with empty list (no server error)."""
    mock_service = FacilityService(hospital_repo=MockHospitalRepository(records=[]))
    app.dependency_overrides[get_facility_service] = lambda: mock_service

    try:
        response = client.get("/api/facilities?latitude=12.97&longitude=77.59&radius_km=1.0")
        assert response.status_code == 200
        assert response.json() == {"facilities": []}
    finally:
        app.dependency_overrides.clear()


def test_database_failure_returns_controlled_503():
    """15. Database/repository error maps to controlled HTTP 503 without leaking raw stack trace."""
    failing_service = FacilityService(hospital_repo=MockHospitalRepository(should_fail=True))
    app.dependency_overrides[get_facility_service] = lambda: failing_service

    try:
        response = client.get("/api/facilities?latitude=12.97&longitude=77.59")
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()
