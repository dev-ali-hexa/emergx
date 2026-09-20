"""
Database package for EmergeX backend.
Provides Supabase client connectivity, connection verification, and data access repositories.
"""

from app.db.client import (
    get_supabase_client,
    is_supabase_configured,
    verify_database_connection,
)
from app.db.repositories import (
    HospitalRepository,
    BloodBankRepository,
    SOSLogRepository,
)

__all__ = [
    "get_supabase_client",
    "is_supabase_configured",
    "verify_database_connection",
    "HospitalRepository",
    "BloodBankRepository",
    "SOSLogRepository",
]
