"""
Facility Discovery Service.
Encapsulates business rules for geospatial matching, parameter normalization,
and repository coordination for hospitals and clinics.
"""

import logging
from typing import List, Optional
from app.db.repositories import HospitalRepository
from app.schemas.facility import FacilityDiscoveryItem, FacilityDiscoveryResponse
from app.services.exceptions import DatabaseServiceError

logger = logging.getLogger(__name__)


class FacilityService:
    """
    Service layer coordinating geospatial healthcare facility discovery.
    """

    def __init__(self, hospital_repo: Optional[HospitalRepository] = None):
        self._hospital_repo = hospital_repo

    @property
    def hospital_repo(self) -> HospitalRepository:
        if self._hospital_repo is None:
            self._hospital_repo = HospitalRepository()
        return self._hospital_repo

    def discover_nearby_facilities(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        specialty: Optional[str] = None,
        emergency_only: bool = False,
        limit: int = 10,
    ) -> FacilityDiscoveryResponse:
        """
        Discovers nearby eligible healthcare facilities using PostGIS geodesic distance matching.
        Returns nearest-first ordered facilities wrapped in FacilityDiscoveryResponse.
        """
        # Normalize specialty parameter: treat whitespace or empty string as None
        clean_specialty = specialty.strip() if specialty and specialty.strip() else None

        try:
            raw_facilities = self.hospital_repo.get_nearby_hospitals(
                latitude=latitude,
                longitude=longitude,
                radius_km=radius_km,
                specialty=clean_specialty,
                emergency_only=emergency_only,
                limit=limit,
            )
        except Exception as err:
            logger.error("Failed to execute geospatial facility query: %s", err)
            raise DatabaseServiceError("Database query for nearby facilities failed.") from err

        items: List[FacilityDiscoveryItem] = []
        for row in raw_facilities:
            try:
                item = FacilityDiscoveryItem(
                    id=str(row["id"]),
                    name=str(row["name"]),
                    address=row.get("address"),
                    phone=row.get("phone"),
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    distance_km=float(round(row["distance_km"], 2)),
                    specialties=list(row.get("specialties") or []),
                    emergency_capable=bool(row.get("emergency_capable", row.get("emergency_available", True))),
                    available_beds=int(row.get("available_beds", row.get("beds_available", 0))),
                )
                items.append(item)
            except Exception as parse_err:
                logger.warning("Skipping malformed hospital record: %s", parse_err)
                continue

        return FacilityDiscoveryResponse(facilities=items)
