"""
Facility schemas for hospitals, blood banks, and geospatial facility discovery.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class HospitalBase(BaseModel):
    name: str = Field(..., description="Name of the healthcare facility")
    address: Optional[str] = Field(None, description="Physical street address")
    phone: Optional[str] = Field(None, description="Contact phone number")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate (-180 to 180)")
    specialties: List[str] = Field(default_factory=list, description="Medical specialties available")
    emergency_available: bool = Field(True, description="Whether emergency department is operational")
    beds_available: int = Field(0, ge=0, description="Current number of available beds")
    is_active: bool = Field(True, description="Whether facility is active in registry")


class HospitalRead(HospitalBase):
    id: str = Field(..., description="Unique UUID of the facility")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BloodBankBase(BaseModel):
    name: str = Field(..., description="Name of the blood bank / depository")
    address: Optional[str] = Field(None, description="Physical street address")
    phone: Optional[str] = Field(None, description="Contact phone number")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate (-180 to 180)")
    available_blood_groups: List[str] = Field(default_factory=list, description="List of available blood groups")
    is_active: bool = Field(True, description="Whether facility is active in registry")


class BloodBankRead(BloodBankBase):
    id: str = Field(..., description="Unique UUID of the blood bank")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FacilityDiscoveryItem(BaseModel):
    """
    Normalized healthcare facility discovery item ordered nearest-first.
    """
    id: str = Field(..., description="Unique UUID of the facility")
    name: str = Field(..., description="Name of the healthcare facility")
    address: Optional[str] = Field(None, description="Physical street address")
    phone: Optional[str] = Field(None, description="Contact phone number")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate (-180 to 180)")
    distance_km: float = Field(..., ge=0.0, description="Calculated geodesic distance in kilometers")
    specialties: List[str] = Field(default_factory=list, description="Medical specialties available")
    emergency_capable: bool = Field(..., description="Whether emergency department is operational")
    available_beds: int = Field(..., ge=0, description="Current number of available beds")


class FacilityDiscoveryResponse(BaseModel):
    """
    Response payload for GET /api/facilities.
    """
    facilities: List[FacilityDiscoveryItem] = Field(
        default_factory=list,
        description="List of nearby eligible facilities sorted nearest-first",
    )
