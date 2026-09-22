# EmergeX — Emergency Healthcare Navigator

EmergeX is an emergency healthcare navigation platform designed to triage patient distress, identify nearby capable facilities, and dispatch urgent SOS alerts.

This project is connected to [Lovable](https://lovable.dev) for frontend development and sync.

## Project Structure

```
emergx/
├── backend/       # Python / FastAPI backend service
└── frontend app   # TanStack Start / React frontend
```

## Frontend Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend Quick Start

```bash
python -m venv backend/.venv
# Activate virtual environment
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload --port 8000
```

Verify health:

`curl http://127.0.0.1:8000/health` -> `{"status":"ok","service":"emergex-backend"}`

See `backend/README.md` for full backend details.
