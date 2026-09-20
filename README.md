# EmergeX — Emergency Healthcare Navigator

EmergeX is an emergency healthcare navigation platform designed to triage patient distress, pinpoint nearest capable healthcare facilities, and dispatch urgent SOS alerts.

## Project Structure

```
emergx/
├── backend/       # Python / FastAPI backend service (Lead: Sachin)
└── (frontend/)    # Client web application (Frontend Lead)
```

## Backend Service (Phase 0)

The backend foundation has been established in [`backend/`](file:///C:/Users/thelu/downloads/emergx/backend/README.md).

Quick start for backend:
```bash
python -m venv backend/.venv
# Activate virtual environment
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload --port 8000
```

Verify health:
`curl http://127.0.0.1:8000/health` -> `{"status":"ok","service":"emergex-backend"}`

See [backend/README.md](file:///C:/Users/thelu/downloads/emergx/backend/README.md) for full details.
