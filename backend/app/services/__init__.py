"""
Service layer package defining decoupled business boundaries:
- AI Triage Service: Encapsulates provider adapters (Sokt, Gemini, Mock) and normalization.
- Facility Service: Handles geospatial queries and distance calculations.
- Dispatch Service: Encapsulates emergency SMS / webhook dispatch.
"""

from app.services.ai_provider import (
    BaseAIProvider,
    SoktAIProvider,
    MockAIProvider,
    get_ai_provider,
)
from app.services.exceptions import (
    AIProviderError,
    AIProviderNotConfiguredError,
    AITimeoutError,
    AIProviderHTTPError,
    AIProviderResponseError,
    DatabaseServiceError,
)
from app.services.emergency import EmergencyService
from app.services.facility import FacilityService
from app.services.sos import SOSService
from app.services.triage import TriageService

__all__ = [
    "BaseAIProvider",
    "SoktAIProvider",
    "MockAIProvider",
    "get_ai_provider",
    "AIProviderError",
    "AIProviderNotConfiguredError",
    "AITimeoutError",
    "AIProviderHTTPError",
    "AIProviderResponseError",
    "DatabaseServiceError",
    "EmergencyService",
    "FacilityService",
    "SOSService",
    "TriageService",
]
