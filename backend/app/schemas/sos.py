"""
Schemas for SOS emergency incident logging and audit trails.
Maintains Phase 1 compatibility while providing Phase 4 request/response models.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ==============================================================================
# Phase 1 Compatible Schemas
# ==============================================================================

class SOSLogCreate(BaseModel):
    user_id: Optional[str] = Field(None, description="Identifier of the user requesting SOS")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude of the emergency location")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude of the emergency location")
    message: Optional[str] = Field(None, description="Optional distress or emergency message")
    contacts_notified: List[Any] = Field(default_factory=list, description="List of notified contacts/dispatch actions")
    status: str = Field(
        default="initiated",
        pattern="^(initiated|dispatched|resolved|cancelled)$",
        description="Current dispatch status",
    )


class SOSLogRead(SOSLogCreate):
    id: str = Field(..., description="Unique UUID of the SOS dispatch event")
    created_at: Optional[datetime] = None


# ==============================================================================
# Phase 4 SOS API Request and Response Models
# ==============================================================================

class SOSCreateRequest(BaseModel):
    """
    Request model for recording an emergency SOS incident.
    Enforces strict coordinate boundaries, message limits, and initial status protection.
    """
    model_config = ConfigDict(extra="ignore")

    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude of the emergency location in decimal degrees (-90.0 to 90.0)",
        examples=[23.2599],
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude of the emergency location in decimal degrees (-180.0 to 180.0)",
        examples=[77.4126],
    )
    message: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Optional emergency distress message (max 1000 characters)",
        examples=["Emergency assistance required"],
    )
    user_id: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Optional identifier of the user or device requesting SOS",
        examples=["optional-user-id"],
    )
    contacts_notified: Optional[Union[Dict[str, Any], List[Any]]] = Field(
        default_factory=dict,
        description="Optional structured metadata regarding contacts or dispatch actions",
        examples=[{}],
    )
    status: Optional[str] = Field(
        default="initiated",
        description="Initial status of the SOS request. Must be 'initiated' if supplied.",
    )

    @field_validator("message")
    @classmethod
    def normalize_message(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None

    @field_validator("user_id")
    @classmethod
    def normalize_user_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None

    @field_validator("contacts_notified")
    @classmethod
    def validate_contacts_notified(cls, v: Optional[Union[Dict[str, Any], List[Any]]]) -> Union[Dict[str, Any], List[Any]]:
        if v is None:
            return {}
        # Protect against unbounded or maliciously large metadata payloads (> 10KB)
        try:
            serialized = json.dumps(v)
            if len(serialized) > 10240:
                raise ValueError("contacts_notified payload exceeds maximum 10KB limit")
        except (TypeError, ValueError) as err:
            if isinstance(err, ValueError) and "10KB" in str(err):
                raise
            raise ValueError("contacts_notified must be a JSON-serializable structure") from err
        return v

    @field_validator("status")
    @classmethod
    def validate_initial_status(cls, v: Optional[str]) -> str:
        if v is not None and v != "initiated":
            raise ValueError(
                f"Invalid initial status '{v}'. Initial SOS status must be 'initiated' and cannot be overridden by client."
            )
        return "initiated"


# Semantic alias
SOSRequest = SOSCreateRequest


class SOSCreateResponse(BaseModel):
    """
    Response model confirming an emergency SOS incident was recorded.
    Does NOT claim external notification or emergency dispatch took place.
    """
    id: str = Field(
        ...,
        description="Unique UUID of the recorded SOS incident",
        examples=["d3b07384-d113-494b-9c8e-a2e6f76c5b91"],
    )
    status: str = Field(
        default="initiated",
        description="Initial lifecycle status of the incident (always 'initiated')",
        examples=["initiated"],
    )
    message: str = Field(
        default="SOS request recorded successfully.",
        description="Human-readable confirmation message",
        examples=["SOS request recorded successfully."],
    )
    recorded: bool = Field(
        default=True,
        description="Indicates the incident was successfully recorded in the audit log",
        examples=[True],
    )
    created_at: Optional[datetime] = Field(
        default=None,
        description="UTC timestamp when the SOS incident was logged",
    )


# Semantic alias
SOSResponse = SOSCreateResponse
