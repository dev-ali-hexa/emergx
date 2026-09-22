from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.db import verify_database_connection
from app.api import (
    emergency_router,
    facilities_router,
    sos_router,
    triage_router,
    blood_banks_router,
)

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="0.6.0",
    description="EmergeX Emergency Healthcare Navigator - Backend API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration controlled via environment variables
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(emergency_router)
app.include_router(facilities_router)
app.include_router(sos_router)
app.include_router(triage_router)
app.include_router(blood_banks_router)



@app.get("/", tags=["Root"])
async def root():
    """
    Basic root endpoint providing service status and API discovery paths.
    """
    return {
        "service": settings.APP_NAME,
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "db_health": "/health/db",
        "emergency": "/api/emergency",
        "triage": "/api/triage",
        "facilities": "/api/facilities",
        "sos": "/api/sos",
        "blood_banks": "/api/blood-banks",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for liveness probes, monitoring, and team verification.
    Contains no business logic per Phase 0 specifications.
    """
    return {
        "status": "ok",
        "service": "emergex-backend",
    }


@app.get("/health/db", tags=["Health"])
async def database_health_check():
    """
    Database connectivity verification endpoint.
    Performs a non-destructive readiness probe against Supabase PostgreSQL.
    Safely handles unconfigured local environments without leaking credentials.
    """
    return verify_database_connection()
