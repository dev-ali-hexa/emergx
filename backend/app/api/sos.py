"""
API Route for Emergency SOS Incident Logging.
Endpoint: POST /api/sos
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.sos import SOSCreateRequest, SOSCreateResponse
from app.services.exceptions import DatabaseServiceError
from app.services.sos import SOSService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sos", tags=["SOS"])


def get_sos_service() -> SOSService:
    """Dependency provider for SOSService."""
    return SOSService()


@router.post(
    "",
    response_model=SOSCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record emergency SOS incident",
    description=(
        "Records an emergency SOS incident into the database audit log (sos_logs). "
        "Enforces strict coordinate validation, message length limits, and guarantees "
        "the initial status is set to 'initiated'. "
        "NOTE: This endpoint logs the incident for audit and dispatch readiness; "
        "it does NOT execute real-world telecommunications dispatch or contact alerts."
    ),
    responses={
        201: {"description": "SOS incident successfully recorded in audit log"},
        422: {"description": "Validation error for coordinates, message length, or invalid status override"},
        503: {"description": "Database service unavailable or connection failed"},
    },
)
def create_sos_incident(
    request: SOSCreateRequest,
    service: SOSService = Depends(get_sos_service),
) -> SOSCreateResponse:
    """
    Creates and records a new emergency SOS incident.
    Guarantees initial status 'initiated' and stores metadata safely.
    """
    try:
        return service.record_sos_incident(request)
    except DatabaseServiceError as db_err:
        logger.error("SOS incident database failure: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable. Please try again later.",
        ) from db_err
    except Exception as err:
        logger.exception("Unexpected error recording SOS incident: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the SOS request.",
        ) from err


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="Get recent emergency SOS incidents",
    description="Retrieves recent emergency distress incidents for hospital admin and desk feeds.",
)
def get_recent_sos_incidents(
    limit: int = 20,
    service: SOSService = Depends(get_sos_service),
):
    try:
        incidents = service.get_recent_incidents(limit=limit)
        return {"incidents": incidents, "count": len(incidents)}
    except DatabaseServiceError as db_err:
        logger.error("Failed to fetch SOS logs: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable.",
        ) from db_err
    except Exception as err:
        logger.exception("Unexpected error fetching SOS incidents: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while fetching SOS logs.",
        ) from err
