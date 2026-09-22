"""
API Route for Emergency Triage.
Endpoint: POST /api/triage
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.triage import TriageService
from app.services.exceptions import (
    AIProviderNotConfiguredError,
    AITimeoutError,
    AIProviderHTTPError,
    AIProviderResponseError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/triage", tags=["Triage"])


def get_triage_service() -> TriageService:
    """Dependency provider for TriageService."""
    return TriageService()


@router.post(
    "",
    response_model=TriageResponse,
    status_code=status.HTTP_200_OK,
    summary="Assess emergency triage urgency",
    description=(
        "Analyzes emergency message or speech-to-text transcript using the configured AI service. "
        "Returns a normalized urgency rating, symptoms, recommended specialty, and safety disclaimer."
    ),
    responses={
        400: {"description": "Invalid or empty input message"},
        422: {"description": "Validation error in request schema"},
        502: {"description": "AI provider returned bad response or failed to communicate"},
        503: {"description": "AI provider unconfigured or unavailable"},
        504: {"description": "AI provider request timed out"},
    },
)
async def create_triage_assessment(
    request: TriageRequest,
    service: TriageService = Depends(get_triage_service),
) -> TriageResponse:
    """
    Evaluates emergency distress description.
    Enforces non-diagnostic boundaries and handles provider timeouts and failures gracefully.
    """
    try:
        return await service.triage_emergency(request)
    except AIProviderNotConfiguredError as err:
        logger.warning("Triage request rejected: %s", err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI triage provider is unconfigured or unavailable in this environment.",
        ) from err
    except AITimeoutError as err:
        logger.error("Triage request timed out: %s", err)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI triage provider timed out. Emergency assessment delayed.",
        ) from err
    except AIProviderHTTPError as err:
        logger.error("AI provider HTTP failure: %s (Status: %s)", err, err.status_code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="External AI triage provider failed to respond properly.",
        ) from err
    except AIProviderResponseError as err:
        logger.error("AI provider malformed response: %s", err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI triage provider returned an unparseable or invalid response schema.",
        ) from err
    except Exception as err:
        logger.exception("Unexpected error during emergency triage: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during emergency triage assessment.",
        ) from err
