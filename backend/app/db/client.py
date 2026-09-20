"""
Supabase client provider and database connectivity verification module.
Maintains client singleton and provides non-destructive health checks.
"""

from typing import Any, Dict, Optional
from supabase import Client, create_client
from app.config import get_settings

_supabase_client: Optional[Client] = None


def is_supabase_configured() -> bool:
    """
    Checks whether Supabase environment variables are populated.
    """
    settings = get_settings()
    return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY and settings.SUPABASE_URL.strip() and settings.SUPABASE_KEY.strip())


def get_supabase_client() -> Client:
    """
    Returns a configured Supabase client instance.
    Raises RuntimeError if credentials are missing.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    settings = get_settings()
    if not is_supabase_configured():
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in .env or environment variables."
        )

    _supabase_client = create_client(
        supabase_url=settings.SUPABASE_URL.strip(),
        supabase_key=settings.SUPABASE_KEY.strip(),
    )
    return _supabase_client


def verify_database_connection() -> Dict[str, Any]:
    """
    Verifies live connectivity to Supabase PostgreSQL database.
    Does NOT leak secrets or connection keys in response.
    """
    if not is_supabase_configured():
        return {
            "status": "unconfigured",
            "connected": False,
            "message": "SUPABASE_URL and/or SUPABASE_KEY not set in environment.",
            "phase": "Phase 1 - Database Foundation",
        }

    try:
        client = get_supabase_client()
        # Perform a lightweight count query on hospitals table
        res = client.table("hospitals").select("id", count="exact").limit(1).execute()
        return {
            "status": "connected",
            "connected": True,
            "message": "Supabase PostgreSQL + PostGIS database reachable.",
            "record_count": res.count if res.count is not None else 0,
            "phase": "Phase 1 - Database Foundation",
        }
    except Exception as e:
        return {
            "status": "error",
            "connected": False,
            "message": f"Connection check failed: {type(e).__name__}",
            "phase": "Phase 1 - Database Foundation",
        }
