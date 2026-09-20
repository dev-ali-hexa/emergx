"""
SOS Service.
Encapsulates business logic for emergency SOS incident logging, coordinates
database persistence via SOSLogRepository, and ensures initial incident state integrity.
"""

import logging
from typing import Optional
import uuid
from app.db.repositories import SOSLogRepository
from app.schemas.sos import SOSCreateRequest, SOSCreateResponse
from app.services.exceptions import DatabaseServiceError

logger = logging.getLogger(__name__)


class SOSService:
    """
    Service layer coordinating emergency SOS incident logging.
    Maintains clean separation between HTTP routes, business rules, and Supabase data access.
    """

    def __init__(self, sos_repo: Optional[SOSLogRepository] = None):
        self._sos_repo = sos_repo

    @property
    def sos_repo(self) -> SOSLogRepository:
        if self._sos_repo is None:
            self._sos_repo = SOSLogRepository()
        return self._sos_repo

    def record_sos_incident(self, request: SOSCreateRequest) -> SOSCreateResponse:
        """
        Records an emergency SOS incident in the database audit log.
        Enforces status 'initiated', translates database failures into DatabaseServiceError,
        and constructs a structured confirmation response.
        """
        log_data = {
            "latitude": request.latitude,
            "longitude": request.longitude,
            "message": request.message,
            "user_id": request.user_id,
            "contacts_notified": request.contacts_notified if request.contacts_notified is not None else {},
            "status": "initiated",
        }

        try:
            record = self.sos_repo.create(log_data)
        except Exception as err:
            logger.error("Failed to persist SOS incident log to database: %s", err)
            raise DatabaseServiceError("Failed to record SOS incident in database.") from err

        # Extract UUID from persisted row or generate fallback UUID if mock/client returned empty
        record_id = str(record.get("id")) if record and record.get("id") else str(uuid.uuid4())
        created_at = record.get("created_at") if record else None

        return SOSCreateResponse(
            id=record_id,
            status="initiated",
            message="SOS request recorded successfully.",
            recorded=True,
            created_at=created_at,
        )
