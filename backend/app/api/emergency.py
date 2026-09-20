"""
API Route for Emergency Navigation Orchestration.
Endpoint: POST /api/emergency
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.emergency import EmergencyRequest, EmergencyResponse
from app.services.emergency import EmergencyService
from app.services.exceptions import DatabaseServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/emergency", tags=["Emergency"])


def get_emergency_service() -> EmergencyService:
    """Dependency provider for EmergencyService."""
    return EmergencyService()


@router.post(
    "",
    response_model=EmergencyResponse,
    status_code=status.HTTP_200_OK,
    summary="Orchestrate emergency navigation",
    description=(
        "Unified orchestration endpoint connecting user coordinates and normalized triage context "
        "(urgency, specialty) to the PostGIS facility discovery service. "
        "Returns nearby eligible healthcare facilities sorted nearest-first along with safety disclaimers. "
        "NOTE: This endpoint does NOT invoke external AI models directly, nor does it create an SOS record. "
        "It is an automated emergency navigation aid, not a medical diagnosis or ambulance dispatch service."
    ),
    responses={
        200: {"description": "List of nearby eligible facilities matched to emergency context"},
        422: {"description": "Validation error for coordinates, urgency, radius, or limit parameters"},
        503: {"description": "Database service unavailable or connection failed"},
    },
)
def orchestrate_emergency(
    request: EmergencyRequest,
    service: EmergencyService = Depends(get_emergency_service),
) -> EmergencyResponse:
    """
    Orchestrates emergency healthcare navigation by filtering and sorting eligible facilities.
    """
    try:
        return service.orchestrate_emergency_navigation(request)
    except DatabaseServiceError as db_err:
        logger.error("Emergency orchestration database error: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unavailable. Please try again later.",
        ) from db_err
    except Exception as err:
        logger.exception("Unexpected error during emergency orchestration: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during emergency navigation orchestration.",
        ) from err
