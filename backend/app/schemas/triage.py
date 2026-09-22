"""
Pydantic schemas for Emergency AI Triage requests and normalized responses.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class UrgencyLevel(str, Enum):
    """
    Controlled urgency levels for EmergeX emergency navigation.
    """
    CRITICAL = "critical"
    HIGH = "high"
    MODERATE = "moderate"


class TriageRequest(BaseModel):
    """
    User request payload containing emergency message or transcript.
    """
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User emergency description, symptoms, or speech-to-text transcript.",
        examples=["Patient has severe chest pressure radiating to left arm and difficulty breathing."],
    )

    @field_validator("message")
    @classmethod
    def validate_message_non_empty(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("message must be a string")
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("message cannot be empty or contain only whitespace")
        return trimmed


class TriageResponse(BaseModel):
    """
    Provider-agnostic normalized emergency triage assessment.
    Maintains a strict non-diagnostic boundary.
    """
    symptoms: List[str] = Field(
        default_factory=list,
        description="List of detected symptoms extracted from user input.",
        examples=[["chest pain", "difficulty breathing"]],
    )
    urgency: UrgencyLevel = Field(
        ...,
        description="Assessed urgency tier: critical, high, or moderate.",
        examples=[UrgencyLevel.CRITICAL],
    )
    urgency_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Normalized urgency confidence or severity score (0.0 to 1.0).",
        examples=[0.95],
    )
    specialty: str = Field(
        ...,
        min_length=1,
        description="Recommended clinical specialty or department (e.g. Cardiology, Trauma, ICU).",
        examples=["Cardiology"],
    )
    disclaimer: str = Field(
        ...,
        description="Non-diagnostic safety notice stating this is an emergency navigation aid.",
    )
    provider: Optional[str] = Field(
        None,
        description="AI provider identifier responsible for the assessment (e.g. sokt, mock).",
    )
