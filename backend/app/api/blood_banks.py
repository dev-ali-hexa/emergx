"""
API Route for Geospatial Blood Bank Discovery.
Endpoint: GET /api/blood-banks
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.db.repositories import BloodBankRepository
from app.services.exceptions import DatabaseServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/blood-banks", tags=["BloodBanks"])


def get_blood_bank_repo() -> BloodBankRepository:
    """Dependency provider for BloodBankRepository."""
    return BloodBankRepository()


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Discover nearby blood banks and blood depositories",
    description=(
        "Performs a geospatial query around the specified coordinates (WGS 84). "
        "Returns nearby verified blood banks matching the optional blood group, sorted nearest-first."
    ),
)
def get_nearby_blood_banks(
    latitude: float = Query(
        ...,
        ge=-90.0,
        le=90.0,
        description="User GPS latitude in degrees (-90.0 to 90.0)",
        examples=[22.7196],
    ),
    longitude: float = Query(
        ...,
        ge=-180.0,
        le=180.0,
        description="User GPS longitude in degrees (-180.0 to 180.0)",
        examples=[75.8577],
    ),
    blood_group: Optional[str] = Query(
        None,
        description="Optional blood group filter (e.g. A+, B+, O+, AB+, O-)",
        examples=["O+"],
    ),
    radius_km: float = Query(
        30.0,
        gt=0.0,
        le=150.0,
        description="Search radius in kilometers (> 0.0, maximum 150.0 km)",
        examples=[30.0],
    ),
    limit: int = Query(
        10,
        gt=0,
        le=50,
        description="Maximum number of blood banks to return",
        examples=[10],
    ),
    repo: BloodBankRepository = Depends(get_blood_bank_repo),
):
    """
    Finds and ranks nearby blood banks by geodesic distance.
    """
    try:
        banks = repo.get_nearby_blood_banks(
            latitude=latitude,
            longitude=longitude,
            blood_group=blood_group,
            radius_km=radius_km,
            limit=limit,
        )
        return {
            "blood_banks": banks,
            "count": len(banks),
            "blood_group": blood_group.upper() if blood_group else "ALL",
        }
    except DatabaseServiceError as db_err:
        logger.error("Blood bank discovery database error: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        ) from db_err
    except Exception as err:
        logger.exception("Unexpected error during blood bank discovery: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during blood bank discovery.",
        ) from err
