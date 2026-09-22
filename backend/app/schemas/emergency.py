"""
Pydantic schemas for Emergency Orchestration API.
Integrates user location with normalized triage urgency and clinical specialty.
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.facility import FacilityDiscoveryItem
from app.schemas.triage import UrgencyLevel

EMERGENCY_DISCLAIMER: str = (
    "This emergency navigation result is not a medical diagnosis. "
    "In a life-threatening emergency, contact local emergency services immediately."
)


class EmergencyRequest(BaseModel):
    """
    Request payload for emergency navigation orchestration.
    Combines user location with pre-assessed triage results to match eligible facilities.
    """
    model_config = ConfigDict(extra="ignore")

    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="User GPS latitude in decimal degrees (-90.0 to 90.0)",
        examples=[23.2599],
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="User GPS longitude in decimal degrees (-180.0 to 180.0)",
        examples=[77.4126],
    )
    urgency: UrgencyLevel = Field(
        ...,
        description="Normalized triage urgency tier: critical, high, or moderate",
        examples=[UrgencyLevel.CRITICAL],
    )
    specialty: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional clinical specialty filter (e.g. Cardiology, Trauma, ICU)",
        examples=["Cardiology"],
    )
    radius_km: float = Field(
        default=10.0,
        gt=0.0,
        le=100.0,
        description="Search radius in kilometers (> 0.0, maximum 100.0 km)",
        examples=[10.0],
    )
    limit: int = Field(
        default=10,
        gt=0,
        le=50,
        description="Maximum number of facilities to return (> 0, maximum 50)",
        examples=[3],
    )
    emergency_only: Optional[bool] = Field(
        default=None,
        description=(
            "Optional filter for emergency-capable hospitals. "
            "If omitted, defaults based on urgency (true for critical/high, false for moderate)."
        ),
        examples=[True],
    )

    @field_validator("specialty")
    @classmethod
    def normalize_specialty(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


# Semantic alias
EmergencyOrchestrationRequest = EmergencyRequest


class EmergencyResponse(BaseModel):
    """
    Unified response payload containing triage context, matching facilities, and safety disclaimer.
    """
    urgency: UrgencyLevel = Field(
        ...,
        description="Validated triage urgency tier (critical, high, or moderate)",
        examples=[UrgencyLevel.CRITICAL],
    )
    specialty: Optional[str] = Field(
        default=None,
        description="Clinical specialty applied to facility filtering, if any",
        examples=["Cardiology"],
    )
    facilities: List[FacilityDiscoveryItem] = Field(
        default_factory=list,
        description="Nearby matching healthcare facilities ordered nearest-first",
    )
    disclaimer: str = Field(
        default=EMERGENCY_DISCLAIMER,
        description="Non-diagnostic medical and emergency navigation disclaimer",
        examples=[EMERGENCY_DISCLAIMER],
    )


# Semantic alias
EmergencyOrchestrationResponse = EmergencyResponse
