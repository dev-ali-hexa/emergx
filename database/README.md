# EmergeX Database — Supabase PostgreSQL & PostGIS (Phase 1)

## 1. Architecture Overview
EmergeX uses **Supabase PostgreSQL** extended with **PostGIS** for high-performance spatial healthcare navigation.

```
Frontend (Web / Mobile)
       ↓ (REST APIs)
FastAPI Backend (Sachin - Backend Lead)
       ↓ (Supabase Client / PostgREST)
Supabase PostgreSQL + PostGIS (EPSG:4326)
```

The database stores healthcare facilities, blood banks, and emergency dispatch logs.

---

## 2. Directory Structure

```
database/
├── README.md                 # Database architecture and migration guide
├── schema.sql                # Complete consolidated schema (Migrations 001-005)
├── validate_schema.py        # Schema and seed structure validator
├── migrations/
│   ├── 001_enable_postgis.sql      # Enable PostGIS and UUID extensions
│   ├── 002_create_hospitals.sql    # Hospitals table with coordinate validation & triggers
│   ├── 003_create_blood_banks.sql  # Blood banks table with blood group array & triggers
│   ├── 004_create_sos_logs.sql     # SOS logs table with status check & JSONB payload
│   ├── 005_create_indexes.sql      # PostGIS GIST spatial and partial performance indexes
│   └── 006_facility_discovery_function.sql # PostGIS stored function for geodesic facility discovery
└── seed/
    ├── 001_seed_hospitals.sql      # 10 synthetic demo hospital records
    ├── 002_seed_blood_banks.sql    # 4 synthetic demo blood bank records
    └── seed_all.sql                # Consolidated demo seed script
```

---

## 3. Schema Definitions

### `hospitals`
Stores emergency hospitals, trauma centers, and clinics.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique facility identifier |
| `name` | `TEXT` | `NOT NULL` | Facility name |
| `address` | `TEXT` | | Street address |
| `phone` | `TEXT` | | Contact telephone number |
| `latitude` | `DOUBLE PRECISION` | `NOT NULL CHECK (lat >= -90 AND lat <= 90)` | Latitude in WGS 84 |
| `longitude` | `DOUBLE PRECISION` | `NOT NULL CHECK (lng >= -180 AND lng <= 180)` | Longitude in WGS 84 |
| `location` | `geography(Point, 4326)` | | PostGIS spatial point (auto-synced via trigger) |
| `specialties` | `TEXT[]` | `NOT NULL DEFAULT '{}'::TEXT[]` | List of medical specialties |
| `emergency_available` | `BOOLEAN` | `NOT NULL DEFAULT true` | Operational emergency room |
| `beds_available` | `INTEGER` | `NOT NULL DEFAULT 0 CHECK (beds >= 0)` | Available bed count |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Active registry flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT timezone('utc', now())` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT timezone('utc', now())` | Last update timestamp |

> **Location Synchronization Trigger:** `trg_hospitals_sync_location` automatically sets `location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography` on insert and update.

### `blood_banks`
Stores blood banks and emergency blood supply centers.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique identifier |
| `name` | `TEXT` | `NOT NULL` | Blood bank facility name |
| `address` | `TEXT` | | Street address |
| `phone` | `TEXT` | | Contact phone number |
| `latitude` | `DOUBLE PRECISION` | `NOT NULL CHECK (lat >= -90 AND lat <= 90)` | Latitude in WGS 84 |
| `longitude` | `DOUBLE PRECISION` | `NOT NULL CHECK (lng >= -180 AND lng <= 180)` | Longitude in WGS 84 |
| `location` | `geography(Point, 4326)` | | PostGIS point (auto-synced via trigger) |
| `available_blood_groups` | `TEXT[]` | `NOT NULL DEFAULT '{}'::TEXT[]` | Blood types in stock (e.g. A+, O-) |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | Active flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT timezone('utc', now())` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT timezone('utc', now())` | Last update timestamp |

### `sos_logs`
Audit table tracking emergency SOS alerts.

| Column | Type | Constraints & Defaults | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique alert ID |
| `user_id` | `TEXT` | (Nullable) | User identifier (compatible with future auth) |
| `latitude` | `DOUBLE PRECISION` | `NOT NULL CHECK (lat >= -90 AND lat <= 90)` | Emergency latitude |
| `longitude` | `DOUBLE PRECISION` | `NOT NULL CHECK (lng >= -180 AND lng <= 180)` | Emergency longitude |
| `message` | `TEXT` | | User distress message |
| `contacts_notified` | `JSONB` | `NOT NULL DEFAULT '[]'::JSONB` | Details of emergency contacts alerted |
| `status` | `TEXT` | `NOT NULL DEFAULT 'initiated' CHECK (...)` | `initiated`, `dispatched`, `resolved`, `cancelled` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT timezone('utc', now())` | Timestamp of SOS dispatch |

---

## 4. Indexes

- **Spatial Lookup (GIST):**
  - `idx_hospitals_location`: PostGIS GIST index on `hospitals(location)`.
  - `idx_blood_banks_location`: PostGIS GIST index on `blood_banks(location)`.
- **Operational Filtering (Partial Indexes):**
  - `idx_hospitals_active`: B-Tree on `hospitals(is_active) WHERE is_active = true`.
  - `idx_blood_banks_active`: B-Tree on `blood_banks(is_active) WHERE is_active = true`.
  - `idx_hospitals_emergency`: Multi-column index on `hospitals(emergency_available, beds_available) WHERE is_active = true`.
- **Audit Queries:**
  - `idx_sos_logs_created_at`: B-Tree on `sos_logs(created_at DESC)`.
  - `idx_sos_logs_status`: B-Tree on `sos_logs(status)`.

---

## 5. How to Apply Migrations in Supabase

### Method A: Supabase SQL Editor (Recommended)
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. In the left navigation, go to **SQL Editor**.
3. Copy the contents of [`database/schema.sql`](file:///C:/Users/thelu/downloads/emergx/database/schema.sql) and paste into the editor.
4. Click **Run**.
5. Once schema creation succeeds, copy the contents of [`database/seed/seed_all.sql`](file:///C:/Users/thelu/downloads/emergx/database/seed/seed_all.sql) and paste into the editor.
6. Click **Run**.

### Method B: Sequential Migration Files
Execute the SQL files in [`database/migrations/`](file:///C:/Users/thelu/downloads/emergx/database/migrations) in numeric order (001 through 005), followed by files in [`database/seed/`](file:///C:/Users/thelu/downloads/emergx/database/seed).

---

## 6. Demo / Mock Data Disclaimer

> [!WARNING]
> All records in `database/seed/` are **SYNTHETIC DEMO / MOCK DATA** prepared exclusively for hackathon evaluation, distance testing, and UI integration. They do not reflect verified hospital capacity or live clinical availability.

---

## 7. Validating Migrations & Seeds Locally

Run the validation script using the backend virtual environment:

```bash
python database/validate_schema.py
```
