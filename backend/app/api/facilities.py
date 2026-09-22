"""
API Route for Geospatial Facility Discovery.
Endpoint: GET /api/facilities
"""

import logging
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.facility import FacilityDiscoveryResponse
from app.services.exceptions import DatabaseServiceError
from app.services.facility import FacilityService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/facilities", tags=["Facilities"])


def get_facility_service() -> FacilityService:
    """Dependency provider for FacilityService."""
    return FacilityService()


@router.get(
    "",
    response_model=FacilityDiscoveryResponse,
    status_code=status.HTTP_200_OK,
    summary="Discover nearby healthcare facilities",
    description=(
        "Performs a PostGIS geospatial query around the specified coordinates (WGS 84). "
        "Returns nearby eligible hospitals sorted nearest-first by geodesic distance."
    ),
    responses={
        200: {"description": "List of nearby eligible facilities sorted nearest-first"},
        422: {"description": "Validation error for invalid coordinate, radius, or limit parameters"},
        503: {"description": "Database service unavailable or connection failed"},
    },
)
def get_nearby_facilities(
    latitude: float = Query(
        ...,
        ge=-90.0,
        le=90.0,
        description="User GPS latitude in degrees (-90.0 to 90.0)",
        examples=[12.9716],
    ),
    longitude: float = Query(
        ...,
        ge=-180.0,
        le=180.0,
        description="User GPS longitude in degrees (-180.0 to 180.0)",
        examples=[77.5946],
    ),
    radius_km: float = Query(
        10.0,
        gt=0.0,
        le=100.0,
        description="Search radius in kilometers (> 0.0, maximum 100.0 km)",
        examples=[10.0],
    ),
    specialty: Optional[str] = Query(
        None,
        description="Optional medical specialty filter (e.g. Cardiology, Trauma, ICU)",
        examples=["Cardiology"],
    ),
    emergency_only: bool = Query(
        False,
        description="Filter for hospitals with confirmed operational emergency department only",
        examples=[False],
    ),
    limit: int = Query(
        10,
        gt=0,
        le=50,
        description="Maximum number of facilities to return (> 0, maximum 50)",
        examples=[10],
    ),
    service: FacilityService = Depends(get_facility_service),
) -> FacilityDiscoveryResponse:
    """
    Finds and ranks nearby hospitals using PostGIS ST_DWithin and ST_Distance.
    """
    try:
        return service.discover_nearby_facilities(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            specialty=specialty,
            emergency_only=emergency_only,
            limit=limit,
        )
    except DatabaseServiceError as db_err:
        logger.error("Facility discovery error: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable. Please try again later.",
        ) from db_err
    except Exception as err:
        logger.exception("Unexpected error during facility discovery: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during facility discovery.",
        ) from err


class BedUpdateRequest(BaseModel):
    beds: int = Field(..., ge=0, description="Available bed count")
    status: Optional[str] = Field(None, description="Optional hospital status ('AVAILABLE' or 'FULL')")


@router.get(
    "/all",
    status_code=status.HTTP_200_OK,
    summary="Get all registered healthcare facilities",
    description="Returns all active facilities in the healthcare registry.",
)
def get_all_facilities(
    service: FacilityService = Depends(get_facility_service),
):
    try:
        facilities = service.get_all_facilities()
        return {"facilities": facilities, "count": len(facilities)}
    except DatabaseServiceError as db_err:
        logger.error("Failed to query facilities registry: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        ) from db_err
    except Exception as err:
        logger.exception("Unexpected error fetching facilities: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while fetching facilities.",
        ) from err


@router.patch(
    "/{facility_id}/beds",
    status_code=status.HTTP_200_OK,
    summary="Update facility bed counts",
    description="Updates available bed count and operational availability for hospital desk.",
)
def update_facility_beds(
    facility_id: str,
    payload: BedUpdateRequest,
    service: FacilityService = Depends(get_facility_service),
):
    try:
        success = service.update_beds(
            hospital_id=facility_id,
            beds=payload.beds,
            status=payload.status,
        )
        return {
            "success": success,
            "facility_id": facility_id,
            "beds": payload.beds,
            "status": payload.status,
        }
    except DatabaseServiceError as db_err:
        logger.error("Failed to update facility beds: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        ) from db_err
    except Exception as err:
        logger.exception("Unexpected error updating beds: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating bed count.",
        ) from err

