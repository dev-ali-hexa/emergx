"""
API routing package for EmergeX backend.
"""

from app.api.emergency import router as emergency_router
from app.api.facilities import router as facilities_router
from app.api.sos import router as sos_router
from app.api.triage import router as triage_router
from app.api.blood_banks import router as blood_banks_router

__all__ = [
    "emergency_router",
    "facilities_router",
    "sos_router",
    "triage_router",
    "blood_banks_router",
]
