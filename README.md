# EmergX — Emergency Healthcare & Assistive Navigation

EmergX is an emergency healthcare navigation platform designed to eliminate the critical delays during the "Golden Hour" of medical distress.

## Architecture

- **Frontend**: TanStack Start / React 19 / Tailwind CSS 4
  - Hinglish voice and text emergency triage
  - Nearest hospital ICU bed availability counters
  - 1-Click Google Maps turn-by-turn navigation
  - 1-Click Family SOS dispatch
  - Dedicated Hospital Desk and Master Admin management panels
  - Blood Bank Finder with live contact and blood group filtering
  - Golden Hour First-Aid Action Guide
- **Backend**: FastAPI (Python 3.12+)
  - Emergency orchestration endpoint (`/api/emergency`)
  - AI Triage parser with Hinglish support (`/api/triage`)
  - PostGIS geospatial facility discovery with geodesic Haversine fallback (`/api/facilities`)
  - Blood Bank discovery endpoint (`/api/blood-banks`)
  - Emergency SOS audit log dispatcher (`/api/sos`)
  - Health & connectivity probes (`/health`, `/health/db`)

## Quickstart

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

### 2. Run In Development

Run both Frontend and Backend concurrently:
```bash
npm run dev:all
```

Or run individually:
```bash
# Frontend (http://localhost:3000)
npm run dev

# Backend (http://localhost:8000)
npm run dev:backend
```

### 3. Running Backend Tests

```bash
npm run test:backend
# Or directly:
.\backend\.venv\Scripts\pytest backend\tests
```

See `backend/README.md` for full backend details.
