"""
Emergency Orchestration Service.
Coordinates user location and normalized triage assessment with the existing
geospatial FacilityService to discover eligible hospitals.
"""

import logging
from typing import Optional
from app.schemas.emergency import EMERGENCY_DISCLAIMER, EmergencyRequest, EmergencyResponse
from app.schemas.triage import UrgencyLevel
from app.services.facility import FacilityService

logger = logging.getLogger(__name__)


class EmergencyService:
    """
    Service layer orchestrating emergency navigation workflow.
    Reuses the authoritative FacilityService for geospatial PostGIS queries.
    Strictly avoids direct AI invocation or automatic SOS creation.
    """

    def __init__(self, facility_service: Optional[FacilityService] = None):
        self._facility_service = facility_service

    @property
    def facility_service(self) -> FacilityService:
        if self._facility_service is None:
            self._facility_service = FacilityService()
        return self._facility_service

    def resolve_emergency_filter(self, urgency: UrgencyLevel, explicit_filter: Optional[bool]) -> bool:
        """
        Determines whether to restrict results to emergency-capable facilities.
        Respects explicit client override; otherwise defaults based on urgency tier:
        - Critical / High: defaults to emergency_only = True
        - Moderate: defaults to emergency_only = False
        """
        if explicit_filter is not None:
            return explicit_filter
        if urgency in (UrgencyLevel.CRITICAL, UrgencyLevel.HIGH):
            return True
        return False

    def orchestrate_emergency_navigation(self, request: EmergencyRequest) -> EmergencyResponse:
        """
        Executes emergency navigation orchestration:
        1. Evaluates urgency-based facility filtering.
        2. Calls the authoritative FacilityService for PostGIS geospatial discovery.
        3. Returns a unified, non-diagnostic emergency navigation response.
        """
        emergency_only = self.resolve_emergency_filter(
            urgency=request.urgency,
            explicit_filter=request.emergency_only,
        )

        logger.info(
            "Orchestrating emergency navigation: lat=%s, lng=%s, urgency=%s, specialty=%s, emergency_only=%s",
            request.latitude,
            request.longitude,
            request.urgency.value,
            request.specialty,
            emergency_only,
        )

        # Delegate directly to existing FacilityService — zero duplicated PostGIS queries
        facility_response = self.facility_service.discover_nearby_facilities(
            latitude=request.latitude,
            longitude=request.longitude,
            radius_km=request.radius_km,
            specialty=request.specialty,
            emergency_only=emergency_only,
            limit=request.limit,
        )

        return EmergencyResponse(
            urgency=request.urgency,
            specialty=request.specialty,
            facilities=facility_response.facilities,
            disclaimer=EMERGENCY_DISCLAIMER,
        )
