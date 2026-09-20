import sys
from pathlib import Path
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.db import (
    is_supabase_configured,
    verify_database_connection,
    HospitalRepository,
    BloodBankRepository,
    SOSLogRepository,
)
from app.schemas import (
    HospitalBase,
    HospitalRead,
    BloodBankBase,
    SOSLogCreate,
)
from database.validate_schema import validate_migrations, validate_seed_data

client = TestClient(app)


def test_database_health_endpoint_runs_without_crashing():
    """
    Verify GET /health/db returns HTTP 200 with structured status.
    In local test environments without live credentials, it reports 'unconfigured' gracefully.
    """
    response = client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "connected" in data
    assert "message" in data
    if not is_supabase_configured():
        assert data["status"] == "unconfigured"
        assert data["connected"] is False


def test_hospital_schema_validates_coordinates():
    """
    Verify Pydantic hospital schema enforces coordinate and bed count constraints.
    """
    valid_hospital = HospitalBase(
        name="Test City Hospital",
        latitude=12.9716,
        longitude=77.5946,
        specialties=["Trauma", "ICU"],
        beds_available=10,
    )
    assert valid_hospital.name == "Test City Hospital"
    assert valid_hospital.beds_available == 10

    # Invalid latitude (> 90)
    with pytest.raises(ValidationError):
        HospitalBase(
            name="Invalid Lat",
            latitude=95.0,
            longitude=77.0,
        )

    # Invalid longitude (< -180)
    with pytest.raises(ValidationError):
        HospitalBase(
            name="Invalid Lng",
            latitude=12.0,
            longitude=-185.0,
        )

    # Invalid beds (< 0)
    with pytest.raises(ValidationError):
        HospitalBase(
            name="Negative Beds",
            latitude=12.0,
            longitude=77.0,
            beds_available=-5,
        )


def test_sos_log_schema_validates_status():
    """
    Verify SOS log schema enforces valid controlled statuses.
    """
    valid_sos = SOSLogCreate(
        latitude=12.97,
        longitude=77.59,
        status="initiated",
    )
    assert valid_sos.status == "initiated"

    # Invalid status
    with pytest.raises(ValidationError):
        SOSLogCreate(
            latitude=12.97,
            longitude=77.59,
            status="invalid_status",
        )


def test_sql_migrations_structure_valid():
    """
    Verify all database migration files exist and contain required schema elements.
    """
    results = validate_migrations()
    assert len(results) >= 5
    for filename, res in results.items():
        assert res["status"] == "VALID", f"Migration {filename} failed validation"


def test_seed_data_structure_valid():
    """
    Verify seed files contain expected demo records and disclaimers.
    """
    results = validate_seed_data()
    assert results["001_seed_hospitals.sql"]["status"] == "VALID"
    assert results["001_seed_hospitals.sql"]["checks"]["hospital_record_count"] == 10
    assert results["002_seed_blood_banks.sql"]["status"] == "VALID"
    assert results["002_seed_blood_banks.sql"]["checks"]["blood_bank_record_count"] == 4


def test_repository_instantiation():
    """
    Verify repository classes can be initialized without error.
    """
    h_repo = HospitalRepository()
    b_repo = BloodBankRepository()
    s_repo = SOSLogRepository()
    assert h_repo is not None
    assert b_repo is not None
    assert s_repo is not None
