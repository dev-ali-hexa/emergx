# EmergeX Backend — Service, Database, AI Triage, Facility Discovery, SOS & Orchestration (Phase 5)

## 1. Overview
EmergeX is an emergency healthcare navigator backend built with **Python**, **FastAPI**, and **Supabase PostgreSQL + PostGIS**. 
This service coordinates emergency triage recommendations, nearby healthcare facility lookups, urgent SOS incident logging, and emergency workflow orchestration.

- **Phase 0 (Completed):** Established FastAPI foundation, CORS, configuration, and health check.
- **Phase 1 (Completed):** Established Supabase PostgreSQL + PostGIS database schema, spatial indexes, triggers, demo seed data, client connectivity, and repository layer.
- **Phase 2 (Completed):** Established provider-agnostic AI emergency triage foundation, request/response contracts, Sokt adapter boundary, error handling, medical disclaimers, and automated mock test suites.
- **Phase 3 (Completed):** Established PostGIS geospatial facility discovery endpoint (`GET /api/facilities`), geodesic distance matching via `ST_DWithin` and `ST_Distance`, GIST spatial index utilization, nearest-first ordering, eligibility filters, and test suite.
- **Phase 4 (Completed):** Established Emergency SOS incident logging endpoint (`POST /api/sos`), persistent audit trail in existing `sos_logs` table, coordinate/message validation, initial status enforcement (`status = "initiated"`), controlled error handling, and test suite.
- **Phase 5 (Completed):** Established Emergency Orchestration endpoint (`POST /api/emergency`), unifying user location and normalized triage assessment with authoritative facility discovery, urgency-driven filtering, clean service boundaries, and test suite.

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── __init__.py          # Package marker & metadata
│   ├── main.py              # FastAPI entry point, CORS, root, /health, /health/db, /api/triage, /api/facilities, /api/sos, & /api/emergency
│   ├── config.py            # Environment configuration (pydantic-settings)
│   ├── api/
│   │   ├── __init__.py      # API routing package exports
│   │   ├── emergency.py     # POST /api/emergency route handler
│   │   ├── facilities.py    # GET /api/facilities route handler
│   │   ├── sos.py           # POST /api/sos route handler
│   │   └── triage.py        # POST /api/triage route handler
│   ├── schemas/
│   │   ├── __init__.py      # Pydantic schemas exports
│   │   ├── emergency.py     # EmergencyRequest & EmergencyResponse schemas
│   │   ├── facility.py      # Hospital, blood bank, & FacilityDiscoveryResponse schemas
│   │   ├── sos.py           # SOSCreateRequest, SOSCreateResponse validation schemas
│   │   └── triage.py        # TriageRequest & TriageResponse schemas
│   ├── models/
│   │   └── __init__.py      # Database ORM / entity models
│   ├── services/
│   │   ├── __init__.py      # Service layer exports
│   │   ├── ai_provider.py   # BaseAIProvider, SoktAIProvider, MockAIProvider
│   │   ├── emergency.py     # EmergencyService orchestration logic
│   │   ├── exceptions.py    # Custom domain exceptions
│   │   ├── facility.py      # FacilityService business logic & normalization
│   │   ├── sos.py           # SOSService business logic & repository coordination
│   │   └── triage.py        # TriageService business logic & normalization
│   ├── db/
│   │   ├── __init__.py      # Database package exports
│   │   ├── client.py        # Supabase client singleton & connectivity verification
│   │   └── repositories.py  # Decoupled data access repositories (Hospital, BloodBank, SOSLog)
│   └── utils/
│       └── __init__.py      # Shared utility helpers
│
├── tests/
│   ├── __init__.py          # Test suite package marker
│   ├── test_health.py       # Health check and root endpoint tests
│   ├── test_database.py     # Database connectivity, schemas, and migration tests
│   ├── test_emergency.py    # Emergency orchestration, urgency filtering, and boundary tests
│   ├── test_facilities.py   # Facility discovery, coordinate/radius validation, and PostGIS tests
│   ├── test_sos.py          # SOS incident logging, coordinate/status validation, and persistence tests
│   └── test_triage.py       # Triage request/response, mock AI, and endpoint tests
│
├── requirements.txt         # Python dependencies
├── .env.example             # Configuration template (placeholders only)
└── README.md                # Backend documentation
```

---

## 3. Environment Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.14.3)
- `pip` package manager

### Create a Virtual Environment
From the repository root:

**macOS / Linux:**
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
```

**Windows (PowerShell):**
```powershell
python -m venv backend/.venv
.\backend\.venv\Scripts\Activate.ps1
```

---

## 4. Install Dependencies

Install the backend dependencies:

```bash
pip install -r backend/requirements.txt
```

---

## 5. Configuration (.env)

Copy `.env.example` to `.env` inside `backend/` or root:

**macOS / Linux:**
```bash
cp backend/.env.example backend/.env
```

**Windows (PowerShell):**
```powershell
Copy-Item backend\.env.example backend\.env
```

---

## 6. Emergency Navigation Orchestration Endpoint

### Endpoint
`POST /api/emergency`

Orchestrates user coordinates and pre-assessed triage context (urgency level, clinical specialty) with the authoritative PostGIS facility discovery engine.

> [!IMPORTANT]
> - **AI Separation:** This endpoint does **not** invoke AI providers directly. The client or API gateway first calls `POST /api/triage` and passes the normalized result to `POST /api/emergency`.
> - **SOS Separation:** This endpoint does **not** create an SOS incident record. SOS dispatch is an explicit user action initiated exclusively through `POST /api/sos`.
> - **Non-Diagnostic:** This endpoint provides navigation and proximity filtering. It makes **no** medical diagnoses or claims of real-time bed guarantee.

### Request Body Schema (`EmergencyRequest`)
| Field | Type | Required | Default | Validation Rules | Description |
|---|---|---|---|---|---|
| `latitude` | `float` | **Yes** | — | `-90.0` to `90.0` | User GPS latitude in decimal degrees |
| `longitude` | `float` | **Yes** | — | `-180.0` to `180.0` | User GPS longitude in decimal degrees |
| `urgency` | `string` | **Yes** | — | `"critical"`, `"high"`, `"moderate"` | Normalized triage urgency tier |
| `specialty` | `string` | No | `null` | Max 100 chars, whitespace trimmed | Clinical department filter (e.g. Cardiology, Trauma) |
| `radius_km` | `float` | No | `10.0` | `> 0.0` and `<= 100.0` | Search radius in kilometers (max 100 km) |
| `limit` | `int` | No | `10` | `1` to `50` | Maximum facilities to return (max 50) |
| `emergency_only` | `bool` | No | Based on urgency | `true`/`false` | Defaults: `true` for critical/high; `false` for moderate |

### Urgency-to-Facility Filtering Behavior
- **`critical`:** Prioritizes emergency-capable hospitals; defaults `emergency_only = True` unless explicitly overridden.
- **`high`:** Prioritizes emergency-capable hospitals; defaults `emergency_only = True` unless explicitly overridden.
- **`moderate`:** Permits broader discovery including outpatient facilities and clinics; defaults `emergency_only = False`.

### Request Example
```json
{
  "latitude": 23.2599,
  "longitude": 77.4126,
  "urgency": "critical",
  "specialty": "Cardiology",
  "radius_km": 10.0,
  "limit": 3
}
```

### Response Contract (`200 OK`)
```json
{
  "urgency": "critical",
  "specialty": "Cardiology",
  "facilities": [
    {
      "id": "a0000000-0000-0000-0000-000000000001",
      "name": "Metro Central Trauma & Emergency Hospital [DEMO]",
      "address": "100 MG Road, Central District, Bengaluru, KA 560001",
      "phone": "+91-80-5550-0101",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "distance_km": 1.45,
      "specialties": ["Trauma", "Cardiology", "ICU", "Orthopedics", "General Surgery"],
      "emergency_capable": true,
      "available_beds": 18
    }
  ],
  "disclaimer": "This emergency navigation result is not a medical diagnosis. In a life-threatening emergency, contact local emergency services immediately."
}
```

- **Empty Result:** When no eligible facilities match criteria, returns `HTTP 200` with `{"urgency": "...", "specialty": "...", "facilities": [], "disclaimer": "..."}`.

---

## 7. Emergency SOS Incident Logging Endpoint

### Endpoint
`POST /api/sos`

Records an emergency SOS incident into the persistent database audit log (`sos_logs`).

> [!NOTE]
> This endpoint strictly records the incident for audit and dispatch readiness. It does **not** execute real-world telecommunications dispatch (SMS, Twilio, WhatsApp, phone calls) or alert external emergency services.

### Request Example
```json
{
  "latitude": 23.2599,
  "longitude": 77.4126,
  "message": "Emergency assistance required at central junction",
  "user_id": "user-demo-001",
  "contacts_notified": {
    "primary_contact": "+91-9876543210"
  }
}
```

### Response Contract (`201 Created`)
```json
{
  "id": "d3b07384-d113-494b-9c8e-a2e6f76c5b91",
  "status": "initiated",
  "message": "SOS request recorded successfully.",
  "recorded": true,
  "created_at": "2026-09-20T13:31:00.000Z"
}
```

---

## 8. Geospatial Facility Discovery Endpoint

### Endpoint
`GET /api/facilities`

Searches nearby active healthcare facilities around a GPS point using PostGIS geodesic calculations.

### Response Contract (`200 OK`)
```json
{
  "facilities": [
    {
      "id": "a0000000-0000-0000-0000-000000000001",
      "name": "Metro Central Trauma & Emergency Hospital [DEMO]",
      "address": "100 MG Road, Central District, Bengaluru, KA 560001",
      "phone": "+91-80-5550-0101",
      "latitude": 12.9716,
      "longitude": 77.5946,
      "distance_km": 1.45,
      "specialties": ["Trauma", "Cardiology", "ICU", "Orthopedics", "General Surgery"],
      "emergency_capable": true,
      "available_beds": 18
    }
  ]
}
```

---

## 9. AI Emergency Triage Endpoint

### Endpoint
`POST /api/triage`

**Request Body:**
```json
{
  "message": "Patient experiencing crushing chest pain and shortness of breath."
}
```

### Normalized Response Contract (`200 OK`)
```json
{
  "symptoms": ["chest pain", "acute cardiac distress"],
  "urgency": "critical",
  "urgency_score": 0.95,
  "specialty": "Cardiology",
  "disclaimer": "This assessment is an automated emergency navigation aid...",
  "provider": "sokt"
}
```

---

## 10. Running Tests

Run the complete backend test suite using pytest:

```bash
pytest backend/tests
```

**Test Coverage Summary (76 tests, 100% passing):**
- **Phase 0 (2 tests):** Server health (`GET /health`) and root endpoint (`GET /`).
- **Phase 1 (6 tests):** Database health (`GET /health/db`), repository instantiation, and SQL schema validation (migrations 001–006).
- **Phase 2 (17 tests):** Triage schemas, message validation, mock AI classification, timeout handling, and error codes.
- **Phase 3 (18 tests):** Facility discovery requests, latitude/longitude bounds, radius and limit bounds, specialty filtering, emergency-only filtering, inactive hospital exclusion, distance calculations, nearest-first sorting, empty result handling, and database failure mapping.
- **Phase 4 (15 tests):** SOS request validation, latitude/longitude bounds, message length limit (1000 chars), whitespace normalization, optional user_id and contacts_notified, payload bounds (10KB), client initial status protection rejection, database failure mapping (HTTP 503 without leaks), response schema validation, and zero external notification dispatch guarantee.
- **Phase 5 (18 tests):** Emergency orchestration request/response contracts, critical/high/moderate urgency routing, emergency_only default and explicit override behaviors, specialty trimming, facility service delegation/reuse, nearest-first sorting, empty results handling, database failure 503 mapping, and strict isolation verification (zero automatic SOS creation, zero outbound network/AI calls).
