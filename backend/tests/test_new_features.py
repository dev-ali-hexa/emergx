"""
Automated tests for new features:
1. GET /api/facilities/all
2. PATCH /api/facilities/{id}/beds
3. GET /api/sos (recent incident stream)
4. GET /api/blood-banks (geospatial blood bank discovery)
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app

client = TestClient(app)


def test_get_all_facilities_registry():
    """Verify GET /api/facilities/all returns registered hospitals."""
    response = client.get("/api/facilities/all")
    assert response.status_code == 200
    data = response.json()
    assert "facilities" in data
    assert "count" in data
    assert data["count"] >= 10
    assert any(h["name"] == "Bombay Hospital Indore" for h in data["facilities"])


def test_update_facility_beds():
    """Verify PATCH /api/facilities/{id}/beds updates bed counts."""
    response = client.patch(
        "/api/facilities/hosp-indore-1/beds",
        json={"beds": 25, "status": "AVAILABLE"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["beds"] == 25
    assert data["facility_id"] == "hosp-indore-1"


def test_get_recent_sos_incidents():
    """Verify GET /api/sos returns recent emergency distress logs."""
    # First create an SOS
    create_res = client.post(
        "/api/sos",
        json={
            "latitude": 22.7533,
            "longitude": 75.8937,
            "message": "Automated test SOS emergency incident",
        },
    )
    assert create_res.status_code == 201

    # Fetch recent SOS incidents
    get_res = client.get("/api/sos?limit=5")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "incidents" in data
    assert "count" in data
    assert data["count"] >= 1
    assert any("Automated test SOS" in inc.get("message", "") for inc in data["incidents"])


def test_get_nearby_blood_banks():
    """Verify GET /api/blood-banks finds nearby blood depositories with group matching."""
    response = client.get("/api/blood-banks?latitude=22.7196&longitude=75.8577&blood_group=O%2B&radius_km=25")
    assert response.status_code == 200
    data = response.json()
    assert "blood_banks" in data
    assert "count" in data
    assert data["count"] >= 1
    # Check that returned blood banks contain O+
    for bank in data["blood_banks"]:
        assert "O+" in bank["available_blood_groups"]
        assert "distance_km" in bank
