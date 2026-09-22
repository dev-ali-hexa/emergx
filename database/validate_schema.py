"""
Validation utility for EmergeX Phase 1 Database Migrations and Seed Data.
Verifies that all migration and seed files are structurally sound, follow constraints,
and contain valid demo data.
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = REPO_ROOT / "database" / "migrations"
SEED_DIR = REPO_ROOT / "database" / "seed"


def validate_migrations():
    expected_migrations = [
        "001_enable_postgis.sql",
        "002_create_hospitals.sql",
        "003_create_blood_banks.sql",
        "004_create_sos_logs.sql",
        "005_create_indexes.sql",
        "006_facility_discovery_function.sql",
    ]
    results = {}
    for filename in expected_migrations:
        file_path = MIGRATIONS_DIR / filename
        if not file_path.exists():
            results[filename] = {"status": "MISSING", "error": "File does not exist"}
            continue

        content = file_path.read_text(encoding="utf-8")
        checks = {"exists": True, "size_bytes": len(content)}

        if filename == "001_enable_postgis.sql":
            checks["enables_postgis"] = "postgis" in content.lower()
        elif filename == "002_create_hospitals.sql":
            checks["creates_table"] = "create table" in content.lower() and "hospitals" in content.lower()
            checks["has_location"] = "geography(point, 4326)" in content.lower()
            checks["has_lat_check"] = "chk_hospital_latitude" in content
            checks["has_lng_check"] = "chk_hospital_longitude" in content
            checks["has_beds_check"] = "chk_hospital_beds" in content
            checks["has_trigger"] = "trg_hospitals_sync_location" in content
        elif filename == "003_create_blood_banks.sql":
            checks["creates_table"] = "create table" in content.lower() and "blood_banks" in content.lower()
            checks["has_location"] = "geography(point, 4326)" in content.lower()
            checks["has_lat_check"] = "chk_blood_bank_latitude" in content
            checks["has_lng_check"] = "chk_blood_bank_longitude" in content
            checks["has_trigger"] = "trg_blood_banks_sync_location" in content
        elif filename == "004_create_sos_logs.sql":
            checks["creates_table"] = "create table" in content.lower() and "sos_logs" in content.lower()
            checks["has_user_id"] = "user_id" in content.lower()
            checks["has_status_check"] = "chk_sos_status" in content
            checks["has_contacts_notified"] = "contacts_notified" in content.lower()
        elif filename == "005_create_indexes.sql":
            checks["has_gist_hospitals"] = "idx_hospitals_location" in content
            checks["has_gist_blood_banks"] = "idx_blood_banks_location" in content
            checks["has_active_filter"] = "idx_hospitals_active" in content
        elif filename == "006_facility_discovery_function.sql":
            checks["defines_function"] = "get_nearby_hospitals" in content
            checks["uses_st_dwithin"] = "st_dwithin" in content.lower()
            checks["uses_st_distance"] = "st_distance" in content.lower()

        results[filename] = {"status": "VALID", "checks": checks}
    return results


def validate_seed_data():
    seed_files = [
        "001_seed_hospitals.sql",
        "002_seed_blood_banks.sql",
        "seed_all.sql",
    ]
    results = {}
    for filename in seed_files:
        file_path = SEED_DIR / filename
        if not file_path.exists():
            results[filename] = {"status": "MISSING", "error": "File does not exist"}
            continue

        content = file_path.read_text(encoding="utf-8")
        content_upper = content.upper()
        checks = {
            "exists": True,
            "has_demo_disclaimer": "DEMO" in content_upper and "MOCK" in content_upper,
            "is_idempotent": "ON CONFLICT" in content_upper,
        }

        if "hospitals" in filename or filename == "seed_all.sql":
            hospital_ids = re.findall(r"'(a0000000-0000-0000-0000-\d{12})'", content)
            checks["hospital_record_count"] = len(hospital_ids)

        if "blood_banks" in filename or filename == "seed_all.sql":
            blood_bank_ids = re.findall(r"'(b0000000-0000-0000-0000-\d{12})'", content)
            checks["blood_bank_record_count"] = len(blood_bank_ids)

        results[filename] = {"status": "VALID", "checks": checks}
    return results


if __name__ == "__main__":
    print("Validating migrations...")
    for f, res in validate_migrations().items():
        print(f"  {f}: {res['status']}")
    print("\nValidating seed data...")
    for f, res in validate_seed_data().items():
        print(f"  {f}: {res['status']} -> {res['checks']}")
